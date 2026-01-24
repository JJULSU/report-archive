import { useState, useEffect, useMemo } from 'react';
import { Copy, FileDown, RotateCcw, Folder, Save, Settings } from 'lucide-react';
import { getAllScrapItems, deleteScrapItem, updateScrapItem } from '../../lib/db';
import { ScrapBlock } from './ScrapBlock';
import { copyToClipboard, exportToPdf } from '../../utils/export';
import { ScrapHighlightModal } from './ScrapHighlightModal';
import { flattenImage, dataUrlToBlob } from '../../utils/imageUtils';
import { TelegramSettingsModal } from './TelegramSettingsModal';
import './Scrapbook.css';
import './Footer.css';

export function Scrapbook() {
    const [items, setItems] = useState<any[]>([]);
    const [editingItem, setEditingItem] = useState<any>(null);
    const [viewMode, setViewMode] = useState<'current' | 'archive'>('current');
    const [selectedTag, setSelectedTag] = useState<string | null>(null);
    const [showTelegramSettings, setShowTelegramSettings] = useState(false);

    const loadItems = async () => {
        const storedItems = await getAllScrapItems();
        setItems(storedItems.sort((a, b) => a.order - b.order));
    };

    useEffect(() => {
        loadItems();
        const handleUpdate = () => loadItems();
        window.addEventListener('scrapbook-update', handleUpdate);
        return () => window.removeEventListener('scrapbook-update', handleUpdate);
    }, []);

    // Derived state
    const currentItems = useMemo(() => items.filter(i => !i.archived), [items]);
    const archivedItems = useMemo(() => items.filter(i => i.archived), [items]);

    const allTags = useMemo(() => {
        const tags = new Set<string>();
        items.forEach(item => item.tags?.forEach((t: string) => tags.add(t)));
        return Array.from(tags).sort();
    }, [items]);

    const displayItems = useMemo(() => {
        if (viewMode === 'current') return currentItems;
        if (selectedTag) {
            return archivedItems.filter(i => i.tags?.includes(selectedTag));
        }
        return archivedItems;
    }, [viewMode, currentItems, archivedItems, selectedTag]);

    const handleSave = async () => {
        if (currentItems.length === 0) return;

        let rootHandle: FileSystemDirectoryHandle | null = await (async () => {
            try {
                // @ts-ignore
                const handle = await import('../../lib/db').then(m => m.getSetting('archiveRootHandle'));
                return handle as FileSystemDirectoryHandle;
            } catch { return null; }
        })();

        if (!rootHandle) {
            if (!window.confirm(`Archive ${currentItems.length} items? You will be asked to select a folder to save these items locally.`)) return;
            try {
                // @ts-ignore
                rootHandle = await window.showDirectoryPicker();
                // @ts-ignore
                await import('../../lib/db').then(m => m.setSetting('archiveRootHandle', rootHandle));
            } catch (e) {
                console.error("Folder selection cancelled", e);
                return;
            }
        } else {
            // Check permission
            // @ts-ignore
            if ((await rootHandle.queryPermission({ mode: 'readwrite' })) !== 'granted') {
                // @ts-ignore
                if ((await rootHandle.requestPermission({ mode: 'readwrite' })) !== 'granted') {
                    alert("Permission denied to save files.");
                    return;
                }
            }
        }

        if (!rootHandle) return;

        // Archive current items
        let savedCount = 0;
        for (const item of currentItems) {
            try {
                // Determine Folder Name (First tag or 'Untagged')
                const folderName = (item.tags && item.tags.length > 0) ? item.tags[0] : 'Untagged';

                // Get/Create Directory
                // @ts-ignore
                const dirHandle = await rootHandle.getDirectoryHandle(folderName, { create: true });

                // Save Image (if image)
                if (item.type === 'image' && item.content.startsWith('data:image')) {
                    // Flatten highlights if they exist
                    let finalContent = item.content;
                    if (item.meta && item.meta.highlights && item.meta.highlights.length > 0) {
                        finalContent = await flattenImage(item.content, item.meta.highlights);
                    }

                    // Convert Base64/DataURL to Blob
                    const blob = await dataUrlToBlob(finalContent);
                    const filename = `scrap-${item.createdAt}.png`;

                    // @ts-ignore
                    const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
                    // @ts-ignore
                    const writable = await fileHandle.createWritable();
                    // @ts-ignore
                    await writable.write(blob);
                    // @ts-ignore
                    await writable.close();

                    // Save Comment if exists
                    if (item.comment) {
                        const txtFilename = `scrap-${item.createdAt}.txt`;
                        // @ts-ignore
                        const txtHandle = await dirHandle.getFileHandle(txtFilename, { create: true });
                        // @ts-ignore
                        const txtWritable = await txtHandle.createWritable();
                        // @ts-ignore
                        await txtWritable.write(item.comment);
                        // @ts-ignore
                        await txtWritable.close();
                    }
                }

                // Update DB (mark as archived)
                await updateScrapItem({ ...item, archived: true });
                savedCount++;
            } catch (err) {
                console.error("Failed to save item to disk", item, err);
            }
        }

        loadItems();
        if (savedCount > 0) {
            alert(`Successfully saved and archived ${savedCount} items.`);
        }
    };

    const handleRefresh = async () => {
        if (currentItems.length === 0) return;
        if (!window.confirm(`Delete ALL ${currentItems.length} items from current view? This cannot be undone.`)) return;

        await Promise.all(currentItems.map(item => deleteScrapItem(item.id)));
        loadItems();
    };

    const handleDelete = async (id: string) => {
        console.log('Delete requested for scrap:', id);
        if (window.confirm('Delete this scrap completely?')) {
            console.log('Confirmed delete for scrap:', id);
            try {
                await deleteScrapItem(id);
                console.log('Scrap deleted from DB');
                await loadItems();
                console.log('Items reloaded');
            } catch (err) {
                console.error('Delete failed:', err);
            }
        }
    };

    const handleUpdateItem = async (updatedItem: any) => {
        await updateScrapItem(updatedItem);
        loadItems();
    };

    return (
        <div className="scrapbook-container">
            {/* Header */}
            <div className="scrapbook-header">
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <span
                        className={`header-tab ${viewMode === 'current' ? 'active' : ''}`}
                        onClick={() => { setViewMode('current'); setSelectedTag(null); }}
                    >
                        Current
                    </span>
                    <span
                        className={`header-tab ${viewMode === 'archive' ? 'active' : ''}`}
                        onClick={() => setViewMode('archive')}
                    >
                        <Folder size={16} /> Archive
                    </span>
                </div>

                {viewMode === 'current' && (
                    <div className="header-actions" style={{ display: 'flex', gap: '4px' }}>
                        <button className="refresh-btn" onClick={() => setShowTelegramSettings(true)} title="Telegram Settings">
                            <Settings size={16} />
                        </button>
                        <button className="refresh-btn" onClick={handleSave} title="Save to Disk & Archive" disabled={currentItems.length === 0}>
                            <Save size={16} />
                        </button>
                        <button className="refresh-btn" onClick={handleRefresh} title="Clear All Items" disabled={currentItems.length === 0}>
                            <RotateCcw size={16} />
                        </button>
                    </div>
                )}
            </div>

            {/* Sub-Header for Archive (Breadcrumbs/Nav) */}
            {viewMode === 'archive' && (
                <div className="archive-nav">
                    {selectedTag ? (
                        <div className="tag-breadcrumb">
                            <span className="back-link" onClick={() => setSelectedTag(null)}>All Folders</span>
                            <span className="separator">/</span>
                            <span className="current-tag">{selectedTag}</span>
                        </div>
                    ) : (
                        <div className="archive-title">Select a Tag Folder</div>
                    )}
                </div>
            )}

            {/* Main Content List */}
            <div className="scrapbook-list">
                {viewMode === 'current' && displayItems.length === 0 && (
                    <div className="empty-scrapbook">
                        Select an area in the PDF viewer to capture it here.
                    </div>
                )}

                {viewMode === 'archive' && !selectedTag ? (
                    // Folder View (Tags List)
                    <div className="folder-grid">
                        {allTags.length === 0 && <div className="empty-message">No tags created yet.</div>}
                        {allTags.map(tag => (
                            <div key={tag} className="folder-item" onClick={() => setSelectedTag(tag)}>
                                <Folder size={40} className="folder-icon" />
                                <span className="folder-name">{tag}</span>
                                <span className="folder-count">
                                    {archivedItems.filter(i => i.tags?.includes(tag)).length} items
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    // Items List 
                    displayItems.map(item => (
                        <ScrapBlock
                            key={item.id}
                            item={item}
                            isArchived={viewMode === 'archive'}
                            existingTags={allTags}
                            onDelete={handleDelete}
                            onUpdate={handleUpdateItem}
                            onOpenHighlight={() => setEditingItem(item)}
                        />
                    ))
                )}
            </div>

            {/* Footer Actions */}
            <div className="scrapbook-footer">
                <button className="export-btn" onClick={() => copyToClipboard(displayItems)} title="Copy HTML">
                    <Copy size={16} />
                    <span>Copy HTML</span>
                </button>
                <div className="divider" />
                <button className="export-btn" onClick={() => exportToPdf(displayItems)} title="Export PDF">
                    <FileDown size={16} />
                    <span>Export PDF</span>
                </button>
            </div>

            {/* Highlight Modal */}
            {editingItem && (
                <ScrapHighlightModal
                    imageUrl={editingItem.content}
                    initialHighlights={editingItem.meta?.highlights || []}
                    onSave={async (highlights) => {
                        const dbInput = {
                            ...editingItem,
                            meta: { ...editingItem.meta, highlights }
                        };
                        await updateScrapItem(dbInput);
                        setEditingItem(null);
                        loadItems();
                    }}
                    onClose={() => setEditingItem(null)}
                />
            )}

            {/* Telegram Settings Modal */}
            {showTelegramSettings && (
                <TelegramSettingsModal onClose={() => setShowTelegramSettings(false)} />
            )}
        </div>
    );
}
