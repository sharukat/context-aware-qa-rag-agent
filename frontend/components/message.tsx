import { cn } from "../lib/utils";
import { IconRobot, IconUser, IconExternalLink, IconBook, IconWorld, IconTool, IconSearch } from "@tabler/icons-react";
import { MemoizedMarkdown } from './memoized-markdown';
import { Reference } from '../lib/typings';
import { Chip } from "@heroui/react";

interface MessageProps {
    id: number;
    content: string;
    isUserMessage: boolean;
    references?: Reference[];
    service?: string;
}

const serviceIconMap: Record<string, { icon: JSX.Element; label: string }> = {
    rag: { icon: <IconBook className="size-4" />, label: "Document Chat" },
    search: { icon: <IconSearch className="size-4" />, label: "Web Search" },
    tools: { icon: <IconTool className="size-4" />, label: "Stock Tool" },
};

export const Message = ({ id, content, isUserMessage, references, service }: MessageProps) => {
    const styles = {
        container: isUserMessage ? "bg-gray-100" : "bg-white",
    };

    return (
        <div className={cn("relative p-3 rounded-3xl mb-2 w-full grid grid-cols-[48px_1fr] gap-5", styles.container)}>
            <div className={cn(
                "w-12 h-12 rounded-full border border-zinc-700 flex justify-center items-center bg-gray-700",
                "flex-shrink-0"
            )}>
                {isUserMessage ? (
                    <IconUser className="size-5 text-white" />
                ) : (
                    <IconRobot className="size-5 text-white" />
                )}
            </div>
            <div className="flex flex-col">
                <span className="text-base font-bold text-gray-900 flex items-center gap-3 mb-1">
                    {isUserMessage ? (
                        "You"
                    ) : (
                        <>
                            AI Assistant
                            {service && serviceIconMap[service] && (
                                <Chip 
                                color="primary" 
                                radius="full"
                                size="sm"
                                startContent={serviceIconMap[service].icon} 
                                variant="bordered">
                                    {serviceIconMap[service].label}
                                </Chip>
                            )}
                        </>
                    )}
                </span>
                <MemoizedMarkdown id={String(id)} content={content} />

                {references && references.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">References:</h4>
                        <div className={`grid gap-2 overflow-hidden`} style={{ gridTemplateColumns: `repeat(${Math.min(references.length, 3)}, 1fr)` }}>
                            {references.map((ref, index) =>
                                service === "rag" ? (
                                    <div
                                        key={index}
                                        className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 text-sm min-w-0"
                                    >
                                        <IconExternalLink className="size-4 flex-shrink-0 opacity-0" />
                                        <div className="flex flex-col min-w-0 flex-1">
                                            <span className="font-medium truncate text-xs">{ref.title}</span>
                                            <span className="text-xs text-gray-500 truncate">
                                                Page Number: {ref.citation}
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <a
                                        key={index}
                                        href={ref.citation}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors text-sm text-blue-600 hover:text-blue-800 min-w-0"
                                    >
                                        <IconExternalLink className="size-4 flex-shrink-0" />
                                        <div className="flex flex-col min-w-0 flex-1">
                                            <span className="font-medium truncate text-xs">{ref.title}</span>
                                            <span className="text-xs text-gray-500 truncate">{ref.citation}</span>
                                        </div>
                                    </a>
                                )
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};