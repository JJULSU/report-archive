import { useState } from 'react';
import { deleteFile } from '../../lib/db';
import { FileUploader } from './FileUploader';
import { FileText, Trash2, Library as LibraryIcon, RotateCcw } from 'lucide-react';
import './Library.css';

export interface FileData {
    id: string;
    name: string;
    createdAt: number;
}

interface LibraryProps {
    files: FileData[];
    selectedId: string | null;
    onSelectFile: (fileId: string) => void;
    onRefreshFiles: () => void;
}

export function Library({ files, selectedId, onSelectFile, onRefreshFiles }: LibraryProps) {
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleClearAll = async () => {
        if (files.length === 0) return;
        if (!confirm('Clear all files from Library? This cannot be undone.')) return;

        setIsRefreshing(true);
        // Delete all files
        await Promise.all(files.map(f => deleteFile(f.id)));
        await onRefreshFiles();
        onSelectFile(''); // Clear selection
        setTimeout(() => setIsRefreshing(false), 500);
    };

    const handleFileClick = (file: FileData) => {
        onSelectFile(file.id);
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        console.log('Attempting to delete file:', id);
        if (confirm('Are you sure you want to delete this file?')) {
            console.log('User confirmed delete');
            try {
                await deleteFile(id);
                console.log('File deleted from DB');
                await onRefreshFiles();
                console.log('Files refreshed');
                if (selectedId === id) {
                    onSelectFile(''); // Clear selection if deleted
                }
            } catch (err) {
                console.error('Error deleting file:', err);
            }
        } else {
            console.log('User cancelled delete');
        }
    };

    return (
        <div className="library-container">
            <div className="library-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <LibraryIcon size={18} />
                    <span>Library</span>
                </div>
                <button
                    onClick={handleClearAll}
                    className={`action-btn ${isRefreshing ? 'spinning' : ''}`}
                    title="Clear All Files"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                >
                    <RotateCcw size={16} />
                </button>
            </div>

            <FileUploader onUploadComplete={onRefreshFiles} />

            <div className="file-list">
                {files.length === 0 && (
                    <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '2rem' }}>
                        No files yet.
                    </div>
                )}
                {files.map(file => (
                    <div
                        key={file.id}
                        className={`file-item ${selectedId === file.id ? 'active' : ''}`}
                        onClick={() => handleFileClick(file)}
                    >
                        <FileText size={18} className="file-icon" />
                        <div className="file-info">
                            <span className="file-name" title={file.name}>{file.name}</span>
                            <div className="file-date">{new Date(file.createdAt).toLocaleDateString()}</div>
                        </div>
                        <div className="file-actions">
                            <button className="action-btn" onClick={(e) => handleDelete(e, file.id)}>
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
