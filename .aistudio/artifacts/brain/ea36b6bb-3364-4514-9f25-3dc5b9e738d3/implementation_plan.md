# Retunda — Pure React & Flat-File Pinterest-to-Amazon Affiliate Website

## 1. Overview & Architecture (No Server, No Database)
**Retunda** is a fast, 100% client-side React frontend application designed to sit between your **Pinterest Profile / Pins** and **Amazon Associates**. 

Instead of requiring a backend server or database, **Retunda** uses a **Flat-File Content Folder (`src/content/`)** where all site settings, pages, and Amazon affiliate links live in plain, human-readable `.txt` files. React automatically discovers and renders every file in that folder as a dynamic page with its own shareable Pinterest URL (`?page=<slug>`).

---

## 2. Aesthetic & Brand Direction ("Retunda")
* **Domain**: Curated Home Decor, Lifestyle & Aesthetic Amazon Finds
* **Aesthetic Persona**: Warm Editorial Storefront (*Architectural Digest Clever* / *Kinfolk* / *The Strategist*)
* **Color Palette**:
  * Background Primary: `#FAF9F6` (Warm Alabaster)
  * Background Elevated / Card Surface: `#F3F1EC` (Soft Travertine)
  * Text Primary: `#1C1917` (Deep Stone Ink)
  * Text Secondary: `#57534E` (Warm Charcoal)
  * Accent Primary: `#B45309` (Warm Amber-Bronze)
  * Border Hairline: `#E7E5E0` (`1px solid` editorial dividers)
* **Typography**:
  * Display Serif: `'Fraunces'` for the **Retunda** masthead and page titles
  * UI & Body Sans: `'Plus Jakarta Sans'` for scannable product verdicts and CTAs
  * Monospace: `'JetBrains Mono'` with `tabular-nums` for prices, ASINs, and file paths

---

## 3. Flat-File Folder Structure (`src/content/`)
All of your website's data and Amazon affiliate links are stored in plain text files inside `src/content/` so you can edit them directly or add new files anytime:

1. **`src/content/site-config.txt`**
   Stores your global site settings in simple `KEY: VALUE` lines:
   * `SITE_NAME: Retunda`
   * `TAGLINE: Curated Home, Lifestyle & Aesthetic Amazon Finds`
   * `AMAZON_TAG: retunda-20`
   * `PINTEREST_PROFILE: https://pinterest.com/retunda`

2. **`src/content/affiliate-links.txt`**
   A master flat text catalog of your quick-shop Amazon affiliate links, categories, prices, and images.

3. **`src/content/pages/*.txt` (Dynamic Pages Folder)**
   Every `.txt` file placed inside `src/content/pages/` automatically becomes a live, shareable landing page on your website (loaded dynamically via Vite's `import.meta.glob`—no coding or React imports required).
   * Example files pre-loaded for you:
     * `src/content/pages/cozy-linen-living-room.txt` → `?page=cozy-linen-living-room`
     * `src/content/pages/aesthetic-kitchen-counter-organization.txt` → `?page=aesthetic-kitchen-counter-organization`
     * `src/content/pages/minimalist-home-office-desk-setup.txt` → `?page=minimalist-home-office-desk-setup`
     * `src/content/pages/boutique-bathroom-spa-upgrades.txt` → `?page=boutique-bathroom-spa-upgrades`

   **Simple Flat-File Format (Easy to read & edit by hand or via the in-app generator):**
   ```text
   TITLE: 7 Warm Minimalist Living Room Finds on Amazon
   SLUG: cozy-linen-living-room
   CATEGORY: Living Room
   DATE: 2026-11-05
   HERO_IMAGE: https://images.unsplash.com/...
   SUMMARY: Designer-inspired bouclé textures, travertine accents, and warm ambient lighting under $95.
   PIN_TITLE: 7 Cozy Minimalist Living Room Amazon Finds That Look High-End
   PIN_DESCRIPTION: Upgrade your living room on a budget with these curated neutral Amazon home decor finds...

   --- PRODUCT ---
   NAME: Handcrafted Ceramic Fluted Vase
   PRICE: $34.00
   BADGE: Editor's Pick
   IMAGE: https://images.unsplash.com/...
   AMAZON_URL: https://www.amazon.com/dp/B08XYZ1234?tag=retunda-20
   VERDICT: Heavyweight matte stoneware that styles effortlessly with dried olive branches.
   ```

---

## 4. Core Features & How You Add New Pages

### A. Public Storefront & Pinterest Bridge Pages
* **Home Storefront (`/`)**: Displays the **Retunda** masthead, category filter bar (`All`, `Living Room`, `Kitchen & Dining`, `Workspace`, `Bath & Spa`, `Quick Links`), featured editorial pages, and a direct "Quick Shop Amazon Links" directory read from `affiliate-links.txt`.
* **Dedicated Pinterest Landing Pages (`/?page=<slug>`)**:
  * When a Pinterest user clicks your Pin, they land directly on `https://your-site-url/?page=cozy-linen-living-room`.
  * Includes an automatic **FTC Amazon Associate Disclosure** banner at the top.
  * Displays numbered product showcase cards with high-contrast **"View on Amazon"** buttons that automatically attach your `AMAZON_TAG` (`?tag=retunda-20`).
  * Includes a **"Copy Pinterest Destination URL"** button on every page so you can paste the exact link into Pinterest in one click.

### B. Built-In "Add / Edit Page" Studio & Flat-File Generator
To make adding new pages effortless without memorizing file formatting:
* **Visual Page & Link Builder**: Fill out a clean form with your Page Title, Category, Summary, and paste raw Amazon links or ASINs.
* **Automatic Amazon Affiliate Link Formatter**: Paste any raw Amazon link and it automatically cleans it to `https://www.amazon.com/dp/ASIN?tag=retunda-20`.
* **2 Ways to Publish New Pages**:
  1. **Instant Browser Preview**: Save the page immediately in your browser (`localStorage`) to preview and test how it looks.
  2. **1-Click `.txt` File Download / Copy**: Click **"Download `slug.txt` File"** or **"Copy Flat-File Text"** and drop that `.txt` file into `src/content/pages/` in your project—Retunda automatically detects the new file and makes it a permanent page on your website!

### C. 2:3 Pinterest Pin Graphic & SEO Copy Generator
* **HTML5 Canvas Pin Studio (`1000 × 1500 px`)**: Automatically turns any page in your `src/content/pages/` folder into a downloadable 2:3 vertical Pinterest Pin PNG with 3 layout styles (*Editorial Collage*, *Numbered Listicle*, *Single Hero Find*).
* **Ready-to-Paste Pinterest Fields**: Displays the Pin Title, SEO Description, and exact Destination URL (`?page=<slug>`) with 1-click copy buttons.

### D. Static Hosting & Flat-File Guide
* An in-app **"How to Add Pages & Host for Free"** guide showing:
  1. How to drop a new `.txt` file into `src/content/pages/` to create a new page.
  2. How to edit `src/content/affiliate-links.txt` or `src/content/site-config.txt`.
  3. How to deploy your pure React static build (`npm run build` → `dist/`) for free on **Netlify, Vercel, Cloudflare Pages, GitHub Pages, or AI Studio Cloud Run** and attach the URL to your Pinterest profile.
