# Validate LiveSync item notes on mobile

Phone vault rebuild still shows collection folders and covers, but not issue notes. Example: `Manga/Attack on Titan/` has no `Attack on Titan #N.md` on the phone, only the parent folder.

Pegasus has no database. It reads `TFolder.children`. `Cover.md` is hidden on purpose (`isFolderNote` in `src/library.ts`), so an empty grid does not mean the folder is empty on disk. Validate Self-hosted LiveSync: local PouchDB on each device, remote CouchDB, then the phone filesystem.

## Not this

This is not a markdown-type blacklist or selective-sync toggle. LiveSync `syncIgnoreRegEx` is empty and `useIgnoreFiles` is false. A full phone rebuild would not change an intentional filter. Do not re-check that.

## Hypothesis to prove or kill

Every item note in this vault uses `#` (`Attack on Titan #1.md`, `Death Note #1.md`, …). `Cover.md`, collection folders, and `assets/covers/` files do not.

LiveSync treats `#` as an illegal Android filename (`isValidFilenameInAndroid` in livesync-commonlib `path.ts`, class `[\\":?<>|*#]`). Add Next defaults to `{folder} #n` in `src/naming.ts`.

That split matches the symptom: parents and covers land, issue notes do not.

Do not rename notes or change the plugin until the layers below say so.

## Where

Five places, in this order. Stop at the first layer that fails.

Use **Attack on Titan**, **Death Note**, **Invincible**, or **The Walking Dead**. Do not use a comics folder that only has `Cover.md` — those collections have no item notes on desktop either.

The Pegasus grid is last, and only after L5. It hides `Cover.md`.

### L1 — desktop vault files

This PC, PowerShell, vault `A:\Obsidian\Media`.

```powershell
Set-Location 'A:\Obsidian\Media'
Get-ChildItem -File 'Manga\Attack on Titan' | Select-Object Name
# expect Cover.md + Attack on Titan #1.md … #5.md

Get-ChildItem -Recurse -File -Filter '*.md' |
  Where-Object { $_.FullName -notmatch '\\\.obsidian\\' } |
  Group-Object { if ($_.Name -eq 'Cover.md') { 'cover-note' } elseif ($_.Name -match '#') { 'item-with-hash' } else { 'other-md' } } |
  Select-Object Name, Count
```

### L2 — desktop LiveSync local DB

Obsidian on this PC, not the shell. Confirms each sample note is in this device's PouchDB, not only on disk.

1. Command palette → **Show log**. Turn on **Verbose Log** for this session only.
2. Open `Manga/Attack on Titan/Attack on Titan #1.md`.
3. Command palette → **Copy database information for the active file** (or Hatch → **Copy database information for a file**). Keep the path, doc id (`f:…` because path obfuscation is on), and whether chunks are present. This is the local DB view; it does not query CouchDB.
4. Settings → Self-hosted LiveSync → **Hatch** → **Verify and repair all files** → **Verify all**. A mismatch here is local vault vs local DB, not the phone.
5. Hatch → **Inspect conflicts and file/database differences** if Verify reports any.

If L2 cannot see `Attack on Titan #1.md`, the note never entered LiveSync on desktop. Stop. Do not rebuild the phone again.

### L3 — remote CouchDB

Run from a PC that can reach the LiveSync remote (Tailscale or LAN).

E2EE + path obfuscation are on, so `_all_docs` will not show filenames. Do not grep the remote for `.md`. Get URL / user / database name from **Settings → Self-hosted LiveSync → remote configuration** (not from `data.json` blobs). Do not put those values in this repo.

```powershell
# Replace USER, PASS, HOST, DB from the LiveSync settings UI.
curl.exe -sS -u 'USER:PASS' 'https://HOST/DB'
# Read doc_count. Then:
curl.exe -sS -u 'USER:PASS' 'https://HOST/DB/_all_docs?limit=1'
```

Expect many `f:` (file meta) and `h:` (chunks) ids. A healthy desktop Verify (L2) plus a connected LiveSync session is stronger evidence that the note is on the remote than a raw doc count. If CouchDB is unreachable from the phone (wrong profile, HTTP vs HTTPS, cert), L4/L5 will be empty even when L3 is full.

On this PC, in Obsidian: confirm LiveSync is actually connected (status icon / log: replication active). This vault has `liveSync: true` but `syncOnStart: false` and `periodicReplication: false` — after a phone rebuild the phone must finish one live replication, not just open the vault.

### L4 — phone LiveSync local DB

Android Obsidian. Confirms the phone's PouchDB received the notes even if the filesystem write failed.

1. Command palette → **Show log**. Enable **Verbose Log**. Optionally **Write logs into the file** for one rebuild/sync pass, then turn it off.
2. Watch for skips/errors on names containing `#` (`invalid`, `illegal`, `cannot create`, `Attack on Titan #`).
3. If `Cover.md` exists on the phone, open it and **Copy database information for the active file**.
4. Hatch → **Inspect conflicts and file/database differences**. Look for notes that exist as DB metadata but have no vault file (that is "in the database, not on disk").
5. Do not Fetch/Rebuild again until L1–L4 are recorded. A rebuild that cannot write `#` names will look the same every time.

### L5 — phone vault files

Android file manager, not the Pegasus grid.

1. File manager → show hidden files → the Obsidian vault folder.
2. Open `Manga/Attack on Titan/`.
3. Record exactly what is there: folder only / `Cover.md` only / `Cover.md` plus `Attack on Titan #N.md`.
4. Same check under `assets/covers/` (images have no `#`; they should already be present).

## Probe

This PC vault, then the phone file manager (L5). One yes/no that kills or confirms the `#` hypothesis.

```powershell
'---','done: false','---' | Set-Content -Encoding utf8 'A:\Obsidian\Media\Manga\Attack on Titan\probe-no-hash.md'
'---','done: false','---' | Set-Content -Encoding utf8 'A:\Obsidian\Media\Manga\Attack on Titan\probe #hash.md'
```

Wait until the desktop LiveSync log shows both files saved.

| File on phone? | Meaning |
|---|---|
| both | `#` is not the blocker; go back to L4 logs / chunk errors |
| only `probe-no-hash.md` | `#` cannot be written on Android; issue notes are in the DB (L2/L3) and die at L5 |
| neither | replication to the phone is not applying markdown at all; stay on L3/L4 (connection, fetch, chunks) |
| only `probe #hash.md` | unexpected; save the phone log before changing anything |

Delete both probe files on desktop after the check.

## After the table has an answer

- If `#` fails on Android: change Add Next's default prefix (`src/naming.ts`) and migrate existing `{name} #n.md` files. That is the plugin fix. Do not do it in this step.
- If notes are missing from L2/L3: fix LiveSync on desktop (Hatch Verify, recreate chunks, then one rebuild of the remote from this PC). Still not a Pegasus code path.
- If notes are on the phone in L5 but missing in the grid: then it is a plugin listing bug (`listChildren` / `isFolderNote`). Only then.
