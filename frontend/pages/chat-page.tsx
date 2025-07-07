"use client";

import React, { useState } from "react";
import { Sidebar, SidebarBody } from "../components/ui/sidebar";
import { cn } from "../lib/utils";
import { Button, Divider } from "@heroui/react";
import ChatContext from "../contexts/chat-context";
import { Chat } from "../components/chat";
import { useAnswerGeneration } from "../hooks/use-generate";
import { Message } from "../lib/typings";
import { IconPlus, IconMenu4 } from "@tabler/icons-react";
import { v4 as uuidv4 } from 'uuid';

export default function ChatPage() {
    const [open, setOpen] = useState(false);
    const [dbStatus, setDbStatus] = useState(false);
    const [activeChatId, setActiveChatId] = useState<string>(uuidv4());

    const {
        input,
        messages,
        isLoading,
        generateAnswer,
        history,
        addToHistory,
        updateHistory,
        dispatch,
        selectedService,
        setSelectedService,
    } = useAnswerGeneration();

    const handleNewChat = () => {
        addToHistory(activeChatId);
        const newId = uuidv4();
        setActiveChatId(newId);
        dispatch({ type: 'RESET_MESSAGES' });
        setDbStatus(false);
    };

    const handleHistoryClick = (selectedMessages: Message[], historyId: string) => {
        setActiveChatId(historyId);
        dispatch({ type: 'SET_MESSAGES', messages: selectedMessages });
    };

    return (
        <ChatContext.Provider value={{
            input,
            messages,
            isLoading,
            generateAnswer,
            history,
            dispatch,
            activeChatId,
            updateHistory,
            dbStatus,
            setDbStatus,
            selectedService,
            setSelectedService,
        }}>
            <div
                className={cn(
                    "h-screen rounded-md flex flex-col md:flex-row bg-gray-100 w-full flex-1 mx-auto border border-neutral-200  overflow-hidden",
                )}
            >
                <Sidebar open={open} setOpen={setOpen}>
                    <SidebarBody className="justify-between gap-10">
                        <div className="flex flex-col overflow-y-auto overflow-x-hidden">
                            <div className="flex flex-row justify-between items-center mb-5">
                                <Button
                                    className="font-bold"
                                    color="default"
                                    radius="full"
                                    isIconOnly
                                    size="sm"
                                >
                                    <IconMenu4 />
                                </Button>
                                {(open) && (
                                    <Button
                                        className="font-bold"
                                        color="primary"
                                        radius="lg"
                                        size="md"
                                        onPress={handleNewChat}
                                        startContent={<IconPlus />}
                                    >
                                        New Chat
                                    </Button>
                                )}
                            </div>

                            {(open) && (
                                <>
                                    <span className="font-bold text-center">Chat History</span>
                                    <Divider className="my-4" />
                                </>
                            )}
                            {(open) && (
                                <div className="flex flex-col gap-2 mt-2">
                                    {history.map((item, idx) => (
                                        <Button key={idx} className="text-left truncate block w-full" onPress={() => handleHistoryClick(item.messages, item.id)}>
                                            {item.input}
                                        </Button>
                                    ))}
                                </div>
                            )}

                        </div>
                    </SidebarBody>
                </Sidebar>
                <Chat />
            </div>
        </ChatContext.Provider>
    );
}

