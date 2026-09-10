# Plan: Fix "Open Pegasus homepage" button on new/empty tabs

**Goal:** Make the homepage button on empty/new tabs correctly open the library grid at the root homepage.

---

## 1. Does this need to be built? (YAGNI)

Yes. The button was already intentionally added to close a UX gap ("getting there felt like a labyrinth"). The feature is gated, setting-backed, and shipped — it simply does not work correctly. The fix repairs an already-committed feature, it does not add a new one.

*Scope clarification:* End-user plugin. The fix must not create unexpected extra tabs, must not open at a stale collection, and must work on Obsidian ≥ 1.13 (manifest `minAppVersion`). No new settings, commands, or UI are required.

---

## 2. Root cause

**Three compounding bugs; all three must be fixed together.**

### Bug A — Wrong click target: `activateView()` instead of `activateHomepage()` (primary cause)

`homepage-button.ts` line 37:

```ts
button.addEventListener("click", () => void plugin.activateView());
```

`activateView()` (`main.ts` lines 67–78) has two branches:

1. **If a MediaTracker leaf already exists** → `revealLeaf(existingLeaf)` and **return early**. The view is revealed at whatever collection the user was last in (e.g., deep inside `Manga/One Piece/`). The button "works" in the sense that the Pegasus tab surfaces, but the user lands inside a collection instead of the library homepage.

2. **If no MediaTracker leaf exists** → `this.app.workspace.getLeaf("tab")` creates a **brand-new tab**, then sets the view state on it and reveals it. The original empty tab the user was reading is left open. In practice this often opens the new tab in the background, making the button look like it does nothing.

`activateHomepage()` (`main.ts` lines 80–86) is the correct target: it calls `activateView()` first, then iterates every open MediaTracker leaf and calls `view.openHomepage()` to navigate each to the library root. It was designed exactly for this case. It is `private` and therefore unreachable from `homepage-button.ts`.

### Bug B — `getLeaf("tab")` ignores the empty tab the user clicked from

When no MediaTracker leaf exists, `activateView()` always calls `getLeaf("tab")`, which creates a second tab. The expected Obsidian UX for a button on an empty tab is that the empty tab **converts** to the target view — matching how opening a file from an empty tab replaces it. The empty tab is reachable at the moment the button is clicked: `injectButton` already receives the `leaf` reference in its closure.

The correct call in this branch is `leaf.setViewState({ type: VIEW_TYPE_MEDIA_TRACKER, active: true })`. A fresh `MediaTrackerView` always starts at `plugin.settings.libraryFolder` (constructor line 36 of `grid-view.ts`), so no extra `openHomepage()` call is needed in this branch — converting the empty leaf already lands at the homepage.

### Bug C — `activateHomepage` is private and absent from `MediaTrackerPluginApi`

`settings.ts` lines 19–25 define the plugin interface used by all non-`main.ts` files:

```ts
export interface MediaTrackerPluginApi extends Plugin {
    settings: MediaTrackerSettings;
    saveSettings(): Promise<void>;
    activateView(): Promise<void>;
    ensureRootCoversRelocated(): Promise<void>;
    persistSettings(): Promise<void>;
}
```

`activateHomepage` is not listed. TypeScript prevents `homepage-button.ts` from calling it even if the compiled plugin has it. Bug A cannot be fixed without first fixing Bug C.

---

## 3. Reuse vs. new activate path

`activateHomepage()` already does exactly the right thing for the "existing leaf" branch (reveal + navigate to root). There is no reason to write a new method.

**ninja: Do not add a new method to `MediaTrackerPluginApi`. Make `activateHomepage` non-private and add it to the interface. One existing method covers both branches when combined with the empty-leaf conversion below — this is the smallest correct diff.**

The `openHomepage()` call in `activateHomepage()` is already public on `MediaTrackerView` — there is no visibility cascade to fix beyond the two files.

---

## 4. Fix design

### 4a. Expose `activateHomepage` (`src/main.ts` and `src/settings.ts`)

Remove `private` from `activateHomepage()` in `main.ts`. Add the signature to `MediaTrackerPluginApi` in `settings.ts`.

No behavioural change to `activateHomepage()` is needed for the existing-leaf path — it already navigates to the homepage.

### 4b. Fix the no-existing-leaf path: convert the empty tab, don't create a new one (`src/ui/homepage-button.ts`)

The button click handler is a closure that already captures `leaf`. Rewrite the handler to:

```
// Pseudo-code — not implementation
if (existing MediaTracker leaf):
    activateHomepage()          // reveals + navigates to root
else:
    leaf.setViewState({ type: VIEW_TYPE_MEDIA_TRACKER, active: true })
    // fresh MediaTrackerView opens at libraryFolder by default
```

This requires a one-time read of `plugin.app.workspace.getLeavesOfType(VIEW_TYPE_MEDIA_TRACKER)` inside the click handler (no new import needed — `VIEW_TYPE_MEDIA_TRACKER` is already in `homepage-button.ts`'s import graph indirectly, but it would need to be explicitly imported from `../types`).

**ninja: The conditional split lives in the click handler, not inside `activateHomepage()`, because `activateHomepage()` is also called from `onload` (startup). Folding empty-leaf detection into `activateHomepage()` would change startup behaviour — startup should always open a fresh tab, never take over an empty tab that the user might be editing.**

### 4c. Validate `contentElement()` DOM selector (open question — see §7)

`contentElement()` uses `view.containerEl.children[1]`. This relies on Obsidian's EmptyView having a 2-child structure: `[0]` = header, `[1]` = content. If that assumption is wrong, the button is injected into `containerEl` directly (the fallback branch), which may make it invisible or render behind native EmptyView content.

This cannot be verified from the repo alone. See §7.

---

## 5. EmptyView re-render coverage

`injectButton` is called on every `active-leaf-change`. If Obsidian re-renders EmptyView content synchronously (wiping the injected button), the next `active-leaf-change` fires and re-injects. The existing idempotency guard (`if (existing) return`) prevents duplicates.

The only gap is if EmptyView re-renders **without** triggering `active-leaf-change` (e.g., a workspace layout event). This would silently remove the button. Investigating this requires a running Obsidian 1.13 instance — log here as a known risk, not a blocker.

---

## 6. Tests / validation

Manual steps in this order:

1. **Button appears on new tab:** Open a new empty tab. Confirm the "Open Pegasus homepage" button is visible (setting is on by default).
2. **Click — no existing Pegasus tab:** From a fresh Obsidian with no Pegasus view open, click the button. Confirm: the empty tab converts to the Pegasus grid at the library root (no second tab is created).
3. **Click — Pegasus tab already open at a collection:** Navigate inside Pegasus (e.g., `Manga/One Piece/`). Open a new empty tab. Click the button. Confirm: Pegasus reveals and is at the library root, not at `One Piece`.
4. **Button hides when setting is off:** Disable "Homepage button on new tab" in settings. Open a new empty tab. Confirm no button appears.
5. **Button re-appears when setting is re-enabled:** Re-enable the setting. Open a new empty tab. Confirm button is back.
6. **Ribbon and command unaffected:** Use the ribbon icon and the "Open library" command. Confirm they still open Pegasus (at any state, not necessarily homepage — that is their defined behaviour). No regression.
7. **Multiple empty tabs:** Open two empty tabs. Both should show the button independently.

---

## 7. Open questions (cannot be answered from the repo)

**Q1 — Does Obsidian 1.13's EmptyView DOM have `containerEl.children[1]` as the content element?**

`contentElement()` assumes a header+content split identical to `ItemView`. Obsidian's `EmptyView` is undocumented. If the structure changed in 1.13 (e.g., the content is a direct child of `containerEl` at index 0, or wrapped in a shadow root), the button is silently injected into the wrong element and may not be visible at all.

*This must be verified in a running Obsidian 1.13 instance by inspecting the DOM (DevTools → right-click empty tab → Inspect). If the selector is wrong, the selector fix in `homepage-button.ts` is required before the rest of the plan is relevant.*

**Stop here if Q1 is unresolved.** Fix the selector first, then re-test whether Bug A and Bug B are still present.

---

## 8. Files to touch (fewest)

**`src/main.ts`** — 1 word changed:
- Remove `private` from `activateHomepage()`.

**`src/settings.ts`** — 1 line added:
- Add `activateHomepage(): Promise<void>;` to `MediaTrackerPluginApi`.

**`src/ui/homepage-button.ts`** — click handler rewritten:
- Import `VIEW_TYPE_MEDIA_TRACKER` from `../types`.
- Replace `plugin.activateView()` with the two-branch handler (existing leaf → `activateHomepage()`; no leaf → `leaf.setViewState(...)`).
- If Q1 reveals a broken selector, also fix `contentElement()`.

**`README.md`** — 1 section added:
- The "Homepage button on new tab" setting and button are not documented anywhere in the README. Add a bullet under the existing features list and a row in the settings table.

No changes to: `src/commands.ts`, `src/ui/grid-view.ts`, `src/settings.ts` settings UI, `styles.css`, `src/types.ts`, `src/actions.ts`, `src/library.ts`.

---

## 9. Out of scope

- Adding a new command for "Open homepage" — `activateHomepage()` is already wired to the startup path; a command entry is YAGNI.
- Adding a new setting — the existing `showHomepageButtonOnNewTab` gate is sufficient.
- Changing `activateView()` — it is used by the ribbon and the "Open library" command, both of which correctly reveal an existing leaf without navigating to the homepage. Changing it would break those callers.
- Changing `activateHomepage()` startup behaviour — `openOnStartup` calls it on `onLayoutReady` and expects a fresh tab, not conversion of an empty tab.
- Persistent button survival across EmptyView re-renders without `active-leaf-change` — log as known risk, do not add a second event listener unless re-renders are confirmed to be silent.
