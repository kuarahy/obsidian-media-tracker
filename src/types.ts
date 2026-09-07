export const VIEW_TYPE_MEDIA_TRACKER = "pegasus-media-tracker";

export type LibraryNode = CollectionNode | ItemNode;

export interface CollectionNode {
	kind: "collection";
	/** Card / breadcrumb label (`title` on Cover.md, else folder name). */
	name: string;
	path: string;
}

export interface ItemNode {
	kind: "item";
	name: string;
	path: string;
	done: boolean;
}

export interface BreadcrumbSegment {
	name: string;
	path: string;
}
