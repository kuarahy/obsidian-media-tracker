# Implementation plan: TODO follow-ups

End-user plugin, already shipping. These items are fixes and small creation-path gaps from real vault use, not a v2. Robustness: mixed `#N` / unhashed / `.N` / `vN` titles, missing folder notes, covers that live beside the library, view closed during rename.

## ninja: do we build this?

Yes, against the existing modules. Do **not** add cover APIs, a second tree, React, or a media-type enum. Do **not** move or delete the user's existing root images. Each TODO maps to one root cause; one fix, then the next.

The vault in the screenshots is the spec: `Comics/Saga` with both `Saga #1` and `Saga 1`, covers dumped at vault root, `assets/covers/` already there, tracker opened in the right sidebar, **Add next** on `Library / Comics`.

## Product, restated from TODO.md

1. Done button stays a status (`Read`), not `Undo Read`. Click again clears `done`. When it is already read, the button is green.
2. **Open media tracker** opens in the main workspace, not the right sidebar.
3. Add-next is agnostic to how the user numbers: `#6`, `6`, `.6`, `v6` (or whatever prefix they already used). Next clones that scheme. Do not force `#`.
4. Cover files do not sit at vault root as a fake collection, and they should stop tripping Sync's "invalid path" banner.
5. New collections get a folder note (the cover note). Parents without a cover use the first child's cover.
6. On a parent (Comics), the toolbar is **Add new**, which creates a child collection + folder note. Renaming the folder renames that note.

## 1. Done button copy + green when read

**Root cause:** `applyItemDoneState` prefixes `Undo` when `done` is true. Nothing in CSS marks the button as completed.

**Fix:** keep `actionLabel` in both states. `is-done` already dims the card. The button itself gets a green background (Obsidian `--color-green`) so "already read" is visible on the control, not only as `Undo Read` text. Click still toggles. Do not rename the second click to `Unread` — that is the same inverse-action pattern.

`cards.ts` + `styles.css`. README line about **Undo Read** updates with this change.

## 2. Open in the main region

**Root cause:** `activateView` uses `getRightLeaf(false)`.

**Fix:** if a `media-tracker` leaf exists, `revealLeaf` as today. Otherwise `getLeaf("tab")` (main workspace tab), then `setViewState`. No extra setting until someone asks to pin it in a sidebar on purpose.

`main.ts` only.

## 3. Numbering: clone the user's scheme

**Root cause:** `parseIssueNumber` only matches `/#\s*(\d+)\s*$/`. Unhashed `Saga 5` is invisible to `nextIssueNumber`. `nextNoteBasename` always emits `{Title} #{n}`, so a folder that started as `Saga 1`…`Saga 4` gets a parallel `Saga #1`… sequence. `.6` and `v6` never count.

**ninja:** the scheme lives in the filename, not in the plugin. Parse a trailing integer. Whatever sits in front of those digits is the prefix to reuse (`Saga #`, `Saga `, `Saga.`, `v`, `.`, `Good Girls S01 #`, `Volume `). Next file = that prefix + (max + 1), preserving zero-padding if they used `01`. Empty folder still defaults to `{Title} #1` (need some first-note grammar). Do not rewrite existing notes. Do not merge `Saga #1` and `Saga 1` into one file.

Highest `n` wins when mixed (`Saga #4` and `Saga 5` → next is `Saga 6`, because 5 is the max and its prefix is `Saga `). Collision: bump `n` with the same prefix until free.

`naming.ts` only.

## 4. Cover files: folder + hide from the grid

The plugin does not write images today. Vault-root `saga_03.webp` and `Covers Collection/` are the user dropping attachments where Obsidian's default attachment path points (vault root) plus a folder that `listChildren` treats as a collection.

**ninja:** reuse the folder the vault already has: `assets/covers/`. README already documents `covers/` wikilinks. Do not invent `Covers Collection/`. Do not auto-migrate files already at root (destructive, easy to get wrong).

**Fix:**

- Exclude folder names `assets` and `covers` (case-insensitive) from `listChildren`. They never render as collection cards, at any depth.
- New default attachment target for anything *this plugin* later writes: `{libraryFolder}/assets/covers/` (or `assets/covers/` when the library is vault root). Create that folder on first plugin-owned write, not on `onload`.
- Sync banner: "invalid path under the current settings" on those root images is Obsidian Sync + attachment location, not a plugin write. Hiding and steering new files into `assets/covers/` is the plugin's part. Moving the existing root files is a user/vault action.

`library.ts` for the denylist. `cover.ts` may look in `assets/covers/` when resolving a collection with no folder-note image (optional, after child fallback). No new dependency.

## 5. Folder note = cover note; parent fallback

Folder notes already exist in `findFolderNote` / `isFolderNote`. They are not created on **Add**.

**Fix:**

- **Add new** (and first creation of a collection) writes `{Folder}/{Folder}.md` with empty-enough frontmatter that `cover` can be filled later. Inside the folder, not beside it, so one rename path.
- `resolveCollectionCover`: folder note → first image in folder (today) → **first child collection's cover** (then first child item). Parents like Comics/Manga get a real thumbnail without their own art.
- Do not backfill folder notes onto every existing collection. Only create them on the new-collection path. Existing folders keep working with image-in-folder and child fallback.

`actions.ts` + `cover.ts`. Recursion stops at the first resolved cover; do not scan the whole library.

## 6. Add new vs Add next; rename keeps the cover note

**Root cause:** toolbar is always **Add next**, which creates a numbered note in the current folder. On `Comics` that is wrong (it is a list of series, not issues).

**Rule, one button:**

| Current folder | Button | Action |
| --- | --- | --- |
| Has any subfolder (library root, Comics, Manga) | **Add new** | Prompt for name → `createFolder` + folder note |
| Else (series folder, including empty newly created ones) | **Add next** | existing `createNextNote` |

Empty series → **Add next** (first note follows the default `#1`, or the folder's existing scheme). Empty library with no children yet → **Add new** (need a name; `#1` under `Media` is not a collection). If the library folder itself is missing, keep **Create folder**.

**Add new** needs a name. Small `Modal` in `ui/name-modal.ts` (Obsidian has no public prompt helper). Cancel = no write.

**Rename:** `isFolderNote` matches basename to folder name. Rename `Saga/` → `Saga Series/` leaves `Saga.md` inside; it becomes a stray item and the cover breaks.

Listen on the **plugin**, not only on the open view, so a rename while the grid is closed still works. On folder rename: if `{oldName}.md` exists inside the renamed folder, `vault.rename` it to `{newName}.md`. If a sibling `{parent}/{oldName}.md` exists, rename that too. Conflict (target exists): skip and leave the old note; do not overwrite.

`grid-view.ts`, `actions.ts`, `main.ts` (rename listener), `commands.ts` (palette follows the same Add new / Add next rule as the toolbar).

## Architecture (still the same files)

```
src/
  main.ts              # leaf in main tab; vault rename → sync folder note
  actions.ts           # createCollection + renameFolderNote
  naming.ts            # trailing number; clone prefix
  library.ts           # hide assets/covers; isParentFolder
  cover.ts             # child-cover fallback
  ui/grid-view.ts      # Add new vs Add next
  ui/name-modal.ts     # collection name (new file; keeps grid-view as layout)
  ui/cards.ts          # done label
  styles.css           # green Read button when done
```

No new runtime dependencies. `library.ts` stays read-only except the denylist predicate. Writes stay in `actions.ts`.

## Implementation order

Each step is shippable; stop if a later step is unused.

1. **Main tab + done label + green button.** Visible immediately, no vault writes.
2. **Numbering.** Trailing integer; next clones that prefix. Hand-check `#5` / `5` / `.6` / `v6`.
3. **Hide `assets` / `covers`.** Grid stops showing cover folders as libraries.
4. **Child cover fallback.** Comics/Manga cards get art without new notes.
5. **Add new + folder note + name modal.**
6. **Rename sync.** Rename a series in the file explorer; cover note follows.
7. **README** to match: main tab, green Read, Add new, `assets/covers/`, scheme-agnostic numbering.

## Testing

No new test runner. Vault fixtures:

- Open tracker: tab in the center, not the right sidebar
- Mark read: button still says `Read`, turns green; click again clears `done` and the green
- `Saga #5` → Add next is `Saga #6`; `Saga 5` → `Saga 6`; `.6` → `.7`; `v6` → `v7`
- Folder with `Saga #4` and `Saga 5` → Add next is `Saga 6` (max wins, clone that prefix)
- `assets/` and `covers/` absent from the grid; Comics/Manga still there
- Library root: Comics card uses Saga's cover if Comics has no folder note
- On Comics: **Add new** → name `X-Men` → `Comics/X-Men/X-Men.md`; drill-in shows **Add next**
- Rename `X-Men/` to `Uncanny X-Men/`: folder note renamed; card still a collection, not an extra item
- Add next in `Season 1` still increments `Good Girls S01 #3`

## Explicit non-goals

- Moving or deleting existing vault-root images
- Downloading covers
- Auto-creating folder notes for collections that already exist
- Deduplicating `Saga #1.md` and `Saga 1.md` into one file
- A setting for sidebar vs main (main is the default now)
- `SxxEyy` parsers, ratings, drag-reorder
- Treating `Covers Collection` as a special snowflake beyond the `covers`/`assets` denylist (user can delete that folder)
