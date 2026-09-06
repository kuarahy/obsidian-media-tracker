import { App, TFile, TFolder } from "obsidian";
import { getFolderByPath, listItemBasenames, readDone } from "./library";
import { nextNoteBasename } from "./naming";

export async function ensureFolder(app: App, path: string): Promise<TFolder> {
	const folder = getFolderByPath(app, path);
	if (folder) return folder;

	const normalized = path.replace(/^\/+|\/+$/g, "");
	if (normalized === "") return app.vault.getRoot();

	let acc = "";
	for (const part of normalized.split("/")) {
		acc = acc === "" ? part : `${acc}/${part}`;
		if (!app.vault.getAbstractFileByPath(acc)) {
			await app.vault.createFolder(acc);
		}
	}

	const created = getFolderByPath(app, normalized);
	if (!created) {
		throw new Error(`Could not create folder: ${normalized}`);
	}
	return created;
}

export async function createNextNote(app: App, folder: TFolder): Promise<TFile> {
	const basename = nextNoteBasename(listItemBasenames(folder), folder.name);
	const parentPath = folder.path === "/" ? "" : folder.path;
	const path = parentPath === "" ? `${basename}.md` : `${parentPath}/${basename}.md`;
	return app.vault.create(path, "---\ndone: false\n---\n");
}

export async function toggleItemDone(app: App, path: string): Promise<boolean | null> {
	const file = app.vault.getAbstractFileByPath(path);
	if (!(file instanceof TFile)) return null;
	const next = !readDone(app, file);
	await app.fileManager.processFrontMatter(file, (frontmatter) => {
		frontmatter.done = next;
	});
	return next;
}
