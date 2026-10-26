# Stetheros Industries website

The company's public website, served free by GitHub Pages.

| Page | Address | What it is |
|---|---|---|
| Catalog (home) | `/` | The official catalog of goods (§3.2) and the service schedule (§8.4), with prices from the company sheet, a discount estimate, bulk prices, and store locations |
| About | `/about/` | The company's story, values and the meaning of the logo |
| Policy | `/policy/` | The full policy document, with a link target for every clause (for example `policy/index.html#s6-5`) |
| Members & Government | `/calculator/` | The member, board and government calculators |

The site has no server and stores nothing. Prices and constants come from one Google Sheet with two tabs, **Constants** and **Catalog**, which the CEO, the board and the Sales role edit.

---

## 1. Set up the company sheet

You may already have the constants sheet from the calculator. Add the catalog to the same spreadsheet as a second tab.

1. Open the company spreadsheet (or create one, signed in with the company's Google account).
2. **Constants tab:** if you don't have it yet, **File → Import → Upload** `constants-template.csv`, choose **Insert new sheet(s)**, and name the tab `Constants`.
3. **Catalog tab:** **File → Import → Upload** `catalog-template.csv`, choose **Insert new sheet(s)**, and name the tab `Catalog`. Replace the example rows with the real catalog.
4. Share the spreadsheet as **Editor** only with the CEO, the board members who may change constants, and the Sales role. Because this tab is the official catalog, editing it changes what members may not sell elsewhere (§3.1).
5. **File → Share → Publish to web**. Publish **each tab separately** as **Comma-separated values (.csv)**: choose the tab under "Link", click **Publish**, copy the link, then repeat for the other tab. Keep **Automatically republish when changes are made** ticked.
6. Paste the two links into `js/config.js`:
   ```js
   window.SHEET_CSV_URL = "…the Constants tab link…";
   window.CATALOG_CSV_URL = "…the Catalog tab link…";
   ```
   If you already set up the calculator, copy `SHEET_CSV_URL` from the old `config.js`.

### Catalog columns

| Column | What to enter |
|---|---|
| `id` | Any short code, such as G001 or S001. Not shown on the site. |
| `type` | `good`, `service` or `store`. Services are listed in their own section. A `store` row is a store location: put the city in `name`, the nation in `category`, and any note in `description`. |
| `category` | A heading such as Metals or Logistics. Goods can be filtered by category. |
| `name` | The item name. |
| `price` | The reference price in Credits, as a number. Leave it empty to show "Price on request" (goods) or "Quoted" (services). |
| `unit` | What the price is for, such as `stack of 64`, `each` or `per trip`. |
| `bulk_min` | The quantity, in the item's unit, from which the bulk discount applies (for example `10` for 10 stacks). Leave it empty for no bulk discount on that item. The discount itself is the `bulk_discount` constant (15% to start) on the Constants tab. |
| `description` | One or two sentences. |
| `image` | A file name in the `images/` folder (for example `iron-ingots.png`), or a full `https://` link. Leave it empty for a plain tile. |
| `visible` | `yes` or `no`. `no` hides the item without deleting the row. Empty counts as yes. |
| `sort` | A number that sets the order. Categories follow the order of their first item. |

Keep the row whose `id` is `last_updated`, and put the date of each change in its `name` column. The site shows it as "Last updated".

The service row whose `id` is `DELIVERY` lists delivery in the Services section. Its price always shows as "Quoted by a board member", because delivery rates are quoted per order.

**If you already have a Constants tab,** add one row to it: `bulk_discount` with the value `15%`. Until you do, the site uses 15% and the calculator shows a note that the row is missing.

### Images

Upload image files to the repository's `images/` folder (**Add file → Upload files**, then open the `images` folder first, or drag the files in with the folder). Then enter the file name in the `image` column. File names are case-sensitive. Images stored in the repository are more reliable than links to Discord, Imgur or Google Drive, which tend to expire or block embedding.

---

## 2. Put the site on GitHub Pages

The site needs its own repository named exactly **`stetheros-industries.github.io`**, so it is served at `https://stetheros-industries.github.io/` with nothing after the slash.

1. Sign in to the company GitHub account and create a new **Public** repository named `stetheros-industries.github.io`.
2. **Add file → Upload files**, drag in **everything inside this folder** (so `index.html` sits at the top level, next to the `assets`, `js`, `calculator`, `policy` and `images` folders) and commit.
3. Check that the folders arrived. GitHub's web upload sometimes drops nested folders; if one is missing, open that folder name in the repository and upload its files there.
4. **Settings → Pages**: Source *Deploy from a branch*, Branch `main`, folder `/ (root)`. Save.
5. After a minute or two the site is live at `https://stetheros-industries.github.io/`.

### The old calculator address

The old `Company-Calculator` repository keeps working at its address until you change it. To send visitors to the new site, upload the two files in the `old-repo-redirect` folder, which sits next to the `site` folder in the download (`index.html` and `policy.html`), to the **Company-Calculator** repository, replacing the files there. Each page then forwards to its new location.

---

## 3. Routine updates

- **Prices and catalog items:** edit the Catalog tab and update `last_updated`. The website changes on the next reload.
- **Constants:** edit the Constants tab and update `last_updated` there.
- **Policy document:** in Claude, click the document's name → **Export → Markdown**, rename the file `policy.md`, and upload it into the repository's **`policy` folder**, replacing the old one.

The Markdown export leaves out images. The policy page puts the formulas back from `js/doc-formulas.js`, keyed by clause number. If a revision changes a formula itself, `js/doc-formulas.js`, `js/formulas.js` and `js/calculators.js` need updating too.

---

## Files

| Path | What it is |
|---|---|
| `index.html`, `js/catalog.js` | Catalog home page |
| `about/index.html`, `assets/diamonds.png`, `assets/logo-full.png` | About page and logo art |
| `assets/share-card.png` | The image shown when a link is shared on Discord and similar apps |
| `calculator/index.html`, `js/app.js`, `js/calculators.js`, `js/formulas.js` | Calculator |
| `policy/index.html`, `policy/policy.md`, `js/policy.js`, `js/doc-formulas.js` | Policy page and its text |
| `js/config.js` | Sheet links, starting values and allowed ranges for constants |
| `js/common.js` | Shared loading and formatting |
| `assets/` | Stylesheet, logo and icons |
| `images/` | Catalog images |
| `catalog-template.csv`, `constants-template.csv` | Starting tabs for the sheet. The site shows `catalog-template.csv` as example items until the Catalog link is set. |

To test on your own computer, run `python -m http.server` in this folder and open `http://localhost:8000`. Pages that read files fail when opened by double-clicking.
