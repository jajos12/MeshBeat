'use client';

import { motion } from 'framer-motion';
import {
    Smartphone,
    Wifi,
    WifiOff,
    Crown,
    Signal,
    SignalLow,
    SignalMedium,
    SignalHigh,
    User
} from 'lucide-react';
import { cn, formatLatency } from '@/lib/utils';
import type { ConnectedPeer, ConnectionStatus } from '@/lib/store';

interface DeviceListProps {
    peers: Map<string, ConnectedPeer>;
    onGrantMaster?: (peerId: string) => void;
}

function getSignalIcon(latency: number) {
    if (latency < 50) return SignalHigh;
    if (latency < 100) return SignalMedium;
    if (latency < 200) return SignalLow;
    return Signal;
}

function getStatusColor(status: ConnectionStatus): string {
    switch (status) {
        case 'connected': return 'text-[--color-success]';
        case 'connecting': return 'text-[--color-warning]';
        case 'disconnected': return 'text-[--color-text-muted]';
        case 'error': return 'text-[--color-error]';
        default: return 'text-[--color-text-muted]';
    }
}

function getStatusBg(status: ConnectionStatus): string {
    switch (status) {
        case 'connected': return 'bg-[--color-success]';
        case 'connecting': return 'bg-[--color-warning]';
        case 'disconnected': return 'bg-[--color-text-muted]';
        case 'error': return 'bg-[--color-error]';
        default: return 'bg-[--color-text-muted]';
    }
}

export function DeviceList({ peers, onGrantMaster }: DeviceListProps) {
    const peerArray = Array.from(peers.values());

    if (peerArray.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-12 text-center"
            >
                <div className="w-16 h-16 rounded-full bg-[--color-surface-elevated] flex items-center justify-center mb-4">
                    <WifiOff className="w-8 h-8 text-[--color-text-muted]" />
                </div>
                <p className="text-[--color-text-secondary] font-medium">
                    No devices connected
                </p>
                <p className="text-sm text-[--color-text-muted] mt-1">
                    Share the QR code to invite listeners
                </p>
            </motion.div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-[--color-text-secondary] uppercase tracking-wider">
                    Connected Devices
                </h3>
                <span className="badge badge-success">
                    <Wifi className="w-3 h-3" />
                    {peerArray.length} online
                </span>
            </div>

            <motion.div className="space-y-2">
                {peerArray.map((peer, index) => {
                    const SignalIcon = getSignalIcon(peer.latencyOffset);

                    return (
                        <motion.div
                            key={peer.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={cn(
                                'group relative flex items-center gap-4 p-4 rounded-xl',
                                'bg-[--color-surface] border border-[--color-border]',
                                'hover:border-[--color-border-hover] hover:bg-[--color-surface-elevated]',
                                'transition-all duration-300'
                            )}
                        >
                            {/* Device icon with status indicator */}
                            <div className="relative">
                                <div className={cn(
                                    'w-12 h-12 rounded-xl flex items-center justify-center',
                                    'bg-gradient-to-br from-[--color-surface-elevated] to-[--color-surface-hover]',
                                    'border border-[--color-border]'
                                )}>
                                    <Smartphone className="w-5 h-5 text-[--color-text-secondary]" />
                                </div>
                                {/* Status dot */}
                                <div className={cn(
                                    'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[--color-background]',
                                    getStatusBg(peer.status)
                                )} />
                            </div>

                            {/* Peer info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-[--color-text-primary] truncate">
                                        {peer.name}
                                    </span>
                                    {peer.isMaster && (
                                        <Crown className="w-4 h-4 text-[--color-warning] flex-shrink-0" />
                                    )}
                                </div>
                                <div className="flex items-center gap-3 mt-0.5">
                                    <span className={cn('text-xs', getStatusColor(peer.status))}>
                                        {peer.status === 'connected' ? 'Connected' : peer.status}
                                    </span>
                                    <span className="text-xs text-[--color-text-muted]">
                                        {peer.id.slice(-6)}
                                    </span>
                                </div>
                            </div>

                            {/* Signal strength and latency */}
                            <div className="flex flex-col items-end gap-1">
                                <SignalIcon className={cn(
                                    'w-5 h-5',
                                    peer.latencyOffset < 100 ? 'text-[--color-success]' :
                                        peer.latencyOffset < 200 ? 'text-[--color-warning]' : 'text-[--color-error]'
                                )} />
                                <span className="text-xs text-[--color-text-muted] font-mono">
                                    {formatLatency(peer.latencyOffset)}
                                </span>
                            </div>

                            {/* Grant master button (on hover) */}
                            {onGrantMaster && !peer.isMaster && (
                                <motion.button
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    whileHover={{ scale: 1.05 }}
                                    className={cn(
                                        'absolute right-2 top-1/2 -translate-y-1/2',
                                        'opacity-0 group-hover:opacity-100',
                                        'px-3 py-1.5 rounded-lg text-xs font-medium',
                                        'bg-[--color-accent] text-black',
                                        'transition-all duration-200'
                                    )}
                                    onClick={() => onGrantMaster(peer.id)}
                                >
                                    <Crown className="w-3 h-3 inline mr-1" />
                                    Grant Control
                                </motion.button>
                            )}
                        </motion.div>
                    );
                })}
            </motion.div>
        </div>
    );
}

// Simple count badge for header
export function DeviceCount({ count }: { count: number }) {
    return (
        <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full',
                'bg-[--color-surface] border border-[--color-border]'
            )}
        >
            <User className="w-4 h-4 text-[--color-text-muted]" />
            <span className="text-sm font-medium text-[--color-text-primary]">
                {count}
            </span>
            <span className="text-xs text-[--color-text-muted]">
                connected
            </span>
        </motion.div>
    );
}
