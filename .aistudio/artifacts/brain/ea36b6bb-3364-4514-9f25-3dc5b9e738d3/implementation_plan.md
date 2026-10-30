# CelFrame 24 — AI Storyboard & 24 FPS Animation Studio

CelFrame 24 transforms natural language story prompts into playable, frame-accurate 24 FPS character and scene animations. It combines an AI script-to-scene storyboard generator with a deterministic 24 FPS HTML5 Canvas animation engine, interactive frame-by-frame timeline scrubbing, dialogue bubbles/subtitles, and real-time browser video export.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The architectural choices below reflect your confirmed preferences from our initial design review. Please review the proposed studio workflow and visual direction before we build the application.

- **Confirmed Generation Architecture**: **Hybrid AI Storyboard + Procedural 24 FPS Canvas Animator**. An Express backend calls `gemini-3.8-flash` with structured JSON schemas to break user text prompts into multi-scene storyboards, character rigs, camera choreography, dialogue timings, and keyframe curves that render deterministically at exactly 24 frames per second (`41.67ms` per frame).
- **Confirmed Content Focus**: **Story & Character Animations with Scenes and Dialogue**. Each generated project includes expressive 2D articulated characters (with idle breathing, walking, gesture states, eye blinks, and lip-sync mouth shapes), layered parallax environments, dynamic camera pans/zooms, and synchronized dialogue captions.
- **Confirmed Studio Toolset**: **24 FPS Interactive Timeline with Frame Scrubbing & Playback** paired with an **AI Script-to-Scene Storyboard Generator**, plus one-click `.webm` 24 FPS video rendering so users can download their finished animations.

---

### 1. Overview & Core Concept

- **What It Does**: Users enter a story concept, script, or scene description in plain text (or pick from starter templates). CelFrame 24 uses Gemini AI to generate a structured multi-scene storyboard complete with characters, emotions, dialogue lines, environment backdrops, props, and 24 FPS keyframe choreography. Users can inspect and edit every scene in the Storyboard view, scrub frame-by-frame on a dedicated 24 FPS timeline, tweak character actions or camera movement, and export a 24 FPS video file.
- **Target Audience / Persona**: Independent animators, storytellers, content creators, and educators who want to turn written stories and dialogue scripts into smooth 24 FPS animated sequences without manually keyframing every limb and camera move from scratch.
- **Key Value**: Bridges the gap between unpredictable black-box video generators and tedious manual keyframe software—giving creators instant AI storyboarding with frame-exact 24 FPS deterministic control.

---

### 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Prompt-to-Storyboard Flow**: The user enters a story prompt (e.g., *"Two astronaut foxes on a bioluminescent mushroom planet debate whether to open a mysterious glowing crate"*) and selects desired duration/scene count. Clicking **Generate Storyboard** invokes the AI director, populating the Storyboard Strip with structured scenes, dialogue, character staging, and frame ranges (`Frame 1–120 @ 24 FPS`).
  2. **Storyboard Inspection & Scene Editing**: Users click any scene card in the storyboard sequence to inspect or refine its setting, weather/lighting atmosphere, camera motion (`Static`, `Pan Right`, `Slow Zoom In`, `Handheld Shake`), character expressions (`Happy`, `Surprised`, `Determined`, `Skeptical`), action animations (`Talk`, `Walk`, `Wave`, `Jump`, `Inspect`), and spoken dialogue. Users can also add, duplicate, reorder, or regenerate individual scenes.
  3. **24 FPS Stage & Frame-Accurate Timeline Scrubbing**: In the central 16:9 Animation Stage, the procedural 2D renderer composites sky/lighting gradients, parallax environment layers, articulated character rigs (with frame-accurate lip-sync during dialogue frames), atmospheric particles, and cinema-style dialogue subtitles. Below the stage, the 24 FPS Timeline displays exact frame ticks (`F001`, `F024`, `F048`...), timecode (`00:00:00:00` SMPTE format), scene track blocks, character keyframe tracks, and dialogue bars. Users can play/pause, step `-1 Frame` / `+1 Frame`, toggle onion skinning (ghosting previous/next frames at 24 FPS intervals), loop scenes, or drag the playhead across any frame.
  4. **24 FPS Video Export**: Clicking **Export 24 FPS Video** captures the HTML5 Canvas stream at a locked 24 FPS frame rate using `MediaRecorder` (`canvas.captureStream(24)`) and downloads a crisp `.webm` animated video file.

- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Precision dark-room animation studio inspired by professional cel-animation and NLE suites (Toon Boom Harmony, Teenage Engineering, Linear). High-contrast workspace surfaces keep visual focus on the colorful 16:9 animation stage.
  - *Color Palette & Mood* (60-30-10 Discipline):
    - **60% Dominant Neutral Canvas**: Deep studio obsidian (`#0B0F17` / `slate-950`) to frame the animation stage without eye strain.
    - **30% Structural Surfaces**: Charcoal panel surfaces (`#111827` / `slate-900`) separated by crisp `1px solid` hairline borders (`#1E293B` / `slate-800`) and muted slate typography (`#94A3B8`).
    - **10% Accent Budget**: Cinema amber (`#F59E0B` / `amber-500`) for the active 24 FPS playhead, primary generation CTA, and active frame indicators, paired with semantic emerald (`#10B981`) for render completion and rose (`#F43F5E`) for recording/export state.
  - *Typography & Hierarchy* (2+1 Font Rule):
    - **Display / Studio Headings**: `Outfit` (600/700 weight) for clean geometric hierarchy across headers and scene titles.
    - **Body & Script Prose**: `Plus Jakarta Sans` (400/500 weight) for readable storyboard descriptions, dialogue scripts, and inspector controls.
    - **Timecode & Frame Telemetry**: `JetBrains Mono` with `tabular-nums` strictly enforced for SMPTE timecodes (`00:04:12`), frame counters (`Frame 108 / 360 · 24.0 FPS`), and keyframe coordinates to prevent layout jitter during playback.
  - *Component Styling & Layout*:
    - Full-viewport 1440px desktop studio layout with a strict 3-zone Top Bar (`CelFrame 24` brand wordmark — view navigation links — `Export 24 FPS Video` primary CTA).
    - Single-elevation flat panels with `1px` borders; zero nested card-in-card clutter and zero static pill enclosures on metadata (scene durations and frame ranges rendered as clean unboxed text with `·` separators, e.g., `Scene 02 · 120 Frames · 5.0s`).

- **Interactive Feedback & Motion**:
  - Instant `<100ms` playhead scrubbing that updates the 24 FPS canvas synchronously on pointer drag.
  - Optional **Onion Skinning** toggle that renders translucent cyan (previous 2 frames) and amber (next 2 frames) character silhouettes directly on the stage so users can see the 24 FPS motion spacing in real time.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Deterministic 24 FPS Procedural Canvas Engine + AI Choreography vs. Black-Box Video Clips**
  - *Chosen Approach*: Use Gemini (`gemini-3.8-flash` with strict JSON schema) on the server to author rich multi-scene storyboards, dialogue scripts, character appearance/rig parameters, and frame-indexed keyframes, which are then rendered by a custom 24 FPS procedural 2D animation engine on an HTML5 `<canvas>`.
  - *Why*: Pure text-to-video diffusion models take minutes per clip, cannot guarantee exact frame-by-frame editing or consistent character rigs across scenes, and don't allow instant timeline scrubbing. Our hybrid architecture generates an entire multi-scene animated story in seconds, locks playback to an exact 24 FPS (`dt = 1/24s`), supports real-time onion skinning and dialogue lip-sync, and lets users edit any scene or character keyframe immediately.
  - *Alternatives Considered*: Pure Omni Flash video generation (passed over as primary engine because users selected the Hybrid AI Storyboard + Procedural 24 FPS Canvas Animator for story/character control).

- **Decision 2: Frame-Indexed State Architecture (`currentFrame` as Single Source of Truth)**
  - *Chosen Approach*: Represent all project timing in discrete 24 FPS frames (`1 second = 24 frames`). Every scene has a `startFrame` and `durationFrames`, and the renderer is a pure function `renderFrame(ctx, project, frameIndex, options)`.
  - *Why*: Guarantees zero drift between timeline scrubbing, live 24 FPS playback, onion-skin ghost rendering (`renderFrame(frameIndex - 2)` and `renderFrame(frameIndex + 2)`), and frame-by-frame WebM video export.

---

### 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        Top Studio Bar (3-Zone Contract)                      │
│  [CelFrame 24]         [Studio · Storyboard · Presets]   [Export 24 FPS]     │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │
       ┌───────────────────────────────┼───────────────────────────────┐
       ▼                               ▼                               ▼
┌──────────────────────┐  ┌─────────────────────────┐  ┌───────────────────────┐
│  AI Story & Script   │  │   24 FPS Stage Canvas   │  │   Scene & Character   │
│    Director Panel    │  │    (16:9 Viewport)      │  │    Inspector Panel    │
│                      │  │                         │  │                       │
│ • Story Prompt Input │  │ • Parallax Backdrop     │  │ • Scene Backdrop/Time │
│ • Genre/Style Select │  │ • 2D Character Rigs     │  │ • Camera Motion Curve │
│ • AI Scene Breakdown │  │ • 24 FPS Lip-Sync/Walk  │  │ • Character Rig/Pose  │
│ • Storyboard Cards   │  │ • Onion Skin Overlay    │  │ • Dialogue & Emotion  │
└──────────┬───────────┘  └────────────┬────────────┘  └───────────┬───────────┘
           │                           │                           │
           └───────────────┐           │           ┌───────────────┘
                           ▼           ▼           ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                   24 FPS Master Timeline & Transport Dock                    │
│  [|<] [-1F] [Play/Pause] [+1F] [>|]   SMPTE 00:00:04:12 · Frame 108/360      │
│  ├── Scene Track:     [ Scene 1 (F1-96) ] [ Scene 2 (F97-216) ] [ Scene 3 ]  │
│  ├── Character Track: ◆ Pose/Move Keyframes & Action Blocks                  │
│  └── Dialogue Track:  💬 Synchronized Lip-Sync & Subtitle Bars               │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                 Express Server Proxy (/api/storyboard/*)                     │
│  • POST /api/storyboard/generate  ──► Gemini 3.8 Flash (JSON Schema)         │
│  • POST /api/storyboard/scene     ──► Regenerate/Expand Single Scene         │
└──────────────────────────────────────────────────────────────────────────────┘
```

- **Data Model & State**:
  - `AnimationProject`: `{ id, title, prompt, fps: 24, width: 1280, height: 720, visualStyle, characters: CharacterSpec[], scenes: SceneSpec[] }`
  - `CharacterSpec`: `{ id, name, role, primaryColor, secondaryColor, accessory, bodyType, voicePitch }`
  - `SceneSpec`: `{ id, title, narrativeSummary, durationFrames (multiple of 24), environmentTheme ('forest' | 'cyber_city' | 'space_station' | 'sunset_desert' | 'cozy_studio' | 'ocean_cliff'), timeOfDay ('dawn' | 'day' | 'dusk' | 'night'), weatherEffect ('clear' | 'rain' | 'snow' | 'fireflies' | 'starfield'), cameraMotion ('static' | 'pan_left' | 'pan_right' | 'zoom_in' | 'zoom_out' | 'dramatic_push'), characterPlacements: CharacterActionSpec[], dialogues: DialogueLineSpec[] }`
  - `CharacterActionSpec`: `{ characterId, startX, startY, endX, endY, scale, action ('idle' | 'walk' | 'run' | 'talk' | 'wave' | 'jump' | 'celebrate' | 'think'), expression ('neutral' | 'happy' | 'surprised' | 'determined' | 'sad' | 'excited'), facing ('left' | 'right') }`
  - `DialogueLineSpec`: `{ id, characterId, speakerName, text, startFrameOffset, durationFrames }`

- **Interactive Component & State Mapping**:
  - **AI Prompt Director**: Validates user story prompt, triggers `/api/storyboard/generate`, shows a stage-by-stage progress indicator while Gemini constructs the 24 FPS scenes, and loads the resulting project onto the stage at `Frame 0`. Also includes 3 rich pre-built sample projects so the studio is immediately interactive on first load.
  - **24 FPS Playback Loop**: Uses `requestAnimationFrame` with an accumulator locked to `1000 / 24 = 41.6667ms` per frame step, advancing `currentFrame` by `1` every tick and wrapping cleanly or stopping at `totalFrames`.
  - **Timeline Scrubber & Frame Stepper**: Clicking or dragging on the frame ruler maps pointer X coordinates to `Math.round(ratio * totalFrames)`, pausing active playback and rendering the exact target frame. `-1F` and `+1F` buttons step `currentFrame` by $\pm 1$ frame (also bound to `ArrowLeft` and `ArrowRight` keys).
  - **Scene & Character Inspector**: Live inputs for scene duration (in seconds or frames), environment preset, lighting, weather particles, camera movement, character start/end positions, actions, expressions, and dialogue text immediately mutate `AnimationProject` state and re-render the current frame on the canvas.
  - **Real-Time 24 FPS Video Exporter**: Steps through `Frame 0` to `totalFrames` at 24 FPS while recording via `MediaRecorder`, displaying a live frame encoding progress bar and triggering an automatic browser download of the `.webm` video file upon completion.
