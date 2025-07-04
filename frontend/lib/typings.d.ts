export interface Reference {
  url: string;
  title: string;
}

export interface Message {
    role: 'user' | 'assistant';
    content: string;
    references?: Reference[];
  }

export interface History {
    id: string;
    input: string;
    timestamp: number;
    messages: Message[];
}