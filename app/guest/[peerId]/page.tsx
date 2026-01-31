'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Loader2,
    Wifi,
    WifiOff,
    Crown,
    Clock,
    Volume2,
    AlertTriangle
} from 'lucide-react';
import { cn, formatLatency } from '@/lib/utils';
import { useMeshBeatStore } from '@/lib/store';
import { peerManager } from '@/lib/peer-manager';
import { audioEngine } from '@/lib/audio-engine';
import { AudioPlayer } from '../../components/audio-player';

type GuestStatus = 'connecting' | 'connected' | 'syncing' | 'ready' | 'error';

interface PageProps {
    params: Promise<{ peerId: string }>;
}

export default function GuestPage({ params }: PageProps) {
    const { peerId: hostPeerId } = use(params);
    const router = useRouter();
    const [guestStatus, setGuestStatus] = useState<GuestStatus>('connecting');
    const [currentTime, setCurrentTime] = useState(0);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const {
        peerId,
        status,
        audioFile,
        playbackState,
        clockOffset,
        isMaster,
        setIsMaster
    } = useMeshBeatStore();

    // Connect to host
    useEffect(() => {
        let mounted = true;

        const connect = async () => {
            try {
                await audioEngine.initialize();
                await peerManager.initAsGuest(hostPeerId);

                if (mounted) {
                    setGuestStatus('connected');

                    // Wait a bit for sync to stabilize
                    setTimeout(() => {
                        if (mounted) setGuestStatus('ready');
                    }, 2000);
                }
            } catch (error) {
                console.error('Failed to connect:', error);
                if (mounted) {
                    setGuestStatus('error');
                    setErrorMessage('Could not connect to room. It may no longer exist.');
                }
            }
        };

        connect();

        return () => {
            mounted = false;
            peerManager.destroy();
        };
    }, [hostPeerId]);

    // Simulate playback time
    useEffect(() => {
        if (playbackState !== 'playing') return;

        const interval = setInterval(() => {
            setCurrentTime(prev => {
                const duration = audioFile?.duration || 0;
                if (prev >= duration) return 0;
                return prev + 0.1;
            });
        }, 100);

        return () => clearInterval(interval);
    }, [playbackState, audioFile?.duration]);

    // Request master control
    const handleRequestMaster = useCallback(() => {
        peerManager.requestMaster();
    }, []);

    // Playback controls (if master)
    const handlePlay = useCallback(() => {
        peerManager.broadcastPlay(currentTime);
    }, [currentTime]);

    const handlePause = useCallback(() => {
        peerManager.broadcastPause();
    }, []);

    const handleStop = useCallback(() => {
        peerManager.broadcastStop();
        setCurrentTime(0);
    }, []);

    const handleSeek = useCallback((time: number) => {
        setCurrentTime(time);
        if (playbackState === 'playing') {
            peerManager.broadcastPlay(time);
        }
    }, [playbackState]);

    // Status indicator component
    const StatusIndicator = () => {
        const statusConfig = {
            connecting: { icon: Loader2, color: 'text-[--color-warning]', text: 'Connecting...', spin: true },
            connected: { icon: Wifi, color: 'text-[--color-success]', text: 'Connected', spin: false },
            syncing: { icon: Clock, color: 'text-[--color-accent]', text: 'Syncing clocks...', spin: false },
            ready: { icon: Volume2, color: 'text-[--color-success]', text: 'Ready to play', spin: false },
            error: { icon: AlertTriangle, color: 'text-[--color-error]', text: 'Connection failed', spin: false },
        };

        const config = statusConfig[guestStatus];
        const Icon = config.icon;

        return (
            <div className="flex items-center gap-2">
                <Icon className={cn('w-4 h-4', config.color, config.spin && 'animate-spin')} />
                <span className={cn('text-sm', config.color)}>{config.text}</span>
            </div>
        );
    };

    if (guestStatus === 'error') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center px-6">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center max-w-md"
                >
                    <div className="w-20 h-20 rounded-2xl bg-[--color-error]/10 flex items-center justify-center mx-auto mb-6">
                        <WifiOff className="w-10 h-10 text-[--color-error]" />
                    </div>
                    <h1 className="text-2xl font-bold text-[--color-text-primary] mb-2">
                        Connection Failed
                    </h1>
                    <p className="text-[--color-text-secondary] mb-8">
                        {errorMessage}
                    </p>
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => router.push('/join')}
                        className="btn btn-primary"
                    >
                        Try Again
                    </motion.button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen px-6 py-8">
            {/* Header */}
            <motion.header
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between mb-8 max-w-2xl mx-auto"
            >
                <button
                    onClick={() => router.push('/join')}
                    className="flex items-center gap-2 text-[--color-text-secondary] hover:text-[--color-text-primary] transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span className="hidden sm:inline">Leave</span>
                </button>

                <StatusIndicator />
            </motion.header>

            {/* Main Content */}
            <div className="max-w-2xl mx-auto">
                {guestStatus === 'connecting' ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center min-h-[60vh]"
                    >
                        <div className="relative mb-8">
                            {/* Animated connection rings */}
                            <motion.div
                                className="absolute inset-0 rounded-full border-2 border-[--color-accent]"
                                animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                            />
                            <motion.div
                                className="absolute inset-0 rounded-full border-2 border-[--color-accent]"
                                animate={{ scale: [1, 1.8], opacity: [0.3, 0] }}
                                transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
                            />
                            <div className="w-20 h-20 rounded-full bg-[--color-surface] border border-[--color-border] flex items-center justify-center">
                                <Wifi className="w-8 h-8 text-[--color-accent]" />
                            </div>
                        </div>
                        <h2 className="text-xl font-semibold text-[--color-text-primary] mb-2">
                            Connecting to Room
                        </h2>
                        <p className="text-[--color-text-muted] font-mono">
                            {hostPeerId}
                        </p>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                    >
                        {/* Room Info Card */}
                        <div className="card">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h2 className="text-lg font-semibold text-[--color-text-primary]">
                                        Connected to Room
                                    </h2>
                                    <p className="text-sm text-[--color-text-muted] font-mono">
                                        {hostPeerId}
                                    </p>
                                </div>
                                <div className="flex items-center gap-4">
                                    {/* Latency indicator */}
                                    <div className="flex flex-col items-end">
                                        <span className="text-xs text-[--color-text-muted]">Latency</span>
                                        <span className={cn(
                                            'text-sm font-mono',
                                            Math.abs(clockOffset) < 50 ? 'text-[--color-success]' :
                                                Math.abs(clockOffset) < 100 ? 'text-[--color-warning]' : 'text-[--color-error]'
                                        )}>
                                            {formatLatency(Math.abs(clockOffset))}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Clock sync visualization */}
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-[--color-surface-elevated]">
                                <Clock className="w-5 h-5 text-[--color-accent]" />
                                <div className="flex-1">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-[--color-text-secondary]">Clock Sync</span>
                                        <span className={cn(
                                            'font-mono',
                                            Math.abs(clockOffset) < 50 ? 'text-[--color-success]' : 'text-[--color-warning]'
                                        )}>
                                            {clockOffset >= 0 ? '+' : ''}{clockOffset.toFixed(1)}ms
                                        </span>
                                    </div>
                                    <div className="mt-2 h-1 rounded-full bg-[--color-surface-hover] overflow-hidden">
                                        <motion.div
                                            className="h-full bg-gradient-to-r from-[--color-gradient-start] to-[--color-gradient-mid]"
                                            animate={{ width: ['0%', '100%'] }}
                                            transition={{ duration: 2, repeat: Infinity }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Audio Player Card */}
                        <div className="card">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-sm font-medium text-[--color-text-secondary] uppercase tracking-wider">
                                    Now Playing
                                </h3>
                                {isMaster && (
                                    <span className="badge">
                                        <Crown className="w-3 h-3" />
                                        Master
                                    </span>
                                )}
                            </div>

                            <AudioPlayer
                                fileName={audioFile?.name}
                                duration={audioFile?.duration || 0}
                                currentTime={currentTime}
                                isPlaying={playbackState === 'playing'}
                                isMaster={isMaster}
                                onPlay={handlePlay}
                                onPause={handlePause}
                                onStop={handleStop}
                                onSeek={handleSeek}
                            />
                        </div>

                        {/* Request Master Button (if not master) */}
                        {!isMaster && audioFile && (
                            <motion.button
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.99 }}
                                onClick={handleRequestMaster}
                                className={cn(
                                    'w-full p-4 rounded-xl',
                                    'bg-[--color-surface] border border-[--color-border]',
                                    'hover:border-[--color-warning]/50 hover:bg-[--color-surface-hover]',
                                    'transition-all duration-300',
                                    'flex items-center justify-center gap-3'
                                )}
                            >
                                <Crown className="w-5 h-5 text-[--color-warning]" />
                                <span className="font-medium">Request Playback Control</span>
                            </motion.button>
                        )}
                    </motion.div>
                )}
            </div>
        </div>
    );
}
