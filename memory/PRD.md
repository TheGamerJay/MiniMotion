# Mini Editor - Product Requirements Document

## Original Problem Statement
Build Mini Editor - a web-based 2D sticker animation editor for short looping reaction/sticker assets. Users can:
1. Upload an image
2. Cut the image into separate movable parts
3. Place pivot points
4. Animate those parts with keyframes on a timeline
5. Preview the motion as a loop
6. Export the final result as GIF and WebM

## User Personas
1. **Content Creators**: Users who want to make simple animated stickers/emotes for Discord, Slack, etc.
2. **Social Media Users**: Creating reaction GIFs and animated content
3. **Hobbyists**: Beginners learning 2D animation basics

## Core Requirements (Static)
- Web-based editor (desktop-first)
- Timeline-based keyframe animation
- Layer-based editing system
- Cut tool for separating image parts
- Pivot point system for rotation
- GIF and WebM export
- Local project save/load (IndexedDB)
- Dark theme with cyan/violet accents

## Tech Stack
- **Frontend**: React + react-konva + Tailwind CSS
- **Backend**: FastAPI (Python)
- **Storage**: IndexedDB (local browser)
- **Export**: Backend-assisted (imageio, PIL)

## Architecture
```
/app
├── backend/
│   └── server.py          # FastAPI server with export endpoint
├── frontend/
│   └── src/
│       ├── components/
│       │   └── editor/
│       │       ├── TopBar.js       # Project controls, export
│       │       ├── LeftPanel.js    # Tools, assets, layers
│       │       ├── Canvas.js       # Konva stage, layer rendering
│       │       ├── RightPanel.js   # Properties panel
│       │       └── Timeline.js     # Timeline with keyframes
│       ├── store/
│       │   └── editorStore.js      # React Context state
│       └── utils/
│           ├── db.js               # IndexedDB operations
│           ├── cutTool.js          # Polygon cutting utilities
│           ├── animation.js        # Easing & interpolation engine
│           └── export.js           # Frame rendering & export
```

## What's Been Implemented (March 31, 2026)

### Phase 1 - Foundation ✅
- App shell with full editor layout
- Stage layout with Konva
- Upload flow (drag-and-drop capable)
- Project state management (React Context)
- Layer panel with controls
- Timeline shell

### Phase 2 - Cut + Layers ✅
- Cut tool with polygon selection
- Extracted layers as independent elements
- Selection system
- Layer ordering/hide/lock/rename

### Phase 3 - Animation Core ✅
- Move/rotate/scale/opacity transforms
- Pivot system (draggable and numerical)
- Timeline keyframes with interpolation
- Preview playback (looped)
- Keyboard shortcuts (V/C/P, Space)

### Phase 4 - Save + Export ✅
- Project save/load via IndexedDB
- GIF export (backend-assisted)
- WebM export (backend-assisted)
- Export progress indicator

### Phase 5 - Animation System Upgrade ✅ (March 31, 2026)
- **Easing System**: Per-keyframe easing (linear, ease-in, ease-out, ease-in-out)
- **Interpolation Engine**: Smooth eased interpolation between keyframes
- **Draggable Keyframes**: Independent timing control per layer
- **Fixed Timestep Playback**: Consistent FPS playback engine
- **Duplicate Layer**: Clone layer with all properties and keyframes
- **Easing UI**: Dropdown selector in timeline controls

### Phase 6 - Animation Composition Controls ✅ (March 31, 2026)
- **Timeline Visualization**: Activity spans and connection lines between keyframes
- **Shift Keyframes**: Move all keyframes forward/backward in time
- **Duplicate + Offset**: Create trailing effects with time-offset duplicates
- **Copy/Paste Keyframes**: Reuse motion patterns across layers
- **Multi-Select Keyframes**: Shift+Click to select multiple keyframes
- **Onion Skin Preview**: Toggle to see previous/next frame positions

## Prioritized Backlog

### P0 (Critical for MVP - DONE)
- [x] Upload image
- [x] Cut tool
- [x] Layer management
- [x] Transform controls
- [x] Timeline keyframes
- [x] Playback
- [x] Export GIF/WebM
- [x] Save/Load projects
- [x] Easing system
- [x] Draggable keyframes
- [x] Shift keyframes (delay control)
- [x] Duplicate + offset (trailing effects)
- [x] Copy/paste keyframes
- [x] Onion skin preview

### P1 (Important)
- [ ] Undo/Redo functionality
- [ ] Better cut tool with bezier curves
- [ ] Onion skin preview
- [ ] Multiple project tabs
- [ ] Advanced easing presets (bounce, elastic, back)

### P2 (Nice to Have)
- [ ] Autosave indicator
- [ ] Templates/presets
- [ ] Mobile view-only mode
- [ ] Drag-and-drop layer reordering

### P3 (Future)
- [ ] Cloud storage (MongoDB)
- [ ] User authentication
- [ ] Frame-by-frame animation mode
- [ ] Audio sync
- [ ] Multiple canvas sizes presets

## Animation System Details

### Easing Functions Available
- `linear` - Constant speed (default for older keyframes)
- `ease-in` - Starts slow, accelerates
- `ease-out` - Starts fast, decelerates (default for new keyframes)
- `ease-in-out` - Smooth start and end

### How Easing Works
- Easing is stored on each keyframe
- When interpolating, the NEXT keyframe's easing determines how we arrive at it
- This matches standard animation software conventions

### Keyframe Data Structure
```javascript
keyframes: {
  0: { x: 100, y: 200, rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, easing: 'linear' },
  1: { x: 300, y: 200, rotation: 45, scaleX: 1.5, scaleY: 1.5, opacity: 0.8, easing: 'ease-out' }
}
```

## Next Action Items
1. Add undo/redo functionality for transform and keyframe operations
2. Add bezier curve support to cut tool for smoother selections
3. Add advanced easing presets (bounce, elastic, back)
4. Add visual curve editor for custom easing

## Composition Controls Details

### Shift Keyframes
- Move all keyframes of a layer forward or backward in time
- Configurable offset amount (default 0.1s)
- Enables delayed reactions and timing adjustments

### Duplicate + Offset
- Creates a copy of a layer with all keyframes shifted by a time offset
- Perfect for creating trailing effects and motion overlap
- Offset configurable (default 0.1s)

### Copy/Paste Keyframes
- Copy all keyframes from a layer
- Paste at current playhead position on any layer
- Maintains relative timing between keyframes

### Onion Skin Preview
- Toggle to visualize previous and next frame positions
- Shows 2 frames before and after current time
- Helps visualize motion flow and timing

## Known Limitations
- Desktop-first (mobile not optimized)
- No undo/redo yet
- Cut tool uses basic polygon selection
