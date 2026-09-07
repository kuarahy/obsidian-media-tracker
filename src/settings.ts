import { App, Plugin, PluginSettingTab, Setting } from "obsidian";
import { listVaultFolderPaths } from "./library";

export interface MediaTrackerSettings {
	libraryFolder: string;
	actionLabel: string;
	gridColumns: number;
	openOnStartup: boolean;
}

export const DEFAULT_SETTINGS: MediaTrackerSettings = {
	libraryFolder: "Media",
	actionLabel: "Read",
	gridColumns: 6,
	openOnStartup: true,
};

export interface MediaTrackerPluginApi extends Plugin {
	settings: MediaTrackerSettings;
	saveSettings(): Promise<void>;
	activateView(): Promise<void>;
	ensureRootCoversRelocated(): Promise<void>;
	persistSettings(): Promise<void>;
}

export class MediaTrackerSettingTab extends PluginSettingTab {
	plugin: MediaTrackerPluginApi;

	constructor(app: App, plugin: MediaTrackerPluginApi) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Library folder")
			.setDesc("Root folder scanned for collections. Other vault folders are ignored.")
			.addDropdown((dropdown) => {
				dropdown.addOption("", "Vault root");
				const folders = listVaultFolderPaths(this.app);
				for (const folder of folders) {
					dropdown.addOption(folder, folder);
				}
				const current = this.plugin.settings.libraryFolder;
				if (current !== "" && !folders.includes(current)) {
					dropdown.addOption(current, `${current} (missing)`);
				}
				dropdown.setValue(current);
				dropdown.onChange(async (value) => {
					this.plugin.settings.libraryFolder = value;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName("Open on startup")
			.setDesc("Open the Pegasus Media Tracker library grid when Obsidian starts.")
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.openOnStartup);
				toggle.onChange(async (value) => {
					this.plugin.settings.openOnStartup = value;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName("Action label")
			.setDesc("Button text on item cards. A collection folder note can override this with an action property.")
			.addText((text) => {
				text.setPlaceholder(DEFAULT_SETTINGS.actionLabel);
				text.setValue(this.plugin.settings.actionLabel);
				text.onChange(async (value) => {
					const trimmed = value.trim();
					this.plugin.settings.actionLabel =
						trimmed === "" ? DEFAULT_SETTINGS.actionLabel : trimmed;
					await this.plugin.saveSettings();
				});
			});
	}
}
