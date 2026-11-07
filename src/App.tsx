import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Check,
  Copy,
  Edit3,
  FilePlus2,
  FolderOpen,
  HelpCircle,
  Loader2,
  Lock,
  Share2,
  ShieldCheck,
  Sparkles,
  Tag,
} from 'lucide-react';
import {
  AffiliateProduct,
  formatAmazonAffiliateUrl,
  loadInitialFlatFileBundle,
  RetundaPage,
} from './utils/flatFileEngine';
import {
  fetchPageFromGitHub,
  GitHubRepoConfig,
} from './utils/githubCms';
import { PinStudioModal } from './components/PinStudioModal';
import { PageBuilderStudio } from './components/PageBuilderStudio';
import { FlatFileGuideView } from './components/FlatFileGuideView';
import { AdminPasscodeModal } from './components/AdminPasscodeModal';

type ActiveView = 'welcome' | 'page-detail' | 'studio' | 'guide';

const FALLBACK_IMAGE_DATA_URI =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'><rect width='800' height='600' fill='%23F3F1EC'/><rect x='60' y='60' width='680' height='480' fill='none' stroke='%23D6D3CD' stroke-width='2'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Georgia, serif' font-size='28' fill='%2357534E'>RETUNDA CURATED FIND</text></svg>";

const LOCAL_CUSTOM_PAGES_KEY = 'retunda_custom_pages_v1';
const LOCAL_QUICK_LINKS_KEY = 'retunda_quick_links_v1';
const LOCAL_AMAZON_TAG_KEY = 'retunda_amazon_tag_v1';
const LOCAL_GITHUB_CONFIG_KEY = 'retunda_github_config_v1';
const SESSION_ADMIN_UNLOCKED_KEY = 'retunda_admin_unlocked_v1';
const SESSION_GITHUB_PAT_KEY = 'retunda_session_gh_pat_v1';

export function App() {
  const initialBundle = useMemo(() => loadInitialFlatFileBundle(), []);

  // Admin Creator Gate state (locked by default for all public visitors)
  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(SESSION_ADMIN_UNLOCKED_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [showPasscodeModal, setShowPasscodeModal] = useState<boolean>(false);

  const [amazonTag, setAmazonTag] = useState<string>(() => {
    return (
      localStorage.getItem(LOCAL_AMAZON_TAG_KEY) ||
      initialBundle.config.amazonTag
    );
  });

  const [githubConfig, setGithubConfig] = useState<GitHubRepoConfig>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_GITHUB_CONFIG_KEY);
      const sessionPat = sessionStorage.getItem(SESSION_GITHUB_PAT_KEY) || '';
      if (saved) {
        const parsed = JSON.parse(saved) as GitHubRepoConfig;
        return {
          owner: parsed.owner || initialBundle.config.githubOwner,
          repo: parsed.repo || initialBundle.config.githubRepo,
          branch: parsed.branch || initialBundle.config.githubBranch || 'main',
          baseFolder:
            parsed.baseFolder ||
            initialBundle.config.githubFolder ||
            'src/content/pages',
          token: sessionPat || parsed.token || '',
        };
      }
    } catch {
      // ignore
    }
    return {
      owner: initialBundle.config.githubOwner,
      repo: initialBundle.config.githubRepo,
      branch: initialBundle.config.githubBranch || 'main',
      baseFolder: initialBundle.config.githubFolder || 'src/content/pages',
      token: sessionStorage.getItem(SESSION_GITHUB_PAT_KEY) || '',
    };
  });

  const handleUpdateGithubConfig = (next: GitHubRepoConfig) => {
    setGithubConfig(next);
    if (next.token) {
      sessionStorage.setItem(SESSION_GITHUB_PAT_KEY, next.token);
    }
    localStorage.setItem(
      LOCAL_GITHUB_CONFIG_KEY,
      JSON.stringify({
        owner: next.owner,
        repo: next.repo,
        branch: next.branch,
        baseFolder: next.baseFolder,
      })
    );
  };

  const [customPages, setCustomPages] = useState<RetundaPage[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_CUSTOM_PAGES_KEY);
      return saved ? (JSON.parse(saved) as RetundaPage[]) : [];
    } catch {
      return [];
    }
  });

  const [quickLinks, setQuickLinks] = useState<AffiliateProduct[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_QUICK_LINKS_KEY);
      return saved
        ? (JSON.parse(saved) as AffiliateProduct[])
        : initialBundle.quickLinks;
    } catch {
      return initialBundle.quickLinks;
    }
  });

  const allLocalPages = useMemo(() => {
    const map = new Map<string, RetundaPage>();
    for (const filePage of initialBundle.pages) {
      map.set(filePage.slug, filePage);
    }
    for (const custom of customPages) {
      map.set(custom.slug, custom);
    }
    return Array.from(map.values()).sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [initialBundle.pages, customPages]);

  const [activeView, setActiveView] = useState<ActiveView>('welcome');
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [remoteLoadedPage, setRemoteLoadedPage] = useState<RetundaPage | null>(
    null
  );
  const [isLoadingPage, setIsLoadingPage] = useState<boolean>(false);

  const [pinModalPage, setPinModalPage] = useState<RetundaPage | null>(null);
  const [studioEditPage, setStudioEditPage] = useState<RetundaPage | null>(null);
  const [copiedUrlSlug, setCopiedUrlSlug] = useState<string | null>(null);
  const [editingTag, setEditingTag] = useState<boolean>(false);

  // Sync URL query params (?page=slug and secret ?admin=<ADMIN_KEY>)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pageSlug = params.get('page');
    const adminParam = params.get('admin');

    if (pageSlug) {
      setSelectedSlug(pageSlug);
      setActiveView('page-detail');
    } else {
      setSelectedSlug(null);
      setActiveView('welcome');
    }

    if (
      adminParam &&
      adminParam.toLowerCase() === initialBundle.config.adminKey.toLowerCase()
    ) {
      if (!isAdminUnlocked) {
        setShowPasscodeModal(true);
      } else if (!pageSlug) {
        setActiveView('studio');
      }
    }

    const handlePopState = () => {
      const nextParams = new URLSearchParams(window.location.search);
      const nextSlug = nextParams.get('page');
      if (nextSlug) {
        setSelectedSlug(nextSlug);
        setActiveView('page-detail');
      } else {
        setSelectedSlug(null);
        setActiveView('welcome');
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Secret keyboard shortcut: Shift + Alt + A
      if (e.shiftKey && e.altKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        if (isAdminUnlocked) {
          setActiveView('studio');
        } else {
          setShowPasscodeModal(true);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [initialBundle.config.adminKey, isAdminUnlocked]);

  // Whenever selectedSlug changes, fetch live from GitHub API if configured!
  useEffect(() => {
    let isCancelled = false;
    if (!selectedSlug) {
      setRemoteLoadedPage(null);
      setIsLoadingPage(false);
      return;
    }

    async function loadPageOnDemand(slugToFetch: string) {
      if (githubConfig.owner && githubConfig.repo) {
        setIsLoadingPage(true);
        const fromGitHub = await fetchPageFromGitHub(githubConfig, slugToFetch);
        if (!isCancelled) {
          setRemoteLoadedPage(fromGitHub);
          setIsLoadingPage(false);
        }
      } else {
        setRemoteLoadedPage(null);
        setIsLoadingPage(false);
      }
    }

    loadPageOnDemand(selectedSlug);
    return () => {
      isCancelled = true;
    };
  }, [selectedSlug, githubConfig]);

  const handleUnlockSuccess = (decryptedGithubPat?: string) => {
    setIsAdminUnlocked(true);
    sessionStorage.setItem(SESSION_ADMIN_UNLOCKED_KEY, 'true');
    if (decryptedGithubPat) {
      sessionStorage.setItem(SESSION_GITHUB_PAT_KEY, decryptedGithubPat);
      setGithubConfig((prev) => ({ ...prev, token: decryptedGithubPat }));
    }
    setShowPasscodeModal(false);
    if (!selectedSlug) {
      setActiveView('studio');
    }

    const url = new URL(window.location.href);
    url.searchParams.delete('admin');
    window.history.replaceState({}, '', url.toString());
  };

  const handleLockAdmin = () => {
    setIsAdminUnlocked(false);
    sessionStorage.removeItem(SESSION_ADMIN_UNLOCKED_KEY);
    sessionStorage.removeItem(SESSION_GITHUB_PAT_KEY);
    if (activeView === 'studio' || activeView === 'guide') {
      setActiveView(selectedSlug ? 'page-detail' : 'welcome');
    }
    const url = new URL(window.location.href);
    url.searchParams.delete('admin');
    window.history.replaceState({}, '', url.toString());
  };

  const openPageBySlug = (slug: string) => {
    setSelectedSlug(slug);
    setActiveView('page-detail');
    const url = new URL(window.location.href);
    url.searchParams.set('page', slug);
    url.searchParams.delete('admin');
    window.history.pushState({}, '', url.toString());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateWelcome = () => {
    setSelectedSlug(null);
    setActiveView('welcome');
    const url = new URL(window.location.href);
    url.searchParams.delete('page');
    url.searchParams.delete('admin');
    window.history.pushState({}, '', url.toString());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveCustomPage = (newPage: RetundaPage) => {
    setCustomPages((prev) => {
      const filtered = prev.filter((p) => p.slug !== newPage.slug);
      const updated = [newPage, ...filtered];
      localStorage.setItem(LOCAL_CUSTOM_PAGES_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const handleDeleteCustomPage = (slug: string) => {
    setCustomPages((prev) => {
      const updated = prev.filter((p) => p.slug !== slug);
      localStorage.setItem(LOCAL_CUSTOM_PAGES_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const handleSaveQuickLinks = (links: AffiliateProduct[]) => {
    setQuickLinks(links);
    localStorage.setItem(LOCAL_QUICK_LINKS_KEY, JSON.stringify(links));
  };

  const handleUpdateAmazonTag = (newTag: string) => {
    const clean = newTag.trim() || 'retunda-20';
    setAmazonTag(clean);
    localStorage.setItem(LOCAL_AMAZON_TAG_KEY, clean);
  };

  const copyPagePinterestUrl = (slug?: string) => {
    const base = `${window.location.origin}${window.location.pathname}`;
    const fullUrl = slug ? `${base}?page=${encodeURIComponent(slug)}` : base;
    navigator.clipboard.writeText(fullUrl);
    setCopiedUrlSlug(slug || '__home__');
    setTimeout(() => setCopiedUrlSlug(null), 2000);
  };

  // Resolve current page: prefer live GitHub API page, then local custom preview, then bundled .txt file
  const currentPage = useMemo(() => {
    if (!selectedSlug) return null;
    if (remoteLoadedPage && remoteLoadedPage.slug === selectedSlug) {
      return remoteLoadedPage;
    }
    const cleanTarget = selectedSlug.replace(/^\/+|\/+$/g, '').toLowerCase();
    return (
      allLocalPages.find(
        (p) =>
          p.slug.toLowerCase() === cleanTarget ||
          p.slug.split('/').pop()?.toLowerCase() === cleanTarget
      ) || null
    );
  }, [selectedSlug, remoteLoadedPage, allLocalPages]);

  const effectiveAmazonTag = isAdminUnlocked
    ? amazonTag
    : initialBundle.config.amazonTag;

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6] text-[#1C1917]">
      {/* SECRET CREATOR TOOLBAR (Visible ONLY when unlocked via ?admin=retunda + AES-256-GCM Password) */}
      {isAdminUnlocked && (
        <div className="bg-[#1C1917] text-[#FAF9F6] border-b border-[#44403C] text-xs sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#B45309]" />
              <span className="font-mono uppercase tracking-wider text-[11px] font-semibold text-[#FAF9F6]">
                Retunda Editor Mode
              </span>
              <button
                onClick={navigateWelcome}
                className="font-mono text-[11px] text-[#A8A29E] hover:text-white underline ml-2 cursor-pointer"
              >
                View Welcome Page
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {/* Amazon Tag Tester */}
              <div className="flex items-center gap-1.5 font-mono text-[11px] bg-[#292524] px-2.5 py-1 border border-[#44403C]">
                <Tag className="w-3 h-3 text-[#B45309]" />
                <span className="text-[#A8A29E]">Tag:</span>
                {editingTag ? (
                  <input
                    type="text"
                    value={amazonTag}
                    onChange={(e) => handleUpdateAmazonTag(e.target.value)}
                    onBlur={() => setEditingTag(false)}
                    onKeyDown={(e) => e.key === 'Enter' && setEditingTag(false)}
                    autoFocus
                    className="bg-[#1C1917] border border-[#B45309] px-1.5 py-0.5 text-[#FAF9F6] w-28 focus:outline-none"
                  />
                ) : (
                  <button
                    onClick={() => setEditingTag(true)}
                    className="text-[#FAF9F6] font-semibold underline decoration-dotted hover:text-[#B45309] cursor-pointer"
                  >
                    {amazonTag}
                  </button>
                )}
              </div>

              <button
                onClick={() => {
                  setStudioEditPage(null);
                  setActiveView('studio');
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1 font-mono text-[11px] uppercase tracking-wider cursor-pointer ${
                  activeView === 'studio'
                    ? 'bg-[#B45309] text-white'
                    : 'bg-[#FAF9F6] text-[#1C1917] hover:bg-[#B45309] hover:text-white'
                }`}
              >
                <FilePlus2 className="w-3.5 h-3.5" />
                Editor &amp; Upload (.txt)
              </button>

              <button
                onClick={() => setActiveView('guide')}
                className={`inline-flex items-center gap-1 px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider border border-[#44403C] cursor-pointer ${
                  activeView === 'guide'
                    ? 'bg-[#B45309] text-white border-[#B45309]'
                    : 'bg-[#292524] text-[#E7E5E0] hover:text-white'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5" />
                Guide
              </button>

              <button
                onClick={handleLockAdmin}
                className="inline-flex items-center gap-1 px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider bg-[#7F1D1D] text-white hover:bg-[#991B1B] cursor-pointer"
                title="Lock Creator Mode and view as a public visitor"
              >
                <Lock className="w-3 h-3" />
                Lock Editor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col">
        {/* VIEW 1: CLUTTER-FREE MINIMALIST WELCOME HOME PAGE (/) */}
        {activeView === 'welcome' && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center min-h-[88vh]">
            <div className="max-w-lg mx-auto space-y-5">
              <h1 className="font-serif-display text-5xl sm:text-7xl font-semibold tracking-tight text-[#1C1917]">
                {initialBundle.config.siteName}
              </h1>
              <div className="w-10 h-[1px] bg-[#B45309] mx-auto" />
              <p className="text-sm sm:text-base text-[#57534E] font-normal tracking-wide leading-relaxed">
                {initialBundle.config.tagline}
              </p>

              {/* Only visible to unlocked Creator for quick page jumping */}
              {isAdminUnlocked && (
                <div className="pt-8 space-y-3">
                  <button
                    onClick={() => setActiveView('studio')}
                    className="inline-flex items-center gap-2 bg-[#1C1917] text-[#FAF9F6] px-5 py-2.5 text-xs font-mono uppercase tracking-wider hover:bg-[#B45309] transition-colors cursor-pointer"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    Open Editor Studio ({allLocalPages.length} Local Pages)
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 2: ON-DEMAND PINTEREST BRIDGE PAGE (/?page=<slug>) */}
        {activeView === 'page-detail' && (
          <div className="w-full">
            {/* Minimal Brand Header on Page Detail */}
            <header className="border-b border-[#E7E5E0] bg-[#FAF9F6]">
              <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                <span className="font-serif-display text-2xl sm:text-3xl font-semibold tracking-tight text-[#1C1917]">
                  {initialBundle.config.siteName}
                </span>

                {isAdminUnlocked && currentPage && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => copyPagePinterestUrl(currentPage.slug)}
                      className="inline-flex items-center gap-1.5 border border-[#E7E5E0] bg-[#F3F1EC] px-3 py-1.5 text-xs font-mono text-[#1C1917] hover:border-[#B45309] cursor-pointer"
                    >
                      {copiedUrlSlug === currentPage.slug ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-[#15803D]" /> Link Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" /> Copy Pinterest Link
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => setPinModalPage(currentPage)}
                      className="inline-flex items-center gap-1.5 bg-[#B45309] text-[#FAF9F6] px-3.5 py-1.5 text-xs font-mono uppercase tracking-wider hover:bg-[#1C1917] transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      2:3 Pin Graphic
                    </button>

                    <button
                      onClick={() => {
                        setStudioEditPage(currentPage);
                        setActiveView('studio');
                      }}
                      className="inline-flex items-center gap-1.5 border border-[#1C1917] px-3 py-1.5 text-xs font-mono uppercase tracking-wider text-[#1C1917] hover:bg-[#1C1917] hover:text-[#FAF9F6] transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Edit .txt
                    </button>
                  </div>
                )}
              </div>
            </header>

            {isLoadingPage && !currentPage ? (
              <div className="max-w-6xl mx-auto px-4 py-24 flex flex-col items-center justify-center gap-3 text-[#57534E]">
                <Loader2 className="w-6 h-6 animate-spin text-[#B45309]" />
                <span className="font-mono text-xs uppercase tracking-widest">
                  Loading curated collection...
                </span>
              </div>
            ) : currentPage ? (
              <article className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
                {/* Editorial Split Hero */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-10 border-b border-[#E7E5E0] items-center">
                  <div className="lg:col-span-7 space-y-4">
                    <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-widest text-[#B45309]">
                      <span>{currentPage.category}</span>
                      <span>•</span>
                      <span>{currentPage.products.length} Curated Finds</span>
                    </div>

                    <h1 className="font-serif-display text-3xl sm:text-5xl font-semibold text-[#1C1917] leading-[1.1] tracking-tight">
                      {currentPage.title}
                    </h1>

                    <p className="text-base sm:text-lg text-[#57534E] leading-relaxed max-w-2xl">
                      {currentPage.summary}
                    </p>
                  </div>

                  <div className="lg:col-span-5">
                    <div className="aspect-[4/3] bg-[#F3F1EC] border border-[#E7E5E0] overflow-hidden">
                      <img
                        src={currentPage.heroImage}
                        alt={currentPage.title}
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.src = FALLBACK_IMAGE_DATA_URI;
                        }}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </div>

                {/* Numbered Product Showcase Grid */}
                <div className="py-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {currentPage.products.map((prod, index) => {
                      const taggedUrl = formatAmazonAffiliateUrl(
                        prod.amazonUrl,
                        effectiveAmazonTag
                      );
                      return (
                        <div
                          key={prod.id || index}
                          className="bg-[#F3F1EC] border border-[#E7E5E0] flex flex-col justify-between group hover:border-[#1C1917] transition-colors"
                        >
                          <div>
                            <div className="relative aspect-[4/3] bg-[#FAF9F6] border-b border-[#E7E5E0] overflow-hidden">
                              <img
                                src={prod.image}
                                alt={prod.name}
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  e.currentTarget.src = FALLBACK_IMAGE_DATA_URI;
                                }}
                                className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
                              />
                              <div className="absolute top-3 left-3 bg-[#1C1917] text-[#FAF9F6] font-mono text-xs px-2.5 py-1">
                                0{index + 1}
                              </div>
                              {prod.badge && (
                                <div className="absolute top-3 right-3 bg-[#FAF9F6]/95 border border-[#E7E5E0] text-[#B45309] font-mono text-[11px] uppercase tracking-wider px-2.5 py-1">
                                  {prod.badge}
                                </div>
                              )}
                            </div>

                            <div className="p-5 space-y-2.5">
                              <div className="flex items-baseline justify-between gap-2">
                                <span className="font-mono text-xs uppercase tracking-wider text-[#57534E]">
                                  Amazon Find
                                </span>
                                <span className="font-mono text-base font-semibold text-[#1C1917] tabular-nums">
                                  {prod.price}
                                </span>
                              </div>

                              <h3 className="font-serif-display text-lg font-semibold text-[#1C1917] leading-snug">
                                {prod.name}
                              </h3>

                              <p className="text-xs text-[#57534E] leading-relaxed">
                                {prod.verdict}
                              </p>
                            </div>
                          </div>

                          <div className="p-5 pt-0">
                            <a
                              href={taggedUrl}
                              target="_blank"
                              rel="noopener noreferrer sponsored"
                              className="w-full inline-flex items-center justify-between bg-[#1C1917] text-[#FAF9F6] px-4 py-3 text-xs font-mono uppercase tracking-wider hover:bg-[#B45309] transition-colors"
                            >
                              <span>Check Price on Amazon</span>
                              <ArrowUpRight className="w-4 h-4" />
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </article>
            ) : (
              <div className="max-w-xl mx-auto px-4 py-24 text-center space-y-4">
                <h2 className="font-serif-display text-2xl font-semibold text-[#1C1917]">
                  Collection Not Found
                </h2>
                <p className="text-sm text-[#57534E]">
                  We couldn&apos;t find the page <code className="font-mono text-xs">?page={selectedSlug}</code>.
                </p>
              </div>
            )}
          </div>
        )}

        {/* VIEW 3: 3-STEP AI INSTRUCTION.MD + .TXT UPLOAD & GITHUB PUBLISHER (Protected) */}
        {activeView === 'studio' && isAdminUnlocked && (
          <PageBuilderStudio
            amazonTag={effectiveAmazonTag}
            githubConfig={githubConfig}
            onUpdateGithubConfig={handleUpdateGithubConfig}
            onSavePagePreview={handleSaveCustomPage}
            onOpenPage={openPageBySlug}
          />
        )}

        {/* VIEW 4: HOW IT WORKS & STATIC HOSTING PLAYBOOK (Protected) */}
        {activeView === 'guide' && isAdminUnlocked && (
          <FlatFileGuideView
            amazonTag={effectiveAmazonTag}
            onGoToBuilder={() => setActiveView('studio')}
          />
        )}
      </main>

      {/* 2:3 Pinterest Pin & Destination Link Modal (Creator Only) */}
      {isAdminUnlocked && pinModalPage && (
        <PinStudioModal
          page={pinModalPage}
          siteName={initialBundle.config.siteName}
          onClose={() => setPinModalPage(null)}
        />
      )}

      {/* Secret Creator AES-256-GCM Decryption Modal */}
      {showPasscodeModal && (
        <AdminPasscodeModal
          vaultToken={initialBundle.config.adminVault}
          onSuccess={handleUnlockSuccess}
          onClose={() => setShowPasscodeModal(false)}
        />
      )}
    </div>
  );
}

export default App;
