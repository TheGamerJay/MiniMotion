import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useEditor } from '../../store/editorStore';
import { Play, Pause, RotateCcw, Repeat, Repeat1 } from 'lucide-react';

export default function Timeline() {
  const { state, actions } = useEditor();
  const timelineRef = useRef(null);
  const trackAreaRef = useRef(null);
  const animationRef = useRef(null);
  const lastTimeRef = useRef(null);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);

  const { duration, fps } = state.project;
  const { currentTime, isPlaying, loop } = state.timeline;
  
  // Calculate pixels per second for timeline scale
  const pixelsPerSecond = 100;
  const timelineWidth = duration * pixelsPerSecond;

  // Animation loop
  useEffect(() => {
    if (isPlaying) {
      lastTimeRef.current = performance.now();
      
      const animate = (now) => {
        if (!lastTimeRef.current) {
          lastTimeRef.current = now;
        }
        
        const delta = (now - lastTimeRef.current) / 1000;
        lastTimeRef.current = now;
        
        let newTime = currentTime + delta;
        
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
        animationRef.current = requestAnimationFrame(animate);
      };
      
      animationRef.current = requestAnimationFrame(animate);
      
      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }
  }, [isPlaying, currentTime, duration, loop, actions]);

  const handlePlayPause = () => {
    actions.setTimeline({ isPlaying: !isPlaying });
  };

  const handleStop = () => {
    actions.setTimeline({ isPlaying: false, currentTime: 0 });
  };

  const handleToggleLoop = () => {
    actions.setTimeline({ loop: !loop });
  };

  const handleTimelineClick = (e) => {
    if (isDraggingPlayhead) return;
    
    const rect = trackAreaRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const newTime = Math.max(0, Math.min(duration, x / pixelsPerSecond));
    actions.setTimeline({ currentTime: newTime });
  };

  const handlePlayheadMouseDown = (e) => {
    e.stopPropagation();
    setIsDraggingPlayhead(true);
  };

  useEffect(() => {
    if (!isDraggingPlayhead) return;

    const handleMouseMove = (e) => {
      const rect = trackAreaRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
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

  const handleKeyframeClick = (e, layerId, time) => {
    e.stopPropagation();
    actions.setTimeline({ currentTime: parseFloat(time) });
    actions.selectLayer(layerId);
  };

  const handleKeyframeDoubleClick = (e, layerId, time) => {
    e.stopPropagation();
    if (window.confirm('Delete this keyframe?')) {
      actions.removeKeyframe(layerId, parseFloat(time));
    }
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
            {[...state.layers].reverse().map(layer => (
              <div
                key={layer.id}
                className={`h-8 border-b border-zinc-800/50 relative ${
                  state.selectedLayerId === layer.id
                    ? 'bg-cyan-500/5'
                    : 'hover:bg-zinc-800/30'
                }`}
                data-testid={`timeline-track-${layer.id}`}
              >
                {/* Keyframes */}
                {Object.keys(layer.keyframes || {}).map(time => (
                  <div
                    key={time}
                    className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-violet-500 cursor-pointer hover:scale-125 transition-transform keyframe-diamond"
                    style={{ left: parseFloat(time) * pixelsPerSecond - 5 }}
                    onClick={(e) => handleKeyframeClick(e, layer.id, time)}
                    onDoubleClick={(e) => handleKeyframeDoubleClick(e, layer.id, time)}
                    title={`Keyframe at ${time}s - Double-click to delete`}
                    data-testid={`keyframe-${layer.id}-${time}`}
                  />
                ))}
              </div>
            ))}

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
