import React from 'react';
import { useEditor } from '../../store/editorStore';
import { EASING_TYPES, EASING_LABELS, PRIMARY_EASINGS, getDefaultEasing } from '../../utils/animation';
import { RotateCcw, Plus, Copy } from 'lucide-react';

export default function RightPanel() {
  const { state, actions } = useEditor();
  
  const selectedLayer = state.layers.find(l => l.id === state.selectedLayerId);

  const handlePropertyChange = (property, value) => {
    if (!selectedLayer) return;
    actions.updateLayer(selectedLayer.id, { [property]: parseFloat(value) });
  };

  const handleResetPivot = () => {
    if (!selectedLayer) return;
    actions.updateLayer(selectedLayer.id, { pivotX: 0, pivotY: 0 });
  };

  const handleAddKeyframe = () => {
    if (!selectedLayer) return;
    
    const time = state.timeline.currentTime;
    // Use default easing (ease-out) for natural motion
    actions.addKeyframe(selectedLayer.id, time, {
      x: selectedLayer.x,
      y: selectedLayer.y,
      rotation: selectedLayer.rotation,
      scaleX: selectedLayer.scaleX,
      scaleY: selectedLayer.scaleY,
      opacity: selectedLayer.opacity,
      easing: getDefaultEasing(),
    });
  };

  const handleDuplicateLayer = () => {
    if (!selectedLayer) return;
    actions.duplicateLayer(selectedLayer.id);
  };

  // Get keyframe count and easing info
  const keyframeCount = Object.keys(selectedLayer?.keyframes || {}).length;
  const keyframeTimes = Object.keys(selectedLayer?.keyframes || {}).map(Number).sort((a, b) => a - b);

  const handleProjectSettingChange = (property, value) => {
    if (property === 'canvasWidth') {
      actions.updateProject({ 
        canvasSize: { ...state.project.canvasSize, width: parseInt(value) || 512 } 
      });
    } else if (property === 'canvasHeight') {
      actions.updateProject({ 
        canvasSize: { ...state.project.canvasSize, height: parseInt(value) || 512 } 
      });
    } else if (property === 'fps') {
      actions.updateProject({ fps: parseInt(value) || 24 });
    } else if (property === 'duration') {
      actions.updateProject({ duration: parseFloat(value) || 2 });
    }
  };

  return (
    <div 
      className="w-72 border-l border-zinc-800 flex flex-col bg-zinc-900 overflow-y-auto"
      data-testid="right-panel"
    >
      {selectedLayer ? (
        <>
          {/* Layer Properties */}
          <div className="p-4 border-b border-zinc-800">
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">
              Layer Properties
            </h2>
            
            <div className="space-y-3">
              {/* Position */}
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Position</label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500">X</span>
                    <input
                      type="number"
                      value={Math.round(selectedLayer.x)}
                      onChange={(e) => handlePropertyChange('x', e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 pl-6 text-xs font-mono focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 outline-none"
                      data-testid="property-x"
                    />
                  </div>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500">Y</span>
                    <input
                      type="number"
                      value={Math.round(selectedLayer.y)}
                      onChange={(e) => handlePropertyChange('y', e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 pl-6 text-xs font-mono focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 outline-none"
                      data-testid="property-y"
                    />
                  </div>
                </div>
              </div>

              {/* Rotation */}
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Rotation</label>
                <div className="relative">
                  <input
                    type="number"
                    value={Math.round(selectedLayer.rotation)}
                    onChange={(e) => handlePropertyChange('rotation', e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-xs font-mono focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 outline-none"
                    data-testid="property-rotation"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500">°</span>
                </div>
              </div>

              {/* Scale */}
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Scale</label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500">X</span>
                    <input
                      type="number"
                      step="0.1"
                      value={selectedLayer.scaleX.toFixed(2)}
                      onChange={(e) => handlePropertyChange('scaleX', e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 pl-6 text-xs font-mono focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 outline-none"
                      data-testid="property-scaleX"
                    />
                  </div>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500">Y</span>
                    <input
                      type="number"
                      step="0.1"
                      value={selectedLayer.scaleY.toFixed(2)}
                      onChange={(e) => handlePropertyChange('scaleY', e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 pl-6 text-xs font-mono focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 outline-none"
                      data-testid="property-scaleY"
                    />
                  </div>
                </div>
              </div>

              {/* Opacity */}
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Opacity</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={selectedLayer.opacity}
                    onChange={(e) => handlePropertyChange('opacity', e.target.value)}
                    className="flex-1 accent-cyan-500"
                    data-testid="property-opacity-slider"
                  />
                  <span className="text-xs font-mono text-zinc-400 w-10 text-right">
                    {Math.round(selectedLayer.opacity * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Pivot Controls */}
          <div className="p-4 border-b border-zinc-800">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                Pivot Point
              </h2>
              <button
                onClick={handleResetPivot}
                className="p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-white transition-colors"
                title="Reset to center"
                data-testid="reset-pivot-btn"
              >
                <RotateCcw size={14} />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500">X</span>
                <input
                  type="number"
                  value={Math.round(selectedLayer.pivotX)}
                  onChange={(e) => handlePropertyChange('pivotX', e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 pl-6 text-xs font-mono focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 outline-none"
                  data-testid="pivot-x"
                />
              </div>
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500">Y</span>
                <input
                  type="number"
                  value={Math.round(selectedLayer.pivotY)}
                  onChange={(e) => handlePropertyChange('pivotY', e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 pl-6 text-xs font-mono focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 outline-none"
                  data-testid="pivot-y"
                />
              </div>
            </div>
            <p className="text-[10px] text-zinc-600 mt-2">
              Offset from layer center. Use Pivot tool to drag visually.
            </p>
          </div>

          {/* Keyframe */}
          <div className="p-4 border-b border-zinc-800">
            <button
              onClick={handleAddKeyframe}
              className="w-full px-3 py-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-md transition-colors flex items-center justify-center gap-2"
              data-testid="add-keyframe-btn"
            >
              <Plus size={16} />
              Add Keyframe at {state.timeline.currentTime.toFixed(2)}s
            </button>
            
            {keyframeCount > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-xs text-zinc-500">
                  {keyframeCount} keyframe{keyframeCount !== 1 ? 's' : ''}
                </p>
                <div className="flex flex-wrap gap-1">
                  {keyframeTimes.map(time => {
                    const easing = selectedLayer.keyframes[time]?.easing || EASING_TYPES.LINEAR;
                    return (
                      <button
                        key={time}
                        onClick={() => actions.setTimeline({ currentTime: time })}
                        className={`px-2 py-0.5 text-[10px] rounded ${
                          Math.abs(state.timeline.currentTime - time) < 0.01
                            ? 'bg-cyan-500 text-black'
                            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                        }`}
                        title={`${EASING_LABELS[easing]}`}
                      >
                        {time.toFixed(2)}s
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Duplicate Layer */}
          <div className="p-4">
            <button
              onClick={handleDuplicateLayer}
              className="w-full px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-md transition-colors flex items-center justify-center gap-2"
              data-testid="duplicate-layer-btn"
            >
              <Copy size={16} />
              Duplicate Layer
            </button>
          </div>
        </>
      ) : (
        <>
          {/* Project Settings (when no layer selected) */}
          <div className="p-4 border-b border-zinc-800">
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">
              Project Settings
            </h2>
            
            <div className="space-y-3">
              {/* Canvas Size */}
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Canvas Size</label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500">W</span>
                    <input
                      type="number"
                      value={state.project.canvasSize.width}
                      onChange={(e) => handleProjectSettingChange('canvasWidth', e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 pl-6 text-xs font-mono focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 outline-none"
                      data-testid="canvas-width"
                    />
                  </div>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500">H</span>
                    <input
                      type="number"
                      value={state.project.canvasSize.height}
                      onChange={(e) => handleProjectSettingChange('canvasHeight', e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 pl-6 text-xs font-mono focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 outline-none"
                      data-testid="canvas-height"
                    />
                  </div>
                </div>
              </div>

              {/* FPS */}
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Frame Rate</label>
                <div className="relative">
                  <input
                    type="number"
                    value={state.project.fps}
                    onChange={(e) => handleProjectSettingChange('fps', e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-xs font-mono focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 outline-none"
                    data-testid="project-fps"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500">fps</span>
                </div>
              </div>

              {/* Duration */}
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Duration</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={state.project.duration}
                    onChange={(e) => handleProjectSettingChange('duration', e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-xs font-mono focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 outline-none"
                    data-testid="project-duration"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500">sec</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Tips */}
          <div className="p-4">
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">
              Quick Start
            </h2>
            <ul className="text-xs text-zinc-400 space-y-1">
              <li>• Upload an image to begin</li>
              <li>• Use Cut tool to separate parts</li>
              <li>• Select layers to move/rotate</li>
              <li>• Add keyframes for animation</li>
              <li>• Export as GIF or WebM</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
