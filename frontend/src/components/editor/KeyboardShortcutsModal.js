import React from 'react';
import { X, Keyboard } from 'lucide-react';

const SHORTCUTS = [
  { category: 'Tools', shortcuts: [
    { keys: ['V'], description: 'Select tool' },
    { keys: ['C'], description: 'Cut tool' },
    { keys: ['P'], description: 'Pivot tool' },
    { keys: ['T'], description: 'Text tool' },
  ]},
  { category: 'Playback', shortcuts: [
    { keys: ['Space'], description: 'Play / Pause' },
    { keys: ['Home'], description: 'Go to start' },
    { keys: ['End'], description: 'Go to end' },
    { keys: ['←', '→'], description: 'Step frame' },
  ]},
  { category: 'Edit', shortcuts: [
    { keys: ['Ctrl', 'Z'], description: 'Undo' },
    { keys: ['Ctrl', 'Shift', 'Z'], description: 'Redo' },
    { keys: ['Ctrl', 'C'], description: 'Copy keyframes' },
    { keys: ['Ctrl', 'V'], description: 'Paste keyframes' },
    { keys: ['Delete'], description: 'Delete layer' },
    { keys: ['Ctrl', 'D'], description: 'Duplicate layer' },
  ]},
  { category: 'View', shortcuts: [
    { keys: ['Ctrl', '+'], description: 'Zoom in' },
    { keys: ['Ctrl', '-'], description: 'Zoom out' },
    { keys: ['Ctrl', '0'], description: 'Reset zoom' },
    { keys: ['O'], description: 'Toggle onion skin' },
    { keys: ['M'], description: 'Toggle motion path' },
  ]},
  { category: 'Timeline', shortcuts: [
    { keys: ['K'], description: 'Add keyframe' },
    { keys: ['Shift', 'Click'], description: 'Multi-select keyframes' },
  ]},
  { category: 'General', shortcuts: [
    { keys: ['Ctrl', 'S'], description: 'Save project' },
    { keys: ['Ctrl', 'E'], description: 'Export' },
    { keys: ['Escape'], description: 'Deselect / Cancel' },
    { keys: ['?'], description: 'Show shortcuts' },
  ]},
];

export default function KeyboardShortcutsModal({ onClose }) {
  return (
    <div 
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-zinc-900 border border-zinc-800 rounded-lg w-[600px] max-h-[80vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
        data-testid="shortcuts-modal"
      >
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="font-heading font-semibold text-white flex items-center gap-2">
            <Keyboard size={18} />
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors"
            data-testid="close-shortcuts-modal"
          >
            <X size={18} />
          </button>
        </div>
        
        <div className="p-4 overflow-y-auto max-h-[calc(80vh-60px)]">
          <div className="grid grid-cols-2 gap-6">
            {SHORTCUTS.map(category => (
              <div key={category.category}>
                <h3 className="text-xs font-semibold text-cyan-400 uppercase tracking-wide mb-2">
                  {category.category}
                </h3>
                <div className="space-y-1">
                  {category.shortcuts.map((shortcut, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between py-1"
                    >
                      <span className="text-xs text-zinc-400">{shortcut.description}</span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, keyIndex) => (
                          <React.Fragment key={keyIndex}>
                            {keyIndex > 0 && <span className="text-zinc-600 text-xs">+</span>}
                            <kbd className="px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-xs font-mono text-zinc-300">
                              {key}
                            </kbd>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
