import { useState, useRef, useEffect } from 'react';
import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './SplitLayout.css';

interface SplitLayoutProps {
    left?: ReactNode;
    center?: ReactNode;
    right?: ReactNode;
}

export function SplitLayout({ left, center, right }: SplitLayoutProps) {
    // Percentages for the panels. Start with 15%, 60%, 25%
    const [leftWidth, setLeftWidth] = useState(15);
    const [rightWidth, setRightWidth] = useState(25);
    // Collapse states
    const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
    const [isRightCollapsed, setIsRightCollapsed] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const isDraggingLeft = useRef(false);
    const isDraggingRight = useRef(false);

    // Calculate effective widths for layout purposes
    const effectiveLeftWidth = isLeftCollapsed ? 0 : leftWidth;
    const effectiveRightWidth = isRightCollapsed ? 0 : rightWidth;

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!containerRef.current) return;
            const containerWidth = containerRef.current.clientWidth;

            if (isDraggingLeft.current) {
                // If dragging, we assume user wants to expand if currently collapsed,
                // but usually drag starts from an uncollapsed state or the handle.
                // If dragging starts from collapsed state (handle at edge), we should uncollapse.
                if (isLeftCollapsed) setIsLeftCollapsed(false);

                const newLeftWidth = (e.clientX / containerWidth) * 100;
                // Min/Max constraints
                if (newLeftWidth > 5 && newLeftWidth < 40) {
                    setLeftWidth(newLeftWidth);
                }
            }

            if (isDraggingRight.current) {
                if (isRightCollapsed) setIsRightCollapsed(false);

                // Right width is calculated from the right edge
                const newRightWidth = ((containerWidth - e.clientX) / containerWidth) * 100;
                if (newRightWidth > 15 && newRightWidth < 50) {
                    setRightWidth(newRightWidth);
                }
            }
        };

        const handleMouseUp = () => {
            isDraggingLeft.current = false;
            isDraggingRight.current = false;
            document.body.style.cursor = 'default';
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isLeftCollapsed, isRightCollapsed]);

    const startDragLeft = () => {
        isDraggingLeft.current = true;
        document.body.style.cursor = 'col-resize';
    };

    const startDragRight = () => {
        isDraggingRight.current = true;
        document.body.style.cursor = 'col-resize';
    };

    const toggleLeft = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent drag start
        setIsLeftCollapsed(!isLeftCollapsed);
    };

    const toggleRight = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent drag start
        setIsRightCollapsed(!isRightCollapsed);
    };

    return (
        <div className={`split-layout ${isLeftCollapsed ? 'left-collapsed' : ''} ${isRightCollapsed ? 'right-collapsed' : ''}`} ref={containerRef}>
            <div className="pane left-pane" style={{ width: `${effectiveLeftWidth}%`, display: isLeftCollapsed ? 'none' : 'block' }}>
                {left || <div className="placeholder">Library</div>}
            </div>

            <div className="resizer" onMouseDown={startDragLeft}>
                <div className="resizer-handle" onClick={toggleLeft} title={isLeftCollapsed ? "Expand Library" : "Collapse Library"}>
                    {isLeftCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                </div>
            </div>

            <div className="pane center-pane" style={{ width: `calc(100% - ${effectiveLeftWidth}% - ${effectiveRightWidth}%)` }}>
                {center || <div className="placeholder">Workspace (PDF Viewer)</div>}
            </div>

            <div className="resizer" onMouseDown={startDragRight}>
                <div className="resizer-handle" onClick={toggleRight} title={isRightCollapsed ? "Expand Scrapbook" : "Collapse Scrapbook"}>
                    {isRightCollapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                </div>
            </div>

            <div className="pane right-pane" style={{ width: `${effectiveRightWidth}%`, display: isRightCollapsed ? 'none' : 'block' }}>
                {right || <div className="placeholder">Scrapbook</div>}
            </div>
        </div>
    );
}
