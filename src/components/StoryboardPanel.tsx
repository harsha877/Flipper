import React, { useState } from 'react';
import {
  Wand2,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Film,
  Copy,
} from 'lucide-react';
import { AnimationProject, SceneSpec } from '../types/animation';

interface StoryboardPanelProps {
  project: AnimationProject;
  selectedSceneId: string;
  isGeneratingProject: boolean;
  regeneratingSceneId: string | null;
  errorMessage: string | null;
  onGenerateProject: (
    prompt: string,
    sceneCount: number,
    visualStyle: string
  ) => void;
  onSelectScene: (sceneId: string, jumpToStart?: boolean) => void;
  onAddScene: () => void;
  onDuplicateScene: (sceneId: string) => void;
  onDeleteScene: (sceneId: string) => void;
  onMoveScene: (sceneId: string, direction: 'up' | 'down') => void;
  onRegenerateScene: (scene: SceneSpec, directionPrompt: string) => void;
}

const VISUAL_STYLES = [
  'Cel-Shaded Sci-Fi Adventure',
  'Neon Cyber-Noir Anime',
  'Painterly Steampunk Fable',
  'Saturday Morning Cartoon',
  'Minimalist Vector Cinema',
];

export const StoryboardPanel: React.FC<StoryboardPanelProps> = ({
  project,
  selectedSceneId,
  isGeneratingProject,
  regeneratingSceneId,
  errorMessage,
  onGenerateProject,
  onSelectScene,
  onAddScene,
  onDuplicateScene,
  onDeleteScene,
  onMoveScene,
  onRegenerateScene,
}) => {
  const [promptInput, setPromptInput] = useState(project.prompt);
  const [sceneCount, setSceneCount] = useState(3);
  const [visualStyle, setVisualStyle] = useState(
    project.visualStyle || VISUAL_STYLES[0]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptInput.trim() || isGeneratingProject) return;
    onGenerateProject(promptInput, sceneCount, visualStyle);
  };

  let cumulativeStartFrame = 0;

  return (
    <aside className="w-80 lg:w-96 bg-slate-900 border-r border-slate-800 flex flex-col h-full shrink-0 overflow-hidden">
      {/* AI Script-to-Storyboard Director Form */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/40">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-sm font-semibold text-slate-100 tracking-tight">
            AI Script &amp; Storyboard Director
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label
              htmlFor="story-prompt-input"
              className="block text-xs text-slate-400 mb-1"
            >
              Story Prompt or Dialogue Concept
            </label>
            <textarea
              id="story-prompt-input"
              rows={3}
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              placeholder="Describe your animated story, characters, setting, and conflict..."
              className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 transition-colors resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label
                htmlFor="visual-style-select"
                className="block text-xs text-slate-400 mb-1"
              >
                Animation Style
              </label>
              <select
                id="visual-style-select"
                value={visualStyle}
                onChange={(e) => setVisualStyle(e.target.value)}
                className="w-full rounded-lg bg-slate-950 border border-slate-800 px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              >
                {VISUAL_STYLES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="scene-count-select"
                className="block text-xs text-slate-400 mb-1"
              >
                Scene Count
              </label>
              <select
                id="scene-count-select"
                value={sceneCount}
                onChange={(e) => setSceneCount(Number(e.target.value))}
                className="w-full rounded-lg bg-slate-950 border border-slate-800 px-2.5 py-1.5 text-xs text-slate-200 font-mono tabular-nums focus:outline-none focus:border-amber-500"
              >
                <option value={2}>2 Scenes (~8s)</option>
                <option value={3}>3 Scenes (~12s)</option>
                <option value={4}>4 Scenes (~16s)</option>
                <option value={5}>5 Scenes (~20s)</option>
              </select>
            </div>
          </div>

          {errorMessage && (
            <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-800/80 text-xs text-rose-200">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={isGeneratingProject || !promptInput.trim()}
            className="w-full py-2 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
          >
            {isGeneratingProject ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Directing Storyboard...</span>
              </>
            ) : (
              <>
                <Wand2 className="w-3.5 h-3.5" />
                <span>Generate Storyboard</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Storyboard Scene Sequence Header */}
      <div className="px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Film className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-medium text-slate-200">Storyboard Sequence</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums">
            {project.scenes.length} Scenes
          </span>
        </div>

        <button
          type="button"
          onClick={onAddScene}
          className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Scene</span>
        </button>
      </div>

      {/* Scrollable Scene List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {project.scenes.map((scene, index) => {
          const startFrame = cumulativeStartFrame + 1;
          const endFrame = cumulativeStartFrame + scene.durationFrames;
          cumulativeStartFrame += scene.durationFrames;
          const isSelected = scene.id === selectedSceneId;
          const isRegenerating = regeneratingSceneId === scene.id;

          return (
            <div
              key={scene.id}
              onClick={() => onSelectScene(scene.id, true)}
              className={`rounded-lg p-3 border transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-slate-800/90 border-amber-500/70'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Clean unboxed metadata header */}
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-1.5 text-[11px] font-mono tabular-nums text-slate-400">
                  <span className="text-amber-400 font-semibold">
                    0{index + 1}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    F{startFrame}–F{endFrame}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{(scene.durationFrames / 24).toFixed(1)}s</span>
                </div>

                <div
                  className="flex items-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() =>
                      onRegenerateScene(
                        scene,
                        `Update this scene to match the narrative summary: "${scene.narrativeSummary}" (Title: "${scene.title}")`
                      )
                    }
                    disabled={isRegenerating}
                    title="Re-stage Scene from Narrative Summary"
                    className="p-1 rounded text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <RefreshCw
                      className={`w-3 h-3 ${isRegenerating ? 'animate-spin text-amber-400' : ''}`}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDuplicateScene(scene.id)}
                    title="Duplicate Scene"
                    className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => onMoveScene(scene.id, 'up')}
                    title="Move Scene Up"
                    className="p-1 rounded text-slate-400 hover:text-slate-200 disabled:opacity-30 hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <ArrowUp className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    disabled={index === project.scenes.length - 1}
                    onClick={() => onMoveScene(scene.id, 'down')}
                    title="Move Scene Down"
                    className="p-1 rounded text-slate-400 hover:text-slate-200 disabled:opacity-30 hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <ArrowDown className="w-3 h-3" />
                  </button>
                  {project.scenes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onDeleteScene(scene.id)}
                      title="Delete Scene"
                      className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              <h3 className="text-xs font-semibold text-slate-100 mb-1">
                {scene.title}
              </h3>

              <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-2">
                {scene.narrativeSummary}
              </p>

              {/* Quiet unboxed metadata footer */}
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <span className="capitalize">
                  {scene.environmentTheme.replace('_', ' ')}
                </span>
                <span aria-hidden="true">·</span>
                <span className="capitalize">{scene.timeOfDay}</span>
                <span aria-hidden="true">·</span>
                <span className="capitalize">
                  Cam: {scene.cameraMotion.replace('_', ' ')}
                </span>
                <span aria-hidden="true">·</span>
                <span>{scene.dialogues.length} lines</span>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
};
