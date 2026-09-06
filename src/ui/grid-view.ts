import { ItemView, Notice, TAbstractFile, WorkspaceLeaf } from "obsidian";
import { createCollection, createNextNote, ensureFolder, toggleItemDone } from "../actions";
import { resolveCollectionCover, resolveItemCover } from "../cover";
import {
	addToolbarMode,
	breadcrumbSegments,
	getFolderByPath,
	isPathInLibrary,
	listChildren,
	readActionLabel,
} from "../library";
import type { MediaTrackerPluginApi } from "../settings";
import type { ItemNode } from "../types";
import { VIEW_TYPE_MEDIA_TRACKER } from "../types";
import { applyItemDoneState, createCollectionCard, createItemCard } from "./cards";
import { promptForName } from "./name-modal";

export class MediaTrackerView extends ItemView {
	plugin: MediaTrackerPluginApi;
	currentFolderPath: string;
	private debounceHandle: number | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: MediaTrackerPluginApi) {
		super(leaf);
		this.plugin = plugin;
		this.currentFolderPath = plugin.settings.libraryFolder;
	}

	getViewType(): string {
		return VIEW_TYPE_MEDIA_TRACKER;
	}

	getDisplayText(): string {
		return "Media tracker";
	}

	getIcon(): string {
		return "layout-grid";
	}

	async onOpen(): Promise<void> {
		this.registerLibraryListeners();
		this.render();
	}

	async onClose(): Promise<void> {
		this.clearDebounce();
	}

	openFolder(path: string): void {
		this.currentFolderPath = path;
		this.render();
	}

	async addFromToolbar(): Promise<void> {
		try {
			const existed = getFolderByPath(this.app, this.currentFolderPath);
			const folder = await ensureFolder(this.app, this.currentFolderPath);
			const folderPath = folder.path === "/" ? "" : folder.path;
			if (!existed) {
				this.openFolder(folderPath);
				return;
			}

			const mode = addToolbarMode(folder, this.plugin.settings.libraryFolder);
			if (mode === "add-new") {
				const name = await promptForName(this.app, {
					title: "New collection",
					placeholder: "Collection name",
					confirm: "Create",
				});
				if (name === null) return;
				await createCollection(this.app, folder, name);
			} else {
				await createNextNote(this.app, folder);
			}
			this.openFolder(folderPath);
		} catch (error) {
			const message = error instanceof Error ? error.message : "Could not add to this collection.";
			new Notice(message);
		}
	}

	render(): void {
		const libraryPath = this.plugin.settings.libraryFolder;
		if (!isPathInLibrary(this.currentFolderPath, libraryPath)) {
			this.currentFolderPath = libraryPath;
		}

		const root = this.contentEl;
		root.empty();
		root.addClass("media-tracker-view");

		const folder = getFolderByPath(this.app, this.currentFolderPath);
		const mode = addToolbarMode(folder, libraryPath);
		this.renderToolbar(root, mode);

		if (!folder) {
			this.renderMessage(
				root,
				`Library folder ${libraryLabel(libraryPath)} was not found.`,
				"Create it with Create folder, or pick another folder in settings.",
			);
			return;
		}

		const nodes = listChildren(this.app, folder);
		if (nodes.length === 0) {
			this.renderMessage(
				root,
				"This collection is empty.",
				mode === "add-new"
					? "Add new creates a collection folder and a cover note."
					: "Add next creates the first numbered note.",
			);
			return;
		}

		const actionLabel = readActionLabel(this.app, folder, this.plugin.settings.actionLabel);
		const grid = root.createDiv({ cls: "media-tracker-grid" });
		for (const node of nodes) {
			if (node.kind === "collection") {
				createCollectionCard(grid, {
					name: node.name,
					coverSrc: resolveCollectionCover(this.app, node.path),
					onOpen: () => this.openFolder(node.path),
				});
				continue;
			}
			createItemCard(grid, {
				name: node.name,
				path: node.path,
				coverSrc: resolveItemCover(this.app, node.path),
				done: node.done,
				actionLabel,
				onOpen: () => void this.app.workspace.openLinkText(node.path, this.currentFolderPath, false),
				onToggle: (card) => void this.onToggleDone(node, card, actionLabel),
			});
		}
	}

	private async onToggleDone(node: ItemNode, card: HTMLElement, actionLabel: string): Promise<void> {
		const next = await toggleItemDone(this.app, node.path);
		if (next === null) return;
		node.done = next;
		applyItemDoneState(card, next, actionLabel);
	}

	private renderToolbar(root: HTMLElement, mode: ReturnType<typeof addToolbarMode>): void {
		const toolbar = root.createDiv({ cls: "media-tracker-toolbar" });
		const crumbs = toolbar.createDiv({ cls: "media-tracker-breadcrumb" });
		const segments = breadcrumbSegments(this.currentFolderPath, this.plugin.settings.libraryFolder);

		segments.forEach((segment, index) => {
			if (index > 0) {
				crumbs.createSpan({ cls: "media-tracker-breadcrumb-sep", text: "/" });
			}
			const isLast = index === segments.length - 1;
			if (isLast) {
				crumbs.createSpan({ cls: "media-tracker-breadcrumb-current", text: segment.name });
				return;
			}
			const link = crumbs.createEl("button", {
				cls: "media-tracker-breadcrumb-link",
				text: segment.name,
			});
			link.addEventListener("click", () => this.openFolder(segment.path));
		});

		const add = toolbar.createEl("button", {
			cls: "media-tracker-add",
			text: toolbarLabel(mode),
		});
		add.addEventListener("click", () => void this.addFromToolbar());
	}

	private renderMessage(root: HTMLElement, title: string, detail: string): void {
		const empty = root.createDiv({ cls: "media-tracker-empty" });
		empty.createEl("p", { text: title });
		empty.createEl("p", { cls: "media-tracker-empty-detail", text: detail });
	}

	private registerLibraryListeners(): void {
		const onFile = (file: TAbstractFile) => this.scheduleRenderFor(file.path);
		this.registerEvent(this.app.vault.on("create", onFile));
		this.registerEvent(this.app.vault.on("modify", onFile));
		this.registerEvent(
			this.app.vault.on("delete", (file) => {
				if (
					file.path === this.currentFolderPath ||
					this.currentFolderPath.startsWith(`${file.path}/`)
				) {
					this.currentFolderPath = this.plugin.settings.libraryFolder;
				}
				this.scheduleRenderFor(file.path);
			}),
		);
		this.registerEvent(
			this.app.vault.on("rename", (file, oldPath) => {
				if (this.currentFolderPath === oldPath) {
					this.currentFolderPath = file.path === "/" ? "" : file.path;
				} else if (this.currentFolderPath.startsWith(`${oldPath}/`)) {
					this.currentFolderPath = `${file.path}${this.currentFolderPath.slice(oldPath.length)}`;
				}
				this.scheduleRenderFor(file.path);
				this.scheduleRenderFor(oldPath);
			}),
		);
		this.registerEvent(
			this.app.metadataCache.on("changed", (file) => this.scheduleRenderFor(file.path)),
		);
	}

	private scheduleRenderFor(path: string): void {
		if (!isPathInLibrary(path, this.plugin.settings.libraryFolder)) return;
		this.scheduleRender();
	}

	private scheduleRender(): void {
		this.clearDebounce();
		this.debounceHandle = window.setTimeout(() => {
			this.debounceHandle = null;
			this.render();
		}, 200);
	}

	private clearDebounce(): void {
		if (this.debounceHandle === null) return;
		window.clearTimeout(this.debounceHandle);
		this.debounceHandle = null;
	}
}

function toolbarLabel(mode: ReturnType<typeof addToolbarMode>): string {
	if (mode === "create-folder") return "Create folder";
	if (mode === "add-new") return "Add new";
	return "Add next";
}

function libraryLabel(libraryFolder: string): string {
	return libraryFolder === "" ? "vault root" : libraryFolder;
}
