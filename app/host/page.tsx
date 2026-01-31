'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Upload,
    Users,
    Play,
    Pause,
    Crown,
    Loader2,
    CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMeshBeatStore } from '@/lib/store';
import { peerManager } from '@/lib/peer-manager';
import { audioEngine } from '@/lib/audio-engine';
import { QRDisplay } from '../components/qr-display';
import { FileUpload } from '../components/file-upload';
import { AudioPlayer } from '../components/audio-player';
import { DeviceList, DeviceCount } from '../components/device-list';

type HostStep = 'initializing' | 'ready' | 'audio-loaded' | 'error';

export default function HostPage() {
    const router = useRouter();
    const [step, setStep] = useState<HostStep>('initializing');
    const [isLoadingAudio, setIsLoadingAudio] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const {
        peerId,
        status,
        connectedPeers,
        audioFile,
        playbackState,
        isMaster,
        setAudioFile,
        setPlaybackState
    } = useMeshBeatStore();

    // Initialize as host with timeout
    useEffect(() => {
        let mounted = true;
        let timeoutId: NodeJS.Timeout;

        const init = async () => {
            try {
                // Set a timeout for initialization
                timeoutId = setTimeout(() => {
                    if (mounted && step === 'initializing') {
                        console.error('PeerJS initialization timeout');
                        setStep('error');
                        setErrorMessage('Failed to connect to signaling server. Please check your internet connection and try again.');
                    }
                }, 10000); // 10 second timeout

                await audioEngine.initialize();
                console.log('[Host] Audio engine initialized');

                await peerManager.initAsHost();
                console.log('[Host] PeerJS initialized');

                clearTimeout(timeoutId);
                if (mounted) {
                    setStep('ready');
                }
            } catch (error) {
                console.error('Failed to initialize host:', error);
                clearTimeout(timeoutId);
                if (mounted) {
                    setStep('error');
                    setErrorMessage(error instanceof Error ? error.message : 'Failed to initialize room');
                }
            }
        };

        init();

        return () => {
            mounted = false;
            clearTimeout(timeoutId);
            peerManager.destroy();
        };
    }, []);

    // Simulate playback time progression
    useEffect(() => {
        if (playbackState !== 'playing') return;

        const interval = setInterval(() => {
            setCurrentTime(prev => {
                const duration = audioFile?.duration || 0;
                if (prev >= duration) {
                    setPlaybackState('stopped');
                    return 0;
                }
                return prev + 0.1;
            });
        }, 100);

        return () => clearInterval(interval);
    }, [playbackState, audioFile?.duration, setPlaybackState]);

    // Handle file upload
    const handleFileSelect = useCallback(async (file: File) => {
        setIsLoadingAudio(true);

        try {
            const { buffer, duration } = await audioEngine.loadFromFile(file);

            const audioFileData = {
                name: file.name,
                size: file.size,
                duration,
                buffer,
            };

            setAudioFile(audioFileData);
            setStep('audio-loaded');

            // Stream to all connected peers
            await peerManager.streamAudioToAll(buffer, file.name, duration);
        } catch (error) {
            console.error('Failed to load audio:', error);
        } finally {
            setIsLoadingAudio(false);
        }
    }, [setAudioFile]);

    // Playback controls
    const handlePlay = useCallback(() => {
        peerManager.broadcastPlay(currentTime);
        setCurrentTime(0);
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

    // Grant master control
    const handleGrantMaster = useCallback((targetPeerId: string) => {
        peerManager.grantMaster(targetPeerId);
    }, []);

    // Generate QR URL
    const qrUrl = peerId
        ? `${typeof window !== 'undefined' ? window.location.origin : ''}/guest/${peerId}`
        : '';

    return (
        <div className="min-h-screen px-6 py-8">
            {/* Header */}
            <motion.header
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between mb-8 max-w-6xl mx-auto"
            >
                <button
                    onClick={() => router.push('/')}
                    className="flex items-center gap-2 text-[--color-text-secondary] hover:text-[--color-text-primary] transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span className="hidden sm:inline">Back</span>
                </button>

                <div className="flex items-center gap-3">
                    <motion.div
                        animate={{
                            backgroundColor: status === 'connected'
                                ? 'rgba(34, 197, 94, 0.2)'
                                : 'rgba(245, 158, 11, 0.2)'
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[--color-border]"
                    >
                        <div className={cn(
                            'w-2 h-2 rounded-full',
                            status === 'connected' ? 'bg-[--color-success]' : 'bg-[--color-warning] animate-pulse'
                        )} />
                        <span className="text-sm">
                            {status === 'connected' ? 'Hosting' : 'Connecting...'}
                        </span>
                    </motion.div>

                    {connectedPeers.size > 0 && (
                        <DeviceCount count={connectedPeers.size} />
                    )}
                </div>
            </motion.header>

            {/* Main Content */}
            <div className="max-w-6xl mx-auto">
                {step === 'initializing' ? (
                    // Loading state
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center min-h-[60vh]"
                    >
                        <Loader2 className="w-12 h-12 text-[--color-accent] animate-spin mb-4" />
                        <p className="text-[--color-text-secondary]">Setting up your room...</p>
                    </motion.div>
                ) : step === 'error' ? (
                    // Error state
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center min-h-[60vh] text-center"
                    >
                        <div className="w-16 h-16 rounded-full bg-[--color-error]/10 flex items-center justify-center mb-6">
                            <span className="text-3xl">⚠️</span>
                        </div>
                        <h2 className="text-xl font-semibold text-[--color-text-primary] mb-2">
                            Connection Failed
                        </h2>
                        <p className="text-[--color-text-secondary] mb-6 max-w-md">
                            {errorMessage || 'Unable to create room. Please try again.'}
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="btn btn-primary"
                        >
                            Retry
                        </button>
                    </motion.div>
                ) : (
                    <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
                        {/* Left Column - QR & Upload */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="flex flex-col items-center"
                        >
                            {/* QR Code Section */}
                            <div className="mb-8">
                                <motion.h2
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="text-center text-lg font-medium text-[--color-text-secondary] mb-6"
                                >
                                    Scan to Join
                                </motion.h2>

                                <QRDisplay
                                    value={qrUrl}
                                    size={220}
                                    label={peerId || ''}
                                />
                            </div>

                            {/* File Upload Section */}
                            <div className="w-full max-w-md">
                                <h3 className="text-sm font-medium text-[--color-text-secondary] uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <Upload className="w-4 h-4" />
                                    Audio Source
                                </h3>

                                {!audioFile ? (
                                    <FileUpload
                                        onFileSelect={handleFileSelect}
                                        isLoading={isLoadingAudio}
                                    />
                                ) : (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="p-4 rounded-xl bg-[--color-surface] border border-[--color-border] flex items-center gap-4"
                                    >
                                        <div className="w-12 h-12 rounded-xl bg-[--color-success]/10 flex items-center justify-center">
                                            <CheckCircle2 className="w-6 h-6 text-[--color-success]" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-[--color-text-primary] truncate">
                                                {audioFile.name}
                                            </p>
                                            <p className="text-sm text-[--color-text-muted]">
                                                Ready to play
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => setAudioFile(null)}
                                            className="text-xs text-[--color-text-muted] hover:text-[--color-text-secondary]"
                                        >
                                            Change
                                        </button>
                                    </motion.div>
                                )}
                            </div>
                        </motion.div>

                        {/* Right Column - Player & Devices */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                            className="space-y-8"
                        >
                            {/* Audio Player */}
                            <div className="card">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-sm font-medium text-[--color-text-secondary] uppercase tracking-wider flex items-center gap-2">
                                        <Crown className="w-4 h-4 text-[--color-warning]" />
                                        Playback Control
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

                            {/* Connected Devices */}
                            <div className="card">
                                <DeviceList
                                    peers={connectedPeers}
                                    onGrantMaster={handleGrantMaster}
                                />
                            </div>
                        </motion.div>
                    </div>
                )}
            </div>
        </div>
    );
}
