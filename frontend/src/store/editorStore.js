import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';

const EditorContext = createContext(null);

const DEFAULT_CANVAS_SIZE = { width: 512, height: 512 };
const DEFAULT_FPS = 24;
const DEFAULT_DURATION = 2; // seconds
const MAX_HISTORY_SIZE = 50; // Maximum undo steps
const AUTO_SAVE_INTERVAL = 30000; // 30 seconds

const initialState = {
  // Project metadata
  project: {
    id: null,
    name: 'Untitled Project',
    canvasSize: DEFAULT_CANVAS_SIZE,
    fps: DEFAULT_FPS,
    duration: DEFAULT_DURATION,
    createdAt: null,
    updatedAt: null,
  },
  
  // Assets (uploaded images)
  assets: [],
  
  // Layers (cut parts) - now includes text layers
  layers: [],
  
  // Selected layer ID
  selectedLayerId: null,
  
  // Timeline state
  timeline: {
    currentTime: 0,
    isPlaying: false,
    loop: true,
    previewRange: null, // { start: number, end: number } for quick preview
  },
  
  // Tool state
  tool: {
    active: 'select', // 'select', 'cut', 'pivot', 'text'
    cutPoints: [], // Points for cut polygon
    cutMode: 'polygon', // 'polygon', 'bezier', 'magicWand'
  },
  
  // Canvas state
  canvas: {
    zoom: 1,
    panX: 0,
    panY: 0,
    showMotionPath: false,
  },
  
  // History for undo/redo
  history: {
    past: [],
    future: [],
  },
  
  // UI state
  ui: {
    isDirty: false,
    isSaving: false,
    isExporting: false,
    onionSkinEnabled: false,
    onionSkinFrames: 2,
    showShortcutsModal: false,
    lastAutoSave: null,
  },
  
  // Clipboard for keyframe copy/paste
  clipboard: {
    keyframes: null,
    sourceLayerId: null,
  },
};

// Action types
const ACTIONS = {
  NEW_PROJECT: 'NEW_PROJECT',
  LOAD_PROJECT: 'LOAD_PROJECT',
  UPDATE_PROJECT: 'UPDATE_PROJECT',
  ADD_ASSET: 'ADD_ASSET',
  REMOVE_ASSET: 'REMOVE_ASSET',
  ADD_LAYER: 'ADD_LAYER',
  UPDATE_LAYER: 'UPDATE_LAYER',
  REMOVE_LAYER: 'REMOVE_LAYER',
  DUPLICATE_LAYER: 'DUPLICATE_LAYER',
  REORDER_LAYERS: 'REORDER_LAYERS',
  SELECT_LAYER: 'SELECT_LAYER',
  SET_TOOL: 'SET_TOOL',
  ADD_CUT_POINT: 'ADD_CUT_POINT',
  CLEAR_CUT_POINTS: 'CLEAR_CUT_POINTS',
  SET_TIMELINE: 'SET_TIMELINE',
  ADD_KEYFRAME: 'ADD_KEYFRAME',
  UPDATE_KEYFRAME: 'UPDATE_KEYFRAME',
  REMOVE_KEYFRAME: 'REMOVE_KEYFRAME',
  SHIFT_KEYFRAMES: 'SHIFT_KEYFRAMES',
  DUPLICATE_LAYER_WITH_OFFSET: 'DUPLICATE_LAYER_WITH_OFFSET',
  COPY_KEYFRAMES: 'COPY_KEYFRAMES',
  PASTE_KEYFRAMES: 'PASTE_KEYFRAMES',
  SET_CANVAS: 'SET_CANVAS',
  SET_UI: 'SET_UI',
  UNDO: 'UNDO',
  REDO: 'REDO',
  ADD_TEXT_LAYER: 'ADD_TEXT_LAYER',
  UPDATE_TEXT_LAYER: 'UPDATE_TEXT_LAYER',
  SET_PREVIEW_RANGE: 'SET_PREVIEW_RANGE',
  CLEAR_PREVIEW_RANGE: 'CLEAR_PREVIEW_RANGE',
  SET_CUT_MODE: 'SET_CUT_MODE',
  TOGGLE_MOTION_PATH: 'TOGGLE_MOTION_PATH',
  UPDATE_LAYER_EFFECTS: 'UPDATE_LAYER_EFFECTS',
};

// Actions that should be recorded in history for undo/redo
const UNDOABLE_ACTIONS = [
  ACTIONS.ADD_LAYER,
  ACTIONS.UPDATE_LAYER,
  ACTIONS.REMOVE_LAYER,
  ACTIONS.DUPLICATE_LAYER,
  ACTIONS.REORDER_LAYERS,
  ACTIONS.ADD_KEYFRAME,
  ACTIONS.UPDATE_KEYFRAME,
  ACTIONS.REMOVE_KEYFRAME,
  ACTIONS.SHIFT_KEYFRAMES,
  ACTIONS.DUPLICATE_LAYER_WITH_OFFSET,
  ACTIONS.PASTE_KEYFRAMES,
  ACTIONS.ADD_TEXT_LAYER,
  ACTIONS.UPDATE_TEXT_LAYER,
  ACTIONS.UPDATE_LAYER_EFFECTS,
];

// Create a snapshot of undoable state
function createSnapshot(state) {
  return {
    layers: JSON.parse(JSON.stringify(state.layers)),
    assets: JSON.parse(JSON.stringify(state.assets)),
    selectedLayerId: state.selectedLayerId,
  };
}

// Restore state from snapshot
function restoreSnapshot(state, snapshot) {
  return {
    ...state,
    layers: snapshot.layers,
    assets: snapshot.assets,
    selectedLayerId: snapshot.selectedLayerId,
    ui: { ...state.ui, isDirty: true },
  };
}

function editorReducer(state, action) {
  // Handle undo/redo first
  if (action.type === ACTIONS.UNDO) {
    if (state.history.past.length === 0) return state;
    
    const previous = state.history.past[state.history.past.length - 1];
    const newPast = state.history.past.slice(0, -1);
    
    return {
      ...restoreSnapshot(state, previous),
      history: {
        past: newPast,
        future: [createSnapshot(state), ...state.history.future],
      },
    };
  }
  
  if (action.type === ACTIONS.REDO) {
    if (state.history.future.length === 0) return state;
    
    const next = state.history.future[0];
    const newFuture = state.history.future.slice(1);
    
    return {
      ...restoreSnapshot(state, next),
      history: {
        past: [...state.history.past, createSnapshot(state)],
        future: newFuture,
      },
    };
  }
  
  // For undoable actions, save current state to history
  let newState = state;
  if (UNDOABLE_ACTIONS.includes(action.type)) {
    const snapshot = createSnapshot(state);
    const newPast = [...state.history.past, snapshot].slice(-MAX_HISTORY_SIZE);
    newState = {
      ...state,
      history: {
        past: newPast,
        future: [], // Clear redo stack on new action
      },
    };
  }
  
  switch (action.type) {
    case ACTIONS.NEW_PROJECT:
      return {
        ...initialState,
        project: {
          ...initialState.project,
          id: uuidv4(),
          name: action.payload?.name || 'Untitled Project',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };
      
    case ACTIONS.LOAD_PROJECT:
      return {
        ...state,
        ...action.payload,
        ui: { ...state.ui, isDirty: false },
      };
      
    case ACTIONS.UPDATE_PROJECT:
      return {
        ...state,
        project: { ...state.project, ...action.payload, updatedAt: new Date().toISOString() },
        ui: { ...state.ui, isDirty: true },
      };
      
    case ACTIONS.ADD_ASSET:
      return {
        ...state,
        assets: [...state.assets, { ...action.payload, id: uuidv4() }],
        ui: { ...state.ui, isDirty: true },
      };
      
    case ACTIONS.REMOVE_ASSET:
      return {
        ...state,
        assets: state.assets.filter(a => a.id !== action.payload),
        ui: { ...state.ui, isDirty: true },
      };
      
    case ACTIONS.ADD_LAYER: {
      const newLayer = {
        id: uuidv4(),
        name: action.payload.name || `Layer ${state.layers.length + 1}`,
        assetId: action.payload.assetId,
        imageData: action.payload.imageData,
        visible: true,
        locked: false,
        opacity: 1,
        // Transform state
        x: action.payload.x || state.project.canvasSize.width / 2,
        y: action.payload.y || state.project.canvasSize.height / 2,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        // Pivot point (relative to layer center)
        pivotX: 0,
        pivotY: 0,
        // Original dimensions
        width: action.payload.width,
        height: action.payload.height,
        // Keyframes: { time: { x, y, rotation, scaleX, scaleY, opacity } }
        keyframes: {},
      };
      return {
        ...state,
        layers: [...state.layers, newLayer],
        selectedLayerId: newLayer.id,
        ui: { ...state.ui, isDirty: true },
      };
    }
      
    case ACTIONS.UPDATE_LAYER:
      return {
        ...state,
        layers: state.layers.map(layer =>
          layer.id === action.payload.id
            ? { ...layer, ...action.payload.updates }
            : layer
        ),
        ui: { ...state.ui, isDirty: true },
      };
      
    case ACTIONS.REMOVE_LAYER:
      return {
        ...state,
        layers: state.layers.filter(l => l.id !== action.payload),
        selectedLayerId: state.selectedLayerId === action.payload ? null : state.selectedLayerId,
        ui: { ...state.ui, isDirty: true },
      };
      
    case ACTIONS.DUPLICATE_LAYER: {
      const sourceLayer = state.layers.find(l => l.id === action.payload);
      if (!sourceLayer) return state;
      
      const newLayer = {
        ...sourceLayer,
        id: uuidv4(),
        name: `${sourceLayer.name} (copy)`,
        x: sourceLayer.x + 20,
        y: sourceLayer.y + 20,
        keyframes: JSON.parse(JSON.stringify(sourceLayer.keyframes || {})),
      };
      
      return {
        ...state,
        layers: [...state.layers, newLayer],
        selectedLayerId: newLayer.id,
        ui: { ...state.ui, isDirty: true },
      };
    }
      
    case ACTIONS.REORDER_LAYERS:
      return {
        ...state,
        layers: action.payload,
        ui: { ...state.ui, isDirty: true },
      };
      
    case ACTIONS.SELECT_LAYER:
      return {
        ...state,
        selectedLayerId: action.payload,
      };
      
    case ACTIONS.SET_TOOL:
      return {
        ...state,
        tool: { ...state.tool, active: action.payload, cutPoints: [] },
      };
      
    case ACTIONS.ADD_CUT_POINT:
      return {
        ...state,
        tool: { ...state.tool, cutPoints: [...state.tool.cutPoints, action.payload] },
      };
      
    case ACTIONS.CLEAR_CUT_POINTS:
      return {
        ...state,
        tool: { ...state.tool, cutPoints: [] },
      };
      
    case ACTIONS.SET_TIMELINE:
      return {
        ...state,
        timeline: { ...state.timeline, ...action.payload },
      };
      
    case ACTIONS.ADD_KEYFRAME: {
      const { layerId, time, properties } = action.payload;
      return {
        ...state,
        layers: state.layers.map(layer =>
          layer.id === layerId
            ? {
                ...layer,
                keyframes: {
                  ...layer.keyframes,
                  [time]: { ...layer.keyframes[time], ...properties },
                },
              }
            : layer
        ),
        ui: { ...state.ui, isDirty: true },
      };
    }
      
    case ACTIONS.UPDATE_KEYFRAME: {
      const { layerId, time, properties } = action.payload;
      return {
        ...state,
        layers: state.layers.map(layer =>
          layer.id === layerId
            ? {
                ...layer,
                keyframes: {
                  ...layer.keyframes,
                  [time]: { ...layer.keyframes[time], ...properties },
                },
              }
            : layer
        ),
        ui: { ...state.ui, isDirty: true },
      };
    }
      
    case ACTIONS.REMOVE_KEYFRAME: {
      const { layerId, time } = action.payload;
      return {
        ...state,
        layers: state.layers.map(layer => {
          if (layer.id !== layerId) return layer;
          const newKeyframes = { ...layer.keyframes };
          delete newKeyframes[time];
          return { ...layer, keyframes: newKeyframes };
        }),
        ui: { ...state.ui, isDirty: true },
      };
    }
    
    case ACTIONS.SHIFT_KEYFRAMES: {
      // Shift all keyframes of a layer by an offset (in seconds)
      const { layerId, offset } = action.payload;
      return {
        ...state,
        layers: state.layers.map(layer => {
          if (layer.id !== layerId) return layer;
          const oldKeyframes = layer.keyframes || {};
          const newKeyframes = {};
          
          Object.keys(oldKeyframes).forEach(time => {
            const newTime = Math.max(0, parseFloat(time) + offset);
            // Round to 2 decimal places to avoid floating point issues
            const roundedTime = Math.round(newTime * 100) / 100;
            newKeyframes[roundedTime] = oldKeyframes[time];
          });
          
          return { ...layer, keyframes: newKeyframes };
        }),
        ui: { ...state.ui, isDirty: true },
      };
    }
    
    case ACTIONS.DUPLICATE_LAYER_WITH_OFFSET: {
      // Duplicate a layer and offset its keyframes
      const { layerId, timeOffset } = action.payload;
      const sourceLayer = state.layers.find(l => l.id === layerId);
      if (!sourceLayer) return state;
      
      const oldKeyframes = sourceLayer.keyframes || {};
      const newKeyframes = {};
      
      Object.keys(oldKeyframes).forEach(time => {
        const newTime = Math.max(0, parseFloat(time) + timeOffset);
        const roundedTime = Math.round(newTime * 100) / 100;
        newKeyframes[roundedTime] = { ...oldKeyframes[time] };
      });
      
      const newLayer = {
        ...sourceLayer,
        id: uuidv4(),
        name: `${sourceLayer.name} (trail)`,
        keyframes: newKeyframes,
      };
      
      return {
        ...state,
        layers: [...state.layers, newLayer],
        selectedLayerId: newLayer.id,
        ui: { ...state.ui, isDirty: true },
      };
    }
    
    case ACTIONS.COPY_KEYFRAMES: {
      // Copy keyframes from a layer to clipboard
      const { layerId, keyframeTimes } = action.payload;
      const layer = state.layers.find(l => l.id === layerId);
      if (!layer) return state;
      
      const copiedKeyframes = {};
      keyframeTimes.forEach(time => {
        if (layer.keyframes && layer.keyframes[time]) {
          copiedKeyframes[time] = { ...layer.keyframes[time] };
        }
      });
      
      return {
        ...state,
        clipboard: {
          keyframes: copiedKeyframes,
          sourceLayerId: layerId,
        },
      };
    }
    
    case ACTIONS.PASTE_KEYFRAMES: {
      // Paste keyframes at a new time offset
      const { layerId, timeOffset } = action.payload;
      if (!state.clipboard.keyframes) return state;
      
      const copiedKeyframes = state.clipboard.keyframes;
      const times = Object.keys(copiedKeyframes).map(Number).sort((a, b) => a - b);
      if (times.length === 0) return state;
      
      const firstTime = times[0];
      const newKeyframes = {};
      
      times.forEach(time => {
        const relativeTime = time - firstTime;
        const newTime = Math.max(0, timeOffset + relativeTime);
        const roundedTime = Math.round(newTime * 100) / 100;
        newKeyframes[roundedTime] = { ...copiedKeyframes[time] };
      });
      
      return {
        ...state,
        layers: state.layers.map(layer => {
          if (layer.id !== layerId) return layer;
          return {
            ...layer,
            keyframes: {
              ...layer.keyframes,
              ...newKeyframes,
            },
          };
        }),
        ui: { ...state.ui, isDirty: true },
      };
    }
      
    case ACTIONS.SET_CANVAS:
      return {
        ...newState,
        canvas: { ...newState.canvas, ...action.payload },
      };
      
    case ACTIONS.SET_UI:
      return {
        ...newState,
        ui: { ...newState.ui, ...action.payload },
      };
    
    // Text layer support
    case ACTIONS.ADD_TEXT_LAYER: {
      const textLayer = {
        id: uuidv4(),
        type: 'text',
        name: action.payload.name || 'Text Layer',
        text: action.payload.text || 'Text',
        fontFamily: action.payload.fontFamily || 'Arial',
        fontSize: action.payload.fontSize || 48,
        fontWeight: action.payload.fontWeight || 'bold',
        color: action.payload.color || '#FFFFFF',
        visible: true,
        locked: false,
        opacity: 1,
        x: action.payload.x || newState.project.canvasSize.width / 2,
        y: action.payload.y || newState.project.canvasSize.height / 2,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        pivotX: 0,
        pivotY: 0,
        width: action.payload.width || 200,
        height: action.payload.height || 60,
        keyframes: {},
        effects: {},
      };
      return {
        ...newState,
        layers: [...newState.layers, textLayer],
        selectedLayerId: textLayer.id,
        ui: { ...newState.ui, isDirty: true },
      };
    }
    
    case ACTIONS.UPDATE_TEXT_LAYER: {
      const { id, updates } = action.payload;
      return {
        ...newState,
        layers: newState.layers.map(layer =>
          layer.id === id ? { ...layer, ...updates } : layer
        ),
        ui: { ...newState.ui, isDirty: true },
      };
    }
    
    // Preview range for quick preview
    case ACTIONS.SET_PREVIEW_RANGE:
      return {
        ...newState,
        timeline: { ...newState.timeline, previewRange: action.payload },
      };
    
    case ACTIONS.CLEAR_PREVIEW_RANGE:
      return {
        ...newState,
        timeline: { ...newState.timeline, previewRange: null },
      };
    
    // Cut mode
    case ACTIONS.SET_CUT_MODE:
      return {
        ...newState,
        tool: { ...newState.tool, cutMode: action.payload },
      };
    
    // Motion path toggle
    case ACTIONS.TOGGLE_MOTION_PATH:
      return {
        ...newState,
        canvas: { ...newState.canvas, showMotionPath: !newState.canvas.showMotionPath },
      };
    
    // Layer effects (drop shadow, glow, outline)
    case ACTIONS.UPDATE_LAYER_EFFECTS: {
      const { layerId, effects } = action.payload;
      return {
        ...newState,
        layers: newState.layers.map(layer =>
          layer.id === layerId
            ? { ...layer, effects: { ...layer.effects, ...effects } }
            : layer
        ),
        ui: { ...newState.ui, isDirty: true },
      };
    }
      
    default:
      return newState;
  }
}

export function EditorProvider({ children }) {
  const [state, dispatch] = useReducer(editorReducer, initialState);
  
  // Action creators
  const actions = {
    newProject: useCallback((name) => {
      dispatch({ type: ACTIONS.NEW_PROJECT, payload: { name } });
    }, []),
    
    loadProject: useCallback((projectData) => {
      dispatch({ type: ACTIONS.LOAD_PROJECT, payload: projectData });
    }, []),
    
    updateProject: useCallback((updates) => {
      dispatch({ type: ACTIONS.UPDATE_PROJECT, payload: updates });
    }, []),
    
    addAsset: useCallback((asset) => {
      dispatch({ type: ACTIONS.ADD_ASSET, payload: asset });
      return asset;
    }, []),
    
    removeAsset: useCallback((assetId) => {
      dispatch({ type: ACTIONS.REMOVE_ASSET, payload: assetId });
    }, []),
    
    addLayer: useCallback((layerData) => {
      dispatch({ type: ACTIONS.ADD_LAYER, payload: layerData });
    }, []),
    
    updateLayer: useCallback((id, updates) => {
      dispatch({ type: ACTIONS.UPDATE_LAYER, payload: { id, updates } });
    }, []),
    
    removeLayer: useCallback((layerId) => {
      dispatch({ type: ACTIONS.REMOVE_LAYER, payload: layerId });
    }, []),
    
    duplicateLayer: useCallback((layerId) => {
      dispatch({ type: ACTIONS.DUPLICATE_LAYER, payload: layerId });
    }, []),
    
    reorderLayers: useCallback((layers) => {
      dispatch({ type: ACTIONS.REORDER_LAYERS, payload: layers });
    }, []),
    
    selectLayer: useCallback((layerId) => {
      dispatch({ type: ACTIONS.SELECT_LAYER, payload: layerId });
    }, []),
    
    setTool: useCallback((tool) => {
      dispatch({ type: ACTIONS.SET_TOOL, payload: tool });
    }, []),
    
    addCutPoint: useCallback((point) => {
      dispatch({ type: ACTIONS.ADD_CUT_POINT, payload: point });
    }, []),
    
    clearCutPoints: useCallback(() => {
      dispatch({ type: ACTIONS.CLEAR_CUT_POINTS });
    }, []),
    
    setTimeline: useCallback((updates) => {
      dispatch({ type: ACTIONS.SET_TIMELINE, payload: updates });
    }, []),
    
    addKeyframe: useCallback((layerId, time, properties) => {
      dispatch({ type: ACTIONS.ADD_KEYFRAME, payload: { layerId, time, properties } });
    }, []),
    
    updateKeyframe: useCallback((layerId, time, properties) => {
      dispatch({ type: ACTIONS.UPDATE_KEYFRAME, payload: { layerId, time, properties } });
    }, []),
    
    removeKeyframe: useCallback((layerId, time) => {
      dispatch({ type: ACTIONS.REMOVE_KEYFRAME, payload: { layerId, time } });
    }, []),
    
    shiftKeyframes: useCallback((layerId, offset) => {
      dispatch({ type: ACTIONS.SHIFT_KEYFRAMES, payload: { layerId, offset } });
    }, []),
    
    duplicateLayerWithOffset: useCallback((layerId, timeOffset) => {
      dispatch({ type: ACTIONS.DUPLICATE_LAYER_WITH_OFFSET, payload: { layerId, timeOffset } });
    }, []),
    
    copyKeyframes: useCallback((layerId, keyframeTimes) => {
      dispatch({ type: ACTIONS.COPY_KEYFRAMES, payload: { layerId, keyframeTimes } });
    }, []),
    
    pasteKeyframes: useCallback((layerId, timeOffset) => {
      dispatch({ type: ACTIONS.PASTE_KEYFRAMES, payload: { layerId, timeOffset } });
    }, []),
    
    setCanvas: useCallback((updates) => {
      dispatch({ type: ACTIONS.SET_CANVAS, payload: updates });
    }, []),
    
    setUI: useCallback((updates) => {
      dispatch({ type: ACTIONS.SET_UI, payload: updates });
    }, []),
    
    // Undo/Redo
    undo: useCallback(() => {
      dispatch({ type: ACTIONS.UNDO });
    }, []),
    
    redo: useCallback(() => {
      dispatch({ type: ACTIONS.REDO });
    }, []),
    
    // Text layers
    addTextLayer: useCallback((textData) => {
      dispatch({ type: ACTIONS.ADD_TEXT_LAYER, payload: textData });
    }, []),
    
    updateTextLayer: useCallback((id, updates) => {
      dispatch({ type: ACTIONS.UPDATE_TEXT_LAYER, payload: { id, updates } });
    }, []),
    
    // Preview range
    setPreviewRange: useCallback((range) => {
      dispatch({ type: ACTIONS.SET_PREVIEW_RANGE, payload: range });
    }, []),
    
    clearPreviewRange: useCallback(() => {
      dispatch({ type: ACTIONS.CLEAR_PREVIEW_RANGE });
    }, []),
    
    // Cut mode
    setCutMode: useCallback((mode) => {
      dispatch({ type: ACTIONS.SET_CUT_MODE, payload: mode });
    }, []),
    
    // Motion path
    toggleMotionPath: useCallback(() => {
      dispatch({ type: ACTIONS.TOGGLE_MOTION_PATH });
    }, []),
    
    // Layer effects
    updateLayerEffects: useCallback((layerId, effects) => {
      dispatch({ type: ACTIONS.UPDATE_LAYER_EFFECTS, payload: { layerId, effects } });
    }, []),
  };
  
  return (
    <EditorContext.Provider value={{ state, actions }}>
      {children}
    </EditorContext.Provider>
  );
}

export function useEditor() {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error('useEditor must be used within EditorProvider');
  }
  return context;
}

export { ACTIONS };
