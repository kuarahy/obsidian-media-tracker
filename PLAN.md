# Implementation plan: TODO (2026-09-07)

End-user plugin. Closed items from the 2026-09-06 plan stay closed (Cover.md, Change Cover, snapping zoom, two-line titles, Covers Collection vs `assets/covers/`). This replaces that executed plan. Robustness: existing vaults keep working; folder paths stay legal on Windows; plugin id is `pegasus-media-tracker`.

## ninja: do we build this?

Yes. Identity (`pegasus-media-tracker`), mouse history, titles with `:`, a homepage, startup open, AVIF covers, and comments are the remaining product work. Do **not** re-open numbering, Cover.md vs `{series}.md`, zoom, LiveSync, or Add New vs Add Next *behavior*. Do not install dependencies.

## Product, restated from the new TODOs

1. Mouse back / forward walks collection navigation like a browser, without using the breadcrumb.
2. Collection titles may include `: ` (Supergirl: Woman of Tomorrow). The prompt must not fail.
3. **Change Title** sits beside Change Cover and Add Next / Add New.
4. Opening Obsidian lands on the Pegasus Media Tracker homepage.
5. Homepage is rows: Library, Shows, Books — each section is its own row of cards.
6. User-facing name is **Pegasus Media Tracker**. Plugin id is **`pegasus-media-tracker`**.
7. AVIF files work as covers (frontmatter, embeds, folder images, `assets/covers/`, vault-root relocate).
8. Comments on what functions are for, plus README that matches the app.

## 1. Identity: Pegasus Media Tracker / `pegasus-media-tracker`

**Root cause:** `manifest.json` still has `id: media-tracker` and `name: Media Tracker`. The repo is already `pegasus-media-tracker`. The plugin is not in Community Browse, so the id is not frozen yet.

**ninja:** Obsidian’s rule is uniqueness and “must not contain `obsidian`”. `pegasus-media-tracker` is legal. After the first directory submit, id cannot change — do it now. The install folder **must** match the id. View type is persisted in `workspace.json`; keeping `media-tracker` there would be a second identity. Align id, folder, and view type. CSS class names are internal; renaming every `.media-tracker-*` class is a noisy diff with no user-facing gain — leave them.

- `manifest.json` `id`: `pegasus-media-tracker`
- `manifest.json` `name`: `Pegasus Media Tracker`
- `VIEW_TYPE_MEDIA_TRACKER`: `pegasus-media-tracker`
- `package.json` / lockfile `name`: `pegasus-media-tracker`
- View tab, ribbon, command **names**: Pegasus Media Tracker
- Command **ids**: `open-pegasus-media-tracker` / keep add-next id in the same prefix (`add-next-item` can stay — it is not the plugin id)
- README install path: `<vault>/.obsidian/plugins/pegasus-media-tracker/`
- One-line README note: if you already installed as `media-tracker`, move that folder (Obsidian will treat it as a new plugin; re-enable it)

Do not rename CSS classes.

`manifest.json`, `types.ts`, `package.json`, `grid-view.ts`, `main.ts`, `commands.ts`, `README.md`, `RELEASE_PLAN.md`.

## 2. Colon in collection names (and display title)

**Root cause:** `createCollection` uses the typed string as the **folder name**. Windows / Obsidian reject `: * " \ / < > |` (the screenshot). The prompt is fine; the filesystem path is not.

**ninja:** display title ≠ folder name. `Cover.md` is already the collection metadata file (`cover:`, `action:`). Store `title:` there. Folder name is a slug. Same root cause as Change Title — one data model, two buttons.

- Allow any non-empty title in the Add New prompt, including `:`.
- Slug: replace `:` with ` - `, other illegal chars with `-`, collapse junk, trim. `Supergirl: Woman of Tomorrow` → folder `Supergirl - Woman of Tomorrow`.
- If that path exists, append ` 2`, ` 3`, …
- Write `title: "…"` on the new `Cover.md` (the string they typed).
- `listChildren` / breadcrumbs: label = `title` from the folder note, else folder name.
- Still reject `.` / `..` / empty. Still reject `/` and `\` as path separators (those would create nested folders by accident).

Do not rename existing folders. Old collections keep folder-name labels until Change Title.

`actions.ts` (`createCollection`, slug helper), `library.ts` (`readCollectionTitle`), `types.ts` only if `CollectionNode.name` needs a comment — keep `name` as the **label**, `path` as the folder.

## 3. Change Title

Toolbar, beside Change Cover, when the current folder exists (same gate as Change Cover). Reuse `promptForName`.

**Flow:**

1. Prompt with the current display title.
2. Write `title` on `Cover.md` (`ensureCoverNote` first).
3. Do **not** rename the folder.

**ninja:** renaming the folder on every title edit would break wikilinks, history paths, and LiveSync. Title is a label. Slug is created once at Add New.

`actions.ts` (`setCollectionTitle`), `grid-view.ts` toolbar.

## 4. Mouse back / forward

**Root cause:** `openFolder` overwrites `currentFolderPath` and does not keep a stack. Breadcrumb is the only way back. Mouse buttons 3 / 4 do nothing in this view.

**ninja:** this is in-view history, not Obsidian workspace leaf history. Opening a note is not a collection navigation step. Do not persist the stack (browser-session semantics).

- `past: string[]`, `future: string[]` on the view.
- `openFolder(path)` from cards / breadcrumb: push current onto `past`, clear `future`, render.
- Back: if `past` is non-empty, push current onto `future`, pop `past`.
- Forward: if `future` is non-empty, push current onto `past`, pop `future`.
- Ignore no-ops (same path). Cap the stack (~50) so it cannot grow forever.
- Listen on the view: `mouseup` / `auxclick` for `button === 3` (back) and `button === 4` (forward), `preventDefault` so Electron does not steal it.
- No extra toolbar buttons. No Alt+Left unless we already have the handlers (YAGNI).

When a folder in the stack is deleted, drop that entry (the existing delete handler already snaps to library root).

`grid-view.ts` only.

## 5. Homepage rows

Homepage = library root (`currentFolderPath === settings.libraryFolder`).

**ninja:** do not hardcode the strings Library / Shows / Books. Those are the user’s top-level folders. Rows = immediate child collections of the library folder. If the library folder is vault root and the vault has `Library`, `Shows`, `Books`, those are the rows. If it is `Media` with `Comics` / `Shows`, those are the rows.

**Layout (homepage only):**

- One labeled row per child collection.
- Row title uses `readCollectionTitle`; click drills into that collection (`openFolder`).
- Cards in the row = `listChildren` of that collection (same cards as today). Click still opens that child.
- If the library root itself has item notes, first row is the library folder’s display name (breadcrumb already uses `Library` when the root path is empty).
- Horizontal strip: flex + `overflow-x: auto`. Card width from the existing column setting so zoom still means something (`flex: 0 0 calc((100% - gaps) / columns)`), extra cards scroll sideways.
- Drill-in (any folder that is not the library root) keeps the current snapping grid. Toolbar, Change Cover, Change Title, Add New / Add Next unchanged.

Empty child collection: show the row title and the empty hint, no fake cards.

`grid-view.ts` (`render` branches homepage vs grid), `styles.css`, reuse `cards.ts`.

## 6. Start Obsidian on the homepage

**Root cause:** the view only opens from the ribbon / command. Workspace restore may leave you in a markdown tab.

**ninja:** `workspace.onLayoutReady` then `activateView()`, and set `currentFolderPath` to the library folder so a restored leaf is the homepage, not the last drilled folder. Default **on**. A setting to turn it off, because stealing focus every launch is hostile if someone lives in notes.

- Setting `openOnStartup` default `true`.
- On layout ready: if enabled, `activateView()`; if the view already exists, `openFolder(libraryFolder)` without pushing history (replace, not navigate).

`main.ts`, `settings.ts`.

## 7. AVIF covers

**Root cause:** `IMAGE_EXTENSIONS` in `cover.ts` is `png jpg jpeg gif webp bmp svg`. Relocate, folder covers, embeds, and `assets/covers/` all call `isImageFile`. AVIF never qualifies.

**ninja:** Chromium already decodes AVIF in `<img>`. Add `"avif"` to the set. Do not add a decoder, npm package, or conversion step. Same path as webp.

If a platform cannot paint AVIF, the card shows a broken image the same way an unsupported webp would — no extra fallback.

README: covers may be png / jpg / webp / avif / ….

`cover.ts` only (README mention in step 8).

## 8. Comments and README

**Code:** one-line `ninja:` (or a short file header) on exported functions that encode a decision (`folderSlug` vs `title`, homepage = library root rows, history is in-view only, `isImageFile` includes avif). Do not narrate `if` bodies.

**README:** Pegasus Media Tracker name, install folder `pegasus-media-tracker`, mouse back/forward, titles with `:`, Change Title, homepage rows, open on startup, AVIF, Cover.md `title:` / `cover:` / `action:`.

## Implementation order

Each step is shippable.

1. **Identity** — id `pegasus-media-tracker`, display name Pegasus Media Tracker.
2. **AVIF** — one-line whitelist (independent, ship immediately after identity).
3. **`title` + folder slug** (colon bug).
4. **Change Title** toolbar button.
5. **Mouse back / forward** history.
6. **Homepage rows** at library root.
7. **Open on startup** + setting.
8. **Comments + README**.

## Testing

- Plugin folder is `pegasus-media-tracker`. Old `media-tracker` folder is not loaded. Tab / ribbon / commands say Pegasus Media Tracker.
- Drop `foo.avif` in a series folder or `assets/covers/`; the card uses it. Vault-root dump relocates like jpg.
- Add New `Supergirl: Woman of Tomorrow` creates a folder without `:`, card shows the colon title, Cover.md has `title:`.
- Change Title on that collection updates the card and breadcrumb; folder path does not change.
- Click Comics → mouse back → library homepage → mouse forward → Comics again. Breadcrumb still works. Opening a note does not consume back.
- Library root shows one row per top-level collection; cards in the Shows row are Shows’ children. Clicking into Shows is the old grid.
- Relaunch Obsidian with the setting on: Pegasus Media Tracker tab is active on the homepage. Setting off: no steal.
- `:` in a title, zoom, Change Cover, Add Next numbering still work on a drilled-in series.

## Explicit non-goals

- Renaming CSS classes `.media-tracker-*`
- Renaming folders when the display title changes
- Hardcoded Library / Shows / Books rows
- Persisting back/forward across reloads
- Keyboard back/forward chrome, extra history toolbar
- AVIF transcoding or a cover-download pipeline
- Re-litigating Cover.md, zoom, LiveSync, numbering
- New npm dependencies
