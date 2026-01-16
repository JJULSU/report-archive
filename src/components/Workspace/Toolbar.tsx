import clsx from 'clsx';
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Crop, Grid2X2 } from 'lucide-react';
import './Workspace.css';

interface ToolbarProps {
    scale: number;
    onScaleChange: (scale: number) => void;
    pageNumber: number;
    onPageChange: (page: number) => void;
    numPages: number;
    isCaptureMode: boolean;
    onToggleCapture: () => void;
    viewMode: 'single' | 'double';
    onToggleViewMode: () => void;
}

export function Toolbar({
    pageNumber,
    numPages,
    onPageChange,
    scale,
    onScaleChange,
    isCaptureMode,
    onToggleCapture,
    viewMode,
    onToggleViewMode
}: ToolbarProps) {
    return (
        <div className="toolbar">
            <div className="toolbar-group">
                <button
                    className={clsx("tool-btn", isCaptureMode && "active")}
                    onClick={onToggleCapture}
                    title="Crop Tool"
                >
                    <Crop size={18} />
                </button>
            </div>
            <div className="toolbar-group">
                <button
                    className={clsx("tool-btn", viewMode === 'double' && "active")}
                    onClick={onToggleViewMode}
                    title="Toggle Dual Page View"
                >
                    <Grid2X2 size={18} />
                </button>
            </div>

            <div className="toolbar-divider" />

            <div className="toolbar-group">
                <button
                    className="tool-btn"
                    onClick={() => onPageChange(Math.max(1, pageNumber - 1))}
                    disabled={pageNumber <= 1}
                >
                    <ChevronLeft size={20} />
                </button>
                <span className="page-info">
                    Page {pageNumber} / {numPages || '--'}
                </span>
                <button
                    className="tool-btn"
                    onClick={() => onPageChange(Math.min(numPages, pageNumber + 1))}
                    disabled={pageNumber >= numPages}
                >
                    <ChevronRight size={20} />
                </button>
            </div>

            <div className="toolbar-divider" />

            <div className="toolbar-group">
                <button
                    className="tool-btn"
                    onClick={() => onScaleChange(Math.max(0.5, scale - 0.1))}
                    disabled={scale <= 0.5}
                >
                    <ZoomOut size={20} />
                </button>
                <span className="zoom-info">{Math.round(scale * 100)}%</span>
                <button
                    className="tool-btn"
                    onClick={() => onScaleChange(Math.min(3.0, scale + 0.1))}
                    disabled={scale >= 3.0}
                >
                    <ZoomIn size={20} />
                </button>
            </div>
        </div>
    );
}
