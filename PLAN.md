# Implementation plan: TODO (2026-09-07, evening)

End-user plugin. Closed identity / AVIF / mouse history / Change Title / comments stay closed. This replaces the morning plan. Plugin id stays `pegasus-media-tracker`. Do not install dependencies.

## ninja: do we build this?

Yes — these are bugs and an explicit revert, not new product. Do **not** re-open numbering, Cover.md, zoom *behavior*, LiveSync, startup-open, or the Pegasus name.

## Product, restated from the new TODOs

1. The Comics grid is back. Homepage rows are gone (user: revert, needs grooming).
2. Add New / Change Title accept `:` (Supergirl: Woman of Tomorrow) without an error. Same screenshot still happens if they rename the **folder** in the file tree — that path cannot contain `:`.
3. Homepage row-title buttons (Comics, Covers Collection, Manga) had no horizontal padding. Revert removes those buttons; do not ship a CSS-only fix for deleted UI.
4. Covers Collection is a library. Libraries do not show **Read** on cards.

## 1. Revert homepage rows (also restores the Comics grid)

**Root cause:** `render()` treats library root as `renderHomepage`: one horizontal row per child, cards = that child’s children. The library-root **grid of collections** (Comics, Manga, Covers Collection, …) is gone. Opening Comics can also look like “one huge cover” if homepage width clamped the displayed column count. Screenshot `image-1.png` is `Library / Comics` with a single Absolute Batman card instead of the series grid.

**ninja:** the user marked homepage rows done with “let’s revert … needs grooming”. YAGNI until there is a new layout spec. Do not keep a flag. Delete the branch.

- Library root uses the same snapping grid as every other folder (`renderCards` + `.media-tracker-grid`).
- Remove `renderHomepage`, `renderHomeRow`, `.media-tracker-home*`.
- Keep `isLibraryRoot` (needed for Read / Add New below) and `openHomepage()` (startup still means “library root”, not rows).
- README: library root is a card grid again, not Netflix rows.

`grid-view.ts`, `styles.css`, `README.md`.

**Row-title padding (`image-2.png`):** those pills are `.media-tracker-home-row-title` with `padding: 0`. They die with this revert. No separate commit.

## 2. Read only on series issues, not libraries

**Root cause:** `renderCards` always uses `createItemCard` (which always draws **Read**) for markdown notes. Covers Collection is a library-root child. A note there (`X-Men.md`) is classified as an item, so the homepage row (and the folder grid) shows Read. Collection folders (Absolute Batman under Comics) correctly have no Read. Screenshot `image-3.png`.

**ninja:** Read means “this is an issue in a series” (`add-next`). A library creates collections (`add-new`). Immediate children of the library folder are always libraries, even if they currently contain only notes (Covers Collection).

- `addToolbarMode`: if the folder is an immediate child of `libraryFolder`, return `add-new` (same as `isParentCollection`).
- `renderCards`: **Read** only when mode is `add-next`. Notes in a library folder are still cards (cover + title) but without the action button — do not pretend they are collections.

Reuse `createCollectionCard` for those notes only if click-to-open-file is wired; otherwise a small `createItemCard` option `showAction: false`. Fewest files: one optional flag on `createItemCard`.

`library.ts` (`addToolbarMode`), `cards.ts`, `grid-view.ts` (`renderCards` needs the current folder’s mode). Still required after homepage revert.

## 3. Colon in collection titles (still broken for the user)

Add New already slugs the **folder** and writes `title` on Cover.md. The attached screenshot is still Obsidian’s **file-tree rename** tooltip (`File name cannot contain … :`). Windows will never allow `:` in a path.

**ninja:** two surfaces.

**Our prompt (must work):**

- Slug every colon variant (`:` and fullwidth `：`), never pass them to `createFolder`.
- Write `title` as quoted YAML **in the Cover.md we create**, not only via a later `processFrontMatter` (if that throws, the user sees an error after the folder exists).
- Change Title stays frontmatter-only; it must not rename the folder.

**File explorer rename (cannot work):** do not hook `vault.on("rename")` to rewrite illegal names. That fights the OS. README one line: use **Add New** / **Change Title** for `:` ; renaming the folder in the file tree cannot.

If Add New still Notices after the YAML change, that is the remaining code bug — find the throw, do not mask it.

`actions.ts` (`folderSlug`, `ensureCoverNote` / `createCollection`), `README.md`.

## Implementation order

Each step is shippable.

1. **Revert homepage rows** — grid back at library root; padding TODO becomes moot.
2. **Read gating** — libraries (incl. Covers Collection) have no Read.
3. **Colon** — prompt + Cover.md YAML; document file-tree rename.

## Testing

- Library root is a grid of Comics / Covers Collection / Manga / … cards again, not labeled rows. Drill into Comics: many series cards, not one full-pane cover. Zoom − / + still snaps.
- Covers Collection: **Add New**, no **Read** on notes or collection cards. A series folder (issues) still has Read.
- Add New `Supergirl: Woman of Tomorrow`: no Notice, folder name has no `:`, card/breadcrumb show the colon via `title`. Change Title with `:` succeeds. Renaming that folder in the file tree to add `:` still fails (OS) — expected.
- Startup still opens the library-root grid. Mouse back/forward still walks folders.

## Explicit non-goals

- Redesigning homepage rows (groom later)
- Padding CSS for row-title buttons (deleted with revert)
- Allowing `:` in filesystem folder names
- Intercepting Obsidian’s native file-tree rename
- Re-litigating Cover.md, zoom mechanics, LiveSync, plugin id
- New npm dependencies
