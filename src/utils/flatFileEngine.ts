export interface SiteConfig {
  siteName: string;
  tagline: string;
  subtitle: string;
  amazonTag: string;
  pinterestProfile: string;
  instagramUrl: string;
  ftcDisclosure: string;
}

export interface AffiliateProduct {
  id: string;
  name: string;
  price: string;
  badge: string;
  image: string;
  amazonUrl: string;
  verdict: string;
  category?: string;
}

export interface RetundaPage {
  slug: string;
  fileName: string;
  title: string;
  category: string;
  date: string;
  readTime: string;
  heroImage: string;
  summary: string;
  pinTitle: string;
  pinDescription: string;
  pinBoard: string;
  products: AffiliateProduct[];
  rawText: string;
  isCustomLocal?: boolean;
}

// Dynamically import all .txt files in /src/content/ via Vite's eager raw glob
const rawSiteConfigFiles = import.meta.glob('/src/content/site-config.txt', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const rawAffiliateLinksFiles = import.meta.glob('/src/content/affiliate-links.txt', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const rawPageFiles = import.meta.glob('/src/content/pages/*.txt', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

export function extractAsin(input: string): string | null {
  const trimmed = input.trim();
  if (/^[A-Z0-9]{10}$/i.test(trimmed)) {
    return trimmed.toUpperCase();
  }
  const match = trimmed.match(/(?:\/dp\/|\/gp\/product\/|\/exec\/obidos\/asin\/|\/product\/)([A-Z0-9]{10})/i);
  if (match && match[1]) {
    return match[1].toUpperCase();
  }
  return null;
}

export function formatAmazonAffiliateUrl(rawInput: string, associateTag: string): string {
  const cleanTag = (associateTag || 'retunda-20').trim();
  const trimmed = rawInput.trim();
  if (!trimmed) return `https://www.amazon.com/?tag=${encodeURIComponent(cleanTag)}`;

  const asin = extractAsin(trimmed);
  if (asin) {
    return `https://www.amazon.com/dp/${asin}?tag=${encodeURIComponent(cleanTag)}`;
  }

  try {
    const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    url.searchParams.set('tag', cleanTag);
    return url.toString();
  } catch {
    const separator = trimmed.includes('?') ? '&' : '?';
    return `${trimmed}${separator}tag=${encodeURIComponent(cleanTag)}`;
  }
}

function parseKeyValueLines(block: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = block.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;
    const key = line.slice(0, colonIndex).trim().toUpperCase();
    const value = line.slice(colonIndex + 1).trim();
    result[key] = value;
  }
  return result;
}

export function parseSiteConfig(rawText: string): SiteConfig {
  const map = parseKeyValueLines(rawText);
  return {
    siteName: map['SITE_NAME'] || 'Retunda',
    tagline: map['TAGLINE'] || 'Curated Home, Lifestyle & Aesthetic Amazon Finds',
    subtitle:
      map['SUBTITLE'] ||
      'Warm minimalist objects, architectural home accents, and daily tactile rituals sourced on Amazon.',
    amazonTag: map['AMAZON_TAG'] || 'retunda-20',
    pinterestProfile: map['PINTEREST_PROFILE'] || 'https://www.pinterest.com/retunda',
    instagramUrl: map['INSTAGRAM_URL'] || 'https://www.instagram.com/retunda',
    ftcDisclosure:
      map['FTC_DISCLOSURE'] ||
      'As an Amazon Associate, Retunda earns from qualifying purchases made through links on this site at no additional cost to you.',
  };
}

export function parseAffiliateLinksTxt(rawText: string): AffiliateProduct[] {
  const chunks = rawText.split(/---\s*LINK\s*---/i).slice(1);
  return chunks
    .map((chunk, idx) => {
      const map = parseKeyValueLines(chunk);
      if (!map['NAME']) return null;
      return {
        id: map['ID'] || `flat-link-${idx + 1}`,
        name: map['NAME'] || 'Curated Amazon Find',
        category: map['CATEGORY'] || 'Living Room',
        price: map['PRICE'] || '$29.00',
        badge: map['BADGE'] || 'Curated Find',
        image:
          map['IMAGE'] ||
          'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=900&q=80',
        amazonUrl: map['AMAZON_URL'] || 'https://www.amazon.com/?tag=retunda-20',
        verdict: map['NOTE'] || map['VERDICT'] || '',
      };
    })
    .filter(Boolean) as AffiliateProduct[];
}

export function parsePageTxt(rawText: string, filePath = ''): RetundaPage {
  const parts = rawText.split(/---\s*PRODUCT\s*---/i);
  const headerPart = parts[0] || '';
  const productParts = parts.slice(1);

  const header = parseKeyValueLines(headerPart);
  const inferredFileName =
    filePath.split('/').pop() || `${header['SLUG'] || 'new-page'}.txt`;
  const inferredSlug =
    header['SLUG'] || inferredFileName.replace(/\.txt$/i, '').toLowerCase();

  const products: AffiliateProduct[] = productParts
    .map((chunk, index) => {
      const pMap = parseKeyValueLines(chunk);
      if (!pMap['NAME']) return null;
      return {
        id: `${inferredSlug}-prod-${index + 1}`,
        name: pMap['NAME'] || `Product #${index + 1}`,
        price: pMap['PRICE'] || '$35.00',
        badge: pMap['BADGE'] || `Pick #${index + 1}`,
        image:
          pMap['IMAGE'] ||
          'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=900&q=80',
        amazonUrl: pMap['AMAZON_URL'] || 'https://www.amazon.com/?tag=retunda-20',
        verdict: pMap['VERDICT'] || pMap['NOTE'] || '',
      };
    })
    .filter(Boolean) as AffiliateProduct[];

  return {
    slug: inferredSlug,
    fileName: inferredFileName,
    title: header['TITLE'] || 'Untitled Curated Edit',
    category: header['CATEGORY'] || 'Living Room',
    date: header['DATE'] || '2026-11-05',
    readTime: header['READ_TIME'] || `${Math.max(2, Math.ceil(products.length * 0.5))} min read`,
    heroImage:
      header['HERO_IMAGE'] ||
      products[0]?.image ||
      'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1400&q=85',
    summary: header['SUMMARY'] || '',
    pinTitle: header['PIN_TITLE'] || header['TITLE'] || 'Curated Amazon Home Finds',
    pinDescription: header['PIN_DESCRIPTION'] || header['SUMMARY'] || '',
    pinBoard: header['PIN_BOARD'] || `${header['CATEGORY'] || 'Home'} Decor Ideas`,
    products,
    rawText,
  };
}

export function serializePageToTxt(page: Omit<RetundaPage, 'rawText' | 'fileName'>): string {
  const headerLines = [
    `TITLE: ${page.title.trim()}`,
    `SLUG: ${page.slug.trim()}`,
    `CATEGORY: ${page.category.trim()}`,
    `DATE: ${page.date.trim()}`,
    `READ_TIME: ${page.readTime.trim()}`,
    `HERO_IMAGE: ${page.heroImage.trim()}`,
    `SUMMARY: ${page.summary.trim()}`,
    `PIN_TITLE: ${(page.pinTitle || page.title).trim()}`,
    `PIN_DESCRIPTION: ${(page.pinDescription || page.summary).trim()}`,
    `PIN_BOARD: ${(page.pinBoard || page.category).trim()}`,
  ];

  const productBlocks = page.products.map((prod) =>
    [
      `--- PRODUCT ---`,
      `NAME: ${prod.name.trim()}`,
      `PRICE: ${prod.price.trim()}`,
      `BADGE: ${prod.badge.trim()}`,
      `IMAGE: ${prod.image.trim()}`,
      `AMAZON_URL: ${prod.amazonUrl.trim()}`,
      `VERDICT: ${prod.verdict.trim()}`,
    ].join('\n')
  );

  return `${headerLines.join('\n')}\n\n${productBlocks.join('\n\n')}\n`;
}

export function serializeAffiliateLinksToTxt(links: AffiliateProduct[]): string {
  const header = [
    '# ============================================================================',
    '# RETUNDA — MASTER DIRECT AMAZON AFFILIATE LINKS (PLAIN TEXT FILE)',
    '# Drop this content into src/content/affiliate-links.txt',
    '# ============================================================================',
    '',
  ].join('\n');

  const blocks = links.map((item, idx) =>
    [
      '--- LINK ---',
      `ID: ${item.id || `link-item-${idx + 1}`}`,
      `NAME: ${item.name.trim()}`,
      `CATEGORY: ${(item.category || 'Living Room').trim()}`,
      `PRICE: ${item.price.trim()}`,
      `BADGE: ${item.badge.trim()}`,
      `IMAGE: ${item.image.trim()}`,
      `AMAZON_URL: ${item.amazonUrl.trim()}`,
      `NOTE: ${item.verdict.trim()}`,
    ].join('\n')
  );

  return `${header}${blocks.join('\n\n')}\n`;
}

export function loadInitialFlatFileBundle(): {
  config: SiteConfig;
  rawConfigText: string;
  quickLinks: AffiliateProduct[];
  rawLinksText: string;
  pages: RetundaPage[];
} {
  const rawConfigText = Object.values(rawSiteConfigFiles)[0] || '';
  const config = parseSiteConfig(rawConfigText);

  const rawLinksText = Object.values(rawAffiliateLinksFiles)[0] || '';
  const quickLinks = parseAffiliateLinksTxt(rawLinksText);

  const pages = Object.entries(rawPageFiles)
    .map(([filePath, content]) => parsePageTxt(content, filePath))
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  return {
    config,
    rawConfigText,
    quickLinks,
    rawLinksText,
    pages,
  };
}
