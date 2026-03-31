import React from 'react';
import { useEditor } from '../../store/editorStore';
import { Sparkles } from 'lucide-react';

export default function LayerEffectsPanel() {
  const { state, actions } = useEditor();
  const selectedLayer = state.layers.find(l => l.id === state.selectedLayerId);
  
  if (!selectedLayer) return null;
  
  const effects = selectedLayer.effects || {};
  
  const handleEffectChange = (effectName, property, value) => {
    const currentEffect = effects[effectName] || {};
    actions.updateLayerEffects(selectedLayer.id, {
      [effectName]: {
        ...currentEffect,
        [property]: value,
      },
    });
  };
  
  const handleToggleEffect = (effectName) => {
    const currentEffect = effects[effectName] || {};
    actions.updateLayerEffects(selectedLayer.id, {
      [effectName]: {
        ...currentEffect,
        enabled: !currentEffect.enabled,
      },
    });
  };

  return (
    <div className="p-4 border-b border-zinc-800">
      <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3 flex items-center gap-1">
        <Sparkles size={12} />
        Layer Effects
      </h2>
      
      <div className="space-y-3">
        {/* Drop Shadow */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs text-zinc-400">Drop Shadow</label>
            <button
              onClick={() => handleToggleEffect('dropShadow')}
              className={`w-8 h-4 rounded-full transition-colors ${
                effects.dropShadow?.enabled ? 'bg-cyan-500' : 'bg-zinc-700'
              }`}
              data-testid="effect-shadow-toggle"
            >
              <div className={`w-3 h-3 bg-white rounded-full transition-transform ${
                effects.dropShadow?.enabled ? 'translate-x-4' : 'translate-x-0.5'
              }`} />
            </button>
          </div>
          {effects.dropShadow?.enabled && (
            <div className="grid grid-cols-3 gap-1.5">
              <div>
                <span className="text-[10px] text-zinc-500">X</span>
                <input
                  type="number"
                  value={effects.dropShadow?.offsetX || 4}
                  onChange={(e) => handleEffectChange('dropShadow', 'offsetX', parseInt(e.target.value) || 0)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-1.5 py-1 text-xs font-mono"
                  data-testid="effect-shadow-x"
                />
              </div>
              <div>
                <span className="text-[10px] text-zinc-500">Y</span>
                <input
                  type="number"
                  value={effects.dropShadow?.offsetY || 4}
                  onChange={(e) => handleEffectChange('dropShadow', 'offsetY', parseInt(e.target.value) || 0)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-1.5 py-1 text-xs font-mono"
                  data-testid="effect-shadow-y"
                />
              </div>
              <div>
                <span className="text-[10px] text-zinc-500">Blur</span>
                <input
                  type="number"
                  min="0"
                  value={effects.dropShadow?.blur || 8}
                  onChange={(e) => handleEffectChange('dropShadow', 'blur', parseInt(e.target.value) || 0)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-1.5 py-1 text-xs font-mono"
                  data-testid="effect-shadow-blur"
                />
              </div>
            </div>
          )}
        </div>

        {/* Glow */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs text-zinc-400">Glow</label>
            <button
              onClick={() => handleToggleEffect('glow')}
              className={`w-8 h-4 rounded-full transition-colors ${
                effects.glow?.enabled ? 'bg-cyan-500' : 'bg-zinc-700'
              }`}
              data-testid="effect-glow-toggle"
            >
              <div className={`w-3 h-3 bg-white rounded-full transition-transform ${
                effects.glow?.enabled ? 'translate-x-4' : 'translate-x-0.5'
              }`} />
            </button>
          </div>
          {effects.glow?.enabled && (
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <span className="text-[10px] text-zinc-500">Color</span>
                <input
                  type="color"
                  value={effects.glow?.color || '#06B6D4'}
                  onChange={(e) => handleEffectChange('glow', 'color', e.target.value)}
                  className="w-full h-6 bg-zinc-950 border border-zinc-800 rounded cursor-pointer"
                  data-testid="effect-glow-color"
                />
              </div>
              <div>
                <span className="text-[10px] text-zinc-500">Size</span>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={effects.glow?.size || 10}
                  onChange={(e) => handleEffectChange('glow', 'size', parseInt(e.target.value) || 0)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-1.5 py-1 text-xs font-mono"
                  data-testid="effect-glow-size"
                />
              </div>
            </div>
          )}
        </div>

        {/* Outline */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs text-zinc-400">Outline</label>
            <button
              onClick={() => handleToggleEffect('outline')}
              className={`w-8 h-4 rounded-full transition-colors ${
                effects.outline?.enabled ? 'bg-cyan-500' : 'bg-zinc-700'
              }`}
              data-testid="effect-outline-toggle"
            >
              <div className={`w-3 h-3 bg-white rounded-full transition-transform ${
                effects.outline?.enabled ? 'translate-x-4' : 'translate-x-0.5'
              }`} />
            </button>
          </div>
          {effects.outline?.enabled && (
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <span className="text-[10px] text-zinc-500">Color</span>
                <input
                  type="color"
                  value={effects.outline?.color || '#000000'}
                  onChange={(e) => handleEffectChange('outline', 'color', e.target.value)}
                  className="w-full h-6 bg-zinc-950 border border-zinc-800 rounded cursor-pointer"
                  data-testid="effect-outline-color"
                />
              </div>
              <div>
                <span className="text-[10px] text-zinc-500">Width</span>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={effects.outline?.width || 2}
                  onChange={(e) => handleEffectChange('outline', 'width', parseInt(e.target.value) || 1)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-1.5 py-1 text-xs font-mono"
                  data-testid="effect-outline-width"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
