import React from 'react';
import {
  ArrowRight,
  ExternalLink,
  FileCode2,
  FolderTree,
  Globe,
  Layers,
  Share2,
} from 'lucide-react';

interface FlatFileGuideViewProps {
  amazonTag: string;
  onGoToBuilder: () => void;
}

export const FlatFileGuideView: React.FC<FlatFileGuideViewProps> = ({
  amazonTag,
  onGoToBuilder,
}) => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      {/* Header */}
      <div className="border-b border-[#E7E5E0] pb-8">
        <p className="font-mono text-xs uppercase tracking-widest text-[#B45309]">
          Retunda Operational Playbook
        </p>
        <h1 className="font-serif-display text-3xl sm:text-5xl font-semibold text-[#1C1917] mt-2 leading-tight">
          How to Add New Pages, Attach Pinterest Links &amp; Host for Free
        </h1>
        <p className="text-base text-[#57534E] mt-3 max-w-3xl leading-relaxed">
          <strong>Retunda</strong> is a 100% pure React frontend application. There is no server to maintain and no database to pay for—every page and Amazon affiliate link lives inside plain <code className="font-mono text-xs bg-[#F3F1EC] px-1.5 py-0.5 border border-[#E7E5E0]">.txt</code> files in your <code className="font-mono text-xs bg-[#F3F1EC] px-1.5 py-0.5 border border-[#E7E5E0]">src/content/</code> folder.
        </p>
      </div>

      {/* Step 1: Folder Architecture */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-5 space-y-3">
          <div className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-[#B45309]">
            <FolderTree className="w-4 h-4" />
            Step 01 // Flat-File Folder
          </div>
          <h2 className="font-serif-display text-2xl font-semibold text-[#1C1917]">
            Where Your Links &amp; Pages Are Stored
          </h2>
          <p className="text-sm text-[#57534E] leading-relaxed">
            Vite&apos;s <code className="font-mono text-xs">import.meta.glob</code> automatically scans <code className="font-mono text-xs">src/content/pages/*.txt</code>. Whenever you drop a new <code className="font-mono text-xs">.txt</code> file into that folder, React automatically builds a new page and adds it to your home page grid.
          </p>
          <button
            onClick={onGoToBuilder}
            className="inline-flex items-center gap-2 bg-[#1C1917] text-[#FAF9F6] px-4 py-2.5 text-xs font-mono uppercase tracking-wider hover:bg-[#B45309] transition-colors cursor-pointer mt-2"
          >
            Open Visual .txt Page Builder <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="lg:col-span-7 bg-[#F3F1EC] border border-[#E7E5E0] p-6 font-mono text-xs text-[#1C1917] space-y-2">
          <div className="text-[#B45309] font-semibold mb-2">
            PROJECT CONTENT DIRECTORY:
          </div>
          <div>src/</div>
          <div className="pl-4">└── content/</div>
          <div className="pl-10 text-[#1C1917]">
            ├── <strong>site-config.txt</strong>{' '}
            <span className="text-[#57534E]">
              (Stores SITE_NAME: Retunda &amp; AMAZON_TAG: {amazonTag})
            </span>
          </div>
          <div className="pl-10 text-[#1C1917]">
            ├── <strong>affiliate-links.txt</strong>{' '}
            <span className="text-[#57534E]">
              (Stores your master Quick-Shop Amazon links)
            </span>
          </div>
          <div className="pl-10 text-[#1C1917]">
            └── <strong>pages/</strong>{' '}
            <span className="text-[#57534E]">
              (Drop any .txt file here to create a new page!)
            </span>
          </div>
          <div className="pl-16 text-[#57534E]">
            ├── cozy-linen-living-room.txt → <code>?page=cozy-linen-living-room</code>
          </div>
          <div className="pl-16 text-[#57534E]">
            ├── aesthetic-kitchen-counter-organization.txt
          </div>
          <div className="pl-16 text-[#57534E]">
            ├── minimalist-home-office-desk-setup.txt
          </div>
          <div className="pl-16 text-[#57534E]">
            └── boutique-bathroom-spa-upgrades.txt
          </div>
        </div>
      </section>

      {/* Step 2: Pinterest to Retunda to Amazon Funnel */}
      <section className="border-t border-[#E7E5E0] pt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#F3F1EC] border border-[#E7E5E0] p-6 space-y-3">
          <div className="font-mono text-xs text-[#B45309] uppercase tracking-wider flex items-center gap-1.5">
            <Share2 className="w-4 h-4" />
            1. Pinterest Profile &amp; Pins
          </div>
          <h3 className="font-serif-display text-xl font-semibold text-[#1C1917]">
            Attach Your Page URL
          </h3>
          <p className="text-xs text-[#57534E] leading-relaxed">
            Paste your main domain (e.g. <code className="font-mono">https://retunda.com</code>) into your Pinterest Business Profile settings. For individual Pins, click <strong>&ldquo;Pin Kit &amp; Link&rdquo;</strong> on any Retunda page to copy its exact <code className="font-mono">?page=slug</code> URL and download a 2:3 Pin graphic.
          </p>
        </div>

        <div className="bg-[#F3F1EC] border border-[#E7E5E0] p-6 space-y-3">
          <div className="font-mono text-xs text-[#B45309] uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-4 h-4" />
            2. Retunda Bridge Page
          </div>
          <h3 className="font-serif-display text-xl font-semibold text-[#1C1917]">
            Compliant Pre-Sell Page
          </h3>
          <p className="text-xs text-[#57534E] leading-relaxed">
            Sending Pinterest visitors to your curated <strong>Retunda</strong> page warms up shoppers with editorial styling notes, product comparisons, and direct Amazon links.
          </p>
        </div>

        <div className="bg-[#F3F1EC] border border-[#E7E5E0] p-6 space-y-3">
          <div className="font-mono text-xs text-[#B45309] uppercase tracking-wider flex items-center gap-1.5">
            <ExternalLink className="w-4 h-4" />
            3. Amazon Associates Checkout
          </div>
          <h3 className="font-serif-display text-xl font-semibold text-[#1C1917]">
            24-Hour Cookie Commission
          </h3>
          <p className="text-xs text-[#57534E] leading-relaxed">
            Every <strong>&ldquo;Shop on Amazon&rdquo;</strong> button automatically appends <code className="font-mono">?tag={amazonTag}</code>. Once a visitor clicks through to Amazon, you earn commission on their entire cart for 24 hours.
          </p>
        </div>
      </section>

      {/* Step 3: Free Static Hosting Options */}
      <section className="border-t border-[#E7E5E0] pt-10 space-y-6">
        <div>
          <div className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-[#B45309]">
            <Globe className="w-4 h-4" />
            Step 03 // Zero-Cost Static Hosting
          </div>
          <h2 className="font-serif-display text-2xl font-semibold text-[#1C1917] mt-1">
            How to Host Retunda for $0/month
          </h2>
          <p className="text-sm text-[#57534E] mt-1">
            Because Retunda is a pure React frontend with flat text files, it compiles into static HTML/CSS/JS (<code className="font-mono text-xs">npm run build</code> → <code className="font-mono text-xs">dist/</code>) and runs for free on any static host:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#FAF9F6] border border-[#E7E5E0] p-6 space-y-2">
            <div className="font-mono text-xs uppercase text-[#B45309] font-semibold">
              Option A: Netlify / Vercel / Cloudflare Pages (Recommended)
            </div>
            <h3 className="font-serif-display text-lg font-semibold text-[#1C1917]">
              Push to GitHub &amp; Auto-Deploy on Every New .txt File
            </h3>
            <ol className="text-xs text-[#57534E] space-y-1.5 list-decimal list-inside leading-relaxed">
              <li>Export this project to a free GitHub repository.</li>
              <li>Connect the repository to <strong>Vercel</strong>, <strong>Netlify</strong>, or <strong>Cloudflare Pages</strong> (Build command: <code className="font-mono">npm run build</code>, Output folder: <code className="font-mono">dist</code>).</li>
              <li>Whenever you want to publish a new page, generate the <code className="font-mono">.txt</code> file in the <strong>Add Page Studio</strong> and upload it to <code className="font-mono">src/content/pages/</code> on GitHub—your live site updates automatically in 20 seconds!</li>
            </ol>
          </div>

          <div className="bg-[#FAF9F6] border border-[#E7E5E0] p-6 space-y-2">
            <div className="font-mono text-xs uppercase text-[#B45309] font-semibold">
              Option B: 1-Click Deploy Inside AI Studio
            </div>
            <h3 className="font-serif-display text-lg font-semibold text-[#1C1917]">
              Instant Public Share Link
            </h3>
            <ol className="text-xs text-[#57534E] space-y-1.5 list-decimal list-inside leading-relaxed">
              <li>Add or edit your <code className="font-mono">.txt</code> files inside <code className="font-mono">src/content/pages/</code> right here in the workspace.</li>
              <li>Click the <strong>Deploy</strong> button in the top-right corner of AI Studio.</li>
              <li>Copy your public URL and paste it directly into your Pinterest profile and Amazon Associates Website List.</li>
            </ol>
          </div>
        </div>
      </section>
    </div>
  );
};
