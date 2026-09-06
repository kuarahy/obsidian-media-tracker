import { App, TFile, TFolder } from "obsidian";
import { findFolderNote, getFolderByPath } from "./library";

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"]);

export function resolveItemCover(app: App, filePath: string): string | null {
	const file = app.vault.getAbstractFileByPath(filePath);
	if (!(file instanceof TFile)) return null;

	const fromFrontmatter = coverFromFrontmatter(app, file);
	if (fromFrontmatter) return fromFrontmatter;

	const fromEmbed = coverFromEmbeds(app, file);
	if (fromEmbed) return fromEmbed;

	return file.parent ? firstImageInFolder(file.parent) : null;
}

export function resolveCollectionCover(app: App, folderPath: string): string | null {
	const folder = getFolderByPath(app, folderPath);
	if (!folder) return null;

	const note = findFolderNote(folder);
	if (note) {
		const fromNote = resolveItemCover(app, note.path);
		if (fromNote) return fromNote;
	}

	return firstImageInFolder(folder);
}

function coverFromFrontmatter(app: App, file: TFile): string | null {
	const cover = app.metadataCache.getFileCache(file)?.frontmatter?.cover;
	if (typeof cover !== "string" || cover.trim() === "") return null;
	return resolveCoverValue(app, file, cover.trim());
}

function coverFromEmbeds(app: App, file: TFile): string | null {
	const embeds = app.metadataCache.getFileCache(file)?.embeds;
	if (!embeds) return null;
	for (const embed of embeds) {
		const dest = app.metadataCache.getFirstLinkpathDest(embed.link, file.path);
		if (dest instanceof TFile && isImageFile(dest)) {
			return app.vault.getResourcePath(dest);
		}
	}
	return null;
}

function firstImageInFolder(folder: TFolder): string | null {
	const images = folder.children
		.filter((child): child is TFile => child instanceof TFile && isImageFile(child))
		.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }));
	const first = images[0];
	return first ? folder.vault.getResourcePath(first) : null;
}

function resolveCoverValue(app: App, source: TFile, value: string): string | null {
	// ninja: http(s) here is the user's own frontmatter, not the plugin fetching covers.
	if (/^https?:\/\//i.test(value)) return value;
	const link = unwrapWikilink(value);
	const dest = app.metadataCache.getFirstLinkpathDest(link, source.path);
	if (dest instanceof TFile) return app.vault.getResourcePath(dest);
	const byPath = app.vault.getAbstractFileByPath(link);
	if (byPath instanceof TFile) return app.vault.getResourcePath(byPath);
	return null;
}

function unwrapWikilink(value: string): string {
	const match = value.match(/^\[\[(.+?)\]\]$/);
	if (!match) return value;
	const inner = match[1] ?? value;
	const pipe = inner.indexOf("|");
	return (pipe === -1 ? inner : inner.slice(0, pipe)).trim();
}

function isImageFile(file: TFile): boolean {
	return IMAGE_EXTENSIONS.has(file.extension.toLowerCase());
}
