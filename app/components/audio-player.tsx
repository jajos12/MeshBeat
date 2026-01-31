'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Play,
    Pause,
    Square,
    Volume2,
    VolumeX,
    SkipBack,
    Music,
    Clock
} from 'lucide-react';
import { cn, formatTime } from '@/lib/utils';

interface AudioPlayerProps {
    fileName?: string;
    duration: number;
    currentTime: number;
    isPlaying: boolean;
    isMaster: boolean;
    onPlay: () => void;
    onPause: () => void;
    onStop: () => void;
    onSeek?: (time: number) => void;
}

export function AudioPlayer({
    fileName,
    duration,
    currentTime,
    isPlaying,
    isMaster,
    onPlay,
    onPause,
    onStop,
    onSeek,
}: AudioPlayerProps) {
    const [localProgress, setLocalProgress] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const progressRef = useRef<HTMLDivElement>(null);

    // Animated bars for visualizer
    const bars = Array.from({ length: 40 }, (_, i) => i);

    useEffect(() => {
        if (!isDragging && duration > 0) {
            setLocalProgress((currentTime / duration) * 100);
        }
    }, [currentTime, duration, isDragging]);

    const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!progressRef.current || !onSeek || !isMaster) return;

        const rect = progressRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
        const seekTime = (percentage / 100) * duration;

        setLocalProgress(percentage);
        onSeek(seekTime);
    }, [duration, onSeek, isMaster]);

    if (!fileName) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-12 text-center"
            >
                <div className="w-20 h-20 rounded-2xl bg-[--color-surface-elevated] flex items-center justify-center mb-4">
                    <Music className="w-10 h-10 text-[--color-text-muted]" />
                </div>
                <p className="text-[--color-text-secondary] font-medium">
                    No audio loaded
                </p>
                <p className="text-sm text-[--color-text-muted] mt-1">
                    Upload a file to get started
                </p>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full"
        >
            {/* Audio Visualizer */}
            <div className="relative h-24 mb-6 flex items-end justify-center gap-[2px] overflow-hidden">
                {bars.map((i) => {
                    const baseHeight = 20 + Math.sin(i * 0.5) * 15;
                    const animatedHeight = isPlaying
                        ? baseHeight + Math.random() * 60
                        : baseHeight;

                    return (
                        <motion.div
                            key={i}
                            className="w-1.5 rounded-full"
                            style={{
                                background: `linear-gradient(to top, var(--color-gradient-start), var(--color-gradient-mid))`,
                            }}
                            animate={{
                                height: isPlaying ? [baseHeight, animatedHeight, baseHeight] : baseHeight,
                                opacity: isPlaying ? [0.5, 1, 0.5] : 0.3,
                            }}
                            transition={{
                                duration: 0.3 + Math.random() * 0.2,
                                repeat: isPlaying ? Infinity : 0,
                                repeatType: 'reverse',
                            }}
                        />
                    );
                })}

                {/* Gradient overlay */}
                <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[--color-background] to-transparent" />
            </div>

            {/* Track info */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-[--color-text-primary] truncate">
                        {fileName}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                        <Clock className="w-3 h-3 text-[--color-text-muted]" />
                        <span className="text-xs text-[--color-text-muted]">
                            {formatTime(duration)}
                        </span>
                        {!isMaster && (
                            <span className="badge text-[10px]">Listening</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Progress bar */}
            <div
                ref={progressRef}
                className={cn(
                    'relative h-2 rounded-full bg-[--color-surface-hover] mb-4 overflow-hidden',
                    isMaster && 'cursor-pointer'
                )}
                onClick={handleProgressClick}
            >
                {/* Buffered/loaded indicator */}
                <div className="absolute inset-0 bg-[--color-surface-elevated]" />

                {/* Progress */}
                <motion.div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{
                        background: 'linear-gradient(90deg, var(--color-gradient-start), var(--color-gradient-mid))',
                        width: `${localProgress}%`,
                    }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />

                {/* Progress handle */}
                {isMaster && (
                    <motion.div
                        className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-lg"
                        style={{ left: `calc(${localProgress}% - 8px)` }}
                        whileHover={{ scale: 1.2 }}
                    />
                )}

                {/* Glow effect */}
                <div
                    className="absolute inset-y-0 left-0 opacity-50 blur-sm"
                    style={{
                        background: 'linear-gradient(90deg, var(--color-accent-glow), var(--color-accent-glow-purple))',
                        width: `${localProgress}%`,
                    }}
                />
            </div>

            {/* Time display */}
            <div className="flex justify-between text-xs text-[--color-text-muted] font-mono mb-6">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4">
                {isMaster ? (
                    <>
                        {/* Stop button */}
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={onStop}
                            className={cn(
                                'w-12 h-12 rounded-full flex items-center justify-center',
                                'bg-[--color-surface-elevated] border border-[--color-border]',
                                'hover:border-[--color-border-hover] hover:bg-[--color-surface-hover]',
                                'transition-all duration-200'
                            )}
                        >
                            <Square className="w-5 h-5 text-[--color-text-secondary]" />
                        </motion.button>

                        {/* Play/Pause button */}
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={isPlaying ? onPause : onPlay}
                            className={cn(
                                'relative w-16 h-16 rounded-full flex items-center justify-center',
                                'text-black font-semibold',
                                isPlaying ? 'glow-purple' : 'glow-cyan'
                            )}
                            style={{
                                background: isPlaying
                                    ? 'linear-gradient(135deg, var(--color-gradient-mid), var(--color-gradient-end))'
                                    : 'linear-gradient(135deg, var(--color-gradient-start), var(--color-gradient-mid))',
                            }}
                        >
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={isPlaying ? 'pause' : 'play'}
                                    initial={{ scale: 0, rotate: -90 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    exit={{ scale: 0, rotate: 90 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    {isPlaying ? (
                                        <Pause className="w-7 h-7" fill="currentColor" />
                                    ) : (
                                        <Play className="w-7 h-7 ml-1" fill="currentColor" />
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        </motion.button>

                        {/* Restart button */}
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => onSeek?.(0)}
                            className={cn(
                                'w-12 h-12 rounded-full flex items-center justify-center',
                                'bg-[--color-surface-elevated] border border-[--color-border]',
                                'hover:border-[--color-border-hover] hover:bg-[--color-surface-hover]',
                                'transition-all duration-200'
                            )}
                        >
                            <SkipBack className="w-5 h-5 text-[--color-text-secondary]" />
                        </motion.button>
                    </>
                ) : (
                    // Guest view - just shows status
                    <div className="flex flex-col items-center gap-2">
                        <motion.div
                            animate={isPlaying ? { scale: [1, 1.1, 1] } : {}}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                            className={cn(
                                'w-16 h-16 rounded-full flex items-center justify-center',
                                isPlaying ? 'bg-[--color-success]/20' : 'bg-[--color-surface-elevated]'
                            )}
                        >
                            {isPlaying ? (
                                <Volume2 className="w-7 h-7 text-[--color-success]" />
                            ) : (
                                <VolumeX className="w-7 h-7 text-[--color-text-muted]" />
                            )}
                        </motion.div>
                        <span className="text-sm text-[--color-text-secondary]">
                            {isPlaying ? 'Playing in sync' : 'Waiting for host'}
                        </span>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
