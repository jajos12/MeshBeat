'use client';

import { useCallback } from 'react';
import { motion } from 'framer-motion';
import { Upload, Music2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploadProps {
    onFileSelect: (file: File) => void;
    isLoading?: boolean;
    accept?: string;
    className?: string;
}

export function FileUpload({
    onFileSelect,
    isLoading = false,
    accept = 'audio/*',
    className
}: FileUploadProps) {
    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('audio/')) {
            onFileSelect(file);
        }
    }, [onFileSelect]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onFileSelect(file);
        }
    }, [onFileSelect]);

    return (
        <motion.label
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className={cn(
                'relative flex flex-col items-center justify-center w-full h-48',
                'rounded-2xl cursor-pointer transition-all duration-300',
                'border-2 border-dashed border-[--color-border]',
                'hover:border-[--color-accent] hover:bg-[--color-surface-hover]',
                'group',
                isLoading && 'pointer-events-none opacity-60',
                className
            )}
        >
            {/* Glow effect on hover */}
            <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{ boxShadow: '0 0 40px rgba(0, 212, 255, 0.1)' }} />

            <input
                type="file"
                accept={accept}
                onChange={handleChange}
                className="hidden"
                disabled={isLoading}
            />

            <motion.div
                animate={isLoading ? { rotate: 360 } : { rotate: 0 }}
                transition={isLoading ? { repeat: Infinity, duration: 2, ease: 'linear' } : {}}
                className="mb-4"
            >
                {isLoading ? (
                    <Loader2 className="w-12 h-12 text-[--color-accent]" />
                ) : (
                    <div className="relative">
                        <Music2 className="w-12 h-12 text-[--color-text-muted] group-hover:text-[--color-accent] transition-colors" />
                        <Upload className="w-5 h-5 absolute -bottom-1 -right-1 text-[--color-text-muted] group-hover:text-[--color-accent] transition-colors" />
                    </div>
                )}
            </motion.div>

            <p className="text-[--color-text-secondary] font-medium">
                {isLoading ? 'Loading audio...' : 'Drop audio file or click to browse'}
            </p>
            <p className="text-sm text-[--color-text-muted] mt-1">
                MP3, WAV, FLAC, OGG supported
            </p>
        </motion.label>
    );
}
