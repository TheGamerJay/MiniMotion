import React, { useRef, useState, useEffect } from 'react';
import { useEditor } from '../../store/editorStore';
import { saveProject, getAllProjects, loadProject } from '../../utils/db';
import { renderAnimationFrames, exportAnimation, downloadBlob } from '../../utils/export';
import KeyboardShortcutsModal from './KeyboardShortcutsModal';
import { 
  Plus, 
  Save, 
  Download, 
  Play, 
  Pause, 
  FolderOpen,
  FileImage,
  RotateCcw,
  Undo2,
  Redo2,
  Keyboard,
  Check
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const AUTO_SAVE_INTERVAL = 30000; // 30 seconds
const EXPORT_SIZES = [
  { label: '512×512', width: 512, height: 512 },
  { label: '256×256', width: 256, height: 256 },
  { label: '128×128', width: 128, height: 128 },
  { label: 'Custom', width: null, height: null },
];

export default function TopBar() {
  const { state, actions } = useEditor();
  const [showProjectsModal, setShowProjectsModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportFormat, setExportFormat] = useState('gif');
  const [batchExport, setBatchExport] = useState(false);
  const [selectedSizes, setSelectedSizes] = useState([0]); // indices of EXPORT_SIZES
  const [projects, setProjects] = useState([]);
  const [projectName, setProjectName] = useState(state.project.name);
  const [autoSaveStatus, setAutoSaveStatus] = useState(null); // 'saving', 'saved', null
  const fileInputRef = useRef(null);
  const autoSaveTimerRef = useRef(null);

  // Auto-save effect
  useEffect(() => {
    if (state.project.id && state.ui.isDirty) {
      // Clear existing timer
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      
      // Set new auto-save timer
      autoSaveTimerRef.current = setTimeout(async () => {
        try {
          setAutoSaveStatus('saving');
          await saveProject({
            project: state.project,
            assets: state.assets,
            layers: state.layers,
            timeline: state.timeline,
          });
          actions.setUI({ isDirty: false, lastAutoSave: new Date().toISOString() });
          setAutoSaveStatus('saved');
          setTimeout(() => setAutoSaveStatus(null), 2000);
        } catch (error) {
          console.error('Auto-save failed:', error);
          setAutoSaveStatus(null);
        }
      }, AUTO_SAVE_INTERVAL);
    }
    
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [state.project, state.assets, state.layers, state.timeline, state.ui.isDirty, actions]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Undo: Ctrl+Z
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        actions.undo();
      }
      // Redo: Ctrl+Shift+Z or Ctrl+Y
      if ((e.ctrlKey && e.shiftKey && e.key === 'z') || (e.ctrlKey && e.key === 'y')) {
        e.preventDefault();
        actions.redo();
      }
      // Save: Ctrl+S
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      // Export: Ctrl+E
      if (e.ctrlKey && e.key === 'e') {
        e.preventDefault();
        handleExport();
      }
      // Show shortcuts: ?
      if (e.key === '?' && !e.ctrlKey) {
        setShowShortcutsModal(true);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [actions]);

  const handleUndo = () => {
    actions.undo();
  };

  const handleRedo = () => {
    actions.redo();
  };

  const handleNewProject = () => {
    if (state.ui.isDirty) {
      if (!window.confirm('You have unsaved changes. Create new project anyway?')) {
        return;
      }
    }
    const name = prompt('Enter project name:', 'Untitled Project');
    if (name) {
      actions.newProject(name);
      setProjectName(name);
    }
  };

  const handleSave = async () => {
    try {
      actions.setUI({ isSaving: true });
      await saveProject({
        project: state.project,
        assets: state.assets,
        layers: state.layers,
        timeline: state.timeline,
      });
      actions.setUI({ isSaving: false, isDirty: false });
    } catch (error) {
      console.error('Failed to save project:', error);
      actions.setUI({ isSaving: false });
      alert('Failed to save project');
    }
  };

  const handleOpenProjects = async () => {
    const savedProjects = await getAllProjects();
    setProjects(savedProjects);
    setShowProjectsModal(true);
  };

  const handleLoadProject = async (projectId) => {
    try {
      const projectData = await loadProject(projectId);
      if (projectData) {
        actions.loadProject(projectData);
        setProjectName(projectData.project.name);
        setShowProjectsModal(false);
      }
    } catch (error) {
      console.error('Failed to load project:', error);
      alert('Failed to load project');
    }
  };

  const handleProjectNameChange = (e) => {
    setProjectName(e.target.value);
  };

  const handleProjectNameBlur = () => {
    if (projectName !== state.project.name) {
      actions.updateProject({ name: projectName });
    }
  };

  const handlePlayPause = () => {
    actions.setTimeline({ isPlaying: !state.timeline.isPlaying });
  };

  const handleStop = () => {
    actions.setTimeline({ isPlaying: false, currentTime: 0 });
  };

  const handleExport = async () => {
    if (state.layers.length === 0) {
      alert('No layers to export');
      return;
    }
    
    setShowExportModal(true);
  };

  const handleStartExport = async () => {
    actions.setUI({ isExporting: true });
    setExportProgress(0);
    
    try {
      // Determine sizes to export
      const sizesToExport = batchExport 
        ? selectedSizes.map(i => EXPORT_SIZES[i]).filter(s => s.width !== null)
        : [state.project.canvasSize];
      
      for (let sizeIndex = 0; sizeIndex < sizesToExport.length; sizeIndex++) {
        const size = sizesToExport[sizeIndex];
        const progressBase = sizeIndex / sizesToExport.length;
        const progressRange = 1 / sizesToExport.length;
        
        // Render all frames at this size
        const frames = await renderAnimationFrames(
          state.layers,
          size,
          state.project.duration,
          state.project.fps,
          (progress) => setExportProgress(progressBase + progress * progressRange * 0.5)
        );
        
        // Export via backend
        setExportProgress(progressBase + progressRange * 0.5);
        const blob = await exportAnimation(
          frames,
          state.project.fps,
          size,
          exportFormat
        );
        
        setExportProgress(progressBase + progressRange);
        
        // Download the file
        const sizeSuffix = batchExport ? `_${size.width}x${size.height}` : '';
        const filename = `${state.project.name.replace(/[^a-z0-9]/gi, '_')}${sizeSuffix}.${exportFormat}`;
        downloadBlob(blob, filename);
        
        // Small delay between batch downloads
        if (batchExport && sizeIndex < sizesToExport.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      setShowExportModal(false);
    } catch (error) {
      console.error('Export failed:', error);
      alert(`Export failed: ${error.message}`);
    } finally {
      actions.setUI({ isExporting: false });
      setExportProgress(0);
    }
  };

  const handleToggleExportSize = (index) => {
    setSelectedSizes(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      }
      return [...prev, index];
    });
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload a PNG, JPG, or WebP image');
      return;
    }

    // Warn about large files
    if (file.size > 10 * 1024 * 1024) {
      if (!window.confirm('This image is quite large. Continue anyway?')) {
        return;
      }
    }

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const img = new Image();
        img.onload = () => {
          const asset = {
            name: file.name,
            dataURL: event.target.result,
            width: img.width,
            height: img.height,
            type: file.type,
          };
          
          // Add as asset
          actions.addAsset(asset);
          
          // Also add as layer for immediate use
          actions.addLayer({
            name: file.name.replace(/\.[^/.]+$/, ''),
            imageData: event.target.result,
            width: img.width,
            height: img.height,
            x: state.project.canvasSize.width / 2,
            y: state.project.canvasSize.height / 2,
          });
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Failed to upload image:', error);
      alert('Failed to upload image');
    }

    // Reset input
    e.target.value = '';
  };

  return (
    <>
      <div 
        className="h-14 border-b border-zinc-800 flex items-center justify-between px-4 bg-zinc-900"
        data-testid="top-bar"
      >
        {/* Left section - Logo and project actions */}
        <div className="flex items-center gap-4">
          <h1 
            className="font-heading text-lg font-bold text-cyan-400 tracking-tight"
            data-testid="app-logo"
          >
            Mini Editor
          </h1>
          
          <div className="h-6 w-px bg-zinc-700" />
          
          <div className="flex items-center gap-1">
            <button
              onClick={handleNewProject}
              className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors flex items-center justify-center"
              title="New Project"
              data-testid="new-project-btn"
            >
              <Plus size={18} />
            </button>
            
            <button
              onClick={handleOpenProjects}
              className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors flex items-center justify-center"
              title="Open Project"
              data-testid="open-project-btn"
            >
              <FolderOpen size={18} />
            </button>
            
            <button
              onClick={handleSave}
              disabled={state.ui.isSaving || !state.project.id}
              className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              title="Save Project (Ctrl+S)"
              data-testid="save-project-btn"
            >
              <Save size={18} />
            </button>
            
            <div className="h-4 w-px bg-zinc-700 mx-1" />
            
            {/* Undo/Redo buttons */}
            <button
              onClick={handleUndo}
              disabled={state.history.past.length === 0}
              className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
              title="Undo (Ctrl+Z)"
              data-testid="undo-btn"
            >
              <Undo2 size={18} />
            </button>
            
            <button
              onClick={handleRedo}
              disabled={state.history.future.length === 0}
              className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
              title="Redo (Ctrl+Shift+Z)"
              data-testid="redo-btn"
            >
              <Redo2 size={18} />
            </button>
            
            <div className="h-4 w-px bg-zinc-700 mx-1" />
            
            <button
              onClick={handleUploadClick}
              className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors flex items-center justify-center"
              title="Upload Image"
              data-testid="upload-image-btn"
            >
              <FileImage size={18} />
            </button>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleFileUpload}
              className="hidden"
              data-testid="file-input"
            />
          </div>
        </div>

        {/* Center section - Project name and auto-save status */}
        <div className="flex-1 flex justify-center items-center gap-2">
          <input
            type="text"
            value={projectName}
            onChange={handleProjectNameChange}
            onBlur={handleProjectNameBlur}
            className="bg-transparent border-none text-center text-sm font-medium text-zinc-300 focus:text-white focus:outline-none hover:text-white w-48"
            placeholder="Project Name"
            data-testid="project-name-input"
          />
          {state.ui.isDirty && !autoSaveStatus && (
            <span className="text-zinc-500 text-xs">•</span>
          )}
          {autoSaveStatus === 'saving' && (
            <span className="text-zinc-500 text-xs animate-pulse">Saving...</span>
          )}
          {autoSaveStatus === 'saved' && (
            <span className="text-green-500 text-xs flex items-center gap-1">
              <Check size={12} />
              Saved
            </span>
          )}
        </div>

        {/* Right section - Playback and Export */}
        <div className="flex items-center gap-2">
          {/* Shortcuts button */}
          <button
            onClick={() => setShowShortcutsModal(true)}
            className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors"
            title="Keyboard Shortcuts (?)"
            data-testid="shortcuts-btn"
          >
            <Keyboard size={18} />
          </button>
          
          <div className="h-4 w-px bg-zinc-700" />
          
          <div className="flex items-center gap-1 mr-2">
            <button
              onClick={handleStop}
              className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors flex items-center justify-center"
              title="Stop"
              data-testid="timeline-stop"
            >
              <RotateCcw size={18} />
            </button>
            
            <button
              onClick={handlePlayPause}
              className="p-2 bg-cyan-500 hover:bg-cyan-400 text-black rounded-md transition-colors flex items-center justify-center"
              title={state.timeline.isPlaying ? 'Pause' : 'Play'}
              data-testid="timeline-play"
            >
              {state.timeline.isPlaying ? <Pause size={18} /> : <Play size={18} />}
            </button>
          </div>
          
          <button
            onClick={handleExport}
            disabled={state.ui.isExporting || state.layers.length === 0}
            className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            data-testid="export-btn"
          >
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      {/* Projects Modal */}
      {showProjectsModal && (
        <div 
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          onClick={() => setShowProjectsModal(false)}
        >
          <div 
            className="bg-zinc-900 border border-zinc-800 rounded-lg w-96 max-h-96 overflow-hidden"
            onClick={e => e.stopPropagation()}
            data-testid="projects-modal"
          >
            <div className="p-4 border-b border-zinc-800">
              <h2 className="font-heading font-semibold text-white">Open Project</h2>
            </div>
            <div className="p-2 max-h-72 overflow-y-auto">
              {projects.length === 0 ? (
                <p className="text-zinc-500 text-sm text-center py-8">No saved projects</p>
              ) : (
                projects.map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleLoadProject(p.id)}
                    className="w-full text-left p-3 hover:bg-zinc-800 rounded transition-colors"
                    data-testid={`project-item-${p.id}`}
                  >
                    <div className="text-sm font-medium text-white">{p.project.name}</div>
                    <div className="text-xs text-zinc-500">
                      {new Date(p.project.updatedAt).toLocaleDateString()}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      {/* Export Modal */}
      {showExportModal && (
        <div 
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          onClick={() => !state.ui.isExporting && setShowExportModal(false)}
        >
          <div 
            className="bg-zinc-900 border border-zinc-800 rounded-lg w-96 overflow-hidden"
            onClick={e => e.stopPropagation()}
            data-testid="export-modal"
          >
            <div className="p-4 border-b border-zinc-800">
              <h2 className="font-heading font-semibold text-white">Export Animation</h2>
            </div>
            <div className="p-4 space-y-4">
              {/* Format selection */}
              <div>
                <label className="text-xs text-zinc-400 mb-2 block">Format</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setExportFormat('gif')}
                    className={`flex-1 py-2 rounded-md transition-colors ${
                      exportFormat === 'gif'
                        ? 'bg-violet-600 text-white'
                        : 'bg-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                    disabled={state.ui.isExporting}
                    data-testid="export-format-gif"
                  >
                    GIF
                  </button>
                  <button
                    onClick={() => setExportFormat('webm')}
                    className={`flex-1 py-2 rounded-md transition-colors ${
                      exportFormat === 'webm'
                        ? 'bg-violet-600 text-white'
                        : 'bg-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                    disabled={state.ui.isExporting}
                    data-testid="export-format-webm"
                  >
                    WebM
                  </button>
                </div>
              </div>
              
              {/* Export info */}
              <div className="text-xs text-zinc-500 space-y-1">
                <p>Size: {state.project.canvasSize.width}×{state.project.canvasSize.height}</p>
                <p>Duration: {state.project.duration}s @ {state.project.fps} fps</p>
                <p>Total frames: {Math.ceil(state.project.duration * state.project.fps)}</p>
              </div>
              
              {/* Batch export toggle */}
              <div className="flex items-center justify-between">
                <label className="text-xs text-zinc-400">Batch Export (multiple sizes)</label>
                <button
                  onClick={() => setBatchExport(!batchExport)}
                  className={`w-8 h-4 rounded-full transition-colors ${
                    batchExport ? 'bg-cyan-500' : 'bg-zinc-700'
                  }`}
                  disabled={state.ui.isExporting}
                  data-testid="batch-export-toggle"
                >
                  <div className={`w-3 h-3 bg-white rounded-full transition-transform ${
                    batchExport ? 'translate-x-4' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
              
              {/* Size selection for batch export */}
              {batchExport && (
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Export Sizes</label>
                  <div className="flex flex-wrap gap-1">
                    {EXPORT_SIZES.filter(s => s.width !== null).map((size, index) => (
                      <button
                        key={size.label}
                        onClick={() => handleToggleExportSize(index)}
                        disabled={state.ui.isExporting}
                        className={`px-2 py-1 text-xs rounded transition-colors ${
                          selectedSizes.includes(index)
                            ? 'bg-cyan-500 text-black'
                            : 'bg-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                        data-testid={`export-size-${size.label}`}
                      >
                        {size.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Progress bar */}
              {state.ui.isExporting && (
                <div className="space-y-2">
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-cyan-500 transition-all duration-300"
                      style={{ width: `${exportProgress * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-zinc-400 text-center">
                    {exportProgress < 0.5 ? 'Rendering frames...' : 'Encoding...'}
                  </p>
                </div>
              )}
              
              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowExportModal(false)}
                  className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-md transition-colors"
                  disabled={state.ui.isExporting}
                  data-testid="export-cancel"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStartExport}
                  className="flex-1 py-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-md transition-colors disabled:opacity-50"
                  disabled={state.ui.isExporting}
                  data-testid="export-start"
                >
                  {state.ui.isExporting ? 'Exporting...' : 'Export'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Modal */}
      {showShortcutsModal && (
        <KeyboardShortcutsModal onClose={() => setShowShortcutsModal(false)} />
      )}
    </>
  );
}
