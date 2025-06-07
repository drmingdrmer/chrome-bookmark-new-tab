export interface Bookmark {
    id: string;
    title: string;
    url?: string;
    parentId: string;
    isFolder: boolean;
    children?: string[];
    dateAdded?: number;
    index?: number;
}

export interface BookmarkTreeNode {
    id: string;
    title: string;
    url?: string;
    parentId?: string;
    children?: BookmarkTreeNode[];
    dateAdded?: number;
    index?: number;
}

export interface Config {
    maxEntriesPerColumn: number;
}

export interface SearchResult {
    bookmark: Bookmark;
    matchType: 'title' | 'url';
    folderPath: string;
}

export interface FolderColumn {
    folderId: string;
    title: string;
    subtitle?: string;
    bookmarks: Bookmark[];
    color: string;
}

export interface DragData {
    bookmarkId: string;
    sourceIndex: number;
    sourceParentId: string;
} 