import { App, TFile, TFolder } from "obsidian";
import { findCoverFileForCollection, isImageFile } from "./cover";
import { COVER_FOLDER, COVER_NOTE_STEM, findFolderNote, getFolderByPath, listItemBasenames, readDone } from "./library";
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

	await ensureCoverNote(app, folder);
	return folder;
}

export async function syncFolderNoteOnRename(app: App, folder: TFolder, oldPath: string): Promise<void> {
	const oldName = basenameOfPath(oldPath);
	const newName = folder.name;
	if (oldName === newName) return;

	// ninja: Cover.md keeps its name; only leftover {series}.md notes follow the folder.
	await renameIfFree(app, joinPath(folder, `${oldName}.md`), joinPath(folder, `${newName}.md`));

	const parent = folder.parent;
	if (!parent) return;
	await renameIfFree(app, joinPath(parent, `${oldName}.md`), joinPath(parent, `${newName}.md`));
}

export async function ensureCoverNote(app: App, folder: TFolder): Promise<TFile> {
	const existing = findFolderNote(folder);
	if (existing) return existing;

	const coverFile = findCoverFileForCollection(app, folder.name);
	const body = coverFile
		? `---\ncover: "[[${coverFile.path}]]"\n---\n`
		: "---\n---\n";
	return app.vault.create(joinPath(folder, `${COVER_NOTE_STEM}.md`), body);
}

export async function setCoverOnNote(app: App, file: TFile, raw: string): Promise<void> {
	const value = normalizeCoverValue(raw);
	await app.fileManager.processFrontMatter(file, (frontmatter) => {
		frontmatter.cover = value;
	});
	const text = await app.vault.read(file);
	if (/!\[\[/.test(text) || /!\[[^\]]*\]\(/.test(text)) return;
	const embed = value.startsWith("[[") ? `!${value}` : `![[${value}]]`;
	await app.vault.append(file, `\n${embed}\n`);
}

function normalizeCoverValue(raw: string): string {
	const trimmed = raw.trim();
	if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("[[")) return trimmed;
	return `[[${trimmed}]]`;
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

export async function relocateRootImages(app: App): Promise<void> {
	// ninja: only vault-root dumps — series-folder images stay with the notes.
	await ensureFolder(app, COVER_FOLDER);
	const root = app.vault.getRoot();
	const images = root.children.filter((child): child is TFile => child instanceof TFile && isImageFile(child));
	for (const file of images) {
		await relocateImageToCovers(app, file);
	}
}

export async function relocateImageToCoversIfRoot(app: App, file: TFile): Promise<void> {
	if (!isImageFile(file) || !isVaultRootFile(file)) return;
	await ensureFolder(app, COVER_FOLDER);
	await relocateImageToCovers(app, file);
}

async function relocateImageToCovers(app: App, file: TFile): Promise<void> {
	const dest = availableCoverPath(app, file.name);
	if (dest === file.path) return;
	await app.fileManager.renameFile(file, dest);
}

function isVaultRootFile(file: TFile): boolean {
	const parent = file.parent;
	return !parent || parent.path === "/";
}

function availableCoverPath(app: App, filename: string): string {
	const desired = `${COVER_FOLDER}/${filename}`;
	if (!app.vault.getAbstractFileByPath(desired)) return desired;
	const dot = filename.lastIndexOf(".");
	const base = dot === -1 ? filename : filename.slice(0, dot);
	const ext = dot === -1 ? "" : filename.slice(dot);
	let n = 1;
	while (app.vault.getAbstractFileByPath(`${COVER_FOLDER}/${base} ${n}${ext}`)) {
		n += 1;
	}
	return `${COVER_FOLDER}/${base} ${n}${ext}`;
}
