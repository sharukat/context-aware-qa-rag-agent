"use client";


import { Button, addToast } from "@heroui/react";
import { useCallback, useContext, useReducer, useState } from "react";
import { Message } from "../lib/typings";
import ChatContext from "../contexts/chat-context";
import { IconArrowUp, IconTool, IconFileText } from "@tabler/icons-react";
import FileUpload from "./file-upload";
import { uploadFiles } from "../lib/api"; // adjust path as needed

interface State {
    toolCall: boolean;
    rag: boolean;
}

type ToolAction =
    | { type: 'SET_TOOL_CALL'; value: boolean }
    | { type: 'SET_RAG'; value: boolean };

const toolReducer = (state: State, action: ToolAction): State => {
    switch (action.type) {
        case 'SET_TOOL_CALL':
            return { toolCall: action.value, rag: action.value ? false : state.rag };
        case 'SET_RAG':
            return { rag: action.value, toolCall: action.value ? false : state.toolCall };
        default:
            return state;
    }
};

export default function TextInput() {
    const context = useContext(ChatContext);
    const [toolState, dispatchTool] = useReducer(toolReducer, { toolCall: false, rag: false });
    const [dbLoading, setDbLoading] = useState(false);
    const [files, setFiles] = useState<File[]>([]);

    const handleFileUpload = async (files: File[]) => {
        setFiles(files);
        console.log(files);
        
        // Automatically upload files to DB when selected
        if (files.length > 0) {
            setDbLoading(true);
            try {
                const result = await uploadFiles(files);

                if (result.error) {
                    throw new Error(result.error);
                }

                setFiles([]);
                addToast({ title: "Vector database created." });
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

        // Only proceed with generation if there's text input
        if (!context.input.trim()) return;

        const newUserMessage: Message = {
            role: "user",
            content: context.input,
        };
        const updatedMessages = [...context.messages, newUserMessage];
        context.dispatch({ type: 'SET_MESSAGES', messages: updatedMessages });
        let state = "tools"
        if (toolState.rag) {
            state = "rag"
        } else if (toolState.toolCall) {
            state = "tools"
        }

        try {
            await context.generateAnswer(updatedMessages, state);
            // Update history after generating answer
            if (context.activeChatId) {
                context.updateHistory(context.activeChatId);
            }
        } catch (error) {
            console.error("Error generating response:", error);
        }
    }, [context, context.activeChatId]);
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
                    <div className="z-10 flex flex-row gap-2">
                        <Button
                            className="font-semibold"
                            size="sm"
                            color={toolState.toolCall ? "primary" : "default"}
                            radius="full"
                            startContent={<IconTool />}
                            variant="flat"
                            onPress={() => dispatchTool({ type: 'SET_TOOL_CALL', value: !toolState.toolCall })}
                        >
                            Stocks Tool
                        </Button>
                        <Button
                            className="font-semibold"
                            size="sm"
                            color={toolState.rag ? "primary" : "default"}
                            radius="full"
                            startContent={<IconFileText />}
                            variant="flat"
                            onPress={() => dispatchTool({ type: 'SET_RAG', value: !toolState.rag })}
                        >
                            Document Chat
                        </Button>
                    </div>
                    <div className="z-10 flex flex-row gap-2">
                        <FileUpload state={!toolState.rag} onChange={handleFileUpload} isLoading={dbLoading} />
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