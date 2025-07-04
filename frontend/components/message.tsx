import {cn} from "../lib/utils";
import {IconRobot, IconUser, IconExternalLink} from "@tabler/icons-react";
import { MemoizedMarkdown } from './memoized-markdown';
import { Reference } from '../lib/typings';

interface MessageProps {
    id: number;
    content: string;
    isUserMessage: boolean;
    references?: Reference[];
}

export const Message = ({id, content, isUserMessage, references}: MessageProps) => {
    const styles = {
        container: isUserMessage ? "bg-gray-100" : "bg-white",
    };

    return (
        <div className={cn("p-3 rounded-3xl mb-2 w-full grid grid-cols-[48px_1fr] gap-5", styles.container)}>
            <div className={cn(
                "w-12 h-12 rounded-full border border-zinc-700 flex justify-center items-center bg-gray-700",
                "flex-shrink-0"
            )}>
                {isUserMessage ? (
                    <IconUser className="size-5 text-white"/>
                ) : (
                    <IconRobot className="size-5 text-white"/>
                )}
            </div>
            <div className="flex flex-col">
                <span className="text-sm font-bold text-gray-900">
                    {isUserMessage ? "You" : "AI Assistant"}
                </span>
                <MemoizedMarkdown id={String(id)} content={content} />
                
                {references && references.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">References:</h4>
                        <div className={`grid gap-2 overflow-hidden`} style={{ gridTemplateColumns: `repeat(${Math.min(references.length, 3)}, 1fr)` }}>
                            {references.map((ref, index) => (
                                <a
                                    key={index}
                                    href={ref.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors text-sm text-blue-600 hover:text-blue-800 min-w-0"
                                >
                                    <IconExternalLink className="size-4 flex-shrink-0" />
                                    <div className="flex flex-col min-w-0 flex-1">
                                        <span className="font-medium truncate text-xs">{ref.title}</span>
                                        <span className="text-xs text-gray-500 truncate">{ref.url}</span>
                                    </div>
                                </a>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};