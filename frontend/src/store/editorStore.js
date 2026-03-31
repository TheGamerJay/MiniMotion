import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

const EditorContext = createContext(null);

const DEFAULT_CANVAS_SIZE = { width: 512, height: 512 };
const DEFAULT_FPS = 24;
const DEFAULT_DURATION = 2; // seconds

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
  
  // Layers (cut parts)
  layers: [],
  
  // Selected layer ID
  selectedLayerId: null,
  
  // Timeline state
  timeline: {
    currentTime: 0,
    isPlaying: false,
    loop: true,
  },
  
  // Tool state
  tool: {
    active: 'select', // 'select', 'cut', 'pivot'
    cutPoints: [], // Points for cut polygon
  },
  
  // Canvas state
  canvas: {
    zoom: 1,
    panX: 0,
    panY: 0,
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
  SET_CANVAS: 'SET_CANVAS',
  SET_UI: 'SET_UI',
  UNDO: 'UNDO',
  REDO: 'REDO',
};

function editorReducer(state, action) {
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
      
    case ACTIONS.SET_CANVAS:
      return {
        ...state,
        canvas: { ...state.canvas, ...action.payload },
      };
      
    case ACTIONS.SET_UI:
      return {
        ...state,
        ui: { ...state.ui, ...action.payload },
      };
      
    default:
      return state;
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
    
    setCanvas: useCallback((updates) => {
      dispatch({ type: ACTIONS.SET_CANVAS, payload: updates });
    }, []),
    
    setUI: useCallback((updates) => {
      dispatch({ type: ACTIONS.SET_UI, payload: updates });
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
