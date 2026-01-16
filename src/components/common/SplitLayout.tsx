import { useState, useRef, useEffect } from 'react';
import type { ReactNode } from 'react';
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
    // Center fills remaining space

    const containerRef = useRef<HTMLDivElement>(null);
    const isDraggingLeft = useRef(false);
    const isDraggingRight = useRef(false);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!containerRef.current) return;
            const containerWidth = containerRef.current.clientWidth;

            if (isDraggingLeft.current) {
                const newLeftWidth = (e.clientX / containerWidth) * 100;
                if (newLeftWidth > 5 && newLeftWidth < 40) { // Min/Max constraints
                    setLeftWidth(newLeftWidth);
                }
            }

            if (isDraggingRight.current) {
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
    }, []);

    const startDragLeft = () => {
        isDraggingLeft.current = true;
        document.body.style.cursor = 'col-resize';
    };

    const startDragRight = () => {
        isDraggingRight.current = true;
        document.body.style.cursor = 'col-resize';
    };

    return (
        <div className="split-layout" ref={containerRef}>
            <div className="pane left-pane" style={{ width: `${leftWidth}%` }}>
                {left || <div className="placeholder">Library</div>}
            </div>

            <div className="resizer" onMouseDown={startDragLeft} />

            <div className="pane center-pane" style={{ width: `calc(100% - ${leftWidth}% - ${rightWidth}%)` }}>
                {center || <div className="placeholder">Workspace (PDF Viewer)</div>}
            </div>

            <div className="resizer" onMouseDown={startDragRight} />

            <div className="pane right-pane" style={{ width: `${rightWidth}%` }}>
                {right || <div className="placeholder">Scrapbook</div>}
            </div>
        </div>
    );
}
