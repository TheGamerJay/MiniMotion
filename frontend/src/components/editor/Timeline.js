import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useEditor } from '../../store/editorStore';
import { EASING_TYPES, EASING_LABELS, PRIMARY_EASINGS } from '../../utils/animation';
import { Play, Pause, RotateCcw, Repeat, Repeat1, Copy, ClipboardPaste } from 'lucide-react';

export default function Timeline() {
  const { state, actions } = useEditor();
  const timelineRef = useRef(null);
  const trackAreaRef = useRef(null);
  const animationRef = useRef(null);
  const lastTimeRef = useRef(null);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  const [draggingKeyframe, setDraggingKeyframe] = useState(null);
  const [selectedKeyframe, setSelectedKeyframe] = useState(null);
  const [selectedKeyframes, setSelectedKeyframes] = useState([]); // Multi-select for copy

  const { duration, fps } = state.project;
  const { currentTime, isPlaying, loop } = state.timeline;
  
  // Calculate pixels per second for timeline scale
  const pixelsPerSecond = 100;
  const timelineWidth = duration * pixelsPerSecond;

  // Calculate layer timing info for visualization
  const layerTimingInfo = useMemo(() => {
    return state.layers.map(layer => {
      const times = Object.keys(layer.keyframes || {}).map(Number).sort((a, b) => a - b);
      if (times.length === 0) return { firstKeyframe: null, lastKeyframe: null, duration: 0 };
      return {
        firstKeyframe: times[0],
        lastKeyframe: times[times.length - 1],
        duration: times[times.length - 1] - times[0],
      };
    });
  }, [state.layers]);

  // Improved animation loop with fixed timestep for consistent FPS
  useEffect(() => {
    if (isPlaying) {
      const frameTime = 1000 / fps; // Target frame time in ms
      let accumulator = 0;
      lastTimeRef.current = performance.now();
      
      const animate = (now) => {
        const delta = now - lastTimeRef.current;
        lastTimeRef.current = now;
        accumulator += delta;
        
        // Process accumulated time in fixed steps
        while (accumulator >= frameTime) {
          accumulator -= frameTime;
          
          let newTime = state.timeline.currentTime + (frameTime / 1000);
          
          if (newTime >= duration) {
            if (loop) {
              newTime = newTime % duration;
            } else {
              newTime = duration;
              actions.setTimeline({ isPlaying: false, currentTime: newTime });
              return;
            }
          }
          
          actions.setTimeline({ currentTime: newTime });
        }
        
        animationRef.current = requestAnimationFrame(animate);
      };
      
      animationRef.current = requestAnimationFrame(animate);
      
      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }
  }, [isPlaying, duration, loop, fps, actions, state.timeline.currentTime]);

  const handlePlayPause = () => {
    lastTimeRef.current = null;
    actions.setTimeline({ isPlaying: !isPlaying });
  };

  const handleStop = () => {
    actions.setTimeline({ isPlaying: false, currentTime: 0 });
  };

  const handleToggleLoop = () => {
    actions.setTimeline({ loop: !loop });
  };

  const handleTimelineClick = (e) => {
    if (isDraggingPlayhead || draggingKeyframe) return;
    
    const rect = trackAreaRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + trackAreaRef.current.scrollLeft;
    const newTime = Math.max(0, Math.min(duration, x / pixelsPerSecond));
    actions.setTimeline({ currentTime: newTime });
    setSelectedKeyframe(null);
  };

  const handlePlayheadMouseDown = (e) => {
    e.stopPropagation();
    setIsDraggingPlayhead(true);
  };

  useEffect(() => {
    if (!isDraggingPlayhead) return;

    const handleMouseMove = (e) => {
      const rect = trackAreaRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left + trackAreaRef.current.scrollLeft;
      const newTime = Math.max(0, Math.min(duration, x / pixelsPerSecond));
      actions.setTimeline({ currentTime: newTime });
    };

    const handleMouseUp = () => {
      setIsDraggingPlayhead(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingPlayhead, duration, pixelsPerSecond, actions]);

  // Keyframe dragging for independent timing control
  const handleKeyframeMouseDown = (e, layerId, time) => {
    e.stopPropagation();
    setDraggingKeyframe({ layerId, originalTime: parseFloat(time) });
    setSelectedKeyframe({ layerId, time: parseFloat(time) });
    actions.selectLayer(layerId);
  };

  useEffect(() => {
    if (!draggingKeyframe) return;

    const handleMouseMove = (e) => {
      const rect = trackAreaRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left + trackAreaRef.current.scrollLeft;
      let newTime = Math.max(0, Math.min(duration, x / pixelsPerSecond));
      
      // Snap to 0.05s increments for precision
      newTime = Math.round(newTime * 20) / 20;
      
      const { layerId, originalTime } = draggingKeyframe;
      const layer = state.layers.find(l => l.id === layerId);
      
      if (layer && newTime !== originalTime) {
        // Move keyframe to new time
        const keyframeData = layer.keyframes[originalTime];
        if (keyframeData) {
          // Remove from old time, add to new time
          const newKeyframes = { ...layer.keyframes };
          delete newKeyframes[originalTime];
          newKeyframes[newTime] = keyframeData;
          
          actions.updateLayer(layerId, { keyframes: newKeyframes });
          setDraggingKeyframe({ layerId, originalTime: newTime });
          setSelectedKeyframe({ layerId, time: newTime });
        }
      }
    };

    const handleMouseUp = () => {
      setDraggingKeyframe(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingKeyframe, duration, pixelsPerSecond, state.layers, actions]);

  const handleKeyframeClick = (e, layerId, time) => {
    e.stopPropagation();
    const timeFloat = parseFloat(time);
    actions.setTimeline({ currentTime: timeFloat });
    actions.selectLayer(layerId);
    setSelectedKeyframe({ layerId, time: timeFloat });
    
    // Multi-select with Shift key
    if (e.shiftKey) {
      setSelectedKeyframes(prev => {
        const existing = prev.find(k => k.layerId === layerId && k.time === timeFloat);
        if (existing) {
          return prev.filter(k => !(k.layerId === layerId && k.time === timeFloat));
        }
        return [...prev, { layerId, time: timeFloat }];
      });
    } else {
      setSelectedKeyframes([{ layerId, time: timeFloat }]);
    }
  };

  const handleKeyframeDoubleClick = (e, layerId, time) => {
    e.stopPropagation();
    if (window.confirm('Delete this keyframe?')) {
      actions.removeKeyframe(layerId, parseFloat(time));
      setSelectedKeyframe(null);
      setSelectedKeyframes([]);
    }
  };

  // Copy selected keyframes
  const handleCopySelected = () => {
    if (selectedKeyframes.length === 0 && selectedKeyframe) {
      // Copy single keyframe
      actions.copyKeyframes(selectedKeyframe.layerId, [selectedKeyframe.time]);
    } else if (selectedKeyframes.length > 0) {
      // Copy multiple keyframes from same layer
      const layerId = selectedKeyframes[0].layerId;
      const times = selectedKeyframes
        .filter(k => k.layerId === layerId)
        .map(k => k.time);
      actions.copyKeyframes(layerId, times);
    }
  };

  // Paste keyframes at current time
  const handlePasteAtPlayhead = () => {
    if (!state.clipboard.keyframes || !state.selectedLayerId) return;
    actions.pasteKeyframes(state.selectedLayerId, currentTime);
  };

  const handleEasingChange = (layerId, time, newEasing) => {
    const layer = state.layers.find(l => l.id === layerId);
    if (layer && layer.keyframes[time]) {
      actions.updateKeyframe(layerId, time, { easing: newEasing });
    }
  };

  // Get easing for a specific keyframe
  const getKeyframeEasing = (layer, time) => {
    return layer.keyframes?.[time]?.easing || EASING_TYPES.LINEAR;
  };

  // Generate time markers
  const timeMarkers = [];
  for (let t = 0; t <= duration; t += 0.5) {
    timeMarkers.push(t);
  }

  const playheadPosition = currentTime * pixelsPerSecond;

  return (
    <div 
      ref={timelineRef}
      className="h-64 border-t border-zinc-800 bg-zinc-900 flex flex-col"
      data-testid="timeline"
    >
      {/* Timeline controls */}
      <div className="h-10 border-b border-zinc-800 flex items-center px-4 gap-2">
        <button
          onClick={handleStop}
          className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors"
          title="Stop & Reset"
          data-testid="timeline-stop"
        >
          <RotateCcw size={16} />
        </button>
        
        <button
          onClick={handlePlayPause}
          className="p-2 bg-cyan-500 hover:bg-cyan-400 text-black rounded transition-colors"
          title={isPlaying ? 'Pause' : 'Play'}
          data-testid="timeline-play"
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
        </button>
        
        <button
          onClick={handleToggleLoop}
          className={`p-1.5 rounded transition-colors ${
            loop 
              ? 'bg-violet-500/20 text-violet-400' 
              : 'hover:bg-zinc-800 text-zinc-400 hover:text-white'
          }`}
          title={loop ? 'Loop On' : 'Loop Off'}
          data-testid="timeline-loop"
        >
          {loop ? <Repeat size={16} /> : <Repeat1 size={16} />}
        </button>
        
        <div className="h-4 w-px bg-zinc-700 mx-2" />
        
        <span className="text-xs font-mono text-zinc-400">
          {currentTime.toFixed(2)}s / {duration.toFixed(2)}s
        </span>
        
        <span className="text-xs text-zinc-600 ml-2">
          @ {fps} fps
        </span>

        {/* Easing selector for selected keyframe */}
        {selectedKeyframe && (
          <>
            <div className="h-4 w-px bg-zinc-700 mx-2" />
            <span className="text-xs text-zinc-500">Easing:</span>
            <select
              value={getKeyframeEasing(
                state.layers.find(l => l.id === selectedKeyframe.layerId),
                selectedKeyframe.time
              )}
              onChange={(e) => handleEasingChange(
                selectedKeyframe.layerId,
                selectedKeyframe.time,
                e.target.value
              )}
              className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-white focus:border-cyan-500 outline-none"
              data-testid="easing-selector"
            >
              {PRIMARY_EASINGS.map(easing => (
                <option key={easing} value={easing}>
                  {EASING_LABELS[easing]}
                </option>
              ))}
            </select>
            
            {/* Copy/Paste buttons */}
            <div className="h-4 w-px bg-zinc-700 mx-2" />
            <button
              onClick={handleCopySelected}
              className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-cyan-400 transition-colors"
              title="Copy Keyframes (Ctrl+C)"
              data-testid="copy-keyframes-timeline"
            >
              <Copy size={14} />
            </button>
            <button
              onClick={handlePasteAtPlayhead}
              disabled={!state.clipboard.keyframes}
              className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-cyan-400 transition-colors disabled:opacity-50"
              title="Paste at Playhead (Ctrl+V)"
              data-testid="paste-keyframes-timeline"
            >
              <ClipboardPaste size={14} />
            </button>
          </>
        )}
      </div>

      {/* Timeline header with time markers */}
      <div className="h-6 border-b border-zinc-800/50 flex">
        <div className="w-40 flex-shrink-0 border-r border-zinc-800/50" />
        <div 
          className="flex-1 relative overflow-x-auto"
          style={{ minWidth: timelineWidth }}
        >
          {timeMarkers.map(time => (
            <div
              key={time}
              className="absolute top-0 bottom-0 flex flex-col items-center"
              style={{ left: time * pixelsPerSecond }}
            >
              <div className={`h-2 w-px ${time % 1 === 0 ? 'bg-zinc-600' : 'bg-zinc-800'}`} />
              {time % 1 === 0 && (
                <span className="text-[10px] text-zinc-600 font-mono">{time}s</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Track area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Layer names column */}
        <div className="w-40 flex-shrink-0 border-r border-zinc-800/50 overflow-y-auto">
          {state.layers.length === 0 ? (
            <div className="h-8 flex items-center px-3 text-xs text-zinc-600">
              No layers
            </div>
          ) : (
            [...state.layers].reverse().map(layer => (
              <div
                key={layer.id}
                className={`h-8 flex items-center px-3 border-b border-zinc-800/50 cursor-pointer transition-colors ${
                  state.selectedLayerId === layer.id
                    ? 'bg-cyan-500/10 text-cyan-400'
                    : 'hover:bg-zinc-800/50 text-zinc-400'
                }`}
                onClick={() => actions.selectLayer(layer.id)}
                data-testid={`timeline-layer-${layer.id}`}
              >
                <span className="text-xs truncate">{layer.name}</span>
              </div>
            ))
          )}
        </div>

        {/* Tracks area */}
        <div 
          ref={trackAreaRef}
          className="flex-1 overflow-auto relative"
          onClick={handleTimelineClick}
          data-testid="timeline-tracks"
        >
          <div 
            className="relative"
            style={{ width: timelineWidth, minHeight: '100%' }}
          >
            {/* Layer tracks */}
            {[...state.layers].reverse().map((layer, reversedIndex) => {
              const layerIndex = state.layers.length - 1 - reversedIndex;
              const timing = layerTimingInfo[layerIndex];
              const keyframeTimes = Object.keys(layer.keyframes || {}).map(Number).sort((a, b) => a - b);
              
              return (
              <div
                key={layer.id}
                className={`h-8 border-b border-zinc-800/50 relative ${
                  state.selectedLayerId === layer.id
                    ? 'bg-cyan-500/5'
                    : 'hover:bg-zinc-800/30'
                }`}
                data-testid={`timeline-track-${layer.id}`}
              >
                {/* Activity span indicator - shows where animation is active */}
                {timing.firstKeyframe !== null && timing.duration > 0 && (
                  <div
                    className="absolute top-1/2 -translate-y-1/2 h-1 bg-violet-500/30 rounded-full"
                    style={{
                      left: timing.firstKeyframe * pixelsPerSecond,
                      width: timing.duration * pixelsPerSecond,
                    }}
                  />
                )}
                
                {/* Connection lines between keyframes */}
                {keyframeTimes.length > 1 && keyframeTimes.slice(0, -1).map((time, i) => {
                  const nextTime = keyframeTimes[i + 1];
                  const nextKeyframe = layer.keyframes[nextTime];
                  const easing = nextKeyframe?.easing || EASING_TYPES.LINEAR;
                  const hasEasing = easing !== EASING_TYPES.LINEAR;
                  
                  return (
                    <div
                      key={`conn-${time}-${nextTime}`}
                      className={`absolute top-1/2 h-px ${hasEasing ? 'bg-cyan-500/40' : 'bg-zinc-600/40'}`}
                      style={{
                        left: time * pixelsPerSecond,
                        width: (nextTime - time) * pixelsPerSecond,
                      }}
                    />
                  );
                })}

                {/* Keyframes */}
                {Object.keys(layer.keyframes || {}).map(time => {
                  const isSelected = selectedKeyframe?.layerId === layer.id && 
                                    selectedKeyframe?.time === parseFloat(time);
                  const isMultiSelected = selectedKeyframes.some(
                    k => k.layerId === layer.id && k.time === parseFloat(time)
                  );
                  const easing = getKeyframeEasing(layer, time);
                  const hasEasing = easing !== EASING_TYPES.LINEAR;
                  
                  return (
                    <div
                      key={time}
                      className={`absolute top-1/2 -translate-y-1/2 cursor-pointer transition-transform ${
                        isSelected ? 'scale-150 z-20' : isMultiSelected ? 'scale-125 z-10' : 'hover:scale-125'
                      }`}
                      style={{ left: parseFloat(time) * pixelsPerSecond - 5 }}
                      onClick={(e) => handleKeyframeClick(e, layer.id, time)}
                      onDoubleClick={(e) => handleKeyframeDoubleClick(e, layer.id, time)}
                      onMouseDown={(e) => handleKeyframeMouseDown(e, layer.id, time)}
                      title={`${time}s - ${EASING_LABELS[easing]}\nShift+Click to multi-select\nDrag to move, Double-click to delete`}
                      data-testid={`keyframe-${layer.id}-${time}`}
                    >
                      {/* Keyframe diamond */}
                      <div 
                        className={`w-2.5 h-2.5 keyframe-diamond ${
                          isSelected 
                            ? 'bg-cyan-400' 
                            : isMultiSelected
                              ? 'bg-cyan-300'
                              : hasEasing 
                                ? 'bg-violet-400' 
                                : 'bg-violet-500'
                        }`}
                      />
                      {/* Easing indicator dot */}
                      {hasEasing && !isSelected && (
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-cyan-400" />
                      )}
                    </div>
                  );
                })}
              </div>
              );
            })}

            {/* Empty state tracks placeholder */}
            {state.layers.length === 0 && (
              <div className="h-8 border-b border-zinc-800/50 flex items-center justify-center">
                <span className="text-xs text-zinc-600">Upload an image to start</span>
              </div>
            )}

            {/* Playhead */}
            <div
              className="absolute top-0 bottom-0 w-px bg-cyan-500 z-10 pointer-events-none"
              style={{ left: playheadPosition }}
              data-testid="playhead"
            >
              <div
                className="absolute -top-0 -ml-2 w-4 h-4 cursor-ew-resize pointer-events-auto"
                onMouseDown={handlePlayheadMouseDown}
                data-testid="playhead-handle"
              >
                <svg viewBox="0 0 16 16" className="w-4 h-4 fill-cyan-500">
                  <polygon points="8,0 16,8 8,16 0,8" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
