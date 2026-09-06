export function createCollectionCard(
	parent: HTMLElement,
	opts: {
		name: string;
		coverSrc: string | null;
		onOpen: () => void;
	},
): HTMLElement {
	const card = parent.createDiv({ cls: "media-tracker-card media-tracker-card-collection" });
	card.addEventListener("click", opts.onOpen);
	renderCover(card, opts.name, opts.coverSrc);
	card.createDiv({ cls: "media-tracker-card-title", text: opts.name });
	return card;
}

export function createItemCard(
	parent: HTMLElement,
	opts: {
		name: string;
		path: string;
		coverSrc: string | null;
		done: boolean;
		actionLabel: string;
		onOpen: () => void;
		onToggle: (card: HTMLElement) => void;
	},
): HTMLElement {
	const card = parent.createDiv({ cls: "media-tracker-card media-tracker-card-item" });
	card.dataset.path = opts.path;
	card.addEventListener("click", opts.onOpen);
	renderCover(card, opts.name, opts.coverSrc);

	const title = card.createDiv({ cls: "media-tracker-card-title", text: opts.name });
	title.addEventListener("click", (event) => {
		event.stopPropagation();
		opts.onOpen();
	});

	const button = card.createEl("button", { cls: "media-tracker-card-action" });
	button.addEventListener("click", (event) => {
		event.stopPropagation();
		opts.onToggle(card);
	});

	applyItemDoneState(card, opts.done, opts.actionLabel);
	return card;
}

export function applyItemDoneState(card: HTMLElement, done: boolean, actionLabel: string): void {
	card.classList.toggle("is-done", done);
	const button = card.querySelector(".media-tracker-card-action");
	if (button instanceof HTMLButtonElement) {
		button.setText(actionLabel);
	}
}

function renderCover(card: HTMLElement, name: string, coverSrc: string | null): void {
	const cover = card.createDiv({ cls: "media-tracker-card-cover" });
	if (coverSrc) {
		cover.createEl("img", { attr: { src: coverSrc, alt: name } });
		return;
	}
	cover.createDiv({ cls: "media-tracker-card-placeholder", text: initials(name) });
}

function initials(name: string): string {
	const parts = name.split(/\s+/).filter(Boolean);
	const first = parts[0]?.[0];
	if (!first) return "?";
	const second = parts.length > 1 ? parts[1]?.[0] : parts[0]?.[1];
	return `${first}${second ?? ""}`.toUpperCase();
}
