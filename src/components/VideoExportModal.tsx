import React, { useEffect, useRef, useState } from 'react';
import { X, Download, Film, CheckCircle2, RefreshCw } from 'lucide-react';
import {
  AnimationProject,
  RenderOptions,
  formatSMPTE24,
  getProjectTotalFrames,
} from '../types/animation';
import { renderProjectFrame } from '../engine/canvasRenderer';

interface VideoExportModalProps {
  project: AnimationProject;
  renderOptions: RenderOptions;
  onClose: () => void;
}

export const VideoExportModal: React.FC<VideoExportModalProps> = ({
  project,
  renderOptions,
  onClose,
}) => {
  const exportCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [renderedFrame, setRenderedFrame] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [includeBurnIn, setIncludeBurnIn] = useState(false);
  const [includeSubtitles, setIncludeSubtitles] = useState(
    renderOptions.showSubtitles
  );

  const totalFrames = Math.max(24, getProjectTotalFrames(project));

  useEffect(() => {
    // Draw frame 0 preview initially
    const canvas = exportCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    renderProjectFrame(ctx, project, 0, {
      showOnionSkin: false,
      showSafeGuides: false,
      showTimecodeBurnIn: includeBurnIn,
      showSubtitles: includeSubtitles,
    });
  }, [project, includeBurnIn, includeSubtitles]);

  useEffect(() => {
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  const start24FPSRender = () => {
    const canvas = exportCanvasRef.current;
    if (!canvas || isRendering) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
      setVideoUrl(null);
    }

    setIsRendering(true);
    setRenderedFrame(0);

    const stream = canvas.captureStream(24);
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';

    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 6_000_000,
    });

    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      setIsRendering(false);
    };

    recorder.start();

    let frame = 0;
    const intervalMs = 1000 / 24;

    const timer = window.setInterval(() => {
      if (frame >= totalFrames) {
        window.clearInterval(timer);
        recorder.stop();
        return;
      }

      renderProjectFrame(ctx, project, frame, {
        showOnionSkin: false,
        showSafeGuides: false,
        showTimecodeBurnIn: includeBurnIn,
        showSubtitles: includeSubtitles,
      });

      setRenderedFrame(frame + 1);
      frame++;
    }, intervalMs);
  };

  const progressPct = Math.round((renderedFrame / totalFrames) * 100);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Film className="w-4 h-4 text-amber-400" />
            <h2 className="text-base font-semibold text-slate-100">
              Render &amp; Export 24 FPS Video
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isRendering}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Preview Canvas */}
          <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-slate-950 border border-slate-800">
            <canvas
              ref={exportCanvasRef}
              width={project.width || 1280}
              height={project.height || 720}
              className="w-full h-full object-contain"
            />
          </div>

          {/* Export Specs Metadata */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono tabular-nums text-slate-400">
            <span>Resolution: 1280×720 (16:9 HD)</span>
            <span aria-hidden="true">·</span>
            <span className="text-amber-400">Frame Rate: Locked 24.0 FPS</span>
            <span aria-hidden="true">·</span>
            <span>
              Total Length: {totalFrames} Frames ({(totalFrames / 24).toFixed(1)}s)
            </span>
          </div>

          {/* Options */}
          <div className="flex flex-wrap items-center gap-6 text-xs text-slate-300">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeSubtitles}
                disabled={isRendering}
                onChange={(e) => setIncludeSubtitles(e.target.checked)}
                className="accent-amber-500 rounded"
              />
              <span>Burn in Dialogue Subtitles</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeBurnIn}
                disabled={isRendering}
                onChange={(e) => setIncludeBurnIn(e.target.checked)}
                className="accent-amber-500 rounded"
              />
              <span>Include SMPTE 24 FPS Timecode Overlay</span>
            </label>
          </div>

          {/* Progress Bar */}
          {(isRendering || renderedFrame > 0) && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                <span className="text-slate-300">
                  {isRendering
                    ? `Encoding Frame ${renderedFrame} of ${totalFrames} (${formatSMPTE24(
                        renderedFrame
                      )})...`
                    : '24 FPS Render Complete'}
                </span>
                <span className="text-amber-400">{progressPct}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                <div
                  style={{ width: `${progressPct}%` }}
                  className="h-full bg-amber-500 transition-all duration-75"
                />
              </div>
            </div>
          )}

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-3 pt-2">
            {!isRendering && (
              <button
                type="button"
                onClick={start24FPSRender}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-100 transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{videoUrl ? 'Re-Render 24 FPS Video' : 'Start 24 FPS Render'}</span>
              </button>
            )}

            {videoUrl && !isRendering && (
              <a
                href={videoUrl}
                download={`${project.title
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, '_')}_24fps.webm`}
                className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold transition-colors flex items-center gap-2 whitespace-nowrap"
              >
                <CheckCircle2 className="w-4 h-4" />
                <Download className="w-3.5 h-3.5" />
                <span>Download 24 FPS .WebM</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
