import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  Bookmark,
  Check,
  Copy,
  Edit3,
  ExternalLink,
  FilePlus2,
  FileText,
  HelpCircle,
  Lock,
  Search,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Tag,
} from 'lucide-react';
import {
  AffiliateProduct,
  formatAmazonAffiliateUrl,
  loadInitialFlatFileBundle,
  RetundaPage,
} from './utils/flatFileEngine';
import { PinStudioModal } from './components/PinStudioModal';
import { PageBuilderStudio } from './components/PageBuilderStudio';
import { FlatFileGuideView } from './components/FlatFileGuideView';
import { AdminPasscodeModal } from './components/AdminPasscodeModal';

type ActiveView = 'storefront' | 'page-detail' | 'quick-links' | 'studio' | 'guide';

const FALLBACK_IMAGE_DATA_URI =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'><rect width='800' height='600' fill='%23F3F1EC'/><rect x='60' y='60' width='680' height='480' fill='none' stroke='%23D6D3CD' stroke-width='2'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Georgia, serif' font-size='28' fill='%2357534E'>RETUNDA CURATED FIND</text></svg>";

const LOCAL_CUSTOM_PAGES_KEY = 'retunda_custom_pages_v1';
const LOCAL_QUICK_LINKS_KEY = 'retunda_quick_links_v1';
const LOCAL_AMAZON_TAG_KEY = 'retunda_amazon_tag_v1';
const SESSION_ADMIN_UNLOCKED_KEY = 'retunda_admin_unlocked_v1';

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
    return localStorage.getItem(LOCAL_AMAZON_TAG_KEY) || initialBundle.config.amazonTag;
  });

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

  // Public visitors strictly see the flat files in src/content/pages/*.txt;
  // Unlocked creator also sees any unsaved local preview pages.
  const allPages = useMemo(() => {
    const map = new Map<string, RetundaPage>();
    for (const filePage of initialBundle.pages) {
      map.set(filePage.slug, filePage);
    }
    if (isAdminUnlocked) {
      for (const custom of customPages) {
        map.set(custom.slug, custom);
      }
    }
    return Array.from(map.values()).sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [initialBundle.pages, customPages, isAdminUnlocked]);

  const [activeView, setActiveView] = useState<ActiveView>('storefront');
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
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
    }

    if (
      adminParam &&
      adminParam.toLowerCase() === initialBundle.config.adminKey.toLowerCase()
    ) {
      if (!isAdminUnlocked) {
        setShowPasscodeModal(true);
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
        setActiveView('storefront');
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

  const handleUnlockSuccess = () => {
    setIsAdminUnlocked(true);
    sessionStorage.setItem(SESSION_ADMIN_UNLOCKED_KEY, 'true');
    setShowPasscodeModal(false);

    // Clean ?admin=... from address bar so URL stays clean for copying
    const url = new URL(window.location.href);
    url.searchParams.delete('admin');
    window.history.replaceState({}, '', url.toString());
  };

  const handleLockAdmin = () => {
    setIsAdminUnlocked(false);
    sessionStorage.removeItem(SESSION_ADMIN_UNLOCKED_KEY);
    if (activeView === 'studio' || activeView === 'guide') {
      setActiveView('storefront');
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

  const navigateHome = () => {
    setSelectedSlug(null);
    setActiveView('storefront');
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

  const categories = useMemo(() => {
    const set = new Set<string>(['All']);
    allPages.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    quickLinks.forEach((l) => {
      if (l.category) set.add(l.category);
    });
    return Array.from(set);
  }, [allPages, quickLinks]);

  const filteredPages = useMemo(() => {
    return allPages.filter((page) => {
      const matchesCat =
        selectedCategory === 'All' || page.category === selectedCategory;
      const q = searchQuery.trim().toLowerCase();
      if (!q) return matchesCat;
      const inTitle = page.title.toLowerCase().includes(q);
      const inSummary = page.summary.toLowerCase().includes(q);
      const inProducts = page.products.some((prod) =>
        prod.name.toLowerCase().includes(q)
      );
      return matchesCat && (inTitle || inSummary || inProducts);
    });
  }, [allPages, selectedCategory, searchQuery]);

  const filteredQuickLinks = useMemo(() => {
    return quickLinks.filter((item) => {
      const matchesCat =
        selectedCategory === 'All' || item.category === selectedCategory;
      const q = searchQuery.trim().toLowerCase();
      if (!q) return matchesCat;
      return (
        matchesCat &&
        (item.name.toLowerCase().includes(q) ||
          item.verdict.toLowerCase().includes(q))
      );
    });
  }, [quickLinks, selectedCategory, searchQuery]);

  const currentPage = useMemo(() => {
    if (!selectedSlug) return null;
    return allPages.find((p) => p.slug === selectedSlug) || null;
  }, [allPages, selectedSlug]);

  const featuredPage = allPages[0] || null;

  // Public visitors always use the canonical tag from site-config.txt;
  // Unlocked creator can test tag overrides live.
  const effectiveAmazonTag = isAdminUnlocked
    ? amazonTag
    : initialBundle.config.amazonTag;

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6] text-[#1C1917]">
      {/* SECRET CREATOR TOOLBAR (Visible ONLY when unlocked via ?admin=retunda + Passcode) */}
      {isAdminUnlocked && (
        <div className="bg-[#1C1917] text-[#FAF9F6] border-b border-[#44403C] text-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#B45309]" />
              <span className="font-mono uppercase tracking-wider text-[11px] font-semibold text-[#FAF9F6]">
                Creator Mode Unlocked
              </span>
              <span className="hidden md:inline text-[#A8A29E] font-mono text-[11px]">
                (Hidden from public visitors)
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {/* Amazon Tag Tester */}
              <div className="flex items-center gap-1.5 font-mono text-[11px] bg-[#292524] px-2.5 py-1 border border-[#44403C]">
                <Tag className="w-3 h-3 text-[#B45309]" />
                <span className="text-[#A8A29E]">Amazon Tag:</span>
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
                onClick={() => copyPagePinterestUrl()}
                className="inline-flex items-center gap-1 font-mono text-[11px] bg-[#292524] hover:bg-[#44403C] px-2.5 py-1 border border-[#44403C] cursor-pointer"
              >
                {copiedUrlSlug === '__home__' ? (
                  <>
                    <Check className="w-3 h-3 text-[#22C55E]" /> Copied Profile URL
                  </>
                ) : (
                  <>
                    <Share2 className="w-3 h-3" /> Copy Profile URL
                  </>
                )}
              </button>

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
                + Add / Edit Page (.txt)
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
                Lock Admin
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Editorial Header & Public Navigation */}
      <header className="sticky top-0 z-40 bg-[#FAF9F6]/95 backdrop-blur-xs border-b border-[#E7E5E0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Brand Masthead */}
          <div className="flex items-center gap-6">
            <button
              onClick={navigateHome}
              className="text-left group cursor-pointer flex items-baseline gap-2.5"
            >
              <span className="font-serif-display text-2xl sm:text-3xl font-semibold tracking-tight text-[#1C1917] group-hover:text-[#B45309] transition-colors">
                {initialBundle.config.siteName}
              </span>
            </button>
          </div>

          {/* Public Navigation (Clean & Read-Only for Visitors) */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={navigateHome}
              className={`px-3.5 py-1.5 text-xs font-mono uppercase tracking-wider transition-colors cursor-pointer ${
                activeView === 'storefront' || activeView === 'page-detail'
                  ? 'bg-[#1C1917] text-[#FAF9F6]'
                  : 'text-[#57534E] hover:text-[#1C1917]'
              }`}
            >
              Collections
            </button>

            <button
              onClick={() => {
                setSelectedSlug(null);
                setActiveView('quick-links');
              }}
              className={`px-3.5 py-1.5 text-xs font-mono uppercase tracking-wider transition-colors cursor-pointer ${
                activeView === 'quick-links'
                  ? 'bg-[#1C1917] text-[#FAF9F6]'
                  : 'text-[#57534E] hover:text-[#1C1917]'
              }`}
            >
              All Finds ({quickLinks.length})
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1">
        {/* VIEW 1: DEDICATED PINTEREST BRIDGE LANDING PAGE (?page=<slug>) */}
        {activeView === 'page-detail' && currentPage && (
          <article className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
            {/* Top Navigation Bar for the Page */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-6 border-b border-[#E7E5E0]">
              <button
                onClick={navigateHome}
                className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-[#57534E] hover:text-[#1C1917] cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to All Collections
              </button>

              {/* Creator-Only Controls on Page Detail */}
              {isAdminUnlocked && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-[#57534E] bg-[#F3F1EC] border border-[#E7E5E0] px-2.5 py-1">
                    File: <code>src/content/pages/{currentPage.fileName}</code>
                  </span>

                  <button
                    onClick={() => copyPagePinterestUrl(currentPage.slug)}
                    className="inline-flex items-center gap-1.5 border border-[#E7E5E0] bg-[#F3F1EC] px-3 py-1.5 text-xs font-mono text-[#1C1917] hover:border-[#B45309] cursor-pointer"
                  >
                    {copiedUrlSlug === currentPage.slug ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#15803D]" /> Pinterest Link Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Copy Page Link for Pinterest
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setPinModalPage(currentPage)}
                    className="inline-flex items-center gap-1.5 bg-[#B45309] text-[#FAF9F6] px-3.5 py-1.5 text-xs font-mono uppercase tracking-wider hover:bg-[#1C1917] transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    2:3 Pin Graphic &amp; SEO
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

            {/* Editorial Split Hero */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 py-8 sm:py-10 border-b border-[#E7E5E0] items-center">
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-widest text-[#B45309]">
                  <span>{currentPage.category}</span>
                  <span>•</span>
                  <span>{currentPage.products.length} Curated Finds</span>
                  <span>•</span>
                  <span>{currentPage.readTime}</span>
                </div>

                <h1 className="font-serif-display text-3xl sm:text-5xl font-semibold text-[#1C1917] leading-[1.1] tracking-tight">
                  {currentPage.title}
                </h1>

                <p className="text-base sm:text-lg text-[#57534E] leading-relaxed max-w-2xl">
                  {currentPage.summary}
                </p>

                <div className="pt-2 flex flex-wrap items-center gap-3 text-xs font-mono text-[#57534E]">
                  <span>Published {currentPage.date}</span>
                </div>
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
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-serif-display text-2xl font-semibold text-[#1C1917]">
                  Featured Products ({currentPage.products.length})
                </h2>
                <span className="font-mono text-xs text-[#57534E]">
                  Direct links to Amazon
                </span>
              </div>

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
                        {/* Product Image & Number Stamp */}
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

                        {/* Product Copy */}
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

                      {/* High-Contrast Amazon Affiliate CTA */}
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
        )}

        {/* VIEW 2: STOREFRONT HOME (ALL DYNAMIC PAGES + QUICK LINKS PREVIEW) */}
        {activeView === 'storefront' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-14">
            {/* Asymmetric Editorial Hero */}
            {featuredPage && (
              <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-12 border-b border-[#E7E5E0] items-center">
                <div className="lg:col-span-6 space-y-5">
                  <div className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-[#B45309]">
                    <span>Featured Collection</span>
                    <span>•</span>
                    <span>{featuredPage.category}</span>
                  </div>

                  <h1 className="font-serif-display text-4xl sm:text-5xl lg:text-6xl font-semibold text-[#1C1917] leading-[1.06] tracking-tight">
                    {featuredPage.title}
                  </h1>

                  <p className="text-base sm:text-lg text-[#57534E] leading-relaxed max-w-xl">
                    {featuredPage.summary}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      onClick={() => openPageBySlug(featuredPage.slug)}
                      className="inline-flex items-center gap-2 bg-[#1C1917] text-[#FAF9F6] px-6 py-3.5 text-xs font-mono uppercase tracking-wider hover:bg-[#B45309] transition-colors cursor-pointer"
                    >
                      <span>Explore All {featuredPage.products.length} Finds</span>
                      <ArrowUpRight className="w-4 h-4" />
                    </button>

                    {isAdminUnlocked && (
                      <button
                        onClick={() => setPinModalPage(featuredPage)}
                        className="inline-flex items-center gap-2 border border-[#1C1917] bg-[#FAF9F6] text-[#1C1917] px-5 py-3.5 text-xs font-mono uppercase tracking-wider hover:bg-[#F3F1EC] transition-colors cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4 text-[#B45309]" />
                        <span>Pin Graphic &amp; Link</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="lg:col-span-6">
                  <div
                    onClick={() => openPageBySlug(featuredPage.slug)}
                    className="relative aspect-[16/11] bg-[#F3F1EC] border border-[#E7E5E0] overflow-hidden cursor-pointer group"
                  >
                    <img
                      src={featuredPage.heroImage}
                      alt={featuredPage.title}
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.src = FALLBACK_IMAGE_DATA_URI;
                      }}
                      className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
                    />
                    <div className="absolute bottom-4 left-4 right-4 bg-[#FAF9F6]/95 border border-[#E7E5E0] p-4 flex items-center justify-between">
                      <div>
                        <span className="font-mono text-[11px] uppercase tracking-wider text-[#B45309] block">
                          {featuredPage.category} • {featuredPage.products.length} Items
                        </span>
                        <span className="font-serif-display text-sm font-semibold text-[#1C1917]">
                          View the complete curated collection →
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Category & Search Filter Bar */}
            <section className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E7E5E0] pb-4">
                <div className="flex flex-wrap items-center gap-1.5">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3.5 py-1.5 text-xs font-mono uppercase tracking-wider transition-colors cursor-pointer ${
                        selectedCategory === cat
                          ? 'bg-[#1C1917] text-[#FAF9F6]'
                          : 'bg-[#F3F1EC] text-[#57534E] hover:text-[#1C1917] border border-[#E7E5E0]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="relative w-full md:w-72">
                  <Search className="w-4 h-4 text-[#57534E] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search collections or finds..."
                    className="w-full bg-[#F3F1EC] border border-[#E7E5E0] pl-9 pr-3 py-2 text-xs text-[#1C1917] focus:outline-none focus:border-[#1C1917]"
                  />
                </div>
              </div>

              {/* Dynamic Pages Grid */}
              <div className="flex items-baseline justify-between">
                <div>
                  <h2 className="font-serif-display text-2xl sm:text-3xl font-semibold text-[#1C1917]">
                    Curated Room &amp; Lifestyle Edits
                  </h2>
                  <p className="text-xs text-[#57534E] mt-0.5">
                    Select any collection below to browse individual products on Amazon.
                  </p>
                </div>

                {isAdminUnlocked && (
                  <button
                    onClick={() => {
                      setStudioEditPage(null);
                      setActiveView('studio');
                    }}
                    className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-[#B45309] hover:text-[#1C1917] cursor-pointer"
                  >
                    <FilePlus2 className="w-4 h-4" />
                    + Create New Page (.txt)
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {filteredPages.map((page) => (
                  <div
                    key={page.slug}
                    className="bg-[#F3F1EC] border border-[#E7E5E0] flex flex-col justify-between group hover:border-[#1C1917] transition-colors"
                  >
                    <div>
                      <div
                        onClick={() => openPageBySlug(page.slug)}
                        className="relative aspect-[16/10] bg-[#FAF9F6] border-b border-[#E7E5E0] overflow-hidden cursor-pointer"
                      >
                        <img
                          src={page.heroImage}
                          alt={page.title}
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            e.currentTarget.src = FALLBACK_IMAGE_DATA_URI;
                          }}
                          className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
                        />
                        <div className="absolute top-3 left-3 bg-[#FAF9F6]/95 border border-[#E7E5E0] px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider text-[#1C1917]">
                          {page.category}
                        </div>
                        <div className="absolute top-3 right-3 bg-[#1C1917] text-[#FAF9F6] px-2.5 py-1 font-mono text-[11px] tabular-nums">
                          {page.products.length} Finds
                        </div>
                      </div>

                      <div className="p-6 space-y-3">
                        <div className="flex items-center justify-between font-mono text-[11px] text-[#57534E]">
                          <span>{page.readTime}</span>
                          <span>{page.date}</span>
                        </div>

                        {isAdminUnlocked && (
                          <div className="font-mono text-[11px] text-[#B45309] flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            src/content/pages/{page.fileName}
                          </div>
                        )}

                        <h3
                          onClick={() => openPageBySlug(page.slug)}
                          className="font-serif-display text-2xl font-semibold text-[#1C1917] group-hover:text-[#B45309] transition-colors cursor-pointer leading-snug"
                        >
                          {page.title}
                        </h3>

                        <p className="text-sm text-[#57534E] leading-relaxed line-clamp-2">
                          {page.summary}
                        </p>
                      </div>
                    </div>

                    <div className="px-6 pb-6 pt-3 border-t border-[#E7E5E0] flex flex-wrap items-center justify-between gap-2">
                      <button
                        onClick={() => openPageBySlug(page.slug)}
                        className="inline-flex items-center gap-1.5 bg-[#1C1917] text-[#FAF9F6] px-4 py-2 text-xs font-mono uppercase tracking-wider hover:bg-[#B45309] transition-colors cursor-pointer"
                      >
                        <span>Explore Collection</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>

                      {isAdminUnlocked && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => copyPagePinterestUrl(page.slug)}
                            className="inline-flex items-center gap-1 border border-[#D6D3CD] bg-[#FAF9F6] px-2.5 py-2 text-xs font-mono text-[#1C1917] hover:border-[#1C1917] cursor-pointer"
                            title="Copy Destination URL for Pinterest Pin"
                          >
                            {copiedUrlSlug === page.slug ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-[#15803D]" /> Copied
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" /> Copy Pin URL
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => setPinModalPage(page)}
                            className="inline-flex items-center gap-1 border border-[#B45309] text-[#B45309] px-2.5 py-2 text-xs font-mono uppercase hover:bg-[#B45309] hover:text-[#FAF9F6] transition-colors cursor-pointer"
                          >
                            <Bookmark className="w-3.5 h-3.5" /> 2:3 Pin
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Quick-Shop Master Amazon Affiliate Directory */}
            <section className="pt-8 border-t border-[#E7E5E0] space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div>
                  <span className="font-mono text-xs uppercase tracking-widest text-[#B45309]">
                    Individual Picks
                  </span>
                  <h2 className="font-serif-display text-2xl sm:text-3xl font-semibold text-[#1C1917] mt-1">
                    Quick-Shop Amazon Finds
                  </h2>
                  <p className="text-xs text-[#57534E]">
                    Our most-requested home and lifestyle pieces available directly on Amazon.
                  </p>
                </div>

                <button
                  onClick={() => setActiveView('quick-links')}
                  className="font-mono text-xs uppercase tracking-wider text-[#1C1917] underline hover:text-[#B45309] cursor-pointer"
                >
                  View All Individual Picks ({quickLinks.length}) →
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {filteredQuickLinks.slice(0, 8).map((item) => {
                  const affiliateHref = formatAmazonAffiliateUrl(
                    item.amazonUrl,
                    effectiveAmazonTag
                  );
                  return (
                    <div
                      key={item.id}
                      className="bg-[#F3F1EC] border border-[#E7E5E0] flex flex-col justify-between group hover:border-[#1C1917] transition-colors"
                    >
                      <div>
                        <div className="relative aspect-square bg-[#FAF9F6] border-b border-[#E7E5E0] overflow-hidden">
                          <img
                            src={item.image}
                            alt={item.name}
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              e.currentTarget.src = FALLBACK_IMAGE_DATA_URI;
                            }}
                            className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
                          />
                          {item.badge && (
                            <span className="absolute top-2.5 left-2.5 bg-[#FAF9F6]/95 border border-[#E7E5E0] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[#B45309]">
                              {item.badge}
                            </span>
                          )}
                        </div>

                        <div className="p-4 space-y-1.5">
                          <div className="flex items-center justify-between font-mono text-xs">
                            <span className="text-[#57534E] text-[11px]">
                              {item.category}
                            </span>
                            <span className="font-semibold text-[#1C1917] tabular-nums">
                              {item.price}
                            </span>
                          </div>
                          <h3 className="font-serif-display text-base font-semibold text-[#1C1917] leading-snug line-clamp-2">
                            {item.name}
                          </h3>
                          <p className="text-xs text-[#57534E] line-clamp-2 leading-relaxed">
                            {item.verdict}
                          </p>
                        </div>
                      </div>

                      <div className="p-4 pt-0">
                        <a
                          href={affiliateHref}
                          target="_blank"
                          rel="noopener noreferrer sponsored"
                          className="w-full inline-flex items-center justify-between bg-[#1C1917] text-[#FAF9F6] px-3.5 py-2.5 text-xs font-mono uppercase tracking-wider hover:bg-[#B45309] transition-colors"
                        >
                          <span>Shop on Amazon</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {/* VIEW 3: DIRECT AMAZON AFFILIATE LINKS DIRECTORY */}
        {activeView === 'quick-links' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
            <div className="border-b border-[#E7E5E0] pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-widest text-[#B45309]">
                  Curated Catalog
                </p>
                <h1 className="font-serif-display text-3xl sm:text-4xl font-semibold text-[#1C1917] mt-1">
                  All Curated Amazon Finds
                </h1>
                <p className="text-sm text-[#57534E] mt-1">
                  Direct links to our favorite home, kitchen, workspace, and bath essentials.
                </p>
              </div>

              {isAdminUnlocked && (
                <button
                  onClick={() => setActiveView('studio')}
                  className="inline-flex items-center gap-1.5 bg-[#1C1917] text-[#FAF9F6] px-4 py-2.5 text-xs font-mono uppercase tracking-wider hover:bg-[#B45309] cursor-pointer"
                >
                  <FilePlus2 className="w-3.5 h-3.5" />
                  Add / Edit Links in affiliate-links.txt
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {quickLinks.map((item) => {
                const affiliateHref = formatAmazonAffiliateUrl(
                  item.amazonUrl,
                  effectiveAmazonTag
                );
                return (
                  <div
                    key={item.id}
                    className="bg-[#F3F1EC] border border-[#E7E5E0] flex flex-col justify-between"
                  >
                    <div>
                      <div className="aspect-square bg-[#FAF9F6] border-b border-[#E7E5E0] overflow-hidden">
                        <img
                          src={item.image}
                          alt={item.name}
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            e.currentTarget.src = FALLBACK_IMAGE_DATA_URI;
                          }}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-4 space-y-2">
                        <div className="flex items-center justify-between font-mono text-xs">
                          <span className="text-[#B45309]">{item.badge}</span>
                          <span className="font-semibold text-[#1C1917] tabular-nums">
                            {item.price}
                          </span>
                        </div>
                        <h3 className="font-serif-display text-base font-semibold text-[#1C1917]">
                          {item.name}
                        </h3>
                        <p className="text-xs text-[#57534E] leading-relaxed">
                          {item.verdict}
                        </p>
                      </div>
                    </div>

                    <div className="p-4 pt-0">
                      <a
                        href={affiliateHref}
                        target="_blank"
                        rel="noopener noreferrer sponsored"
                        className="w-full inline-flex items-center justify-between bg-[#1C1917] text-[#FAF9F6] px-3.5 py-2.5 text-xs font-mono uppercase tracking-wider hover:bg-[#B45309] transition-colors"
                      >
                        <span>Shop on Amazon</span>
                        <ArrowUpRight className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW 4: FLAT-FILE PAGE BUILDER STUDIO (Protected: Only accessible when isAdminUnlocked is true) */}
        {activeView === 'studio' && isAdminUnlocked && (
          <PageBuilderStudio
            pages={allPages}
            quickLinks={quickLinks}
            amazonTag={effectiveAmazonTag}
            initialEditPage={studioEditPage}
            onSavePagePreview={handleSaveCustomPage}
            onDeleteCustomPage={handleDeleteCustomPage}
            onSaveQuickLinksPreview={handleSaveQuickLinks}
            onOpenPage={openPageBySlug}
          />
        )}

        {/* VIEW 5: HOW IT WORKS & STATIC HOSTING PLAYBOOK (Protected: Only accessible when isAdminUnlocked is true) */}
        {activeView === 'guide' && isAdminUnlocked && (
          <FlatFileGuideView
            amazonTag={effectiveAmazonTag}
            onGoToBuilder={() => setActiveView('studio')}
          />
        )}
      </main>

      {/* Clean Public Editorial Footer */}
      <footer className="bg-[#F3F1EC] border-t border-[#E7E5E0] mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-xl">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-[#B45309]" />
              <span className="font-serif-display text-xl font-semibold text-[#1C1917]">
                {initialBundle.config.siteName}
              </span>
            </div>
            <p className="text-xs text-[#57534E] leading-relaxed">
              {initialBundle.config.subtitle}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-mono uppercase tracking-wider text-[#57534E]">
            <button
              onClick={navigateHome}
              className="hover:text-[#1C1917] cursor-pointer"
            >
              Collections
            </button>
            <button
              onClick={() => {
                setSelectedSlug(null);
                setActiveView('quick-links');
              }}
              className="hover:text-[#1C1917] cursor-pointer"
            >
              All Finds
            </button>
          </div>
        </div>
      </footer>

      {/* 2:3 Pinterest Pin & Destination Link Modal (Creator Only) */}
      {isAdminUnlocked && pinModalPage && (
        <PinStudioModal
          page={pinModalPage}
          siteName={initialBundle.config.siteName}
          onClose={() => setPinModalPage(null)}
        />
      )}

      {/* Secret Creator Passcode Gate Modal */}
      {showPasscodeModal && (
        <AdminPasscodeModal
          expectedPasscode={initialBundle.config.adminPasscode}
          onSuccess={handleUnlockSuccess}
          onClose={() => setShowPasscodeModal(false)}
        />
      )}
    </div>
  );
}

export default App;
