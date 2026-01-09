'use client';
import React from 'react';
import { BookPage, BookItem, BookSettings } from '@/lib/types';
import clsx from 'clsx';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Image as ImageIcon } from 'lucide-react';

interface PageRendererProps {
    page: BookPage;
    settings: BookSettings;
    isActive?: boolean;
    selectedItemIdx?: number | null;
    selectedSubField?: string | null;
    onItemClick?: (itemIdx: number, subField?: string) => void;
    onReorder?: (items: BookItem[]) => void;
    onUpdateItem?: (itemIdx: number, field: string, value: any) => void;
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
    selectedSubField,
    onItemClick,
    onReorder,
    onUpdateItem
}) => {
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
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
                                className={clsx(
                                    "cursor-pointer hover:bg-blue-50/50 transition-colors rounded p-1 border border-transparent group relative",
                                    selectedItemIdx === idx && "bg-blue-50/80 border-blue-200"
                                )}
                            >
                                {/* Drag Handle or whole item draggable? Whole item. */}
                                {renderItem(item, settings, idx, selectedItemIdx === idx, selectedItemIdx === idx ? selectedSubField : null, onItemClick, onUpdateItem)}
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
                paddingRight: `${settings.margins.right}px`,
                backgroundColor: page.backgroundColor || (!page.backgroundImage && !settings.pageBackgroundImage ? 'white' : 'transparent'),
                position: 'relative',
                backgroundImage: page.backgroundImage ? `url(${page.backgroundImage})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
            }}
        >
            {/* Background Image (Global) - Only if page doesn't have one */}
            {!page.backgroundImage && settings.pageBackgroundImage && (
                <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                    <img src={settings.pageBackgroundImage} className="w-full h-full object-cover" alt="bg" />
                </div>
            )}

            {/* Content Wrapper */}
            <div className="relative z-10 h-full flex flex-col">
                {/* Items */}
                <div className="flex-1">
                    {/* If reorder active? Always active? */}
                    {onReorder ? renderList() : page.items.map((item, idx) => (
                        <div
                            key={idx}
                            className={clsx(
                                "cursor-pointer hover:bg-blue-50/50 transition-colors rounded p-1 border border-transparent",
                                selectedItemIdx === idx && "bg-blue-50/80 border-blue-200"
                            )}
                        >
                            {renderItem(item, settings, idx, selectedItemIdx === idx, selectedItemIdx === idx ? selectedSubField : null, onItemClick, onUpdateItem)}
                        </div>
                    ))}
                </div>

                {/* Page Number */}
                <div className="page-number-block">
                    — {page.pageNumber} —
                </div>
            </div>
        </div>
    );
};

// Helper for Inline Editing
const EditableField = ({ value, onChange, style, className, dir, isEditing, onDoubleClick, placeholder }: any) => {
    if (isEditing) {
        return (
            <textarea
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                style={{ ...style, width: '100%', minHeight: '1.5em', resize: 'none', overflow: 'hidden', background: 'rgba(255,255,200,0.2)', outline: 'none' }}
                className={className}
                dir={dir}
                autoFocus
                placeholder={placeholder}
                onKeyDown={(e) => e.stopPropagation()} // Prevent editor shortcuts while typing
                onClick={(e) => e.stopPropagation()}
                onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = target.scrollHeight + 'px';
                }}
                ref={(ref) => {
                    if (ref) {
                        ref.style.height = 'auto';
                        ref.style.height = ref.scrollHeight + 'px';
                    }
                }}
            />
        );
    }
    return (
        <div
            className={className}
            style={style}
            dir={dir}
            onDoubleClick={onDoubleClick}
        >
            {value || <span className="opacity-30 italic">{placeholder}</span>}
        </div>
    );
};

function renderItem(item: BookItem, settings: BookSettings, itemIdx: number | undefined, isSelected: boolean, selectedSubField: string | null | undefined, onItemClick?: (idx: number, sub?: string) => void, onUpdateItem?: (idx: number, field: string, value: any) => void) {
    const handleSubClick = (sub?: string) => {
        if (onItemClick && itemIdx !== undefined) {
            onItemClick(itemIdx, sub);
        }
    };

    const getFieldClass = (field: string) => {
        return clsx(
            "relative transition-all duration-200 rounded px-1 -mx-1",
            selectedSubField === field ? "bg-yellow-100 ring-2 ring-yellow-400 z-20" : "hover:bg-blue-50/50"
        );
    };

    // Generic style getter
    const getStyleVal = <K extends keyof BookSettings['globalStyles']>(key: K, defaultVal: any) => {
        if (item.styles && (item.styles as any)[key] !== undefined) return (item.styles as any)[key];
        return settings.globalStyles[key] !== undefined ? settings.globalStyles[key] : defaultVal;
    };

    const arabicSize = `${getStyleVal('arabicSize', 1.2)}rem`;
    const urduSize = `${getStyleVal('urduSize', 1.0)}rem`;
    const englishSize = `${getStyleVal('englishSize', 0.9)}rem`;
    const headingSize = `${getStyleVal('headingSize', 1.2)}rem`;

    const arabicAlign = getStyleVal('arabicAlign', 'right');
    const urduAlign = getStyleVal('urduAlign', 'right');
    const englishAlign = getStyleVal('englishAlign', 'left');
    const headingAlign = getStyleVal('headingAlign', 'center');

    const arabicFont = getStyleVal('arabicFont', 'Scheherazade New');
    const urduFont = getStyleVal('urduFont', 'Noto Nastaliq Urdu');
    const englishFont = getStyleVal('englishFont', 'Inter');

    const arabicLineHeight = getStyleVal('arabicLineHeight', 1.5);
    const urduLineHeight = getStyleVal('urduLineHeight', 1.5);
    const englishLineHeight = getStyleVal('englishLineHeight', 1.4);
    const headingLineHeight = getStyleVal('headingLineHeight', 1.4);

    const styles = {
        arabic: { fontSize: arabicSize, textAlign: arabicAlign, fontFamily: arabicFont, direction: 'rtl' as 'rtl', lineHeight: arabicLineHeight, color: item.styles?.arabicColor || 'black' },
        urdu: { fontSize: urduSize, textAlign: urduAlign, fontFamily: urduFont, direction: 'rtl' as 'rtl', lineHeight: urduLineHeight, color: item.styles?.urduColor || 'black' },
        english: { fontSize: englishSize, textAlign: englishAlign, fontFamily: englishFont, direction: 'ltr' as 'ltr', lineHeight: englishLineHeight, color: item.styles?.englishColor || 'black' },
        heading: { fontSize: headingSize, textAlign: headingAlign, fontFamily: urduFont, direction: 'rtl' as 'rtl', lineHeight: headingLineHeight, color: item.styles?.headingColor || 'black' }
    };

    if (item.styles?.headingLevel) {
        if (item.styles.headingLevel === 2) styles.heading.fontSize = `calc(${headingSize} * 0.8)`;
        if (item.styles.headingLevel === 3) styles.heading.fontSize = `calc(${headingSize} * 0.6)`;
    }

    if (item.type === 'toc_entry') {
        return (
            <div className="flex items-center gap-4 py-2 border-b border-gray-200 border-dotted mb-1 group hover:bg-blue-50/30 transition-colors">
                {/* English - Left */}
                <EditableField
                    value={item.english}
                    onChange={(v: string) => onUpdateItem?.(itemIdx!, 'english', v)}
                    style={styles.english}
                    className={clsx("flex-1 text-left transition-colors rounded px-1", getFieldClass('english'))}
                    isEditing={isSelected && selectedSubField === 'english'}
                    onDoubleClick={(e: any) => { e.stopPropagation(); handleSubClick('english'); }}
                    placeholder="English Topic"
                />

                {/* Page Number - Center */}
                <EditableField
                    value={item.toc_page}
                    onChange={(v: string) => onUpdateItem?.(itemIdx!, 'toc_page', v)}
                    style={{ fontWeight: 'bold', textAlign: 'center' }}
                    className={clsx("w-14 text-center font-bold text-sm text-gray-700 bg-gray-100 rounded py-1 transition-colors", getFieldClass('toc_page'))}
                    isEditing={isSelected && selectedSubField === 'toc_page'}
                    onDoubleClick={(e: any) => { e.stopPropagation(); handleSubClick('toc_page'); }}
                    placeholder="#"
                />

                {/* Urdu - Right */}
                <EditableField
                    value={item.urdu}
                    onChange={(v: string) => onUpdateItem?.(itemIdx!, 'urdu', v)}
                    style={styles.urdu}
                    className={clsx("flex-1 text-right transition-colors rounded px-1", getFieldClass('urdu'))}
                    dir="rtl"
                    isEditing={isSelected && selectedSubField === 'urdu'}
                    onDoubleClick={(e: any) => { e.stopPropagation(); handleSubClick('urdu'); }}
                    placeholder="عنوان"
                />
            </div>
        );
    }

    if (item.type === 'section_title') {
        const offset = (settings.sectionTitleOffset || 0) * 24;
        return (
            <div className="section-title-box" style={{ marginTop: `${offset}px`, textAlign: headingAlign }}>
                <EditableField
                    value={item.heading_urdu || item.arabic}
                    onChange={(v: string) => onUpdateItem?.(itemIdx!, 'heading_urdu', v)}
                    style={{ ...styles.heading, fontSize: `calc(${headingSize} * 1.5)` }}
                    className={clsx("section-title-urdu transition-colors rounded", getFieldClass('heading_urdu'))}
                    dir="rtl"
                    isEditing={isSelected && selectedSubField === 'heading_urdu'}
                    onDoubleClick={(e: any) => { e.stopPropagation(); handleSubClick('heading_urdu'); }}
                    placeholder="Section Title (Urdu)"
                />

                <EditableField
                    value={item.heading_english}
                    onChange={(v: string) => onUpdateItem?.(itemIdx!, 'heading_english', v)}
                    style={{ ...styles.english, fontSize: `calc(${englishSize} * 1.1)`, fontStyle: 'italic', textAlign: 'center' }}
                    className={clsx("section-title-english transition-colors rounded mt-1 text-center", getFieldClass('heading_english'))}
                    isEditing={isSelected && selectedSubField === 'heading_english'}
                    onDoubleClick={(e: any) => { e.stopPropagation(); handleSubClick('heading_english'); }}
                    placeholder="Section Title (English)"
                />
            </div>
        );
    }

    if (item.type === 'heading' || item.heading_urdu || item.heading_english) {
        const hasBgImage = !!settings.headingBackgroundImage;
        const bgStyle = hasBgImage
            ? { backgroundImage: `url(${settings.headingBackgroundImage})`, backgroundSize: '100% 100%', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', border: 'none', backgroundColor: 'transparent' }
            : {};

        return (
            <div className="mb-4">
                <div
                    className={clsx("heading-item mb-2", !hasBgImage && "islamic-heading-banner")}
                    style={{ ...bgStyle, textAlign: headingAlign }}
                >
                    <EditableField
                        value={item.heading_urdu}
                        onChange={(v: string) => onUpdateItem?.(itemIdx!, 'heading_urdu', v)}
                        style={styles.heading}
                        className={clsx("heading-urdu rounded px-1", getFieldClass('heading_urdu'))}
                        dir="rtl"
                        isEditing={isSelected && selectedSubField === 'heading_urdu'}
                        onDoubleClick={(e: any) => { e.stopPropagation(); handleSubClick('heading_urdu'); }}
                        placeholder="Heading (Urdu)"
                    />

                    <EditableField
                        value={item.heading_english}
                        onChange={(v: string) => onUpdateItem?.(itemIdx!, 'heading_english', v)}
                        style={{ ...styles.english, fontSize: `calc(${headingSize} * 0.7)` }}
                        className={clsx("heading-english rounded px-1", getFieldClass('heading_english'))}
                        isEditing={isSelected && selectedSubField === 'heading_english'}
                        onDoubleClick={(e: any) => { e.stopPropagation(); handleSubClick('heading_english'); }}
                        placeholder="Heading (English)"
                    />
                </div>
                {/* Render other fields if present */}
                {/* Render other fields if present */}
                <div className="mt-2 pl-4 border-l-2 border-gray-100/50 space-y-2">
                    <EditableField
                        value={item.arabic}
                        onChange={(v: string) => onUpdateItem?.(itemIdx!, 'arabic', v)}
                        style={styles.arabic}
                        className={getFieldClass('arabic')}
                        dir="rtl"
                        isEditing={isSelected && selectedSubField === 'arabic'}
                        onDoubleClick={(e: any) => { e.stopPropagation(); handleSubClick('arabic'); }}
                        placeholder="Arabic Text"
                    />
                    <EditableField
                        value={item.roman}
                        onChange={(v: string) => onUpdateItem?.(itemIdx!, 'roman', v)}
                        style={styles.english}
                        className={getFieldClass('roman')}
                        isEditing={isSelected && selectedSubField === 'roman'}
                        onDoubleClick={(e: any) => { e.stopPropagation(); handleSubClick('roman'); }}
                        placeholder="Roman English"
                    />
                    <EditableField
                        value={item.urdu}
                        onChange={(v: string) => onUpdateItem?.(itemIdx!, 'urdu', v)}
                        style={styles.urdu}
                        className={getFieldClass('urdu')}
                        dir="rtl"
                        isEditing={isSelected && selectedSubField === 'urdu'}
                        onDoubleClick={(e: any) => { e.stopPropagation(); handleSubClick('urdu'); }}
                        placeholder="Urdu Translation"
                    />
                    <EditableField
                        value={item.content_urdu}
                        onChange={(v: string) => onUpdateItem?.(itemIdx!, 'content_urdu', v)}
                        style={styles.urdu}
                        className={getFieldClass('content_urdu')}
                        dir="rtl"
                        isEditing={isSelected && selectedSubField === 'content_urdu'}
                        onDoubleClick={(e: any) => { e.stopPropagation(); handleSubClick('content_urdu'); }}
                        placeholder="Urdu Content"
                    />
                    <EditableField
                        value={item.english}
                        onChange={(v: string) => onUpdateItem?.(itemIdx!, 'english', v)}
                        style={styles.english}
                        className={getFieldClass('english')}
                        isEditing={isSelected && selectedSubField === 'english'}
                        onDoubleClick={(e: any) => { e.stopPropagation(); handleSubClick('english'); }}
                        placeholder="English Translation"
                    />
                    <EditableField
                        value={item.content_english}
                        onChange={(v: string) => onUpdateItem?.(itemIdx!, 'content_english', v)}
                        style={styles.english}
                        className={getFieldClass('content_english')}
                        isEditing={isSelected && selectedSubField === 'content_english'}
                        onDoubleClick={(e: any) => { e.stopPropagation(); handleSubClick('content_english'); }}
                        placeholder="English Content"
                    />
                    {item.fazilat && (
                        <div className={clsx(getFieldClass('fazilat'), "mt-2 pt-2 border-t border-gray-200 italic text-blue-900 section-fazilat")} onDoubleClick={(e) => { e.stopPropagation(); handleSubClick('fazilat'); }} style={styles.urdu}>
                            <span className="text-[10px] font-bold uppercase not-italic opacity-40 block mb-1">Fazilat</span>
                            {item.fazilat}
                        </div>
                    )}
                    {item.fazilat_english && (
                        <div className={clsx(getFieldClass('fazilat_english'), "mt-1 italic text-blue-800 section-fazilat-english")} onDoubleClick={(e) => { e.stopPropagation(); handleSubClick('fazilat_english'); }} style={styles.english}>
                            <span className="text-[10px] font-bold uppercase not-italic opacity-40 block mb-1">Fazilat (English)</span>
                            {item.fazilat_english}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (item.names && Array.isArray(item.names)) {
        return (
            <div className="grid grid-cols-2 gap-x-6 gap-y-6">
                {item.names.map((name, idx) => {
                    const fieldKey = `name-${idx}`;
                    const isNameSelected = selectedSubField === fieldKey;
                    const arabicKey = `${fieldKey}-arabic`;
                    const romanKey = `${fieldKey}-roman`;
                    const urduKey = `${fieldKey}-urdu`;
                    const englishKey = `${fieldKey}-english`;

                    return (
                        <div
                            key={idx}
                            className={clsx(
                                "asma-item p-4 border rounded-xl shadow-sm transition-all",
                                isNameSelected ? "bg-yellow-50 ring-2 ring-yellow-400 z-20 scale-105" : "bg-gray-50/30 hover:bg-blue-50/50"
                            )}
                            onClick={(e) => { e.stopPropagation(); handleSubClick(fieldKey); }}
                        >
                            <EditableField
                                value={name.arabic}
                                onChange={(v: string) => {
                                    const newNames = [...item.names!];
                                    newNames[idx] = { ...newNames[idx], arabic: v };
                                    onUpdateItem?.(itemIdx!, 'names', newNames);
                                }}
                                style={{ ...styles.arabic, fontSize: arabicSize, textAlign: 'center', lineHeight: 2 }}
                                className={clsx("arabic-text !p-0 font-bold rounded px-1 transition-all mb-2", selectedSubField === arabicKey && "!bg-yellow-100 !ring-2 !ring-yellow-400 z-30")}
                                dir="rtl"
                                isEditing={isSelected && selectedSubField === arabicKey}
                                onDoubleClick={(e: any) => { e.stopPropagation(); handleSubClick(arabicKey); }}
                                placeholder="Arabic Name"
                            />

                            <EditableField
                                value={name.roman}
                                onChange={(v: string) => {
                                    const newNames = [...item.names!];
                                    newNames[idx] = { ...newNames[idx], roman: v };
                                    onUpdateItem?.(itemIdx!, 'names', newNames);
                                }}
                                style={{ ...styles.english, textAlign: 'center', lineHeight: 1.8 }}
                                className={clsx("roman-text !m-0 !text-xs italic rounded px-1 transition-all mb-2", selectedSubField === romanKey && "!bg-yellow-100 !ring-2 !ring-yellow-400 z-30")}
                                isEditing={isSelected && selectedSubField === romanKey}
                                onDoubleClick={(e: any) => { e.stopPropagation(); handleSubClick(romanKey); }}
                                placeholder="Roman"
                            />

                            <EditableField
                                value={name.urdu}
                                onChange={(v: string) => {
                                    const newNames = [...item.names!];
                                    newNames[idx] = { ...newNames[idx], urdu: v };
                                    onUpdateItem?.(itemIdx!, 'names', newNames);
                                }}
                                style={{ ...styles.urdu, fontSize: urduSize, textAlign: 'center', lineHeight: 2 }}
                                className={clsx("urdu-text !m-0 !text-base font-bold rounded px-1 transition-all mb-1", selectedSubField === urduKey && "!bg-yellow-100 !ring-2 !ring-yellow-400 z-30")}
                                isEditing={isSelected && selectedSubField === urduKey}
                                onDoubleClick={(e: any) => { e.stopPropagation(); handleSubClick(urduKey); }}
                                placeholder="Urdu"
                            />

                            <EditableField
                                value={name.english}
                                onChange={(v: string) => {
                                    const newNames = [...item.names!];
                                    newNames[idx] = { ...newNames[idx], english: v };
                                    onUpdateItem?.(itemIdx!, 'names', newNames);
                                }}
                                style={{ ...styles.english, fontSize: `calc(${englishSize} * 0.9)`, textAlign: 'center', lineHeight: 1.6 }}
                                className={clsx("english-text !m-0 !text-xs opacity-70 rounded px-1 transition-all", selectedSubField === englishKey && "!bg-yellow-100 !ring-2 !ring-yellow-400 z-30")}
                                isEditing={isSelected && selectedSubField === englishKey}
                                onDoubleClick={(e: any) => { e.stopPropagation(); handleSubClick(englishKey); }}
                                placeholder="English"
                            />
                        </div>
                    );
                })}
            </div>
        );
    }

    if (item.type === 'image') {
        return (
            <div
                className="image-item mb-6 flex flex-col items-center gap-2"
                onClick={(e) => {
                    e.stopPropagation();
                    if (itemIdx !== undefined && onItemClick) onItemClick(itemIdx);
                }}
            >
                {item.image_src ? (
                    <img
                        src={item.image_src}
                        alt="Book Content"
                        className="max-w-full h-auto rounded border shadow-sm transition-transform hover:scale-[1.01]"
                        style={{
                            maxHeight: '600px',
                            width: item.styles?.imageWidth ? `${item.styles.imageWidth}%` : '100%'
                        }}
                    />
                ) : (
                    <div className="w-full h-40 bg-gray-50 border-2 border-dashed border-gray-200 rounded flex flex-col items-center justify-center text-gray-400">
                        <ImageIcon size={32} className="mb-2 opacity-20" />
                        <span className="text-xs italic">No image uploaded</span>
                    </div>
                )}
                <div className="w-full space-y-1">
                    <EditableField
                        value={item.image_caption_urdu}
                        onChange={(v: string) => onUpdateItem?.(itemIdx!, 'image_caption_urdu', v)}
                        style={styles.urdu}
                        className={clsx("text-center font-bold text-gray-700 transition-colors rounded px-1", getFieldClass('image_caption_urdu'))}
                        dir="rtl"
                        isEditing={isSelected && selectedSubField === 'image_caption_urdu'}
                        onDoubleClick={(e: any) => { e.stopPropagation(); handleSubClick('image_caption_urdu'); }}
                        placeholder="Urdu Caption"
                    />

                    <EditableField
                        value={item.image_caption_english}
                        onChange={(v: string) => onUpdateItem?.(itemIdx!, 'image_caption_english', v)}
                        style={styles.english}
                        className={clsx("text-center text-xs opacity-60 transition-colors rounded px-1", getFieldClass('image_caption_english'))}
                        isEditing={isSelected && selectedSubField === 'image_caption_english'}
                        onDoubleClick={(e: any) => { e.stopPropagation(); handleSubClick('image_caption_english'); }}
                        placeholder="English Caption"
                    />
                </div>
            </div>
        );
    }

    if (item.type === 'table' && item.tableData) {
        return (
            <div
                className={clsx("w-full overflow-x-auto mb-4", isSelected && "ring-2 ring-blue-300")}
                onClick={(e) => { e.stopPropagation(); if (onItemClick && itemIdx !== undefined) onItemClick(itemIdx); }}
            >
                <table className={clsx("w-full border-collapse text-sm", item.styles?.tableBorder && "border", item.styles?.tableStriped && "table-auto")}>
                    <tbody>
                        {item.tableData.map((row, rIdx) => (
                            <tr key={rIdx} className={clsx(item.styles?.tableStriped && rIdx % 2 === 1 && "bg-gray-50")}>
                                {row.map((cell, cIdx) => (
                                    <td
                                        key={cIdx}
                                        className={clsx("p-2 relative group", item.styles?.tableBorder && "border border-gray-300")}
                                        style={{ minWidth: '50px' }}
                                    >
                                        <EditableField
                                            value={cell}
                                            onChange={(v: string) => {
                                                if (!item.tableData) return;
                                                const newData = item.tableData.map(r => [...r]);
                                                newData[rIdx][cIdx] = v;
                                                onUpdateItem?.(itemIdx!, 'tableData', newData);
                                            }}
                                            style={{ width: '100%', background: 'transparent' }}
                                            className="w-full min-h-[1.5em]"
                                            isEditing={isSelected} // Tables are always "editing enabled" when selected for simplicity, or we could track subFields
                                            onDoubleClick={(e: any) => { e.stopPropagation(); if (onItemClick && itemIdx !== undefined) onItemClick(itemIdx); }}
                                            placeholder="..."
                                        />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }

    if (item.type === 'list' && item.listItems) {
        const ListTag = item.listType === 'number' ? 'ol' : 'ul';
        return (
            <div
                className="mb-4 px-4"
                onClick={(e) => { e.stopPropagation(); if (onItemClick && itemIdx !== undefined) onItemClick(itemIdx); }}
            >
                <ListTag className={clsx("pl-5 space-y-1", item.listType === 'number' ? "list-decimal" : "list-disc")}>
                    {item.listItems.map((li, liIdx) => (
                        <li key={liIdx} className="text-gray-800" style={styles.english}>
                            {li}
                        </li>
                    ))}
                </ListTag>
            </div>
        );
    }

    return (
        <div
            className={clsx("content-item mb-4 space-y-2", isSelected && !item.styles?.borderWidth && "ring-1 ring-blue-200 rounded")}
            style={{
                backgroundColor: item.styles?.backgroundColor,
                borderWidth: item.styles?.borderWidth ? `${item.styles.borderWidth}px` : undefined,
                borderColor: item.styles?.borderColor,
                borderStyle: (item.styles?.borderStyle as any) || (item.styles?.borderWidth ? 'solid' : undefined),
                borderRadius: item.styles?.borderRadius ? `${item.styles.borderRadius}px` : undefined,
                padding: item.styles?.padding ? `${item.styles.padding}px` : undefined,
            }}
            onClick={(e) => {
                // Only trigger if clicking the container itself, not a child field
                if (e.target === e.currentTarget) {
                    e.stopPropagation();
                    if (itemIdx !== undefined && onItemClick) {
                        onItemClick(itemIdx);
                    }
                }
            }}
        >
            {(isSelected || item.arabic) && (
                <EditableField
                    value={item.arabic}
                    onChange={(v: string) => onUpdateItem?.(itemIdx!, 'arabic', v)}
                    style={styles.arabic}
                    className={getFieldClass('arabic')}
                    dir="rtl"
                    isEditing={isSelected && selectedSubField === 'arabic'}
                    onDoubleClick={(e: any) => { e.stopPropagation(); handleSubClick('arabic'); }}
                    placeholder="Arabic Text"
                />
            )}

            {(isSelected || item.roman) && (
                <EditableField
                    value={item.roman}
                    onChange={(v: string) => onUpdateItem?.(itemIdx!, 'roman', v)}
                    style={styles.english}
                    className={getFieldClass('roman')}
                    isEditing={isSelected && selectedSubField === 'roman'}
                    onDoubleClick={(e: any) => { e.stopPropagation(); handleSubClick('roman'); }}
                    placeholder="Roman English"
                />
            )}

            {(isSelected || item.urdu) && (
                <EditableField
                    value={item.urdu}
                    onChange={(v: string) => onUpdateItem?.(itemIdx!, 'urdu', v)}
                    style={styles.urdu}
                    className={getFieldClass('urdu')}
                    dir="rtl"
                    isEditing={isSelected && selectedSubField === 'urdu'}
                    onDoubleClick={(e: any) => { e.stopPropagation(); handleSubClick('urdu'); }}
                    placeholder="Urdu"
                />
            )}

            {(isSelected || item.content_urdu) && (
                <EditableField
                    value={item.content_urdu}
                    onChange={(v: string) => onUpdateItem?.(itemIdx!, 'content_urdu', v)}
                    style={styles.urdu}
                    className={getFieldClass('content_urdu')}
                    dir="rtl"
                    isEditing={isSelected && selectedSubField === 'content_urdu'}
                    onDoubleClick={(e: any) => { e.stopPropagation(); handleSubClick('content_urdu'); }}
                    placeholder="Urdu Content"
                />
            )}

            {(isSelected || item.english) && (
                <EditableField
                    value={item.english}
                    onChange={(v: string) => onUpdateItem?.(itemIdx!, 'english', v)}
                    style={styles.english}
                    className={getFieldClass('english')}
                    isEditing={isSelected && selectedSubField === 'english'}
                    onDoubleClick={(e: any) => { e.stopPropagation(); handleSubClick('english'); }}
                    placeholder="English"
                />
            )}

            {(isSelected || item.content_english) && (
                <EditableField
                    value={item.content_english}
                    onChange={(v: string) => onUpdateItem?.(itemIdx!, 'content_english', v)}
                    style={styles.english}
                    className={getFieldClass('content_english')}
                    isEditing={isSelected && selectedSubField === 'content_english'}
                    onDoubleClick={(e: any) => { e.stopPropagation(); handleSubClick('content_english'); }}
                    placeholder="English Content"
                />
            )}

            {/* Generic Fazilat Editing - Only if present or selected */}
            {(isSelected || item.fazilat) && (
                <EditableField
                    value={item.fazilat}
                    onChange={(v: string) => onUpdateItem?.(itemIdx!, 'fazilat', v)}
                    style={styles.urdu}
                    className={clsx(getFieldClass('fazilat'), "mt-2 pt-2 border-t border-gray-100 italic text-blue-900 section-fazilat")}
                    dir="rtl"
                    isEditing={isSelected && selectedSubField === 'fazilat'}
                    onDoubleClick={(e: any) => { e.stopPropagation(); handleSubClick('fazilat'); }}
                    placeholder="Fazilat (Urdu)"
                />
            )}
            {(isSelected || item.fazilat_english) && (
                <EditableField
                    value={item.fazilat_english}
                    onChange={(v: string) => onUpdateItem?.(itemIdx!, 'fazilat_english', v)}
                    style={styles.english}
                    className={clsx(getFieldClass('fazilat_english'), "mt-1 italic text-blue-800 section-fazilat-english")}
                    isEditing={isSelected && selectedSubField === 'fazilat_english'}
                    onDoubleClick={(e: any) => { e.stopPropagation(); handleSubClick('fazilat_english'); }}
                    placeholder="Fazilat (English)"
                />
            )}
        </div>
    );
}
