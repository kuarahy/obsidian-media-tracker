# Implementation plan: TODO follow-ups

End-user plugin, already shipping. These items are fixes and small creation-path gaps from real vault use, not a v2. Robustness: mixed `#N` / unhashed titles, missing folder notes, covers that live beside the library, view closed during rename.

## ninja: do we build this?

Yes, against the existing modules. Do **not** add cover APIs, a second tree, React, or a media-type enum. Do **not** move or delete the user's existing root images. Each TODO maps to one root cause; one fix, then the next.

The vault in the screenshots is the spec: `Comics/Saga` with both `Saga #1` and `Saga 1`, covers dumped at vault root, `assets/covers/` already there, tracker opened in the right sidebar, **Add next** on `Library / Comics`.

## Product, restated from TODO.md

1. Done button stays a status (`Read`), not `Undo Read`. Click again clears `done`.
2. **Open media tracker** opens in the main workspace, not the right sidebar.
3. Add-next understands `Saga #5` and `Saga 5` as the same sequence; next is 6, not a second run of 1–3.
4. Cover files do not sit at vault root as a fake collection, and they should stop tripping Sync's "invalid path" banner.
5. New collections get a folder note (the cover note). Parents without a cover use the first child's cover.
6. On a parent (Comics), the toolbar is **Add new**, which creates a child collection + folder note. Renaming the folder renames that note.

## 1. Done button copy

**Root cause:** `applyItemDoneState` prefixes `Undo` when `done` is true.

**Fix:** keep `actionLabel` in both states. `is-done` already dims the card; that is the "it is read" signal. Click still toggles. Do not rename the second click to `Unread` — that is the same inverse-action pattern.

`cards.ts` only. README line about **Undo Read** updates with this change.

## 2. Open in the main region

**Root cause:** `activateView` uses `getRightLeaf(false)`.

**Fix:** if a `media-tracker` leaf exists, `revealLeaf` as today. Otherwise `getLeaf("tab")` (main workspace tab), then `setViewState`. No extra setting until someone asks to pin it in a sidebar on purpose.

`main.ts` only.

## 3. Numbering: accept `#N` or trailing `N`

**Root cause:** `parseIssueNumber` only matches `/#\s*(\d+)\s*$/`. Unhashed `Saga 5` is invisible to `nextIssueNumber`. `nextNoteBasename` only treats the exact string as taken, so `Saga 5` does not block `Saga #5`. Folders that started as `Saga 1`…`Saga 4` then get a parallel `Saga #1`… sequence. That is the extra row in the screenshot (`Saga #5`, `Saga 1`, `Saga 2`, `Saga 3`).

**Fix, one parser:**

```
^(?:{escapedTitle}\s+)?#?\s*(\d+)\s*$
```

Same function as today: `X-Men #16`, `#16`, `Good Girls S01 #3`, and `Saga 5` all yield a number. `nextIssueNumber` is max + 1. `taken` must include **both** `{Title} #{n}` and `{Title} {n}` so neither form of 5 is created twice.

**Canonical create:** `{Title} #{n}` (unchanged). Do not rewrite existing notes. Do not merge duplicate files.

`naming.ts` (+ `createNextNote` only if the taken-set needs both forms there rather than inside `nextNoteBasename`).

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

Empty series → **Add next** (`Saga #1`). Empty library with no children yet → **Add new** (need a name; `#1` under `Media` is not a collection). If the library folder itself is missing, keep **Create folder**.

**Add new** needs a name. Small `Modal` in `ui/name-modal.ts` (Obsidian has no public prompt helper). Cancel = no write.

**Rename:** `isFolderNote` matches basename to folder name. Rename `Saga/` → `Saga Series/` leaves `Saga.md` inside; it becomes a stray item and the cover breaks.

Listen on the **plugin**, not only on the open view, so a rename while the grid is closed still works. On folder rename: if `{oldName}.md` exists inside the renamed folder, `vault.rename` it to `{newName}.md`. If a sibling `{parent}/{oldName}.md` exists, rename that too. Conflict (target exists): skip and leave the old note; do not overwrite.

`grid-view.ts`, `actions.ts`, `main.ts` (rename listener), `commands.ts` (palette: **Add new collection** when the open folder is a parent, otherwise keep **Add next item**).

## Architecture (still the same files)

```
src/
  main.ts              # leaf in main tab; vault rename → sync folder note
  actions.ts           # createCollection + renameFolderNote
  naming.ts            # optional #
  library.ts           # hide assets/covers; isParentFolder
  cover.ts             # child-cover fallback
  ui/grid-view.ts      # Add new vs Add next
  ui/name-modal.ts     # collection name (new file; keeps grid-view as layout)
  ui/cards.ts          # done label
```

No new runtime dependencies. `library.ts` stays read-only except the denylist predicate. Writes stay in `actions.ts`.

## Implementation order

Each step is shippable; stop if a later step is unused.

1. **Main tab + done label.** Visible immediately, no vault writes.
2. **Numbering.** Parser + taken-set both forms. Hand-check Saga with mixed `#5` / `5`.
3. **Hide `assets` / `covers`.** Grid stops showing cover folders as libraries.
4. **Child cover fallback.** Comics/Manga cards get art without new notes.
5. **Add new + folder note + name modal.**
6. **Rename sync.** Rename a series in the file explorer; cover note follows.
7. **README** to match: main tab, Read stays Read, Add new, `assets/covers/`, both number forms.

## Testing

No new test runner. Vault fixtures:

- Open tracker: tab in the center, not the right sidebar
- Mark read: button still says `Read`; click again clears `done`
- Folder with `Saga #4` and `Saga 5` → Add next creates `Saga #6`, not `Saga #1` or `Saga 5`
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
