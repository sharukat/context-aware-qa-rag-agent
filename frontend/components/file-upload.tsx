import { cn } from "../lib/utils";
import React, { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@heroui/react";
import { IconPaperclip } from "@tabler/icons-react";

type Props = {
    state: boolean;
    onChange?: (files: File[]) => void | Promise<void>;
    isLoading?: boolean;
}

export default function FileUpload({ state, onChange, isLoading = false }: Props) {
    const [files, setFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (newFiles: File[]) => {
        setFiles((prevFiles) => [...prevFiles, ...newFiles]);
        if (onChange) {
            await onChange(newFiles);
        }
    };

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="flex items-center gap-3">
            {files.length > 0 && (
                <div className="flex flex-col gap-2 max-w-xs">
                    {files.map((file, idx) => (
                        <motion.div
                            key={"file" + idx}
                            layoutId={idx === 0 ? "file-upload" : "file-upload-" + idx}
                            className={cn(
                                "relative overflow-hidden z-40 bg-white flex flex-col items-start justify-start p-1 w-full rounded-xl",
                                "shadow-sm"
                            )}
                        >
                            <div className="flex justify-between w-full items-center gap-2">
                                <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    layout
                                    className="text-sm text-neutral-700 dark:text-neutral-300 truncate max-w-32"
                                >
                                    {file.name}
                                </motion.p>
                                <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    layout
                                    className="rounded-lg px-2 py-1 w-fit flex-shrink-0 text-xs text-neutral-600 shadow-input"
                                >
                                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                                </motion.p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
            
            <>
                <input
                    ref={fileInputRef}
                    id="file-upload-handle"
                    type="file"
                    onChange={(e) => handleFileChange(Array.from(e.target.files || []))}
                    className="hidden"
                />
                <Button
                    size="sm"
                    radius="full"
                    variant="bordered"
                    onPress={handleClick}
                    isLoading={isLoading}
                    // color="primary"
                    isIconOnly
                    isDisabled={state || isLoading}
                >
                    <IconPaperclip />
                </Button>
            </>
        </div>
    );
};
