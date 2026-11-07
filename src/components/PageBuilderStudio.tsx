import React, { useRef, useState } from 'react';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  CloudUpload,
  Copy,
  Download,
  ExternalLink,
  FileCode2,
  FileText,
  FolderGit2,
  KeyRound,
  Settings,
  ShieldCheck,
  Sparkles,
  Upload,
} from 'lucide-react';
import {
  formatAmazonAffiliateUrl,
  parsePageTxt,
  RetundaPage,
  serializePageToTxt,
} from '../utils/flatFileEngine';
import { encryptCreatorVault } from '../utils/cryptoAuth';
import { generateAiInstructionMd } from '../utils/instructionMdGenerator';
import {
  GitHubRepoConfig,
  normalizeRepoPath,
  savePageToGitHub,
} from '../utils/githubCms';

interface PageBuilderStudioProps {
  amazonTag: string;
  githubConfig: GitHubRepoConfig;
  onUpdateGithubConfig: (next: GitHubRepoConfig) => void;
  onSavePagePreview: (page: RetundaPage) => void;
  onOpenPage: (slug: string) => void;
}

const DIRECTORY_PRESETS = [
  { label: 'src/content/pages (Default Root Pages)', path: 'src/content/pages' },
  {
    label: 'src/content/pages/living-room',
    path: 'src/content/pages/living-room',
  },
  {
    label: 'src/content/pages/kitchen',
    path: 'src/content/pages/kitchen',
  },
  {
    label: 'src/content/pages/workspace',
    path: 'src/content/pages/workspace',
  },
  {
    label: 'src/content/pages/bath-spa',
    path: 'src/content/pages/bath-spa',
  },
  {
    label: 'src/content/pages/bedroom',
    path: 'src/content/pages/bedroom',
  },
];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 65);
}

export const PageBuilderStudio: React.FC<PageBuilderStudioProps> = ({
  amazonTag,
  githubConfig,
  onUpdateGithubConfig,
  onSavePagePreview,
  onOpenPage,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Uploaded .txt Page State
  const [uploadedPage, setUploadedPage] = useState<RetundaPage | null>(null);
  const [fileSlugName, setFileSlugName] = useState<string>('');
  const [targetDirectory, setTargetDirectory] = useState<string>(
    githubConfig.baseFolder || 'src/content/pages'
  );
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // UI & Copy states
  const [copiedInstruction, setCopiedInstruction] = useState<boolean>(false);
  const [copiedDestUrl, setCopiedDestUrl] = useState<boolean>(false);
  const [showGithubSettings, setShowGithubSettings] = useState<boolean>(
    !githubConfig.owner || !githubConfig.repo
  );

  // Publishing state
  const [isPublishingGithub, setIsPublishingGithub] = useState<boolean>(false);
  const [publishStatus, setPublishStatus] = useState<{
    ok: boolean;
    message: string;
    pageQuerySlug?: string;
    commitUrl?: string;
  } | null>(null);

  // Security Vault Generator state
  const [newVaultPassword, setNewVaultPassword] = useState<string>('');
  const [vaultGithubPat, setVaultGithubPat] = useState<string>(
    githubConfig.token || ''
  );
  const [generatedVaultToken, setGeneratedVaultToken] = useState<string | null>(
    null
  );
  const [copiedVault, setCopiedVault] = useState<boolean>(false);

  // Step 1: Download or Copy instruction.md
  const handleDownloadInstructionMd = () => {
    const mdContent = generateAiInstructionMd(amazonTag, 'Retunda');
    const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'instruction.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyInstructionMd = () => {
    const mdContent = generateAiInstructionMd(amazonTag, 'Retunda');
    navigator.clipboard.writeText(mdContent);
    setCopiedInstruction(true);
    setTimeout(() => setCopiedInstruction(false), 2000);
  };

  // Step 2: Process Uploaded .txt File
  const processTxtFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const rawContent = String(reader.result || '');
      if (!rawContent.trim()) return;

      const parsed = parsePageTxt(rawContent, file.name);
      const cleanFileSlug =
        slugify(
          parsed.slug.split('/').pop() || file.name.replace(/\.txt$/i, '')
        ) || 'curated-page';

      // Ensure all Amazon product links have the active affiliate tag attached
      const normalizedProducts = parsed.products.map((p, idx) => ({
        ...p,
        id: `${cleanFileSlug}-${idx + 1}`,
        amazonUrl: formatAmazonAffiliateUrl(p.amazonUrl, amazonTag),
      }));

      const normalizedRawText = serializePageToTxt({
        ...parsed,
        slug: cleanFileSlug,
        products: normalizedProducts,
      });

      setFileSlugName(cleanFileSlug);
      setUploadedPage({
        ...parsed,
        slug: cleanFileSlug,
        fileName: `${cleanFileSlug}.txt`,
        products: normalizedProducts,
        rawText: normalizedRawText,
      });
      setPublishStatus(null);
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processTxtFile(file);
    }
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processTxtFile(file);
    }
  };

  // Compute full destination path and ?page=<slug> URL
  const cleanBaseFolder = (githubConfig.baseFolder || 'src/content/pages')
    .trim()
    .replace(/^\/+|\/+$/g, '');
  const cleanTargetDir = (targetDirectory || cleanBaseFolder)
    .trim()
    .replace(/^\/+|\/+$/g, '');

  const relativeSubfolder = cleanTargetDir.startsWith(cleanBaseFolder + '/')
    ? cleanTargetDir.slice(cleanBaseFolder.length + 1)
    : cleanTargetDir === cleanBaseFolder
    ? ''
    : cleanTargetDir;

  const activeSlug = slugify(fileSlugName || uploadedPage?.slug || 'new-page');
  const fullPageQuerySlug = relativeSubfolder
    ? `${relativeSubfolder}/${activeSlug}`
    : activeSlug;

  const fullDestinationFilePath = normalizeRepoPath(
    cleanTargetDir,
    `${activeSlug}.txt`
  );

  const shareablePinterestUrl = `${window.location.origin}${window.location.pathname}?page=${fullPageQuerySlug}`;

  // Step 3: Publish to GitHub or Preview
  const handlePublishToGitHub = async () => {
    if (!uploadedPage) return;

    setIsPublishingGithub(true);
    setPublishStatus(null);

    const finalTxt = serializePageToTxt({
      ...uploadedPage,
      slug: activeSlug,
    });

    const res = await savePageToGitHub(
      githubConfig,
      cleanTargetDir,
      `${activeSlug}.txt`,
      finalTxt
    );

    setIsPublishingGithub(false);

    if (res.ok) {
      const savedPage: RetundaPage = {
        ...uploadedPage,
        slug: res.pageQuerySlug || fullPageQuerySlug,
        fileName: `${activeSlug}.txt`,
        directoryPath: cleanTargetDir,
        rawText: finalTxt,
        isCustomLocal: true,
      };
      onSavePagePreview(savedPage);
      setPublishStatus({
        ok: true,
        message: `Published to GitHub at ${res.path}`,
        pageQuerySlug: res.pageQuerySlug || fullPageQuerySlug,
        commitUrl: res.commitUrl,
      });
    } else {
      setPublishStatus({
        ok: false,
        message: res.error || 'Failed to publish to GitHub.',
      });
      setShowGithubSettings(true);
    }
  };

  const handlePreviewOnly = () => {
    if (!uploadedPage) return;
    const finalTxt = serializePageToTxt({
      ...uploadedPage,
      slug: activeSlug,
    });
    const savedPage: RetundaPage = {
      ...uploadedPage,
      slug: fullPageQuerySlug,
      fileName: `${activeSlug}.txt`,
      directoryPath: cleanTargetDir,
      rawText: finalTxt,
      isCustomLocal: true,
    };
    onSavePagePreview(savedPage);
    setPublishStatus({
      ok: true,
      message: `Page preview ready at ?page=${fullPageQuerySlug}`,
      pageQuerySlug: fullPageQuerySlug,
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      {/* Header */}
      <div className="border-b border-[#E7E5E0] pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-[#B45309]">
            Retunda Step-by-Step Publisher
          </p>
          <h1 className="font-serif-display text-3xl sm:text-4xl font-semibold text-[#1C1917] mt-1">
            Publish a New Page in 3 Steps
          </h1>
        </div>

        <button
          type="button"
          onClick={() => setShowGithubSettings((prev) => !prev)}
          className="inline-flex items-center gap-1.5 border border-[#D6D3CD] bg-[#F3F1EC] px-3.5 py-2 text-xs font-mono uppercase tracking-wider text-[#1C1917] hover:border-[#1C1917] cursor-pointer"
        >
          <Settings className="w-3.5 h-3.5 text-[#B45309]" />
          {showGithubSettings ? 'Hide GitHub Setup' : 'GitHub & Vault Setup'}
        </button>
      </div>

      {/* Collapsible GitHub Repository & Encrypted Vault Settings */}
      {showGithubSettings && (
        <div className="bg-[#F3F1EC] border border-[#E7E5E0] p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* GitHub Repo Coordinates */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-[#B45309] font-semibold">
                <FolderGit2 className="w-4 h-4" />
                GitHub Repository Details
              </div>
              <p className="text-xs text-[#57534E] leading-relaxed">
                Owner, Repo, and Branch are public coordinates. Your Fine-Grained Token stays in your browser session (or encrypted inside <code className="font-mono">ADMIN_VAULT</code>).
              </p>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-mono text-[10px] uppercase text-[#57534E] mb-1">
                    GitHub Owner
                  </label>
                  <input
                    type="text"
                    value={githubConfig.owner}
                    onChange={(e) =>
                      onUpdateGithubConfig({
                        ...githubConfig,
                        owner: e.target.value.trim(),
                      })
                    }
                    placeholder="hharsha107"
                    className="w-full bg-[#FAF9F6] border border-[#E7E5E0] px-2.5 py-1.5 font-mono text-xs text-[#1C1917]"
                  />
                </div>
                <div>
                  <label className="block font-mono text-[10px] uppercase text-[#57534E] mb-1">
                    Repository Name
                  </label>
                  <input
                    type="text"
                    value={githubConfig.repo}
                    onChange={(e) =>
                      onUpdateGithubConfig({
                        ...githubConfig,
                        repo: e.target.value.trim(),
                      })
                    }
                    placeholder="retunda"
                    className="w-full bg-[#FAF9F6] border border-[#E7E5E0] px-2.5 py-1.5 font-mono text-xs text-[#1C1917]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-mono text-[10px] uppercase text-[#57534E] mb-1">
                    Branch
                  </label>
                  <input
                    type="text"
                    value={githubConfig.branch}
                    onChange={(e) =>
                      onUpdateGithubConfig({
                        ...githubConfig,
                        branch: e.target.value.trim() || 'main',
                      })
                    }
                    className="w-full bg-[#FAF9F6] border border-[#E7E5E0] px-2.5 py-1.5 font-mono text-xs text-[#1C1917]"
                  />
                </div>
                <div>
                  <label className="block font-mono text-[10px] uppercase text-[#57534E] mb-1">
                    Base Pages Folder
                  </label>
                  <input
                    type="text"
                    value={githubConfig.baseFolder}
                    onChange={(e) =>
                      onUpdateGithubConfig({
                        ...githubConfig,
                        baseFolder:
                          e.target.value.trim() || 'src/content/pages',
                      })
                    }
                    className="w-full bg-[#FAF9F6] border border-[#E7E5E0] px-2.5 py-1.5 font-mono text-xs text-[#1C1917]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-mono text-[10px] uppercase text-[#B45309] font-semibold mb-1">
                  Fine-Grained GitHub Personal Access Token (Contents: Read &amp; Write)
                </label>
                <input
                  type="password"
                  value={githubConfig.token || ''}
                  onChange={(e) => {
                    onUpdateGithubConfig({
                      ...githubConfig,
                      token: e.target.value,
                    });
                    setVaultGithubPat(e.target.value);
                  }}
                  placeholder="github_pat_..."
                  className="w-full bg-[#FAF9F6] border border-[#E7E5E0] px-2.5 py-1.5 font-mono text-xs text-[#1C1917]"
                />
              </div>
            </div>

            {/* Optional AES-256-GCM Vault Encryptor */}
            <div className="space-y-3 border-t md:border-t-0 md:border-l border-[#E7E5E0] pt-4 md:pt-0 md:pl-6">
              <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-[#B45309] font-semibold">
                <ShieldCheck className="w-4 h-4" />
                Optional: Encrypt Password &amp; Token for site-config.txt
              </div>
              <p className="text-xs text-[#57534E] leading-relaxed">
                Generate an AES-256-GCM encrypted <code className="font-mono">ADMIN_VAULT</code> line so your token unlocks automatically when you log in—without ever storing plaintext secrets in GitHub.
              </p>

              <div>
                <label className="block font-mono text-[10px] uppercase text-[#57534E] mb-1">
                  Your Creator Login Password
                </label>
                <div className="relative">
                  <KeyRound className="w-3.5 h-3.5 text-[#57534E] absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={newVaultPassword}
                    onChange={(e) => setNewVaultPassword(e.target.value)}
                    placeholder="Enter login password..."
                    className="w-full bg-[#FAF9F6] border border-[#E7E5E0] pl-8 pr-2.5 py-1.5 font-mono text-xs text-[#1C1917]"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={async () => {
                  if (!newVaultPassword.trim()) return;
                  const res = await encryptCreatorVault(
                    newVaultPassword.trim(),
                    {
                      githubPat: vaultGithubPat.trim() || undefined,
                    }
                  );
                  setGeneratedVaultToken(res.token);
                }}
                className="w-full bg-[#1C1917] text-[#FAF9F6] px-4 py-2 text-xs font-mono uppercase tracking-wider hover:bg-[#B45309] transition-colors cursor-pointer"
              >
                Generate Encrypted site-config.txt Lines
              </button>

              {generatedVaultToken && (
                <div className="bg-[#FAF9F6] border border-[#E7E5E0] p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase text-[#B45309] font-semibold">
                      Paste in src/content/site-config.txt:
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const snippet = [
                          `GITHUB_OWNER: ${githubConfig.owner}`,
                          `GITHUB_REPO: ${githubConfig.repo}`,
                          `GITHUB_BRANCH: ${githubConfig.branch || 'main'}`,
                          `GITHUB_FOLDER: ${githubConfig.baseFolder || 'src/content/pages'}`,
                          `ADMIN_VAULT: ${generatedVaultToken}`,
                        ].join('\n');
                        navigator.clipboard.writeText(snippet);
                        setCopiedVault(true);
                        setTimeout(() => setCopiedVault(false), 2000);
                      }}
                      className="font-mono text-[10px] text-[#1C1917] underline cursor-pointer"
                    >
                      {copiedVault ? 'Copied!' : 'Copy Block'}
                    </button>
                  </div>
                  <pre className="font-mono text-[10px] text-[#1C1917] break-all whitespace-pre-wrap max-h-24 overflow-y-auto">
                    {[
                      `GITHUB_OWNER: ${githubConfig.owner}`,
                      `GITHUB_REPO: ${githubConfig.repo}`,
                      `GITHUB_BRANCH: ${githubConfig.branch || 'main'}`,
                      `GITHUB_FOLDER: ${githubConfig.baseFolder || 'src/content/pages'}`,
                      `ADMIN_VAULT: ${generatedVaultToken}`,
                    ].join('\n')}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          STEP 01: DOWNLOAD INSTRUCTION.MD FOR AI
         ===================================================================== */}
      <section className="bg-[#F3F1EC] border border-[#E7E5E0] p-6 sm:p-8 space-y-4">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-[#B45309] font-semibold">
            <span className="bg-[#1C1917] text-[#FAF9F6] px-2 py-0.5">
              STEP 01
            </span>
            <span>Download AI Page Specification (instruction.md)</span>
          </div>
          <FileCode2 className="w-5 h-5 text-[#57534E]" />
        </div>

        <h2 className="font-serif-display text-2xl font-semibold text-[#1C1917]">
          Give <code className="font-mono text-lg">instruction.md</code> to Your AI
        </h2>

        <p className="text-sm text-[#57534E] leading-relaxed max-w-2xl">
          Download <code className="font-mono text-xs bg-[#FAF9F6] px-1.5 py-0.5 border border-[#E7E5E0]">instruction.md</code> and attach it to ChatGPT, Claude, or Gemini along with your topic or product list. It instructs the AI on the exact <code className="font-mono text-xs">.txt</code> structure, your <code className="font-mono text-xs">?tag={amazonTag}</code> affiliate tag rule, and Retunda&apos;s Warm Editorial styling.
        </p>

        <div className="pt-2 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleDownloadInstructionMd}
            className="inline-flex items-center gap-2 bg-[#1C1917] text-[#FAF9F6] px-5 py-3 text-xs font-mono uppercase tracking-wider hover:bg-[#B45309] transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Download instruction.md
          </button>

          <button
            type="button"
            onClick={handleCopyInstructionMd}
            className="inline-flex items-center gap-2 border border-[#1C1917] bg-[#FAF9F6] text-[#1C1917] px-4 py-3 text-xs font-mono uppercase tracking-wider hover:bg-[#1C1917] hover:text-[#FAF9F6] transition-colors cursor-pointer"
          >
            {copiedInstruction ? (
              <>
                <Check className="w-4 h-4 text-[#15803D]" />
                Copied instruction.md to Clipboard
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy Instructions Text
              </>
            )}
          </button>
        </div>
      </section>

      {/* =====================================================================
          STEP 02: UPLOAD AI-GENERATED .TXT FILE
         ===================================================================== */}
      <section className="bg-[#F3F1EC] border border-[#E7E5E0] p-6 sm:p-8 space-y-5">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-[#B45309] font-semibold">
            <span className="bg-[#1C1917] text-[#FAF9F6] px-2 py-0.5">
              STEP 02
            </span>
            <span>Upload Your Generated .txt Page File</span>
          </div>
          <Upload className="w-5 h-5 text-[#57534E]" />
        </div>

        <h2 className="font-serif-display text-2xl font-semibold text-[#1C1917]">
          Upload the <code className="font-mono text-lg">.txt</code> File From Your AI
        </h2>

        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md,text/plain"
          onChange={handleFileChange}
          className="hidden"
        />

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed p-8 text-center transition-colors cursor-pointer ${
            isDragging
              ? 'border-[#B45309] bg-[#B45309]/5'
              : uploadedPage
              ? 'border-[#15803D] bg-[#FAF9F6]'
              : 'border-[#D6D3CD] bg-[#FAF9F6] hover:border-[#1C1917]'
          }`}
        >
          {!uploadedPage ? (
            <div className="space-y-2">
              <Upload className="w-7 h-7 text-[#B45309] mx-auto" />
              <p className="font-serif-display text-lg font-semibold text-[#1C1917]">
                Click to select your <code className="font-mono text-sm">.txt</code> file or drag and drop it here
              </p>
              <p className="font-mono text-xs text-[#57534E]">
                Automatically parses TITLE, SLUG, CATEGORY, and all --- PRODUCT --- blocks
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <CheckCircle2 className="w-7 h-7 text-[#15803D] mx-auto" />
              <p className="font-serif-display text-xl font-semibold text-[#1C1917]">
                Loaded: {uploadedPage.title}
              </p>
              <p className="font-mono text-xs text-[#15803D]">
                {uploadedPage.products.length} Amazon Affiliate Products Validated • Click to replace with another .txt file
              </p>
            </div>
          )}
        </div>

        {/* Parsed File Summary Preview */}
        {uploadedPage && (
          <div className="bg-[#FAF9F6] border border-[#E7E5E0] p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E7E5E0] pb-2.5">
              <div className="flex items-center gap-2 font-mono text-xs text-[#1C1917]">
                <FileText className="w-4 h-4 text-[#B45309]" />
                <span>Parsed File Preview:</span>
                <strong>{activeSlug}.txt</strong>
              </div>
              <span className="font-mono text-xs text-[#57534E]">
                Category: {uploadedPage.category} • {uploadedPage.products.length} Items
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {uploadedPage.products.map((prod, idx) => (
                <div
                  key={prod.id || idx}
                  className="bg-[#F3F1EC] border border-[#E7E5E0] px-3 py-2 flex items-center justify-between gap-2 text-xs"
                >
                  <span className="truncate font-medium text-[#1C1917]">
                    0{idx + 1}. {prod.name}
                  </span>
                  <span className="font-mono text-[#B45309] shrink-0">
                    {prod.price}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* =====================================================================
          STEP 03: CHOOSE DIRECTORY PATH & PUBLISH TO GITHUB
         ===================================================================== */}
      <section
        className={`bg-[#F3F1EC] border border-[#E7E5E0] p-6 sm:p-8 space-y-5 transition-opacity ${
          uploadedPage ? 'opacity-100' : 'opacity-60'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-[#B45309] font-semibold">
            <span className="bg-[#1C1917] text-[#FAF9F6] px-2 py-0.5">
              STEP 03
            </span>
            <span>Select Directory Path &amp; Publish</span>
          </div>
          <FolderGit2 className="w-5 h-5 text-[#57534E]" />
        </div>

        <h2 className="font-serif-display text-2xl font-semibold text-[#1C1917]">
          Choose Where in the Directory the Page Goes
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
          <div className="sm:col-span-5">
            <label className="block font-mono text-xs uppercase tracking-wider text-[#57534E] mb-1.5">
              1. Preset Folder Selection
            </label>
            <select
              value={
                DIRECTORY_PRESETS.some((d) => d.path === targetDirectory)
                  ? targetDirectory
                  : '__custom__'
              }
              onChange={(e) => {
                if (e.target.value !== '__custom__') {
                  setTargetDirectory(e.target.value);
                }
              }}
              className="w-full bg-[#FAF9F6] border border-[#E7E5E0] px-3 py-2.5 font-mono text-xs text-[#1C1917] focus:outline-none focus:border-[#1C1917]"
            >
              {DIRECTORY_PRESETS.map((preset) => (
                <option key={preset.path} value={preset.path}>
                  {preset.label}
                </option>
              ))}
              <option value="__custom__">Custom Directory Path...</option>
            </select>
          </div>

          <div className="sm:col-span-4">
            <label className="block font-mono text-xs uppercase tracking-wider text-[#57534E] mb-1.5">
              2. Directory Path in Repo
            </label>
            <input
              type="text"
              value={targetDirectory}
              onChange={(e) => setTargetDirectory(e.target.value)}
              placeholder="src/content/pages/living-room"
              className="w-full bg-[#FAF9F6] border border-[#E7E5E0] px-3 py-2.5 font-mono text-xs text-[#1C1917] focus:outline-none focus:border-[#1C1917]"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="block font-mono text-xs uppercase tracking-wider text-[#57534E] mb-1.5">
              3. File Name (.txt)
            </label>
            <div className="flex items-center bg-[#FAF9F6] border border-[#E7E5E0] px-3 py-2.5">
              <input
                type="text"
                value={fileSlugName}
                onChange={(e) => setFileSlugName(slugify(e.target.value))}
                placeholder="page-slug"
                className="w-full bg-transparent font-mono text-xs text-[#1C1917] focus:outline-none"
              />
              <span className="font-mono text-xs text-[#57534E]">.txt</span>
            </div>
          </div>
        </div>

        {/* Exact Destination & Resulting Pinterest URL Preview */}
        <div className="bg-[#FAF9F6] border border-[#E7E5E0] p-4 space-y-2 font-mono text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[#57534E]">Repository File Path:</span>
            <span className="text-[#1C1917] font-semibold">
              {fullDestinationFilePath}
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E7E5E0] pt-2">
            <span className="text-[#57534E]">Pinterest Destination Link:</span>
            <span className="text-[#B45309] font-semibold break-all">
              {shareablePinterestUrl}
            </span>
          </div>
        </div>

        {/* Publish & Preview Buttons */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            disabled={!uploadedPage || isPublishingGithub}
            onClick={handlePublishToGitHub}
            className="inline-flex items-center gap-2 bg-[#B45309] text-[#FAF9F6] px-6 py-3.5 text-xs font-mono uppercase tracking-wider hover:bg-[#1C1917] transition-colors cursor-pointer disabled:opacity-40"
          >
            <CloudUpload className="w-4 h-4" />
            {isPublishingGithub
              ? 'Uploading to GitHub...'
              : `Publish to GitHub (${fullDestinationFilePath})`}
          </button>

          <button
            type="button"
            disabled={!uploadedPage}
            onClick={handlePreviewOnly}
            className="inline-flex items-center gap-2 bg-[#1C1917] text-[#FAF9F6] px-5 py-3.5 text-xs font-mono uppercase tracking-wider hover:bg-[#B45309] transition-colors cursor-pointer disabled:opacity-40"
          >
            <Sparkles className="w-4 h-4" />
            Preview Page in Browser
          </button>
        </div>

        {/* Status & Live Link Banner */}
        {publishStatus && (
          <div
            className={`p-4 border space-y-3 ${
              publishStatus.ok
                ? 'bg-[#15803D]/10 border-[#15803D]/30 text-[#15803D]'
                : 'bg-[#B91C1C]/10 border-[#B91C1C]/30 text-[#B91C1C]'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-xs font-semibold">
                {publishStatus.message}
              </span>
              {publishStatus.commitUrl && (
                <a
                  href={publishStatus.commitUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-xs underline"
                >
                  View GitHub Commit <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            {publishStatus.ok && publishStatus.pageQuerySlug && (
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(shareablePinterestUrl);
                    setCopiedDestUrl(true);
                    setTimeout(() => setCopiedDestUrl(false), 2000);
                  }}
                  className="inline-flex items-center gap-1.5 bg-[#FAF9F6] border border-[#15803D] text-[#1C1917] px-3.5 py-2 text-xs font-mono uppercase tracking-wider cursor-pointer"
                >
                  {copiedDestUrl ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#15803D]" /> Copied Pinterest URL!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copy Pinterest Link
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => onOpenPage(publishStatus.pageQuerySlug!)}
                  className="inline-flex items-center gap-1.5 bg-[#15803D] text-white px-4 py-2 text-xs font-mono uppercase tracking-wider cursor-pointer"
                >
                  <span>Open Live Page</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
};
