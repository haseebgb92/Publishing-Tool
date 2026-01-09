'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { BookPage, BookItem, BookSettings } from '@/lib/types';
import { PageRenderer } from './PageRenderer';
import { Toolbar } from './Toolbar';
import { saveAs } from 'file-saver';
import { useDropzone } from 'react-dropzone';
import clsx from 'clsx';
import {
    Download, Upload, Settings, Save, FileJson,
    Image as ImageIcon, Type, LayoutTemplate,
    RefreshCcw, ArrowDown, ArrowUp, Trash, RotateCcw, RotateCw,
    AlignLeft, AlignCenter, AlignRight, AlignJustify,
    PlusCircle, Plus, Crown, ArrowUpDown, List,
    ChevronRight, Box
} from 'lucide-react';

interface EditorProps {
    initialData?: any[];
}

export default function BookEditor({ initialData }: EditorProps) {
    // --- State ---
    const [pages, setPages] = useState<BookPage[]>([]);
    const [history, setHistory] = useState<BookPage[][]>([]);
    const [historyFuture, setHistoryFuture] = useState<BookPage[][]>([]);
    const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
    const [selectedItem, setSelectedItem] = useState<{ pageId: string, itemIdx: number, subField?: string } | null>(null);
    const [activeTab, setActiveTab] = useState<'layout' | 'typography' | 'content' | 'assets'>('content');
    const [isExporting, setIsExporting] = useState(false);
    const [bulkTOCText, setBulkTOCText] = useState('');
    const [zoomLevel, setZoomLevel] = useState(1);
    const [expandedSections, setExpandedSections] = useState<string[]>(['content', 'typography', 'box']);

    const [settings, setSettings] = useState<BookSettings>({
        pageSize: { width: 210, height: 297, name: 'A4' },
        margins: { top: 40, bottom: 60, left: 50, right: 50 },
        globalStyles: {
            arabicSize: 1.2,
            urduSize: 1.0,
            englishSize: 0.9,
            headingSize: 1.2,
            arabicAlign: 'right',
            urduAlign: 'right',
            englishAlign: 'left',
            headingAlign: 'center',
            arabicFont: 'Scheherazade New',
            urduFont: 'Noto Nastaliq Urdu',
            englishFont: 'Inter',
            arabicLineHeight: 1.6,
            urduLineHeight: 1.6,
            englishLineHeight: 1.4,
            headingLineHeight: 1.4
        },
        sectionTitleOffset: 0,
        headingBackgroundImage: '',
        showOutlines: true,
        pageNumberStyle: 'number'
    });

    // --- Initialization ---
    useEffect(() => {
        if (initialData && pages.length === 0) {
            loadBookData(initialData);
        }
    }, [initialData]);

    const loadBookData = (data: any) => {
        let itemsToLoad = data;
        let loadedSettings: BookSettings | null = null;

        // Detect if loading a full project file { pages, settings }
        if (data && !Array.isArray(data) && data.pages) {
            itemsToLoad = data.pages;
            if (data.settings) loadedSettings = data.settings;
        }

        const loadedPages = (Array.isArray(itemsToLoad) ? itemsToLoad : []).map((p: any, idx: number) => {
            const pageId = p.id || `page-${idx}`;
            let items = p.items || [];

            if (p.type === 'table_of_contents' && p.entries) {
                items = p.entries.map((e: any) => ({
                    type: 'toc_entry',
                    urdu: e.topic || e.section,
                    english: e.topic_english,
                    toc_page: e.page,
                    id: e.id || `toc-${Math.random().toString(36).substr(2, 9)}`
                }));
            }

            // Chunk Asma-ul-Husna and assign IDs
            const processedItems: BookItem[] = [];

            // Convert page section to a movable section_title item
            if (p.section) {
                processedItems.push({
                    type: 'section_title',
                    heading_urdu: p.section,
                    id: `${pageId}-section-title`
                });
            }

            items.forEach((item: any, i: number) => {
                if (item.type === 'names_of_allah' && item.names && item.names.length > 6) {
                    for (let n = 0; n < item.names.length; n += 6) {
                        processedItems.push({
                            ...item,
                            id: `${pageId}-item-${i}-chunk-${n}`,
                            names: item.names.slice(n, n + 6)
                        });
                    }
                } else {
                    processedItems.push({ ...item, id: item.id || `${pageId}-item-${i}` });
                }
            });

            return {
                id: pageId,
                pageNumber: p.pageNumber || p.book_page_number || idx + 1,
                // We keep sectionTitle for reference but the item will do the rendering
                sectionTitle: p.sectionTitle || p.section,
                items: processedItems
            };
        });
        setPages(loadedPages);
        if (loadedSettings) {
            setSettings(prev => ({
                ...prev,
                ...loadedSettings,
                globalStyles: {
                    ...prev.globalStyles,
                    ...(loadedSettings.globalStyles || {})
                }
            }));
        }
        if (loadedPages.length > 0) setSelectedPageId(loadedPages[0].id);
    };

    const handleExportPDF = async () => {
        setIsExporting(true);
        try {
            // @ts-ignore
            const { jsPDF } = await import('jspdf');
            // @ts-ignore
            const { default: html2canvas } = await import('html2canvas');

            const pageElements = document.querySelectorAll('.print-page-wrapper');
            if (pageElements.length === 0) {
                alert('No pages found to export.');
                setIsExporting(false);
                return;
            }

            // Create PDF (A4 Portrait)
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = 210;
            const pdfHeight = 297;

            console.log(`Starting export for ${pageElements.length} pages...`);

            for (let i = 0; i < pageElements.length; i++) {
                const pageEl = pageElements[i] as HTMLElement;

                // Create a temporary container for isolated rendering
                const tempContainer = document.createElement('div');
                Object.assign(tempContainer.style, {
                    position: 'fixed',
                    left: '0',
                    top: '0',
                    width: '210mm',
                    height: '297mm',
                    zIndex: '-9999',
                    backgroundColor: 'white',
                    overflow: 'hidden'
                });
                document.body.appendChild(tempContainer);

                // Clone the page element
                const clone = pageEl.cloneNode(true) as HTMLElement;
                Object.assign(clone.style, {
                    margin: '0',
                    padding: '0',
                    display: 'block',
                    width: '210mm',
                    height: '297mm',
                    boxShadow: 'none',
                    transform: 'none'
                });

                // Hide non-content UI elements in the clone
                clone.querySelectorAll('.no-print').forEach(el => (el as HTMLElement).style.display = 'none');

                tempContainer.appendChild(clone);

                // Targeting the canvas div inside PageRenderer for more precision if possible
                const canvasTarget = clone.querySelector('.book-page-canvas') as HTMLElement || clone;

                // Wait for any lazy content (fonts/images) to render
                await new Promise(r => setTimeout(r, 400));

                const canvas = await html2canvas(canvasTarget, {
                    scale: 2,
                    useCORS: true,
                    backgroundColor: '#ffffff',
                    logging: false,
                    width: 794, // Approx 210mm at 96dpi
                    height: 1123, // Approx 297mm at 96dpi
                    scrollY: 0,
                    scrollX: 0,
                    windowWidth: 794,
                    windowHeight: 1123
                });

                const imgData = canvas.toDataURL('image/jpeg', 0.95);

                if (i > 0) pdf.addPage();
                pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');

                document.body.removeChild(tempContainer);
            }

            pdf.save(`book_export_${Date.now()}.pdf`);
        } catch (error) {
            console.error('PDF Export Error:', error);
            alert('Failed to export PDF. Please check the console for details.');
        } finally {
            setIsExporting(false);
        }
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

    // --- History Helper ---
    const updatePagesWithHistory = (newPages: BookPage[]) => {
        setHistory(prev => [...prev.slice(-20), pages]); // Keep last 20 states
        setHistoryFuture([]); // Clear redo history
        setPages(newPages);
    };

    const handleUndo = useCallback(() => {
        if (history.length === 0) return;
        const previous = history[history.length - 1];
        setHistoryFuture(prev => [pages, ...prev]);
        setHistory(prev => prev.slice(0, -1));
        setPages(previous);
    }, [history, pages]);

    const handleRedo = useCallback(() => {
        if (historyFuture.length === 0) return;
        const next = historyFuture[0];
        setHistory(prev => [...prev, pages]);
        setHistoryFuture(prev => prev.slice(1));
        setPages(next);
    }, [historyFuture, pages]);

    // --- Actions ---
    /* New Cross-Page Move Logic with Granular Splitting */
    const moveActiveItemToPage = (direction: -1 | 1) => {
        if (!selectedItem) return;
        const pIdx = pages.findIndex(p => p.id === selectedItem.pageId);
        if (pIdx === -1) return;
        if (direction === -1 && pIdx === 0) return; // Cannot move before first page

        // Handle creating page if needed
        let currentPages = [...pages];
        let targetPageIdx = pIdx + direction;

        if (direction === 1 && pIdx === pages.length - 1) {
            const cur = pages[pIdx];
            const newId = `page-${pages.length}-${Date.now()}`;
            currentPages.push({ id: newId, pageNumber: cur.pageNumber + 1, items: [], sectionTitle: cur.sectionTitle });
            targetPageIdx = currentPages.length - 1; // Update targetPageIdx for the newly created page
        }

        const sourcePage = { ...currentPages[pIdx] };
        const targetPage = { ...currentPages[targetPageIdx] };
        const originalItem = sourcePage.items[selectedItem.itemIdx];

        let itemToMove = { ...originalItem };
        let itemToKeep: BookItem | null = null;

        if (selectedItem.subField) {
            // Handle Asma-ul-Husna individual field split (e.g., name-0-arabic, name-1-urdu)
            if (selectedItem.subField.includes('name-') && selectedItem.subField.split('-').length === 3 && originalItem.names) {
                const parts = selectedItem.subField.split('-');
                const nameIdx = parseInt(parts[1]);
                const fieldType = parts[2]; // 'arabic', 'roman', 'urdu', or 'english'

                // For Asma names with sub-fields, we split at the name level, not the field level
                // This maintains the structure while allowing the name to move
                const keepNames = direction === 1 ? originalItem.names.slice(0, nameIdx) : originalItem.names.slice(nameIdx + 1);
                const moveNames = direction === 1 ? originalItem.names.slice(nameIdx) : originalItem.names.slice(0, nameIdx + 1);

                if (keepNames.length > 0 && moveNames.length > 0) {
                    itemToKeep = { ...originalItem, names: keepNames };
                    itemToMove = { ...originalItem, id: `split-asma-${Date.now()}`, names: moveNames };
                }
            }
            // Handle Asma-ul-Husna whole name split (e.g., name-0, name-1)
            else if (selectedItem.subField.startsWith('name-') && !selectedItem.subField.includes('-', 5) && originalItem.names) {
                const nameIdx = parseInt(selectedItem.subField.split('-')[1]);
                const keepNames = direction === 1 ? originalItem.names.slice(0, nameIdx) : originalItem.names.slice(nameIdx + 1);
                const moveNames = direction === 1 ? originalItem.names.slice(nameIdx) : originalItem.names.slice(0, nameIdx + 1);

                if (keepNames.length > 0 && moveNames.length > 0) {
                    itemToKeep = { ...originalItem, names: keepNames };
                    itemToMove = { ...originalItem, id: `split-asma-${Date.now()}`, names: moveNames };
                }
            } else {
                // For individual field selection, move ONLY that field
                const keep: any = { type: originalItem.type, id: originalItem.id, styles: originalItem.styles ? { ...originalItem.styles } : undefined };
                const move: any = {
                    type: originalItem.type === 'heading' ? 'text' : originalItem.type,
                    id: `split-${Date.now()}`,
                    styles: originalItem.styles ? { ...originalItem.styles } : undefined
                };

                let hasMove = false;
                let hasKeep = false;

                Object.keys(originalItem).forEach(key => {
                    if (['type', 'id', 'styles', 'names'].includes(key)) return;

                    // Check if this is the selected field or related to it
                    const isSelectedField =
                        key === selectedItem.subField ||
                        (selectedItem.subField === 'heading' && (key === 'heading_urdu' || key === 'heading_english')) ||
                        (selectedItem.subField === 'heading_urdu' && key === 'heading_urdu') ||
                        (selectedItem.subField === 'heading_english' && key === 'heading_english');

                    if (isSelectedField) {
                        move[key] = (originalItem as any)[key];
                        hasMove = true;
                    } else {
                        keep[key] = (originalItem as any)[key];
                        hasKeep = true;
                    }
                });

                if (hasMove && hasKeep) {
                    itemToMove = move;
                    itemToKeep = keep;
                } else if (hasMove) {
                    // All fields are being moved, don't keep anything
                    itemToMove = { ...originalItem };
                    itemToKeep = null;
                }
            }
        }

        // Apply changes to Source Page
        const newSourceItems = [...sourcePage.items];
        if (itemToKeep) {
            newSourceItems[selectedItem.itemIdx] = itemToKeep;
        } else {
            newSourceItems.splice(selectedItem.itemIdx, 1);
        }
        sourcePage.items = newSourceItems;

        // Apply changes to Target Page
        const newTargetItems = [...targetPage.items];
        if (direction === -1) {
            newTargetItems.push(itemToMove);
        } else {
            newTargetItems.unshift(itemToMove);
        }
        targetPage.items = newTargetItems;

        currentPages[pIdx] = sourcePage;
        currentPages[targetPageIdx] = targetPage;

        updatePagesWithHistory(currentPages);
        // Follow the moved part
        setSelectedItem({
            pageId: targetPage.id,
            itemIdx: direction === -1 ? newTargetItems.length - 1 : 0
        });
    };

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
        updatePagesWithHistory(newPages);
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
        newPages[pIdx - 1] = { ...prev, items: newPrevItems };

        updatePagesWithHistory(newPages);
        setSelectedPageId(prev.id);
        setSelectedItem({ pageId: prev.id, itemIdx: newPrevItems.length - 1 });
    }, [pages, selectedItem]);

    const deleteItem = () => {
        if (!selectedItem) return;
        const pIdx = pages.findIndex(p => p.id === selectedItem.pageId);
        if (pIdx === -1) return;

        const newPages = [...pages];
        if (selectedItem.subField) {
            const item = { ...newPages[pIdx].items[selectedItem.itemIdx] };
            if (selectedItem.subField === 'heading') {
                delete item.heading_urdu;
                delete item.heading_english;
            } else {
                // @ts-ignore
                delete item[selectedItem.subField];
            }
            newPages[pIdx].items[selectedItem.itemIdx] = item;
        } else {
            const newItems = [...newPages[pIdx].items];
            newItems.splice(selectedItem.itemIdx, 1);
            newPages[pIdx] = { ...newPages[pIdx], items: newItems };
        }
        updatePagesWithHistory(newPages);
        setSelectedItem(null); // Deselect
    };

    const updateItem = (field: string, value: any, isStyle = false, targetPageId?: string, targetItemIdx?: number) => {
        const pId = targetPageId || selectedItem?.pageId;
        const iIdx = targetItemIdx !== undefined ? targetItemIdx : selectedItem?.itemIdx;

        if (!pId || iIdx === undefined) return;

        const pIdx = pages.findIndex(p => p.id === pId);
        if (pIdx === -1) return;

        const newPages = [...pages];
        const item = { ...newPages[pIdx].items[iIdx] };

        if (isStyle) {
            item.styles = { ...(item.styles || {}), [field]: value };
        } else {
            // @ts-ignore
            item[field] = value;
        }

        newPages[pIdx].items[iIdx] = item;
        setPages(newPages); // Keep setPages for immediate updates without adding to history
    };

    const deletePage = () => {
        if (!selectedPageId) return;
        const pageToDelete = pages.find(p => p.id === selectedPageId);
        if (!pageToDelete) return;

        if (!confirm(`Are you sure you want to delete page ${pageToDelete.pageNumber}? This action cannot be undone.`)) return;

        const pIdx = pages.findIndex(p => p.id === selectedPageId);
        if (pIdx === -1) return;

        const newPages = pages.filter(p => p.id !== selectedPageId);

        // Renumber
        const renumbered = newPages.map((p, i) => ({
            ...p,
            pageNumber: i + 1
        }));

        setPages(renumbered);
        // Select nearest page
        if (renumbered.length > 0) {
            const nextIdx = Math.min(pIdx, renumbered.length - 1);
            setSelectedPageId(renumbered[nextIdx].id);
        } else {
            setSelectedPageId(null);
        }
    };
    const deletePageByNumber = (num: number) => {
        const pageToDelete = pages.find(p => p.pageNumber === num);
        if (!pageToDelete) {
            alert(`Page ${num} not found.`);
            return;
        }

        if (!confirm(`Are you sure you want to delete page ${num}? This action cannot be undone.`)) return;

        const newPages = pages.filter(p => p.pageNumber !== num);

        // Renumber
        const renumbered = newPages.map((p, i) => ({
            ...p,
            pageNumber: i + 1
        }));

        setPages(renumbered);
        // If the deleted page was selected, clear selection or select another
        if (selectedPageId === pageToDelete.id) {
            if (renumbered.length > 0) {
                const pIdx = pages.findIndex(p => p.id === pageToDelete.id);
                const nextIdx = Math.min(pIdx, renumbered.length - 1);
                setSelectedPageId(renumbered[nextIdx].id);
            } else {
                setSelectedPageId(null);
            }
        }
    };

    const movePage = (targetNumber: number) => {
        if (!selectedPageId) return;
        const sourceIdx = pages.findIndex(p => p.id === selectedPageId);
        if (sourceIdx === -1) return;

        const targetIdx = Math.max(0, Math.min(targetNumber - 1, pages.length - 1));
        if (sourceIdx === targetIdx) return;

        const newPages = [...pages];
        const [movedPage] = newPages.splice(sourceIdx, 1);
        newPages.splice(targetIdx, 0, movedPage);

        // Renumber
        const renumbered = newPages.map((p, i) => ({
            ...p,
            pageNumber: i + 1
        }));

        updatePagesWithHistory(renumbered);
        // sourceId remains the same, so selection is preserved
    };

    const addNewPage = (index: number) => {
        const newPageId = `page-${Date.now()}`;
        const newPage: BookPage = {
            id: newPageId,
            pageNumber: index + 1,
            items: [
                {
                    id: `item-${Date.now()}`,
                    type: 'heading',
                    heading_urdu: 'نئی سرخی',
                    heading_english: 'New Heading'
                }
            ]
        };

        const newPages = [...pages];
        newPages.splice(index, 0, newPage);

        // Renumber
        const renumbered = newPages.map((p, i) => ({
            ...p,
            pageNumber: i + 1
        }));

        updatePagesWithHistory(renumbered);
        setSelectedPageId(newPageId);
        setSelectedItem(null);

        // Scroll into view if needed? Usually browser handles selection focus
    };

    const addItem = (type: string) => {
        if (!selectedPageId) {
            alert("Please select a page first.");
            return;
        }

        const newItem: BookItem = {
            id: `item-${Date.now()}`,
            type: type
        };

        // Pre-populate based on type
        if (type === 'heading') {
            newItem.heading_urdu = 'نئی سرخی';
            newItem.heading_english = 'New Heading';
        } else if (type === 'section_title') {
            newItem.heading_urdu = 'نئی فصل / عنوان';
            newItem.heading_english = 'New Section Title';
        } else if (type === 'dua' || type === 'quran') {
            newItem.arabic = 'عربی متن';
            newItem.urdu = 'اردو ترجمہ';
            newItem.english = 'English Translation';
        } else if (type === 'text') {
            newItem.content_urdu = 'اردو تحریر';
            newItem.content_english = 'English Text';
        } else if (type === 'instruction') {
            newItem.content_urdu = 'ہدایت';
        } else if (type === 'image') {
            newItem.image_src = '';
            // No default caption for type 'image'
        } else if (type === 'image_caption') {
            newItem.type = 'image';
            newItem.image_src = '';
            newItem.image_caption_urdu = 'کیپشن';
            newItem.image_caption_english = 'Caption';
        } else if (type === 'text_box') {
            newItem.type = 'text';
            newItem.english = 'New Text Box';
            newItem.styles = {
                ...newItem.styles,
                backgroundColor: '#ffffff',
                borderColor: '#000000',
                borderWidth: 1,
                padding: 10,
                borderRadius: 4
            };
        } else if (type === 'text_arabic') {
            newItem.type = 'text';
            newItem.arabic = 'نص جديد';
            newItem.styles = { ...newItem.styles, arabicAlign: 'center', arabicSize: 1.5 };
        } else if (type === 'text_urdu') {
            newItem.type = 'text';
            newItem.urdu = 'نیا متن';
            newItem.styles = { ...newItem.styles, urduAlign: 'right', urduSize: 1.2 };
        } else if (type === 'text_english') {
            newItem.type = 'text';
            newItem.english = 'New Text';
            newItem.styles = { ...newItem.styles, englishAlign: 'left', englishSize: 1.0 };
        } else if (type === 'table') {
            newItem.tableData = [
                ['Header 1', 'Header 2', 'Header 3'],
                ['Cell 1.1', 'Cell 1.2', 'Cell 1.3'],
                ['Cell 2.1', 'Cell 2.2', 'Cell 2.3']
            ];
            newItem.styles = { ...newItem.styles, tableBorder: true, tableStriped: true };
        } else if (type === 'list') {
            newItem.listItems = ['Item 1', 'Item 2', 'Item 3'];
            newItem.listType = 'bullet';
        } else if (type === 'text_box') {
            newItem.type = 'text'; // It's just a text item with styles
            newItem.content_english = 'Text Box Content';
            newItem.styles = {
                ...newItem.styles,
                backgroundColor: '#ffffff',
                borderColor: '#000000',
                borderWidth: 1,
                padding: 10,
                borderRadius: 4
            };
        }

        const newPages = pages.map(p => {
            if (p.id === selectedPageId) {
                return { ...p, items: [...p.items, newItem] };
            }
            return p;
        });

        updatePagesWithHistory(newPages);
        setSelectedItem({ pageId: selectedPageId, itemIdx: newPages.find(p => p.id === selectedPageId)!.items.length - 1 });
    };

    const handleBulkTOCCopyPaste = (text: string) => {
        if (!selectedPageId) {
            alert("Please select a page first.");
            return;
        }

        const lines = text.split('\n').filter(line => line.trim() !== '');
        const newItems: BookItem[] = lines.map((line, i) => {
            // Split by tab or multiple spaces
            let parts = line.split(/\t/);
            if (parts.length < 2) parts = line.split(/ {2,}/);

            let english = '';
            let urdu = '';
            let pageNum = '';

            if (parts.length >= 3) {
                english = parts[0]?.trim();
                pageNum = parts[1]?.trim();
                urdu = parts[2]?.trim();
            } else if (parts.length === 2) {
                // Determine if first part is probably English or Urdu
                const p0 = parts[0]?.trim() || '';
                const p1 = parts[1]?.trim() || '';

                // If p1 is a number, p0 is the topic
                if (/^\d+$/.test(p1)) {
                    pageNum = p1;
                    // Guess language: if contains Arabic/Urdu chars, it's Urdu
                    if (/[\u0600-\u06FF]/.test(p0)) {
                        urdu = p0;
                    } else {
                        english = p0;
                    }
                } else {
                    // Not a standard format, just put everything in first part
                    urdu = line.trim();
                }
            } else {
                urdu = line.trim();
            }

            return {
                id: `toc-${Date.now()}-${i}`,
                type: 'toc_entry',
                urdu: urdu,
                english: english,
                toc_page: pageNum
            };
        });

        const newPages = pages.map(p => {
            if (p.id === selectedPageId) {
                return { ...p, items: [...p.items, ...newItems] };
            }
            return p;
        });

        updatePagesWithHistory(newPages);
        alert(`Added ${newItems.length} TOC entries.`);
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
    const StyleSlider = ({ label, value, onChange, min = 0.5, max = 3.0, step = 0.1, unit = 'rem', isGlobal = false }: { label: string, value: number, onChange: (v: number) => void, min?: number, max?: number, step?: number, unit?: string, isGlobal?: boolean }) => (
        <div className="mb-3">
            <div className="flex justify-between mb-1">
                <label className="text-xs font-medium text-gray-600 uppercase">{label}</label>
                <span className="text-xs text-blue-500">{(value || 0).toFixed(2)}{unit}</span>
            </div>
            <input
                type="range" min={min} max={max} step={step}
                value={value || min}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className={clsx("w-full cursor-pointer", isGlobal ? "accent-blue-600" : "accent-purple-600")}
            />
        </div>
    );

    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden font-sans">
            {/* --- Top Toolbar --- */}
            <div className="absolute top-0 left-0 right-0 z-50">
                <Toolbar
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    settings={settings}
                    onUpdateSettings={setSettings}
                    activeItem={activeItem || null}
                    onUpdateItem={(field, val, isStyle) => updateItem(field, val, isStyle)}
                    zoomLevel={zoomLevel}
                    setZoomLevel={setZoomLevel}
                    onAction={(action, payload) => {
                        if (action === 'save') {
                            const blob = new Blob([JSON.stringify({ pages, settings }, null, 2)], { type: 'application/json' });
                            saveAs(blob, 'book_progress.json');
                        }
                        if (action === 'export') {
                            setIsExporting(true);
                            setTimeout(handleExportPDF, 100); // Async to allow UI to update
                        }
                        if (action === 'undo') handleUndo();
                        if (action === 'open') {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = 'application/json';
                            input.onchange = (e) => {
                                const file = (e.target as HTMLInputElement).files?.[0];
                                if (file) {
                                    const reader = new FileReader();
                                    reader.onload = (e) => loadBookData(JSON.parse(e.target?.result as string));
                                    reader.readAsText(file);
                                }
                            };
                            input.click();
                        }
                        if (action === 'add_page') addNewPage(pages.length);
                        if (action === 'add_item') addItem(payload);
                        if (action === 'set_page_background') {
                            if (!selectedPageId) return alert("Select a page first");

                            // Handle File Upload for Image
                            if (payload.type === 'image_upload') {
                                const file = payload.value;
                                const reader = new FileReader();
                                reader.onload = (e) => {
                                    const result = e.target?.result as string;
                                    const newPages = pages.map(p => {
                                        if (p.id === selectedPageId) {
                                            return { ...p, backgroundImage: result, backgroundColor: undefined };
                                        }
                                        return p;
                                    });
                                    updatePagesWithHistory(newPages);
                                };
                                reader.readAsDataURL(file);
                                return;
                            }

                            const newPages = pages.map(p => {
                                if (p.id === selectedPageId) {
                                    if (payload.type === 'color') return { ...p, backgroundColor: payload.value, backgroundImage: undefined };
                                    if (payload.type === 'clear') return { ...p, backgroundImage: undefined, backgroundColor: undefined };
                                }
                                return p;
                            });
                            updatePagesWithHistory(newPages);
                        }
                    }}
                />
            </div>

            {/* --- Sidebar (Inspector / Properties) --- */}
            <div className="w-80 bg-white border-r border-gray-200 flex flex-col no-print z-40 shadow-xl mt-[105px]">
                {/* Header - Now simplified */}
                {/* 1. Sticky Actions Header */}
                <div className="p-2 border-b border-gray-200 bg-gray-50 flex items-center justify-between sticky top-0 z-20 shadow-sm">
                    <div className="flex gap-1">
                        <button onClick={handleUndo} className="p-1.5 text-gray-600 hover:bg-gray-200 rounded transition-colors" title="Undo (Ctrl+Z)"><RotateCcw size={14} /></button>
                        <button onClick={handleRedo} className="p-1.5 text-gray-600 hover:bg-gray-200 rounded transition-colors" title="Redo (Ctrl+Y)"><RotateCw size={14} /></button>
                    </div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Properties</div>
                    {activeItem && (
                        <div className="flex gap-1 bg-white border rounded p-0.5 shadow-sm">
                            <button onClick={() => moveActiveItemToPage(-1)} className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Move to Prev Page"><ArrowUp size={14} /></button>
                            <button onClick={() => moveActiveItemToPage(1)} className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Move to Next Page"><ArrowDown size={14} /></button>
                            <div className="w-px bg-gray-200 mx-0.5" />
                            <button onClick={deleteItem} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete Item"><Trash size={14} /></button>
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-6">

                    {/* --- TAB: CONTENT --- */}
                    {/* SECTION: CONTENT */}
                    <div className="border-b border-gray-100">
                        <button
                            onClick={() => setExpandedSections(prev => prev.includes('content') ? prev.filter(p => p !== 'content') : [...prev, 'content'])}
                            className="w-full p-3 flex justify-between items-center bg-white hover:bg-gray-50 transition-colors"
                        >
                            <span className="flex items-center gap-2 text-xs font-bold uppercase text-gray-700"><Type size={14} className="text-blue-500" /> Content</span>
                            <ChevronRight size={14} className={clsx("transition-transform text-gray-400", expandedSections.includes('content') ? "rotate-90" : "")} />
                        </button>

                        {expandedSections.includes('content') && (
                            <div className="p-4 bg-gray-50/50 space-y-4 animate-in slide-in-from-top-2 duration-200">
                                {!activeItem ? (
                                    <div className="text-center text-gray-400 py-6 border-2 border-dashed rounded-lg">
                                        <p className="text-xs italic">Select an item to edit content.</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* TEXT FIELDS */}
                                        <div className="space-y-3">
                                            {['arabic', 'urdu', 'english', 'heading_urdu', 'heading_english', 'content_urdu', 'content_english', 'toc_page'].map(field => (
                                                (activeItem[field] !== undefined || (field.includes('heading') && activeItem.type === 'heading')) && (
                                                    <div key={field}>
                                                        <label className="block text-[10px] font-bold text-gray-500 mb-1 capitalize">{field.replace('_', ' ')}</label>
                                                        <textarea
                                                            className="w-full text-sm p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none transition-shadow bg-white"
                                                            rows={field === 'arabic' ? 3 : 2}
                                                            dir={field.includes('english') || field === 'roman' ? 'ltr' : 'rtl'}
                                                            value={activeItem[field] || ''}
                                                            onChange={(e) => updateItem(field, e.target.value)}
                                                        />
                                                    </div>
                                                )
                                            ))}
                                        </div>

                                        {/* TABLE TOOLS */}
                                        {activeItem.type === 'table' && (
                                            <div className="bg-white p-2 rounded border space-y-2 shadow-sm">
                                                <div className="grid grid-cols-2 gap-2">
                                                    <button onClick={() => {
                                                        const data = activeItem.tableData || [['']];
                                                        updateItem('tableData', [...data, new Array(data[0].length).fill('')]);
                                                    }} className="text-xs bg-gray-50 border p-1 rounded hover:bg-gray-100 flex gap-1 justify-center items-center"><Plus size={10} /> Row</button>
                                                    <button onClick={() => {
                                                        const data = activeItem.tableData || [['']];
                                                        updateItem('tableData', data.map(row => [...row, '']));
                                                    }} className="text-xs bg-gray-50 border p-1 rounded hover:bg-gray-100 flex gap-1 justify-center items-center"><Plus size={10} /> Col</button>
                                                </div>
                                            </div>
                                        )}

                                        {/* LIST TOOLS */}
                                        {activeItem.type === 'list' && (
                                            <div className="bg-white p-2 rounded border space-y-2 shadow-sm">
                                                <label className="text-[10px] font-bold text-gray-500 uppercase">List Items</label>
                                                <textarea
                                                    className="w-full text-xs border rounded p-1 h-24 font-mono bg-white"
                                                    value={activeItem.listItems?.join('\n') || ''}
                                                    onChange={(e) => updateItem('listItems', e.target.value.split('\n'))}
                                                    placeholder="Item per line"
                                                />
                                                <div className="flex gap-2 bg-gray-50 p-1 rounded">
                                                    <button onClick={() => updateItem('listType', 'bullet')} className={clsx("flex-1 p-1 rounded text-xs", (activeItem.listType || 'bullet') === 'bullet' ? "bg-white shadow text-blue-600" : "text-gray-400")}>Bullet</button>
                                                    <button onClick={() => updateItem('listType', 'number')} className={clsx("flex-1 p-1 rounded text-xs", activeItem.listType === 'number' ? "bg-white shadow text-blue-600" : "text-gray-400")}>123</button>
                                                </div>
                                            </div>
                                        )}

                                        {/* IMAGE UPLOAD */}
                                        {activeItem.type === 'image' && (
                                            <div className="bg-white p-2 rounded border space-y-2 shadow-sm">
                                                <label className="block text-[10px] font-bold text-gray-500 uppercase">Image</label>
                                                <label className="flex items-center justify-center w-full py-4 border-2 border-dashed rounded cursor-pointer hover:bg-gray-50 transition-colors">
                                                    <div className="text-center">
                                                        <ImageIcon size={16} className="mx-auto text-gray-400 mb-1" />
                                                        <span className="text-[9px] text-blue-500 font-bold uppercase">Change Image</span>
                                                    </div>
                                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                                                        if (e.target.files?.[0]) {
                                                            const reader = new FileReader();
                                                            reader.onload = () => updateItem('image_src', reader.result);
                                                            reader.readAsDataURL(e.target.files[0]);
                                                        }
                                                    }} />
                                                </label>
                                                <div className="pt-2 border-t border-gray-100">
                                                    <StyleSlider
                                                        label="Image Scale (%)" min={10} max={100} unit="%"
                                                        value={activeItem.styles?.imageWidth || 100}
                                                        onChange={(v) => updateItem('imageWidth', v, true)}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </div>


                    {/* SECTION: TYPOGRAPHY (STYLES) */}
                    <div className="border-b border-gray-100">
                        <button
                            onClick={() => setExpandedSections(prev => prev.includes('typography') ? prev.filter(p => p !== 'typography') : [...prev, 'typography'])}
                            className="w-full p-3 flex justify-between items-center bg-white hover:bg-gray-50 transition-colors"
                        >
                            <span className="flex items-center gap-2 text-xs font-bold uppercase text-gray-700"><Settings size={14} className="text-purple-500" /> Typography</span>
                            <ChevronRight size={14} className={clsx("transition-transform text-gray-400", expandedSections.includes('typography') ? "rotate-90" : "")} />
                        </button>

                        {expandedSections.includes('typography') && (
                            <div className="p-4 bg-gray-50/50 space-y-4 animate-in slide-in-from-top-2 duration-200">
                                {activeItem && selectedItem?.subField ? (
                                    <>
                                        {/* Alignment */}
                                        <div>
                                            <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Alignment</label>
                                            <div className="flex bg-white rounded border p-1 gap-1 shadow-sm">
                                                {['left', 'center', 'right', 'justify'].map((align: any) => (
                                                    <button key={align} onClick={() => {
                                                        const sub = selectedItem!.subField!;
                                                        const key = sub.includes('arabic') ? 'arabicAlign' : sub.includes('urdu') || sub.includes('heading') ? 'urduAlign' : 'englishAlign';
                                                        updateItem(`${key}`.replace('Align', 'Align'), align, true);
                                                    }} className={clsx("flex-1 p-1 rounded flex justify-center hover:bg-purple-50 transition-colors", (activeItem.styles?.[`${selectedItem!.subField!.includes('arabic') ? 'arabic' : 'urdu'}Align`] || 'center') === align ? "bg-purple-100 text-purple-700" : "text-gray-400")}>
                                                        {align === 'left' && <AlignLeft size={14} />}
                                                        {align === 'center' && <AlignCenter size={14} />}
                                                        {align === 'right' && <AlignRight size={14} />}
                                                        {align === 'justify' && <AlignJustify size={14} />}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Size & Leading */}
                                        <StyleSlider
                                            label="Font Size"
                                            value={activeItem.styles?.[`${selectedItem.subField.includes('arabic') ? 'arabic' : 'urdu'}Size`] || 1.2}
                                            onChange={(v) => updateItem(`${selectedItem.subField!.includes('arabic') ? 'arabic' : 'urdu'}Size`, v, true)}
                                        />
                                        <StyleSlider
                                            label="Line Height" min={1.0} max={4.0} unit=""
                                            value={activeItem.styles?.[`${selectedItem.subField.includes('arabic') ? 'arabic' : 'urdu'}LineHeight`] || 1.6}
                                            onChange={(v) => updateItem(`${selectedItem.subField!.includes('arabic') ? 'arabic' : 'urdu'}LineHeight`, v, true)}
                                        />

                                        {/* Advanced Tracking */}
                                        <div className="bg-white p-2 rounded border space-y-3 shadow-sm">
                                            <div className="text-[10px] font-bold text-purple-500 uppercase flex items-center gap-1">Advanced Spacing</div>
                                            <StyleSlider
                                                label="Letter Spacing" min={-2} max={10} unit="px" step={0.5}
                                                value={activeItem.styles?.letterSpacing || 0}
                                                onChange={(v) => updateItem('letterSpacing', v, true)}
                                            />
                                            <StyleSlider
                                                label="Word Spacing" min={-5} max={20} unit="px" step={1}
                                                value={activeItem.styles?.wordSpacing || 0}
                                                onChange={(v) => updateItem('wordSpacing', v, true)}
                                            />
                                        </div>

                                        <div>
                                            <label className="text-[10px] uppercase font-bold text-purple-400 mb-1 block mt-2">Font Family</label>
                                            <select className="w-full text-xs p-1 border rounded" onChange={(e) => {
                                                const sub = selectedItem!.subField!;
                                                const key = sub.includes('arabic') ? 'arabicFont' : (sub.includes('heading') && sub.includes('english')) ? 'englishFont' : sub.includes('heading') ? 'urduFont' : sub.includes('urdu') ? 'urduFont' : 'englishFont';
                                                updateItem(key, e.target.value, true);
                                            }} value={activeItem.styles?.[`${selectedItem!.subField!.includes('arabic') ? 'arabic' : (selectedItem!.subField!.includes('heading') && selectedItem!.subField!.includes('english')) ? 'english' : selectedItem!.subField!.includes('heading') ? 'urdu' : selectedItem!.subField!.includes('urdu') ? 'urdu' : 'english'}Font`] || ''}>
                                                <option value="">Default (Global)</option>
                                                {selectedItem.subField?.includes('arabic') && (
                                                    <>
                                                        <option value="Scheherazade New">Scheherazade New</option>
                                                        <option value="Amiri">Amiri</option>
                                                        <option value="Cairo">Cairo</option>
                                                        <option value="Lateef">Lateef</option>
                                                    </>
                                                )}
                                                {(selectedItem.subField?.includes('urdu') || (selectedItem.subField?.includes('heading') && !selectedItem.subField?.includes('english'))) && (
                                                    <>
                                                        <option value="Noto Nastaliq Urdu">Noto Nastaliq Urdu</option>
                                                        <option value="Gulzar">Gulzar</option>
                                                    </>
                                                )}
                                                {(selectedItem.subField?.includes('english') || selectedItem.subField?.includes('roman') || (selectedItem.subField?.includes('heading') && selectedItem.subField?.includes('english'))) && (
                                                    <>
                                                        <option value="Inter">Inter</option>
                                                        <option value="Roboto">Roboto</option>
                                                        <option value="Lato">Lato</option>
                                                        <option value="Merriweather">Merriweather</option>
                                                    </>
                                                )}
                                            </select>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center text-gray-400 py-4">
                                        <p className="text-xs italic">Double-click text to edit style.</p>
                                    </div>
                                )}

                                <div className="h-px bg-gray-200 my-2" />

                                {/* GLOBAL TYPOGRAPHY FALLBACK */}
                                <div className="opacity-70">
                                    <div className="text-[10px] font-bold text-gray-400 uppercase mb-2">Global Defaults</div>
                                    <StyleSlider label="Global Arabic Size" isGlobal value={settings.globalStyles.arabicSize} onChange={(v) => setSettings({ ...settings, globalStyles: { ...settings.globalStyles, arabicSize: v } })} />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* SECTION: BOX & BORDER (NEW) */}
                    <div className="border-b border-gray-100">
                        <button
                            onClick={() => setExpandedSections(prev => prev.includes('box') ? prev.filter(p => p !== 'box') : [...prev, 'box'])}
                            className="w-full p-3 flex justify-between items-center bg-white hover:bg-gray-50 transition-colors"
                        >
                            <span className="flex items-center gap-2 text-xs font-bold uppercase text-gray-700"><Box size={14} className="text-orange-500" /> Box & Border</span>
                            <ChevronRight size={14} className={clsx("transition-transform text-gray-400", expandedSections.includes('box') ? "rotate-90" : "")} />
                        </button>

                        {expandedSections.includes('box') && activeItem && (
                            <div className="p-4 bg-gray-50/50 space-y-4 animate-in slide-in-from-top-2 duration-200">
                                {/* Border Style */}
                                <div>
                                    <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Border Style</label>
                                    <select
                                        className="w-full text-xs p-1.5 border rounded bg-white shadow-sm"
                                        value={activeItem.styles?.borderStyle || 'solid'}
                                        onChange={(e) => updateItem('borderStyle', e.target.value, true)}
                                    >
                                        <option value="solid">Solid</option>
                                        <option value="dashed">Dashed</option>
                                        <option value="dotted">Dotted</option>
                                        <option value="double">Double</option>
                                    </select>
                                </div>

                                <StyleSlider
                                    label="Border Width" min={0} max={10} unit="px"
                                    value={activeItem.styles?.borderWidth || 0}
                                    onChange={(v) => updateItem('borderWidth', v, true)}
                                />
                                <StyleSlider
                                    label="Border Radius" min={0} max={50} unit="px" step={2}
                                    value={activeItem.styles?.borderRadius || 0}
                                    onChange={(v) => updateItem('borderRadius', v, true)}
                                />
                                <StyleSlider
                                    label="Padding" min={0} max={50} unit="px" step={2}
                                    value={activeItem.styles?.padding || 0}
                                    onChange={(v) => updateItem('padding', v, true)}
                                />

                                <div>
                                    <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Background Color</label>
                                    <div className="flex gap-2 items-center">
                                        <input type="color" className="h-6 w-8 p-0 border rounded cursor-pointer" value={activeItem.styles?.backgroundColor || '#ffffff'} onChange={(e) => updateItem('backgroundColor', e.target.value, true)} />
                                        <button onClick={() => updateItem('backgroundColor', undefined, true)} className="text-[10px] text-red-400 hover:text-red-600">Clear</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* SECTION: LAYOUT & ASSETS */}
                    <div className="border-b border-gray-100">
                        <button
                            onClick={() => setExpandedSections(prev => prev.includes('layout') ? prev.filter(p => p !== 'layout') : [...prev, 'layout'])}
                            className="w-full p-3 flex justify-between items-center bg-white hover:bg-gray-50 transition-colors"
                        >
                            <span className="flex items-center gap-2 text-xs font-bold uppercase text-gray-700"><ImageIcon size={14} className="text-green-500" /> Page & Assets</span>
                            <ChevronRight size={14} className={clsx("transition-transform text-gray-400", expandedSections.includes('layout') ? "rotate-90" : "")} />
                        </button>

                        {expandedSections.includes('layout') && (
                            <div className="p-4 bg-gray-50/50 space-y-4 animate-in slide-in-from-top-2 duration-200">
                                {/* Page Bg */}
                                <div>
                                    <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Page Background</label>
                                    <label className="flex items-center justify-center w-full py-3 border-2 border-dashed rounded bg-white hover:bg-gray-50 cursor-pointer">
                                        <span className="text-[10px] text-gray-500"><Upload size={12} className="inline mr-1" /> Upload Image</span>
                                        <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files && handleImageUpload('pageBackgroundImage', e.target.files[0])} />
                                    </label>
                                </div>

                                {/* Margins */}
                                <div className="grid grid-cols-2 gap-2">
                                    {['top', 'bottom', 'left', 'right'].map(m => (
                                        <div key={m}>
                                            <label className="text-[9px] uppercase font-bold text-gray-400">{m}</label>
                                            <input
                                                type="number" className="w-full text-xs p-1 border rounded"
                                                // @ts-ignore
                                                value={settings.margins[m]}
                                                // @ts-ignore
                                                onChange={(e) => setSettings({ ...settings, margins: { ...settings.margins, [m]: parseInt(e.target.value) || 0 } })}
                                            />
                                        </div>
                                    ))}
                                </div>

                                {/* Page Number Style */}
                                <div>
                                    <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Page Number Style</label>
                                    <select
                                        className="w-full text-xs p-1 border rounded bg-white"
                                        value={settings.pageNumberStyle || 'urdu'}
                                        onChange={(e) => setSettings({ ...settings, pageNumberStyle: e.target.value as any })}
                                    >
                                        <option value="urdu">Urdu (۱, ۲, ۳)</option>
                                        <option value="arabic">Arabic (1, 2, 3)</option>
                                        <option value="roman">Roman (i, ii, iii)</option>
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-gray-200 bg-gray-50 space-y-2">
                    <button
                        onClick={handleExportPDF}
                        disabled={isExporting}
                        className={clsx(
                            "w-full py-2 rounded shadow text-sm font-medium flex items-center justify-center gap-2 transition-transform active:scale-95",
                            isExporting ? "bg-gray-400 cursor-not-allowed" : "bg-gray-900 hover:bg-black text-white"
                        )}
                    >
                        {isExporting ? <RefreshCcw className="animate-spin" size={16} /> : <Download size={16} />}
                        {isExporting ? `Exporting (${document.querySelectorAll('.print-page-wrapper').length} pgs)...` : "Export PDF"}
                    </button>
                    <button onClick={() => {
                        const blob = new Blob([JSON.stringify({ pages, settings }, null, 2)], { type: 'application/json' });
                        saveAs(blob, 'book_progress.json');
                    }} className="w-full py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded shadow-sm text-sm font-medium flex items-center justify-center gap-2 transition-transform active:scale-95">
                        <Save size={16} /> Save Progress (JSON)
                    </button>
                </div>
            </div>

            {/* --- Main Workspace --- */}
            <div className="flex-1 overflow-y-auto bg-gray-200/50 p-8 flex flex-col items-center gap-8 print-container scroll-smooth">
                <div className="w-full flex justify-center mb-4 no-print opacity-0 hover:opacity-100 transition-opacity">
                    <button
                        onClick={() => addNewPage(0)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-full text-xs font-bold shadow-lg hover:bg-blue-600 transition-all transform hover:scale-105"
                    >
                        <Plus size={16} /> Add Page at Start
                    </button>
                </div>

                {pages.map((page, idx) => (
                    <React.Fragment key={page.id}>
                        <div
                            className="relative group print-page-wrapper"
                            onClick={() => setSelectedPageId(page.id)}
                        >
                            <div className="absolute top-2 -left-12 flex flex-col items-center gap-2 no-print group">
                                <div className="text-gray-400 font-mono text-sm opacity-50">
                                    {page.pageNumber}
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedPageId(page.id);
                                        // Small delay to ensure state update if needed, but deletePage handles confirm
                                        setTimeout(deletePage, 10);
                                    }}
                                    className="p-2 bg-white border border-gray-200 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100"
                                    title="Delete Page"
                                >
                                    <Trash size={14} />
                                </button>
                            </div>

                            <PageRenderer
                                page={page}
                                settings={settings}
                                isActive={selectedPageId === page.id}
                                selectedItemIdx={selectedPageId === page.id && selectedItem?.pageId === page.id ? selectedItem.itemIdx : null}
                                selectedSubField={selectedPageId === page.id && selectedItem?.pageId === page.id ? selectedItem.subField : null}
                                onItemClick={(itemIdx, subField) => {
                                    // 1st click: Select whole item. 2nd click: select sub-field
                                    if (selectedItem?.pageId === page.id && selectedItem?.itemIdx === itemIdx) {
                                        setSelectedItem({ pageId: page.id, itemIdx, subField });
                                    } else {
                                        setSelectedItem({ pageId: page.id, itemIdx });
                                    }
                                    setActiveTab('content'); // Auto switch to edit content
                                }}
                                onReorder={(items) => handleReorder(page.id, items)}
                                onUpdateItem={(idx, field, val) => updateItem(field, val, false, page.id, idx)}
                            />
                        </div>

                        {/* Add Page Button Between Pages */}
                        <div className="w-full flex justify-center py-2 no-print opacity-0 hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => addNewPage(idx + 1)}
                                className="group flex items-center justify-center w-8 h-8 bg-blue-500 text-white rounded-full shadow-md hover:w-32 hover:rounded-lg transition-all duration-300 overflow-hidden"
                            >
                                <Plus size={18} className="shrink-0" />
                                <span className="text-[10px] font-bold uppercase whitespace-nowrap ml-0 group-hover:ml-2 opacity-0 group-hover:opacity-100 transition-all">Add Page</span>
                            </button>
                        </div>
                    </React.Fragment>
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
