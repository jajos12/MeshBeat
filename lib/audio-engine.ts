/**
 * Audio Engine using Tone.js for high-precision playback
 * Handles loading, scheduling, and synchronized playback
 */

import * as Tone from 'tone';
import { CHUNK_SIZE } from './protocol';

export class AudioEngine {
    private player: Tone.Player | null = null;
    private buffer: Tone.ToneAudioBuffer | null = null;
    private scheduledEventId: number | null = null;
    private isReady = false;

    /**
     * Initialize Tone.js audio context
     * Must be called after user interaction (browser requirement)
     */
    async initialize(): Promise<void> {
        await Tone.start();
        console.log('[AudioEngine] Tone.js initialized');
    }

    /**
     * Load audio from ArrayBuffer
     */
    async loadFromArrayBuffer(arrayBuffer: ArrayBuffer, name: string): Promise<number> {
        try {
            // Decode the array buffer to audio buffer
            const audioContext = Tone.getContext().rawContext;
            const decodedBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));

            // Create Tone.js buffer
            this.buffer = new Tone.ToneAudioBuffer(decodedBuffer);

            // Create player
            if (this.player) {
                this.player.dispose();
            }

            this.player = new Tone.Player(this.buffer).toDestination();
            this.player.loop = false;

            this.isReady = true;
            console.log(`[AudioEngine] Loaded: ${name}, Duration: ${this.buffer.duration}s`);

            return this.buffer.duration;
        } catch (error) {
            console.error('[AudioEngine] Failed to load audio:', error);
            throw error;
        }
    }

    /**
     * Load audio from File object
     */
    async loadFromFile(file: File): Promise<{ buffer: ArrayBuffer; duration: number }> {
        const arrayBuffer = await file.arrayBuffer();
        const duration = await this.loadFromArrayBuffer(arrayBuffer.slice(0), file.name);
        return { buffer: arrayBuffer, duration };
    }

    /**
     * Schedule playback at a specific synchronized time
     * @param scheduledTime - The synchronized time (from SyncEngine) to start
     * @param seekPosition - Position in the audio to start from (seconds)
     * @param clockOffset - The local clock offset to convert to local time
     */
    schedulePlay(scheduledTime: number, seekPosition: number = 0, clockOffset: number = 0): void {
        if (!this.player || !this.isReady) {
            console.warn('[AudioEngine] Player not ready');
            return;
        }

        // Convert synchronized time to local time
        const localTime = scheduledTime - clockOffset;
        const now = performance.now();
        const delay = Math.max(0, (localTime - now) / 1000); // Convert to seconds

        // Cancel any previously scheduled playback
        this.cancelScheduled();

        // Use Tone.js Transport for precise scheduling
        Tone.getTransport().cancel();
        Tone.getTransport().stop();

        // Schedule the player to start
        this.player.seek(seekPosition);

        if (delay > 0) {
            // Schedule for future
            const startTimeAudioContext = Tone.now() + delay;
            this.player.start(startTimeAudioContext, seekPosition);
            console.log(`[AudioEngine] Scheduled play in ${(delay * 1000).toFixed(1)}ms at position ${seekPosition}s`);
        } else {
            // Start immediately (we're late)
            const lateBy = -delay;
            const adjustedSeek = seekPosition + lateBy;
            if (adjustedSeek < (this.buffer?.duration || 0)) {
                this.player.start(Tone.now(), adjustedSeek);
                console.log(`[AudioEngine] Late start by ${(lateBy * 1000).toFixed(1)}ms, seeking to ${adjustedSeek.toFixed(2)}s`);
            }
        }
    }

    /**
     * Pause playback
     */
    pause(): void {
        if (this.player) {
            this.player.stop();
            console.log('[AudioEngine] Paused');
        }
    }

    /**
     * Stop playback and reset
     */
    stop(): void {
        this.cancelScheduled();
        if (this.player) {
            this.player.stop();
            console.log('[AudioEngine] Stopped');
        }
    }

    /**
     * Seek to position
     */
    seek(position: number): void {
        if (this.player) {
            this.player.seek(position);
        }
    }

    /**
     * Get current playback state
     */
    getState(): Tone.PlaybackState {
        return this.player?.state || 'stopped';
    }

    /**
     * Get buffer duration
     */
    getDuration(): number {
        return this.buffer?.duration || 0;
    }

    /**
     * Check if audio is loaded and ready
     */
    getIsReady(): boolean {
        return this.isReady;
    }

    /**
     * Cancel scheduled playback
     */
    private cancelScheduled(): void {
        if (this.scheduledEventId !== null) {
            Tone.getTransport().clear(this.scheduledEventId);
            this.scheduledEventId = null;
        }
    }

    /**
     * Clean up resources
     */
    dispose(): void {
        this.cancelScheduled();
        if (this.player) {
            this.player.dispose();
            this.player = null;
        }
        if (this.buffer) {
            this.buffer.dispose();
            this.buffer = null;
        }
        this.isReady = false;
    }
}

/**
 * Split ArrayBuffer into Base64 encoded chunks for streaming over JSON
 */
export function chunkArrayBuffer(buffer: ArrayBuffer): string[] {
    const chunks: string[] = [];
    let offset = 0;

    while (offset < buffer.byteLength) {
        const chunkSize = Math.min(CHUNK_SIZE, buffer.byteLength - offset);
        const chunkBuffer = buffer.slice(offset, offset + chunkSize);
        // Convert to Base64 for JSON serialization
        const base64 = arrayBufferToBase64(chunkBuffer);
        chunks.push(base64);
        offset += chunkSize;
    }

    return chunks;
}

/**
 * Reassemble Base64 encoded chunks into ArrayBuffer
 */
export function reassembleChunks(chunks: string[]): ArrayBuffer {
    // Filter out any undefined entries and validate chunks
    const validChunks = chunks.filter((chunk): chunk is string =>
        typeof chunk === 'string' && chunk.length > 0
    );

    if (validChunks.length === 0) {
        throw new Error('No valid audio chunks received');
    }

    // Convert Base64 chunks back to ArrayBuffers
    const buffers = validChunks.map(base64ToArrayBuffer);
    const totalSize = buffers.reduce((sum, buf) => sum + buf.byteLength, 0);
    const result = new Uint8Array(totalSize);
    let offset = 0;

    for (const chunk of buffers) {
        result.set(new Uint8Array(chunk), offset);
        offset += chunk.byteLength;
    }

    return result.buffer;
}

/**
 * Convert ArrayBuffer to Base64 string
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

/**
 * Convert Base64 string to ArrayBuffer
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
    try {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    } catch (error) {
        console.error('[AudioEngine] Invalid Base64 chunk:', base64?.substring(0, 50));
        throw new Error('Invalid Base64 audio data');
    }
}

export const audioEngine = new AudioEngine();
