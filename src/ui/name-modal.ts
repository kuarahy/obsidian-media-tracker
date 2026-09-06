import { App, Modal, Setting } from "obsidian";

export function promptForName(
	app: App,
	opts: { title: string; placeholder: string; confirm: string },
): Promise<string | null> {
	return new Promise((resolve) => {
		new NameModal(app, opts, resolve).open();
	});
}

class NameModal extends Modal {
	private submitted = false;
	private name = "";

	constructor(
		app: App,
		private opts: { title: string; placeholder: string; confirm: string },
		private finish: (value: string | null) => void,
	) {
		super(app);
	}

	onOpen(): void {
		this.titleEl.setText(this.opts.title);

		new Setting(this.contentEl).addText((text) => {
			text.setPlaceholder(this.opts.placeholder);
			text.onChange((value) => {
				this.name = value;
			});
			text.inputEl.addEventListener("keydown", (event) => {
				if (event.key !== "Enter") return;
				event.preventDefault();
				this.submit();
			});
			window.setTimeout(() => text.inputEl.focus(), 0);
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
