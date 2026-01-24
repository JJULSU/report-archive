import { useEffect, useState, useRef } from 'react';
import * as pdfjs from 'pdfjs-dist';
// @ts-ignore
import pdfWorker from 'pdfjs-dist/build/pdf.worker?url';
// @ts-ignore
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { getFile, addAnnotation, getAnnotations } from '../../lib/db';
import 'pdfjs-dist/web/pdf_viewer.css';
import './Workspace.css';

// Configure worker
// @ts-ignore
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

// Extend window to include pdfjsLib
declare global {
    interface Window {
        pdfjsLib: any;
    }
}

interface PdfViewerProps {
    fileId: string;
    scale: number;
    pageNumber: number;
    onLoadSuccess: (numPages: number) => void;
    onZoom?: (delta: number) => void;
    onPageChange?: (page: number) => void;
}

export function PdfViewer({ fileId, scale, pageNumber, onLoadSuccess, onZoom, onPageChange }: PdfViewerProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const renderTaskRef = useRef<any>(null); // To cancel ongoing renders

    const [pdfDoc, setPdfDoc] = useState<pdfjs.PDFDocumentProxy | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Wheel Zoom handler
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleWheel = (e: WheelEvent) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                if (onZoom) {
                    onZoom(e.deltaY > 0 ? -0.1 : 0.1);
                }
            }
        };

        container.addEventListener('wheel', handleWheel, { passive: false });
        return () => container.removeEventListener('wheel', handleWheel);
    }, [onZoom]);

    // Load Document
    useEffect(() => {
        const loadDoc = async () => {
            if (!fileId) return;
            setIsLoading(true);
            try {
                const fileData = await getFile(fileId);
                if (fileData) {
                    const arrayBuffer = await fileData.content.arrayBuffer();
                    const loadingTask = pdfjs.getDocument(arrayBuffer);
                    const pdf = await loadingTask.promise;
                    setPdfDoc(pdf);
                    onLoadSuccess(pdf.numPages);
                }
            } catch (error) {
                console.error("Error loading PDF", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadDoc();
    }, [fileId, onLoadSuccess]);

    // Render Page
    useEffect(() => {
        const renderPage = async () => {
            if (!pdfDoc || !canvasRef.current || !containerRef.current) return;

            // Cancel previous render if any
            if (renderTaskRef.current) {
                renderTaskRef.current.cancel();
            }

            try {
                const page = await pdfDoc.getPage(pageNumber);

                // HiDPI Scaling - Force 2x extra sharpness
                const pixelRatio = (window.devicePixelRatio || 1) * 2;
                // Compute viewport
                const viewport = page.getViewport({ scale: scale * pixelRatio });
                const cssViewport = page.getViewport({ scale: scale });

                const canvas = canvasRef.current;
                const context = canvas.getContext('2d');

                if (!context) return;

                // Set dimensions
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                // Style dimensions
                canvas.style.width = `${cssViewport.width}px`;
                canvas.style.height = `${cssViewport.height}px`;

                // Transform context
                context.scale(pixelRatio, pixelRatio);

                // Render PDF to Canvas
                const renderContext = {
                    canvasContext: context,
                    viewport: cssViewport,
                };

                const renderTask = page.render(renderContext as any);
                renderTaskRef.current = renderTask;
                await renderTask.promise;

                // --- Interaction Layers ---
                const layerViewport = cssViewport;

                // Get classes from export OR global
                const TextLayerClass = pdfjs.TextLayer || window.pdfjsLib?.TextLayer;

                // 1. Annotation Layer (Links, Forms)
                if (!containerRef.current) return;
                const annotationLayerDiv = containerRef.current.querySelector('.annotationLayer') as HTMLDivElement;
                if (annotationLayerDiv) {
                    annotationLayerDiv.innerHTML = '';
                    annotationLayerDiv.style.width = `${layerViewport.width}px`;
                    annotationLayerDiv.style.height = `${layerViewport.height}px`;

                    try {
                        const notes = await page.getAnnotations();
                        console.log(`[PdfViewer] Page ${pageNumber}: Found ${notes.length} annotations.`);

                        // Manual Link Rendering
                        notes.forEach((note: any) => {
                            if (note.subtype === 'Link') {
                                const { rect, url, dest } = note;
                                if (rect) {
                                    // rect is [x1, y1, x2, y2] in PDF coordinates (bottom-left origin)
                                    // viewport.convertToViewportRectangle converts to [xMin, yMin, xMax, yMax] in viewer coordinates (top-left origin)
                                    const viewRect = layerViewport.convertToViewportRectangle(rect);

                                    // Ensure xMin < xMax and yMin < yMax
                                    const minX = Math.min(viewRect[0], viewRect[2]);
                                    const maxX = Math.max(viewRect[0], viewRect[2]);
                                    const minY = Math.min(viewRect[1], viewRect[3]);
                                    const maxY = Math.max(viewRect[1], viewRect[3]);

                                    const a = document.createElement('a');
                                    a.style.position = 'absolute';
                                    a.style.left = `${minX}px`;
                                    a.style.top = `${minY}px`;
                                    a.style.width = `${maxX - minX}px`;
                                    a.style.height = `${maxY - minY}px`;

                                    // Debug styling to see if links are created
                                    // a.style.border = '1px solid rgba(0,0,255,0.2)'; 
                                    a.style.cursor = 'pointer';

                                    if (url) {
                                        a.href = url;
                                        a.target = '_blank';
                                        a.rel = 'noopener noreferrer';
                                    } else if (dest) {
                                        a.href = '#';
                                        a.onclick = async (e) => {
                                            e.preventDefault();
                                            if (!pdfDoc) return;
                                            try {
                                                let explicitDest = dest;
                                                if (typeof dest === 'string') {
                                                    explicitDest = await pdfDoc.getDestination(dest);
                                                }
                                                if (explicitDest) {
                                                    const destRef = explicitDest[0];
                                                    const pageIndex = await pdfDoc.getPageIndex(destRef);
                                                    if (onPageChange) {
                                                        onPageChange(pageIndex + 1);
                                                    }
                                                }
                                            } catch (err) {
                                                console.error("[PdfViewer] Link navigation failed", err);
                                            }
                                        };
                                    }

                                    annotationLayerDiv.appendChild(a);
                                }
                            }
                        });

                    } catch (e) {
                        console.warn("[PdfViewer] Annotation rendering failed", e);
                    }
                }

                // 2. Text Layer (Selection)
                const textLayerDiv = containerRef.current.querySelector('.textLayer') as HTMLDivElement;
                if (textLayerDiv) {
                    textLayerDiv.innerHTML = '';
                    textLayerDiv.style.width = `${layerViewport.width}px`;
                    textLayerDiv.style.height = `${layerViewport.height}px`;

                    const textContent = await page.getTextContent();

                    if (TextLayerClass) {
                        // @ts-ignore
                        new TextLayerClass({
                            textContentSource: textContent,
                            container: textLayerDiv,
                            viewport: layerViewport,
                        }).render();
                    }
                }

                // 3. User Highlights (Yellow Overlays)
                // Fetch from DB and render
                try {
                    const savedAnnotations = await getAnnotations(fileId, pageNumber);
                    console.log(`[PdfViewer] Page ${pageNumber}: Found ${savedAnnotations.length} saved highlights in DB.`);
                    // Render into textLayer or a separate div? 
                    // Let's use textLayer for z-ordering with text
                    if (textLayerDiv) {
                        savedAnnotations.forEach((ann: any) => {
                            ann.rects.forEach((rect: any) => {
                                const div = document.createElement('div');
                                div.style.position = 'absolute';
                                div.style.left = `${rect.x * 100}%`;
                                div.style.top = `${rect.y * 100}%`;
                                div.style.width = `${rect.width * 100}%`;
                                div.style.height = `${rect.height * 100}%`;
                                div.style.backgroundColor = ann.color || 'yellow';
                                div.style.opacity = '0.4';
                                div.style.pointerEvents = 'none';
                                div.style.mixBlendMode = 'multiply';
                                // TextLayer text divs usually have transparent backgrounds, so this works if appended.
                                textLayerDiv.appendChild(div);
                            });
                        });
                    }
                } catch (e) {
                    console.error("[PdfViewer] Fetching annotations failed", e);
                }

            } catch (error: any) {
                if (error.name !== 'RenderingCancelledException') {
                    console.error('Render error', error);
                }
            }
        };

        renderPage();
    }, [pdfDoc, pageNumber, scale, fileId, onPageChange]);

    // Handle Selection for Creating Highlights
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleMouseUp = async () => {
            const selection = window.getSelection();
            if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;

            const range = selection.getRangeAt(0);
            const containerRect = container.getBoundingClientRect();
            const clientRects = range.getClientRects();

            // Normalize rects
            const rects = Array.from(clientRects).map(r => ({
                x: (r.left - containerRect.left) / containerRect.width,
                y: (r.top - containerRect.top) / containerRect.height,
                width: r.width / containerRect.width,
                height: r.height / containerRect.height
            }));

            if (rects.length > 0) {
                await addAnnotation({
                    fileId,
                    pageNumber,
                    rects,
                    text: selection.toString(),
                    color: 'yellow'
                });

                selection.removeAllRanges(); // Clear selection

                // Manually append new highlight to DOM to avoid full re-render flickering
                const textLayerDiv = container.querySelector('.textLayer');
                if (textLayerDiv) {
                    rects.forEach(rect => {
                        const div = document.createElement('div');
                        div.style.position = 'absolute';
                        div.style.left = `${rect.x * 100}%`;
                        div.style.top = `${rect.y * 100}%`;
                        div.style.width = `${rect.width * 100}%`;
                        div.style.height = `${rect.height * 100}%`;
                        div.style.backgroundColor = 'yellow';
                        div.style.opacity = '0.4';
                        div.style.pointerEvents = 'none';
                        div.style.mixBlendMode = 'multiply';
                        textLayerDiv.appendChild(div);
                    });
                }
            }
        };

        container.addEventListener('mouseup', handleMouseUp);
        return () => container.removeEventListener('mouseup', handleMouseUp);
    }, [fileId, pageNumber]);

    // Keyboard Navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!onPageChange) return;
            if (e.key === 'ArrowLeft') {
                onPageChange(Math.max(1, pageNumber - 1));
            } else if (e.key === 'ArrowRight') {
                onPageChange(pageNumber + 1);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [pageNumber, onPageChange]);

    if (isLoading) {
        return <div className="viewer-placeholder">Loading PDF...</div>;
    }

    return (
        <div className="pdf-canvas-wrapper" style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
            {/* Navigation Click Zones */}
            <div
                style={{ position: 'absolute', top: 0, left: 0, width: '150px', height: '100%', cursor: 'pointer', zIndex: 10 }}
                onClick={() => onPageChange && onPageChange(Math.max(1, pageNumber - 1))}
                title="Previous Page"
            />
            <div
                style={{ position: 'absolute', top: 0, right: 0, width: '150px', height: '100%', cursor: 'pointer', zIndex: 10 }}
                onClick={() => onPageChange && onPageChange(pageNumber + 1)}
                title="Next Page"
            />

            <div ref={containerRef} style={{ position: 'relative', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
                <canvas ref={canvasRef} style={{ display: 'block' }} />
                <div className="textLayer" />
                <div className="annotationLayer" />
            </div>
        </div>
    );
}
