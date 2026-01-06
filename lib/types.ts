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
    | 'table_of_contents';

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
    names?: { arabic: string; roman: string; english: string }[];

    // TOC
    toc_page?: number;
    // Editor - Unique ID for stable keys
    id?: string;
    // Individual Style Overrides (Delta from global)
    // If undefined, follows global. If set, overrides.
    styles?: {
        arabicSize?: number; // e.g. 1.2
        urduSize?: number;
        englishSize?: number;
        headingSize?: number;
    }
}

export interface BookPage {
    id: string;
    pageNumber: number;
    sectionTitle?: string;
    items: BookItem[];
    // Page specific override?
    background?: string;
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
    };
    // Assets
    pageBackgroundImage?: string; // Data URL or Path
    headingBackgroundImage?: string;
    showOutlines: boolean;
}
