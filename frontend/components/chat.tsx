"use client";

import React, { useContext, useRef, useEffect } from "react";
import { Messages } from "./messages";
import ChatContext from "../contexts/chat-context";
import TextInput from "./text-input";
import { IconTool, IconFileText } from "@tabler/icons-react";
import InfoCard from "./info-card";

export const Chat = () => {
    const context = useContext(ChatContext);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight;
        }
    }, [context.messages.length]);

    return (
        <div className="flex flex-col h-screen w-full max-w-[95%] mx-auto bg-white p-5 rounded-l-3xl">
            <div className="flex flex-col w-full max-w-5xl flex-1 h-full mx-auto">
                {context.messages.length !== 0 ? (
                    // Chat layout with messages and input
                    <div className="flex flex-col flex-1 h-full w-full p-4">
                        {/* Messages area - takes remaining space and scrolls */}
                        <div
                            ref={messagesEndRef}
                            className="flex-1 overflow-y-auto min-h-0 w-full"
                        >
                            <Messages messages={context.messages} />
                        </div>

                        {/* Input area - sticky at bottom */}
                        <div className="flex-shrink-0 w-full">
                            <TextInput />
                        </div>
                    </div>
                ) : (
                    // Centered layout when no messages
                    <div className="flex flex-1 flex-col items-center justify-center p-4 w-full">
                        <h1 className="max-w-4xl text-center py-5 font-semibold text-black text-xl md:text-2xl">
                            Ask any question about the document?
                        </h1>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-10">
                            <InfoCard
                                title="Stock Tools"
                                description="Retrieve background information of a company given the stock ticker and closing price using MCP tools."
                                icon={<IconTool />}
                            />
                            <InfoCard title="Document Chat"
                                description="Upload a document and interact with it using smart question-answering powered by Retrieval-Augmented Generation (RAG)."
                                icon={<IconFileText />}
                            />
                            <InfoCard title="Web Search"
                                description="Web Search retrieves data directly from the web or acts as a fallback in Document Chat when the document lacks relevant content."
                                icon={<IconFileText />}
                            />
                        </div>
                        <TextInput />
                    </div>
                )}
            </div>
        </div>
    );
}