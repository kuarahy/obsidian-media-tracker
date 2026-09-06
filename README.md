# Media Tracker

Obsidian community plugin. Folders are collections. Notes are items. One card grid for comics, manga, shows, or anything else with the same shape.

It is not in the Community plugin **Browse** store. You install it from this repo.

## What you get

- A grid of collection cards (like image search results).
- Click a collection to open the notes and nested folders inside it.
- Each item card has a button (`Read` by default) that toggles `done` on the note.
- **Add next** creates the next numbered note in the current folder (`X-Men` with `#16` → `X-Men #17.md`).

## Install into a vault

Obsidian only loads three files. The folder name must match the plugin id: `media-tracker`.

1. Build (from this repo):

   ```bash
   npm install
   npm run build
   ```

   `npm run dev` also writes `main.js` and is fine if you leave the watcher running.

2. Copy these files into the vault:

   ```
   <vault>/.obsidian/plugins/media-tracker/main.js
   <vault>/.obsidian/plugins/media-tracker/manifest.json
   <vault>/.obsidian/plugins/media-tracker/styles.css
   ```

   Do not copy `src/`, `node_modules/`, or the git repo into that folder. Obsidian will ignore them.

3. In Obsidian:

   - Reload the app (`Ctrl+R` / `Cmd+R`), or close and reopen the vault.
   - **Settings → Community plugins**: turn **Restricted mode** off.
   - Enable **Media Tracker** in the installed-plugin list. Do not look under **Browse**.

If the plugin is missing after a reload, the folder is named wrong, `manifest.json` is not next to `main.js`, or Restricted mode is still on.

### Develop against a vault

Either copy `main.js` after each build, or clone/symlink this repo to `<vault>/.obsidian/plugins/media-tracker/` and run `npm run dev` there so Obsidian picks up rebuilds. Reload the plugin (or the app) after the first build.

## Open the grid

After it is enabled:

- Left ribbon: the grid icon (**Open media tracker**), or
- Command palette (`Ctrl+P` / `Cmd+P`): **Open media tracker**

Settings for this plugin are under **Settings → Media Tracker**.

### If the grid is empty

The default library folder is `Media`. If your vault *is* the library (for example `Comics/` and `Manga/` at the vault root), set **Library folder** to **Vault root**.

If `Media` does not exist, the view says so. **Create folder** makes it; it does not create a note until you press **Add next** again.

## Use the grid

- Click a collection card to drill in.
- Use the breadcrumb to go back up.
- Click an item title (or the card) to open the note.
- Click **Read** (or your label) to set `done: true`. **Undo Read** clears it.
- **Add next** creates `{folder name} #{n}.md` in the folder you are viewing. It takes the highest trailing `#N` among sibling notes, then `+ 1`. `X-Men #16` and `Good Girls S01 #3` both count. If nothing is numbered yet, you get `#1`.

Command palette **Add next item** does the same for the open grid folder, or for the folder of the active note if the grid is closed.

## Vault layout

Collections can nest. Mixed folders are allowed: subfolders are collection cards, markdown notes are item cards.

```
Media/                          ← default library folder
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

A note with the same name as its folder is a **folder note** (cover / action for that collection). It is not shown as an item card. It can live inside the folder (`X-Men/X-Men.md`) or beside it (`Comics/X-Men.md` + `Comics/X-Men/`).

## Frontmatter

Item note:

```yaml
---
cover: "[[covers/xmen-1.jpg]]"
done: false
---
```

`cover` may be a wikilink, a vault path, or an `http(s)` URL. If it is missing, the plugin uses the first embedded image in the note, then the first image file in the same folder. No covers are downloaded from the internet.

Collection folder note (optional):

```yaml
---
action: Watched
cover: "[[covers/good-girls.jpg]]"
---
```

`action` overrides the button label for items in that folder only.

## Settings

| Setting | Default | Meaning |
| --- | --- | --- |
| Library folder | `Media` | Only this folder is scanned. **Vault root** scans the whole vault. |
| Action label | `Read` | Button text when a folder note does not set `action`. |

## Commands

| Command | What it does |
| --- | --- |
| Open media tracker | Opens or focuses the grid view |
| Add next item | Creates the next numbered note |

## Repository

| Path | Role |
| --- | --- |
| `src/main.ts` | Plugin lifecycle (load, ribbon, settings, view) |
| `src/library.ts` | Vault folders → collection / item nodes |
| `src/naming.ts` | Next `#N` title |
| `src/cover.ts` | Cover from frontmatter, embeds, or folder images |
| `src/actions.ts` | Toggle `done`, create the next note |
| `src/settings.ts` | Settings tab |
| `src/commands.ts` | Command palette |
| `src/ui/` | Grid view and cards |
| `manifest.json` | Plugin id `media-tracker` |
| `styles.css` | Grid layout |
| `PLAN.md` | Engineering plan |

Release artifacts (not committed): `main.js` from `npm run build` or `npm run dev`.

```bash
npm install
npm run dev      # watch, writes main.js
npm run build    # typecheck + production bundle
```

Requires Node 18+. No extra runtime dependencies; Obsidian APIs only.

## License

0-BSD. See `package.json`.
