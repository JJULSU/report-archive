import { Trash2, Highlighter, Plus } from 'lucide-react';
import './Scrapbook.css';
import { useState } from 'react';

interface ScrapItem {
    id: string;
    type: 'image' | 'text' | 'heading';
    content: string;
    comment?: string;
    tags?: string[];
    archived?: boolean;
    meta?: {
        sourcePdfId?: string;
        pageNumber?: number;
        sourceTitle?: string;
        date?: string;
        citation?: string;
        highlights?: { x: number, y: number, width: number, height: number }[];
    };
    order: number;
    createdAt: number;
}

interface ScrapBlockProps {
    item: ScrapItem;
    isArchived?: boolean;
    existingTags?: string[];
    onDelete: (id: string) => void;
    onUpdate?: (item: any) => void;
    onOpenHighlight?: () => void;
}

export function ScrapBlock({ item, isArchived, existingTags = [], onDelete, onUpdate, onOpenHighlight }: ScrapBlockProps) {
    const [isAddingTag, setIsAddingTag] = useState(false);
    const [tagInput, setTagInput] = useState('');

    const handleAddTag = () => {
        if (!tagInput.trim() || !onUpdate) return;
        // Avoid duplicates
        if (item.tags?.includes(tagInput.trim())) {
            setTagInput('');
            setIsAddingTag(false);
            return;
        }
        const newTags = [...(item.tags || []), tagInput.trim()];
        onUpdate({ ...item, tags: newTags });
        setTagInput('');
        setIsAddingTag(false);
    };

    const handleRemoveTag = (tagToRemove: string) => {
        if (!onUpdate) return;
        const newTags = item.tags?.filter(t => t !== tagToRemove);
        onUpdate({ ...item, tags: newTags });
    };

    return (
        <div className={`scrap-block ${isArchived ? 'archived' : ''}`} style={{ opacity: isArchived ? 0.8 : 1 }}>
            <div className="scrap-actions">
                {item.type === 'image' && onOpenHighlight && (
                    <button
                        className="action-btn"
                        onClick={onOpenHighlight}
                        title="Edit / Highlight"
                    >
                        <Highlighter size={14} />
                    </button>
                )}
            </div>

            <button className="delete-btn" onClick={(e) => {
                e.stopPropagation();
                onDelete(item.id);
            }} title="Delete Scrap">
                <Trash2 size={14} />
            </button>

            {item.type === 'heading' && (
                <div className="scrap-heading" contentEditable suppressContentEditableWarning>
                    {item.content}
                </div>
            )}

            {item.type === 'text' && (
                <div className="scrap-text" contentEditable suppressContentEditableWarning>
                    {item.content}
                </div>
            )}

            {item.type === 'image' && (
                <div
                    className="scrap-image-container"
                    onClick={onOpenHighlight}
                    style={{ position: 'relative', cursor: 'pointer' }}
                >
                    <img src={item.content} alt="Scrap" className="scrap-image" />
                    {item.meta?.highlights && item.meta.highlights.map((h, i) => (
                        <div
                            key={i}
                            style={{
                                position: 'absolute',
                                left: `${h.x * 100}%`,
                                top: `${h.y * 100}%`,
                                width: `${h.width * 100}%`,
                                height: `${h.height * 100}%`,
                                backgroundColor: 'yellow',
                                opacity: 0.4,
                                mixBlendMode: 'multiply',
                                pointerEvents: 'none'
                            }}
                        />
                    ))}
                    {item.meta?.citation && (
                        <div className="scrap-citation">{item.meta.citation}</div>
                    )}
                </div>
            )}

            {/* Comment Section */}
            <div
                className="scrap-comment"
                contentEditable
                data-placeholder="Add a comment..."
                onBlur={(e) => onUpdate && onUpdate({ ...item, comment: e.currentTarget.textContent })}
                suppressContentEditableWarning
            >
                {item.comment}
            </div>

            {/* Tags Section */}
            <div className="scrap-tags">
                <div className="tags-list">
                    {item.tags?.map(tag => (
                        <span key={tag} className="scrap-tag">
                            {tag}
                            <button className="remove-tag" onClick={() => handleRemoveTag(tag)}>&times;</button>
                        </span>
                    ))}
                    {!isAddingTag ? (
                        <button className="add-tag-btn" onClick={() => setIsAddingTag(true)}>
                            <Plus size={12} /> Add Tag
                        </button>
                    ) : (
                        <div className="add-tag-input">
                            <input
                                type="text"
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                                autoFocus
                                placeholder="Tag name..."
                                list={`tags-list-${item.id}`} // Unique ID for datalist
                            />
                            <datalist id={`tags-list-${item.id}`}>
                                {existingTags.map(t => (
                                    <option key={t} value={t} />
                                ))}
                            </datalist>
                            <button onClick={handleAddTag}>Add</button>
                        </div>
                    )}
                </div>
                {item.archived && <span className="archived-badge">Archived</span>}
            </div>
        </div>
    );
}
