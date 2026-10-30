import React, { useState } from 'react';
import {
  Sliders,
  Users,
  MessageSquare,
  Plus,
  Trash2,
  Wand2,
  RefreshCw,
} from 'lucide-react';
import {
  AnimationProject,
  CameraMotion,
  CharacterAction,
  CharacterActionSpec,
  CharacterExpression,
  DialogueLineSpec,
  EnvironmentTheme,
  ForegroundProp,
  SceneSpec,
  TimeOfDay,
  WeatherEffect,
} from '../types/animation';

interface SceneInspectorProps {
  project: AnimationProject;
  selectedScene: SceneSpec;
  isRegenerating: boolean;
  onUpdateScene: (updated: SceneSpec) => void;
  onRegenerateScene: (scene: SceneSpec, directionPrompt: string) => void;
}

const ENVIRONMENTS: { value: EnvironmentTheme; label: string }[] = [
  { value: 'forest', label: 'Bioluminescent Forest' },
  { value: 'cyber_city', label: 'Neon Cyber City' },
  { value: 'space_station', label: 'Orbital Space Station' },
  { value: 'sunset_desert', label: 'Canyon Desert' },
  { value: 'cozy_studio', label: 'Warm Timber Studio' },
  { value: 'ocean_cliff', label: 'Coastal Ocean Cliff' },
];

const TIMES_OF_DAY: { value: TimeOfDay; label: string }[] = [
  { value: 'dawn', label: 'Dawn' },
  { value: 'day', label: 'Daylight' },
  { value: 'dusk', label: 'Golden Dusk' },
  { value: 'night', label: 'Starlit Night' },
];

const WEATHER_OPTIONS: { value: WeatherEffect; label: string }[] = [
  { value: 'clear', label: 'Clear Sky' },
  { value: 'fireflies', label: 'Glowing Spores / Fireflies' },
  { value: 'rain', label: 'Cinematic Rain' },
  { value: 'snow', label: 'Drifting Snow' },
  { value: 'starfield', label: 'Deep Starfield' },
];

const CAMERA_MOTIONS: { value: CameraMotion; label: string }[] = [
  { value: 'static', label: 'Locked Tripod (Static)' },
  { value: 'pan_right', label: 'Tracking Pan Right' },
  { value: 'pan_left', label: 'Tracking Pan Left' },
  { value: 'zoom_in', label: 'Slow Push Zoom In' },
  { value: 'zoom_out', label: 'Wide Pull Zoom Out' },
  { value: 'dramatic_push', label: 'Dramatic Fast Push' },
];

const PROPS: { value: ForegroundProp; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'monolith', label: 'Floating Alien Monolith' },
  { value: 'ramen_cart', label: 'Midnight Ramen Stall' },
  { value: 'telescope', label: 'Brass Horizon Telescope' },
  { value: 'campfire', label: 'Crackling Campfire' },
  { value: 'lantern', label: 'Signal Beacon Crate' },
];

const ACTIONS: CharacterAction[] = [
  'idle',
  'walk',
  'run',
  'talk',
  'wave',
  'jump',
  'celebrate',
  'think',
  'inspect',
];

const EXPRESSIONS: CharacterExpression[] = [
  'neutral',
  'happy',
  'surprised',
  'determined',
  'skeptical',
  'excited',
];

export const SceneInspector: React.FC<SceneInspectorProps> = ({
  project,
  selectedScene,
  isRegenerating,
  onUpdateScene,
  onRegenerateScene,
}) => {
  const [activeTab, setActiveTab] = useState<'stage' | 'actors' | 'dialogue'>(
    'stage'
  );

  const handleFieldChange = <K extends keyof SceneSpec>(
    key: K,
    value: SceneSpec[K]
  ) => {
    onUpdateScene({
      ...selectedScene,
      [key]: value,
    });
  };

  const handlePlacementChange = (
    index: number,
    patch: Partial<CharacterActionSpec>
  ) => {
    const next = selectedScene.characterPlacements.map((item, idx) =>
      idx === index ? { ...item, ...patch } : item
    );
    handleFieldChange('characterPlacements', next);
  };

  const handleAddActorToScene = () => {
    const defaultChar = project.characters[0];
    if (!defaultChar) return;
    const newPlacement: CharacterActionSpec = {
      characterId: defaultChar.id,
      startX: 25,
      startY: 73,
      endX: 50,
      endY: 73,
      scale: 1,
      action: 'walk',
      expression: 'happy',
      facing: 'right',
    };
    handleFieldChange('characterPlacements', [
      ...selectedScene.characterPlacements,
      newPlacement,
    ]);
  };

  const handleRemoveActorFromScene = (index: number) => {
    handleFieldChange(
      'characterPlacements',
      selectedScene.characterPlacements.filter((_, idx) => idx !== index)
    );
  };

  const handleDialogueChange = (
    index: number,
    patch: Partial<DialogueLineSpec>
  ) => {
    const next = selectedScene.dialogues.map((d, idx) =>
      idx === index ? { ...d, ...patch } : d
    );
    handleFieldChange('dialogues', next);
  };

  const handleAddDialogue = () => {
    const speaker = project.characters[0];
    const newLine: DialogueLineSpec = {
      id: `dlg_${Date.now()}`,
      characterId: speaker?.id || 'char_1',
      speakerName: speaker?.name || 'Character',
      text: 'New synchronized dialogue line!',
      startFrameOffset: 6,
      durationFrames: 42,
    };
    handleFieldChange('dialogues', [...selectedScene.dialogues, newLine]);
  };

  const handleDeleteDialogue = (index: number) => {
    handleFieldChange(
      'dialogues',
      selectedScene.dialogues.filter((_, idx) => idx !== index)
    );
  };

  return (
    <aside className="w-80 lg:w-96 bg-slate-900 border-l border-slate-800 flex flex-col h-full shrink-0 overflow-hidden">
      {/* Inspector Header & Segmented Tabs */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/40">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-100 tracking-tight truncate">
            Scene Inspector
          </h2>
          <span className="text-xs font-mono tabular-nums text-slate-400 shrink-0">
            {selectedScene.durationFrames} Frames (
            {(selectedScene.durationFrames / 24).toFixed(1)}s)
          </span>
        </div>

        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('stage')}
            className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'stage'
                ? 'bg-slate-800 text-amber-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Stage</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('actors')}
            className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'actors'
                ? 'bg-slate-800 text-amber-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Actors ({selectedScene.characterPlacements.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('dialogue')}
            className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'dialogue'
                ? 'bg-slate-800 text-amber-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Lines ({selectedScene.dialogues.length})</span>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'stage' && (
          <div className="space-y-3.5">
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Scene Title
              </label>
              <input
                type="text"
                value={selectedScene.title}
                onChange={(e) => handleFieldChange('title', e.target.value)}
                className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs text-slate-400">
                  Narrative Action Summary
                </label>
                <span className="text-[11px] text-slate-500">
                  Editable AI prompt
                </span>
              </div>
              <textarea
                rows={3}
                value={selectedScene.narrativeSummary}
                placeholder="Describe what happens in this scene (actions, mood, camera, dialogue)..."
                onChange={(e) =>
                  handleFieldChange('narrativeSummary', e.target.value)
                }
                className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 resize-none leading-relaxed"
              />
              <button
                type="button"
                disabled={
                  isRegenerating || !selectedScene.narrativeSummary.trim()
                }
                onClick={() =>
                  onRegenerateScene(
                    selectedScene,
                    `Update this scene's character actions, expressions, positions, camera, environment, and dialogue to match this narrative action summary: "${selectedScene.narrativeSummary}" (Scene Title: "${selectedScene.title}")`
                  )
                }
                className="w-full py-1.5 px-3 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 disabled:opacity-40 text-amber-300 font-medium text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                {isRegenerating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Applying Narrative to Stage...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>Apply Narrative to Stage</span>
                  </>
                )}
              </button>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-400">Scene Duration</span>
                <span className="font-mono tabular-nums text-amber-400">
                  {selectedScene.durationFrames} Frames ·{' '}
                  {(selectedScene.durationFrames / 24).toFixed(1)}s
                </span>
              </div>
              <input
                type="range"
                min={48}
                max={240}
                step={24}
                value={selectedScene.durationFrames}
                onChange={(e) =>
                  handleFieldChange('durationFrames', Number(e.target.value))
                }
                className="w-full accent-amber-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono tabular-nums text-slate-500 mt-0.5">
                <span>48F (2s)</span>
                <span>96F (4s)</span>
                <span>144F (6s)</span>
                <span>240F (10s)</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Environment Backdrop
                </label>
                <select
                  value={selectedScene.environmentTheme}
                  onChange={(e) =>
                    handleFieldChange(
                      'environmentTheme',
                      e.target.value as EnvironmentTheme
                    )
                  }
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  {ENVIRONMENTS.map((env) => (
                    <option key={env.value} value={env.value}>
                      {env.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Lighting / Time
                </label>
                <select
                  value={selectedScene.timeOfDay}
                  onChange={(e) =>
                    handleFieldChange('timeOfDay', e.target.value as TimeOfDay)
                  }
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  {TIMES_OF_DAY.map((tod) => (
                    <option key={tod.value} value={tod.value}>
                      {tod.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Weather Particles
                </label>
                <select
                  value={selectedScene.weatherEffect}
                  onChange={(e) =>
                    handleFieldChange(
                      'weatherEffect',
                      e.target.value as WeatherEffect
                    )
                  }
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  {WEATHER_OPTIONS.map((w) => (
                    <option key={w.value} value={w.value}>
                      {w.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Foreground Prop
                </label>
                <select
                  value={selectedScene.foregroundProp}
                  onChange={(e) =>
                    handleFieldChange(
                      'foregroundProp',
                      e.target.value as ForegroundProp
                    )
                  }
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  {PROPS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Camera Choreography Curve
              </label>
              <select
                value={selectedScene.cameraMotion}
                onChange={(e) =>
                  handleFieldChange(
                    'cameraMotion',
                    e.target.value as CameraMotion
                  )
                }
                className="w-full rounded-lg bg-slate-950 border border-slate-800 px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              >
                {CAMERA_MOTIONS.map((cm) => (
                  <option key={cm.value} value={cm.value}>
                    {cm.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {activeTab === 'actors' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Character Keyframes (Start → End Frame)
              </span>
              <button
                type="button"
                onClick={handleAddActorToScene}
                className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Actor</span>
              </button>
            </div>

            {selectedScene.characterPlacements.map((placement, idx) => (
              <div
                key={`${placement.characterId}_${idx}`}
                className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <select
                    value={placement.characterId}
                    onChange={(e) =>
                      handlePlacementChange(idx, {
                        characterId: e.target.value,
                      })
                    }
                    className="rounded bg-slate-900 border border-slate-700 px-2 py-1 text-xs font-medium text-slate-100"
                  >
                    {project.characters.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.role})
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => handleRemoveActorFromScene(idx)}
                    className="p-1 text-slate-400 hover:text-rose-400 cursor-pointer"
                    title="Remove Actor from Scene"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-0.5">
                      Action
                    </label>
                    <select
                      value={placement.action}
                      onChange={(e) =>
                        handlePlacementChange(idx, {
                          action: e.target.value as CharacterAction,
                        })
                      }
                      className="w-full rounded bg-slate-900 border border-slate-800 px-2 py-1 text-xs text-slate-200 capitalize"
                    >
                      {ACTIONS.map((act) => (
                        <option key={act} value={act}>
                          {act}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-0.5">
                      Expression
                    </label>
                    <select
                      value={placement.expression}
                      onChange={(e) =>
                        handlePlacementChange(idx, {
                          expression: e.target.value as CharacterExpression,
                        })
                      }
                      className="w-full rounded bg-slate-900 border border-slate-800 px-2 py-1 text-xs text-slate-200 capitalize"
                    >
                      {EXPRESSIONS.map((exp) => (
                        <option key={exp} value={exp}>
                          {exp}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-0.5">
                      Facing
                    </label>
                    <select
                      value={placement.facing}
                      onChange={(e) =>
                        handlePlacementChange(idx, {
                          facing: e.target.value as 'left' | 'right',
                        })
                      }
                      className="w-full rounded bg-slate-900 border border-slate-800 px-2 py-1 text-xs text-slate-200"
                    >
                      <option value="right">Right →</option>
                      <option value="left">← Left</option>
                    </select>
                  </div>
                </div>

                {/* Start X and End X Keyframe Sliders */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <div className="flex justify-between text-[11px] font-mono tabular-nums text-slate-400">
                      <span>Start X</span>
                      <span>{placement.startX}%</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={90}
                      value={placement.startX}
                      onChange={(e) =>
                        handlePlacementChange(idx, {
                          startX: Number(e.target.value),
                        })
                      }
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] font-mono tabular-nums text-slate-400">
                      <span>End X</span>
                      <span>{placement.endX}%</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={90}
                      value={placement.endX}
                      onChange={(e) =>
                        handlePlacementChange(idx, {
                          endX: Number(e.target.value),
                        })
                      }
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'dialogue' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Lip-Sync &amp; Subtitle Lines
              </span>
              <button
                type="button"
                onClick={handleAddDialogue}
                className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Line</span>
              </button>
            </div>

            {selectedScene.dialogues.length === 0 ? (
              <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800 text-center space-y-2">
                <p className="text-xs text-slate-400">
                  No spoken dialogue lines in this scene yet.
                </p>
                <button
                  type="button"
                  onClick={handleAddDialogue}
                  className="px-3 py-1.5 rounded-md bg-amber-500 text-slate-950 text-xs font-semibold cursor-pointer"
                >
                  Add First Dialogue Line
                </button>
              </div>
            ) : (
              selectedScene.dialogues.map((dlg, idx) => (
                <div
                  key={dlg.id}
                  className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <select
                      value={dlg.characterId}
                      onChange={(e) => {
                        const found = project.characters.find(
                          (c) => c.id === e.target.value
                        );
                        handleDialogueChange(idx, {
                          characterId: e.target.value,
                          speakerName: found?.name || dlg.speakerName,
                        });
                      }}
                      className="rounded bg-slate-900 border border-slate-700 px-2 py-1 text-xs font-medium text-slate-100"
                    >
                      {project.characters.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => handleDeleteDialogue(idx)}
                      className="p-1 text-slate-400 hover:text-rose-400 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <textarea
                    rows={2}
                    value={dlg.text}
                    onChange={(e) =>
                      handleDialogueChange(idx, { text: e.target.value })
                    }
                    className="w-full rounded bg-slate-900 border border-slate-800 px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500 resize-none"
                  />

                  <div className="grid grid-cols-2 gap-2.5 text-[11px] font-mono tabular-nums text-slate-400">
                    <div>
                      <div className="flex justify-between">
                        <span>Start Offset</span>
                        <span>F{dlg.startFrameOffset}</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={Math.max(12, selectedScene.durationFrames - 24)}
                        step={2}
                        value={dlg.startFrameOffset}
                        onChange={(e) =>
                          handleDialogueChange(idx, {
                            startFrameOffset: Number(e.target.value),
                          })
                        }
                        className="w-full accent-sky-400 cursor-pointer"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between">
                        <span>Duration</span>
                        <span>{dlg.durationFrames}F</span>
                      </div>
                      <input
                        type="range"
                        min={16}
                        max={selectedScene.durationFrames}
                        step={4}
                        value={dlg.durationFrames}
                        onChange={(e) =>
                          handleDialogueChange(idx, {
                            durationFrames: Number(e.target.value),
                          })
                        }
                        className="w-full accent-sky-400 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
