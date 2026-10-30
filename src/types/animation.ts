export type CharacterBodyType =
  | 'humanoid'
  | 'robot'
  | 'animal_fox'
  | 'animal_cat'
  | 'astronaut'
  | 'spirit';

export type CharacterAccessory =
  | 'none'
  | 'helmet'
  | 'scarf'
  | 'glasses'
  | 'crown'
  | 'headphones'
  | 'backpack'
  | 'cape'
  | 'antenna';

export type EnvironmentTheme =
  | 'forest'
  | 'cyber_city'
  | 'space_station'
  | 'sunset_desert'
  | 'cozy_studio'
  | 'ocean_cliff';

export type TimeOfDay = 'dawn' | 'day' | 'dusk' | 'night';

export type WeatherEffect =
  | 'clear'
  | 'rain'
  | 'snow'
  | 'fireflies'
  | 'starfield';

export type CameraMotion =
  | 'static'
  | 'pan_left'
  | 'pan_right'
  | 'zoom_in'
  | 'zoom_out'
  | 'dramatic_push';

export type ForegroundProp =
  | 'none'
  | 'monolith'
  | 'ramen_cart'
  | 'campfire'
  | 'console_desk'
  | 'lantern'
  | 'telescope'
  | 'crate';

export type CharacterAction =
  | 'idle'
  | 'walk'
  | 'run'
  | 'talk'
  | 'wave'
  | 'jump'
  | 'celebrate'
  | 'think'
  | 'inspect';

export type CharacterExpression =
  | 'neutral'
  | 'happy'
  | 'surprised'
  | 'determined'
  | 'skeptical'
  | 'excited';

export interface CharacterSpec {
  id: string;
  name: string;
  role: string;
  primaryColor: string;
  secondaryColor: string;
  skinOrFurColor: string;
  bodyType: CharacterBodyType;
  accessory: CharacterAccessory;
}

export interface CharacterActionSpec {
  characterId: string;
  startX: number; // percentage 10..90
  startY: number; // percentage 60..82
  endX: number;
  endY: number;
  scale: number;
  action: CharacterAction;
  expression: CharacterExpression;
  facing: 'left' | 'right';
}

export interface DialogueLineSpec {
  id: string;
  characterId: string;
  speakerName: string;
  text: string;
  startFrameOffset: number; // relative to scene start (at 24 FPS)
  durationFrames: number;   // length in frames (at 24 FPS)
}

export interface SceneSpec {
  id: string;
  title: string;
  narrativeSummary: string;
  durationFrames: number; // e.g., 96 frames = 4.0s at 24 FPS
  environmentTheme: EnvironmentTheme;
  timeOfDay: TimeOfDay;
  weatherEffect: WeatherEffect;
  cameraMotion: CameraMotion;
  foregroundProp: ForegroundProp;
  characterPlacements: CharacterActionSpec[];
  dialogues: DialogueLineSpec[];
}

export interface AnimationProject {
  id: string;
  title: string;
  prompt: string;
  logline: string;
  fps: 24;
  width: number;
  height: number;
  visualStyle: string;
  characters: CharacterSpec[];
  scenes: SceneSpec[];
}

export interface RenderOptions {
  showOnionSkin: boolean;
  showTimecodeBurnIn: boolean;
  showSafeGuides: boolean;
  showSubtitles: boolean;
}

/**
 * Formats a 0-based frame index at 24 FPS into SMPTE timecode MM:SS:FF
 */
export function formatSMPTE24(frame: number): string {
  const safeFrame = Math.max(0, Math.floor(frame));
  const totalSeconds = Math.floor(safeFrame / 24);
  const ff = safeFrame % 24;
  const ss = totalSeconds % 60;
  const mm = Math.floor(totalSeconds / 60);

  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(mm)}:${pad(ss)}:${pad(ff)}`;
}

/**
 * Computes total frames across all scenes in the project
 */
export function getProjectTotalFrames(project: AnimationProject): number {
  return project.scenes.reduce((acc, scene) => acc + Math.max(24, scene.durationFrames), 0);
}

/**
 * Resolves which scene and local frame offset correspond to a global frame index
 */
export function resolveSceneAtFrame(
  project: AnimationProject,
  globalFrame: number
): {
  scene: SceneSpec;
  sceneIndex: number;
  sceneStartFrame: number;
  localFrame: number;
  sceneProgress: number;
} {
  if (project.scenes.length === 0) {
    throw new Error('Project has no scenes');
  }

  const clampedGlobal = Math.max(0, globalFrame);
  let accumulated = 0;

  for (let i = 0; i < project.scenes.length; i++) {
    const s = project.scenes[i];
    const dur = Math.max(24, s.durationFrames);
    if (clampedGlobal < accumulated + dur || i === project.scenes.length - 1) {
      const localFrame = Math.min(dur - 1, Math.max(0, clampedGlobal - accumulated));
      const sceneProgress = dur > 1 ? localFrame / (dur - 1) : 0;
      return {
        scene: s,
        sceneIndex: i,
        sceneStartFrame: accumulated,
        localFrame,
        sceneProgress,
      };
    }
    accumulated += dur;
  }

  const lastScene = project.scenes[project.scenes.length - 1];
  return {
    scene: lastScene,
    sceneIndex: project.scenes.length - 1,
    sceneStartFrame: accumulated - lastScene.durationFrames,
    localFrame: lastScene.durationFrames - 1,
    sceneProgress: 1,
  };
}
