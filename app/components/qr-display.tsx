'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import QRCode from 'qrcode';

interface QRDisplayProps {
    value: string;
    size?: number;
    label?: string;
}

export function QRDisplay({ value, size = 200, label }: QRDisplayProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        if (!canvasRef.current || !value) return;

        QRCode.toCanvas(canvasRef.current, value, {
            width: size,
            margin: 2,
            color: {
                dark: '#ffffff',
                light: '#00000000',
            },
            errorCorrectionLevel: 'M',
        }).then(() => {
            setIsReady(true);
        }).catch(console.error);
    }, [value, size]);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="relative flex flex-col items-center"
        >
            {/* Outer glow container */}
            <div className="relative p-1 rounded-3xl border-gradient border-gradient-animated">
                {/* Inner container with glassmorphism */}
                <div className="relative p-6 rounded-[22px] glass-strong overflow-hidden">
                    {/* Animated gradient background */}
                    <motion.div
                        className="absolute inset-0 opacity-20"
                        style={{
                            background: 'linear-gradient(135deg, var(--color-gradient-start), var(--color-gradient-mid), var(--color-gradient-end))',
                        }}
                        animate={{
                            backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'],
                        }}
                        transition={{
                            duration: 10,
                            ease: 'linear',
                            repeat: Infinity,
                        }}
                    />

                    {/* Grid pattern overlay */}
                    <div
                        className="absolute inset-0 opacity-5"
                        style={{
                            backgroundImage: `
                linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
              `,
                            backgroundSize: '20px 20px',
                        }}
                    />

                    {/* QR Code */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: isReady ? 1 : 0 }}
                        className="relative z-10"
                    >
                        <canvas
                            ref={canvasRef}
                            className="rounded-lg"
                            style={{ width: size, height: size }}
                        />
                    </motion.div>

                    {/* Loading state */}
                    {!isReady && (
                        <div
                            className="flex items-center justify-center rounded-lg bg-[--color-surface]"
                            style={{ width: size, height: size }}
                        >
                            <div className="w-8 h-8 border-2 border-[--color-accent] border-t-transparent rounded-full animate-spin" />
                        </div>
                    )}
                </div>
            </div>

            {/* Label/Room Code below QR */}
            {label && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mt-6 flex flex-col items-center"
                >
                    <span className="text-xs text-[--color-text-muted] uppercase tracking-wider mb-2">
                        Room Code
                    </span>
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[--color-surface] border border-[--color-border]">
                        <span className="text-lg font-mono font-semibold text-gradient tracking-widest">
                            {label}
                        </span>
                    </div>
                </motion.div>
            )}

            {/* Pulsing glow effect */}
            <motion.div
                className="absolute inset-0 -z-10 rounded-3xl"
                animate={{
                    boxShadow: [
                        '0 0 20px rgba(0, 212, 255, 0.2), 0 0 40px rgba(168, 85, 247, 0.1)',
                        '0 0 40px rgba(0, 212, 255, 0.3), 0 0 60px rgba(168, 85, 247, 0.2)',
                        '0 0 20px rgba(0, 212, 255, 0.2), 0 0 40px rgba(168, 85, 247, 0.1)',
                    ],
                }}
                transition={{
                    duration: 3,
                    ease: 'easeInOut',
                    repeat: Infinity,
                }}
            />
        </motion.div>
    );
}
