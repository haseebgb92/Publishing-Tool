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
    // Editor meta (transient)
    id?: string;
}

export interface BookPage {
    id: string; // UUID for internal tracking
    pageNumber: number;
    sectionTitle?: string; // If this page starts a section
    items: BookItem[];
}

export interface BookSettings {
    pageSize: {
        width: number; // mm
        height: number; // mm
        name: string;
    };
    margins: {
        top: number;
        bottom: number;
        left: number;
        right: number;
    };
    fontScale: number;
    showOutlines: boolean;
}
