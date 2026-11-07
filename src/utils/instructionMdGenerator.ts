export function generateAiInstructionMd(amazonTag: string, siteName = 'Retunda'): string {
  const cleanTag = (amazonTag || 'retunda-20').trim();
  return `# ${siteName} — AI Page Generation Instructions (\`instruction.md\`)

Use this specification whenever you ask an AI assistant (ChatGPT, Claude, Gemini, etc.) to generate a new affiliate landing page for **${siteName}**.

---

## 1. Your Role & Goal
You are an editorial interior design & lifestyle curator writing a flat-file \`.txt\` product roundup page for **${siteName}** (${siteName.toLowerCase()}.dpdns.org).
Your output MUST be a single, valid plain-text file (\`<slug>.txt\`) following the exact format in **Section 3** below so it can be uploaded directly into the **${siteName}** Page Builder and published to GitHub without manual edits.

---

## 2. Visual Aesthetic & Editorial Tone to Match
Every page on **${siteName}** is rendered inside a **Warm Editorial Storefront** inspired by *Architectural Digest Clever*, *Kinfolk*, and *The Strategist*:
* **Color Palette Context**:
  * Canvas Background: \`#FAF9F6\` (Warm Alabaster)
  * Product Card Surface: \`#F3F1EC\` (Soft Travertine) with \`1px solid #E7E5E0\` hairline borders
  * Primary Ink: \`#1C1917\` (Deep Stone Ink)
  * Secondary Copy: \`#57534E\` (Warm Charcoal)
  * Editorial Accent: \`#B45309\` (Warm Amber-Bronze)
* **Typography Context**:
  * Headlines & Product Titles: \`Fraunces\` (Editorial Serif)
  * Body & Verdicts: \`Plus Jakarta Sans\`
  * Prices, Badges & Metadata: \`JetBrains Mono\` (\`tabular-nums\`)
* **Writing Style Rules**:
  * **No generic AI hype**: Avoid words like "game-changer", "unleash", "elevate your space to the next level", or exclamation-mark spam.
  * **Tactile, specific verdicts**: Mention materials (e.g., *honed travertine, washed Belgian flax, borosilicate glass, brushed brass, solid American walnut*) and practical placement (*"Tucks neatly under a 27-inch monitor"*, *"Heavy 5 lb marble base never tips when holding wooden spoons"*).
  * Keep \`SUMMARY\` to 1–2 crisp sentences (18–32 words).
  * Keep each product \`VERDICT\` to 1–2 concise sentences (15–28 words).
  * Keep \`BADGE\` to 2–3 words max (e.g., \`Editor's Pick\`, \`Under $35\`, \`Best Seller\`, \`Designer Look\`, \`Heirloom Quality\`).

---

## 3. Exact Flat-File (\`.txt\`) Structure Specification

Output **ONLY** the raw text content inside a single code block using the exact \`KEY: VALUE\` header keys and \`--- PRODUCT ---\` separators shown below:

\`\`\`text
TITLE: <Compelling Editorial Roundup Title, e.g., 6 Warm Minimalist Living Room Finds on Amazon>
SLUG: <lowercase-kebab-case-url-slug, e.g., cozy-linen-living-room>
CATEGORY: <Single Category Name, e.g., Living Room | Kitchen & Dining | Workspace | Bath & Spa | Bedroom>
DATE: <YYYY-MM-DD>
READ_TIME: <X min read, e.g., 3 min read>
HERO_IMAGE: <High-resolution 16:10 or 4:3 lifestyle image URL (Unsplash or Amazon product lifestyle photo)>
SUMMARY: <1-2 sentence editorial subheadline summarizing the aesthetic and price/value proposition>
PIN_TITLE: <Pinterest SEO Title (max 90 chars) optimized for Pinterest search>
PIN_DESCRIPTION: <2-3 sentence keyword-rich Pinterest Pin description for high organic impressions>
PIN_BOARD: <Suggested Pinterest Board Name, e.g., Warm Minimalist Living Room Decor>

--- PRODUCT ---
NAME: <Specific Product Name Including Key Material/Size>
PRICE: $<XX.XX>
BADGE: <Short 2-3 Word Editorial Badge>
IMAGE: <Direct HTTPS Product or Lifestyle Image URL>
AMAZON_URL: https://www.amazon.com/dp/<10_CHAR_ASIN>?tag=${cleanTag}
VERDICT: <1-2 sentence tactile editorial verdict explaining why it is worth buying and how to style it.>

--- PRODUCT ---
NAME: <Product #2 Name>
PRICE: $<XX.XX>
BADGE: <Short 2-3 Word Editorial Badge>
IMAGE: <Direct HTTPS Image URL>
AMAZON_URL: https://www.amazon.com/dp/<10_CHAR_ASIN>?tag=${cleanTag}
VERDICT: <1-2 sentence tactile editorial verdict.>
\`\`\`

---

## 4. Strict Formatting Rules for the AI
1. **Single-Line Values**: Every \`KEY: VALUE\` pair MUST be on a single line (do not wrap \`VERDICT\` or \`SUMMARY\` across multiple lines with line breaks).
2. **Amazon Affiliate Tag**: Every \`AMAZON_URL\` MUST include \`?tag=${cleanTag}\` (or if the user gives you raw Amazon links/ASINs, convert them to \`https://www.amazon.com/dp/ASIN?tag=${cleanTag}\`).
3. **Product Separators**: Separate every item with a line containing exactly \`--- PRODUCT ---\`.
4. **Reliable Images**: If the user does not provide image URLs, use reliable high-resolution Unsplash interior/product photography URLs formatted as \`https://images.unsplash.com/photo-...?auto=format&fit=crop&w=900&q=80\`.

---

## 5. Example Prompt You Can Send to Your AI With This File
> "Attached is \`instruction.md\` for my website **${siteName}**. Please generate a complete \`.txt\` page file with 6 curated products for the topic: **[Insert Topic or Paste Raw Amazon Links Here]**. Follow the exact \`KEY: VALUE\` and \`--- PRODUCT ---\` format so I can save it as a \`.txt\` file and upload it."
`;
}
