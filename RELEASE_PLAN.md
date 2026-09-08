# Release Plan

How Pegasus Media Tracker gets from “works in my vault” to installable from Obsidian’s Community plugins **Browse** list, and how later versions ship after that.

Repo: [kuarahy/pegasus-media-tracker](https://github.com/kuarahy/pegasus-media-tracker)  
Plugin id: `pegasus-media-tracker` (must stay unique; must not contain `obsidian`)

Official docs (source of truth if anything here drifts):

- [Submit your plugin](https://docs.obsidian.md/plugins/releasing/submit-plugin)
- [Manage your plugin](https://docs.obsidian.md/community-directory/manage-entry)
- [Community directory FAQ](https://docs.obsidian.md/community-directory/faq)

---

## What “released” means

| Stage | Who can install | How |
| --- | --- | --- |
| **Dev / private** | You | Copy `main.js`, `manifest.json`, `styles.css` into `.obsidian/plugins/pegasus-media-tracker/` (see README) |
| **GitHub release** | Anyone with the repo URL | Download the three assets from a tagged GitHub Release |
| **Community directory** | Anyone in Obsidian | **Settings → Community plugins → Browse** after the first successful directory submission |

Users install from the GitHub **release assets** whose tag matches `manifest.json` → `version`. The committed `manifest.json` on the default branch is what the directory reads for listing metadata; the downloadable files come from the release, not from `main` alone. `main.js` is gitignored on purpose — it is a release artifact, not source.

---

## Before the first public release

Finish product work first. Do not submit while `TODO.md` still has ship-blockers.

### Product / QA

- Clear remaining TODO items you care about for v1 (toolbar vs Sync overlap, tab title casing, cover-folder behavior, numbering edge cases, etc.).
- Hand-test against a real vault (see the checklist in `PLAN.md`): open in main tab, Read green toggle, Add new / Add next, numbering schemes, `assets`/`covers` hidden, rename sync for folder notes.
- Confirm desktop + mobile if you keep `"isDesktopOnly": false` in `manifest.json`.

### Repo hygiene

- [x] Add a root **LICENSE.md** that matches `package.json`. Attribution to Lucas Perez (`@kuarahy`) and this repo is required.
- [ ] Keep `README.md` accurate for end users (install, settings, vault layout). Point people at Community Browse once live; keep the manual install section for pre-directory or fork users.
- [ ] Remove or ignore scratch assets that should not ship with the repo long-term (loose `image*.png` used for TODOs, etc.).
- [ ] `manifest.json`: `id`, `name`, `description`, `author`, `authorUrl`, `minAppVersion`, `version` are final and honest.
- [ ] Default branch HEAD has the committed `manifest.json` you intend to submit (directory reads default-branch HEAD).

### Build sanity

```bash
npm install
npm run build
```

Confirm `main.js` is produced and that Obsidian loads the three-file set from a clean plugin folder (not the whole git tree).

---

## Version bump (every release)

Versions are semver (`MAJOR.MINOR.PATCH`). Keep these in lockstep:

- `package.json` → `version`
- `manifest.json` → `version`
- `versions.json` → map of plugin version → `minAppVersion`
- Git tag / GitHub Release tag → **exactly** the same string as `manifest.json` `version` (e.g. `0.1.0`, not `v0.1.0`)

This repo already wires that via npm:

```bash
npm version patch   # or minor / major
```

That runs `version-bump.mjs`, which updates `manifest.json` and `versions.json`, then stages them (`git add`). Follow with commit + push of the version commit and tags as usual:

```bash
git push origin main --follow-tags
```

Pushing the version tag starts the Release workflow (build, attest, GitHub Release).

(or push the branch and tag separately if you prefer).

---

## Publish a GitHub Release

Do this for the **first** public version and for **every** update afterward.

`.github/workflows/release.yml` is the publisher. It builds on Ubuntu, attests `main.js` and `styles.css`, then uploads those plus `manifest.json`. Do not `gh release create` from a laptop — those bytes would not match the attestation.

1. Ensure the version bump is on the default branch.
2. Push a git tag that equals `manifest.json` `version` (example: `1.0.1`, not `v1.0.1`).
3. The Release workflow attaches:
   - `main.js`
   - `manifest.json`
   - `styles.css`
4. If the tag already exists (pushed before this workflow landed), run **Actions → Release → Run workflow** and pass that tag.

Until the plugin is in the community directory, README can keep saying “install from this repo / release assets.” After directory approval, Browse is the default path; GitHub releases remain the distribution mechanism Obsidian pulls from.

---

## First-time: submit to the Community directory

One-time submission. Later versions do **not** need a new PR to `obsidian-releases`; a new GitHub Release is enough (and gets auto-reviewed).

1. Sign in at [community.obsidian.md](https://community.obsidian.md) with your Obsidian account.
2. Connect / link the **GitHub** account that owns this repo.
3. Add the plugin from the developer dashboard (select `kuarahy/pegasus-media-tracker`).
4. Complete the listing steps (description, categories, free vs paid, screenshots if you have them).
5. Submit. Automated review runs on `manifest.json`, release assets, and source (including that the build matches what’s committed).

### If review fails

- Fix in the repo, bump version, publish a **new** GitHub Release.
- In the dashboard: use **Request review** / **Check for new releases** as needed.
- Use **Review branch** to preview a scan on a branch/tag/SHA before cutting a release.

Warnings usually do not block; errors do. The plugin is not installable from Browse until errors are cleared.

### After it passes

- Listing typically shows up in-app within ~24 hours.
- Update README: remove “not in Browse”; keep manual install as a fallback.
- Optional announce:
  - Obsidian Forum → [Share & showcase](https://forum.obsidian.md/c/share-showcase/9)
  - Discord `#updates` (needs the developer role)

---

## Ongoing releases (post-directory)

1. Land changes on default branch.
2. `npm version <patch|minor|major>` → commit → push (with tag). The Release workflow builds, attests, and publishes.
3. Watch the developer dashboard for the automated scan on the new release.
4. No resubmit form; no `community-plugins.json` PR for version bumps.

If a release fails review, the directory may drop the plugin from search until a fixed release passes — treat review errors as ship blockers.

---

## Suggested first public version

| Item | Value |
| --- | --- |
| First directory tag | `0.1.0` (current) or bump to `1.0.0` if you want “stable” semantics |
| Release assets | `main.js`, `manifest.json`, `styles.css` |
| License file | `LICENSE.md` (attribution to Lucas Perez / `@kuarahy` required) |
| Submit when | TODO ship-blockers done + one clean vault QA pass + GitHub Release published |

---

## Checklist (print / copy for release day)

**Ready**

- [ ] Ship-blockers in `TODO.md` done or explicitly deferred
- [ ] QA vault pass
- [ ] `LICENSE.md` present and matches package license
- [ ] README matches the build you’re shipping
- [ ] `npm run build` succeeds

**Cut**

- [ ] Version bumped in `package.json` / `manifest.json` / `versions.json`
- [ ] Version commit (+ tag) on default branch, pushed
- [ ] Release workflow green (attests `main.js` / `styles.css`, uploads the three assets)
- [ ] GitHub Release tag == manifest version

**Directory (first time only)**

- [ ] community.obsidian.md signed in + GitHub linked
- [ ] Plugin submitted from this repo
- [ ] Automated review green
- [ ] README / announce updated after Browse lists it

**Later versions**

- [ ] New GitHub Release only
- [ ] Dashboard scan clean
