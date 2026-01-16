import { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { PdfViewer } from './PdfViewer';
import { Toolbar } from './Toolbar';
import { SelectionOverlay } from './SelectionOverlay';
import { addScrapItem, getFile } from '../../lib/db';
import clsx from 'clsx';
import './Workspace.css';

interface WorkspaceProps {
    activeFileId: string | null;
}

export function Workspace({ activeFileId }: WorkspaceProps) {
    const [pageNumber, setPageNumber] = useState(1);
    const [numPages, setNumPages] = useState(0);
    const [scale, setScale] = useState(1.2); // Default scale 120%
    const [isCaptureMode, setCaptureMode] = useState(false);
    const [viewMode, setViewMode] = useState<'single' | 'double'>('single');
    const containerRef = useRef<HTMLDivElement>(null);

    // Reset state when file changes
    useEffect(() => {
        setPageNumber(1);
        setNumPages(0);
        setScale(1.2); // Default 1.2
        setCaptureMode(false);
    }, [activeFileId]);

    // Keyboard Navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!activeFileId) return;
            // Ignore if focus is in an input or contentEditable
            if (e.target instanceof HTMLElement && (e.target.isContentEditable || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
                return;
            }

            if (e.key === 'ArrowLeft') {
                handlePageChange(pageNumber - 1);
            } else if (e.key === 'ArrowRight') {
                handlePageChange(pageNumber + 1);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeFileId, pageNumber, numPages]); // Depend on pageNumber to update correctly

    const handleZoom = (delta: number) => {
        setScale(prev => Math.max(0.2, Math.min(3.0, prev + delta)));
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= numPages) {
            setPageNumber(newPage);
        }
    };



    const handleSelectionComplete = async (rect: { x: number, y: number, width: number, height: number } | null) => {
        setCaptureMode(false); // Exit capture mode

        if (!rect || !containerRef.current || !activeFileId) return;

        try {
            // Temporary hide selection overlay border and navigation zones for capture
            const overlay = containerRef.current.querySelector('.selection-overlay');
            const navZones = containerRef.current.querySelectorAll('.nav-zone');

            // Apply buffer to fix visual misalignment based on user feedback (Left cut, Right empty)
            // Shifting Left significantly (-30px) and matching width (+30px) to recover left side without extending right too much
            const safeX = Math.max(0, Math.round(rect.x) - 30);
            const safeY = Math.max(0, Math.round(rect.y) - 5);
            // Width +30 covers the 30px left shift, ending at the original right edge
            const safeWidth = Math.round(rect.width) + 30;
            const safeHeight = Math.round(rect.height) + 10;

            const capture = await html2canvas(containerRef.current, {
                x: safeX,
                y: safeY,
                width: safeWidth,
                height: safeHeight,
                scale: 3, // Increased resolution
                useCORS: true,
                logging: false,
                scrollX: 0,
                scrollY: 0,
                onclone: (clonedDoc) => {
                    const clonedOverlay = clonedDoc.querySelector('.selection-overlay');
                    if (clonedOverlay) clonedOverlay.remove();
                    const clonedNavZones = clonedDoc.querySelectorAll('.nav-zone');
                    clonedNavZones.forEach(el => el.remove());
                }
            });

            // Restore
            if (overlay) (overlay as HTMLElement).style.opacity = '1';
            navZones.forEach(el => (el as HTMLElement).style.display = 'block');

            const imgData = capture.toDataURL('image/png');

            // Get file metadata for citation
            const fileData = await getFile(activeFileId);
            const citation = fileData ? `[Source: ${fileData.name} / ${new Date().toLocaleDateString()}]` : '';

            // Add to scrapbook
            await addScrapItem({
                type: 'image',
                content: imgData,
                meta: {
                    sourcePdfId: activeFileId,
                    pageNumber: pageNumber,
                    sourceTitle: fileData?.name,
                    citation: citation
                },
                order: Date.now()
            });

            window.dispatchEvent(new CustomEvent('scrapbook-update'));

        } catch (e) {
            console.error("Capture failed", e);
            alert("Capture failed");
        }
    };

    return (
        <div className="workspace-container">
            <Toolbar
                pageNumber={pageNumber}
                numPages={numPages}
                onPageChange={handlePageChange}
                scale={scale}
                onScaleChange={setScale}
                isCaptureMode={isCaptureMode}
                onToggleCapture={() => setCaptureMode(!isCaptureMode)}
                viewMode={viewMode}
                onToggleViewMode={() => setViewMode(v => v === 'single' ? 'double' : 'single')}
            />

            <div className="workspace-content">
                {activeFileId ? (
                    <div ref={containerRef} className={clsx("pdf-scroll-container", viewMode === 'double' && 'double-view')} style={{ position: 'relative' }}>
                        {/* Navigation Click Zones */}
                        <div
                            className="nav-zone nav-prev"
                            onClick={(e) => { e.stopPropagation(); handlePageChange(pageNumber - 1); }}
                            title="Previous Page"
                        />
                        <div
                            className="nav-zone nav-next"
                            onClick={(e) => { e.stopPropagation(); handlePageChange(pageNumber + 1); }}
                            title="Next Page"
                        />

                        {/* Primary Page */}
                        <PdfViewer
                            fileId={activeFileId}
                            pageNumber={pageNumber}
                            scale={scale}
                            onLoadSuccess={setNumPages}
                            onZoom={handleZoom}
                            onPageChange={setPageNumber}
                        />

                        {/* Secondary Page (Double View) */}
                        {viewMode === 'double' && pageNumber < numPages && (
                            <PdfViewer
                                fileId={activeFileId}
                                pageNumber={pageNumber + 1}
                                scale={scale}
                                onLoadSuccess={() => { }} // Ignore stats from second page
                                onZoom={handleZoom}
                                onPageChange={setPageNumber}
                            />
                        )}

                        {isCaptureMode && <SelectionOverlay onSelectionComplete={handleSelectionComplete} />}
                    </div>
                ) : (
                    <div className="empty-workspace">
                        <p>Select a PDF from the library</p>
                    </div>
                )}
            </div>
        </div>
    );
}
