import { Notice, TFile, TFolder } from "obsidian";
import { createNextNote, ensureFolder } from "./actions";
import { getFolderByPath, isPathInLibrary } from "./library";
import type { MediaTrackerPluginApi } from "./settings";
import { VIEW_TYPE_MEDIA_TRACKER } from "./types";
import { MediaTrackerView } from "./ui/grid-view";

export function registerCommands(plugin: MediaTrackerPluginApi): void {
	plugin.addCommand({
		id: "open-media-tracker",
		name: "Open media tracker",
		callback: () => void plugin.activateView(),
	});

	plugin.addCommand({
		id: "add-next-item",
		name: "Add next item",
		callback: () => void addNextItem(plugin),
	});
}

async function addNextItem(plugin: MediaTrackerPluginApi): Promise<void> {
	const openView = plugin.app.workspace.getLeavesOfType(VIEW_TYPE_MEDIA_TRACKER)[0]?.view;
	if (openView instanceof MediaTrackerView) {
		await openView.addNextNote();
		return;
	}

	const folder = folderForActiveFile(plugin) ?? getFolderByPath(plugin.app, plugin.settings.libraryFolder);
	if (!folder) {
		try {
			const created = await ensureFolder(plugin.app, plugin.settings.libraryFolder);
			await createNextNote(plugin.app, created);
		} catch (error) {
			const message = error instanceof Error ? error.message : "Could not add the next note.";
			new Notice(message);
		}
		return;
	}

	try {
		await createNextNote(plugin.app, folder);
	} catch (error) {
		const message = error instanceof Error ? error.message : "Could not add the next note.";
		new Notice(message);
	}
}

function folderForActiveFile(plugin: MediaTrackerPluginApi): TFolder | null {
	const file = plugin.app.workspace.getActiveFile();
	if (!file) return null;
	const folder = file instanceof TFile ? file.parent : null;
	if (!folder) return null;
	if (!isPathInLibrary(folder.path === "/" ? "" : folder.path, plugin.settings.libraryFolder)) {
		return null;
	}
	return folder;
}
