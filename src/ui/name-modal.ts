import { App, Modal, Setting } from "obsidian";

export function promptForName(
	app: App,
	opts: { title: string; placeholder: string; confirm: string; value?: string },
): Promise<string | null> {
	return new Promise((resolve) => {
		new NameModal(app, opts, resolve).open();
	});
}

export type CoverPromptResult = { action: "open" } | { action: "set"; value: string } | null;

export function promptForCover(app: App): Promise<CoverPromptResult> {
	return new Promise((resolve) => {
		new CoverModal(app, resolve).open();
	});
}

class NameModal extends Modal {
	private submitted = false;
	private name = "";

	constructor(
		app: App,
		private opts: { title: string; placeholder: string; confirm: string; value?: string },
		private finish: (value: string | null) => void,
	) {
		super(app);
		this.name = opts.value?.trim() ?? "";
	}

	onOpen(): void {
		this.titleEl.setText(this.opts.title);

		new Setting(this.contentEl).addText((text) => {
			text.setPlaceholder(this.opts.placeholder);
			if (this.name !== "") text.setValue(this.name);
			text.onChange((value) => {
				this.name = value;
			});
			text.inputEl.addEventListener("keydown", (event) => {
				if (event.key !== "Enter") return;
				event.preventDefault();
				this.submit();
			});
			window.setTimeout(() => {
				text.inputEl.focus();
				text.inputEl.select();
			}, 0);
		});

		new Setting(this.contentEl)
			.addButton((button) => {
				button.setButtonText("Cancel").onClick(() => this.close());
			})
			.addButton((button) => {
				button.setButtonText(this.opts.confirm).setCta().onClick(() => this.submit());
			});
	}

	onClose(): void {
		this.contentEl.empty();
		if (!this.submitted) this.finish(null);
	}

	private submit(): void {
		const trimmed = this.name.trim();
		if (trimmed === "") return;
		this.submitted = true;
		this.close();
		this.finish(trimmed);
	}
}

class CoverModal extends Modal {
	private submitted = false;
	private value = "";

	constructor(
		app: App,
		private finish: (value: CoverPromptResult) => void,
	) {
		super(app);
	}

	onOpen(): void {
		this.titleEl.setText("Change cover");

		new Setting(this.contentEl).addText((text) => {
			text.setPlaceholder("assets/covers/saga_01.jpg or [[wikilink]]");
			text.onChange((next) => {
				this.value = next;
			});
			text.inputEl.addEventListener("keydown", (event) => {
				if (event.key !== "Enter") return;
				event.preventDefault();
				this.setCover();
			});
			window.setTimeout(() => text.inputEl.focus(), 0);
		});

		new Setting(this.contentEl)
			.addButton((button) => {
				button.setButtonText("Cancel").onClick(() => this.close());
			})
			.addButton((button) => {
				button.setButtonText("Open note").onClick(() => this.openNote());
			})
			.addButton((button) => {
				button.setButtonText("Set cover").setCta().onClick(() => this.setCover());
			});
	}

	onClose(): void {
		this.contentEl.empty();
		if (!this.submitted) this.finish(null);
	}

	private openNote(): void {
		this.submitted = true;
		this.close();
		this.finish({ action: "open" });
	}

	private setCover(): void {
		const trimmed = this.value.trim();
		if (trimmed === "") return;
		this.submitted = true;
		this.close();
		this.finish({ action: "set", value: trimmed });
	}
}
