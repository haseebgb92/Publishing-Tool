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
                paddingTop: `${settings.margins.top}px`,
                paddingBottom: `${settings.margins.bottom}px`,
                paddingLeft: `${settings.margins.left}px`,
                paddingRight: `${settings.margins.right}px`
            }}
        >
            {/* Background Image */}
            {settings.pageBackgroundImage && (
                <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                    <img src={settings.pageBackgroundImage} className="w-full h-full object-cover opacity-50" alt="bg" />
                </div>
            )}

            {/* Ornaments (Conditional? Or overlapping bg?) Keep for now. */}
            {!settings.pageBackgroundImage && (
                <>
                    <div className="corner-ornament corner-tl"></div>
                    <div className="corner-ornament corner-tr"></div>
                    <div className="corner-ornament corner-bl"></div>
                    <div className="corner-ornament corner-br"></div>
                    <div className="decorative-border"></div>
                </>
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
                    {page.items.map((item, idx) => (
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

function renderItem(item: BookItem, settings: BookSettings) {
    // Compute effective styles (Individual override > Global default)
    const getStyle = (key: 'arabicSize' | 'urduSize' | 'englishSize' | 'headingSize', baseRem: number) => {
        // If item has specific override
        if (item.styles && item.styles[key]) return `${item.styles[key]}rem`;
        // Else global
        return `${settings.globalStyles[key] || baseRem}rem`;
    };

    const arabicSize = getStyle('arabicSize', 1.2);
    const urduSize = getStyle('urduSize', 1.0);
    const englishSize = getStyle('englishSize', 0.9);
    const headingSize = getStyle('headingSize', 1.2);

    if (item.type === 'section_title') {
        return (
            <div className="section-title-box mt-4">
                <div className="section-title-urdu" style={{ fontSize: headingSize }}>
                    {item.heading_urdu || item.arabic || 'Section'}
                </div>
            </div>
        );
    }

    if (item.type === 'heading' || item.heading_urdu || item.heading_english) {
        const bgStyle = settings.headingBackgroundImage
            ? { backgroundImage: `url(${settings.headingBackgroundImage})`, backgroundSize: 'cover', border: 'none' }
            : {};

        return (
            <div className="heading-item" style={bgStyle}>
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
