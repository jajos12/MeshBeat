/**
 * NTP-style Clock Synchronization Engine
 * Calculates latency offset between host and guests for precise audio sync
 */

import { MessageType, type SyncRequest, type SyncResponse, SYNC_INTERVAL } from './protocol';
import type { DataConnection } from 'peerjs';

export interface SyncResult {
    roundTripTime: number;
    clockOffset: number;
}

export class SyncEngine {
    private samples: SyncResult[] = [];
    private maxSamples = 10;
    private intervalId: NodeJS.Timeout | null = null;

    /**
     * Start continuous sync with a peer connection
     */
    startSync(
        connection: DataConnection,
        onSyncComplete: (result: SyncResult) => void
    ): void {
        this.stopSync();

        // Initial sync
        this.performSync(connection, onSyncComplete);

        // Continuous sync at interval
        this.intervalId = setInterval(() => {
            this.performSync(connection, onSyncComplete);
        }, SYNC_INTERVAL);
    }

    /**
     * Stop continuous sync
     */
    stopSync(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.samples = [];
    }

    /**
     * Perform a single sync request
     */
    private performSync(
        connection: DataConnection,
        onSyncComplete: (result: SyncResult) => void
    ): void {
        // Use Date.now() for cross-page synchronization
        // performance.now() is relative to page load and differs between tabs
        const t1 = Date.now();

        const request: SyncRequest = {
            type: MessageType.SYNC_REQUEST,
            t1,
        };

        // Set up one-time response handler
        const handleResponse = (data: unknown) => {
            if (typeof data === 'object' && data !== null && 'type' in data) {
                const message = data as { type: string };
                if (message.type === MessageType.SYNC_RESPONSE) {
                    const response = data as SyncResponse;
                    const t4 = Date.now();

                    const result = this.calculateOffset(response.t1, response.t2, response.t3, t4);
                    this.addSample(result);

                    onSyncComplete(this.getAverageResult());

                    connection.off('data', handleResponse);
                }
            }
        };

        connection.on('data', handleResponse);
        connection.send(request);

        // Timeout - remove handler if no response
        setTimeout(() => {
            connection.off('data', handleResponse);
        }, 1000);
    }

    /**
     * Handle incoming sync request (host side)
     */
    handleSyncRequest(connection: DataConnection, request: SyncRequest): void {
        const t2 = Date.now();

        const response: SyncResponse = {
            type: MessageType.SYNC_RESPONSE,
            t1: request.t1,
            t2,
            t3: Date.now(),
        };

        connection.send(response);
    }

    /**
     * Calculate clock offset using NTP algorithm
     * RTT = (t4 - t1) - (t3 - t2)
     * Offset = ((t2 - t1) + (t3 - t4)) / 2
     */
    private calculateOffset(t1: number, t2: number, t3: number, t4: number): SyncResult {
        const roundTripTime = (t4 - t1) - (t3 - t2);
        const clockOffset = ((t2 - t1) + (t3 - t4)) / 2;

        // Sanity check - offset shouldn't be more than a few seconds in normal conditions
        const sanitizedOffset = Math.abs(clockOffset) > 10000 ? 0 : clockOffset;
        const sanitizedRTT = roundTripTime < 0 ? Math.abs(roundTripTime) : roundTripTime;

        return { roundTripTime: sanitizedRTT, clockOffset: sanitizedOffset };
    }

    /**
     * Add sample and maintain max sample size
     */
    private addSample(result: SyncResult): void {
        this.samples.push(result);
        if (this.samples.length > this.maxSamples) {
            this.samples.shift();
        }
    }

    /**
     * Get average of all samples (excluding outliers)
     */
    private getAverageResult(): SyncResult {
        if (this.samples.length === 0) {
            return { roundTripTime: 0, clockOffset: 0 };
        }

        // Sort by RTT and remove top/bottom 20% as outliers (if enough samples)
        const sorted = [...this.samples].sort((a, b) => a.roundTripTime - b.roundTripTime);
        const trimCount = Math.floor(sorted.length * 0.2);
        const trimmed = sorted.slice(trimCount, sorted.length - trimCount || sorted.length);

        if (trimmed.length === 0) {
            return this.samples[this.samples.length - 1];
        }

        const avgRTT = trimmed.reduce((sum, s) => sum + s.roundTripTime, 0) / trimmed.length;
        const avgOffset = trimmed.reduce((sum, s) => sum + s.clockOffset, 0) / trimmed.length;

        return { roundTripTime: avgRTT, clockOffset: avgOffset };
    }

    /**
     * Get synchronized time (adjusted for offset)
     */
    getSyncedTime(clockOffset: number): number {
        return performance.now() + clockOffset;
    }

    /**
     * Calculate scheduled start time with buffer
     * Returns a time in the future that all peers should have received
     */
    static calculateScheduleTime(buffer: number = 500): number {
        return performance.now() + buffer;
    }
}

export const syncEngine = new SyncEngine();
