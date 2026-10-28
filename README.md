# Stetheros Industries website

The company's public website, served free by GitHub Pages.

| Page | Address | What it is |
|---|---|---|
| Catalog (home) | `/` | The official catalog of goods (§3.2) and the service schedule (§8.4), with prices from the company sheet, a discount estimate, bulk prices, and store locations |
| About | `/about/` | The company's story, members, values, and the meaning of the logo |
| Policy | `/policy/` | The full policy document, with a link target for every clause (for example `policy/index.html#s6-5`) |
| Members & Government | `/calculator/` | The member, board, and government calculators |

The site has no server and stores nothing. Prices, stores, members, and constants come from one Google Sheet with two tabs, **Constants** and **Catalog**, which the CEO, the board, and the Sales role edit.

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
| `type` | `good`, `service`, `store`, `member`, `brand`, `nation`, or `notice`. Services are listed in their own section. A `store` row is a store location: put the city in `name`, the nation in `category`, any note in `description`, and a photo of the store or city in `image`. A `member` row is a company member shown on the About page: put the name in `name` and the role, if any, in `category` (for example `CEO & Board`). A `brand` row is a branded division (see below). A `nation` row is a nation that has signed the Stetheros Compact: put its name in `name` and, optionally, a short note in `description`. These are listed under the discount picker when a visitor chooses the Compact discount, and the list is hidden while there are none. A `notice` row is an announcement banner (see below). |
| `category` | A heading such as Metals or Logistics. Goods can be filtered by category. A good or service can have several, separated by commas, such as `Metals, Components`; it then appears under each of those filters. (For `store`, `member`, and `brand` rows this column holds the nation, the role, or the colors, as described below.) |
| `name` | The item name. |
| `price` | The reference price in Credits, as a number. Leave it empty to show "Price on request" (goods) or "Quoted" (services). |
| `unit` | What the price is for, such as `stack of 64`, `each`, or `per trip`. |
| `bulk_min` | The quantity, in the item's unit, from which the bulk discount applies (for example `10` for 10 stacks). Leave it empty for no bulk discount on that item. The discount itself is the `bulk_discount` constant (15% to start) on the Constants tab. |
| `sale` | A sale on this good or service, such as `20%`. Leave it empty for no sale. The sale price is shown with the full price struck through, the item is tagged "Sale", and an "On sale" filter appears. It combines with the customer's own discount and the bulk discount. |
| `sale_from` | Optional. The first day of the sale, as `2026-11-01` or `11/1/2026`. Before that day the sale is not shown. |
| `sale_until` | Optional. The last day of the sale, in the same format. After that day the sale disappears by itself, so you do not have to remember to remove it. A date the site cannot read hides the sale rather than risk advertising an old one. |
| `brand` | For a good or service sold by a branded division (policy §3.8), the division's key, such as `IHI`. The item gets the division's badge in the main catalog and also appears in the division's own section. Leave it empty for Stetheros items. |
| `description` | One or two sentences. |
| `details` | Optional. Longer information shown when a visitor clicks **More info**, such as what a service includes, what the buyer supplies, and lead times. Leave a blank line between paragraphs; start a line with `- ` to make it a bullet point. In Google Sheets, press Ctrl+Enter (Cmd+Enter on a Mac) for a new line inside a cell. |
| `gallery` | Optional. Extra pictures for the More info window: file names in the `images/` folder (or `https://` links), separated by commas, for example `rail-1.png, rail-2.png`. |
| `contact` | Optional. Who to message about this item, for example `@IsoKamakazi`. Leave it empty and the site says to message someone with the @Sales role. |
| `listed` | Optional. The date the item was added, as `2026-11-01` or `11/1/2026`. The item shows a teal **New** label for 8 days, counting that day, and the label then disappears by itself. |
| `image` | A file name in the `images/` folder (for example `iron-ingots.png` or `stetheros-store.png`), or a full `https://` link. Leave it empty for a plain tile. Goods use a 4:3 picture; stores use a wider one, about 16:9. |
| `stock` | Optional. `in stock`, `low`, `out of stock`, or `made to order`. Cards show Low stock, Out of stock, and Made to order; the item window also shows In stock. When any good is out of stock, a **Hide out of stock** box appears above the goods. Leave it empty to show nothing. |
| `coords` | Stores only, optional. The store's coordinates, as `1200 64 -340` (X Y Z) or `1200 -340` (X Z). Visitors get a **Copy** button that copies them. |
| `map` | Stores only, optional. A `https://` link to the store on a web map, shown as **Open map**. |
| `visible` | `yes` or `no`. `no` hides the item without deleting the row. Empty counts as yes. |
| `sort` | A number that sets the order. Categories follow the order of their first item. |

Keep the row whose `id` is `last_updated`, and put the date of each change in its `name` column. The site shows it as "Last updated".

The service row whose `id` is `DELIVERY` lists delivery in the Services section. Its price always shows as "Quoted by a board member", because delivery rates are quoted per order.

**If you already imported the Catalog tab,** add three columns with the headings `sale`, `sale_from`, and `sale_until`. The site reads columns by their heading, so they can go anywhere. Then add the member rows: type `member`, the name in `name`, the role in `category`.

**More info windows.** An item gets a **More info** button only when its `details` or `gallery` cell has something in it. The window shows the pictures, the details, and how to buy or book: a link to the company Discord server and who to message. Each window has its own link (for example `…/index.html#item-S002`), which visitors can copy and share. The Discord invite is set in `js/catalog.js`; to change it, add `window.DISCORD_URL = "…";` to `js/config.js`. Make sure the invite is set to never expire, or the link will stop working.

**Branded divisions.** Add a column headed `brand` (anywhere; the site reads columns by their heading), then one row per division: type `brand`, its key in `id` (for example `IHI`), its name in `name`, its logo file in `image` (for example `ihi-logo.png`, uploaded to the `images` folder), and an optional short line in `description`. In `category`, put up to three colors: the accent, a highlight, and the background, for example `#2563FF #F42F66 #050810`. Each division gets its own dark section near the bottom of the catalog, labeled as a branded division of Stetheros Industries. A division exists only after a 66% vote of the whole board (§3.8). If it ends, set its row's `visible` to `no` and clear the `brand` cells of its items.

**Announcements.** Add a row with type `notice`. Put the headline in `name` (for example `Winter sale.`) and the text in `description`. `sale_from` and `sale_until` set the first and last day it shows; leave both empty to show it until you hide the row. Put `warning` in `category` for an amber banner, or `sale` for an orange edge. Visitors can dismiss a notice, and a notice you reword shows again.

**If you already imported the Catalog tab,** add the columns `stock`, `coords`, and `map` (anywhere; the site reads columns by their heading). Leave them empty where they don't apply.

**If you already have a Constants tab,** add one row to it: `bulk_discount` with the value `15%`. Until you do, the site uses 15% and the calculator shows a note that the row is missing.

### Images

Upload image files to the repository's `images/` folder (**Add file → Upload files**, then open the `images` folder first, or drag the files in with the folder). Then enter the file name in the `image` column. Images stored in the repository are more reliable than links to Discord, Imgur, or Google Drive, which tend to expire or block embedding.

**Pictures are shrunk automatically.** Upload pictures at any size. A minute or two after each upload, GitHub makes small copies in `images/thumb/` (cards), `images/opt/` (the item window), and `images/og/` (link previews), and the site uses those, so a 6 MB screenshot reaches visitors as about 20 KB. The original is kept unchanged. Until the copies exist, the site shows the original, so nothing breaks in the meantime. You can follow progress under the repository's **Actions** tab ("Update site files"). Do not upload into the `opt`, `thumb`, or `og` folders yourself; they are rebuilt automatically.

The copies are named by the original's name in lower case, so `Iron.png` and `iron.png` in the sheet both work.

---

## 2. Put the site on GitHub Pages

The site needs its own repository named exactly **`stetheros-industries.github.io`**, so it is served at `https://stetheros-industries.github.io/` with nothing after the slash.

1. Sign in to the company GitHub account and create a new **Public** repository named `stetheros-industries.github.io`.
2. **Add file → Upload files**, drag in **everything inside this folder** (so `index.html` sits at the top level, next to the `assets`, `js`, `calculator`, `policy`, and `images` folders) and commit.
3. Check that the folders arrived. GitHub's web upload sometimes drops nested folders; if one is missing, open that folder name in the repository and upload its files there.
4. **Settings → Pages**: Source *Deploy from a branch*, Branch `main`, folder `/ (root)`. Save.
5. After a minute or two the site is live at `https://stetheros-industries.github.io/`.

### The old calculator address

The old `Company-Calculator` repository keeps working at its address until you change it. To send visitors to the new site, upload the two redirect files (`index.html` and `policy.html`) to the top level of the **Company-Calculator** repository, replacing the files there. Each page then forwards to its new location.

---

### Automatic updates (GitHub Actions)

The file `.github/workflows/site-files.yml` runs on GitHub's servers, at no cost for a public repository. It runs when pictures are uploaded, every hour, and on demand (**Actions → Update site files → Run workflow**). Each run:

- makes the small picture copies described above, and
- builds a page for every good and service at `item/<id>/` from the Catalog tab. When someone pastes an item's link into Discord, the preview shows the item's name, price (with any current sale), description, and picture. Opening the link takes the visitor to the item in the catalog. The **Copy link to this item** button gives these links. A link to an item added since the last run still works: it opens the catalog at that item, without the preview, until the next run.

If a run fails with a permissions error, open **Settings → Actions → General → Workflow permissions**, choose **Read and write permissions**, save, and run it again. GitHub pauses hourly runs after 60 days without any change to the repository; the Actions tab then shows a button to turn them back on.

### Features visitors use

- **Order list.** Visitors open a good or service, choose a quantity, and add it to an order list. The list shows an estimated total with their discount, any sale, and bulk prices; asks for their in-game name and a store to collect from (or delivery); and copies the whole order as a message for the @Sales role on Discord. The list is kept in the visitor's own browser; the site sends nothing.
- **Sort and filter.** Goods and services can be sorted by price, newest, or name. "Featured" follows the `sort` column.
- **Links.** Every policy clause has a **Copy link** button. Each calculator has **Copy a link to these values**, which opens the calculator with the same numbers filled in. Unknown addresses show a "page not found" page with links back into the site.

## 3. Routine updates

- **Prices and catalog items:** edit the Catalog tab and update `last_updated`. The website changes on the next reload.
- **Sales:** a sale is a promotional discount under §3.7 of the policy. Before entering one, get approval from the CEO or the board and the consent of every member who supplies the item from production they own. Then put the percentage in the item's `sale` column, and optionally a `sale_until` date so it ends by itself. Clear the cell to end a sale early.
- **Members:** add, edit, or hide `member` rows on the Catalog tab. The About page changes on the next reload.
- **Constants:** edit the Constants tab and update `last_updated` there.
- **Policy document:** in Claude, click the document's name → **Export → Markdown**, rename the file `policy.md`, and upload it into the repository's **`policy` folder**, replacing the old one.

The Markdown export leaves out images. The policy page puts the formulas back from `js/doc-formulas.js`, keyed by clause number. If a revision changes a formula itself, `js/doc-formulas.js`, `js/formulas.js` and `js/calculators.js` need updating too.

---

## Files

| Path | What it is |
|---|---|
| `index.html`, `js/catalog.js` | Catalog home page |
| `about/index.html`, `js/about.js`, `assets/diamonds.png`, `assets/logo-full.png` | About page, its member list, and logo art |
| `js/header.js` | Keeps the header pinned at the top while scrolling, and adds the back-to-top button on phones |
| `assets/share-card.png` | The image shown when a link is shared on Discord and similar apps |
| `calculator/index.html`, `js/app.js`, `js/calculators.js`, `js/formulas.js` | Calculator |
| `policy/index.html`, `policy/policy.md`, `js/policy.js`, `js/doc-formulas.js` | Policy page and its text |
| `js/config.js` | Sheet links, starting values, and allowed ranges for constants |
| `js/common.js` | Shared loading of both sheet tabs, and formatting |
| `assets/` | Stylesheet, logo, and icons |
| `images/` | Catalog images |
| `404.html` | The "page not found" page, which also forwards item links that have no page yet |
| `item/` | Link-preview pages for each item, built automatically. Do not edit. |
| `images/opt/`, `images/thumb/`, `images/og/` | Small copies of the pictures, built automatically. Do not edit. |
| `.github/workflows/site-files.yml`, `.github/scripts/` | The automatic picture and item-page updates |
| `catalog-template.csv`, `constants-template.csv` | Starting tabs for the sheet. The site shows `catalog-template.csv` as example items until the Catalog link is set. |

To test on your own computer, run `python -m http.server` in this folder and open `http://localhost:8000`. Pages that read files fail when opened by double-clicking.
