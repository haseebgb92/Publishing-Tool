'use client';
import React from 'react';
import { BookPage, BookItem, BookSettings } from '@/lib/types';
import clsx from 'clsx';

interface PageRendererProps {
    page: BookPage;
    settings: BookSettings;
    isActive?: boolean;
    selectedItemIdx?: number | null;
    onItemClick?: (itemIdx: number) => void;
}

export const PageRenderer: React.FC<PageRendererProps> = ({
    page,
    settings,
    isActive,
    selectedItemIdx,
    onItemClick
}) => {
    return (
        <div
            className={clsx(
                "book-page-canvas transition-shadow duration-300",
                isActive ? "ring-4 ring-blue-500 shadow-2xl" : "shadow-md"
            )}
            style={{
                width: `${settings.pageSize.width}mm`,
                height: `${settings.pageSize.height}mm`,
                fontSize: `${settings.fontScale}rem`,
                paddingTop: `${settings.margins.top}px`,
                paddingBottom: `${settings.margins.bottom}px`,
                paddingLeft: `${settings.margins.left}px`,
                paddingRight: `${settings.margins.right}px`
            }}
        >
            {/* Ornaments */}
            <div className="corner-ornament corner-tl"></div>
            <div className="corner-ornament corner-tr"></div>
            <div className="corner-ornament corner-bl"></div>
            <div className="corner-ornament corner-br"></div>
            <div className="decorative-border"></div>

            {/* Content Wrapper */}
            <div className="relative z-10 h-full flex flex-col">
                {/* Section Header if present */}
                {(page.sectionTitle) && (
                    <div className="section-title-box">
                        <div className="section-title-urdu">{page.sectionTitle}</div>
                    </div>
                )}

                {/* Items */}
                <div className="flex-1">
                    {page.items.map((item, idx) => (
                        <div
                            key={idx}
                            onClick={(e) => {
                                e.stopPropagation();
                                onItemClick?.(idx);
                            }}
                            className={clsx(
                                "cursor-pointer hover:bg-blue-50 transition-colors rounded p-1 border border-transparent",
                                selectedItemIdx === idx && "bg-blue-50 border-blue-200"
                            )}
                        >
                            {renderItem(item)}
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

function renderItem(item: BookItem) {
    if (item.type === 'section_title') {
        return (
            <div className="section-title-box mt-4">
                <div className="section-title-urdu">{item.heading_urdu || item.arabic || 'Section'}</div>
            </div>
        );
    }

    if (item.type === 'heading' || item.heading_urdu || item.heading_english) {
        return (
            <div className="heading-item">
                {item.heading_urdu && <div className="heading-urdu">{item.heading_urdu}</div>}
                {item.heading_english && <div className="heading-english">{item.heading_english}</div>}
            </div>
        );
    }

    return (
        <div className="content-item mb-4">
            {item.arabic && <div className="arabic-text">{item.arabic}</div>}
            {item.roman && <div className="roman-text">{item.roman}</div>}
            {item.urdu && <div className="urdu-text">{item.urdu}</div>}
            {item.content_urdu && !item.urdu && <div className="urdu-text">{item.content_urdu}</div>}
            {item.english && <div className="english-text">{item.english}</div>}
            {item.content_english && !item.english && <div className="english-text">{item.content_english}</div>}
        </div>
    );
}
