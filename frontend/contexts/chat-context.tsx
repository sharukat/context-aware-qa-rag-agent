// contexts/chat-context.tsx
import React, {createContext} from 'react';
import {Message, History} from '../lib/typings';
import {Action} from '../hooks/use-generate';

interface ChatContextType {
    input: string;
    messages: Message[];
    isLoading: boolean;
    generateAnswer: (messages: Message[], state: string, chatId?: string) => Promise<void>;
    history: History[];
    dispatch: React.Dispatch<Action>;
    activeChatId: string;
    updateHistory: (chatId: string) => void;
    dbStatus: boolean;
    setDbStatus: (status: boolean) => void;
    selectedService: string;
    setSelectedService: (service: string) => void;
}

const ChatContext = createContext<ChatContextType>({
        input: "",
        messages: [],
        isLoading: false,
        generateAnswer: () => Promise.resolve(),
        history: [],
        dispatch: () => {},
        activeChatId: "",
        updateHistory: () => {},
        dbStatus: false,
        setDbStatus: () => {},
        selectedService: "tools",
        setSelectedService: () => {},
    }
);

export default ChatContext;
