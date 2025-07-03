"use client";

import { Button } from "@heroui/react";
import React, { useCallback, useMemo, useContext, useState, useRef, useEffect } from "react";
import { Messages } from "./messages";
import ChatContext from "../contexts/chat-context";
import TextInput from "./text-input";
import { IconArrowUp, IconTool, IconFileText } from "@tabler/icons-react";
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
            {context.messages.length !== 0 ? (
                // Chat layout with messages and input
                <>
                    {/* Messages area - takes remaining space and scrolls */}
                    <div
                        ref={messagesEndRef}
                        className="flex-1 overflow-y-auto min-h-0"
                    >
                        <Messages messages={context.messages} />
                    </div>

                    {/* Input area - sticky at bottom */}
                    <div className="flex-shrink-0">
                        <TextInput />
                    </div>
                </>
            ) : (
                // Centered layout when no messages
                <div className="flex flex-1 flex-col items-center justify-center p-4">
                    <h1 className="max-w-4xl text-center py-5 font-semibold text-black text-xl md:text-2xl">
                        Ask any question about the document?
                    </h1>
                    <div className="flex flex-row xs:flex-col gap-4 py-10">
                        <InfoCard
                            title="Stock Tools"
                            description="Retrieve background information of a company given the stock ticker and closing price using MCP tools."
                            icon={<IconTool />}
                        />
                        <InfoCard title="Document Chat"
                            description="Upload a document and interact with it using smart question-answering powered by Retrieval-Augmented Generation (RAG)."
                            icon={<IconFileText />}
                        />
                    </div>
                    <TextInput />
                </div>
            )}
        </div>
    );
}