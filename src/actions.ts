import { App, TFile, TFolder } from "obsidian";
import { getFolderByPath, listItemBasenames, readDone } from "./library";
import { nextNoteBasename } from "./naming";

const INVALID_FOLDER_CHARS = /[\\/:*?"<>|]/;

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
	const path = joinPath(folder, `${basename}.md`);
	return app.vault.create(path, "---\ndone: false\n---\n");
}

export async function createCollection(app: App, parent: TFolder, rawName: string): Promise<TFolder> {
	const name = rawName.trim();
	if (name === "" || name === "." || name === "..") {
		throw new Error("Enter a collection name.");
	}
	if (INVALID_FOLDER_CHARS.test(name)) {
		throw new Error('Collection name cannot contain \\ / : * ? " < > |');
	}

	const path = joinPath(parent, name);
	if (app.vault.getAbstractFileByPath(path)) {
		throw new Error(`${name} already exists.`);
	}

	await app.vault.createFolder(path);
	const folder = getFolderByPath(app, path);
	if (!folder) {
		throw new Error(`Could not create folder: ${path}`);
	}

	const notePath = joinPath(folder, `${name}.md`);
	if (!app.vault.getAbstractFileByPath(notePath)) {
		await app.vault.create(notePath, "---\n---\n");
	}
	return folder;
}

export async function syncFolderNoteOnRename(app: App, folder: TFolder, oldPath: string): Promise<void> {
	const oldName = basenameOfPath(oldPath);
	const newName = folder.name;
	if (oldName === newName) return;

	await renameIfFree(app, joinPath(folder, `${oldName}.md`), joinPath(folder, `${newName}.md`));

	const parent = folder.parent;
	if (!parent) return;
	await renameIfFree(app, joinPath(parent, `${oldName}.md`), joinPath(parent, `${newName}.md`));
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

async function renameIfFree(app: App, from: string, to: string): Promise<void> {
	const file = app.vault.getAbstractFileByPath(from);
	if (!(file instanceof TFile)) return;
	if (app.vault.getAbstractFileByPath(to)) return;
	await app.vault.rename(file, to);
}

function joinPath(folder: TFolder, name: string): string {
	const parentPath = folder.path === "/" ? "" : folder.path;
	return parentPath === "" ? name : `${parentPath}/${name}`;
}

function basenameOfPath(path: string): string {
	const normalized = path.replace(/\/+$/g, "");
	const slash = normalized.lastIndexOf("/");
	return slash === -1 ? normalized : normalized.slice(slash + 1);
}
