export interface Reference {
  citation: string;
  title: string;
}

export interface Message {
    role: 'user' | 'assistant';
    content: string;
    service?: string;
    references?: Reference[];
  }

export interface History {
    id: string;
    input: string;
    timestamp: number;
    messages: Message[];
}