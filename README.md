# Media Tracker

Obsidian plugin that shows a vault folder as a card grid. Collections are folders. Items are notes. Comics, manga, and shows use the same tree.

## Install

1. Copy `main.js`, `manifest.json`, and `styles.css` into `<vault>/.obsidian/plugins/media-tracker/`.
2. Enable **Media Tracker** in **Settings → Community plugins**.
3. Create a `Media` folder in the vault (or pick another library folder in plugin settings).

For development: `npm install`, then `npm run dev`. Reload the plugin after it rebuilds.

## Vault layout

```
Media/
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

Open the view from the ribbon or **Open media tracker**. Click a collection card to drill in. **Add next** in `X-Men` after `#16` creates `X-Men #17.md`.

A note named the same as its folder is a folder note (collection metadata), not an item card.

## Item notes

```yaml
---
cover: "[[covers/xmen-1.jpg]]"
done: false
---
```

Cover lookup: `cover` frontmatter, then the first embedded image, then the first image file in the folder.

The card button toggles `done`. Default label is **Read**. Change it in settings, or override one collection with a folder note:

```yaml
---
action: Watched
cover: "[[covers/good-girls.jpg]]"
---
```

## Settings

- **Library folder** — only this folder is scanned.
- **Action label** — button text when a collection does not set `action`.
