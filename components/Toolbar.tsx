import React, { useState } from 'react';
import {
    FileText, Save, Download, RotateCcw, Copy, Clipboard,
    Type, Image as ImageIcon, Table as TableIcon, List,
    Heading, AlignLeft, AlignCenter, AlignRight, AlignJustify,
    Settings, LayoutTemplate, PlusCircle, Grid, Box, ImagePlus, Eraser, Trash,
    ZoomIn, ZoomOut
} from 'lucide-react';
import clsx from 'clsx';
import { BookSettings, BookItem } from '@/lib/types';

interface ToolbarProps {
    activeTab: string;
    setActiveTab: (tab: any) => void;
    settings: BookSettings;
    onUpdateSettings: (newSettings: BookSettings) => void;
    onAction: (action: string, payload?: any) => void;
    activeItem: BookItem | null;
    onUpdateItem: (field: string, value: any, isStyle?: boolean) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
    activeTab, setActiveTab, settings, onUpdateSettings,
    onAction, activeItem, onUpdateItem
}) => {
    const [menuTab, setMenuTab] = useState<'file' | 'home' | 'insert' | 'layout' | 'format'>('home');

    const TabButton = ({ id, label }: { id: typeof menuTab, label: string }) => (
        <button
            onClick={() => setMenuTab(id)}
            className={clsx(
                "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                menuTab === id
                    ? "border-blue-600 text-blue-700 bg-blue-50/50"
                    : "border-transparent text-gray-600 hover:bg-gray-100 placeholder-opacity-0"
            )}
        >
            {label}
        </button>
    );

    const ToolButton = ({ icon: Icon, label, onClick, active = false }: any) => (
        <button
            onClick={onClick}
            className={clsx(
                "flex flex-col items-center justify-center p-2 rounded min-w-[60px] h-[60px] gap-1 transition-all",
                active ? "bg-blue-100 text-blue-700 shadow-inner" : "hover:bg-gray-100 text-gray-700"
            )}
            title={label}
        >
            <Icon size={20} className="mb-0.5" />
            <span className="text-[10px] whitespace-nowrap">{label}</span>
        </button>
    );

    const ColorPicker = ({ label, value, onChange }: { label: string, value?: string, onChange: (v: string) => void }) => (
        <div className="flex flex-col items-center justify-center p-1">
            <span className="text-[10px] text-gray-500 mb-1">{label}</span>
            <div className="flex gap-1">
                {['#000000', '#EF4444', '#10B981', '#3B82F6', '#D97706'].map(color => (
                    <button
                        key={color}
                        className={clsx("w-4 h-4 rounded-full border border-gray-200", value === color && "ring-2 ring-blue-400")}
                        style={{ backgroundColor: color }}
                        onClick={() => onChange(color)}
                    />
                ))}
                <input
                    type="color"
                    value={value || '#000000'}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-4 h-4 p-0 border-0 rounded-full overflow-hidden cursor-pointer"
                />
            </div>
        </div>
    );

    return (
        <div className="w-full bg-white border-b border-gray-200 shadow-sm flex flex-col no-print z-40">
            {/* Menu Tabs */}
            <div className="flex border-b border-gray-200 bg-gray-50/50 px-2">
                <TabButton id="file" label="File" />
                <TabButton id="home" label="Home" />
                <TabButton id="insert" label="Insert" />
                <TabButton id="layout" label="Layout" />
                <TabButton id="format" label="Format" />
            </div>

            {/* Toolbar Content */}
            <div className="p-2 h-20 flex items-center gap-2 overflow-x-auto">

                {/* --- FILE TAB --- */}
                {menuTab === 'file' && (
                    <>
                        <ToolButton icon={FileText} label="Open JSON" onClick={() => onAction('open')} />
                        <ToolButton icon={Save} label="Save JSON" onClick={() => onAction('save')} />
                        <div className="w-px h-10 bg-gray-200 mx-2" />
                        <ToolButton icon={Download} label="Export PDF" onClick={() => onAction('export')} />
                    </>
                )}

                {/* --- HOME TAB --- */}
                {menuTab === 'home' && (
                    <>
                        <ToolButton icon={Copy} label="Copy" onClick={() => { }} />
                        <ToolButton icon={Clipboard} label="Paste" onClick={() => { }} />
                        <div className="w-px h-10 bg-gray-200 mx-2" />
                        <ToolButton icon={RotateCcw} label="Undo" onClick={() => onAction('undo')} />
                        <div className="w-px h-10 bg-gray-200 mx-2" />
                        <div className="flex flex-col justify-center gap-1">
                            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Clipboard</div>
                            <div className="text-[10px] text-gray-400">Manage content</div>
                        </div>
                    </>
                )}

                {/* --- INSERT TAB --- */}
                {menuTab === 'insert' && (
                    <>
                        <ToolButton icon={PlusCircle} label="New Page" onClick={() => onAction('add_page')} />
                        <div className="w-px h-10 bg-gray-200 mx-2" />

                        {/* Simple Text Boxes */}
                        <div className="flex flex-col gap-1 mr-2">
                            <div className="text-[9px] uppercase font-bold text-gray-400 text-center">Text</div>
                            <div className="flex gap-1">
                                <button className="px-2 py-1 text-xs border rounded bg-gray-50 hover:bg-gray-100 font-serif" onClick={() => onAction('add_item', 'text_arabic')} title="Arabic Text">ع</button>
                                <button className="px-2 py-1 text-xs border rounded bg-gray-50 hover:bg-gray-100 font-serif" onClick={() => onAction('add_item', 'text_urdu')} title="Urdu Text">اردو</button>
                                <button className="px-2 py-1 text-xs border rounded bg-gray-50 hover:bg-gray-100 font-sans" onClick={() => onAction('add_item', 'text_english')} title="English Text">En</button>
                            </div>
                        </div>

                        <ToolButton icon={Type} label="Full Para" onClick={() => onAction('add_item', 'text')} />
                        <ToolButton icon={Heading} label="Heading" onClick={() => onAction('add_item', 'heading')} />
                        <div className="w-px h-10 bg-gray-200 mx-2" />
                        <ToolButton icon={ImageIcon} label="Image" onClick={() => onAction('add_item', 'image')} />
                        <ToolButton icon={ImagePlus} label="Img+Cap" onClick={() => onAction('add_item', 'image_caption')} />
                        <div className="w-px h-10 bg-gray-200 mx-2" />
                        <ToolButton icon={TableIcon} label="Table" onClick={() => onAction('add_item', 'table')} />
                        <ToolButton icon={List} label="List" onClick={() => onAction('add_item', 'list')} />
                        <div className="w-px h-10 bg-gray-200 mx-2" />
                        <ToolButton icon={LayoutTemplate} label="Section" onClick={() => onAction('add_item', 'section_title')} />
                        <ToolButton icon={Settings} label="Quran/Dua" onClick={() => onAction('add_item', 'dua')} />
                    </>
                )}

                {/* --- LAYOUT TAB --- */}
                {menuTab === 'layout' && (
                    <>
                        <div className="flex flex-col gap-1 mr-4">
                            <label className="text-[10px] uppercase font-bold text-gray-500">Page Size</label>
                            <select
                                className="text-xs border rounded p-1"
                                value={settings.pageSize.name}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    let dims = { width: 210, height: 297 };
                                    if (val === 'A5') dims = { width: 148, height: 210 };
                                    if (val === 'Letter') dims = { width: 216, height: 279 };
                                    onUpdateSettings({ ...settings, pageSize: { ...dims, name: val } });
                                }}
                            >
                                <option value="A4">A4 (210x297)</option>
                                <option value="A5">A5 (148x210)</option>
                                <option value="Letter">Letter (216x279)</option>
                            </select>
                        </div>
                        <div className="flex flex-col gap-1 mr-4">
                            <label className="text-[10px] uppercase font-bold text-gray-500">Orientation</label>
                            <div className="flex rounded border overflow-hidden">
                                <button
                                    onClick={() => onUpdateSettings({ ...settings, pageSize: { ...settings.pageSize, width: Math.min(settings.pageSize.width, settings.pageSize.height), height: Math.max(settings.pageSize.width, settings.pageSize.height) } })}
                                    className={clsx("px-2 py-1 text-xs hover:bg-gray-100", settings.pageSize.height >= settings.pageSize.width ? "bg-blue-100 text-blue-700" : "bg-white")}
                                >
                                    Port
                                </button>
                                <button
                                    onClick={() => onUpdateSettings({ ...settings, pageSize: { ...settings.pageSize, width: Math.max(settings.pageSize.width, settings.pageSize.height), height: Math.min(settings.pageSize.width, settings.pageSize.height) } })}
                                    className={clsx("px-2 py-1 text-xs hover:bg-gray-100", settings.pageSize.width > settings.pageSize.height ? "bg-blue-100 text-blue-700" : "bg-white")}
                                >
                                    Land
                                </button>
                            </div>
                        </div>
                        <div className="w-px h-10 bg-gray-200 mx-2" />
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] uppercase font-bold text-gray-500">Page Background</label>
                            <div className="flex items-center gap-1">
                                <button
                                    className="p-1 hover:bg-gray-100 rounded text-gray-600"
                                    title="Set Color"
                                    onClick={() => {
                                        const color = prompt("Enter background color (hex/name):", "#ffffff");
                                        if (color) onAction('set_page_background', { type: 'color', value: color });
                                    }}
                                >
                                    <div className="w-5 h-5 border rounded" style={{ background: 'linear-gradient(135deg, #fff 50%, #eee 50%)' }} />
                                </button>
                                <label
                                    className="p-1 hover:bg-gray-100 rounded text-gray-600 cursor-pointer"
                                    title="Set Image"
                                >
                                    <ImagePlus size={20} />
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={(e) => {
                                            if (e.target.files?.[0]) {
                                                onAction('set_page_background', { type: 'image_upload', value: e.target.files[0] });
                                                e.target.value = ''; // Reset
                                            }
                                        }}
                                    />
                                </label>
                                <button
                                    className="p-1 hover:bg-red-50 text-red-500 rounded"
                                    title="Clear Background"
                                    onClick={() => onAction('set_page_background', { type: 'clear' })}
                                >
                                    <Eraser size={20} />
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {/* --- FORMAT TAB --- */}
                {menuTab === 'format' && activeItem && (
                    <>
                        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded">
                            <ToolButton icon={AlignLeft} label="" onClick={() => onUpdateItem('arabicAlign', 'left', true)} />
                            <ToolButton icon={AlignCenter} label="" onClick={() => onUpdateItem('arabicAlign', 'center', true)} />
                            <ToolButton icon={AlignRight} label="" onClick={() => onUpdateItem('arabicAlign', 'right', true)} />
                            <ToolButton icon={AlignJustify} label="" onClick={() => onUpdateItem('arabicAlign', 'justify', true)} />
                        </div>
                        <div className="w-px h-10 bg-gray-200 mx-2" />
                        <ColorPicker
                            label="Arabic Color"
                            value={activeItem.styles?.arabicColor}
                            onChange={(v) => onUpdateItem('arabicColor', v, true)}
                        />
                        <ColorPicker
                            label="Urdu Color"
                            value={activeItem.styles?.urduColor}
                            onChange={(v) => onUpdateItem('urduColor', v, true)}
                        />
                        <ColorPicker
                            label="English Color"
                            value={activeItem.styles?.englishColor}
                            onChange={(v) => onUpdateItem('englishColor', v, true)}
                        />
                        <div className="w-px h-10 bg-gray-200 mx-2" />
                        {activeItem.type === 'heading' && (
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] uppercase font-bold text-gray-500">Level</label>
                                <select
                                    className="text-xs border rounded p-1 w-20"
                                    value={activeItem.styles?.headingLevel || 1}
                                    onChange={(e) => onUpdateItem('headingLevel', parseInt(e.target.value), true)}
                                >
                                    <option value={1}>H1 (Main)</option>
                                    <option value={2}>H2 (Sub)</option>
                                    <option value={3}>H3 (Small)</option>
                                </select>
                            </div>
                        )}
                        {/* Text Box / Box Model Styles */}
                        {(activeItem.type === 'text' || activeItem.styles?.borderWidth) && (
                            <>
                                <div className="w-px h-10 bg-gray-200 mx-2" />
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] uppercase font-bold text-gray-500">Box Style</label>
                                    <div className="flex gap-1">
                                        <ColorPicker label="Fill" value={activeItem.styles?.backgroundColor} onChange={(v) => onUpdateItem('backgroundColor', v, true)} />
                                        <ColorPicker label="Border" value={activeItem.styles?.borderColor} onChange={(v) => onUpdateItem('borderColor', v, true)} />
                                        <div className="flex flex-col justify-center">
                                            <label className="text-[9px] text-gray-400">Width</label>
                                            <input type="number" className="w-10 text-xs border rounded" value={activeItem.styles?.borderWidth || 0} onChange={(e) => onUpdateItem('borderWidth', parseInt(e.target.value), true)} />
                                        </div>
                                        <div className="flex flex-col justify-center">
                                            <label className="text-[9px] text-gray-400">Pad</label>
                                            <input type="number" className="w-10 text-xs border rounded" value={activeItem.styles?.padding || 0} onChange={(e) => onUpdateItem('padding', parseInt(e.target.value), true)} />
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </>
                )}
                {menuTab === 'format' && !activeItem && (
                    <div className="text-sm text-gray-400 italic px-4">Select an item to format</div>
                )}
            </div>
        </div>
    );
};
