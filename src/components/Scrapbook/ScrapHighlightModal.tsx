import { useState, useRef } from 'react';
import { X, Save, Highlighter } from 'lucide-react';
import './ScrapHighlightModal.css';

interface Highlight {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface ScrapHighlightModalProps {
    imageUrl: string;
    initialHighlights?: Highlight[];
    onSave: (highlights: Highlight[]) => void;
    onClose: () => void;
}

export function ScrapHighlightModal({ imageUrl, initialHighlights = [], onSave, onClose }: ScrapHighlightModalProps) {
    const [highlights, setHighlights] = useState<Highlight[]>(initialHighlights);
    const [isHighlighting, setIsHighlighting] = useState(true);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const [activeRect, setActiveRect] = useState<Highlight | null>(null);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!isHighlighting || !containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;

        setStartPos({ x, y });
        setIsDragging(true);
        setActiveRect({ x, y, width: 0, height: 0 });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !containerRef.current || !activeRect) return;

        const rect = containerRef.current.getBoundingClientRect();
        const currentX = (e.clientX - rect.left) / rect.width;
        const currentY = (e.clientY - rect.top) / rect.height;

        const width = Math.abs(currentX - startPos.x);
        const height = Math.abs(currentY - startPos.y);
        const x = Math.min(currentX, startPos.x);
        const y = Math.min(currentY, startPos.y);

        setActiveRect({ x, y, width, height });
    };

    const handleMouseUp = () => {
        if (isDragging && activeRect && activeRect.width > 0.01 && activeRect.height > 0.01) {
            setHighlights([...highlights, activeRect]);
        }
        setIsDragging(false);
        setActiveRect(null);
    };

    const removeHighlight = (index: number, e: React.MouseEvent) => {
        e.stopPropagation();
        setHighlights(highlights.filter((_, i) => i !== index));
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <h3>Edit Highlights</h3>
                    <div className="modal-actions">
                        <button
                            className={`tool-btn ${isHighlighting ? 'active' : ''}`}
                            onClick={() => setIsHighlighting(!isHighlighting)}
                        >
                            <Highlighter size={18} />
                            <span>{isHighlighting ? 'Highlighting On' : 'Highlighting Off'}</span>
                        </button>
                        <button className="save-btn" onClick={() => onSave(highlights)}>
                            <Save size={18} />
                            <span>Save & Close</span>
                        </button>
                        <button className="close-btn" onClick={onClose}>
                            <X size={18} />
                        </button>
                    </div>
                </div>

                <div className="modal-body" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', background: '#333' }}>

                    {/* Image Wrapper - Coordinates relative to THIS */}
                    <div
                        ref={containerRef}
                        style={{ position: 'relative', display: 'inline-block', cursor: isHighlighting ? 'crosshair' : 'default' }}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                    >
                        <img
                            src={imageUrl}
                            alt="Scrap Content"
                            draggable={false}
                            style={{ display: 'block', maxWidth: '100%', maxHeight: '600px' }} // Ensure image fits but keeps ratio
                        />

                        {/* Render saved highlights */}
                        {highlights.map((h, i) => (
                            <div
                                key={i}
                                className="highlight-rect"
                                style={{
                                    left: `${h.x * 100}%`,
                                    top: `${h.y * 100}%`,
                                    width: `${h.width * 100}%`,
                                    height: `${h.height * 100}%`,
                                }}
                                onClick={(e) => removeHighlight(i, e)}
                                title="Click to remove"
                            />
                        ))}

                        {/* Render active dragging rect */}
                        {activeRect && (
                            <div
                                className="highlight-rect active"
                                style={{
                                    left: `${activeRect.x * 100}%`,
                                    top: `${activeRect.y * 100}%`,
                                    width: `${activeRect.width * 100}%`,
                                    height: `${activeRect.height * 100}%`,
                                }}
                            />
                        )}
                    </div>
                </div>
                <div className="modal-footer">
                    <p>Click and drag to highlight. Click specific highlight to remove.</p>
                </div>
            </div>
        </div>
    );
}
