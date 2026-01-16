import { useState, useEffect } from 'react';
import { deleteFile, addFile } from '../../lib/db';
import { FileUploader } from './FileUploader';
import { FileText, Trash2, Library as LibraryIcon, RotateCcw, HardDrive, Cloud, Download } from 'lucide-react';
import { GoogleLoginBtn } from '../Auth/GoogleLoginBtn';
import { GoogleDriveService } from '../../lib/googleDrive';
import './Library.css';
import clsx from 'clsx';

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
    const [activeTab, setActiveTab] = useState<'local' | 'drive'>('local');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [driveFiles, setDriveFiles] = useState<any[]>([]);
    const [isLoadingDrive, setIsLoadingDrive] = useState(false);
    const [isImporting, setIsImporting] = useState(false);

    // Existing Local File Handlers
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
        if (confirm('Are you sure you want to delete this file?')) {
            try {
                await deleteFile(id);
                await onRefreshFiles();
                if (selectedId === id) onSelectFile('');
            } catch (err) {
                console.error('Error deleting file:', err);
            }
        }
    };

    // Drive Handlers
    const fetchDriveFiles = async () => {
        setIsLoadingDrive(true);
        try {
            const list = await GoogleDriveService.listPdfFiles();
            setDriveFiles(list);
        } catch (error) {
            console.error("Failed to load drive files", error);
        } finally {
            setIsLoadingDrive(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'drive') {
            fetchDriveFiles();
        }
    }, [activeTab]);

    const handleDriveFileImport = async (file: any) => {
        if (isImporting) return;
        setIsImporting(true);
        try {
            const token = localStorage.getItem('google_access_token');
            if (!token) throw new Error("Not logged in");

            const blob = await GoogleDriveService.downloadFile(file.id, token);
            const fileObj = new File([blob], file.name, { type: 'application/pdf' });
            const newId = await addFile(fileObj);

            await onRefreshFiles();
            onSelectFile(newId);
            setActiveTab('local');
            alert(`Imported "${file.name}" to Library`);
        } catch (e) {
            console.error("Import failed", e);
            alert("Failed to import file from Drive.");
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <div className="library-container">
            <div className="library-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <LibraryIcon size={18} />
                    <span>Library</span>
                </div>
                {/* Auth Button in Header */}
                <GoogleLoginBtn />
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #eee', marginBottom: '10px' }}>
                <button
                    className={clsx("tab-btn", activeTab === 'local' && 'active')}
                    onClick={() => setActiveTab('local')}
                    style={{
                        flex: 1, padding: '8px', border: 'none', background: 'none', cursor: 'pointer',
                        borderBottom: activeTab === 'local' ? '2px solid #333' : '2px solid transparent',
                        fontWeight: activeTab === 'local' ? 'bold' : 'normal',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                    }}
                >
                    <HardDrive size={14} /> Local
                </button>
                <button
                    className={clsx("tab-btn", activeTab === 'drive' && 'active')}
                    onClick={() => setActiveTab('drive')}
                    style={{
                        flex: 1, padding: '8px', border: 'none', background: 'none', cursor: 'pointer',
                        borderBottom: activeTab === 'drive' ? '2px solid #333' : '2px solid transparent',
                        fontWeight: activeTab === 'drive' ? 'bold' : 'normal',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                    }}
                >
                    <Cloud size={14} /> Drive
                </button>
            </div>

            {activeTab === 'local' && (
                <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <FileUploader onUploadComplete={onRefreshFiles} />
                        <button
                            onClick={handleClearAll}
                            className={`action-btn ${isRefreshing ? 'spinning' : ''}`}
                            title="Clear All Files"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                        >
                            <RotateCcw size={16} />
                        </button>
                    </div>

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
                </>
            )}

            {activeTab === 'drive' && (
                <div className="file-list">
                    {/* Refresh Drive List */}
                    <div style={{ textAlign: 'right', marginBottom: '5px' }}>
                        <button onClick={fetchDriveFiles} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', textDecoration: 'underline' }}>
                            Refresh List
                        </button>
                    </div>

                    {isLoadingDrive ? (
                        <div style={{ textAlign: 'center', padding: '20px' }}>Loading Drive...</div>
                    ) : driveFiles.length === 0 ? (
                        <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '2rem' }}>
                            No PDFs found or not logged in.
                        </div>
                    ) : (
                        driveFiles.map(file => (
                            <div
                                key={file.id}
                                className="file-item drive-item"
                                onClick={() => handleDriveFileImport(file)}
                                style={{ cursor: isImporting ? 'wait' : 'pointer' }}
                            >
                                <FileText size={18} className="file-icon" color="#4285F4" />
                                <div className="file-info">
                                    <span className="file-name" title={file.name}>{file.name}</span>
                                    <div className="file-date" style={{ fontSize: '10px', color: '#888' }}>Tap to Import</div>
                                </div>
                                <div className="file-actions">
                                    <Download size={14} />
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
