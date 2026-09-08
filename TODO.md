# TODO

Features:
- [ ] Improve button section on mobile
![alt text](Screenshot_2026-09-08-12-50-16-22_51606159b24eff83e24a54116878fe3e.jpg)
  - **Root cause**: `.media-tracker-toolbar` (styles.css) is one flex row holding both the breadcrumb (`flex: 1`) and the action buttons. Below the 420px breakpoint it gets `flex-wrap: wrap`, but the breadcrumb still claims the full remaining width and wraps its own children (`/`, `Comics`) onto their own lines instead of sitting next to the buttons — that's the one-item-per-row stack in the screenshot.
  - **Plan**:
    1. Force the breadcrumb onto its own full-width line at the mobile breakpoint (`flex-basis: 100%` or a wrapping div around it) so it stops competing with the buttons for row space.
    2. Keep the buttons in their own wrapping row below the breadcrumb, with the zoom `-`/`+` pair grouped in one non-splitting unit so they don't separate across lines.
    3. Trim button padding/font-size slightly at that breakpoint so more buttons fit per row before wrapping.
    4. Re-test at common phone widths (~390px) against the screenshot layout.
- [ ] New Tab should offer to go to Homepage (the Pegasus Media Tracker homepage). Right now it is
soooo confusing to ge to the Homepage. It feels like a labyrinth. Adding a command to the command pallette doesn't seem to do anything at all as well, which might be an Obsidian issue.  
  - **Root cause**: The `Open library` command and ribbon icon already exist and call `activateView()` (commands.ts, main.ts) — the palette command isn't broken. The gap is that a bare **new/empty tab** in Obsidian has no visible affordance pointing at the plugin; users have to already know the ribbon icon or search the command palette by name.
  - **Plan**:
    1. Detect when the active leaf's view type is Obsidian's built-in `"empty"` view (via `workspace.on("active-leaf-change")`) and inject a single "Open Pegasus homepage" button into that view's `contentEl`, calling the existing `activateView()`.
    2. Clean up the injected button when the leaf changes away from empty or the plugin unloads, so duplicates never accumulate.
    3. Gate it behind a settings toggle (e.g. `showHomepageButtonOnNewTab`, default on) to match the existing opt-in pattern used for `openOnStartup` — visible-but-dismissible, not another forced takeover of the active tab.
    4. No new command needed — reuse `Open library` / `activateView()` rather than duplicating it.