# Retunda — Access Control & Clean Public Storefront Plan

## 1. Goal: 100% Clean Public Storefront + Secret Creator Gate
To ensure public visitors arriving from Pinterest can **only** browse your curated pages and click through to Amazon (and never see or touch any page-building tools, `.txt` file paths, or affiliate tag settings), **Retunda** will separate into two strict modes:

---

## 2. Public Shopper Mode (Default for Everyone)
When any visitor opens your website (`/` or `/?page=<slug>`), all admin and creator UI is completely hidden:
* **Removed from Public View**:
  * No `Amazon Tag: retunda-20` editor in the top bar.
  * No `+ Add Page (.txt)`, `Edit .txt`, `2:3 Pin`, or `How It Works` buttons.
  * No `src/content/pages/*.txt` file path labels on cards or headers.
  * No `Copy Pinterest Profile URL` or `Copy Pin URL` utility buttons.
* **What Public Visitors See**:
  * Clean **Retunda** masthead and category navigation (`All`, `Living Room`, `Kitchen & Dining`, `Workspace`, `Bath & Spa`, `Direct Picks`).
  * Curated editorial roundups and numbered product showcase cards.
  * High-contrast **"Check Price on Amazon"** / **"Shop on Amazon"** buttons that automatically use the `AMAZON_TAG` stored in `src/content/site-config.txt`.
* **Read-Only Content**:
  * Public visitors always read directly from your bundled `src/content/site-config.txt`, `src/content/affiliate-links.txt`, and `src/content/pages/*.txt` files. No one can alter your live site's links or pages.

---

## 3. Secret Creator Access (`?admin=retunda` + Passcode Gate)
Only **you** can unlock the creator tools to build new `.txt` pages or generate Pinterest Pins:
1. **Secret URL Trigger**:
   * Navigate to your site with **`?admin=retunda`** added to the URL (e.g., `https://your-site.com/?admin=retunda`), **or** press the secret keyboard shortcut **`Shift + Alt + A`**.
2. **Passcode Verification Modal**:
   * Prompts you for your Creator Passcode (configured in `src/content/site-config.txt` under `ADMIN_PASSCODE: retunda2026` or via `.env` `VITE_ADMIN_PASSCODE`).
3. **Unlocked Creator Toolbar (Session-Only)**:
   * Once unlocked in your browser tab (`sessionStorage`), a sleek dark **Creator Mode Bar** appears at the top giving you access to:
     * **+ Add / Edit Page (`.txt` Generator)**
     * **2:3 Pinterest Pin Graphic & SEO Copy Studio**
     * **1-Click Copy Pinterest Destination Links**
     * **How It Works & Hosting Guide**
     * **Lock Admin Mode** button (instantly hides all creator tools and returns to the public shopper view).

---

## 4. Files to Update
1. **`src/content/site-config.txt`**: Add `ADMIN_PASSCODE: retunda2026` (and `ADMIN_KEY: retunda`) so you can change your secret URL key or passcode directly in the text file anytime.
2. **`src/utils/flatFileEngine.ts`**: Parse `adminKey` and `adminPasscode` from `site-config.txt`.
3. **`src/components/AdminPasscodeModal.tsx`**: Clean passcode prompt modal triggered only when `?admin=<ADMIN_KEY>` or `Shift + Alt + A` is used.
4. **`src/App.tsx`**: Strip all admin buttons, file names, and tag editors from the public storefront view, and only render the Creator Toolbar when `isAdminUnlocked` is `true`.
