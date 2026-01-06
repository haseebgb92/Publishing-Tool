'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { BookPage, BookItem, BookSettings } from '@/lib/types';
import { PageRenderer } from './PageRenderer';
import { saveAs } from 'file-saver';
import clsx from 'clsx';
import { Download, Upload, Settings, Save, ArrowDown, ArrowUp } from 'lucide-react';

interface EditorProps {
    initialData?: any[];
}

export default function BookEditor({ initialData }: EditorProps) {
    const [pages, setPages] = useState<BookPage[]>([]);
    const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
    const [selectedItem, setSelectedItem] = useState<{ pageId: string, itemIdx: number } | null>(null);

    const [settings, setSettings] = useState<BookSettings>({
        pageSize: { width: 210, height: 297, name: 'A4' },
        margins: { top: 40, bottom: 60, left: 50, right: 50 },
        fontScale: 1.0,
        showOutlines: true
    });

    useEffect(() => {
        if (initialData) {
            const loadedPages = initialData.map((p, idx) => ({
                id: `page-${idx}`,
                pageNumber: p.book_page_number || idx + 1,
                sectionTitle: p.section,
                items: p.items || []
            }));
            setPages(loadedPages);
            if (loadedPages.length > 0) setSelectedPageId(loadedPages[0].id);
        }
    }, [initialData]);

    // Actions
    const handlePushToNext = useCallback(() => {
        if (!selectedItem) return;
        const pIdx = pages.findIndex(p => p.id === selectedItem.pageId);
        if (pIdx === -1) return;

        const current = pages[pIdx];
        const itemsToMove = current.items.slice(selectedItem.itemIdx);
        const itemsKeep = current.items.slice(0, selectedItem.itemIdx);

        const newPages = [...pages];
        newPages[pIdx] = { ...current, items: itemsKeep };

        if (pIdx + 1 < newPages.length) {
            const next = newPages[pIdx + 1];
            newPages[pIdx + 1] = { ...next, items: [...itemsToMove, ...next.items] };
            setSelectedPageId(next.id);
            setSelectedItem({ pageId: next.id, itemIdx: 0 });
        } else {
            const newId = `page-${newPages.length + 1}-${Date.now()}`;
            newPages.push({
                id: newId,
                pageNumber: current.pageNumber + 1,
                items: itemsToMove,
                sectionTitle: current.sectionTitle
            });
            setSelectedPageId(newId);
            setSelectedItem({ pageId: newId, itemIdx: 0 });
        }
        setPages(newPages);
    }, [pages, selectedItem]);

    const handlePullToPrev = useCallback(() => {
        if (!selectedItem) return;
        const pIdx = pages.findIndex(p => p.id === selectedItem.pageId);
        if (pIdx <= 0 || selectedItem.itemIdx > 0) return;

        const current = pages[pIdx];
        const prev = pages[pIdx - 1];
        const item = current.items[0];

        const newCurrentItems = current.items.slice(1);
        const newPrevItems = [...prev.items, item];

        const newPages = [...pages];
        newPages[pIdx] = { ...current, items: newCurrentItems };
        newPages[pIdx - 1] = { ...prev, items: newPrevItems };

        setPages(newPages);
        setSelectedPageId(prev.id);
        setSelectedItem({ pageId: prev.id, itemIdx: newPrevItems.length - 1 });
    }, [pages, selectedItem]);

    const handleItemUpdate = (field: string, value: string) => {
        if (!selectedItem) return;
        const pIdx = pages.findIndex(p => p.id === selectedItem.pageId);
        if (pIdx === -1) return;

        const newPages = [...pages];
        const item = { ...newPages[pIdx].items[selectedItem.itemIdx] };

        // @ts-ignore
        item[field] = value;
        newPages[pIdx].items[selectedItem.itemIdx] = item;
        setPages(newPages);
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!selectedItem) return;
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            if (e.key === 'Enter' && e.ctrlKey) {
                e.preventDefault();
                handlePushToNext();
            }
            if (e.key === 'Backspace' && e.ctrlKey) {
                if (selectedItem.itemIdx === 0 && pages.findIndex(p => p.id === selectedItem.pageId) > 0) {
                    handlePullToPrev();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedItem, handlePushToNext, handlePullToPrev, pages]);

    const getSelectedItem = () => {
        if (!selectedItem) return null;
        const page = pages.find(p => p.id === selectedItem.pageId);
        return page?.items[selectedItem.itemIdx];
    };

    const activeItem = getSelectedItem();

    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden font-sans">
            {/* Sidebar */}
            <div className="w-80 bg-white border-r border-gray-200 flex flex-col no-print z-50 shadow-xl overflow-hidden">
                <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                    <h2 className="font-bold text-gray-700 flex items-center gap-2"><Settings size={18} /> Editor</h2>
                    <div className="text-xs text-gray-400">v1.0</div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {/* Properties Panel (Dynamic) */}
                    {activeItem ? (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-3">
                            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 border-b pb-1">
                                Edit Item ({activeItem.type})
                            </div>
                            {['arabic', 'urdu', 'english', 'heading_urdu', 'heading_english'].map(field => (
                                // @ts-ignore
                                (activeItem[field] !== undefined || field.includes('heading')) && (
                                    <div key={field}>
                                        <label className="block text-xs font-medium text-gray-600 mb-1 capitalize">{field.replace('_', ' ')}</label>
                                        <textarea
                                            className="w-full text-sm p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                            rows={field === 'arabic' ? 3 : 2}
                                            dir={field.includes('english') ? 'ltr' : 'rtl'}
                                            // @ts-ignore
                                            value={activeItem[field] || ''}
                                            onChange={(e) => handleItemUpdate(field, e.target.value)}
                                        />
                                    </div>
                                )
                            ))}
                        </div>
                    ) : (
                        <div className="p-4 bg-gray-50 text-center text-sm text-gray-400 rounded-lg border border-dashed">
                            Select an item to edit content
                        </div>
                    )}

                    {/* Global Settings */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-700 mb-3">Page Settings</h3>
                        <div className="grid grid-cols-2 gap-2 mb-4">
                            <button
                                onClick={() => setSettings({ ...settings, pageSize: { width: 210, height: 297, name: 'A4' } })}
                                className={clsx("p-2 text-xs border rounded", settings.pageSize.name === 'A4' ? 'bg-blue-100 border-blue-500' : 'bg-white hover:bg-gray-50')}
                            >
                                A4 (210x297)
                            </button>
                            <button
                                onClick={() => setSettings({ ...settings, pageSize: { width: 148, height: 210, name: 'A5' } })}
                                className={clsx("p-2 text-xs border rounded", settings.pageSize.name === 'A5' ? 'bg-blue-100 border-blue-500' : 'bg-white hover:bg-gray-50')}
                            >
                                A5 (148x210)
                            </button>
                        </div>

                        <label className="block text-xs font-medium text-gray-600 mb-2">Font Scale</label>
                        <input
                            type="range" min="0.5" max="1.5" step="0.1"
                            value={settings.fontScale}
                            onChange={(e) => setSettings({ ...settings, fontScale: parseFloat(e.target.value) })}
                            className="w-full cursor-pointer accent-blue-600 mb-4"
                        />

                        <h4 className="text-xs font-bold text-gray-500 mb-2 uppercase">Margins (px)</h4>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] text-gray-400 uppercase">Top</label>
                                <input
                                    type="number"
                                    value={settings.margins.top}
                                    onChange={(e) => setSettings({ ...settings, margins: { ...settings.margins, top: parseInt(e.target.value) || 0 } })}
                                    className="w-full text-xs p-1 border rounded"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] text-gray-400 uppercase">Bottom</label>
                                <input
                                    type="number"
                                    value={settings.margins.bottom}
                                    onChange={(e) => setSettings({ ...settings, margins: { ...settings.margins, bottom: parseInt(e.target.value) || 0 } })}
                                    className="w-full text-xs p-1 border rounded"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] text-gray-400 uppercase">Left</label>
                                <input
                                    type="number"
                                    value={settings.margins.left}
                                    onChange={(e) => setSettings({ ...settings, margins: { ...settings.margins, left: parseInt(e.target.value) || 0 } })}
                                    className="w-full text-xs p-1 border rounded"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] text-gray-400 uppercase">Right</label>
                                <input
                                    type="number"
                                    value={settings.margins.right}
                                    onChange={(e) => setSettings({ ...settings, margins: { ...settings.margins, right: parseInt(e.target.value) || 0 } })}
                                    className="w-full text-xs p-1 border rounded"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="space-y-2 pt-4 border-t">
                        <button onClick={() => window.print()} className="action-btn bg-blue-600 hover:bg-blue-700 text-white">
                            <Download size={16} /> Save as PDF
                        </button>
                        <button onClick={() => {
                            const blob = new Blob([JSON.stringify(pages, null, 2)], { type: 'application/json' });
                            saveAs(blob, 'book_data_updated.json');
                        }} className="action-btn bg-green-600 hover:bg-green-700 text-white">
                            <Save size={16} /> Save JSON
                        </button>
                    </div>

                    <div className="text-xs text-gray-400 bg-yellow-50 p-2 rounded border border-yellow-100">
                        <b>Shortcuts:</b><br />
                        Ctrl + Enter: Push to Next Page<br />
                        Ctrl + Backspace: Pull from Prev Page
                    </div>
                </div>
            </div>

            {/* Main Preview */}
            <div className="flex-1 overflow-y-auto bg-gray-200 p-8 flex flex-col items-center gap-8 print-container scroll-smooth">
                {pages.map((page, idx) => (
                    <div
                        key={page.id}
                        className="relative group print-page-wrapper"
                        onClick={() => setSelectedPageId(page.id)}
                    >
                        <div className="absolute top-2 -left-10 text-gray-400 font-mono text-sm no-print opacity-50">
                            {page.pageNumber}
                        </div>

                        <PageRenderer
                            page={page}
                            settings={settings}
                            isActive={selectedPageId === page.id}
                            selectedItemIdx={selectedPageId === page.id && selectedItem?.pageId === page.id ? selectedItem.itemIdx : null}
                            onItemClick={(itemIdx) => setSelectedItem({ pageId: page.id, itemIdx })}
                        />
                    </div>
                ))}
                {pages.length === 0 && (
                    <div className="text-gray-400 mt-20">Loading Book Content...</div>
                )}
            </div>

            <style jsx global>{`
        .action-btn {
            @apply w-full py-2.5 rounded shadow-sm font-medium flex items-center justify-center gap-2 transition-all;
        }
        @media print {
            .no-print { display: none !important; }
            body { background: white; }
            .print-container { 
                display: block; 
                overflow: visible !important; 
                height: auto !important; 
                background: white;
            }
            .print-page-wrapper {
                break-after: page;
                margin-bottom: 0;
            }
        }
      `}</style>
        </div>
    );
}
