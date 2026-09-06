# Implementation plan: remaining TODOs

End-user plugin, already in the Media vault (`A:\Obsidian\Media`, library = vault root). This replaces the previous PLAN.md. Closed items stay closed. Remaining items failed because the last pass hid symptoms or never ran in Obsidian, not because the product changed.

## ninja: do we build this?

Yes, only what is still unchecked. Do not redo Read/green, main-tab open, or Add new vs Add next. Do not install dependencies. Do not download covers. Do not merge duplicate notes into one file.

The LiveSync invalid-path banner is checked off. Leave it. That is LiveSync/path policy (often `#` in filenames and files sitting at vault root), not a media-tracker write.

## Still open (from TODO.md)

1. New images land at vault root and show at the bottom of the file explorer. They belong in a covers folder that is not a collection.
2. Add-next still feels wrong: click / add after `Saga #5` produced `Saga 1`, `Saga 2`, `Saga 3` instead of `6` / `#6` in the user's scheme.
3. Every new collection needs a cover note. Parents without art use the first child's cover.
4. Add new's child note must rename when the folder renames.
5. Add next sits on top of LiveSync's `16 | 0` in the top-right. Preferred fix: LiveSync status to the bottom-right of the main section.
6. Tab title is `Media tracker`; it should be `Media Tracker`.

## Why the last plan did not finish these

**Images.** `listChildren` hides folders named `assets` / `covers`. The vault still has `saga_01.jpg`, `invincible_01.webp`, `twd_*.webp`, etc. on the vault root, plus a visible `Covers Collection/` folder. Obsidian's default attachment path is unset, so paste/drop still writes to root. Hiding a folder in our grid does not move files in the file explorer.

**Numbering.** `naming.ts` already clones the prefix of the highest trailing integer. The vault still has mixed leftovers (`Invincible #1`…`#5` and `Invincible 1.md`; `Volume #01` and `Volume 1.md`). The screenshot extras are extra notes, not a second parser. Two gaps remain: (1) `#` in a basename is an Obsidian heading in wikilinks (`[[Saga #5]]` is `Saga` heading `5`), so "click Saga #5" can miss the issue note; (2) `taken` is exact-string, so `Invincible 1` does not occupy the same slot as `Invincible #1` for collision, but more important is: if `#N` siblings are not seen, max falls to the unhashed `1` and the next names are `2`, `3`, `4`.

**Cover notes.** `createCollection` already writes `{Name}/{Name}.md` with empty `---`. An empty note is not a cover on the library list. Comics/Manga have no useful folder-note art; child fallback exists in `cover.ts` but parent cards still show initials when embeds point at root images that the cache has not resolved, or when the first child has no art. Rename sync is already in `main.ts`; treat "still pending" as verify + fix if the inner note is not actually renamed (conflict skip, or listener not firing).

## 1. Covers live in `assets/covers/`, not vault root

**ninja:** reuse `assets/covers/` (already in this vault's language). Do not invent another `Covers Collection`. The library *is* the vault root, so a root-level image *is* "in the library" and must be moved.

- Ensure `assets/covers/` exists on first relocate, not on `onload`.
- Keep hiding `assets` and `covers`. Also hide `Covers Collection` (case-insensitive exact name) so that leftover folder is not a library card.
- On Media Tracker view open (once per session) and on `vault.create` of an image whose parent is the vault root: `vault.rename` into `assets/covers/{filename}`. Collision: Obsidian-style ` name 1.ext`. Use `rename` so `alwaysUpdateLinks` can keep `![[saga_01.jpg]]` working.
- Do not touch images that already live inside a series folder.
- Do not walk the whole vault on `onload`.

`actions.ts` (move) + `library.ts` (denylist) + `main.ts` / `grid-view.ts` (create listener + one-shot on open).

## 2. Numbering: one sequence, open by path

**Root cause to verify first:** `listItemBasenames` must return `Saga #5` as well as `Saga 5`. If `#` files are missing from that list, next is `Saga 1/2/3`. Fix that list, not the regex.

Then:

- Keep trailing-integer parse and prefix clone (`#6`, `6`, `.6`, `v6`).
- Occupied numbers: treat `Title #N` and `Title N` (and `.N` / `vN` with the same N) as the same slot when choosing next, so a leftover `Invincible 1.md` cannot start a parallel 1–2–3 run next to `#1`…`#5`. Next after max 5 is 6 in the prefix of the max file (`Invincible #6` here).
- Open item cards with `openLinkText(path)` as today (path, not `[[Saga #5]]`). Do not add-on-card-click; Add next stays the toolbar. If the user meant "click the #5 card to add #6", that is a different feature — YAGNI until they say so.

`naming.ts` + a hand check on the real folders: Saga (`#1`–`#5` → `#6`), Invincible (mixed → `#6`), Card Captors (`Volume #01` / `Volume 1` → `Volume 02` or `#02` from the max file's prefix).

## 3. Cover note + parent fallback (make it visible)

Add new already creates `{Folder}/{Folder}.md`. Keep that name (TODO also says rename the note when the folder name changes, so it is not a generic `Cover.md`).

- If a new collection is created and a matching image already exists in `assets/covers/`, write `cover:` on the folder note so the library card is not initials.
- Parent fallback stays: folder note art → images in the folder → first child collection → first child item, including embeds. After images move to `assets/covers/`, also look there for a filename that matches the collection (prefix match, e.g. `saga_`, `invincible_`) before giving up.
- Do not backfill empty notes onto every old folder in bulk. Missing note on **Add new** is the bug; old folders get fallback + optional covers-folder match.
- Rename: keep `syncFolderNoteOnRename`. If the inner `{old}.md` is skipped because `{new}.md` already exists, that is correct. If it never runs, register only on `TFolder` as today and add a Notice only if we later see silent failure — no extra UI now.

`actions.ts`, `cover.ts`, rename path already in `main.ts`.

## 4. LiveSync status vs Add next

LiveSync paints `.livesync-status` as `position: absolute; top: var(--header-height); text-align: right; width: 100%; z-index: cover+1`. Our toolbar button is the same corner of the leaf.

**Preferred (user):** move that status to the bottom-right of the main section.

**ninja:** our `styles.css` is global, so a blanket `.livesync-status { bottom: 0 }` would restyle every note view. Scope it:

```
.workspace-leaf-content[data-type="media-tracker"] .livesync-status {
  top: auto;
  bottom: 0;
}
```

If LiveSync mounts the node outside the leaf, apply the same bottom-right rule globally — that is what they asked for, and this vault's "main section" is the tracker more often than a markdown editor.

Do not recolor Add next unless the overlap remains after the move. One problem, one fix.

`styles.css` only.

## 5. Tab title

`getDisplayText()` in `grid-view.ts`: `"Media Tracker"`. Product name, not sentence-case. That is the tab. Leave command palette names as they are.

## Implementation order

1. **Tab title.** One string.
2. **LiveSync CSS** in our leaf (bottom-right). Reload and see if Add next is clear.
3. **Relocate root images** + hide `Covers Collection` + create-listener.
4. **Numbering occupied-slots** + verify `listItemBasenames` on `#` files in the real vault.
5. **Cover resolve** from `assets/covers/` + optional `cover:` on Add new when a match exists. Confirm rename of the folder note.

## Testing (this vault)

- Vault root no longer lists `saga_*.jpg` / `invincible_*.webp`; they sit under `assets/covers/`. File explorer bottom is clean. Grid does not show `assets`, `covers`, or `Covers Collection`.
- Saga Add next → `Saga #6.md`. Invincible Add next → `Invincible #6.md` (not `Invincible 2`).
- Add new `Foo` → `Foo/Foo.md`. Rename `Foo/` → `Bar/` → `Bar.md` inside. Comics card shows a child cover if Comics has no own art.
- Tracker tab label: `Media Tracker`. LiveSync `16 | 0` sits bottom-right of that view, not on Add next.

## Explicit non-goals

- Reverting Read / main tab / Add new vs Add next
- Deleting `Covers Collection` (hide only)
- Deduplicating `Invincible #1.md` and `Invincible 1.md` into one file
- Changing LiveSync plugin files
- Cover download, `SxxEyy`, ratings
