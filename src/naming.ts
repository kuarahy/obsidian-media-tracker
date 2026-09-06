const ISSUE_AT_END = /#\s*(\d+)\s*$/;

// ninja: one trailing #N parser covers X-Men #16, #16, and Good Girls S01 #3.
export function parseIssueNumber(basename: string): number | null {
	const match = basename.match(ISSUE_AT_END);
	const raw = match?.[1];
	if (raw === undefined) return null;
	const n = Number(raw);
	return Number.isFinite(n) ? n : null;
}

export function nextIssueNumber(basenames: string[]): number {
	let max = 0;
	for (const name of basenames) {
		const n = parseIssueNumber(name);
		if (n !== null && n > max) max = n;
	}
	return max + 1;
}

export function nextNoteBasename(existingBasenames: string[], collectionTitle: string): string {
	const taken = new Set(existingBasenames);
	let n = nextIssueNumber(existingBasenames);
	let candidate = `${collectionTitle} #${n}`;
	while (taken.has(candidate)) {
		n += 1;
		candidate = `${collectionTitle} #${n}`;
	}
	return candidate;
}
