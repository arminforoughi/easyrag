export interface Message {
    id: string;
    content: string;
    role: 'user' | 'assistant';
    timestamp: Date;
    mediaType?: 'text' | 'image' | 'audio' | 'video';
    mediaUrl?: string;
}

export interface ChatState {
    messages: Message[];
    isLoading: boolean;
    error: string | null;
}

export interface SearchResult {
    id: string;
    filename: string;
    fileType: string;
    content: string;
    score: number;
    mediaType: 'text' | 'image' | 'audio' | 'video';
    mediaUrl?: string;
} 