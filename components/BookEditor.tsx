'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { BookPage, BookItem, BookSettings } from '@/lib/types';
import { PageRenderer } from './PageRenderer';
import { saveAs } from 'file-saver';
import { useDropzone } from 'react-dropzone';
import clsx from 'clsx';
import {
    Download, Upload, Settings, Save, FileJson,
    Image as ImageIcon, Type, LayoutTemplate,
    RefreshCcw, ArrowDown, ArrowUp, Trash
} from 'lucide-react';

interface EditorProps {
    initialData?: any[];
}

export default function BookEditor({ initialData }: EditorProps) {
    // --- State ---
    const [pages, setPages] = useState<BookPage[]>([]);
    const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
    const [selectedItem, setSelectedItem] = useState<{ pageId: string, itemIdx: number } | null>(null);
    const [activeTab, setActiveTab] = useState<'layout' | 'typography' | 'content'>('content');

    const [settings, setSettings] = useState<BookSettings>({
        pageSize: { width: 210, height: 297, name: 'A4' },
        margins: { top: 40, bottom: 60, left: 50, right: 50 },
        globalStyles: {
            arabicSize: 1.2,
            urduSize: 1.0,
            englishSize: 0.9,
            headingSize: 1.2
        },
        pageBackgroundImage: '/bg-page.jpg',
        headingBackgroundImage: '/bg-heading.png',
        showOutlines: true
    });

    // --- Initialization ---
    useEffect(() => {
        if (initialData && pages.length === 0) {
            loadBookData(initialData);
        }
    }, [initialData]);

    const loadBookData = (data: any[]) => {
        const loadedPages = data.map((p, idx) => {
            const pageId = `page-${idx}`;
            let items = p.items || [];

            if (p.type === 'table_of_contents' && p.entries) {
                items = p.entries.map((e: any) => ({
                    type: 'toc_entry',
                    urdu: e.topic || e.section,
                    english: e.topic_english,
                    toc_page: e.page
                }));
            }

            // Assign IDs
            items = items.map((it: any, i: number) => ({ ...it, id: `${pageId}-item-${i}` }));

            return {
                id: pageId,
                pageNumber: p.book_page_number || idx + 1,
                sectionTitle: p.section,
                items: items
            };
        });
        setPages(loadedPages);
        if (loadedPages.length > 0) setSelectedPageId(loadedPages[0].id);
    };

    const handleReorder = (pageId: string, newItems: BookItem[]) => {
        setPages(pages => {
            const pIdx = pages.findIndex(p => p.id === pageId);
            if (pIdx === -1) return pages;
            const newPages = [...pages];
            newPages[pIdx] = { ...newPages[pIdx], items: newItems };
            return newPages;
        });
    };

    // --- File Handling ---
    const onDrop = useCallback((acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const json = JSON.parse(reader.result as string);
                loadBookData(json);
            } catch (e) {
                alert('Invalid JSON file');
            }
        };
        reader.readAsText(file);
    }, []);
    const { getRootProps, getInputProps } = useDropzone({ onDrop, accept: { 'application/json': ['.json'] } });

    const handleImageUpload = (field: 'pageBackgroundImage' | 'headingBackgroundImage', file: File) => {
        const reader = new FileReader();
        reader.onload = () => {
            setSettings(prev => ({ ...prev, [field]: reader.result as string }));
        };
        reader.readAsDataURL(file);
    };

    // --- Actions ---
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

    const deleteItem = () => {
        if (!selectedItem) return;
        const pIdx = pages.findIndex(p => p.id === selectedItem.pageId);
        if (pIdx === -1) return;

        const newPages = [...pages];
        const newItems = [...newPages[pIdx].items];
        newItems.splice(selectedItem.itemIdx, 1);

        // If page becomes empty? Keep it or remove?
        // User might want empty page.
        newPages[pIdx] = { ...newPages[pIdx], items: newItems };
        setPages(newPages);
        setSelectedItem(null); // Deselect
    };

    const updateItem = (field: string, value: any, isStyle = false) => {
        if (!selectedItem) return;
        const pIdx = pages.findIndex(p => p.id === selectedItem.pageId);
        if (pIdx === -1) return;

        const newPages = [...pages];
        const item = { ...newPages[pIdx].items[selectedItem.itemIdx] };

        if (isStyle) {
            item.styles = { ...(item.styles || {}), [field]: value };
        } else {
            // @ts-ignore
            item[field] = value;
        }

        newPages[pIdx].items[selectedItem.itemIdx] = item;
        setPages(newPages);
    };

    // --- Keyboard Shortcuts ---
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

    const activeItem = selectedItem ? pages.find(p => p.id === selectedItem.pageId)?.items[selectedItem.itemIdx] : null;

    // --- Helper Components ---
    const StyleSlider = ({ label, value, onChange, isGlobal = false }: { label: string, value: number, onChange: (v: number) => void, isGlobal?: boolean }) => (
        <div className="mb-3">
            <div className="flex justify-between mb-1">
                <label className="text-xs font-medium text-gray-600 uppercase">{label}</label>
                <span className="text-xs text-blue-500">{value.toFixed(1)}rem</span>
            </div>
            <input
                type="range" min="0.5" max="3.0" step="0.1"
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className={clsx("w-full cursor-pointer", isGlobal ? "accent-blue-600" : "accent-purple-600")}
            />
        </div>
    );

    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden font-sans">
            {/* --- Sidebar (Inspector) --- */}
            <div className="w-80 bg-white border-r border-gray-200 flex flex-col no-print z-50 shadow-xl">
                {/* Header */}
                <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                    <h2 className="font-bold text-gray-800 flex items-center gap-2"><LayoutTemplate size={18} /> Publisher</h2>
                    <div {...getRootProps()} className="cursor-pointer text-xs bg-white border px-2 py-1 rounded hover:bg-gray-100 flex gap-1">
                        <input {...getInputProps()} />
                        <FileJson size={12} /> Open JSON
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab('content')}
                        className={clsx("flex-1 py-3 text-xs font-semibold uppercase border-b-2 transition-colors flex justify-center gap-1", activeTab === 'content' ? "border-blue-500 text-blue-600 bg-blue-50" : "border-transparent text-gray-500 hover:bg-gray-50")}
                    >
                        <Type size={14} /> Content
                    </button>
                    <button
                        onClick={() => setActiveTab('typography')}
                        className={clsx("flex-1 py-3 text-xs font-semibold uppercase border-b-2 transition-colors flex justify-center gap-1", activeTab === 'typography' ? "border-blue-500 text-blue-600 bg-blue-50" : "border-transparent text-gray-500 hover:bg-gray-50")}
                    >
                        <Settings size={14} /> Styles
                    </button>
                    <button
                        onClick={() => setActiveTab('layout')}
                        className={clsx("flex-1 py-3 text-xs font-semibold uppercase border-b-2 transition-colors flex justify-center gap-1", activeTab === 'layout' ? "border-blue-500 text-blue-600 bg-blue-50" : "border-transparent text-gray-500 hover:bg-gray-50")}
                    >
                        <ImageIcon size={14} /> Assets
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-6">

                    {/* --- TAB: CONTENT --- */}
                    {activeTab === 'content' && (
                        <>
                            {activeItem ? (
                                <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
                                    <div className="bg-purple-50 border border-purple-100 p-3 rounded-lg">
                                        <h3 className="text-xs font-bold text-purple-700 uppercase mb-3 flex justify-between">
                                            Individual Styling
                                            <button onClick={() => updateItem('styles', undefined, false)} title="Reset styles" className="text-purple-400 hover:text-purple-600"><RefreshCcw size={12} /></button>
                                        </h3>
                                        <StyleSlider
                                            label="Arabic Size"
                                            value={activeItem.styles?.arabicSize || settings.globalStyles.arabicSize}
                                            onChange={(v) => updateItem('arabicSize', v, true)}
                                        />
                                        <StyleSlider
                                            label="Urdu Size"
                                            value={activeItem.styles?.urduSize || settings.globalStyles.urduSize}
                                            onChange={(v) => updateItem('urduSize', v, true)}
                                        />
                                        <StyleSlider
                                            label="English Size"
                                            value={activeItem.styles?.englishSize || settings.globalStyles.englishSize}
                                            onChange={(v) => updateItem('englishSize', v, true)}
                                        />
                                    </div>

                                    <div className="space-y-3">
                                        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b pb-1">Edit Text</div>
                                        {['arabic', 'urdu', 'english', 'heading_urdu', 'heading_english'].map(field => (
                                            // @ts-ignore
                                            (activeItem[field] !== undefined || field.includes('heading')) && (
                                                <div key={field}>
                                                    <label className="block text-[10px] font-medium text-gray-500 mb-1 capitalize">{field.replace('_', ' ')}</label>
                                                    <textarea
                                                        className="w-full text-sm p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                                                        rows={field === 'arabic' ? 3 : 2}
                                                        dir={field.includes('english') ? 'ltr' : 'rtl'}
                                                        // @ts-ignore
                                                        value={activeItem[field] || ''}
                                                        onChange={(e) => updateItem(field, e.target.value)}
                                                    />
                                                </div>
                                            )
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="p-8 text-center text-gray-400 border-2 border-dashed rounded-xl">
                                    <Type className="mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">Select an item on the page to edit its content and individual style.</p>
                                </div>
                            )}
                        </>
                    )}

                    {/* --- TAB: TYPOGRAPHY (GLOBAL) --- */}
                    {activeTab === 'typography' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                            <div>
                                <h3 className="tex-sm font-bold text-gray-800 mb-4">Global Typography</h3>
                                <p className="text-xs text-gray-500 mb-4">Adjusting these sliders will update all items in the book, unless individually overridden.</p>

                                <div className="bg-white p-4 rounded-lg border shadow-sm space-y-2">
                                    <StyleSlider
                                        label="Base Arabic Size" isGlobal
                                        value={settings.globalStyles.arabicSize}
                                        onChange={(v) => setSettings({ ...settings, globalStyles: { ...settings.globalStyles, arabicSize: v } })}
                                    />
                                    <StyleSlider
                                        label="Base Urdu Size" isGlobal
                                        value={settings.globalStyles.urduSize}
                                        onChange={(v) => setSettings({ ...settings, globalStyles: { ...settings.globalStyles, urduSize: v } })}
                                    />
                                    <StyleSlider
                                        label="Base English Size" isGlobal
                                        value={settings.globalStyles.englishSize}
                                        onChange={(v) => setSettings({ ...settings, globalStyles: { ...settings.globalStyles, englishSize: v } })}
                                    />
                                    <StyleSlider
                                        label="Base Heading Size" isGlobal
                                        value={settings.globalStyles.headingSize}
                                        onChange={(v) => setSettings({ ...settings, globalStyles: { ...settings.globalStyles, headingSize: v } })}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- TAB: LAYOUT & ASSETS --- */}
                    {activeTab === 'layout' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                            <div>
                                <h3 className="text-sm font-bold text-gray-800 mb-2">Paper & Layout</h3>
                                <div className="grid grid-cols-2 gap-2 mb-4">
                                    {['A4', 'A5'].map(size => (
                                        <button
                                            key={size}
                                            onClick={() => setSettings({ ...settings, pageSize: size === 'A4' ? { width: 210, height: 297, name: 'A4' } : { width: 148, height: 210, name: 'A5' } })}
                                            className={clsx("py-2 text-xs border rounded transition-colors", settings.pageSize.name === size ? 'bg-blue-600 text-white border-blue-600' : 'bg-white hover:bg-gray-50')}
                                        >
                                            {size}
                                        </button>
                                    ))}
                                </div>

                                <h4 className="text-xs font-bold text-gray-500 mb-2 uppercase">Margins (px)</h4>
                                <div className="grid grid-cols-2 gap-3 mb-6">
                                    {['top', 'bottom', 'left', 'right'].map(m => (
                                        <div key={m}>
                                            <label className="block text-[10px] text-gray-400 uppercase">{m}</label>
                                            <input
                                                type="number"
                                                // @ts-ignore
                                                value={settings.margins[m]}
                                                // @ts-ignore
                                                onChange={(e) => setSettings({ ...settings, margins: { ...settings.margins, [m]: parseInt(e.target.value) || 0 } })}
                                                className="w-full text-xs p-1 border rounded"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="border-t pt-4">
                                <h3 className="text-sm font-bold text-gray-800 mb-3">Backgrounds</h3>

                                <div className="mb-4">
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Page Background</label>
                                    <label className="flex items-center justify-center w-full h-20 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                                        <div className="text-center">
                                            <Upload className="mx-auto h-4 w-4 text-gray-400" />
                                            <span className="text-[10px] text-gray-500">Upload Image</span>
                                        </div>
                                        <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files && handleImageUpload('pageBackgroundImage', e.target.files[0])} />
                                    </label>
                                    {settings.pageBackgroundImage && <button onClick={() => setSettings({ ...settings, pageBackgroundImage: undefined })} className="text-[10px] text-red-500 mt-1 hover:underline">Remove Background</button>}
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Heading Background</label>
                                    <label className="flex items-center justify-center w-full h-20 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                                        <div className="text-center">
                                            <Upload className="mx-auto h-4 w-4 text-gray-400" />
                                            <span className="text-[10px] text-gray-500">Upload Image</span>
                                        </div>
                                        <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files && handleImageUpload('headingBackgroundImage', e.target.files[0])} />
                                    </label>
                                    {settings.headingBackgroundImage && <button onClick={() => setSettings({ ...settings, headingBackgroundImage: undefined })} className="text-[10px] text-red-500 mt-1 hover:underline">Remove Background</button>}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-gray-200 bg-gray-50 space-y-2">
                    <button onClick={() => window.print()} className="w-full py-2 bg-gray-900 hover:bg-black text-white rounded shadow text-sm font-medium flex items-center justify-center gap-2 transition-transform active:scale-95">
                        <Download size={16} /> Save as PDF
                    </button>
                    <button onClick={() => {
                        const blob = new Blob([JSON.stringify(pages, null, 2)], { type: 'application/json' });
                        saveAs(blob, 'book_data_v2.json');
                    }} className="w-full py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded shadow-sm text-sm font-medium flex items-center justify-center gap-2 transition-transform active:scale-95">
                        <Save size={16} /> Save Project JSON
                    </button>
                </div>
            </div>

            {/* --- Main Workspace --- */}
            <div className="flex-1 overflow-y-auto bg-gray-200/50 p-8 flex flex-col items-center gap-8 print-container scroll-smooth">
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
                            onItemClick={(itemIdx) => {
                                setSelectedItem({ pageId: page.id, itemIdx });
                                setActiveTab('content'); // Auto switch to edit content
                            }}
                            onReorder={(items) => handleReorder(page.id, items)}
                        />
                    </div>
                ))}
                {pages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
                        <FileJson size={48} className="mb-4 opacity-20" />
                        <p className="text-lg font-medium">No Book Loaded</p>
                        <p className="text-sm mb-6">Upload a JSON file or use the default data</p>
                        <button onClick={() => loadBookData(initialData || [])} className="text-blue-500 hover:underline text-sm">Load Default Data</button>
                    </div>
                )}
            </div>

            <style jsx global>{`
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
