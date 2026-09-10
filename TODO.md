# TODO

Bugs 
- [x] Bug: unintended round button is a change that was not specified
![alt text](img1.jpg)
![alt text](img0.jpg)
  - **Root cause**: `.media-tracker-zoom` and the other toolbar button classes (`.media-tracker-breadcrumb-link`, `.media-tracker-add`, `.media-tracker-cover`, `.media-tracker-title`) never set their own `border-radius` in styles.css, so they inherit the theme's default button radius. On the narrow, near-square zoom buttons that radius renders as a full circle; on the wider buttons (`Change Title`, `Add New`, breadcrumb links) the same radius renders as a pill. The grouping fix in 3b0d133 kept `−`/`+` wrapping together as a pair but never gave them their own shape, so they still show as two separate circles instead of matching the rest of the toolbar.
  - **Plan**:
    1. Add an explicit `border-radius: var(--radius-m)` to the shared toolbar-button selector so shape is consistent and no longer dependent on a button's width.
    2. Re-check `−`/`+` at the grouped mobile breakpoint (~390px) against img0.jpg/img1.jpg to confirm they now match `Change Title` / `Add New`.
    3. Spot-check desktop width too, since the shared selector applies outside the `@media (max-width: 420px)` block.

- [ ] Bug: mobile sync shows all covers under `assets/covers` but no item/collection markdown notes (e.g. Attack on Titan folder has no notes on mobile)
  - **Root cause (hypothesis, not a plugin code path)**: covers and item notes are both created the same way — `app.vault.create()` in actions.ts, same as any other vault write — so the plugin has no code path that treats markdown differently from images at write time. `resolveCollectionCover`/`resolveItemCover` in cover.ts only *read* whatever the vault already has; they can't explain files missing from the vault on another device. That points outside the plugin, to how the vault reaches mobile. The one setting that reproduces exactly this symptom (images present, notes absent) is Obsidian Sync's selective sync file-type filter (Settings → Sync → "Sync only these file types" style toggles for Markdown vs. other file types) — if "Markdown notes" is unchecked on the mobile client (or was set that way when the sync account was set up), `.md` files stop downloading while images/PDFs/etc. keep syncing normally. A vault-level "Excluded files" pattern matching `*.md` or the library folder would produce the same effect but would also hide notes from Obsidian's own search/index, not just mobile.
  - **Plan**:
    1. On the mobile device, check Settings → Sync → selective sync / file type filters and confirm "Markdown notes" is enabled.
    2. On this machine (vault at `A:/Obsidian/Media`), check Settings → Files & Links → Excluded files for a pattern that could match collection notes.
    3. If both look correct, force a full remote vault rebuild on mobile (remove and re-add the vault via Sync) to rule out a stale/partial initial sync rather than an ongoing filter.
