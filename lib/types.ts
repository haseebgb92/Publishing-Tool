export type ItemType =
    | 'text'
    | 'heading'
    | 'dua'
    | 'quran'
    | 'section_title'
    | 'signature'
    | 'instruction'
    | 'note'
    | 'virtue'
    | 'names_of_allah'
    | 'question_answer'
    | 'q_a'
    | 'table_of_contents'
    | 'image'
    | 'table'
    | 'list'
    | 'divider';

export interface BookItem {
    type: ItemType | string;
    // Content Fields
    arabic?: string;
    roman?: string;
    urdu?: string;
    english?: string;
    heading_urdu?: string;
    heading_english?: string;
    content_urdu?: string;
    content_english?: string;
    // Specifics
    surah_name?: string;
    surah_number?: number;
    frequency?: string;
    instruction?: string;
    question_urdu?: string;
    question_english?: string;
    answer_urdu?: string;
    answer_english?: string;
    virtue_urdu?: string;
    virtue_english?: string;
    fazilat?: string;
    fazilat_english?: string;
    names?: { arabic: string; roman: string; english: string; urdu: string }[];

    // TOC
    toc_page?: string | number;
    // Images
    image_src?: string;
    image_caption_urdu?: string;
    image_caption_english?: string;
    // Tables
    tableData?: string[][]; // Grid of strings
    // Lists
    listItems?: string[];
    listType?: 'bullet' | 'number';
    // Editor - Unique ID for stable keys
    id?: string;
    // Individual Style Overrides (Delta from global)
    // If undefined, follows global. If set, overrides.
    styles?: {
        [key: string]: any;
        arabicSize?: number; // e.g. 1.2
        urduSize?: number;
        englishSize?: number;
        headingSize?: number;

        // Alignments
        arabicAlign?: 'left' | 'center' | 'right' | 'justify';
        urduAlign?: 'left' | 'center' | 'right' | 'justify';
        englishAlign?: 'left' | 'center' | 'right' | 'justify'; // Applies to Roman too
        headingAlign?: 'left' | 'center' | 'right';

        // Fonts
        arabicFont?: string;
        urduFont?: string;
        englishFont?: string;

        // Line Heights
        arabicLineHeight?: number;
        urduLineHeight?: number;
        englishLineHeight?: number;
        headingLineHeight?: number;
        imageWidth?: number; // percentage (0-100)

        // Colors
        arabicColor?: string;
        urduColor?: string;
        englishColor?: string;
        headingColor?: string;

        // Composing Options
        headingLevel?: 1 | 2 | 3;
        tableBorder?: boolean;
        tableStriped?: boolean;

        // Box Model (Text Box)
        backgroundColor?: string;
        borderColor?: string;
        borderWidth?: number; // px
        borderRadius?: number; // px
        padding?: number; // px
    };
    [key: string]: any;
}

export interface BookPage {
    id: string;
    pageNumber: number;
    sectionTitle?: string;
    items: BookItem[];
    // Page specific override?
    backgroundColor?: string;
    backgroundImage?: string;
}

export interface BookSettings {
    pageSize: {
        width: number;
        height: number;
        name: string;
    };
    margins: {
        top: number;
        bottom: number;
        left: number;
        right: number;
    };
    // Global Typography Defaults
    globalStyles: {
        arabicSize: number;
        urduSize: number;
        englishSize: number;
        headingSize: number;

        // Alignments
        arabicAlign: 'left' | 'center' | 'right' | 'justify';
        urduAlign: 'left' | 'center' | 'right' | 'justify';
        englishAlign: 'left' | 'center' | 'right' | 'justify';
        headingAlign: 'left' | 'center' | 'right';

        // Fonts
        arabicFont: string;
        urduFont: string;
        englishFont: string;

        // Line Heights
        arabicLineHeight: number;
        urduLineHeight: number;
        englishLineHeight: number;
        headingLineHeight: number;
    };
    sectionTitleOffset: number;
    // Assets
    pageBackgroundImage?: string; // Data URL or Path
    headingBackgroundImage?: string;
    showOutlines: boolean;
}
