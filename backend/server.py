from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import base64
import io
import tempfile

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
# Parse DB name from URL path (e.g. mongodb+srv://.../<dbname>?...), fallback to 'mini_editor'
_url_path = mongo_url.split('/')[-1].split('?')[0]
db = client[_url_path if _url_path else 'mini_editor']

# Create the main app without a prefix
app = FastAPI(title="Mini Editor API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

class FrameData(BaseModel):
    image_data: str  # Base64 encoded PNG
    
class ExportRequest(BaseModel):
    frames: List[str]  # List of base64 encoded PNG frames
    fps: int = 24
    width: int = 512
    height: int = 512
    format: str = "gif"  # "gif" or "webm"
    loop: bool = True


# API Routes
@api_router.get("/")
async def root():
    return {"message": "Mini Editor API", "version": "1.0.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    
    return status_checks

@api_router.post("/export")
async def export_animation(request: ExportRequest):
    """
    Export animation frames as GIF or WebM.
    Frames should be base64 encoded PNG images.
    """
    try:
        import imageio
        from PIL import Image
        
        if len(request.frames) == 0:
            raise HTTPException(status_code=400, detail="No frames provided")
        
        if request.fps <= 0 or request.fps > 60:
            raise HTTPException(status_code=400, detail="FPS must be between 1 and 60")
        
        # Decode frames
        pil_frames = []
        for i, frame_b64 in enumerate(request.frames):
            try:
                # Remove data URL prefix if present
                if ',' in frame_b64:
                    frame_b64 = frame_b64.split(',')[1]
                
                frame_data = base64.b64decode(frame_b64)
                img = Image.open(io.BytesIO(frame_data))
                
                # Resize if needed
                if img.size != (request.width, request.height):
                    img = img.resize((request.width, request.height), Image.Resampling.LANCZOS)
                
                # Convert RGBA to RGB for GIF if needed, preserving transparency
                if request.format == "gif" and img.mode == 'RGBA':
                    # For GIF, we need to handle transparency differently
                    background = Image.new('RGBA', img.size, (0, 0, 0, 0))
                    img = Image.alpha_composite(background, img)
                
                pil_frames.append(img)
            except Exception as e:
                logger.error(f"Error processing frame {i}: {e}")
                raise HTTPException(status_code=400, detail=f"Invalid frame data at index {i}")
        
        # Create output buffer
        output = io.BytesIO()
        
        if request.format == "gif":
            # Export as GIF
            duration = 1000 // request.fps  # ms per frame
            
            # Convert to numpy arrays for imageio
            import numpy as np
            numpy_frames = [np.array(f) for f in pil_frames]
            
            # Use imageio for GIF creation
            imageio.mimsave(
                output, 
                numpy_frames, 
                format='GIF',
                duration=duration / 1000,  # imageio uses seconds
                loop=0 if request.loop else 1
            )
            
            output.seek(0)
            return StreamingResponse(
                output,
                media_type="image/gif",
                headers={"Content-Disposition": "attachment; filename=animation.gif"}
            )
        
        elif request.format == "webm":
            # Export as WebM using imageio-ffmpeg
            import numpy as np
            
            with tempfile.NamedTemporaryFile(suffix='.webm', delete=False) as tmp_file:
                tmp_path = tmp_file.name
            
            try:
                numpy_frames = [np.array(f.convert('RGB')) for f in pil_frames]
                
                writer = imageio.get_writer(
                    tmp_path,
                    fps=request.fps,
                    codec='libvpx-vp9',
                    quality=8,
                )
                
                for frame in numpy_frames:
                    writer.append_data(frame)
                
                writer.close()
                
                # Read the file back
                with open(tmp_path, 'rb') as f:
                    output = io.BytesIO(f.read())
                
                output.seek(0)
                return StreamingResponse(
                    output,
                    media_type="video/webm",
                    headers={"Content-Disposition": "attachment; filename=animation.webm"}
                )
            finally:
                # Clean up temp file
                if os.path.exists(tmp_path):
                    os.unlink(tmp_path)
        
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported format: {request.format}")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Export error: {e}")
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

# Serve React frontend — must be mounted last so /api routes take priority
frontend_build = ROOT_DIR.parent / 'frontend' / 'build'
if frontend_build.exists():
    app.mount("/", StaticFiles(directory=str(frontend_build), html=True), name="static")
