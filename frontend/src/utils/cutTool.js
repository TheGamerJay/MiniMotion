/**
 * Cut Tool Utilities
 * Handles extracting regions from images based on polygon selection
 */

/**
 * Create a canvas element from an image data URL
 */
export function createCanvasFromDataURL(dataURL) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      resolve({ canvas, ctx, width: img.width, height: img.height });
    };
    img.onerror = reject;
    img.src = dataURL;
  });
}

/**
 * Check if a point is inside a polygon using ray casting
 */
export function isPointInPolygon(x, y, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Get bounding box of polygon
 */
export function getPolygonBounds(polygon) {
  if (polygon.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;
  
  for (const point of polygon) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }
  
  return {
    x: Math.floor(minX),
    y: Math.floor(minY),
    width: Math.ceil(maxX - minX),
    height: Math.ceil(maxY - minY),
  };
}

/**
 * Extract a region from an image based on polygon points
 * Returns a new image data URL with transparent background outside the polygon
 */
export async function extractPolygonRegion(imageDataURL, polygon, stageWidth, stageHeight) {
  const { canvas: sourceCanvas, ctx: sourceCtx, width, height } = await createCanvasFromDataURL(imageDataURL);
  
  // Scale polygon points from stage coordinates to image coordinates
  const scaleX = width / stageWidth;
  const scaleY = height / stageHeight;
  
  const scaledPolygon = polygon.map(p => ({
    x: p.x * scaleX,
    y: p.y * scaleY,
  }));
  
  // Get bounds of the polygon
  const bounds = getPolygonBounds(scaledPolygon);
  
  // Add padding
  const padding = 2;
  const cropX = Math.max(0, bounds.x - padding);
  const cropY = Math.max(0, bounds.y - padding);
  const cropWidth = Math.min(width - cropX, bounds.width + padding * 2);
  const cropHeight = Math.min(height - cropY, bounds.height + padding * 2);
  
  // Create output canvas for the cropped region
  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = cropWidth;
  outputCanvas.height = cropHeight;
  const outputCtx = outputCanvas.getContext('2d');
  
  // Get source image data for the cropped area
  const sourceImageData = sourceCtx.getImageData(cropX, cropY, cropWidth, cropHeight);
  
  // Create output image data
  const outputImageData = outputCtx.createImageData(cropWidth, cropHeight);
  
  // Adjust polygon to local coordinates
  const localPolygon = scaledPolygon.map(p => ({
    x: p.x - cropX,
    y: p.y - cropY,
  }));
  
  // Copy pixels that are inside the polygon
  for (let y = 0; y < cropHeight; y++) {
    for (let x = 0; x < cropWidth; x++) {
      const idx = (y * cropWidth + x) * 4;
      
      if (isPointInPolygon(x, y, localPolygon)) {
        outputImageData.data[idx] = sourceImageData.data[idx];
        outputImageData.data[idx + 1] = sourceImageData.data[idx + 1];
        outputImageData.data[idx + 2] = sourceImageData.data[idx + 2];
        outputImageData.data[idx + 3] = sourceImageData.data[idx + 3];
      } else {
        // Transparent pixel
        outputImageData.data[idx] = 0;
        outputImageData.data[idx + 1] = 0;
        outputImageData.data[idx + 2] = 0;
        outputImageData.data[idx + 3] = 0;
      }
    }
  }
  
  outputCtx.putImageData(outputImageData, 0, 0);
  
  // Calculate center position in stage coordinates
  const centerX = (bounds.x + bounds.width / 2) / scaleX;
  const centerY = (bounds.y + bounds.height / 2) / scaleY;
  
  return {
    imageData: outputCanvas.toDataURL('image/png'),
    width: cropWidth,
    height: cropHeight,
    centerX,
    centerY,
  };
}

/**
 * Auto-detect edges in an image using simple edge detection
 * Can be used for "magic wand" style selection
 */
export async function detectEdges(imageDataURL, threshold = 30) {
  const { canvas, ctx, width, height } = await createCanvasFromDataURL(imageDataURL);
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  
  const edges = [];
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      const alpha = data[idx + 3];
      
      // Check surrounding pixels for alpha change
      const neighbors = [
        data[((y - 1) * width + x) * 4 + 3],
        data[((y + 1) * width + x) * 4 + 3],
        data[(y * width + (x - 1)) * 4 + 3],
        data[(y * width + (x + 1)) * 4 + 3],
      ];
      
      const maxDiff = Math.max(...neighbors.map(n => Math.abs(alpha - n)));
      
      if (maxDiff > threshold) {
        edges.push({ x, y });
      }
    }
  }
  
  return edges;
}

/**
 * Simplify a polygon by reducing the number of points
 * Uses Douglas-Peucker algorithm
 */
export function simplifyPolygon(points, tolerance = 2) {
  if (points.length <= 2) return points;
  
  // Find the point with the maximum distance
  let maxDist = 0;
  let maxIndex = 0;
  
  const start = points[0];
  const end = points[points.length - 1];
  
  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(points[i], start, end);
    if (dist > maxDist) {
      maxDist = dist;
      maxIndex = i;
    }
  }
  
  // If max distance is greater than tolerance, recursively simplify
  if (maxDist > tolerance) {
    const left = simplifyPolygon(points.slice(0, maxIndex + 1), tolerance);
    const right = simplifyPolygon(points.slice(maxIndex), tolerance);
    return left.slice(0, -1).concat(right);
  }
  
  return [start, end];
}

function perpendicularDistance(point, lineStart, lineEnd) {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  
  if (dx === 0 && dy === 0) {
    return Math.sqrt(
      Math.pow(point.x - lineStart.x, 2) + 
      Math.pow(point.y - lineStart.y, 2)
    );
  }
  
  const t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (dx * dx + dy * dy);
  
  const nearestX = lineStart.x + t * dx;
  const nearestY = lineStart.y + t * dy;
  
  return Math.sqrt(
    Math.pow(point.x - nearestX, 2) + 
    Math.pow(point.y - nearestY, 2)
  );
}
