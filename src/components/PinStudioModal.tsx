import React, { useEffect, useRef, useState } from 'react';
import { Check, Copy, Download, Sparkles, X } from 'lucide-react';
import { RetundaPage } from '../utils/flatFileEngine';

interface PinStudioModalProps {
  page: RetundaPage;
  siteName: string;
  onClose: () => void;
}

type PinTemplateStyle = 'editorial' | 'listicle' | 'minimal';

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 4
): number {
  const words = text.split(' ');
  let line = '';
  let currentY = y;
  let lineCount = 0;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      lineCount++;
      if (lineCount >= maxLines) {
        ctx.fillText(line.trim() + '…', x, currentY);
        return currentY + lineHeight;
      }
      ctx.fillText(line.trim(), x, currentY);
      line = words[n] + ' ';
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line.trim()) {
    ctx.fillText(line.trim(), x, currentY);
    currentY += lineHeight;
  }
  return currentY;
}

export const PinStudioModal: React.FC<PinStudioModalProps> = ({
  page,
  siteName,
  onClose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [template, setTemplate] = useState<PinTemplateStyle>('editorial');
  const [customHeadline, setCustomHeadline] = useState(page.pinTitle || page.title);
  const [customSubtext, setCustomSubtext] = useState(
    `${page.products.length} Curated Amazon Finds • ${page.category}`
  );
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const destinationUrl = `${window.location.origin}${window.location.pathname}?page=${encodeURIComponent(
    page.slug
  )}`;

  const copyText = (key: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedField(key);
    setTimeout(() => setCopiedField(null), 2000);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isCancelled = false;

    const renderPin = (img: HTMLImageElement | null) => {
      if (isCancelled) return;

      // 2:3 Standard Pinterest Pin Resolution (1000 x 1500)
      const W = 1000;
      const H = 1500;
      ctx.clearRect(0, 0, W, H);

      // Warm Alabaster Canvas
      ctx.fillStyle = '#FAF9F6';
      ctx.fillRect(0, 0, W, H);

      if (template === 'editorial') {
        // Top Image Frame
        const imgH = 880;
        if (img) {
          const scale = Math.max(W / img.width, imgH / img.height);
          const sw = img.width * scale;
          const sh = img.height * scale;
          ctx.save();
          ctx.beginPath();
          ctx.rect(0, 0, W, imgH);
          ctx.clip();
          ctx.drawImage(img, (W - sw) / 2, (imgH - sh) / 2, sw, sh);
          ctx.restore();
        } else {
          ctx.fillStyle = '#E7E5E0';
          ctx.fillRect(0, 0, W, imgH);
        }

        // Subtle warm gradient overlay at bottom of image
        const grad = ctx.createLinearGradient(0, imgH - 220, 0, imgH);
        grad.addColorStop(0, 'rgba(28,25,23,0)');
        grad.addColorStop(1, 'rgba(28,25,23,0.55)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, imgH - 220, W, 220);

        // Editorial Lower Card
        ctx.fillStyle = '#FAF9F6';
        ctx.fillRect(0, imgH, W, H - imgH);

        // Amber-Bronze Kicker Bar
        ctx.fillStyle = '#B45309';
        ctx.fillRect(80, imgH + 64, 72, 4);

        ctx.fillStyle = '#B45309';
        ctx.font = '600 24px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(customSubtext.toUpperCase(), 80, imgH + 115);

        // Headline
        ctx.fillStyle = '#1C1917';
        ctx.font = '600 58px "Fraunces", Georgia, serif';
        wrapCanvasText(ctx, customHeadline, 80, imgH + 195, W - 160, 72, 4);

        // Footer Divider & Domain Stamp
        ctx.strokeStyle = '#E7E5E0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(80, H - 110);
        ctx.lineTo(W - 80, H - 110);
        ctx.stroke();

        ctx.fillStyle = '#57534E';
        ctx.font = '600 24px "JetBrains Mono", monospace';
        ctx.fillText(`${siteName.toUpperCase()} • CURATED AMAZON EDIT`, 80, H - 58);
      } else if (template === 'listicle') {
        // Full Bleed Image with Editorial Center Card
        if (img) {
          const scale = Math.max(W / img.width, H / img.height);
          const sw = img.width * scale;
          const sh = img.height * scale;
          ctx.drawImage(img, (W - sw) / 2, (H - sh) / 2, sw, sh);
        }

        ctx.fillStyle = 'rgba(28, 25, 23, 0.38)';
        ctx.fillRect(0, 0, W, H);

        // Inner Alabaster Sheet
        const padX = 85;
        const padY = 170;
        ctx.fillStyle = 'rgba(250, 249, 246, 0.96)';
        ctx.fillRect(padX, padY, W - padX * 2, H - padY * 2);

        // Hairline Inner Border
        ctx.strokeStyle = '#D6D3CD';
        ctx.lineWidth = 2;
        ctx.strokeRect(padX + 24, padY + 24, W - (padX + 24) * 2, H - (padY + 24) * 2);

        // Big Number Badge
        ctx.fillStyle = '#B45309';
        ctx.font = '600 130px "Fraunces", Georgia, serif';
        ctx.fillText(`0${page.products.length}`, padX + 75, padY + 195);

        ctx.fillStyle = '#57534E';
        ctx.font = '600 24px "JetBrains Mono", monospace';
        ctx.fillText(customSubtext.toUpperCase(), padX + 75, padY + 255);

        ctx.fillStyle = '#1C1917';
        ctx.font = '600 56px "Fraunces", Georgia, serif';
        const nextY = wrapCanvasText(
          ctx,
          customHeadline,
          padX + 75,
          padY + 345,
          W - (padX + 75) * 2,
          70,
          4
        );

        // Mini Product Checklist Preview
        ctx.font = '500 26px "Plus Jakarta Sans", sans-serif';
        ctx.fillStyle = '#44403C';
        page.products.slice(0, 4).forEach((prod, idx) => {
          const itemY = nextY + 45 + idx * 54;
          if (itemY < H - padY - 120) {
            const label =
              prod.name.length > 42 ? prod.name.slice(0, 42) + '…' : prod.name;
            ctx.fillText(`0${idx + 1}.  ${label} (${prod.price})`, padX + 75, itemY);
          }
        });

        ctx.fillStyle = '#1C1917';
        ctx.font = '600 24px "JetBrains Mono", monospace';
        ctx.fillText(
          `TAP PIN TO SHOP FULL LIST ON ${siteName.toUpperCase()} →`,
          padX + 75,
          H - padY - 65
        );
      } else {
        // Minimal Gallery Frame
        ctx.fillStyle = '#F3F1EC';
        ctx.fillRect(0, 0, W, H);

        ctx.fillStyle = '#1C1917';
        ctx.font = '600 26px "JetBrains Mono", monospace';
        ctx.fillText(`${siteName.toUpperCase()} ARCHIVE // ${page.category.toUpperCase()}`, 80, 95);

        ctx.fillStyle = '#1C1917';
        ctx.font = '600 56px "Fraunces", Georgia, serif';
        const afterTitleY = wrapCanvasText(ctx, customHeadline, 80, 175, W - 160, 68, 3);

        const frameTop = Math.max(380, afterTitleY + 20);
        const frameH = H - frameTop - 150;
        if (img) {
          const scale = Math.max((W - 160) / img.width, frameH / img.height);
          const sw = img.width * scale;
          const sh = img.height * scale;
          ctx.save();
          ctx.beginPath();
          ctx.rect(80, frameTop, W - 160, frameH);
          ctx.clip();
          ctx.drawImage(img, 80 + (W - 160 - sw) / 2, frameTop + (frameH - sh) / 2, sw, sh);
          ctx.restore();
        }

        ctx.fillStyle = '#B45309';
        ctx.font = '600 26px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(customSubtext, 80, H - 70);
      }
    };

    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => renderPin(image);
    image.onerror = () => renderPin(null);
    image.src = page.heroImage;

    return () => {
      isCancelled = true;
    };
  }, [page, template, customHeadline, customSubtext, siteName]);

  const handleDownloadPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `retunda-pin-${page.slug}.png`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#1C1917]/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#FAF9F6] border border-[#E7E5E0] max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 shadow-2xl overflow-hidden my-8">
        {/* Left: 2:3 Canvas Preview */}
        <div className="lg:col-span-5 bg-[#F3F1EC] p-6 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-[#E7E5E0]">
          <div className="w-full flex items-center justify-between mb-3">
            <span className="font-mono text-xs uppercase tracking-wider text-[#57534E]">
              2:3 Pinterest Pin (1000 × 1500 px)
            </span>
            <button
              onClick={handleDownloadPng}
              className="inline-flex items-center gap-1.5 bg-[#1C1917] text-[#FAF9F6] px-3 py-1.5 text-xs font-medium hover:bg-[#B45309] transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Download PNG
            </button>
          </div>

          <div className="w-full max-w-[310px] aspect-[2/3] border border-[#D6D3CD] bg-[#FAF9F6] shadow-md overflow-hidden">
            <canvas
              ref={canvasRef}
              width={1000}
              height={1500}
              className="w-full h-full object-contain block"
            />
          </div>
        </div>

        {/* Right: Pin Controls & Ready-to-Paste Pinterest SEO Fields */}
        <div className="lg:col-span-7 p-6 lg:p-8 flex flex-col justify-between max-h-[88vh] overflow-y-auto">
          <div>
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#E7E5E0]">
              <div>
                <p className="font-mono text-xs uppercase tracking-widest text-[#B45309] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Pinterest Bridge Kit
                </p>
                <h2 className="font-serif-display text-2xl font-semibold text-[#1C1917] mt-1">
                  Pin Graphic &amp; Destination Link
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-[#57534E] hover:text-[#1C1917] border border-[#E7E5E0] bg-[#F3F1EC] cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Template Switcher */}
            <div className="mt-5">
              <label className="block font-mono text-xs uppercase tracking-wider text-[#57534E] mb-2">
                1. Choose 2:3 Graphic Layout
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: 'editorial', label: 'Editorial Cover' },
                    { id: 'listicle', label: 'Numbered Listicle' },
                    { id: 'minimal', label: 'Gallery Frame' },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTemplate(item.id)}
                    className={`py-2 px-3 text-xs font-medium border text-left transition-colors cursor-pointer ${
                      template === item.id
                        ? 'border-[#1C1917] bg-[#1C1917] text-[#FAF9F6]'
                        : 'border-[#E7E5E0] bg-[#F3F1EC] text-[#1C1917] hover:border-[#B45309]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Customize Overlay Text */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              <div>
                <label className="block font-mono text-xs uppercase tracking-wider text-[#57534E] mb-1">
                  Pin Headline Overlay
                </label>
                <input
                  type="text"
                  value={customHeadline}
                  onChange={(e) => setCustomHeadline(e.target.value)}
                  className="w-full bg-[#F3F1EC] border border-[#E7E5E0] px-3 py-2 text-sm text-[#1C1917] focus:outline-none focus:border-[#1C1917]"
                />
              </div>
              <div>
                <label className="block font-mono text-xs uppercase tracking-wider text-[#57534E] mb-1">
                  Kicker Subtitle
                </label>
                <input
                  type="text"
                  value={customSubtext}
                  onChange={(e) => setCustomSubtext(e.target.value)}
                  className="w-full bg-[#F3F1EC] border border-[#E7E5E0] px-3 py-2 text-sm text-[#1C1917] focus:outline-none focus:border-[#1C1917]"
                />
              </div>
            </div>

            {/* Copyable Pinterest Fields */}
            <div className="mt-6 space-y-4 border-t border-[#E7E5E0] pt-5">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs uppercase tracking-wider text-[#B45309] font-semibold">
                    2. Pinterest Destination Link (Attach this URL to your Pin)
                  </span>
                  <button
                    onClick={() => copyText('url', destinationUrl)}
                    className="inline-flex items-center gap-1 text-xs font-mono text-[#1C1917] hover:text-[#B45309] cursor-pointer"
                  >
                    {copiedField === 'url' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#15803D]" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Copy URL
                      </>
                    )}
                  </button>
                </div>
                <div className="bg-[#F3F1EC] border border-[#E7E5E0] px-3 py-2 font-mono text-xs text-[#1C1917] break-all">
                  {destinationUrl}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs uppercase tracking-wider text-[#57534E]">
                    3. Pinterest SEO Pin Title
                  </span>
                  <button
                    onClick={() => copyText('title', page.pinTitle || page.title)}
                    className="inline-flex items-center gap-1 text-xs font-mono text-[#1C1917] hover:text-[#B45309] cursor-pointer"
                  >
                    {copiedField === 'title' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#15803D]" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Copy Title
                      </>
                    )}
                  </button>
                </div>
                <div className="bg-[#F3F1EC] border border-[#E7E5E0] px-3 py-2 text-sm text-[#1C1917]">
                  {page.pinTitle || page.title}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs uppercase tracking-wider text-[#57534E]">
                    4. Pinterest Keyword Description
                  </span>
                  <button
                    onClick={() => copyText('desc', page.pinDescription || page.summary)}
                    className="inline-flex items-center gap-1 text-xs font-mono text-[#1C1917] hover:text-[#B45309] cursor-pointer"
                  >
                    {copiedField === 'desc' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#15803D]" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Copy Description
                      </>
                    )}
                  </button>
                </div>
                <div className="bg-[#F3F1EC] border border-[#E7E5E0] px-3 py-2 text-xs text-[#57534E] leading-relaxed">
                  {page.pinDescription || page.summary}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#E7E5E0] flex items-center justify-between">
            <span className="font-mono text-xs text-[#57534E]">
              Source file: <code className="text-[#1C1917]">src/content/pages/{page.fileName}</code>
            </span>
            <button
              onClick={handleDownloadPng}
              className="inline-flex items-center gap-2 bg-[#B45309] text-[#FAF9F6] px-5 py-2.5 text-xs font-semibold uppercase tracking-wider hover:bg-[#1C1917] transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Download 2:3 Pin Graphic
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
