'use client';
import React from 'react';
import { BookPage, BookItem, BookSettings } from '@/lib/types';
import clsx from 'clsx';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface PageRendererProps {
    page: BookPage;
    settings: BookSettings;
    isActive?: boolean;
    selectedItemIdx?: number | null;
    onItemClick?: (itemIdx: number) => void;
    onReorder?: (items: BookItem[]) => void;
}

// Sortable Item Wrapper
function SortableItemWrapper(props: any) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: props.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 'auto',
        position: 'relative' as 'relative',
        touchAction: 'none' // Important for pointer sensors
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            {props.children}
        </div>
    );
}

export const PageRenderer: React.FC<PageRendererProps> = ({
    page,
    settings,
    isActive,
    selectedItemIdx,
    onItemClick,
    onReorder
}) => {
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (active.id !== over?.id && onReorder) {
            const oldIndex = page.items.findIndex((i, idx) => (i.id || `item-${idx}`) === active.id);
            const newIndex = page.items.findIndex((i, idx) => (i.id || `item-${idx}`) === over?.id);

            if (oldIndex !== -1 && newIndex !== -1) {
                onReorder(arrayMove(page.items, oldIndex, newIndex));
            }
        }
    };

    // Content for loop
    const renderList = () => {
        // Map items to have temporary stable IDs if missing, though we use index fallback in logic.
        // Ideally items should have IDs. BookEditor assigns IDs? 
        // We will assume index-based key for display if id missing, but for SortableContext we need strings.
        // Let's generate IDs on the fly? No, that causes re-renders.
        // We rely on ID. If BookItem has no ID, we use `item-${idx}`
        const itemsWithIds = page.items.map((item, idx) => ({ ...item, id: item.id || `item-${idx}` }));

        return (
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext
                    items={itemsWithIds}
                    strategy={verticalListSortingStrategy}
                >
                    {itemsWithIds.map((item, idx) => (
                        <SortableItemWrapper key={item.id} id={item.id}>
                            <div
                                onClick={(e) => {
                                    // prevent drag click? 
                                    // onItemClick needs to fire. dnd-kit handles click vs drag via activationConstraint.
                                    e.stopPropagation();
                                    onItemClick?.(idx);
                                }}
                                className={clsx(
                                    "cursor-pointer hover:bg-blue-50/50 transition-colors rounded p-1 border border-transparent group relative",
                                    selectedItemIdx === idx && "bg-blue-50/80 border-blue-200"
                                )}
                            >
                                {/* Drag Handle or whole item draggable? Whole item. */}
                                {renderItem(item, settings)}
                            </div>
                        </SortableItemWrapper>
                    ))}
                </SortableContext>
            </DndContext>
        );
    };

    return (
        <div
            className={clsx(
                "book-page-canvas transition-shadow duration-300",
                isActive ? "ring-4 ring-blue-500 shadow-2xl" : "shadow-md"
            )}
            style={{
                width: `${settings.pageSize.width}mm`,
                height: `${settings.pageSize.height}mm`,
                paddingTop: `${settings.margins.top}px`,
                paddingBottom: `${settings.margins.bottom}px`,
                paddingLeft: `${settings.margins.left}px`,
                paddingRight: `${settings.margins.right}px`
            }}
        >
            {/* Background Image */}
            {settings.pageBackgroundImage && (
                <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                    <img src={settings.pageBackgroundImage} className="w-full h-full object-cover" alt="bg" />
                </div>
            )}

            {/* Content Wrapper */}
            <div className="relative z-10 h-full flex flex-col">
                {/* Section Header */}
                {(page.sectionTitle) && (
                    <div className="section-title-box">
                        <div className="section-title-urdu" style={{ fontSize: `${settings.globalStyles.headingSize * 1.5}rem` }}>
                            {page.sectionTitle}
                        </div>
                    </div>
                )}

                {/* Items */}
                <div className="flex-1">
                    {/* If reorder active? Always active? */}
                    {onReorder ? renderList() : (
                        page.items.map((item, idx) => (
                            <div
                                key={idx}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onItemClick?.(idx);
                                }}
                                className={clsx(
                                    "cursor-pointer hover:bg-blue-50/50 transition-colors rounded p-1 border border-transparent",
                                    selectedItemIdx === idx && "bg-blue-50/80 border-blue-200"
                                )}
                            >
                                {renderItem(item, settings)}
                            </div>
                        ))
                    )}
                </div>

                {/* Page Number */}
                <div className="page-number-block">
                    — {page.pageNumber} —
                </div>
            </div>
        </div>
    );
};

function renderItem(item: BookItem, settings: BookSettings) {
    const getStyle = (key: 'arabicSize' | 'urduSize' | 'englishSize' | 'headingSize', baseRem: number) => {
        if (item.styles && item.styles[key]) return `${item.styles[key]}rem`;
        return `${settings.globalStyles[key] || baseRem}rem`;
    };

    const arabicSize = getStyle('arabicSize', 1.2);
    const urduSize = getStyle('urduSize', 1.0);
    const englishSize = getStyle('englishSize', 0.9);
    const headingSize = getStyle('headingSize', 1.2);

    if (item.type === 'toc_entry') {
        return (
            <div className="flex items-baseline justify-between py-1 border-b border-gray-300 border-dotted mb-1">
                <div className="flex-1 text-right">
                    <span className="font-bold text-lg font-urdu">{item.urdu}</span>
                    {item.english && <span className="text-xs text-gray-500 ml-2 font-sans">({item.english})</span>}
                </div>
                <div className="w-12 text-left text-sm font-mono text-gray-700 pl-2">
                    {item.toc_page}
                </div>
            </div>
        );
    }

    if (item.type === 'section_title') {
        return (
            <div className="section-title-box mt-4 text-center">
                <div className="section-title-urdu" style={{ fontSize: headingSize }}>
                    {item.heading_urdu || item.arabic || 'Section'}
                </div>
            </div>
        );
    }

    if (item.type === 'heading' || item.heading_urdu || item.heading_english) {
        const bgStyle = settings.headingBackgroundImage
            ? { backgroundImage: `url(${settings.headingBackgroundImage})`, backgroundSize: '100% 100%', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }
            : {};

        return (
            <div className={clsx("heading-item", !settings.headingBackgroundImage && "border-none bg-transparent")} style={bgStyle}>
                {item.heading_urdu && <div className="heading-urdu" style={{ fontSize: headingSize }}>{item.heading_urdu}</div>}
                {item.heading_english && <div className="heading-english" style={{ fontSize: `calc(${headingSize} * 0.7)` }}>{item.heading_english}</div>}
            </div>
        );
    }

    return (
        <div className="content-item mb-4">
            {item.arabic && <div className="arabic-text" style={{ fontSize: arabicSize }}>{item.arabic}</div>}
            {item.roman && <div className="roman-text" style={{ fontSize: englishSize }}>{item.roman}</div>}
            {item.urdu && <div className="urdu-text" style={{ fontSize: urduSize }}>{item.urdu}</div>}
            {item.content_urdu && !item.urdu && <div className="urdu-text" style={{ fontSize: urduSize }}>{item.content_urdu}</div>}
            {item.english && <div className="english-text" style={{ fontSize: englishSize }}>{item.english}</div>}
            {item.content_english && !item.english && <div className="english-text" style={{ fontSize: englishSize }}>{item.content_english}</div>}
        </div>
    );
}
