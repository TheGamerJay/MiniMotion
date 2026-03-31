import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Stage, Layer, Image, Transformer, Circle, Line, Rect } from 'react-konva';
import { useEditor } from '../../store/editorStore';
import { extractPolygonRegion } from '../../utils/cutTool';
import { getInterpolatedProperties } from '../../utils/animation';

// Onion skin ghost layer - shows previous/next frame positions
function OnionSkinLayer({ layer, time, opacity, tint }) {
  const [image, setImage] = useState(null);

  useEffect(() => {
    if (layer.imageData) {
      const img = new window.Image();
      img.onload = () => setImage(img);
      img.src = layer.imageData;
    }
  }, [layer.imageData]);

  const props = getInterpolatedProperties(layer, time);

  if (!image || !layer.visible) return null;

  // Use simple opacity-based visualization (red/blue tint would need canvas manipulation)
  // Past frames are slightly red, future frames are slightly blue via CSS on the container
  return (
    <Image
      image={image}
      x={props.x}
      y={props.y}
      offsetX={layer.width / 2 + layer.pivotX}
      offsetY={layer.height / 2 + layer.pivotY}
      rotation={props.rotation}
      scaleX={props.scaleX}
      scaleY={props.scaleY}
      opacity={opacity * props.opacity}
      listening={false}
    />
  );
}

function LayerImage({ layer, isSelected, onSelect, onTransform, currentTime }) {
  const imageRef = useRef(null);
  const transformerRef = useRef(null);
  const [image, setImage] = useState(null);

  // Load image
  useEffect(() => {
    if (layer.imageData) {
      const img = new window.Image();
      img.onload = () => setImage(img);
      img.src = layer.imageData;
    }
  }, [layer.imageData]);

  // Attach transformer
  useEffect(() => {
    if (isSelected && transformerRef.current && imageRef.current) {
      transformerRef.current.nodes([imageRef.current]);
      transformerRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);

  // Get interpolated values using the new animation engine
  const { x, y, rotation, scaleX, scaleY, opacity } = getInterpolatedProperties(layer, currentTime);

  if (!image || !layer.visible) return null;

  const handleDragEnd = (e) => {
    onTransform(layer.id, {
      x: e.target.x(),
      y: e.target.y(),
    });
  };

  const handleTransformEnd = (e) => {
    const node = imageRef.current;
    onTransform(layer.id, {
      x: node.x(),
      y: node.y(),
      rotation: node.rotation(),
      scaleX: node.scaleX(),
      scaleY: node.scaleY(),
    });
  };

  return (
    <>
      <Image
        ref={imageRef}
        image={image}
        x={x}
        y={y}
        offsetX={layer.width / 2 + layer.pivotX}
        offsetY={layer.height / 2 + layer.pivotY}
        rotation={rotation}
        scaleX={scaleX}
        scaleY={scaleY}
        opacity={opacity}
        draggable={!layer.locked}
        onClick={() => onSelect(layer.id)}
        onTap={() => onSelect(layer.id)}
        onDragEnd={handleDragEnd}
        onTransformEnd={handleTransformEnd}
      />
      {isSelected && (
        <Transformer
          ref={transformerRef}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 5 || newBox.height < 5) {
              return oldBox;
            }
            return newBox;
          }}
          rotateEnabled={true}
          enabledAnchors={[
            'top-left',
            'top-right',
            'bottom-left',
            'bottom-right',
            'middle-left',
            'middle-right',
            'top-center',
            'bottom-center',
          ]}
          anchorFill="#06B6D4"
          anchorStroke="#06B6D4"
          borderStroke="#06B6D4"
          anchorSize={8}
        />
      )}
    </>
  );
}

function PivotHandle({ layer, onPivotChange }) {
  const [isDragging, setIsDragging] = useState(false);

  const pivotX = layer.x + layer.pivotX;
  const pivotY = layer.y + layer.pivotY;

  const handleDragMove = (e) => {
    const newPivotX = e.target.x() - layer.x;
    const newPivotY = e.target.y() - layer.y;
    onPivotChange(layer.id, { pivotX: newPivotX, pivotY: newPivotY });
  };

  return (
    <Circle
      x={pivotX}
      y={pivotY}
      radius={6}
      fill="transparent"
      stroke="#8B5CF6"
      strokeWidth={2}
      draggable
      onDragStart={() => setIsDragging(true)}
      onDragMove={handleDragMove}
      onDragEnd={() => setIsDragging(false)}
      shadowColor="#8B5CF6"
      shadowBlur={isDragging ? 12 : 8}
      shadowOpacity={0.5}
    />
  );
}

function CutOverlay({ points, canvasSize, onAddPoint, onFinishCut, onClosePolygon }) {
  const handleClick = (e) => {
    const stage = e.target.getStage();
    const pointer = stage.getPointerPosition();
    
    // Check if clicking near the first point to close polygon
    if (points.length >= 3) {
      const firstPoint = points[0];
      const dist = Math.sqrt(
        Math.pow(pointer.x - firstPoint.x, 2) + 
        Math.pow(pointer.y - firstPoint.y, 2)
      );
      if (dist < 15) {
        onClosePolygon();
        return;
      }
    }
    
    onAddPoint({ x: pointer.x, y: pointer.y });
  };

  return (
    <>
      {/* Semi-transparent overlay */}
      <Rect
        width={canvasSize.width}
        height={canvasSize.height}
        fill="rgba(0, 0, 0, 0.3)"
        onClick={handleClick}
      />
      
      {/* Cut polygon preview */}
      {points.length > 0 && (
        <>
          <Line
            points={points.flatMap(p => [p.x, p.y])}
            stroke="#06B6D4"
            strokeWidth={2}
            closed={false}
            dash={[5, 5]}
          />
          {/* Line connecting last point to first if we have 3+ points */}
          {points.length >= 3 && (
            <Line
              points={[
                points[points.length - 1].x, points[points.length - 1].y,
                points[0].x, points[0].y
              ]}
              stroke="#06B6D4"
              strokeWidth={2}
              dash={[5, 5]}
              opacity={0.5}
            />
          )}
          {points.map((point, index) => (
            <Circle
              key={index}
              x={point.x}
              y={point.y}
              radius={index === 0 && points.length >= 3 ? 8 : 4}
              fill={index === 0 && points.length >= 3 ? "#22D3EE" : "#06B6D4"}
              stroke="#fff"
              strokeWidth={index === 0 && points.length >= 3 ? 2 : 1}
            />
          ))}
        </>
      )}
    </>
  );
}

export default function Canvas() {
  const { state, actions } = useEditor();
  const containerRef = useRef(null);
  const stageRef = useRef(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });

  // Handle container resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setStageSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Calculate stage offset to center the canvas
  const offsetX = (stageSize.width - state.project.canvasSize.width * state.canvas.zoom) / 2 + state.canvas.panX;
  const offsetY = (stageSize.height - state.project.canvasSize.height * state.canvas.zoom) / 2 + state.canvas.panY;

  const handleWheel = (e) => {
    e.evt.preventDefault();
    const scaleBy = 1.1;
    const newZoom = e.evt.deltaY > 0 
      ? state.canvas.zoom / scaleBy 
      : state.canvas.zoom * scaleBy;
    
    // Clamp zoom
    const clampedZoom = Math.max(0.1, Math.min(5, newZoom));
    actions.setCanvas({ zoom: clampedZoom });
  };

  const handleLayerSelect = useCallback((layerId) => {
    if (state.tool.active === 'select') {
      actions.selectLayer(layerId);
    }
  }, [state.tool.active, actions]);

  const handleTransform = useCallback((layerId, updates) => {
    actions.updateLayer(layerId, updates);
  }, [actions]);

  const handlePivotChange = useCallback((layerId, updates) => {
    actions.updateLayer(layerId, updates);
  }, [actions]);

  const handleAddCutPoint = useCallback((point) => {
    actions.addCutPoint(point);
  }, [actions]);

  const handleFinishCut = useCallback(async () => {
    if (state.tool.cutPoints.length < 3) {
      actions.clearCutPoints();
      return;
    }
    
    // Find a layer with image to cut from
    const sourceLayer = state.layers.find(l => l.imageData && l.visible);
    if (!sourceLayer) {
      alert('No visible layer to cut from');
      actions.clearCutPoints();
      actions.setTool('select');
      return;
    }
    
    try {
      const result = await extractPolygonRegion(
        sourceLayer.imageData,
        state.tool.cutPoints,
        state.project.canvasSize.width,
        state.project.canvasSize.height
      );
      
      // Add the cut region as a new layer
      actions.addLayer({
        name: `${sourceLayer.name} - Cut ${state.layers.length}`,
        imageData: result.imageData,
        width: result.width,
        height: result.height,
        x: result.centerX,
        y: result.centerY,
      });
      
    } catch (error) {
      console.error('Cut failed:', error);
      alert('Failed to cut region');
    }
    
    actions.clearCutPoints();
    actions.setTool('select');
  }, [state.tool.cutPoints, state.layers, state.project.canvasSize, actions]);

  const handleStageClick = (e) => {
    // Deselect when clicking on empty area
    if (e.target === e.target.getStage() && state.tool.active === 'select') {
      actions.selectLayer(null);
    }
  };

  const selectedLayer = state.layers.find(l => l.id === state.selectedLayerId);

  return (
    <div 
      ref={containerRef}
      className="flex-1 bg-black relative overflow-hidden canvas-grid"
      data-testid="canvas-container"
    >
      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        onWheel={handleWheel}
        onClick={handleStageClick}
        onTap={handleStageClick}
      >
        {/* Canvas background */}
        <Layer>
          <Rect
            x={offsetX}
            y={offsetY}
            width={state.project.canvasSize.width * state.canvas.zoom}
            height={state.project.canvasSize.height * state.canvas.zoom}
            fill="#1a1a1a"
            shadowColor="black"
            shadowBlur={20}
            shadowOpacity={0.5}
          />
        </Layer>

        {/* Main content layer */}
        <Layer
          x={offsetX}
          y={offsetY}
          scaleX={state.canvas.zoom}
          scaleY={state.canvas.zoom}
          clipX={0}
          clipY={0}
          clipWidth={state.project.canvasSize.width}
          clipHeight={state.project.canvasSize.height}
        >
          {/* Onion skin - past frames (red tint) */}
          {state.ui.onionSkinEnabled && state.layers.map(layer => {
            const frameStep = 1 / state.project.fps;
            const pastFrames = [];
            for (let i = 1; i <= (state.ui.onionSkinFrames || 2); i++) {
              const pastTime = state.timeline.currentTime - (i * frameStep);
              if (pastTime >= 0) {
                pastFrames.push(
                  <OnionSkinLayer
                    key={`onion-past-${layer.id}-${i}`}
                    layer={layer}
                    time={pastTime}
                    opacity={0.25 / i}
                    tint="past"
                  />
                );
              }
            }
            return pastFrames;
          })}
          
          {/* Onion skin - future frames (blue tint) */}
          {state.ui.onionSkinEnabled && state.layers.map(layer => {
            const frameStep = 1 / state.project.fps;
            const futureFrames = [];
            for (let i = 1; i <= (state.ui.onionSkinFrames || 2); i++) {
              const futureTime = state.timeline.currentTime + (i * frameStep);
              if (futureTime <= state.project.duration) {
                futureFrames.push(
                  <OnionSkinLayer
                    key={`onion-future-${layer.id}-${i}`}
                    layer={layer}
                    time={futureTime}
                    opacity={0.25 / i}
                    tint="future"
                  />
                );
              }
            }
            return futureFrames;
          })}

          {/* Render layers */}
          {state.layers.map(layer => (
            <LayerImage
              key={layer.id}
              layer={layer}
              isSelected={state.selectedLayerId === layer.id && state.tool.active === 'select'}
              onSelect={handleLayerSelect}
              onTransform={handleTransform}
              currentTime={state.timeline.currentTime}
            />
          ))}

          {/* Pivot handle for selected layer */}
          {selectedLayer && state.tool.active === 'pivot' && (
            <PivotHandle
              layer={selectedLayer}
              onPivotChange={handlePivotChange}
            />
          )}

          {/* Cut overlay */}
          {state.tool.active === 'cut' && (
            <CutOverlay
              points={state.tool.cutPoints}
              canvasSize={state.project.canvasSize}
              onAddPoint={handleAddCutPoint}
              onFinishCut={handleFinishCut}
              onClosePolygon={handleFinishCut}
            />
          )}
        </Layer>
      </Stage>

      {/* Canvas info overlay */}
      <div className="absolute bottom-4 left-4 text-xs text-zinc-500 font-mono">
        {Math.round(state.canvas.zoom * 100)}% | {state.project.canvasSize.width}×{state.project.canvasSize.height}
      </div>

      {/* Cut mode instructions */}
      {state.tool.active === 'cut' && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-zinc-900/90 px-4 py-2 rounded-lg border border-cyan-500/50">
          <p className="text-sm text-cyan-400">
            Click to add points. Press Enter or double-click to finish cut.
          </p>
          {state.tool.cutPoints.length > 0 && (
            <p className="text-xs text-zinc-500 mt-1">
              {state.tool.cutPoints.length} points added
            </p>
          )}
        </div>
      )}
    </div>
  );
}
