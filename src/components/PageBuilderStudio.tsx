import React, { useState } from 'react';
import {
  Check,
  Copy,
  Download,
  FileText,
  FolderOpen,
  Link2,
  Plus,
  Sparkles,
  Trash2,
  Wand2,
} from 'lucide-react';
import {
  AffiliateProduct,
  formatAmazonAffiliateUrl,
  RetundaPage,
  serializeAffiliateLinksToTxt,
  serializePageToTxt,
} from '../utils/flatFileEngine';

interface PageBuilderStudioProps {
  pages: RetundaPage[];
  quickLinks: AffiliateProduct[];
  amazonTag: string;
  initialEditPage?: RetundaPage | null;
  onSavePagePreview: (page: RetundaPage) => void;
  onDeleteCustomPage: (slug: string) => void;
  onSaveQuickLinksPreview: (links: AffiliateProduct[]) => void;
  onOpenPage: (slug: string) => void;
}

const PRESET_TEMPLATES: Array<{
  label: string;
  title: string;
  slug: string;
  category: string;
  heroImage: string;
  summary: string;
  pinTitle: string;
  pinDescription: string;
  pinBoard: string;
  products: Omit<AffiliateProduct, 'id'>[];
}> = [
  {
    label: 'Cozy Linen Bedroom Sanctuary',
    title: '6 Serene Linen & Warm Oak Bedroom Finds on Amazon',
    slug: 'serene-linen-bedroom-sanctuary',
    category: 'Bedroom',
    heroImage:
      'https://images.unsplash.com/photo-1540518614846-7ede433c4576?auto=format&fit=crop&w=1400&q=85',
    summary:
      'Breathable washed French flax duvet covers, ceramic bedside table lamps, and woven wool area rugs that turn your bedroom into a calm retreat.',
    pinTitle: '6 Cozy Minimalist Linen Bedroom Finds on Amazon',
    pinDescription:
      'Create a serene neutral bedroom sanctuary with these 6 curated Amazon home finds: washed oatmeal linen duvet cover set, ceramic pleated bedside lamp, and warm oak nightstand tray.',
    pinBoard: 'Cozy Minimalist Bedroom Decor',
    products: [
      {
        name: '100% Washed French Flax Linen Duvet Cover Set (Oatmeal)',
        price: '$118.00',
        badge: 'Hero Layer',
        image:
          'https://images.unsplash.com/photo-1540518614846-7ede433c4576?auto=format&fit=crop&w=900&q=80',
        amazonUrl: 'https://www.amazon.com/dp/B08DUVT101?tag=retunda-20',
        verdict:
          'Naturally temperature-regulating linen that gets softer with every wash and requires zero ironing.',
      },
      {
        name: 'Ceramic Ribbed Base Bedside Lamp with Warm Linen Drum Shade',
        price: '$52.00',
        badge: 'Soft Glow',
        image:
          'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=80',
        amazonUrl: 'https://www.amazon.com/dp/B09LAMP204?tag=retunda-20',
        verdict:
          'Diffuses harsh bulb glare into a relaxing sunset glow for evening reading.',
      },
      {
        name: 'Handwoven Chunky Jute & Wool Blend Bedside Runner Rug',
        price: '$68.00',
        badge: 'Tactile Underfoot',
        image:
          'https://images.unsplash.com/photo-1600166898405-da9535204843?auto=format&fit=crop&w=900&q=80',
        amazonUrl: 'https://www.amazon.com/dp/B09JRUG551?tag=retunda-20',
        verdict:
          'Thick braided natural fibers that ground the bed frame and feel plush first thing in the morning.',
      },
    ],
  },
  {
    label: 'Home Cafe & Espresso Bar',
    title: '5 Aesthetic Home Espresso & Matcha Bar Essentials on Amazon',
    slug: 'aesthetic-home-coffee-bar-essentials',
    category: 'Kitchen & Dining',
    heroImage:
      'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1400&q=85',
    summary:
      'Double-walled fluted espresso glasses, walnut tamping stations, and stoneware matcha bowls with bamboo whisks.',
    pinTitle: '5 Aesthetic Home Coffee & Matcha Bar Finds on Amazon',
    pinDescription:
      'Style an elevated countertop coffee and matcha station with fluted borosilicate glasses, glass syrup dispensers, and walnut barista organizers from Amazon.',
    pinBoard: 'Home Coffee Bar Ideas',
    products: [
      {
        name: 'Ribbed Borosilicate Double-Wall Iced Latte & Espresso Glasses (Set of 4)',
        price: '$28.00',
        badge: 'Viral Glassware',
        image:
          'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=900&q=80',
        amazonUrl: 'https://www.amazon.com/dp/B09GLSS882?tag=retunda-20',
        verdict:
          'Condensation-free optical fluting that makes every morning iced oat latte look like a specialty cafe pour.',
      },
      {
        name: 'Glass Coffee Syrup Dispenser Bottles with Matte Brass Pumps (Set of 2)',
        price: '$24.50',
        badge: 'Counter Upgrade',
        image:
          'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=80',
        amazonUrl: 'https://www.amazon.com/dp/B08SYRP112?tag=retunda-20',
        verdict:
          'Replaces mismatching store-bought vanilla and caramel bottles with uniform apothecary glass.',
      },
      {
        name: 'Handcrafted Speckled Stoneware Matcha Bowl with Spout & Bamboo Whisk',
        price: '$34.00',
        badge: 'Ceremonial Set',
        image:
          'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=900&q=80',
        amazonUrl: 'https://www.amazon.com/dp/B09MTCH990?tag=retunda-20',
        verdict:
          'Drip-free pouring spout with a 100-prong bamboo chasen and ceramic whisk holder.',
      },
    ],
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
  pages,
  quickLinks,
  amazonTag,
  initialEditPage,
  onSavePagePreview,
  onDeleteCustomPage,
  onSaveQuickLinksPreview,
  onOpenPage,
}) => {
  const [studioTab, setStudioTab] = useState<'page-builder' | 'quick-links' | 'file-inspector'>(
    'page-builder'
  );

  const [title, setTitle] = useState(
    initialEditPage?.title || '5 Warm Minimalist Entryway Console Finds on Amazon'
  );
  const [slug, setSlug] = useState(
    initialEditPage?.slug || 'warm-minimalist-entryway-finds'
  );
  const [category, setCategory] = useState(initialEditPage?.category || 'Living Room');
  const [heroImage, setHeroImage] = useState(
    initialEditPage?.heroImage ||
      'https://images.unsplash.com/photo-1615529182904-14819c35db37?auto=format&fit=crop&w=1400&q=85'
  );
  const [summary, setSummary] = useState(
    initialEditPage?.summary ||
      'Create a welcoming first impression with honed travertine key bowls, arched brass mirrors, and woven storage baskets under $85.'
  );
  const [pinTitle, setPinTitle] = useState(
    initialEditPage?.pinTitle || '5 Warm Minimalist Entryway Console Finds on Amazon'
  );
  const [pinDescription, setPinDescription] = useState(
    initialEditPage?.pinDescription ||
      'Style your entryway console table like an interior designer with these 5 affordable neutral Amazon finds.'
  );
  const [pinBoard, setPinBoard] = useState(
    initialEditPage?.pinBoard || 'Minimalist Entryway Decor'
  );

  const [products, setProducts] = useState<AffiliateProduct[]>(
    initialEditPage?.products || [
      {
        id: 'prod-1',
        name: 'Arched Brushed Brass Metal Frame Entryway Wall Mirror (24 x 36 in)',
        price: '$79.00',
        badge: 'Designer Look',
        image:
          'https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=900&q=80',
        amazonUrl: formatAmazonAffiliateUrl('B09MRR8821', amazonTag),
        verdict:
          'Bounces natural light through narrow hallways with a razor-thin architectural brass bezel.',
      },
      {
        id: 'prod-2',
        name: 'Scalloped Natural Travertine Key & Sunglass Catchall Bowl',
        price: '$36.00',
        badge: 'Editor Pick',
        image:
          'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=900&q=80',
        amazonUrl: formatAmazonAffiliateUrl('B09TRVBWL2', amazonTag),
        verdict:
          'Keeps daily pocket essentials organized right by the front door without visual clutter.',
      },
    ]
  );

  const [editableQuickLinks, setEditableQuickLinks] =
    useState<AffiliateProduct[]>(quickLinks);
  const [copiedTxt, setCopiedTxt] = useState(false);
  const [copiedLinksTxt, setCopiedLinksTxt] = useState(false);
  const [savedBanner, setSavedBanner] = useState<string | null>(null);

  const loadExistingPageForEdit = (page: RetundaPage) => {
    setTitle(page.title);
    setSlug(page.slug);
    setCategory(page.category);
    setHeroImage(page.heroImage);
    setSummary(page.summary);
    setPinTitle(page.pinTitle);
    setPinDescription(page.pinDescription);
    setPinBoard(page.pinBoard);
    setProducts(page.products);
    setStudioTab('page-builder');
  };

  const applyTemplate = (tpl: (typeof PRESET_TEMPLATES)[number]) => {
    setTitle(tpl.title);
    setSlug(tpl.slug);
    setCategory(tpl.category);
    setHeroImage(tpl.heroImage);
    setSummary(tpl.summary);
    setPinTitle(tpl.pinTitle);
    setPinDescription(tpl.pinDescription);
    setPinBoard(tpl.pinBoard);
    setProducts(
      tpl.products.map((p, idx) => ({
        ...p,
        id: `${tpl.slug}-prod-${idx + 1}`,
        amazonUrl: formatAmazonAffiliateUrl(p.amazonUrl, amazonTag),
      }))
    );
  };

  const handleAddProductRow = () => {
    setProducts((prev) => [
      ...prev,
      {
        id: `prod-${Date.now()}`,
        name: 'New Curated Amazon Product',
        price: '$32.00',
        badge: `Pick #${prev.length + 1}`,
        image:
          'https://images.unsplash.com/photo-1578500494198-246f612d3b3d?auto=format&fit=crop&w=900&q=80',
        amazonUrl: `https://www.amazon.com/dp/B08EXAMPLE?tag=${amazonTag}`,
        verdict: 'Describe why this item is worth buying and how to style it.',
      },
    ]);
  };

  const handleUpdateProduct = (
    index: number,
    field: keyof AffiliateProduct,
    value: string
  ) => {
    setProducts((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        if (field === 'amazonUrl') {
          return { ...item, amazonUrl: formatAmazonAffiliateUrl(value, amazonTag) };
        }
        return { ...item, [field]: value };
      })
    );
  };

  const handleRemoveProduct = (index: number) => {
    setProducts((prev) => prev.filter((_, idx) => idx !== index));
  };

  const currentSlug = slugify(slug || title) || 'new-curated-page';
  const todayDate = new Date().toISOString().slice(0, 10);

  const generatedPageTxt = serializePageToTxt({
    slug: currentSlug,
    title,
    category,
    date: todayDate,
    readTime: `${Math.max(2, Math.ceil(products.length * 0.5))} min read`,
    heroImage,
    summary,
    pinTitle: pinTitle || title,
    pinDescription: pinDescription || summary,
    pinBoard: pinBoard || `${category} Ideas`,
    products: products.map((p) => ({
      ...p,
      amazonUrl: formatAmazonAffiliateUrl(p.amazonUrl, amazonTag),
    })),
  });

  const handleDownloadTxtFile = () => {
    const blob = new Blob([generatedPageTxt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentSlug}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyTxtContent = () => {
    navigator.clipboard.writeText(generatedPageTxt);
    setCopiedTxt(true);
    setTimeout(() => setCopiedTxt(false), 2000);
  };

  const handleSaveAndPreviewPage = () => {
    const newPage: RetundaPage = {
      slug: currentSlug,
      fileName: `${currentSlug}.txt`,
      title,
      category,
      date: todayDate,
      readTime: `${Math.max(2, Math.ceil(products.length * 0.5))} min read`,
      heroImage,
      summary,
      pinTitle: pinTitle || title,
      pinDescription: pinDescription || summary,
      pinBoard: pinBoard || `${category} Ideas`,
      products: products.map((p, idx) => ({
        ...p,
        id: `${currentSlug}-${idx + 1}`,
        amazonUrl: formatAmazonAffiliateUrl(p.amazonUrl, amazonTag),
      })),
      rawText: generatedPageTxt,
      isCustomLocal: true,
    };

    onSavePagePreview(newPage);
    setSavedBanner(`Page "?page=${currentSlug}" is now live in your preview!`);
    setTimeout(() => setSavedBanner(null), 4000);
  };

  const generatedLinksTxt = serializeAffiliateLinksToTxt(editableQuickLinks);

  const handleDownloadAffiliateLinksTxt = () => {
    const blob = new Blob([generatedLinksTxt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'affiliate-links.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Studio Header */}
      <div className="border-b border-[#E7E5E0] pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-[#B45309]">
            Flat-File Content Engine • No Server or Database Required
          </p>
          <h1 className="font-serif-display text-3xl sm:text-4xl font-semibold text-[#1C1917] mt-1">
            Add Pages &amp; Manage Flat Text Files
          </h1>
          <p className="text-sm text-[#57534E] mt-1 max-w-2xl">
            Every page on <strong>Retunda</strong> lives as a plain <code className="font-mono text-xs bg-[#F3F1EC] px-1.5 py-0.5 border border-[#E7E5E0]">.txt</code> file inside <code className="font-mono text-xs bg-[#F3F1EC] px-1.5 py-0.5 border border-[#E7E5E0]">src/content/pages/</code>. Build your page visually below, preview it immediately, and download the <code className="font-mono text-xs">.txt</code> file to add it permanently.
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="flex border border-[#E7E5E0] bg-[#F3F1EC]">
          <button
            onClick={() => setStudioTab('page-builder')}
            className={`px-4 py-2.5 text-xs font-mono uppercase tracking-wider cursor-pointer transition-colors ${
              studioTab === 'page-builder'
                ? 'bg-[#1C1917] text-[#FAF9F6]'
                : 'text-[#57534E] hover:text-[#1C1917]'
            }`}
          >
            1. Add / Edit Page (.txt)
          </button>
          <button
            onClick={() => setStudioTab('quick-links')}
            className={`px-4 py-2.5 text-xs font-mono uppercase tracking-wider cursor-pointer transition-colors ${
              studioTab === 'quick-links'
                ? 'bg-[#1C1917] text-[#FAF9F6]'
                : 'text-[#57534E] hover:text-[#1C1917]'
            }`}
          >
            2. Master Links (affiliate-links.txt)
          </button>
          <button
            onClick={() => setStudioTab('file-inspector')}
            className={`px-4 py-2.5 text-xs font-mono uppercase tracking-wider cursor-pointer transition-colors ${
              studioTab === 'file-inspector'
                ? 'bg-[#1C1917] text-[#FAF9F6]'
                : 'text-[#57534E] hover:text-[#1C1917]'
            }`}
          >
            3. Folder Inspector ({pages.length} Pages)
          </button>
        </div>
      </div>

      {savedBanner && (
        <div className="mt-6 bg-[#15803D]/10 border border-[#15803D]/30 px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-medium text-[#15803D]">{savedBanner}</span>
          <button
            onClick={() => onOpenPage(currentSlug)}
            className="text-xs font-mono uppercase tracking-wider bg-[#15803D] text-white px-3 py-1.5 cursor-pointer"
          >
            Open Live Page →
          </button>
        </div>
      )}

      {studioTab === 'page-builder' && (
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left 7 Columns: Visual Form Builder */}
          <div className="lg:col-span-7 space-y-6">
            {/* Quick Load Existing File or Preset */}
            <div className="bg-[#F3F1EC] border border-[#E7E5E0] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <span className="font-mono text-xs uppercase tracking-wider text-[#57534E] flex items-center gap-1.5">
                  <Wand2 className="w-3.5 h-3.5 text-[#B45309]" />
                  Quick-Start From Starter Template or Existing Page
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {PRESET_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.slug}
                    type="button"
                    onClick={() => applyTemplate(tpl)}
                    className="text-xs bg-[#FAF9F6] border border-[#D6D3CD] px-3 py-1.5 text-[#1C1917] hover:border-[#B45309] cursor-pointer"
                  >
                    + Template: {tpl.label}
                  </button>
                ))}
                {pages.map((p) => (
                  <button
                    key={p.slug}
                    type="button"
                    onClick={() => loadExistingPageForEdit(p)}
                    className="text-xs bg-[#FAF9F6] border border-[#E7E5E0] px-3 py-1.5 text-[#57534E] hover:text-[#1C1917] cursor-pointer"
                  >
                    Edit: {p.fileName}
                  </button>
                ))}
              </div>
            </div>

            {/* Page Metadata */}
            <div className="bg-[#F3F1EC] border border-[#E7E5E0] p-6 space-y-4">
              <h2 className="font-serif-display text-xl font-semibold text-[#1C1917]">
                Page Header &amp; Pinterest URL Details
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block font-mono text-xs uppercase tracking-wider text-[#57534E] mb-1">
                    Page Headline (TITLE)
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      if (!initialEditPage) {
                        setSlug(slugify(e.target.value));
                      }
                    }}
                    className="w-full bg-[#FAF9F6] border border-[#E7E5E0] px-3 py-2 text-sm text-[#1C1917] focus:outline-none focus:border-[#1C1917]"
                  />
                </div>

                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-[#57534E] mb-1">
                    Page URL Slug &amp; Filename (SLUG)
                  </label>
                  <div className="flex items-center bg-[#FAF9F6] border border-[#E7E5E0] px-3 py-2">
                    <span className="font-mono text-xs text-[#57534E]">?page=</span>
                    <input
                      type="text"
                      value={slug}
                      onChange={(e) => setSlug(slugify(e.target.value))}
                      className="w-full bg-transparent font-mono text-xs text-[#1C1917] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-[#57534E] mb-1">
                    Category (CATEGORY)
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Living Room, Kitchen & Dining, Workspace..."
                    className="w-full bg-[#FAF9F6] border border-[#E7E5E0] px-3 py-2 text-sm text-[#1C1917] focus:outline-none focus:border-[#1C1917]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-mono text-xs uppercase tracking-wider text-[#57534E] mb-1">
                    Hero Image URL (HERO_IMAGE)
                  </label>
                  <input
                    type="text"
                    value={heroImage}
                    onChange={(e) => setHeroImage(e.target.value)}
                    className="w-full bg-[#FAF9F6] border border-[#E7E5E0] px-3 py-2 font-mono text-xs text-[#1C1917] focus:outline-none focus:border-[#1C1917]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-mono text-xs uppercase tracking-wider text-[#57534E] mb-1">
                    Editorial Summary (SUMMARY)
                  </label>
                  <textarea
                    rows={2}
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    className="w-full bg-[#FAF9F6] border border-[#E7E5E0] px-3 py-2 text-sm text-[#1C1917] focus:outline-none focus:border-[#1C1917]"
                  />
                </div>

                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-[#57534E] mb-1">
                    Pinterest Pin Title (PIN_TITLE)
                  </label>
                  <input
                    type="text"
                    value={pinTitle}
                    onChange={(e) => setPinTitle(e.target.value)}
                    className="w-full bg-[#FAF9F6] border border-[#E7E5E0] px-3 py-2 text-xs text-[#1C1917] focus:outline-none focus:border-[#1C1917]"
                  />
                </div>

                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-[#57534E] mb-1">
                    Pinterest Board Name (PIN_BOARD)
                  </label>
                  <input
                    type="text"
                    value={pinBoard}
                    onChange={(e) => setPinBoard(e.target.value)}
                    className="w-full bg-[#FAF9F6] border border-[#E7E5E0] px-3 py-2 text-xs text-[#1C1917] focus:outline-none focus:border-[#1C1917]"
                  />
                </div>
              </div>
            </div>

            {/* Products List */}
            <div className="bg-[#F3F1EC] border border-[#E7E5E0] p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-serif-display text-xl font-semibold text-[#1C1917]">
                    Amazon Affiliate Products ({products.length})
                  </h2>
                  <p className="text-xs text-[#57534E]">
                    Paste any Amazon link or 10-character ASIN—your <code className="font-mono">?tag={amazonTag}</code> is added automatically.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddProductRow}
                  className="inline-flex items-center gap-1.5 bg-[#1C1917] text-[#FAF9F6] px-3.5 py-2 text-xs font-mono uppercase tracking-wider hover:bg-[#B45309] transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Product
                </button>
              </div>

              <div className="space-y-4">
                {products.map((prod, idx) => (
                  <div
                    key={prod.id || idx}
                    className="bg-[#FAF9F6] border border-[#E7E5E0] p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-[#E7E5E0] pb-2">
                      <span className="font-mono text-xs font-semibold text-[#B45309]">
                        PRODUCT #{idx + 1}
                      </span>
                      {products.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveProduct(idx)}
                          className="text-xs text-[#B91C1C] hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remove
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                      <div className="sm:col-span-6">
                        <label className="block font-mono text-[11px] uppercase text-[#57534E] mb-1">
                          Product Title (NAME)
                        </label>
                        <input
                          type="text"
                          value={prod.name}
                          onChange={(e) =>
                            handleUpdateProduct(idx, 'name', e.target.value)
                          }
                          className="w-full bg-[#F3F1EC] border border-[#E7E5E0] px-2.5 py-1.5 text-xs text-[#1C1917]"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <label className="block font-mono text-[11px] uppercase text-[#57534E] mb-1">
                          Price (PRICE)
                        </label>
                        <input
                          type="text"
                          value={prod.price}
                          onChange={(e) =>
                            handleUpdateProduct(idx, 'price', e.target.value)
                          }
                          className="w-full bg-[#F3F1EC] border border-[#E7E5E0] px-2.5 py-1.5 font-mono text-xs text-[#1C1917]"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <label className="block font-mono text-[11px] uppercase text-[#57534E] mb-1">
                          Editorial Badge (BADGE)
                        </label>
                        <input
                          type="text"
                          value={prod.badge}
                          onChange={(e) =>
                            handleUpdateProduct(idx, 'badge', e.target.value)
                          }
                          className="w-full bg-[#F3F1EC] border border-[#E7E5E0] px-2.5 py-1.5 text-xs text-[#1C1917]"
                        />
                      </div>

                      <div className="sm:col-span-6">
                        <label className="block font-mono text-[11px] uppercase text-[#B45309] font-semibold mb-1">
                          Amazon Affiliate Link or ASIN (AMAZON_URL)
                        </label>
                        <input
                          type="text"
                          value={prod.amazonUrl}
                          onChange={(e) =>
                            handleUpdateProduct(idx, 'amazonUrl', e.target.value)
                          }
                          placeholder="Paste Amazon URL or ASIN (e.g. B09TRV1029)"
                          className="w-full bg-[#F3F1EC] border border-[#E7E5E0] px-2.5 py-1.5 font-mono text-xs text-[#1C1917]"
                        />
                      </div>

                      <div className="sm:col-span-6">
                        <label className="block font-mono text-[11px] uppercase text-[#57534E] mb-1">
                          Product Photo URL (IMAGE)
                        </label>
                        <input
                          type="text"
                          value={prod.image}
                          onChange={(e) =>
                            handleUpdateProduct(idx, 'image', e.target.value)
                          }
                          className="w-full bg-[#F3F1EC] border border-[#E7E5E0] px-2.5 py-1.5 font-mono text-xs text-[#1C1917]"
                        />
                      </div>

                      <div className="sm:col-span-12">
                        <label className="block font-mono text-[11px] uppercase text-[#57534E] mb-1">
                          Why We Love It / Verdict (VERDICT)
                        </label>
                        <input
                          type="text"
                          value={prod.verdict}
                          onChange={(e) =>
                            handleUpdateProduct(idx, 'verdict', e.target.value)
                          }
                          className="w-full bg-[#F3F1EC] border border-[#E7E5E0] px-2.5 py-1.5 text-xs text-[#1C1917]"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right 5 Columns: Live Generated .txt File & 1-Click Actions */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-[#F3F1EC] border border-[#E7E5E0] p-6 sticky top-20 space-y-5">
              <div>
                <span className="font-mono text-xs uppercase tracking-widest text-[#B45309]">
                  Generated Flat Text File
                </span>
                <h3 className="font-serif-display text-2xl font-semibold text-[#1C1917] mt-1">
                  src/content/pages/{currentSlug}.txt
                </h3>
                <p className="text-xs text-[#57534E] mt-1 leading-relaxed">
                  1. Click <strong>Publish Live Preview</strong> to test the page right now.<br />
                  2. Click <strong>Download {currentSlug}.txt</strong> and place it inside <code className="font-mono text-[#1C1917]">src/content/pages/</code> to store it permanently in your flat-file folder.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={handleSaveAndPreviewPage}
                  className="w-full inline-flex items-center justify-center gap-2 bg-[#1C1917] text-[#FAF9F6] px-4 py-3 text-xs font-mono uppercase tracking-wider hover:bg-[#B45309] transition-colors cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  Publish Live Preview
                </button>
                <button
                  type="button"
                  onClick={handleDownloadTxtFile}
                  className="w-full inline-flex items-center justify-center gap-2 bg-[#B45309] text-[#FAF9F6] px-4 py-3 text-xs font-mono uppercase tracking-wider hover:bg-[#1C1917] transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Download .txt File
                </button>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-xs text-[#57534E]">
                    Raw Text File Output ({currentSlug}.txt)
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyTxtContent}
                    className="inline-flex items-center gap-1 font-mono text-xs text-[#1C1917] hover:text-[#B45309] cursor-pointer"
                  >
                    {copiedTxt ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#15803D]" /> Copied .txt
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Copy Text
                      </>
                    )}
                  </button>
                </div>
                <pre className="bg-[#FAF9F6] border border-[#E7E5E0] p-3.5 font-mono text-[11px] text-[#1C1917] overflow-x-auto max-h-[380px] whitespace-pre-wrap leading-relaxed">
                  {generatedPageTxt}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {studioTab === 'quick-links' && (
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 bg-[#F3F1EC] border border-[#E7E5E0] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-serif-display text-xl font-semibold text-[#1C1917]">
                  Master Direct Amazon Links (<code className="font-mono text-sm">affiliate-links.txt</code>)
                </h2>
                <p className="text-xs text-[#57534E]">
                  These items appear in your storefront&apos;s Quick-Shop Amazon Directory for fast 1-click Pinterest traffic conversion.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const updated = [
                    {
                      id: `link-${Date.now()}`,
                      name: 'New Direct Amazon Find',
                      category: 'Living Room',
                      price: '$29.00',
                      badge: 'New Find',
                      image:
                        'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=900&q=80',
                      amazonUrl: `https://www.amazon.com/dp/B09EXAMPLE?tag=${amazonTag}`,
                      verdict: 'Direct curated Amazon find.',
                    },
                    ...editableQuickLinks,
                  ];
                  setEditableQuickLinks(updated);
                  onSaveQuickLinksPreview(updated);
                }}
                className="inline-flex items-center gap-1.5 bg-[#1C1917] text-[#FAF9F6] px-3.5 py-2 text-xs font-mono uppercase tracking-wider cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Direct Link
              </button>
            </div>

            <div className="space-y-3">
              {editableQuickLinks.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="bg-[#FAF9F6] border border-[#E7E5E0] p-4 grid grid-cols-1 sm:grid-cols-12 gap-3"
                >
                  <div className="sm:col-span-5">
                    <label className="block font-mono text-[10px] uppercase text-[#57534E]">
                      Product Name
                    </label>
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => {
                        const updated = editableQuickLinks.map((l, i) =>
                          i === idx ? { ...l, name: e.target.value } : l
                        );
                        setEditableQuickLinks(updated);
                        onSaveQuickLinksPreview(updated);
                      }}
                      className="w-full bg-[#F3F1EC] border border-[#E7E5E0] px-2.5 py-1.5 text-xs"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-mono text-[10px] uppercase text-[#57534E]">
                      Price
                    </label>
                    <input
                      type="text"
                      value={item.price}
                      onChange={(e) => {
                        const updated = editableQuickLinks.map((l, i) =>
                          i === idx ? { ...l, price: e.target.value } : l
                        );
                        setEditableQuickLinks(updated);
                        onSaveQuickLinksPreview(updated);
                      }}
                      className="w-full bg-[#F3F1EC] border border-[#E7E5E0] px-2.5 py-1.5 font-mono text-xs"
                    />
                  </div>
                  <div className="sm:col-span-5">
                    <label className="block font-mono text-[10px] uppercase text-[#B45309] font-semibold">
                      Amazon Affiliate URL
                    </label>
                    <input
                      type="text"
                      value={item.amazonUrl}
                      onChange={(e) => {
                        const updated = editableQuickLinks.map((l, i) =>
                          i === idx
                            ? {
                                ...l,
                                amazonUrl: formatAmazonAffiliateUrl(
                                  e.target.value,
                                  amazonTag
                                ),
                              }
                            : l
                        );
                        setEditableQuickLinks(updated);
                        onSaveQuickLinksPreview(updated);
                      }}
                      className="w-full bg-[#F3F1EC] border border-[#E7E5E0] px-2.5 py-1.5 font-mono text-xs"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 bg-[#F3F1EC] border border-[#E7E5E0] p-6 space-y-4 h-fit">
            <h3 className="font-serif-display text-xl font-semibold text-[#1C1917]">
              src/content/affiliate-links.txt
            </h3>
            <p className="text-xs text-[#57534E]">
              Download or copy this updated text file to replace <code className="font-mono">src/content/affiliate-links.txt</code>.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDownloadAffiliateLinksTxt}
                className="flex-1 inline-flex items-center justify-center gap-1.5 bg-[#B45309] text-[#FAF9F6] py-2.5 px-4 text-xs font-mono uppercase tracking-wider cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Download affiliate-links.txt
              </button>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(generatedLinksTxt);
                  setCopiedLinksTxt(true);
                  setTimeout(() => setCopiedLinksTxt(false), 2000);
                }}
                className="inline-flex items-center justify-center gap-1.5 bg-[#1C1917] text-[#FAF9F6] py-2.5 px-4 text-xs font-mono uppercase tracking-wider cursor-pointer"
              >
                {copiedLinksTxt ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedLinksTxt ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre className="bg-[#FAF9F6] border border-[#E7E5E0] p-3 font-mono text-[11px] max-h-[420px] overflow-y-auto whitespace-pre-wrap">
              {generatedLinksTxt}
            </pre>
          </div>
        </div>
      )}

      {studioTab === 'file-inspector' && (
        <div className="mt-8 space-y-6">
          <div className="bg-[#F3F1EC] border border-[#E7E5E0] p-6">
            <div className="flex items-center gap-2 text-[#B45309] font-mono text-xs uppercase tracking-wider mb-2">
              <FolderOpen className="w-4 h-4" />
              Flat-File Directory Structure (/src/content/)
            </div>
            <p className="text-sm text-[#57534E] mb-6">
              Below is every flat text file currently powering <strong>Retunda</strong>. Adding a new <code className="font-mono text-xs">.txt</code> file into <code className="font-mono text-xs">src/content/pages/</code> automatically creates a new dynamic page with its own Pinterest URL.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pages.map((page) => {
                const pageUrl = `${window.location.origin}${window.location.pathname}?page=${page.slug}`;
                return (
                  <div
                    key={page.slug}
                    className="bg-[#FAF9F6] border border-[#E7E5E0] p-5 flex flex-col justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 font-mono text-xs text-[#B45309]">
                          <FileText className="w-3.5 h-3.5" />
                          src/content/pages/{page.fileName}
                        </span>
                        <span className="font-mono text-[11px] text-[#57534E]">
                          {page.products.length} Amazon links
                        </span>
                      </div>
                      <h3 className="font-serif-display text-lg font-semibold text-[#1C1917] mt-2">
                        {page.title}
                      </h3>
                      <div className="mt-2 bg-[#F3F1EC] border border-[#E7E5E0] px-2.5 py-1.5 font-mono text-[11px] text-[#57534E] flex items-center justify-between gap-2">
                        <span className="truncate">{pageUrl}</span>
                        <button
                          onClick={() => navigator.clipboard.writeText(pageUrl)}
                          className="text-[#1C1917] hover:text-[#B45309] shrink-0 cursor-pointer"
                          title="Copy Pinterest Destination Link"
                        >
                          <Link2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-[#E7E5E0]">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onOpenPage(page.slug)}
                          className="text-xs font-mono uppercase tracking-wider bg-[#1C1917] text-[#FAF9F6] px-3 py-1.5 hover:bg-[#B45309] cursor-pointer"
                        >
                          View Page
                        </button>
                        <button
                          onClick={() => loadExistingPageForEdit(page)}
                          className="text-xs font-mono uppercase tracking-wider border border-[#D6D3CD] px-3 py-1.5 text-[#1C1917] hover:border-[#1C1917] cursor-pointer"
                        >
                          Edit .txt
                        </button>
                      </div>
                      {page.isCustomLocal && (
                        <button
                          onClick={() => onDeleteCustomPage(page.slug)}
                          className="text-xs font-mono text-[#B91C1C] hover:underline cursor-pointer"
                        >
                          Remove Preview
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
