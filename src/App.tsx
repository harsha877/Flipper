import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Film,
  Sparkles,
  Plus,
  Trash2,
  Play,
  BookOpen,
  Users,
} from 'lucide-react';
import {
  AnimationProject,
  CharacterAccessory,
  CharacterBodyType,
  CharacterSpec,
  RenderOptions,
  SceneSpec,
  formatSMPTE24,
  getProjectTotalFrames,
  resolveSceneAtFrame,
} from './types/animation';
import { STARTER_PROJECTS } from './data/presets';
import { renderProjectFrame } from './engine/canvasRenderer';
import { StoryboardPanel } from './components/StoryboardPanel';
import { SceneInspector } from './components/SceneInspector';
import { Timeline24FPS } from './components/Timeline24FPS';
import { VideoExportModal } from './components/VideoExportModal';

type WorkspaceView = 'studio' | 'storyboard' | 'characters' | 'presets';

export default function App() {
  const [project, setProject] = useState<AnimationProject>(STARTER_PROJECTS[0]);
  const [selectedSceneId, setSelectedSceneId] = useState<string>(
    STARTER_PROJECTS[0].scenes[0].id
  );
  const [currentFrame, setCurrentFrame] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isLooping, setIsLooping] = useState<boolean>(true);
  const [activeView, setActiveView] = useState<WorkspaceView>('studio');
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);

  const [isGeneratingProject, setIsGeneratingProject] = useState<boolean>(false);
  const [regeneratingSceneId, setRegeneratingSceneId] = useState<string | null>(
    null
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [renderOptions, setRenderOptions] = useState<RenderOptions>({
    showOnionSkin: false,
    showTimecodeBurnIn: true,
    showSafeGuides: false,
    showSubtitles: true,
  });

  const stageCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const totalFrames = Math.max(24, getProjectTotalFrames(project));

  // Ensure currentFrame stays within bounds when scenes change
  useEffect(() => {
    if (currentFrame >= totalFrames) {
      setCurrentFrame(Math.max(0, totalFrames - 1));
    }
  }, [totalFrames, currentFrame]);

  // Ensure selectedSceneId stays valid
  const selectedScene =
    project.scenes.find((s) => s.id === selectedSceneId) || project.scenes[0];

  // Deterministic 24 FPS (41.6667ms per frame) Playback Loop
  useEffect(() => {
    if (!isPlaying) return;

    let animationFrameId: number;
    let lastTime = performance.now();
    const frameInterval = 1000 / 24; // Exact 24 FPS = 41.6667ms

    const tick = (now: number) => {
      const elapsed = now - lastTime;
      if (elapsed >= frameInterval) {
        lastTime = now - (elapsed % frameInterval);
        setCurrentFrame((prev) => {
          const next = prev + 1;
          if (next >= totalFrames) {
            if (isLooping) {
              return 0;
            } else {
              setIsPlaying(false);
              return Math.max(0, totalFrames - 1);
            }
          }
          return next;
        });
      }
      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, isLooping, totalFrames]);

  // Sync selectedSceneId when playhead crosses into another scene during playback
  useEffect(() => {
    if (project.scenes.length > 0) {
      const { scene } = resolveSceneAtFrame(project, currentFrame);
      if (scene && scene.id !== selectedSceneId) {
        setSelectedSceneId(scene.id);
      }
    }
  }, [currentFrame, project, selectedSceneId]);

  // Render currentFrame onto the 16:9 Stage Canvas
  useEffect(() => {
    const canvas = stageCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    renderProjectFrame(ctx, project, currentFrame, renderOptions);
  }, [project, currentFrame, renderOptions, activeView]);

  // Keyboard shortcuts: Space to Play/Pause, Left/Right arrows for -1F / +1F
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        setIsPlaying(false);
        setCurrentFrame((f) => Math.max(0, f - 1));
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        setIsPlaying(false);
        setCurrentFrame((f) => Math.min(totalFrames - 1, f + 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [totalFrames]);

  const handleSelectFrame = useCallback((frame: number) => {
    setIsPlaying(false);
    setCurrentFrame(frame);
  }, []);

  const handleStepFrame = useCallback(
    (delta: number) => {
      setIsPlaying(false);
      setCurrentFrame((prev) =>
        Math.max(0, Math.min(totalFrames - 1, prev + delta))
      );
    },
    [totalFrames]
  );

  const handleSelectScene = useCallback(
    (sceneId: string, jumpToStart = false) => {
      setSelectedSceneId(sceneId);
      if (jumpToStart) {
        let start = 0;
        for (const s of project.scenes) {
          if (s.id === sceneId) break;
          start += s.durationFrames;
        }
        setCurrentFrame(start);
      }
    },
    [project.scenes]
  );

  const handleUpdateScene = (updatedScene: SceneSpec) => {
    setProject((prev) => ({
      ...prev,
      scenes: prev.scenes.map((s) =>
        s.id === updatedScene.id ? updatedScene : s
      ),
    }));
  };

  const handleAddScene = () => {
    const newSceneId = `scene_${Date.now()}`;
    const firstChar = project.characters[0];
    const secondChar = project.characters[1] || firstChar;

    const newScene: SceneSpec = {
      id: newSceneId,
      title: `Scene ${project.scenes.length + 1}: New Sequence`,
      narrativeSummary:
        'Characters gather on stage for the next beat of the story.',
      durationFrames: 96, // 4.0s @ 24 FPS
      environmentTheme: 'forest',
      timeOfDay: 'dusk',
      weatherEffect: 'fireflies',
      cameraMotion: 'pan_right',
      foregroundProp: 'none',
      characterPlacements: [
        ...(firstChar
          ? [
              {
                characterId: firstChar.id,
                startX: 24,
                startY: 73,
                endX: 42,
                endY: 73,
                scale: 1.0,
                action: 'walk' as const,
                expression: 'happy' as const,
                facing: 'right' as const,
              },
            ]
          : []),
        ...(secondChar && secondChar.id !== firstChar?.id
          ? [
              {
                characterId: secondChar.id,
                startX: 68,
                startY: 74,
                endX: 58,
                endY: 74,
                scale: 1.0,
                action: 'wave' as const,
                expression: 'excited' as const,
                facing: 'left' as const,
              },
            ]
          : []),
      ],
      dialogues: firstChar
        ? [
            {
              id: `dlg_${Date.now()}`,
              characterId: firstChar.id,
              speakerName: firstChar.name,
              text: 'Ready for action on frame one!',
              startFrameOffset: 8,
              durationFrames: 48,
            },
          ]
        : [],
    };

    setProject((prev) => ({
      ...prev,
      scenes: [...prev.scenes, newScene],
    }));
    setSelectedSceneId(newSceneId);
  };

  const handleDuplicateScene = (sceneId: string) => {
    const idx = project.scenes.findIndex((s) => s.id === sceneId);
    if (idx === -1) return;
    const orig = project.scenes[idx];
    const copy: SceneSpec = {
      ...orig,
      id: `scene_${Date.now()}`,
      title: `${orig.title} (Copy)`,
      dialogues: orig.dialogues.map((d, i) => ({
        ...d,
        id: `dlg_${Date.now()}_${i}`,
      })),
    };
    const nextScenes = [...project.scenes];
    nextScenes.splice(idx + 1, 0, copy);
    setProject((prev) => ({ ...prev, scenes: nextScenes }));
    setSelectedSceneId(copy.id);
  };

  const handleDeleteScene = (sceneId: string) => {
    if (project.scenes.length <= 1) return;
    const nextScenes = project.scenes.filter((s) => s.id !== sceneId);
    setProject((prev) => ({ ...prev, scenes: nextScenes }));
    if (selectedSceneId === sceneId) {
      setSelectedSceneId(nextScenes[0].id);
    }
  };

  const handleMoveScene = (sceneId: string, direction: 'up' | 'down') => {
    const idx = project.scenes.findIndex((s) => s.id === sceneId);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= project.scenes.length) return;
    const nextScenes = [...project.scenes];
    const [removed] = nextScenes.splice(idx, 1);
    nextScenes.splice(targetIdx, 0, removed);
    setProject((prev) => ({ ...prev, scenes: nextScenes }));
  };

  const handleGenerateProject = async (
    prompt: string,
    sceneCount: number,
    visualStyle: string
  ) => {
    setIsGeneratingProject(true);
    setErrorMessage(null);
    try {
      const response = await fetch('/api/storyboard/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, sceneCount, visualStyle }),
      });
      const data = await response.json();
      if (!response.ok || !data.project) {
        throw new Error(
          data.error || 'Failed to generate 24 FPS storyboard from prompt.'
        );
      }
      setProject(data.project);
      if (data.project.scenes?.[0]?.id) {
        setSelectedSceneId(data.project.scenes[0].id);
      }
      setCurrentFrame(0);
      setIsPlaying(true);
    } catch (err: any) {
      setErrorMessage(
        err?.message || 'Error connecting to Gemini AI storyboard service.'
      );
    } finally {
      setIsGeneratingProject(false);
    }
  };

  const handleRegenerateScene = async (
    scene: SceneSpec,
    directionPrompt: string
  ) => {
    setRegeneratingSceneId(scene.id);
    setErrorMessage(null);
    try {
      const response = await fetch('/api/storyboard/regenerate-scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectTitle: project.title,
          characters: project.characters,
          currentScene: scene,
          scenePrompt: directionPrompt,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.scene) {
        throw new Error(data.error || 'Failed to regenerate scene.');
      }
      handleUpdateScene({ ...data.scene, id: scene.id });
    } catch (err: any) {
      setErrorMessage(err?.message || 'Could not regenerate scene.');
    } finally {
      setRegeneratingSceneId(null);
    }
  };

  const handleUpdateCharacter = (index: number, patch: Partial<CharacterSpec>) => {
    setProject((prev) => ({
      ...prev,
      characters: prev.characters.map((c, idx) =>
        idx === index ? { ...c, ...patch } : c
      ),
    }));
  };

  const handleAddCharacter = () => {
    const newChar: CharacterSpec = {
      id: `char_${Date.now()}`,
      name: `Actor ${project.characters.length + 1}`,
      role: 'Supporting Character',
      primaryColor: '#EC4899',
      secondaryColor: '#38BDF8',
      skinOrFurColor: '#FDE68A',
      bodyType: 'humanoid',
      accessory: 'headphones',
    };
    setProject((prev) => ({
      ...prev,
      characters: [...prev.characters, newChar],
    }));
  };

  const handleDeleteCharacter = (charId: string) => {
    if (project.characters.length <= 1) return;
    setProject((prev) => ({
      ...prev,
      characters: prev.characters.filter((c) => c.id !== charId),
    }));
  };

  const { sceneIndex, localFrame } = resolveSceneAtFrame(project, currentFrame);

  return (
    <div className="min-h-screen h-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="flex items-center justify-between gap-8 px-6 py-3.5 border-b border-slate-800 bg-slate-950 shrink-0">
        {/* Zone 1: Single text element brand wordmark */}
        <a
          href="#studio"
          onClick={(e) => {
            e.preventDefault();
            setActiveView('studio');
          }}
          className="text-lg font-bold tracking-tight text-slate-100 font-display whitespace-nowrap shrink-0"
        >
          CelFrame 24
        </a>

        {/* Zone 2: 4 concise single-line text navigation links */}
        <nav className="flex items-center gap-6 text-sm font-medium text-slate-400">
          <a
            href="#studio"
            onClick={(e) => {
              e.preventDefault();
              setActiveView('studio');
            }}
            className={`transition-colors whitespace-nowrap shrink-0 ${
              activeView === 'studio'
                ? 'text-amber-400 underline underline-offset-8'
                : 'hover:text-slate-100'
            }`}
          >
            Studio Stage
          </a>
          <a
            href="#storyboard"
            onClick={(e) => {
              e.preventDefault();
              setActiveView('storyboard');
            }}
            className={`transition-colors whitespace-nowrap shrink-0 ${
              activeView === 'storyboard'
                ? 'text-amber-400 underline underline-offset-8'
                : 'hover:text-slate-100'
            }`}
          >
            Storyboard Sheet
          </a>
          <a
            href="#characters"
            onClick={(e) => {
              e.preventDefault();
              setActiveView('characters');
            }}
            className={`transition-colors whitespace-nowrap shrink-0 ${
              activeView === 'characters'
                ? 'text-amber-400 underline underline-offset-8'
                : 'hover:text-slate-100'
            }`}
          >
            Character Cast
          </a>
          <a
            href="#presets"
            onClick={(e) => {
              e.preventDefault();
              setActiveView('presets');
            }}
            className={`transition-colors whitespace-nowrap shrink-0 ${
              activeView === 'presets'
                ? 'text-amber-400 underline underline-offset-8'
                : 'hover:text-slate-100'
            }`}
          >
            Starter Stories
          </a>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              setIsPlaying(false);
              setIsExportModalOpen(true);
            }}
            className="px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-500 rounded-lg hover:bg-amber-400 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Export 24 FPS Video
          </button>
        </div>
      </header>

      {/* Main Studio Body */}
      {activeView === 'studio' && (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 flex min-h-0 overflow-hidden">
            {/* Left Sidebar: AI Storyboard Director & Scene Strip */}
            <StoryboardPanel
              project={project}
              selectedSceneId={selectedScene.id}
              isGeneratingProject={isGeneratingProject}
              regeneratingSceneId={regeneratingSceneId}
              errorMessage={errorMessage}
              onGenerateProject={handleGenerateProject}
              onSelectScene={handleSelectScene}
              onAddScene={handleAddScene}
              onDuplicateScene={handleDuplicateScene}
              onDeleteScene={handleDeleteScene}
              onMoveScene={handleMoveScene}
              onRegenerateScene={handleRegenerateScene}
            />

            {/* Center Viewport: 24 FPS 16:9 Stage Canvas */}
            <main className="flex-1 flex flex-col bg-slate-950 min-w-0 overflow-hidden">
              {/* Sub-header context bar */}
              <div className="px-6 py-2.5 border-b border-slate-800/80 flex items-center justify-between gap-4 bg-slate-900/40 shrink-0">
                <div className="flex items-center gap-2 text-xs text-slate-300 truncate">
                  <span className="font-semibold text-slate-100 truncate">
                    {project.title}
                  </span>
                  <span aria-hidden="true" className="text-slate-600">
                    ·
                  </span>
                  <span className="text-slate-400 truncate">
                    {project.visualStyle}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono tabular-nums text-slate-400 shrink-0">
                  <span>
                    Scene 0{sceneIndex + 1}: {selectedScene.title}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="text-amber-400">
                    Local F{localFrame + 1}/{selectedScene.durationFrames}
                  </span>
                </div>
              </div>

              {/* 16:9 Canvas Stage Container */}
              <div className="flex-1 flex items-center justify-center p-6 overflow-hidden">
                <div className="relative w-full max-w-4xl aspect-video rounded-xl overflow-hidden border border-slate-800 bg-slate-900 shadow-2xl">
                  <canvas
                    ref={stageCanvasRef}
                    width={project.width || 1280}
                    height={project.height || 720}
                    onClick={() => setIsPlaying((p) => !p)}
                    title="Click stage to Play / Pause 24 FPS animation"
                    className="w-full h-full object-contain cursor-pointer block"
                  />
                </div>
              </div>
            </main>

            {/* Right Sidebar: Scene, Character & Dialogue Inspector */}
            <SceneInspector
              project={project}
              selectedScene={selectedScene}
              onUpdateScene={handleUpdateScene}
            />
          </div>

          {/* Bottom Dock: 24 FPS Interactive Timeline */}
          <Timeline24FPS
            project={project}
            currentFrame={currentFrame}
            isPlaying={isPlaying}
            isLooping={isLooping}
            renderOptions={renderOptions}
            selectedSceneId={selectedScene.id}
            onSelectFrame={handleSelectFrame}
            onTogglePlay={() => setIsPlaying((p) => !p)}
            onStepFrame={handleStepFrame}
            onToggleLoop={() => setIsLooping((l) => !l)}
            onUpdateRenderOptions={(patch) =>
              setRenderOptions((prev) => ({ ...prev, ...patch }))
            }
            onSelectScene={handleSelectScene}
          />
        </div>
      )}

      {/* View 2: Full Storyboard Sheet View */}
      {activeView === 'storyboard' && (
        <main className="flex-1 overflow-y-auto p-8 max-w-7xl w-full mx-auto space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <p className="text-xs font-mono tabular-nums text-amber-400 mb-1">
                24 FPS PRODUCTION EXPOSURE SHEET · {totalFrames} FRAMES TOTAL (
                {(totalFrames / 24).toFixed(1)}s)
              </p>
              <h1 className="text-2xl font-bold text-slate-100 font-display">
                {project.title} — Storyboard Breakdown
              </h1>
              <p className="text-sm text-slate-400 mt-1 max-w-2xl">
                {project.logline || project.prompt}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleAddScene}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-100 flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Scene Card</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveView('studio')}
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-xs font-semibold text-slate-950 flex items-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Open in 24 FPS Stage</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {project.scenes.map((sc, idx) => {
              const startFrame = project.scenes
                .slice(0, idx)
                .reduce((acc, s) => acc + s.durationFrames, 0);
              return (
                <div
                  key={sc.id}
                  className="rounded-xl bg-slate-900 border border-slate-800 p-5 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-mono tabular-nums text-slate-400">
                      <span className="text-amber-400 font-semibold">
                        SCENE 0{idx + 1}
                      </span>
                      <span>
                        {formatSMPTE24(startFrame)} →{' '}
                        {formatSMPTE24(startFrame + sc.durationFrames)} (
                        {sc.durationFrames}F)
                      </span>
                    </div>

                    <h2 className="text-base font-semibold text-slate-100">
                      {sc.title}
                    </h2>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      {sc.narrativeSummary}
                    </p>

                    <div className="text-xs text-slate-400 flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-800/80">
                      <span className="capitalize">
                        Set: {sc.environmentTheme.replace('_', ' ')}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="capitalize">Time: {sc.timeOfDay}</span>
                      <span aria-hidden="true">·</span>
                      <span className="capitalize">
                        Cam: {sc.cameraMotion.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Dialogue Script Excerpt */}
                    {sc.dialogues.length > 0 && (
                      <div className="space-y-1.5 pt-2">
                        <p className="text-[11px] font-medium text-slate-400">
                          Synchronized Dialogue ({sc.dialogues.length})
                        </p>
                        {sc.dialogues.map((d) => (
                          <div
                            key={d.id}
                            className="text-xs text-slate-200 bg-slate-950/70 rounded p-2 border border-slate-800/80"
                          >
                            <span className="font-semibold text-amber-400">
                              {d.speakerName}:{' '}
                            </span>
                            <span>&ldquo;{d.text}&rdquo;</span>
                            <span className="block text-[10px] font-mono tabular-nums text-slate-500 mt-0.5">
                              +F{d.startFrameOffset} · {d.durationFrames} Frames
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                      {sc.characterPlacements.length} Rigged Actors
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        handleSelectScene(sc.id, true);
                        setActiveView('studio');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-amber-400 cursor-pointer"
                    >
                      Jump to Scene Frame →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      )}

      {/* View 3: Character Cast & Rig Customizer */}
      {activeView === 'characters' && (
        <main className="flex-1 overflow-y-auto p-8 max-w-6xl w-full mx-auto space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <div className="flex items-center gap-2 text-xs text-amber-400 mb-1">
                <Users className="w-4 h-4" />
                <span>24 FPS ARTICULATED PUPPET RIGS</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-100 font-display">
                Character Cast &amp; Rig Wardrobe
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Customize character silhouettes, color palettes, body rigs, and
                accessories. Changes immediately update across all 24 FPS scenes.
              </p>
            </div>

            <button
              type="button"
              onClick={handleAddCharacter}
              className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Character Rig</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {project.characters.map((char, idx) => (
              <div
                key={char.id}
                className="rounded-xl bg-slate-900 border border-slate-800 p-5 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      style={{ backgroundColor: char.primaryColor }}
                      className="w-8 h-8 rounded-lg border border-white/20 shrink-0"
                    />
                    <div>
                      <h3 className="text-sm font-semibold text-slate-100">
                        {char.name}
                      </h3>
                      <p className="text-xs text-slate-400">{char.role}</p>
                    </div>
                  </div>
                  {project.characters.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleDeleteCharacter(char.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Character Name
                    </label>
                    <input
                      type="text"
                      value={char.name}
                      onChange={(e) =>
                        handleUpdateCharacter(idx, { name: e.target.value })
                      }
                      className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-1.5 text-xs text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Narrative Role
                    </label>
                    <input
                      type="text"
                      value={char.role}
                      onChange={(e) =>
                        handleUpdateCharacter(idx, { role: e.target.value })
                      }
                      className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-1.5 text-xs text-slate-100"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">
                        Body Rig Archetype
                      </label>
                      <select
                        value={char.bodyType}
                        onChange={(e) =>
                          handleUpdateCharacter(idx, {
                            bodyType: e.target.value as CharacterBodyType,
                          })
                        }
                        className="w-full rounded-lg bg-slate-950 border border-slate-800 px-2.5 py-1.5 text-xs text-slate-200"
                      >
                        <option value="humanoid">Humanoid</option>
                        <option value="animal_fox">Articulated Fox</option>
                        <option value="animal_cat">Articulated Cat</option>
                        <option value="robot">Cyber Android</option>
                        <option value="astronaut">Astronaut</option>
                        <option value="spirit">Forest Spirit</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-slate-400 mb-1">
                        Prop / Wardrobe
                      </label>
                      <select
                        value={char.accessory}
                        onChange={(e) =>
                          handleUpdateCharacter(idx, {
                            accessory: e.target.value as CharacterAccessory,
                          })
                        }
                        className="w-full rounded-lg bg-slate-950 border border-slate-800 px-2.5 py-1.5 text-xs text-slate-200"
                      >
                        <option value="none">None</option>
                        <option value="helmet">Space Helmet</option>
                        <option value="scarf">Wind Scarf</option>
                        <option value="glasses">Round Glasses</option>
                        <option value="crown">Royal Crown</option>
                        <option value="backpack">Explorer Pack</option>
                        <option value="cape">Hero Cape</option>
                        <option value="antenna">Signal Antenna</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Primary Color
                      </label>
                      <input
                        type="color"
                        value={char.primaryColor}
                        onChange={(e) =>
                          handleUpdateCharacter(idx, {
                            primaryColor: e.target.value,
                          })
                        }
                        className="w-full h-8 rounded bg-slate-950 border border-slate-800 cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Accent Color
                      </label>
                      <input
                        type="color"
                        value={char.secondaryColor}
                        onChange={(e) =>
                          handleUpdateCharacter(idx, {
                            secondaryColor: e.target.value,
                          })
                        }
                        className="w-full h-8 rounded bg-slate-950 border border-slate-800 cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Head / Fur
                      </label>
                      <input
                        type="color"
                        value={char.skinOrFurColor}
                        onChange={(e) =>
                          handleUpdateCharacter(idx, {
                            skinOrFurColor: e.target.value,
                          })
                        }
                        className="w-full h-8 rounded bg-slate-950 border border-slate-800 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      )}

      {/* View 4: Starter Story Templates */}
      {activeView === 'presets' && (
        <main className="flex-1 overflow-y-auto p-8 max-w-6xl w-full mx-auto space-y-6">
          <div className="border-b border-slate-800 pb-5">
            <div className="flex items-center gap-2 text-xs text-amber-400 mb-1">
              <BookOpen className="w-4 h-4" />
              <span>READY-TO-PLAY 24 FPS PRODUCTIONS</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-100 font-display">
              Starter Animated Story Projects
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Load a curated multi-scene 24 FPS story production to inspect its
              rigging, camera choreography, or remix it with Gemini AI.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STARTER_PROJECTS.map((preset) => {
              const presetFrames = getProjectTotalFrames(preset);
              const isCurrent = preset.id === project.id;
              return (
                <div
                  key={preset.id}
                  className={`rounded-xl p-6 border flex flex-col justify-between space-y-5 transition-colors ${
                    isCurrent
                      ? 'bg-slate-900 border-amber-500/80'
                      : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-mono tabular-nums text-slate-400">
                      <span className="text-amber-400">
                        {preset.scenes.length} Scenes
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{presetFrames} Frames</span>
                      <span aria-hidden="true">·</span>
                      <span>{(presetFrames / 24).toFixed(1)}s @ 24 FPS</span>
                    </div>

                    <h2 className="text-lg font-bold text-slate-100 font-display">
                      {preset.title}
                    </h2>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      {preset.logline}
                    </p>

                    <div className="pt-2 flex items-center gap-2 text-xs text-slate-400">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>{preset.visualStyle}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setProject(preset);
                      setSelectedSceneId(preset.scenes[0].id);
                      setCurrentFrame(0);
                      setIsPlaying(true);
                      setActiveView('studio');
                    }}
                    className="w-full py-2.5 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Film className="w-4 h-4" />
                    <span>Load into 24 FPS Studio</span>
                  </button>
                </div>
              );
            })}
          </div>
        </main>
      )}

      {/* 24 FPS Video Export Modal */}
      {isExportModalOpen && (
        <VideoExportModal
          project={project}
          renderOptions={renderOptions}
          onClose={() => setIsExportModalOpen(false)}
        />
      )}
    </div>
  );
}
