import React, { useState } from 'react';
import { useEditor } from '../../store/editorStore';
import { EASING_TYPES, EASING_LABELS, PRIMARY_EASINGS, getDefaultEasing } from '../../utils/animation';
import { 
  calculateAnticipation, 
  calculateFollowThrough, 
  calculatePopEffect,
  calculateFadeIn,
  calculateFadeOut,
  calculateShake,
  calculateBounceLanding,
  getLayerProps,
  MOTION_PRESETS
} from '../../utils/motionHelpers';
import { RotateCcw, Plus, Copy, Clock, Layers, ChevronLeft, ChevronRight, Sparkles, Zap, Eye, EyeOff, ArrowRight, Target } from 'lucide-react';

export default function RightPanel() {
  const { state, actions } = useEditor();
  const [delayAmount, setDelayAmount] = useState(0.1);
  const [trailOffset, setTrailOffset] = useState(0.1);
  
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

  // Shift all keyframes forward/backward in time
  const handleShiftKeyframes = (direction) => {
    if (!selectedLayer || keyframeCount === 0) return;
    const offset = direction * delayAmount;
    actions.shiftKeyframes(selectedLayer.id, offset);
  };

  // Duplicate layer with time offset for trailing effects
  const handleDuplicateWithOffset = () => {
    if (!selectedLayer) return;
    actions.duplicateLayerWithOffset(selectedLayer.id, trailOffset);
  };

  // Copy all keyframes
  const handleCopyKeyframes = () => {
    if (!selectedLayer || keyframeCount === 0) return;
    actions.copyKeyframes(selectedLayer.id, keyframeTimes);
  };

  // Paste keyframes at current time
  const handlePasteKeyframes = () => {
    if (!selectedLayer || !state.clipboard.keyframes) return;
    actions.pasteKeyframes(selectedLayer.id, state.timeline.currentTime);
  };

  // Toggle onion skin
  const handleToggleOnionSkin = () => {
    actions.setUI({ onionSkinEnabled: !state.ui.onionSkinEnabled });
  };

  // ========== MOTION HELPERS ==========
  
  // Add anticipation before current keyframe
  const handleAddAnticipation = () => {
    if (!selectedLayer || keyframeCount < 2) return;
    
    const currentTime = state.timeline.currentTime;
    const nearestKeyframeTime = keyframeTimes.find(t => Math.abs(t - currentTime) < 0.05) || currentTime;
    const keyframeIndex = keyframeTimes.indexOf(nearestKeyframeTime);
    
    if (keyframeIndex <= 0) return; // Need a previous keyframe
    
    const prevTime = keyframeTimes[keyframeIndex - 1];
    const prevKeyframe = selectedLayer.keyframes[prevTime];
    const currentKeyframe = selectedLayer.keyframes[nearestKeyframeTime];
    
    if (!prevKeyframe || !currentKeyframe) return;
    
    // Calculate anticipation (slight opposite movement)
    const anticipationProps = calculateAnticipation(prevKeyframe, currentKeyframe, 0.15);
    
    // Insert anticipation keyframe between prev and current
    const anticipationTime = Math.round((nearestKeyframeTime - 0.08) * 100) / 100;
    if (anticipationTime > prevTime) {
      actions.addKeyframe(selectedLayer.id, anticipationTime, anticipationProps);
    }
  };

  // Add follow-through after current keyframe
  const handleAddFollowThrough = () => {
    if (!selectedLayer || keyframeCount < 1) return;
    
    const currentTime = state.timeline.currentTime;
    const nearestKeyframeTime = keyframeTimes.find(t => Math.abs(t - currentTime) < 0.05);
    
    if (nearestKeyframeTime === undefined) return;
    
    const keyframeIndex = keyframeTimes.indexOf(nearestKeyframeTime);
    const currentKeyframe = selectedLayer.keyframes[nearestKeyframeTime];
    
    // Get previous keyframe for direction calculation
    let prevKeyframe = getLayerProps(selectedLayer);
    if (keyframeIndex > 0) {
      prevKeyframe = selectedLayer.keyframes[keyframeTimes[keyframeIndex - 1]];
    }
    
    // Calculate follow-through
    const { overshoot, settle } = calculateFollowThrough(currentKeyframe, prevKeyframe, 0.12);
    
    // Insert overshoot and settle keyframes
    const overshootTime = Math.round((nearestKeyframeTime + 0.08) * 100) / 100;
    const settleTime = Math.round((nearestKeyframeTime + 0.18) * 100) / 100;
    
    if (overshootTime <= state.project.duration) {
      actions.addKeyframe(selectedLayer.id, overshootTime, overshoot);
    }
    if (settleTime <= state.project.duration) {
      actions.addKeyframe(selectedLayer.id, settleTime, settle);
    }
  };

  // Add pop effect at current time
  const handleAddPopEffect = () => {
    if (!selectedLayer) return;
    
    const currentTime = state.timeline.currentTime;
    const baseProps = getLayerProps(selectedLayer);
    
    const { peak, settle } = calculatePopEffect(baseProps, 1.25);
    
    // Add start, peak, and settle keyframes
    const startTime = Math.round(currentTime * 100) / 100;
    const peakTime = Math.round((currentTime + 0.06) * 100) / 100;
    const settleTime = Math.round((currentTime + 0.16) * 100) / 100;
    
    actions.addKeyframe(selectedLayer.id, startTime, { ...baseProps, easing: EASING_TYPES.LINEAR });
    if (peakTime <= state.project.duration) {
      actions.addKeyframe(selectedLayer.id, peakTime, peak);
    }
    if (settleTime <= state.project.duration) {
      actions.addKeyframe(selectedLayer.id, settleTime, settle);
    }
  };

  // Add fade in effect
  const handleAddFadeIn = () => {
    if (!selectedLayer) return;
    
    const currentTime = state.timeline.currentTime;
    const baseProps = getLayerProps(selectedLayer);
    const { start, end } = calculateFadeIn(baseProps);
    
    const startTime = Math.round(currentTime * 100) / 100;
    const endTime = Math.round((currentTime + 0.3) * 100) / 100;
    
    actions.addKeyframe(selectedLayer.id, startTime, start);
    if (endTime <= state.project.duration) {
      actions.addKeyframe(selectedLayer.id, endTime, end);
    }
  };

  // Add fade out effect
  const handleAddFadeOut = () => {
    if (!selectedLayer) return;
    
    const currentTime = state.timeline.currentTime;
    const baseProps = getLayerProps(selectedLayer);
    const { start, end } = calculateFadeOut(baseProps);
    
    const startTime = Math.round(currentTime * 100) / 100;
    const endTime = Math.round((currentTime + 0.3) * 100) / 100;
    
    actions.addKeyframe(selectedLayer.id, startTime, start);
    if (endTime <= state.project.duration) {
      actions.addKeyframe(selectedLayer.id, endTime, end);
    }
  };

  // Add shake effect
  const handleAddShake = () => {
    if (!selectedLayer) return;
    
    const currentTime = state.timeline.currentTime;
    const baseProps = getLayerProps(selectedLayer);
    const shakeFrames = calculateShake(baseProps, 8, 3);
    
    let time = currentTime;
    shakeFrames.forEach((frame) => {
      const roundedTime = Math.round(time * 100) / 100;
      if (roundedTime <= state.project.duration) {
        actions.addKeyframe(selectedLayer.id, roundedTime, frame);
      }
      time += 0.04;
    });
  };

  // Add bounce landing effect
  const handleAddBounce = () => {
    if (!selectedLayer) return;
    
    const currentTime = state.timeline.currentTime;
    const baseProps = getLayerProps(selectedLayer);
    const bounceFrames = calculateBounceLanding(baseProps, 25, 2);
    
    let time = currentTime;
    bounceFrames.forEach((frame) => {
      const roundedTime = Math.round(time * 100) / 100;
      if (roundedTime <= state.project.duration) {
        actions.addKeyframe(selectedLayer.id, roundedTime, frame);
      }
      time += 0.08;
    });
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
          <div className="p-4 border-b border-zinc-800">
            <button
              onClick={handleDuplicateLayer}
              className="w-full px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-md transition-colors flex items-center justify-center gap-2"
              data-testid="duplicate-layer-btn"
            >
              <Copy size={16} />
              Duplicate Layer
            </button>
          </div>

          {/* Animation Timing Controls */}
          <div className="p-4 border-b border-zinc-800">
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3 flex items-center gap-1">
              <Clock size={12} />
              Timing Controls
            </h2>
            
            {keyframeCount > 0 ? (
              <div className="space-y-3">
                {/* Delay/Shift Keyframes */}
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Shift Keyframes</label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleShiftKeyframes(-1)}
                      className="p-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white transition-colors"
                      title="Shift earlier"
                      data-testid="shift-keyframes-left"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <input
                      type="number"
                      step="0.05"
                      min="0.01"
                      value={delayAmount}
                      onChange={(e) => setDelayAmount(Math.max(0.01, parseFloat(e.target.value) || 0.1))}
                      className="flex-1 bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-xs font-mono text-center focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 outline-none"
                      data-testid="delay-amount-input"
                    />
                    <button
                      onClick={() => handleShiftKeyframes(1)}
                      className="p-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white transition-colors"
                      title="Shift later"
                      data-testid="shift-keyframes-right"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                  <p className="text-[10px] text-zinc-600 mt-1">
                    Shift all keyframes by {delayAmount}s
                  </p>
                </div>

                {/* Copy/Paste Keyframes */}
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Copy / Paste</label>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCopyKeyframes}
                      className="flex-1 px-2 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-xs text-white rounded transition-colors"
                      data-testid="copy-keyframes-btn"
                    >
                      Copy All
                    </button>
                    <button
                      onClick={handlePasteKeyframes}
                      disabled={!state.clipboard.keyframes}
                      className="flex-1 px-2 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-xs text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      data-testid="paste-keyframes-btn"
                    >
                      Paste at {state.timeline.currentTime.toFixed(2)}s
                    </button>
                  </div>
                  {state.clipboard.keyframes && (
                    <p className="text-[10px] text-cyan-400 mt-1">
                      {Object.keys(state.clipboard.keyframes).length} keyframe(s) in clipboard
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-zinc-600">Add keyframes to use timing controls</p>
            )}
          </div>

          {/* Trail / Stagger Effect */}
          <div className="p-4 border-b border-zinc-800">
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3 flex items-center gap-1">
              <Layers size={12} />
              Trail Effect
            </h2>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400">Offset:</span>
                <input
                  type="number"
                  step="0.05"
                  min="0.01"
                  value={trailOffset}
                  onChange={(e) => setTrailOffset(Math.max(0.01, parseFloat(e.target.value) || 0.1))}
                  className="w-20 bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs font-mono focus:border-cyan-500 outline-none"
                  data-testid="trail-offset-input"
                />
                <span className="text-xs text-zinc-500">sec</span>
              </div>
              
              <button
                onClick={handleDuplicateWithOffset}
                className="w-full px-3 py-2 bg-violet-600/80 hover:bg-violet-600 text-white text-sm rounded-md transition-colors flex items-center justify-center gap-2"
                data-testid="duplicate-with-offset-btn"
              >
                <Layers size={14} />
                Duplicate + Offset {trailOffset}s
              </button>
              <p className="text-[10px] text-zinc-600">
                Creates trailing motion by duplicating with delayed keyframes
              </p>
            </div>
          </div>

          {/* Onion Skin Toggle */}
          <div className="p-4 border-b border-zinc-800">
            <button
              onClick={handleToggleOnionSkin}
              className={`w-full px-3 py-2 rounded-md transition-colors flex items-center justify-center gap-2 ${
                state.ui.onionSkinEnabled
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-white'
              }`}
              data-testid="onion-skin-toggle"
            >
              Onion Skin {state.ui.onionSkinEnabled ? 'On' : 'Off'}
            </button>
          </div>

          {/* Motion Helpers Panel */}
          <div className="p-4">
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3 flex items-center gap-1">
              <Sparkles size={12} />
              Motion Helpers
            </h2>
            
            <div className="space-y-2">
              {/* Anticipation & Follow-through row */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleAddAnticipation}
                  disabled={keyframeCount < 2}
                  className="px-2 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-xs text-white rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                  title="Add slight opposite movement before action (needs 2+ keyframes)"
                  data-testid="motion-anticipation"
                >
                  <ChevronLeft size={12} />
                  Anticipation
                </button>
                <button
                  onClick={handleAddFollowThrough}
                  disabled={keyframeCount < 1}
                  className="px-2 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-xs text-white rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                  title="Add overshoot and settle after action"
                  data-testid="motion-follow-through"
                >
                  Follow-thru
                  <ChevronRight size={12} />
                </button>
              </div>
              
              {/* Pop & Shake row */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleAddPopEffect}
                  className="px-2 py-1.5 bg-violet-600/60 hover:bg-violet-600/80 text-xs text-white rounded transition-colors flex items-center justify-center gap-1"
                  title="Quick scale emphasis effect"
                  data-testid="motion-pop"
                >
                  <Zap size={12} />
                  Pop
                </button>
                <button
                  onClick={handleAddShake}
                  className="px-2 py-1.5 bg-violet-600/60 hover:bg-violet-600/80 text-xs text-white rounded transition-colors flex items-center justify-center gap-1"
                  title="Impact shake effect"
                  data-testid="motion-shake"
                >
                  <Target size={12} />
                  Shake
                </button>
              </div>
              
              {/* Fade row */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleAddFadeIn}
                  className="px-2 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-xs text-white rounded transition-colors flex items-center justify-center gap-1"
                  title="Fade in from transparent"
                  data-testid="motion-fade-in"
                >
                  <Eye size={12} />
                  Fade In
                </button>
                <button
                  onClick={handleAddFadeOut}
                  className="px-2 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-xs text-white rounded transition-colors flex items-center justify-center gap-1"
                  title="Fade out to transparent"
                  data-testid="motion-fade-out"
                >
                  <EyeOff size={12} />
                  Fade Out
                </button>
              </div>
              
              {/* Bounce */}
              <button
                onClick={handleAddBounce}
                className="w-full px-2 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-xs text-white rounded transition-colors flex items-center justify-center gap-1"
                title="Landing with bounces"
                data-testid="motion-bounce"
              >
                <ArrowRight size={12} className="rotate-90" />
                Bounce Landing
              </button>
              
              <p className="text-[10px] text-zinc-600 mt-1">
                Adds keyframes at playhead position
              </p>
            </div>
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
