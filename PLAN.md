# Implementation plan: Obsidian media tracker

End-user Obsidian community plugin. Vault-local, no network. Robustness: survive reload, empty folders, mixed folder/note children, and missing covers. Not a one-off script.

## ninja: do we build this?

Yes, but only the README's actual product: a drill-in card grid over existing vault folders, a customizable done button on item notes, and "add next numbered note" in the current collection.

Do **not** build a second hierarchy ("grid-notes" that duplicate folders), do **not** add React/Dataview/cover APIs, and do **not** special-case comics vs shows in code. Those are either already in Obsidian or they are later features.

## Product, restated

1. Open a grid of collection cards (Google Images density: cover + title).
2. Click a collection → same view, now showing that folder's children.
3. Children are either nested collections (folders) or items (notes) as simple cards.
4. Each item card has a button whose label is settings-driven (`Read`, `Watched`, …) and toggles done state on the note.
5. "Add" in a collection creates the next note: folder `X-Men` with `#1`…`#16` → `X-Men #17`.

Media type is data, not code. Comics, manga, series, and shows are the same tree.

## ninja: data model — folders are the tree

README is unsure about "grid-note vs folder". Obsidian already has a tree: `TFolder` / `TFile`. A parallel note-graph would desync and double the write path.

| Vault | Plugin |
| --- | --- |
| Configured root folder | Library |
| Subfolder | Collection (may nest: `Shows/Good Girls/Season 1`) |
| Markdown note | Item |
| Optional folder note (`Season 1.md` beside `Season 1/`) | Collection metadata only |

```
Media/                          ← settings.libraryFolder
  Comics/
    X-Men/
      X-Men #1.md
      X-Men #16.md
  Manga/
    Death Note/
      Death Note #1.md
  Shows/
    Good Girls/
      Season 1/
        Good Girls S01 #1.md
```

**Item vs collection in a mixed folder:** subfolders render as collection cards; `.md` notes render as item cards. Ignore the folder note so it does not appear twice.

**Out of scope (YAGNI):** tagging a note as a collection, virtual collections, or storing the tree in plugin `data.json`.

## ninja: item metadata — YAML frontmatter only

Reuse `MetadataCache` + `fileManager.processFrontMatter`. No custom database.

```yaml
---
cover: "[[covers/xmen-1.jpg]]"   # optional; wikilink, vault path, or URL
done: false
---
```

**Cover resolution, in order:** `cover` frontmatter → first embedded image in the note → first image file in the same folder. If none, show the title on a themed placeholder. Do not fetch covers from the internet (Obsidian plugin guidelines: local by default).

**Done state:** boolean `done`. The button label is not stored per note; it comes from settings (and an optional collection override). That keeps comics and shows in one library without a `type` enum in v1.

Collection override, optional, on the folder note:

```yaml
---
action: Watched
cover: "[[covers/good-girls.jpg]]"
---
```

If absent, use plugin setting `actionLabel` (default `"Read"`). Button idle copy is `actionLabel`; after `done: true` it is `Undo {actionLabel}`.

## ninja: next-note naming

One function, no media-type branches.

1. Collection title = folder name (`X-Men`).
2. Scan sibling markdown files (not nested folders).
3. Match `^(?:{escapedTitle}\s*)?#\s*(\d+)\s*$` or title prefix + `#N` (so both `X-Men #16` and `#16` count).
4. Next number = max match + 1, or `1` if none.
5. Create `{Title} #{n}.md` with default frontmatter `done: false`.

If the file already exists, bump until free. Do not rename existing notes.

Season folders work unchanged: `Season 1` + existing `Good Girls S01 #3` still increments from parsed `#N` among siblings. If names do not contain `#N`, fall back to `{folderName} #1`. Do not invent `S01E04` parsers in v1.

## Architecture (SOLID, few files)

Reuse the official [obsidian-sample-plugin](https://github.com/obsidianmd/obsidian-sample-plugin): TypeScript, npm, esbuild, `strict`. `main.ts` is lifecycle only. No extra runtime dependencies.

```
src/
  main.ts              # onload: settings, view, commands, ribbon, listeners
  settings.ts          # types, defaults, PluginSettingTab
  types.ts             # LibraryNode, CollectionNode, ItemNode
  library.ts           # vault → tree (read-only)
  naming.ts            # next issue title
  cover.ts             # resolve cover path / resource
  commands.ts          # open view, add next item
  ui/
    grid-view.ts       # ItemView: breadcrumb + card grid
    cards.ts           # collection card vs item card DOM
styles.css
manifest.json
```

**S:** `library.ts` does not touch DOM; `grid-view.ts` does not write files; `naming.ts` is pure.

**O:** new media kinds = folder layout + `actionLabel`, not new classes.

**D:** view depends on `LibraryNode[]`, not on `app.vault` internals beyond what `library.ts` already mapped.

**Reuse, do not wrap:** `ItemView`, `WorkspaceLeaf`, `PluginSettingTab`, `TFile`/`TFolder`, `getFirstLinkpathDest`, `vault.getResourcePath`, `registerEvent` / `registerDomEvent`.

**Do not install:** React, Svelte, Tailwind, Dataview as a dependency. Cards are a CSS grid + Obsidian `--` theme variables so the plugin follows the user's theme.

## View behavior

Custom `ItemView` type `media-tracker`. One instance; drill-in is view state (`currentFolderPath`), not a stack of leaves.

- Ribbon icon + command **Open media tracker**.
- Breadcrumb: `Media / Shows / Good Girls / Season 1` — each segment navigates up.
- Collection card click → set `currentFolderPath`, re-render.
- Item card: cover, title, action button. Title click opens the note in a new leaf (`openLinkText`). Button click toggles `done` via `processFrontMatter` and updates that card only.
- Toolbar on a collection: **Add** → `naming.ts` + `vault.create`.
- Empty collection: short prompt + **Add**.
- Live updates: `this.registerEvent` on `vault.on("create"|"modify"|"delete"|"rename")` and `metadataCache.on("changed")`, scoped to the library folder, debounced (~200ms). Rebuild only the visible folder.

`isDesktopOnly: false`. Grid is CSS; no Electron APIs.

## Settings (v1)

| Key | Default | Purpose |
| --- | --- | --- |
| `libraryFolder` | `Media` | Root to scan; do not index the whole vault |
| `actionLabel` | `Read` | Button text for items without a collection override |

Folder picker via `this.app.vault.getAllFolders()` (or equivalent) in the settings tab. Creating the root folder if missing is a single `vault.createFolder` on first **Add** or a settings button — not on `onload`.

## Implementation order

Each step is shippable; stop if a later step is unused.

1. **Scaffold** from the sample plugin. `id`: `media-tracker` (no `obsidian-` in the id; repo name can keep it). `manifest.json`, esbuild, `.gitignore` excluding `main.js` / `node_modules`.
2. **`library.ts` + tests as plain functions** for folder walk and "folder note" exclusion. Manual check in a vault before UI.
3. **`GridView`**: collections only, title cards, drill-in + breadcrumb. No covers yet.
4. **`cover.ts`** + CSS grid (thumbnail, object-fit, placeholder).
5. **Done button** + `processFrontMatter`; visual state on the card (`done` class).
6. **Add next note** (toolbar + command, folder-aware).
7. **Settings tab** + collection `action` override.
8. **Polish:** empty/error states, debounce, unload safety, README for users (install, folder layout, frontmatter). Keep this `PLAN.md` as the engineering record.

## Testing

No extra test runner in v1 unless we already have one from the sample. `naming.ts` and cover fallback order are small enough to verify with a few vault fixtures by hand:

- Empty library / missing root
- Collection with 0, 1, and 16 numbered notes
- Mixed folder (subcollections + items)
- Folder note present
- Toggle done, reload Obsidian, confirm YAML persisted
- Nested `Shows/Good Girls/Season 1`
- Mobile width: grid collapses, button still tappable

## Explicit non-goals (v1)

- ComicVine / TMDB / any cover download
- Dataview or Bases integration
- `media-grid` markdown code blocks
- `SxxEyy` or volume-vs-issue parsers
- Drag-reorder, ratings, progress percents, sync from AniList/MAL
- Community-plugin directory submission (do after a working local plugin)

## Plugin guidelines (constraints, not extra features)

Startup stays cheap: do not walk the library in `onload`; walk when the view opens. No telemetry. Register every listener. Sentence-case UI ("Add next", "Mark as read").
