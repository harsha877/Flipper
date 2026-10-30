import React, { useRef } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Repeat,
  Layers,
  Grid,
  Subtitles,
  Clock,
} from 'lucide-react';
import {
  AnimationProject,
  RenderOptions,
  formatTimecode,
  getProjectTotalFrames,
  resolveSceneAtFrame,
} from '../types/animation';

interface TimelineProps {
  project: AnimationProject;
  currentFrame: number;
  isPlaying: boolean;
  isLooping: boolean;
  renderOptions: RenderOptions;
  selectedSceneId: string;
  onSelectFrame: (frame: number) => void;
  onTogglePlay: () => void;
  onStepFrame: (delta: number) => void;
  onToggleLoop: () => void;
  onUpdateRenderOptions: (next: Partial<RenderOptions>) => void;
  onSelectScene: (sceneId: string, jumpToStart?: boolean) => void;
}

export const Timeline: React.FC<TimelineProps> = ({
  project,
  currentFrame,
  isPlaying,
  isLooping,
  renderOptions,
  selectedSceneId,
  onSelectFrame,
  onTogglePlay,
  onStepFrame,
  onToggleLoop,
  onUpdateRenderOptions,
  onSelectScene,
}) => {
  const rulerRef = useRef<HTMLDivElement>(null);
  const totalFrames = Math.max(24, getProjectTotalFrames(project));
  const { sceneIndex } = resolveSceneAtFrame(project, currentFrame);

  const handlePointerScrub = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!rulerRef.current) return;
    const rect = rulerRef.current.getBoundingClientRect();
    const computeFrame = (clientX: number) => {
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return Math.min(totalFrames - 1, Math.round(ratio * (totalFrames - 1)));
    };

    onSelectFrame(computeFrame(e.clientX));

    const onMove = (moveEvent: PointerEvent) => {
      onSelectFrame(computeFrame(moveEvent.clientX));
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const playheadPercent =
    totalFrames > 1 ? (currentFrame / (totalFrames - 1)) * 100 : 0;

  // Compute scene blocks with startFrame offsets
  let runningFrame = 0;
  const sceneBlocks = project.scenes.map((scene, idx) => {
    const start = runningFrame;
    const dur = Math.max(24, scene.durationFrames);
    runningFrame += dur;
    return {
      scene,
      index: idx,
      startFrame: start,
      durationFrames: dur,
      widthPercent: (dur / totalFrames) * 100,
      leftPercent: (start / totalFrames) * 100,
    };
  });

  // Generate 1-second (24-frame) ruler ticks
  const totalSeconds = Math.ceil(totalFrames / 24);
  const secondTicks = Array.from({ length: totalSeconds + 1 }, (_, i) => i * 24).filter(
    (f) => f <= totalFrames
  );

  return (
    <section
      aria-label="Master Timeline"
      className="bg-slate-900 border-t border-slate-800 flex flex-col select-none shrink-0"
    >
      {/* Top Transport & Telemetry Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-2.5 border-b border-slate-800/80 bg-slate-950/60">
        {/* Left: Playback Transport Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onSelectFrame(0)}
            title="Jump to First Frame"
            className="p-2 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onStepFrame(-1)}
            title="Step Back 1 Frame"
            className="px-2.5 py-1.5 rounded-md text-xs font-mono text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>-1F</span>
          </button>
          <button
            type="button"
            onClick={onTogglePlay}
            className="px-4 py-1.5 rounded-md text-xs font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Play</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => onStepFrame(1)}
            title="Step Forward 1 Frame"
            className="px-2.5 py-1.5 rounded-md text-xs font-mono text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
          >
            <span>+1F</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onSelectFrame(totalFrames - 1)}
            title="Jump to Last Frame"
            className="p-2 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <SkipForward className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onToggleLoop}
            title="Toggle Loop Playback"
            className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
              isLooping
                ? 'bg-slate-800 text-amber-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Repeat className="w-3.5 h-3.5" />
            <span>Loop</span>
          </button>
        </div>

        {/* Center: Tabular Timecode & Exact Frame Readout */}
        <div className="flex items-center gap-3 text-xs font-mono tabular-nums text-slate-300">
          <span className="text-amber-400 font-semibold">
            {formatTimecode(currentFrame)}
          </span>
          <span aria-hidden="true" className="text-slate-600">
            ·
          </span>
          <span>
            Frame {String(currentFrame + 1).padStart(3, '0')} /{' '}
            {String(totalFrames).padStart(3, '0')}
          </span>
          <span aria-hidden="true" className="text-slate-600">
            ·
          </span>
          <span>{(totalFrames / 24).toFixed(1)}s</span>
          <span aria-hidden="true" className="text-slate-600">
            ·
          </span>
          <span className="text-slate-400">
            Scene {String(sceneIndex + 1).padStart(2, '0')} of{' '}
            {String(project.scenes.length).padStart(2, '0')}
          </span>
        </div>

        {/* Right: Stage Viewport Overlays (Onion Skin, Subtitles, Burn-in, Safe Guides) */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={() =>
              onUpdateRenderOptions({
                showOnionSkin: !renderOptions.showOnionSkin,
              })
            }
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
              renderOptions.showOnionSkin
                ? 'bg-slate-800 text-sky-300'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Show Previous and Next Frame Onion Skin Ghosts"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Onion Skin</span>
          </button>
          <button
            type="button"
            onClick={() =>
              onUpdateRenderOptions({
                showSubtitles: !renderOptions.showSubtitles,
              })
            }
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
              renderOptions.showSubtitles
                ? 'bg-slate-800 text-amber-300'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Subtitles className="w-3.5 h-3.5" />
            <span>Subtitles</span>
          </button>
          <button
            type="button"
            onClick={() =>
              onUpdateRenderOptions({
                showTimecodeBurnIn: !renderOptions.showTimecodeBurnIn,
              })
            }
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
              renderOptions.showTimecodeBurnIn
                ? 'bg-slate-800 text-slate-100'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>TC Burn-In</span>
          </button>
          <button
            type="button"
            onClick={() =>
              onUpdateRenderOptions({
                showSafeGuides: !renderOptions.showSafeGuides,
              })
            }
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
              renderOptions.showSafeGuides
                ? 'bg-slate-800 text-slate-100'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Safe Area</span>
          </button>
        </div>
      </div>

      {/* Interactive Timeline Tracks */}
      <div className="flex flex-col px-5 py-3 gap-2">
        <div
          ref={rulerRef}
          onPointerDown={handlePointerScrub}
          className="relative cursor-ew-resize bg-slate-950 border border-slate-800 rounded-lg overflow-hidden"
        >
          {/* 24 FPS Frame Ruler Header */}
          <div className="relative h-7 border-b border-slate-800/90 bg-slate-900/60">
            {secondTicks.map((frameTick) => {
              const leftPct = (frameTick / totalFrames) * 100;
              return (
                <div
                  key={frameTick}
                  style={{ left: `${leftPct}%` }}
                  className="absolute top-0 bottom-0 flex flex-col justify-between pointer-events-none"
                >
                  <div className="h-2.5 w-px bg-slate-600" />
                  <span className="text-[10px] font-mono tabular-nums text-slate-400 pl-1">
                    F{frameTick + 1} ({frameTick / 24}s)
                  </span>
                </div>
              );
            })}
          </div>

          {/* Track 1: Multi-Scene Sequence Blocks */}
          <div className="relative h-10 border-b border-slate-800/70 flex items-center">
            {sceneBlocks.map((block) => {
              const isSelected = block.scene.id === selectedSceneId;
              return (
                <div
                  key={block.scene.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectScene(block.scene.id, true);
                  }}
                  style={{
                    left: `${block.leftPercent}%`,
                    width: `${block.widthPercent}%`,
                  }}
                  className={`absolute top-1 bottom-1 rounded px-2.5 flex items-center justify-between text-xs transition-colors cursor-pointer overflow-hidden border ${
                    isSelected
                      ? 'bg-amber-500/20 border-amber-500/70 text-amber-200'
                      : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span className="font-medium truncate">
                    0{block.index + 1}. {block.scene.title}
                  </span>
                  <span className="text-[11px] font-mono tabular-nums text-slate-400 shrink-0 ml-2">
                    {block.durationFrames}F
                  </span>
                </div>
              );
            })}
          </div>

          {/* Track 2: Dialogue & Lip-Sync Bars */}
          <div className="relative h-8 bg-slate-950/90 flex items-center">
            {sceneBlocks.map((block) =>
              block.scene.dialogues.map((dlg) => {
                const globalStart = block.startFrame + dlg.startFrameOffset;
                const leftPct = (globalStart / totalFrames) * 100;
                const widthPct = (dlg.durationFrames / totalFrames) * 100;
                return (
                  <div
                    key={dlg.id}
                    style={{
                      left: `${leftPct}%`,
                      width: `${Math.max(widthPct, 1.5)}%`,
                    }}
                    title={`${dlg.speakerName}: "${dlg.text}"`}
                    className="absolute top-1.5 bottom-1.5 rounded bg-sky-500/25 border border-sky-400/50 px-1.5 flex items-center overflow-hidden pointer-events-none"
                  >
                    <span className="text-[10px] text-sky-200 truncate">
                      {dlg.speakerName}: {dlg.text}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Playhead Vertical Line & Handle */}
          <div
            style={{ left: `${playheadPercent}%` }}
            className="absolute top-0 bottom-0 w-0.5 bg-amber-400 pointer-events-none z-20"
          >
            <div className="w-3 h-3 -ml-[5px] bg-amber-400 rotate-45 rounded-xs shadow-sm" />
          </div>
        </div>
      </div>
    </section>
  );
};
