import React, { useEffect } from 'react';
import '@/App.css';
import { EditorProvider, useEditor } from './store/editorStore';
import TopBar from './components/editor/TopBar';
import LeftPanel from './components/editor/LeftPanel';
import Canvas from './components/editor/Canvas';
import RightPanel from './components/editor/RightPanel';
import Timeline from './components/editor/Timeline';

function EditorLayout() {
  const { state, actions } = useEditor();

  // Initialize new project on mount if none exists
  useEffect(() => {
    if (!state.project.id) {
      actions.newProject('Untitled Project');
    }
  }, [state.project.id, actions]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Space bar to play/pause
      if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
        e.preventDefault();
        actions.setTimeline({ isPlaying: !state.timeline.isPlaying });
      }
      
      // Escape to deselect or cancel cut
      if (e.code === 'Escape') {
        if (state.tool.active === 'cut') {
          actions.clearCutPoints();
          actions.setTool('select');
        } else {
          actions.selectLayer(null);
        }
      }
      
      // Enter to finish cut
      if (e.code === 'Enter' && state.tool.active === 'cut' && state.tool.cutPoints.length >= 3) {
        // Trigger cut processing
        console.log('Finish cut with Enter');
        actions.clearCutPoints();
        actions.setTool('select');
      }
      
      // Delete to remove selected layer
      if ((e.code === 'Delete' || e.code === 'Backspace') && 
          state.selectedLayerId && 
          e.target.tagName !== 'INPUT') {
        e.preventDefault();
        const layer = state.layers.find(l => l.id === state.selectedLayerId);
        if (layer && !layer.locked) {
          actions.removeLayer(state.selectedLayerId);
        }
      }
      
      // Tool shortcuts
      if (e.target.tagName !== 'INPUT') {
        if (e.code === 'KeyV') actions.setTool('select');
        if (e.code === 'KeyC') actions.setTool('cut');
        if (e.code === 'KeyP') actions.setTool('pivot');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state, actions]);

  return (
    <div 
      className="h-screen w-screen overflow-hidden flex flex-col bg-zinc-950 text-white no-select"
      data-testid="editor-app"
    >
      <TopBar />
      
      <div className="flex-1 flex overflow-hidden">
        <LeftPanel />
        <Canvas />
        <RightPanel />
      </div>
      
      <Timeline />
    </div>
  );
}

function App() {
  return (
    <EditorProvider>
      <EditorLayout />
    </EditorProvider>
  );
}

export default App;
