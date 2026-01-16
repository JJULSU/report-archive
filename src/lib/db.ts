import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';
import { v4 as uuidv4 } from 'uuid';

interface ReportInsightDB extends DBSchema {
    files: {
        key: string; // uuid
        value: {
            id: string;
            name: string;
            type: string; // 'application/pdf'
            content: Blob;
            parentId: string | null; // for folders (future proofing)
            createdAt: number;
        };
        indexes: { 'by-date': number };
    };
    scrapbook: {
        key: string;
        value: {
            id: string;
            type: 'image' | 'text' | 'heading';
            content: string; // Base64 for images, text for others
            comment?: string; // For image blocks
            meta?: {
                sourcePdfId?: string;
                pageNumber?: number;
                sourceTitle?: string;
                date?: string;
                citation?: string;
                highlights?: { x: number, y: number, width: number, height: number }[];
            };
            tags?: string[];
            archived?: boolean; // For "Refresh" feature (hide from main view)
            folderId?: string; // Future proofing
            order: number;
            createdAt: number;
        };
        indexes: { 'by-order': number; 'by-tag': string; 'archived': number }; // archived is boolean mapped to 0/1 usually, or just filter in app
    };
    annotations: {
        key: string;
        value: {
            id: string;
            fileId: string;
            pageNumber: number;
            rects: { x: number, y: number, width: number, height: number }[];
            text: string;
            color: string;
            createdAt: number;
        };
        indexes: { 'fileId': string };
    };
    settings: {
        key: string;
        value: any;
    };
}

const DB_NAME = 'report-insight-db';
const DB_VERSION = 3; // Increment version for schema change

let dbPromise: Promise<IDBPDatabase<ReportInsightDB>>;

export const initDB = () => {
    if (!dbPromise) {
        dbPromise = openDB<ReportInsightDB>(DB_NAME, DB_VERSION, {
            upgrade(db, oldVersion, _newVersion, transaction) {
                if (!db.objectStoreNames.contains('files')) {
                    const fileStore = db.createObjectStore('files', { keyPath: 'id' });
                    fileStore.createIndex('by-date', 'createdAt');
                }

                let scrapStore;
                if (!db.objectStoreNames.contains('scrapbook')) {
                    scrapStore = db.createObjectStore('scrapbook', { keyPath: 'id' });
                    scrapStore.createIndex('by-order', 'order');
                } else {
                    scrapStore = transaction.objectStore('scrapbook');
                }

                if (oldVersion < 2) {
                    // Add indexes for new fields if they don't exist
                    if (!scrapStore.indexNames.contains('by-tag')) {
                        scrapStore.createIndex('by-tag', 'tags', { multiEntry: true });
                    }
                }

                if (!db.objectStoreNames.contains('annotations')) {
                    const annotationStore = db.createObjectStore('annotations', { keyPath: 'id' });
                    annotationStore.createIndex('fileId', 'fileId');
                }

                // New in v3: Settings for Directory Handle
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings');
                }
            },
        });
    }
    return dbPromise;
};

// ... (File Operations remain same)

// Settings / Handle Operations
export const getSetting = async (key: string) => {
    const db = await initDB();
    return db.get('settings', key);
};

export const setSetting = async (key: string, value: any) => {
    const db = await initDB();
    await db.put('settings', value, key);
};

// ... (Existing exports)
// File Operations
export const addFile = async (file: File) => {
    const db = await initDB();
    const id = uuidv4();
    await db.add('files', {
        id,
        name: file.name,
        type: file.type,
        content: file,
        parentId: null,
        createdAt: Date.now(),
    });
    return id;
};

export const getAllFiles = async () => {
    const db = await initDB();
    return db.getAllFromIndex('files', 'by-date');
};

export const getFile = async (id: string) => {
    const db = await initDB();
    return db.get('files', id);
};

export const deleteFile = async (id: string) => {
    const db = await initDB();
    await db.delete('files', id);
};

// Scrapbook Operations
export const addScrapItem = async (item: Omit<ReportInsightDB['scrapbook']['value'], 'id' | 'createdAt'>) => {
    const db = await initDB();
    const id = uuidv4();
    await db.add('scrapbook', {
        ...item,
        id,
        createdAt: Date.now(),
        // Defaults
        tags: item.tags || [],
        archived: item.archived || false,
    });
    return id;
};

export const getAllScrapItems = async () => {
    const db = await initDB();
    return db.getAllFromIndex('scrapbook', 'by-order');
};

export const updateScrapOrder = async (items: ReportInsightDB['scrapbook']['value'][]) => {
    const db = await initDB();
    const tx = db.transaction('scrapbook', 'readwrite');
    await Promise.all(items.map(item => tx.store.put(item)));
    await tx.done;
};

export const deleteScrapItem = async (id: string) => {
    const db = await initDB();
    await db.delete('scrapbook', id);
};

export const updateScrapItem = async (item: ReportInsightDB['scrapbook']['value']) => {
    const db = await initDB();
    await db.put('scrapbook', item);
};

export const getScrapItemsByTag = async (tag: string) => {
    const db = await initDB();
    return db.getAllFromIndex('scrapbook', 'by-tag', tag);
};

// Annotation Operations
export const addAnnotation = async (annotation: Omit<ReportInsightDB['annotations']['value'], 'id' | 'createdAt'>) => {
    const db = await initDB();
    const id = uuidv4();
    await db.add('annotations', {
        ...annotation,
        id,
        createdAt: Date.now(),
    });
    return id;
};

export const getAnnotations = async (fileId: string, pageNumber: number) => {
    const db = await initDB();
    const all = await db.getAllFromIndex('annotations', 'fileId', fileId);
    return all.filter(a => a.pageNumber === pageNumber);
};

export const deleteAnnotation = async (id: string) => {
    const db = await initDB();
    await db.delete('annotations', id);
};
