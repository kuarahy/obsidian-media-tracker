import { App, TFile, TFolder } from "obsidian";
import type { BreadcrumbSegment, ItemNode, LibraryNode } from "./types";

export function getFolderByPath(app: App, path: string): TFolder | null {
	const normalized = normalizeFolderPath(path);
	if (normalized === "") return app.vault.getRoot();
	const found = app.vault.getAbstractFileByPath(normalized);
	return found instanceof TFolder ? found : null;
}

export function normalizeFolderPath(path: string): string {
	if (path === "/" || path === "") return "";
	return path.replace(/^\/+|\/+$/g, "");
}

export function isPathInLibrary(path: string, libraryFolder: string): boolean {
	const root = normalizeFolderPath(libraryFolder);
	const target = normalizeFolderPath(path);
	if (root === "") return true;
	return target === root || target.startsWith(`${root}/`);
}

export function isFolderNote(file: TFile, folder: TFolder): boolean {
	return file.extension === "md" && file.basename === folder.name;
}

export function findFolderNote(folder: TFolder): TFile | null {
	for (const child of folder.children) {
		if (child instanceof TFile && isFolderNote(child, folder)) return child;
	}
	const parent = folder.parent;
	if (!parent) return null;
	for (const child of parent.children) {
		if (child instanceof TFile && child.extension === "md" && child.basename === folder.name) {
			return child;
		}
	}
	return null;
}

export function readDone(app: App, file: TFile): boolean {
	const done = app.metadataCache.getFileCache(file)?.frontmatter?.done;
	return done === true || done === "true";
}

export function readActionLabel(app: App, folder: TFolder, fallback: string): string {
	const note = findFolderNote(folder);
	if (!note) return fallback;
	const action = app.metadataCache.getFileCache(note)?.frontmatter?.action;
	if (typeof action !== "string") return fallback;
	const trimmed = action.trim();
	return trimmed === "" ? fallback : trimmed;
}

export function listItemBasenames(folder: TFolder): string[] {
	const names: string[] = [];
	for (const child of folder.children) {
		if (child instanceof TFile && child.extension === "md" && !isFolderNote(child, folder)) {
			names.push(child.basename);
		}
	}
	return names;
}

export function listChildren(app: App, folder: TFolder): LibraryNode[] {
	const nodes: LibraryNode[] = [];
	const children = [...folder.children].sort((a, b) =>
		a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }),
	);

	for (const child of children) {
		if (child instanceof TFolder) {
			nodes.push({ kind: "collection", name: child.name, path: child.path });
			continue;
		}
		if (child instanceof TFile && child.extension === "md" && !isFolderNote(child, folder)) {
			nodes.push({
				kind: "item",
				name: child.basename,
				path: child.path,
				done: readDone(app, child),
			} satisfies ItemNode);
		}
	}

	return nodes;
}

export function listVaultFolderPaths(app: App): string[] {
	const out: string[] = [];
	walkFolders(app.vault.getRoot(), out);
	out.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
	return out;
}

export function breadcrumbSegments(folderPath: string, libraryFolder: string): BreadcrumbSegment[] {
	const root = normalizeFolderPath(libraryFolder);
	const current = normalizeFolderPath(folderPath);
	const rootName = root === "" ? "Library" : (root.split("/").pop() ?? root);
	const segments: BreadcrumbSegment[] = [{ name: rootName, path: root }];

	if (current === root) return segments;

	const rest = root === "" ? current : current.startsWith(`${root}/`) ? current.slice(root.length + 1) : current;
	let acc = root;
	for (const part of rest.split("/").filter(Boolean)) {
		acc = acc === "" ? part : `${acc}/${part}`;
		segments.push({ name: part, path: acc });
	}
	return segments;
}

function walkFolders(folder: TFolder, out: string[]): void {
	for (const child of folder.children) {
		if (child instanceof TFolder) {
			out.push(child.path);
			walkFolders(child, out);
		}
	}
}
