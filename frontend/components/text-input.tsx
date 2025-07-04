"use client";


import { Button, addToast, Tabs, Tab } from "@heroui/react";
import { useCallback, useContext, useState } from "react";
import { Message } from "../lib/typings";
import ChatContext from "../contexts/chat-context";
import { IconArrowUp, IconTool, IconFileText, IconGlobe } from "@tabler/icons-react";
import FileUpload from "./file-upload";
import { uploadFiles } from "../lib/api"; // adjust path as needed

const TABS = [
    {
        key: "tools",
        title: "Stock Tool",
        icon: <IconTool />,
    },
    {
        key: "rag",
        title: "Document Chat",
        icon: <IconFileText />,
    },
    {
        key: "search",
        title: "Web Search",
        icon: <IconGlobe />,
    }
];

export default function TextInput() {
    const context = useContext(ChatContext);
    const [dbLoading, setDbLoading] = useState(false);
    const [option, setOption] = useState("tools");
    const [files, setFiles] = useState<File[]>([]);

    const handleFileUpload = async (files: File[]) => {
        setFiles(files);
        
        // Automatically upload files to DB when selected
        if (files.length > 0) {
            setDbLoading(true);
            try {
                const result = await uploadFiles(files);

                if (result.error) {
                    throw new Error(result.error);
                }

                setFiles([]);
                addToast({ title: "Vector database created.", color: "success" });
                context.setDbStatus(true);
            } catch (error) {
                console.error('Error uploading files:', error);
                addToast({ title: "Error uploading files", description: error instanceof Error ? error.message : String(error) });
            } finally {
                setDbLoading(false);
            }
        }
    };

    const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!context.input.trim()) return;

        const newUserMessage: Message = {
            role: "user",
            content: context.input,
        };
        const updatedMessages = [...context.messages, newUserMessage];
        context.dispatch({ type: 'SET_MESSAGES', messages: updatedMessages });

        try {
            await context.generateAnswer(updatedMessages, option);
            if (context.activeChatId) {
                context.updateHistory(context.activeChatId);
            }
        } catch (error) {
            console.error("Error generating response:", error);
        }
    }, [context, context.activeChatId, option]);

    return (
        <form
            onSubmit={handleSubmit}
            className="relative flex flex-col w-full mx-auto"
        >
            <div className="flex flex-col w-full bg-gray-100 rounded-3xl">
                <textarea
                    placeholder="Ask any question?"
                    value={context.input}
                    onChange={(e) => context.dispatch({ type: 'SET_INPUT', input: e.target.value })}
                    disabled={context.isLoading}
                    className="w-full max-h-96 p-4 bg-transparent resize-none focus:outline-none"
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            if (context.input && !context.isLoading && context.dbStatus) {
                                const form = e.currentTarget.form;
                                if (form) {
                                    form.requestSubmit();
                                }
                            }
                        }
                    }}
                />
                <div className="flex flex-row justify-between items-center p-2">
                    <Tabs
                        aria-label="Options"
                        color="primary"
                        variant="bordered"
                        radius="full"
                        selectedKey={option}
                        onSelectionChange={(key) => setOption(String(key))}
                    >
                        {TABS.map((tab) => (
                            <Tab
                                key={tab.key}
                                title={
                                    <div className="flex items-center space-x-2">
                                        {tab.icon}
                                        <span>{tab.title}</span>
                                    </div>
                                }
                            />
                        ))}
                    </Tabs>
                    <div className="z-10 flex flex-row gap-2">
                        <FileUpload state={option !== "rag"} onChange={handleFileUpload} isLoading={dbLoading} />
                        <Button
                            className="z-10 bg-gray-900"
                            isLoading={context.isLoading}
                            size="sm"
                            radius="full"
                            type="submit"
                            color="primary"
                            isIconOnly
                            isDisabled={context.isLoading || !context.input.trim()}
                        >
                            <IconArrowUp />
                        </Button>
                    </div>
                </div>
            </div>
        </form>
    )
}