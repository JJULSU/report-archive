import { useState, useCallback, useEffect } from 'react';
import './index.css';
import { SplitLayout } from './components/common/SplitLayout';
import { Library, type FileData } from './components/Library/Library';
import { Workspace } from './components/Workspace/Workspace';
import { Scrapbook } from './components/Scrapbook/Scrapbook';
import { getAllFiles } from './lib/db';

function App() {
    const [activeFileId, setActiveFileId] = useState<string | null>(null);
    const [files, setFiles] = useState<FileData[]>([]);

    const loadFiles = useCallback(async () => {
        const storedFiles = await getAllFiles();
        setFiles(storedFiles.sort((a, b) => b.createdAt - a.createdAt));
    }, []);

    useEffect(() => {
        loadFiles();
    }, [loadFiles]);

    const handleNextFile = () => {
        if (!activeFileId || files.length === 0) return;

        const currentIndex = files.findIndex(f => f.id === activeFileId);

        if (currentIndex !== -1 && currentIndex < files.length - 1) {
            const nextFile = files[currentIndex + 1];
            setActiveFileId(nextFile.id);
        } else {
            alert("End of library reached.");
        }
    };

    return (
        <div className="app-container">
            <SplitLayout
                left={
                    <Library
                        files={files}
                        selectedId={activeFileId}
                        onSelectFile={setActiveFileId}
                        onRefreshFiles={loadFiles}
                    />
                }
                center={
                    <Workspace
                        activeFileId={activeFileId}
                        onNextFile={handleNextFile}
                    />
                }
                right={<Scrapbook />}
            />
        </div>
    );
}

export default App;
