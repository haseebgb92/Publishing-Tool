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
    RefreshCcw, ArrowDown, ArrowUp, Trash, RotateCcw,
    AlignLeft, AlignCenter, AlignRight, AlignJustify,
    PlusCircle, Plus, Crown, ArrowUpDown, List
} from 'lucide-react';

interface EditorProps {
    initialData?: any[];
}

export default function BookEditor({ initialData }: EditorProps) {
    // --- State ---
    const [pages, setPages] = useState<BookPage[]>([]);
    const [history, setHistory] = useState<BookPage[][]>([]);
    const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
    const [selectedItem, setSelectedItem] = useState<{ pageId: string, itemIdx: number, subField?: string } | null>(null);
    const [activeTab, setActiveTab] = useState<'layout' | 'typography' | 'content' | 'assets'>('content');
    const [isExporting, setIsExporting] = useState(false);
    const [bulkTOCText, setBulkTOCText] = useState('');

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
        pageBackgroundImage: '',
        headingBackgroundImage: '',
        showOutlines: true
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
        setPages(newPages);
    };

    const handleUndo = () => {
        if (history.length === 0) return;
        const previous = history[history.length - 1];
        setHistory(prev => prev.slice(0, -1));
        setPages(previous);
    };

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
            newItem.image_caption_urdu = 'تصویر کا عنوان';
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
                <div className="p-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                    <h2 className="font-bold text-gray-800 flex items-center gap-2 text-xs uppercase"><Settings size={14} /> Properties & Outline</h2>
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
                                    <div className="bg-purple-50 border border-purple-100 p-3 rounded-lg mb-4">
                                        <h3 className="text-xs font-bold text-purple-700 uppercase mb-3 flex justify-between">
                                            Styles ({selectedItem?.subField || 'Item'})
                                            <button onClick={() => updateItem('styles', undefined, false)} title="Reset styles" className="text-purple-400 hover:text-purple-600"><RefreshCcw size={12} /></button>
                                        </h3>

                                        {/* TABLE TOOLS */}
                                        {activeItem.type === 'table' && (
                                            <div className="bg-white p-2 rounded border space-y-2">
                                                <label className="text-[10px] font-bold text-gray-500 uppercase">Table Structure</label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <button onClick={() => {
                                                        const data = activeItem.tableData || [['']];
                                                        const cols = data[0].length;
                                                        const newData = [...data, new Array(cols).fill('')];
                                                        updateItem('tableData', newData);
                                                    }} className="text-xs bg-gray-50 border p-1 rounded hover:bg-gray-100 flex gap-1 justify-center items-center"><Plus size={10} /> Row</button>

                                                    <button onClick={() => {
                                                        const data = activeItem.tableData || [['']];
                                                        const newData = data.map(row => [...row, '']);
                                                        updateItem('tableData', newData);
                                                    }} className="text-xs bg-gray-50 border p-1 rounded hover:bg-gray-100 flex gap-1 justify-center items-center"><Plus size={10} /> Col</button>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <button onClick={() => {
                                                        const data = activeItem.tableData || [];
                                                        if (data.length <= 1) return;
                                                        updateItem('tableData', data.slice(0, -1));
                                                    }} className="text-xs border border-red-100 text-red-500 p-1 rounded hover:bg-red-50 flex gap-1 justify-center items-center"><Trash size={10} /> Row</button>
                                                    <button onClick={() => {
                                                        const data = activeItem.tableData || [];
                                                        if (data[0].length <= 1) return;
                                                        const newData = data.map(row => row.slice(0, -1));
                                                        updateItem('tableData', newData);
                                                    }} className="text-xs border border-red-100 text-red-500 p-1 rounded hover:bg-red-50 flex gap-1 justify-center items-center"><Trash size={10} /> Col</button>
                                                </div>
                                                <div className="flex gap-2 text-xs">
                                                    <label className="flex items-center gap-1 cursor-pointer">
                                                        <input type="checkbox" checked={!!activeItem.styles?.tableBorder} onChange={(e) => updateItem('tableBorder', e.target.checked, true)} /> Border
                                                    </label>
                                                    <label className="flex items-center gap-1 cursor-pointer">
                                                        <input type="checkbox" checked={!!activeItem.styles?.tableStriped} onChange={(e) => updateItem('tableStriped', e.target.checked, true)} /> Striped
                                                    </label>
                                                </div>
                                            </div>
                                        )}

                                        {/* LIST TOOLS */}
                                        {activeItem.type === 'list' && (
                                            <div className="bg-white p-2 rounded border space-y-2">
                                                <label className="text-[10px] font-bold text-gray-500 uppercase">List Items</label>
                                                <textarea
                                                    className="w-full text-xs border rounded p-1 h-24 font-mono"
                                                    value={activeItem.listItems?.join('\n') || ''}
                                                    onChange={(e) => updateItem('listItems', e.target.value.split('\n'))}
                                                    placeholder="One item per line"
                                                />
                                                <div className="flex gap-2 justify-center bg-gray-50 p-1 rounded">
                                                    <button onClick={() => updateItem('listType', 'bullet')} className={clsx("p-1 rounded", (activeItem.listType || 'bullet') === 'bullet' ? "bg-white shadow text-blue-600" : "text-gray-400")}><List size={14} /></button>
                                                    <button onClick={() => updateItem('listType', 'number')} className={clsx("p-1 rounded", activeItem.listType === 'number' ? "bg-white shadow text-blue-600" : "text-gray-400")}><span className="text-xs font-serif font-bold">1.</span></button>
                                                </div>
                                            </div>
                                        )}


                                        {selectedItem?.subField && (
                                            <div className="space-y-4">
                                                {(selectedItem.subField.includes('arabic') || selectedItem.subField.includes('name')) && (
                                                    <>
                                                        <StyleSlider label="Arabic Size" value={activeItem.styles?.arabicSize || settings.globalStyles.arabicSize} onChange={(v) => updateItem('arabicSize', v, true)} />
                                                        <StyleSlider label="Arabic Spacing" min={1.0} max={4.0} unit="" value={activeItem.styles?.arabicLineHeight || settings.globalStyles.arabicLineHeight} onChange={(v) => updateItem('arabicLineHeight', v, true)} />
                                                    </>
                                                )}
                                                {(selectedItem.subField.includes('urdu') || selectedItem.subField.includes('heading')) && (
                                                    <>
                                                        <StyleSlider label="Urdu/Heading Size" value={activeItem.styles?.urduSize || settings.globalStyles.urduSize} onChange={(v) => updateItem('urduSize', v, true)} />
                                                        <StyleSlider label="Spacing" min={1.0} max={4.0} unit="" value={selectedItem.subField!.includes('heading') ? (activeItem.styles?.headingLineHeight || settings.globalStyles.headingLineHeight) : (activeItem.styles?.urduLineHeight || settings.globalStyles.urduLineHeight)} onChange={(v) => updateItem(selectedItem.subField!.includes('heading') ? 'headingLineHeight' : 'urduLineHeight', v, true)} />
                                                    </>
                                                )}
                                                {(selectedItem.subField.includes('english') || selectedItem.subField.includes('roman')) && (
                                                    <>
                                                        <StyleSlider label="English Size" value={activeItem.styles?.englishSize || settings.globalStyles.englishSize} onChange={(v) => updateItem('englishSize', v, true)} />
                                                        <StyleSlider label="English Spacing" min={1.0} max={4.0} unit="" value={activeItem.styles?.englishLineHeight || settings.globalStyles.englishLineHeight} onChange={(v) => updateItem('englishLineHeight', v, true)} />
                                                    </>
                                                )}
                                                <div className="h-px bg-purple-200/50 my-2"></div>
                                                <div>
                                                    <label className="text-[10px] uppercase font-bold text-purple-400 mb-1 block">Alignment</label>
                                                    <div className="flex bg-white rounded border p-1 gap-1">
                                                        {['left', 'center', 'right', 'justify'].map((align: any) => (
                                                            <button key={align} onClick={() => {
                                                                const sub = selectedItem!.subField!;
                                                                const key = sub.includes('arabic') ? 'arabicAlign' : (sub.includes('heading') && sub.includes('english')) ? 'englishAlign' : sub.includes('heading') ? 'headingAlign' : sub.includes('urdu') ? 'urduAlign' : 'englishAlign';
                                                                updateItem(key, align, true);
                                                            }} className={clsx("p-1 rounded flex-1 flex justify-center hover:bg-purple-50", (activeItem.styles?.[`${selectedItem!.subField!.includes('arabic') ? 'arabic' : (selectedItem!.subField!.includes('heading') && selectedItem!.subField!.includes('english')) ? 'english' : selectedItem!.subField!.includes('heading') ? 'heading' : selectedItem!.subField!.includes('urdu') ? 'urdu' : 'english'}Align`] || 'center') === align ? "bg-purple-100 text-purple-700" : "text-gray-400")}>
                                                                {align === 'left' && <AlignLeft size={14} />}
                                                                {align === 'center' && <AlignCenter size={14} />}
                                                                {align === 'right' && <AlignRight size={14} />}
                                                                {align === 'justify' && <AlignJustify size={14} />}
                                                            </button>
                                                        ))}
                                                    </div>
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
                                            </div>
                                        )}
                                        {!selectedItem?.subField && <div className="text-xs text-gray-500 italic">Select a part (double click) to style it.</div>}
                                    </div>

                                    <div className="space-y-3">
                                        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b pb-1">Edit Text</div>
                                        {['arabic', 'roman', 'urdu', 'english', 'fazilat', 'fazilat_english', 'heading_urdu', 'heading_english', 'content_urdu', 'content_english', 'image_caption_urdu', 'image_caption_english', 'toc_page'].map(field => (
                                            (activeItem[field] !== undefined || (field.includes('heading') && activeItem.type === 'heading')) && (
                                                <div key={field}>
                                                    <label className="block text-[10px] font-medium text-gray-500 mb-1 capitalize">{field.replace('_', ' ')}</label>
                                                    <textarea className="w-full text-sm p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none transition-shadow" rows={field === 'arabic' ? 3 : 2} dir={field.includes('english') || field === 'roman' ? 'ltr' : 'rtl'} value={activeItem[field] || ''} onChange={(e) => updateItem(field, e.target.value)} />
                                                </div>
                                            )
                                        ))}

                                        {activeItem.type === 'image' && (
                                            <div className="pt-3 border-t">
                                                <div className="bg-pink-50 p-3 rounded-lg border border-pink-100 mb-3">
                                                    <label className="block text-[10px] font-bold text-pink-600 uppercase mb-2">Image Scaling</label>
                                                    <StyleSlider
                                                        label="Current Scale"
                                                        min={10} max={100} unit="%"
                                                        value={activeItem.styles?.imageWidth || 100}
                                                        onChange={(v) => updateItem('imageWidth', v, true)}
                                                    />
                                                </div>

                                                <label className="block text-[10px] font-bold text-pink-400 uppercase mb-2">Image File</label>
                                                <div className="flex flex-col gap-2">
                                                    {activeItem.image_src && (
                                                        <img src={activeItem.image_src} alt="Preview" className="w-full h-32 object-contain border rounded bg-white shadow-inner" />
                                                    )}
                                                    <label className="flex items-center justify-center w-full py-2 border-2 border-dashed rounded-lg cursor-pointer hover:bg-pink-50 transition-colors border-pink-200">
                                                        <div className="text-center flex items-center gap-2">
                                                            <Upload size={14} className="text-pink-400" />
                                                            <span className="text-[10px] text-pink-600 font-bold uppercase">{activeItem.image_src ? 'Replace Image' : 'Upload Image'}</span>
                                                        </div>
                                                        <input
                                                            type="file"
                                                            className="hidden"
                                                            accept="image/*"
                                                            onChange={(e) => {
                                                                if (e.target.files?.[0]) {
                                                                    const reader = new FileReader();
                                                                    reader.onload = () => updateItem('image_src', reader.result);
                                                                    reader.readAsDataURL(e.target.files[0]);
                                                                }
                                                            }}
                                                        />
                                                    </label>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="pt-4 border-t border-gray-100">
                                        <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-2">Item Actions</h4>
                                        <div className="grid grid-cols-2 gap-2 mb-2">
                                            <button onClick={() => moveActiveItemToPage(-1)} className="py-2 px-1 bg-white border hover:bg-gray-50 text-[10px] rounded flex items-center justify-center gap-1 text-gray-700"><ArrowUp size={14} /> Prev Page</button>
                                            <button onClick={() => moveActiveItemToPage(1)} className="py-2 px-1 bg-white border hover:bg-gray-50 text-[10px] rounded flex items-center justify-center gap-1 text-gray-700"><ArrowDown size={14} /> Next Page</button>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            <button onClick={handlePushToNext} className="py-2 px-1 bg-white border hover:bg-gray-50 text-[10px] rounded flex flex-col items-center gap-1 text-gray-400"><ArrowDown size={14} /> Split</button>
                                            <button onClick={handlePullToPrev} className="py-2 px-1 bg-white border hover:bg-gray-50 text-[10px] rounded flex flex-col items-center gap-1 text-gray-400"><ArrowUp size={14} /> Pull</button>
                                            <button onClick={deleteItem} className="py-2 px-1 bg-white border border-red-200 hover:bg-red-50 text-[10px] rounded flex flex-col items-center gap-1 text-red-600"><Trash size={14} /> Delete</button>
                                        </div>
                                        <div className="pt-4 border-t border-gray-100">
                                            <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-2">Add Content</h4>
                                            <div className="grid grid-cols-2 gap-2">
                                                <button onClick={() => addItem('section_title')} className="py-2 px-1 bg-yellow-50 border border-yellow-100 hover:bg-yellow-100 text-[10px] rounded flex items-center justify-center gap-1 text-yellow-700 font-bold"><Crown size={14} /> Sec Title</button>
                                                <button onClick={() => addItem('heading')} className="py-2 px-1 bg-blue-50 border border-blue-100 hover:bg-blue-100 text-[10px] rounded flex items-center justify-center gap-1 text-blue-700 font-bold"><PlusCircle size={14} /> Heading</button>
                                                <button onClick={() => addItem('dua')} className="py-2 px-1 bg-green-50 border border-green-100 hover:bg-green-100 text-[10px] rounded flex items-center justify-center gap-1 text-green-700 font-bold"><PlusCircle size={14} /> Dua/Quran</button>
                                                <button onClick={() => addItem('text')} className="py-2 px-1 bg-gray-50 border border-gray-200 hover:bg-gray-100 text-[10px] rounded flex items-center justify-center gap-1 text-gray-700"><PlusCircle size={14} /> Text</button>
                                                <button onClick={() => addItem('instruction')} className="py-2 px-1 bg-orange-50 border border-orange-100 hover:bg-orange-100 text-[10px] rounded flex items-center justify-center gap-1 text-orange-700"><PlusCircle size={14} /> Instr.</button>
                                                <button onClick={() => addItem('image')} className="py-2 px-1 bg-pink-50 border border-pink-100 hover:bg-pink-100 text-[10px] rounded flex items-center justify-center gap-1 text-pink-700 font-bold col-span-2"><ImageIcon size={14} /> Add Image</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="p-8 text-center text-gray-400 border-2 border-dashed rounded-xl">
                                        <Type className="mx-auto mb-2 opacity-50" />
                                        <p className="text-sm italic">Select an item to edit, or add a new one below.</p>
                                    </div>
                                    {selectedPageId && (
                                        <div className="bg-white p-4 rounded-xl border shadow-sm space-y-3">
                                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b pb-1">Add to Page {pages.find(p => p.id === selectedPageId)?.pageNumber}</div>
                                            <div className="grid grid-cols-1 gap-2">
                                                <button onClick={() => addItem('section_title')} className="py-3 px-4 bg-yellow-50 border border-yellow-200 hover:bg-yellow-100 text-xs rounded-lg flex items-center gap-3 text-yellow-700 font-bold transition-all transform hover:scale-[1.02]">
                                                    <div className="p-2 bg-yellow-500 text-white rounded-lg"><Crown size={16} /></div>
                                                    <div className="flex flex-col items-start leading-tight"><span>Add Section Title</span><span className="text-[10px] font-normal opacity-60">Large chapter heading</span></div>
                                                </button>
                                                <button onClick={() => addItem('heading')} className="py-3 px-4 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-xs rounded-lg flex items-center gap-3 text-blue-700 font-bold transition-all transform hover:scale-[1.02]">
                                                    <div className="p-2 bg-blue-500 text-white rounded-lg"><LayoutTemplate size={16} /></div>
                                                    <div className="flex flex-col items-start leading-tight"><span>Add Heading</span><span className="text-[10px] font-normal opacity-60">Section title</span></div>
                                                </button>
                                                <button onClick={() => addItem('dua')} className="py-3 px-4 bg-green-50 border border-green-200 hover:bg-green-100 text-xs rounded-lg flex items-center gap-3 text-green-700 font-bold transition-all transform hover:scale-[1.02]">
                                                    <div className="p-2 bg-green-500 text-white rounded-lg"><PlusCircle size={16} /></div>
                                                    <div className="flex flex-col items-start leading-tight"><span>Add Dua / Quran</span><span className="text-[10px] font-normal opacity-60">Arabic text</span></div>
                                                </button>
                                                <button onClick={() => addItem('text')} className="py-3 px-4 bg-gray-50 border border-gray-200 hover:bg-gray-100 text-xs rounded-lg flex items-center gap-3 text-gray-700 font-bold transition-all transform hover:scale-[1.02]">
                                                    <div className="p-2 bg-gray-500 text-white rounded-lg"><Type size={16} /></div>
                                                    <div className="flex flex-col items-start leading-tight"><span>Add Text / Note</span><span className="text-[10px] font-normal opacity-60">Simple paragraph</span></div>
                                                </button>
                                                <button onClick={() => addItem('instruction')} className="py-3 px-4 bg-orange-50 border border-orange-200 hover:bg-orange-100 text-xs rounded-lg flex items-center gap-3 text-orange-700 font-bold transition-all transform hover:scale-[1.02]">
                                                    <div className="p-2 bg-orange-500 text-white rounded-lg"><PlusCircle size={16} /></div>
                                                    <div className="flex flex-col items-start leading-tight"><span>Add Instruction</span><span className="text-[10px] font-normal opacity-60">How to perform</span></div>
                                                </button>
                                                <button onClick={() => addItem('image')} className="py-3 px-4 bg-pink-50 border border-pink-200 hover:bg-pink-100 text-xs rounded-lg flex items-center gap-3 text-pink-700 font-bold transition-all transform hover:scale-[1.02]">
                                                    <div className="p-2 bg-pink-500 text-white rounded-lg"><ImageIcon size={16} /></div>
                                                    <div className="flex flex-col items-start leading-tight"><span>Add Image</span><span className="text-[10px] font-normal opacity-60">Photo or Illustration</span></div>
                                                </button>
                                            </div>

                                            <div className="pt-6 mt-6 border-t">
                                                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Bulk Tools</h4>
                                                <div className="bg-gray-50 p-3 rounded-lg border">
                                                    <label className="block text-[10px] font-bold text-gray-500 mb-2 uppercase">Bulk Add TOC Entries</label>
                                                    <p className="text-[9px] text-gray-400 mb-2 italic leading-tight">Paste lines in "Topic [TAB] Page" format from Excel/Word.</p>
                                                    <textarea
                                                        className="w-full text-[10px] p-2 border rounded font-mono mb-2"
                                                        rows={4}
                                                        placeholder={"Morning Duas\t12\nEvening Prayers\t24"}
                                                        value={bulkTOCText}
                                                        onChange={(e) => setBulkTOCText(e.target.value)}
                                                    />
                                                    <button
                                                        onClick={() => {
                                                            handleBulkTOCCopyPaste(bulkTOCText);
                                                            setBulkTOCText('');
                                                        }}
                                                        disabled={!bulkTOCText.trim()}
                                                        className="w-full py-2 bg-indigo-50 border border-indigo-200 text-indigo-600 rounded text-[10px] font-bold hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        Parse & Add Entries
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
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

                                    <div className="h-px bg-gray-100 my-4"></div>
                                    <h4 className="text-[10px] font-bold text-blue-400 uppercase mb-3">Line Spacing (Universal)</h4>

                                    <StyleSlider
                                        label="Arabic Line Height" isGlobal min={1.0} max={4.0} unit=""
                                        value={settings.globalStyles.arabicLineHeight}
                                        onChange={(v) => setSettings({ ...settings, globalStyles: { ...settings.globalStyles, arabicLineHeight: v } })}
                                    />
                                    <StyleSlider
                                        label="Urdu Line Height" isGlobal min={1.0} max={4.0} unit=""
                                        value={settings.globalStyles.urduLineHeight}
                                        onChange={(v) => setSettings({ ...settings, globalStyles: { ...settings.globalStyles, urduLineHeight: v } })}
                                    />
                                    <StyleSlider
                                        label="English Line Height" isGlobal min={1.0} max={4.0} unit=""
                                        value={settings.globalStyles.englishLineHeight}
                                        onChange={(v) => setSettings({ ...settings, globalStyles: { ...settings.globalStyles, englishLineHeight: v } })}
                                    />
                                    <StyleSlider
                                        label="Heading Line Height" isGlobal min={1.0} max={4.0} unit=""
                                        value={settings.globalStyles.headingLineHeight}
                                        onChange={(v) => setSettings({ ...settings, globalStyles: { ...settings.globalStyles, headingLineHeight: v } })}
                                    />

                                    <div className="pt-2 border-t mt-2">
                                        <label className="text-xs font-bold block mb-1">Global Arabic Font</label>
                                        <select
                                            className="w-full text-xs border rounded p-1"
                                            value={settings.globalStyles.arabicFont}
                                            onChange={(e) => setSettings({ ...settings, globalStyles: { ...settings.globalStyles, arabicFont: e.target.value } })}
                                        >
                                            <option value="Scheherazade New">Scheherazade New</option>
                                            <option value="Amiri">Amiri</option>
                                            <option value="Cairo">Cairo</option>
                                            <option value="Lateef">Lateef</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- TAB: LAYOUT --- */}
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
                                    <div>
                                        <label className="block text-[10px] text-gray-400 uppercase">Heading Top Offset</label>
                                        <input
                                            type="number"
                                            value={settings.sectionTitleOffset}
                                            onChange={(e) => setSettings({ ...settings, sectionTitleOffset: parseInt(e.target.value) || 0 })}
                                            className="w-full text-xs p-1 border rounded"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-[10px] text-gray-400 uppercase mb-1">Page Background Color</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="color"
                                                value={pages.find(p => p.id === selectedPageId)?.backgroundColor || '#ffffff'}
                                                onChange={(e) => {
                                                    const newPages = pages.map(p => p.id === selectedPageId ? { ...p, backgroundColor: e.target.value } : p);
                                                    updatePagesWithHistory(newPages);
                                                }}
                                                className="w-10 h-8 rounded border p-0 cursor-pointer"
                                            />
                                            <button
                                                onClick={() => {
                                                    const newPages = pages.map(p => p.id === selectedPageId ? { ...p, backgroundColor: '#ffffff' } : p);
                                                    updatePagesWithHistory(newPages);
                                                }}
                                                className="text-[10px] text-gray-400 hover:text-gray-600 font-bold uppercase"
                                            >
                                                Reset to White
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t space-y-4">
                                    <h3 className="text-sm font-bold text-gray-800 mb-2">Page Actions</h3>

                                    <div className="space-y-2">
                                        <button
                                            onClick={deletePage}
                                            disabled={!selectedPageId || pages.length === 0}
                                            className="w-full py-2 bg-red-50 border border-red-200 text-red-600 rounded text-xs font-bold hover:bg-red-100 flex items-center justify-center gap-2"
                                        >
                                            <Trash size={14} /> Delete Selected Page {selectedPageId && `(${pages.find(p => p.id === selectedPageId)?.pageNumber})`}
                                        </button>

                                        <div className="flex gap-2">
                                            <input
                                                id="deletePageNum"
                                                type="number"
                                                placeholder="Page #"
                                                className="w-20 text-xs p-1 border rounded"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        const num = parseInt((e.target as HTMLInputElement).value);
                                                        if (num) deletePageByNumber(num);
                                                    }
                                                }}
                                            />
                                            <button
                                                onClick={() => {
                                                    const input = document.getElementById('deletePageNum') as HTMLInputElement;
                                                    const num = parseInt(input.value);
                                                    if (num) deletePageByNumber(num);
                                                }}
                                                className="flex-1 py-1 px-2 border border-red-200 text-red-600 rounded text-[10px] font-bold hover:bg-red-50"
                                            >
                                                Delete Page By #
                                            </button>
                                        </div>

                                        <div className="h-px bg-gray-100 my-4"></div>
                                        <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-2">Move Selected Page</h4>
                                        <div className="flex gap-2">
                                            <input
                                                id="movePageTarget"
                                                type="number"
                                                placeholder="Target #"
                                                className="w-20 text-xs p-1 border rounded"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        const num = parseInt((e.target as HTMLInputElement).value);
                                                        if (num) movePage(num);
                                                    }
                                                }}
                                            />
                                            <button
                                                onClick={() => {
                                                    const input = document.getElementById('movePageTarget') as HTMLInputElement;
                                                    const num = parseInt(input.value);
                                                    if (num) movePage(num);
                                                }}
                                                className="flex-1 py-1 px-2 bg-blue-50 border border-blue-200 text-blue-600 rounded text-[10px] font-bold hover:bg-blue-100 flex items-center justify-center gap-1"
                                            >
                                                <ArrowUpDown size={12} /> Move to Position
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- TAB: ASSETS --- */}
                    {activeTab === 'assets' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
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
