import { useState, useRef, useEffect } from 'react';
import './SelectionOverlay.css';

interface SelectionOverlayProps {
    onSelectionComplete: (rect: { x: number, y: number, width: number, height: number } | null) => void;
}

export function SelectionOverlay({ onSelectionComplete }: SelectionOverlayProps) {
    const [startPos, setStartPos] = useState<{ x: number, y: number } | null>(null);
    const [currentPos, setCurrentPos] = useState<{ x: number, y: number } | null>(null);
    const overlayRef = useRef<HTMLDivElement>(null);

    // Expand to full scroll size
    useEffect(() => {
        const updateSize = () => {
            if (overlayRef.current && overlayRef.current.offsetParent) {
                const parent = overlayRef.current.offsetParent as HTMLElement;
                overlayRef.current.style.width = `${parent.scrollWidth}px`;
                overlayRef.current.style.height = `${parent.scrollHeight}px`;
            }
        };

        updateSize();
        window.addEventListener('resize', updateSize);
        // Also listen to specific scrap updates or DOM changes if possible, 
        // but for now a timeout/resize might suffice or just init.
        // A mutation observer on parent would be best but let's stick to valid events.
        // Let's fire it once more after a delay in case PDF loads late
        setTimeout(updateSize, 500);

        return () => window.removeEventListener('resize', updateSize);
    }, []);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!overlayRef.current) return;
        const rect = overlayRef.current.getBoundingClientRect();
        setStartPos({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        });
        setCurrentPos({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!startPos || !overlayRef.current) return;
        const rect = overlayRef.current.getBoundingClientRect();
        setCurrentPos({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        });
    };

    const handleMouseUp = () => {
        if (startPos && currentPos) {
            const x = Math.min(startPos.x, currentPos.x);
            const y = Math.min(startPos.y, currentPos.y);
            const width = Math.abs(currentPos.x - startPos.x);
            const height = Math.abs(currentPos.y - startPos.y);

            if (width > 10 && height > 10) {
                onSelectionComplete({ x, y, width, height });
            } else {
                onSelectionComplete(null);
            }
        }
        setStartPos(null);
        setCurrentPos(null);
    };

    const getSelectionStyle = () => {
        if (!startPos || !currentPos) return {};
        const left = Math.min(startPos.x, currentPos.x);
        const top = Math.min(startPos.y, currentPos.y);
        const width = Math.abs(currentPos.x - startPos.x);
        const height = Math.abs(currentPos.y - startPos.y);
        return {
            left, top, width, height, display: 'block'
        };
    };

    return (
        <div
            className="selection-overlay"
            ref={overlayRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => {
                if (startPos) {
                    setStartPos(null);
                    setCurrentPos(null);
                }
            }}
        >
            {startPos && currentPos && (
                <div className="selection-box" style={getSelectionStyle()} />
            )}
        </div>
    );
}
