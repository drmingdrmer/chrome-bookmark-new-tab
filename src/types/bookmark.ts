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
    showDebugInfo: boolean;
    // AI配置
    aiApiUrl?: string;
    aiApiKey?: string;
    aiModel?: string;
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

// AI分析相关类型
export type BookmarkDimension = 'work' | 'learn' | 'fun' | 'tool' | 'other';

export interface BookmarkAnalysis {
    bookmark: Bookmark;
    score: number; // 1-10的重要性评分
    dimension: BookmarkDimension;
    reason: string;
}

export interface BookmarkRecommendation {
    bookmark: Bookmark;
    score: number;
    dimension: BookmarkDimension;
    reason: string;
    priority: number; // 1-5的推荐优先级
    recommendReason: string;
}

export interface AIConfig {
    apiUrl: string;
    apiKey: string;
    model: string;
    batchSize: number;
} 