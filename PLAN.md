# Implementation plan: TODO (2026-09-06)

End-user plugin. Closed items stay closed. This replaces the executed plan. Robustness: existing `{Series}.md` folder notes keep working while new ones are `Cover.md`; LiveSync stays a different plugin.

## ninja: do we build this?

Yes, against the current modules. Do **not** re-open numbering, image relocate to `assets/covers/`, green Read, main tab, or Add New vs Add Next *behavior*. Do not install dependencies. Do not call LiveSync APIs or restyle LiveSync.

## Product, restated from the new TODOs

1. **Covers Collection** is a real library. Show it in the grid.
2. Zoom the grid so cards grow/shrink; sizes snap so a row of cards meets the pane edges.
3. **Not synchronized** still shows. Do not “fix” it by touching LiveSync.
4. Any LiveSync layout/path change currently in this plugin is a bug. Remove it.
5. Cover notes are named `Cover.md`, not `{series}.md`.
6. **Change Cover** next to Add Next: open that note, or take a path and write the image link into it.
7. Button copy: **Add New**, **Add Next**.
8. Collection titles show in full (`Absolute Wonder Woman`, not `Absolute Wonder Wom…`). Decide whether zoom is enough.
9. Comments on what functions are for, plus README usage that matches the app.

## 1. Show Covers Collection

**Root cause:** `HIDDEN_COLLECTION_FOLDERS` includes `"covers collection"`.

**Fix:** hide only `assets` and `covers` (the attachment folder). `Covers Collection` is a user collection.

`library.ts` only.

## 2. Detach LiveSync (sync location / overlay)

**Root cause:** `styles.css` overrides `.livesync-status` to the bottom of our leaf. That is another plugin’s UI.

**Fix:** delete those rules. Do not add LiveSync CSS, settings, or file-path policy. Image relocate into `assets/covers/` stays — that is this plugin’s cover storage, already marked done, not LiveSync.

**Not synchronized:** LiveSync banner. `#` in issue filenames and LiveSync ignore rules can still trip it. Media Tracker does not write Sync metadata. If a path we *create* is actually illegal for LiveSync, the fix is our naming (already scheme-agnostic) — not a LiveSync stylesheet. Document in README: the banner is LiveSync; configure it there.

`styles.css` delete. README one paragraph.

## 3. Cover note is `Cover.md`

**Root cause:** `createCollection` writes `{Name}/{Name}.md`. `isFolderNote` / `findFolderNote` match the folder name. Rename then renames that note.

**ninja:** a note always called `Cover` does not need to rename when the folder name changes. The old “rename the folder note” path was compensating for a name that tracked the series.

- Folder note = `Cover.md` inside the folder (not beside it).
- `isFolderNote`: stem is `Cover` **or** stem equals the folder name (old `Saga.md` / `X-Men.md` still hidden as cover notes, not item cards).
- `findFolderNote`: prefer `Cover.md`, else the legacy `{folder}.md`.
- **Add New** creates `Cover.md` (with `cover:` if `assets/covers/` already has a match).
- `syncFolderNoteOnRename`: still rename leftover `{oldName}.md` → `{newName}.md` so old vaults do not sprout a stray item. Do **not** rename `Cover.md`.
- Do not bulk-rename existing `Saga.md` to `Cover.md`.

`library.ts`, `actions.ts`. README layout example.

## 4. Change Cover

Toolbar, beside Add Next / Add New, on every collection that exists (series and parents). Screenshot is an empty series; parents need it too so Comics can have its own art.

**Flow:**

1. Ensure `Cover.md` in the current folder (same body as Add New).
2. Open that file with `openFile` (path, not a `[[Cover]]` wikilink that could hit the wrong Cover).
3. Also accept a cover: reuse `promptForName` (or a small sibling modal) for a vault path / wikilink. Write `cover: "[[…]]"` on `Cover.md` and an embed line if the body has no image yet.

**ninja:** opening the note is enough to drop/paste an image (relocate still sends vault-root dumps to `assets/covers/`). The input is for “I already have `assets/covers/foo.jpg`”. One button, those two outcomes — not a file-system file picker (Obsidian has no good public one).

`actions.ts` (`ensureCoverNote`, `setCoverOnNote`), `grid-view.ts`.

## 5. Add New / Add Next copy

`toolbarLabel` and empty-state strings: **Add New**, **Add Next**. **Create folder** stays sentence case (not in the TODO). User overrode Obsidian sentence-case for these two product actions.

`grid-view.ts`, README buttons.

## 6. Zoom that snaps to the pane

Today: `grid-template-columns: repeat(auto-fill, minmax(140px, 1fr))`. Cards already stretch with `1fr`; the leftover is extra columns, not a ragged last cell. Zoom = fewer, larger cards.

**ninja:** persist an integer **column count** (not a free-scale zoom). On each render (and `resize`), `columns = clamp(settings.gridColumns, 1, maxThatFits)`. `maxThatFits` from content width and a floor min card width (~110px) plus gap. Grid is `repeat(columns, 1fr)`. Every card’s right edge is a pane edge — “snap at the corners”.

Zoom in → `gridColumns -= 1` (bigger cards). Zoom out → `+= 1` (more columns). Buttons in the toolbar (`+` / `−` or magnify icons). Optional: Ctrl/Cmd + wheel on the view, same steps. Persist `gridColumns` in `data.json`.

Do **not** add a continuous slider. Do not change aspect ratio (keep 2/3 covers).

`settings.ts`, `grid-view.ts`, `styles.css` (set columns via inline style or a CSS variable `--media-tracker-columns`).

## 7. Full collection titles — zoom is not enough

`.media-tracker-card-title` is `white-space: nowrap` + ellipsis. Wider cards from zoom help `Absolute Wonder Woman` at ~2 columns and still fail at 7.

**Fix:** wrap, clamp to two lines:

```
white-space: normal;
display: -webkit-box;
-webkit-line-clamp: 2;
-webkit-box-orient: vertical;
overflow: hidden;
```

Titles stay readable at dense zoom; zoom is for cover size, not for names.

`styles.css`. Tooltip `title` attribute on the card name if still clamped (optional, cheap).

## 8. Comments and README

**Code:** a one-line `ninja:` (or a short file header) on exported functions that encode a decision (`isFolderNote` accepts `Cover` + legacy names; `markdownStem` vs `basename`; relocate only vault-root images). Do not narrate `if` bodies.

**README:** Cover.md, Change Cover, zoom columns, Covers Collection vs `assets/covers/`, Add New / Add Next, LiveSync banner is not this plugin. Keep install as it is.

## Implementation order

Each step is shippable.

1. **Detach LiveSync CSS** + **unhide Covers Collection** + **Add New / Add Next** copy. Visible immediately.
2. **`Cover.md`** as the folder note (legacy `{name}.md` still counts).
3. **Change Cover** toolbar button.
4. **Snapping column zoom** + persist setting.
5. **Two-line titles**.
6. **Comments + README**.

## Testing

- Library grid shows **Covers Collection** again; `assets/` and `covers/` still hidden.
- LiveSync `16 | 0` is whatever LiveSync decides; this plugin’s CSS does not move it.
- Add New `Foo` → `Foo/Cover.md`. Rename `Foo/` → `Bar/`: `Cover.md` still inside; no `Bar.md` required. Old `Saga/Saga.md` still not an item card.
- Change Cover on empty Absolute Batman opens `Cover.md`; pasting a wikilink updates the Comics card after metadata refresh.
- Zoom in/out: integer columns, last card in a row flush with the pane; survives reload.
- **Add New** / **Add Next** capitalization on the toolbar.
- Absolute Wonder Woman label is not `Wom…` at the default column count.

## Explicit non-goals

- LiveSync config, CSS, or “invalid path” workarounds inside this plugin
- Renaming every existing `X-Men.md` to `Cover.md`
- Un-doing `assets/covers/` relocate
- Cover download, native OS file picker, continuous pinch-zoom
- Re-litigating issue numbering
