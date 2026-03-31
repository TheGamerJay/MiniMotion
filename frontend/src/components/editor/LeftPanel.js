import React, { useRef } from 'react';
import { useEditor } from '../../store/editorStore';
import { 
  Eye, 
  EyeOff, 
  Lock, 
  Unlock, 
  Trash2, 
  ChevronUp, 
  ChevronDown,
  MousePointer2,
  Scissors,
  Move3D,
  Type,
  Image as ImageIcon,
  Layers
} from 'lucide-react';

export default function LeftPanel() {
  const { state, actions } = useEditor();
  const fileInputRef = useRef(null);

  const tools = [
    { id: 'select', icon: MousePointer2, label: 'Select' },
    { id: 'cut', icon: Scissors, label: 'Cut' },
    { id: 'pivot', icon: Move3D, label: 'Pivot' },
    { id: 'text', icon: Type, label: 'Text' },
  ];

  const handleToolClick = (toolId) => {
    actions.setTool(toolId);
    
    // If text tool, add a text layer immediately
    if (toolId === 'text') {
      actions.addTextLayer({
        text: 'Text',
        x: state.project.canvasSize.width / 2,
        y: state.project.canvasSize.height / 2,
      });
      actions.setTool('select');
    }
  };

  const handleLayerSelect = (layerId) => {
    actions.selectLayer(layerId);
  };

  const handleToggleVisibility = (e, layerId, currentVisible) => {
    e.stopPropagation();
    actions.updateLayer(layerId, { visible: !currentVisible });
  };

  const handleToggleLock = (e, layerId, currentLocked) => {
    e.stopPropagation();
    actions.updateLayer(layerId, { locked: !currentLocked });
  };

  const handleDeleteLayer = (e, layerId) => {
    e.stopPropagation();
    if (window.confirm('Delete this layer?')) {
      actions.removeLayer(layerId);
    }
  };

  const handleMoveLayer = (e, index, direction) => {
    e.stopPropagation();
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= state.layers.length) return;
    
    const newLayers = [...state.layers];
    const [removed] = newLayers.splice(index, 1);
    newLayers.splice(newIndex, 0, removed);
    actions.reorderLayers(newLayers);
  };

  const handleLayerRename = (layerId, newName) => {
    actions.updateLayer(layerId, { name: newName });
  };

  const handleAssetClick = (asset) => {
    // Add asset as new layer
    actions.addLayer({
      name: asset.name.replace(/\.[^/.]+$/, ''),
      imageData: asset.dataURL,
      width: asset.width,
      height: asset.height,
      x: state.project.canvasSize.width / 2,
      y: state.project.canvasSize.height / 2,
    });
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload a PNG, JPG, or WebP image');
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const img = new Image();
        img.onload = () => {
          actions.addAsset({
            name: file.name,
            dataURL: event.target.result,
            width: img.width,
            height: img.height,
            type: file.type,
          });
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Failed to upload image:', error);
    }
    e.target.value = '';
  };

  return (
    <div 
      className="w-64 border-r border-zinc-800 flex flex-col bg-zinc-900 overflow-hidden"
      data-testid="left-panel"
    >
      {/* Tools Section */}
      <div className="p-3 border-b border-zinc-800">
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Tools</h2>
        <div className="flex gap-1">
          {tools.map(tool => (
            <button
              key={tool.id}
              onClick={() => handleToolClick(tool.id)}
              className={`flex-1 p-2 rounded transition-colors flex flex-col items-center gap-1 ${
                state.tool.active === tool.id
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                  : 'hover:bg-zinc-800 text-zinc-400 hover:text-white border border-transparent'
              }`}
              title={tool.label}
              data-testid={`tool-${tool.id}`}
            >
              <tool.icon size={18} />
              <span className="text-[10px]">{tool.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Assets Section */}
      <div className="p-3 border-b border-zinc-800">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide flex items-center gap-1">
            <ImageIcon size={12} />
            Assets
          </h2>
          <button
            onClick={handleUploadClick}
            className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
            data-testid="add-asset-btn"
          >
            + Add
          </button>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleFileUpload}
          className="hidden"
        />
        
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {state.assets.length === 0 ? (
            <p className="text-xs text-zinc-600 py-2 text-center">No assets uploaded</p>
          ) : (
            state.assets.map(asset => (
              <button
                key={asset.id}
                onClick={() => handleAssetClick(asset)}
                className="w-full flex items-center gap-2 p-1.5 hover:bg-zinc-800 rounded transition-colors text-left"
                data-testid={`asset-${asset.id}`}
              >
                <img 
                  src={asset.dataURL} 
                  alt={asset.name}
                  className="w-8 h-8 object-contain bg-zinc-950 rounded"
                />
                <span className="text-xs text-zinc-300 truncate flex-1">{asset.name}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Layers Section */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-3 pb-2">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide flex items-center gap-1">
            <Layers size={12} />
            Layers
          </h2>
        </div>
        
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {state.layers.length === 0 ? (
            <p className="text-xs text-zinc-600 py-4 text-center">
              Upload an image to start
            </p>
          ) : (
            <div className="space-y-1">
              {[...state.layers].reverse().map((layer, reversedIndex) => {
                const index = state.layers.length - 1 - reversedIndex;
                const isSelected = state.selectedLayerId === layer.id;
                
                return (
                  <div
                    key={layer.id}
                    onClick={() => handleLayerSelect(layer.id)}
                    className={`group flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-cyan-500/20 border border-cyan-500/50'
                        : 'hover:bg-zinc-800 border border-transparent'
                    }`}
                    data-testid={`layer-${layer.id}`}
                  >
                    {/* Layer thumbnail */}
                    <div className="w-8 h-8 bg-zinc-950 rounded flex-shrink-0 overflow-hidden">
                      {layer.imageData && (
                        <img 
                          src={layer.imageData} 
                          alt={layer.name}
                          className={`w-full h-full object-contain ${!layer.visible ? 'opacity-30' : ''}`}
                        />
                      )}
                    </div>
                    
                    {/* Layer name */}
                    <input
                      type="text"
                      value={layer.name}
                      onChange={(e) => handleLayerRename(layer.id, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className={`flex-1 bg-transparent text-xs border-none outline-none min-w-0 ${
                        layer.visible ? 'text-zinc-300' : 'text-zinc-600'
                      }`}
                      data-testid={`layer-name-${layer.id}`}
                    />
                    
                    {/* Layer controls */}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleMoveLayer(e, index, 1)}
                        className="p-0.5 hover:bg-zinc-700 rounded text-zinc-500 hover:text-white"
                        title="Move Up"
                        disabled={index === state.layers.length - 1}
                        data-testid={`layer-move-up-${layer.id}`}
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        onClick={(e) => handleMoveLayer(e, index, -1)}
                        className="p-0.5 hover:bg-zinc-700 rounded text-zinc-500 hover:text-white"
                        title="Move Down"
                        disabled={index === 0}
                        data-testid={`layer-move-down-${layer.id}`}
                      >
                        <ChevronDown size={14} />
                      </button>
                      <button
                        onClick={(e) => handleToggleVisibility(e, layer.id, layer.visible)}
                        className="p-0.5 hover:bg-zinc-700 rounded text-zinc-500 hover:text-white"
                        title={layer.visible ? 'Hide' : 'Show'}
                        data-testid={`layer-visibility-${layer.id}`}
                      >
                        {layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                      </button>
                      <button
                        onClick={(e) => handleToggleLock(e, layer.id, layer.locked)}
                        className="p-0.5 hover:bg-zinc-700 rounded text-zinc-500 hover:text-white"
                        title={layer.locked ? 'Unlock' : 'Lock'}
                        data-testid={`layer-lock-${layer.id}`}
                      >
                        {layer.locked ? <Lock size={14} /> : <Unlock size={14} />}
                      </button>
                      <button
                        onClick={(e) => handleDeleteLayer(e, layer.id)}
                        className="p-0.5 hover:bg-zinc-700 rounded text-zinc-500 hover:text-red-400"
                        title="Delete"
                        data-testid={`layer-delete-${layer.id}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
