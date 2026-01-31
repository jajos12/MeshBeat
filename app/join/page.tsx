'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Camera,
    Keyboard,
    Loader2,
    Wifi,
    WifiOff,
    AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

type JoinMode = 'choice' | 'camera' | 'manual';

export default function JoinPage() {
    const router = useRouter();
    const [mode, setMode] = useState<JoinMode>('choice');
    const [manualCode, setManualCode] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const scannerRef = useRef<any>(null);

    // Initialize camera for QR scanning
    useEffect(() => {
        if (mode !== 'camera') return;

        let html5QrCode: any = null;

        const initScanner = async () => {
            try {
                const { Html5Qrcode } = await import('html5-qrcode');
                html5QrCode = new Html5Qrcode('qr-reader');
                scannerRef.current = html5QrCode;

                setIsScanning(true);

                await html5QrCode.start(
                    { facingMode: 'environment' },
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 },
                    },
                    (decodedText: string) => {
                        // Handle successful scan
                        handleQRCode(decodedText);
                    },
                    () => {
                        // Ignore errors during scanning
                    }
                );
            } catch (err) {
                console.error('Camera error:', err);
                setError('Could not access camera. Please use manual entry.');
                setMode('manual');
            }
        };

        initScanner();

        return () => {
            if (html5QrCode) {
                html5QrCode.stop().catch(console.error);
            }
        };
    }, [mode]);

    // Handle QR code/manual entry
    const handleQRCode = useCallback((data: string) => {
        try {
            // Extract peer ID from URL or use directly
            const url = new URL(data);
            const pathParts = url.pathname.split('/');
            const peerId = pathParts[pathParts.length - 1];

            if (peerId && peerId.startsWith('MB-')) {
                router.push(`/guest/${peerId}`);
            } else {
                setError('Invalid room code');
            }
        } catch {
            // Not a URL, try as direct peer ID
            if (data.startsWith('MB-')) {
                router.push(`/guest/${data}`);
            } else {
                setError('Invalid room code');
            }
        }
    }, [router]);

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const code = manualCode.toUpperCase().trim();

        if (!code) {
            setError('Please enter a room code');
            return;
        }

        // Add MB- prefix if not present
        const peerId = code.startsWith('MB-') ? code : `MB-${code}`;
        router.push(`/guest/${peerId}`);
    };

    return (
        <div className="min-h-screen px-6 py-8 flex flex-col">
            {/* Header */}
            <motion.header
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between mb-8 max-w-xl mx-auto w-full"
            >
                <button
                    onClick={() => mode === 'choice' ? router.push('/') : setMode('choice')}
                    className="flex items-center gap-2 text-[--color-text-secondary] hover:text-[--color-text-primary] transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span className="hidden sm:inline">Back</span>
                </button>

                <h1 className="text-lg font-semibold text-gradient">Join Room</h1>

                <div className="w-20" /> {/* Spacer */}
            </motion.header>

            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full">
                <AnimatePresence mode="wait">
                    {mode === 'choice' && (
                        <motion.div
                            key="choice"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="w-full space-y-4"
                        >
                            <p className="text-center text-[--color-text-secondary] mb-8">
                                Choose how to join the room
                            </p>

                            {/* Scan QR Option */}
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setMode('camera')}
                                className={cn(
                                    'w-full p-6 rounded-2xl text-left',
                                    'bg-[--color-surface] border border-[--color-border]',
                                    'hover:border-[--color-accent] hover:bg-[--color-surface-hover]',
                                    'transition-all duration-300 group'
                                )}
                            >
                                <div className="flex items-start gap-4">
                                    <div className={cn(
                                        'w-14 h-14 rounded-xl flex items-center justify-center',
                                        'bg-gradient-to-br from-[--color-gradient-start] to-[--color-gradient-mid]'
                                    )}>
                                        <Camera className="w-6 h-6 text-black" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-[--color-text-primary] mb-1">
                                            Scan QR Code
                                        </h3>
                                        <p className="text-sm text-[--color-text-muted]">
                                            Use your camera to scan the host's QR code
                                        </p>
                                    </div>
                                </div>
                            </motion.button>

                            {/* Manual Entry Option */}
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setMode('manual')}
                                className={cn(
                                    'w-full p-6 rounded-2xl text-left',
                                    'bg-[--color-surface] border border-[--color-border]',
                                    'hover:border-[--color-border-hover] hover:bg-[--color-surface-hover]',
                                    'transition-all duration-300 group'
                                )}
                            >
                                <div className="flex items-start gap-4">
                                    <div className={cn(
                                        'w-14 h-14 rounded-xl flex items-center justify-center',
                                        'bg-[--color-surface-elevated] border border-[--color-border]',
                                        'group-hover:border-[--color-accent]/30'
                                    )}>
                                        <Keyboard className="w-6 h-6 text-[--color-accent]" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-[--color-text-primary] mb-1">
                                            Enter Room Code
                                        </h3>
                                        <p className="text-sm text-[--color-text-muted]">
                                            Type the 6-character room code manually
                                        </p>
                                    </div>
                                </div>
                            </motion.button>
                        </motion.div>
                    )}

                    {mode === 'camera' && (
                        <motion.div
                            key="camera"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="w-full"
                        >
                            <div className="relative rounded-2xl overflow-hidden border-2 border-[--color-border] bg-black">
                                {/* Scanner container */}
                                <div id="qr-reader" className="w-full aspect-square" />

                                {/* Scanning overlay */}
                                {isScanning && (
                                    <div className="absolute inset-0 pointer-events-none">
                                        {/* Corner markers */}
                                        <div className="absolute top-8 left-8 w-16 h-16 border-l-4 border-t-4 border-[--color-accent] rounded-tl-lg" />
                                        <div className="absolute top-8 right-8 w-16 h-16 border-r-4 border-t-4 border-[--color-accent] rounded-tr-lg" />
                                        <div className="absolute bottom-8 left-8 w-16 h-16 border-l-4 border-b-4 border-[--color-accent] rounded-bl-lg" />
                                        <div className="absolute bottom-8 right-8 w-16 h-16 border-r-4 border-b-4 border-[--color-accent] rounded-br-lg" />

                                        {/* Scanning line */}
                                        <motion.div
                                            className="absolute left-8 right-8 h-0.5 bg-gradient-to-r from-transparent via-[--color-accent] to-transparent"
                                            animate={{ top: ['15%', '85%', '15%'] }}
                                            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                                        />
                                    </div>
                                )}

                                {!isScanning && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                        <Loader2 className="w-8 h-8 text-[--color-accent] animate-spin" />
                                    </div>
                                )}
                            </div>

                            <p className="text-center text-[--color-text-muted] mt-4 text-sm">
                                Point your camera at the QR code on the host's screen
                            </p>

                            <button
                                onClick={() => setMode('manual')}
                                className="w-full mt-6 py-3 text-[--color-text-secondary] text-sm hover:text-[--color-text-primary]"
                            >
                                Enter code manually instead
                            </button>
                        </motion.div>
                    )}

                    {mode === 'manual' && (
                        <motion.div
                            key="manual"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="w-full"
                        >
                            <form onSubmit={handleManualSubmit} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-[--color-text-secondary] mb-2">
                                        Room Code
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[--color-text-muted] font-mono">
                                            MB-
                                        </span>
                                        <input
                                            type="text"
                                            value={manualCode}
                                            onChange={(e) => {
                                                setManualCode(e.target.value.toUpperCase().slice(0, 6));
                                                setError(null);
                                            }}
                                            placeholder="XXXXXX"
                                            autoFocus
                                            className={cn(
                                                'input pl-14 text-center text-2xl font-mono tracking-[0.3em] uppercase',
                                                error && 'border-[--color-error]'
                                            )}
                                            maxLength={6}
                                        />
                                    </div>
                                    {error && (
                                        <motion.p
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="flex items-center gap-2 mt-2 text-sm text-[--color-error]"
                                        >
                                            <AlertCircle className="w-4 h-4" />
                                            {error}
                                        </motion.p>
                                    )}
                                </div>

                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    type="submit"
                                    disabled={manualCode.length < 6}
                                    className={cn(
                                        'btn btn-primary w-full py-4 text-lg',
                                        manualCode.length < 6 && 'opacity-50 cursor-not-allowed'
                                    )}
                                >
                                    <Wifi className="w-5 h-5" />
                                    Connect
                                </motion.button>
                            </form>

                            <button
                                onClick={() => setMode('camera')}
                                className="w-full mt-6 py-3 text-[--color-text-secondary] text-sm hover:text-[--color-text-primary]"
                            >
                                Scan QR code instead
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
