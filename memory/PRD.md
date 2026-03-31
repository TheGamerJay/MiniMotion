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

### P1 (Important)
- [ ] Undo/Redo functionality
- [ ] Duplicate layer
- [ ] Better cut tool with bezier curves
- [ ] Onion skin preview
- [ ] Multiple project tabs

### P2 (Nice to Have)
- [ ] Simple easing presets (ease-in, ease-out, bounce)
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

## Next Action Items
1. Add undo/redo functionality for transform changes
2. Implement duplicate layer feature
3. Add bezier curve support to cut tool
4. Add easing presets to keyframe interpolation
5. Consider cloud storage integration for cross-device access

## Known Limitations
- Desktop-first (mobile not optimized)
- No undo/redo in MVP
- Cut tool uses basic polygon selection
- Linear interpolation only (no easing)
