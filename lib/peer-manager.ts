/**
 * PeerJS Manager
 * Handles P2P connections, data channels, and message routing
 */

import Peer from 'peerjs';
import type { DataConnection } from 'peerjs';
import {
    MessageType,
    type ProtocolMessage,
    type AudioMeta,
    type AudioChunk,
    type SchedulePlay,
    type SyncRequest,
    type PlaybackState,
    SCHEDULE_BUFFER
} from './protocol';
import { syncEngine, type SyncResult } from './sync-engine';
import { audioEngine, chunkArrayBuffer, reassembleChunks } from './audio-engine';
import { useMeshBeatStore, type ConnectedPeer } from './store';
import { generatePeerId } from './utils';

// Public STUN/TURN servers for faster ICE negotiation
const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun.cloudflare.com:3478' },
    ],
    iceCandidatePoolSize: 10,
};

// PeerJS Server Configuration (from environment or defaults)
const getPeerConfig = () => {
    const envHost = process.env.NEXT_PUBLIC_PEER_HOST || '0.peerjs.com';
    const envPort = parseInt(process.env.NEXT_PUBLIC_PEER_PORT || '443', 10);
    const envPath = process.env.NEXT_PUBLIC_PEER_PATH || '/';
    const envSecure = process.env.NEXT_PUBLIC_PEER_SECURE !== 'false';

    // If we're in the browser, determine config based on current location
    if (typeof window !== 'undefined') {
        const isSelfHosted = envHost !== '0.peerjs.com';

        return {
            // If self-hosted (bundled with app), use current page origin
            // Otherwise use the configured cloud host
            host: isSelfHosted ? window.location.hostname : envHost,
            port: isSelfHosted ? (window.location.port ? parseInt(window.location.port, 10) : 443) : envPort,
            path: envPath,
            secure: isSelfHosted ? (window.location.protocol === 'https:') : envSecure,
            debug: 0,
            config: ICE_SERVERS,
        };
    }

    // SSR fallback
    return {
        host: envHost,
        port: envPort,
        path: envPath,
        secure: envSecure,
        debug: 0,
        config: ICE_SERVERS,
    };
};

export class PeerManager {
    private peer: Peer | null = null;
    private peerConfig = getPeerConfig(); // Store current config instance
    private connections: Map<string, DataConnection> = new Map();
    private audioChunks: Map<string, Uint8Array[]> = new Map(); // Binary chunks as Uint8Array for msgpack
    private audioMeta: AudioMeta | null = null;
    private isInitialized = false;
    private pendingPlaybackState: PlaybackState | null = null; // Queue for playback state that arrives before audio is ready

    /**
     * Reset internal state before new initialization
     */
    private resetState(): void {
        this.connections.clear();
        this.audioChunks.clear();
        this.audioMeta = null;
        this.isInitialized = false;
        if (this.peer) {
            this.peer.destroy();
            this.peer = null;
        }
    }

    /**
     * Retry wrapper with fast fixed delays
     */
    private async withRetry<T>(
        operation: () => Promise<T>,
        maxRetries: number = 2,
        baseDelayMs: number = 500
    ): Promise<T> {
        let lastError: Error | null = null;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));

                if (attempt < maxRetries) {
                    // Fixed short delay, no exponential backoff for faster recovery
                    console.log(`[PeerManager] Retry ${attempt + 1}/${maxRetries} in ${baseDelayMs}ms...`);
                    await new Promise(resolve => setTimeout(resolve, baseDelayMs));
                }
            }
        }

        throw lastError || new Error('Operation failed after retries');
    }

    /**
     * Initialize as host - create a new peer with generated ID (with auto-retry)
     */
    async initAsHost(): Promise<string> {
        return this.withRetry(() => this.initAsHostOnce(), 2, 500);
    }

    /**
     * Single attempt to initialize as host
     */
    private async initAsHostOnce(): Promise<string> {
        // Reset any previous state
        this.resetState();

        return new Promise((resolve, reject) => {
            const peerId = generatePeerId();
            const INIT_TIMEOUT = 3000; // 3 second timeout per attempt - fast fail

            const timeoutId = setTimeout(() => {
                console.error('[PeerManager] Host init timeout');
                reject(new Error('Connection timeout'));
            }, INIT_TIMEOUT);

            this.peer = new Peer(peerId, this.peerConfig);

            this.peer.on('open', (id) => {
                clearTimeout(timeoutId);
                console.log('[PeerManager] Host initialized with ID:', id);
                this.isInitialized = true;

                const store = useMeshBeatStore.getState();
                store.setRole('host');
                store.setPeerId(id);
                store.setPeer(this.peer);
                store.setStatus('connected');
                store.setIsMaster(true);

                resolve(id);
            });

            this.peer.on('connection', (conn) => {
                this.handleIncomingConnection(conn);
            });

            this.peer.on('error', (err) => {
                clearTimeout(timeoutId);
                console.error('[PeerManager] Host error:', err);
                useMeshBeatStore.getState().setStatus('error');
                reject(err);
            });

            this.peer.on('disconnected', () => {
                console.log('[PeerManager] Disconnected from signaling server, reconnecting...');
                this.peer?.reconnect();
            });
        });
    }

    /**
     * Initialize as guest - connect to host peer ID (with auto-retry)
     */
    async initAsGuest(hostPeerId: string): Promise<void> {
        return this.withRetry(() => this.initAsGuestOnce(hostPeerId), 2, 500);
    }

    /**
     * Single attempt to initialize as guest
     */
    private async initAsGuestOnce(hostPeerId: string): Promise<void> {
        // Reset any previous state
        this.resetState();

        return new Promise((resolve, reject) => {
            const guestId = generatePeerId();
            const CONNECTION_TIMEOUT = 3000; // 3 second timeout per attempt - fast fail

            this.peer = new Peer(guestId, this.peerConfig);

            // Set up timeout for the entire connection process
            const timeoutId = setTimeout(() => {
                console.error('[PeerManager] Connection timeout');
                useMeshBeatStore.getState().setStatus('error');
                reject(new Error('Connection timeout - host may be offline'));
            }, CONNECTION_TIMEOUT);

            this.peer.on('open', (id) => {
                console.log('[PeerManager] Guest initialized with ID:', id);

                const store = useMeshBeatStore.getState();
                store.setRole('guest');
                store.setPeerId(id);
                store.setHostPeerId(hostPeerId);
                store.setPeer(this.peer);
                store.setStatus('connecting');

                // Connect to host with binary serialization for low-latency audio
                const conn = this.peer!.connect(hostPeerId, {
                    metadata: { name: `Guest-${guestId.slice(-4)}` },
                    serialization: 'binary',
                    reliable: true,
                });

                conn.on('open', () => {
                    clearTimeout(timeoutId); // Clear timeout on successful connection
                    console.log('[PeerManager] Connected to host:', hostPeerId);
                    this.connections.set(hostPeerId, conn);
                    this.isInitialized = true;
                    store.setStatus('connected');

                    // Send peer info
                    conn.send({
                        type: MessageType.PEER_INFO,
                        peerId: id,
                        name: `Guest-${id.slice(-4)}`,
                    });

                    // Start clock sync
                    syncEngine.startSync(conn, (result: SyncResult) => {
                        store.setClockOffset(result.clockOffset);
                        console.log(`[PeerManager] Sync: RTT=${result.roundTripTime.toFixed(1)}ms, Offset=${result.clockOffset.toFixed(1)}ms`);
                    });

                    this.setupDataHandler(conn);
                    resolve();
                });

                conn.on('error', (err) => {
                    clearTimeout(timeoutId);
                    console.error('[PeerManager] Connection error:', err);
                    store.setStatus('error');
                    reject(err);
                });

                conn.on('close', () => {
                    console.log('[PeerManager] Connection closed');
                    this.connections.delete(hostPeerId);
                    store.setStatus('disconnected');
                });
            });

            this.peer.on('error', (err) => {
                clearTimeout(timeoutId);
                console.error('[PeerManager] Guest error:', err);
                useMeshBeatStore.getState().setStatus('error');
                reject(err);
            });
        });
    }

    /**
     * Handle incoming connection (host side)
     */
    private handleIncomingConnection(conn: DataConnection): void {
        console.log('[PeerManager] Incoming connection from:', conn.peer);

        conn.on('open', async () => {
            this.connections.set(conn.peer, conn);

            const connectedPeer: ConnectedPeer = {
                id: conn.peer,
                name: `Guest-${conn.peer.slice(-4)}`,
                connection: conn,
                latencyOffset: 0,
                lastPing: Date.now(),
                status: 'connected',
                isMaster: false,
            };

            useMeshBeatStore.getState().addPeer(connectedPeer);

            // Ensure connection uses binary serialization
            // @ts-ignore - explicitly setting serialization for outgoing too
            conn.serialization = 'binary';

            this.setupDataHandler(conn);

            // Send current audio if available
            const store = useMeshBeatStore.getState();
            const audioFile = store.audioFile;
            if (audioFile?.buffer) {
                // Stream audio first
                await this.streamAudioToPeer(conn, audioFile.buffer, audioFile.name, audioFile.duration);

                // Then sync playback state so guest starts from where host is
                this.sendPlaybackStateToConnection(conn);
            }
        });

        conn.on('close', () => {
            console.log('[PeerManager] Connection closed:', conn.peer);
            this.connections.delete(conn.peer);
            useMeshBeatStore.getState().removePeer(conn.peer);
        });

        conn.on('error', (err) => {
            console.error('[PeerManager] Connection error:', conn.peer, err);
            useMeshBeatStore.getState().updatePeerStatus(conn.peer, 'error');
        });
    }

    /**
     * Setup data message handler
     */
    private setupDataHandler(conn: DataConnection): void {
        conn.on('data', async (data) => {
            await this.handleMessage(conn, data as ProtocolMessage);
        });
    }

    /**
     * Handle incoming protocol messages
     */
    private async handleMessage(conn: DataConnection, message: ProtocolMessage): Promise<void> {
        const store = useMeshBeatStore.getState();

        switch (message.type) {
            case MessageType.SYNC_REQUEST:
                syncEngine.handleSyncRequest(conn, message as SyncRequest);
                break;

            case MessageType.PEER_INFO:
                // Update peer name
                const peers = store.connectedPeers;
                const peer = peers.get(conn.peer);
                if (peer) {
                    peers.set(conn.peer, { ...peer, name: message.name });
                }
                break;

            case MessageType.AUDIO_META:
                const metaMsg = message as AudioMeta;
                this.audioMeta = metaMsg;
                // Initialize chunk storage with tracking
                this.audioChunks.set(conn.peer, []);
                store.setPlaybackState('loading');
                console.log(`[PeerManager] Receiving audio: ${metaMsg.name} (${metaMsg.totalChunks} chunks expected)`);
                break;

            case MessageType.AUDIO_CHUNK:
                const chunkMsg = message as AudioChunk;
                const chunkArray = this.audioChunks.get(conn.peer);
                if (chunkArray && this.audioMeta) {
                    // Store binary chunk at correct index
                    chunkArray[chunkMsg.chunkIndex] = chunkMsg.data;
                    const receivedCount = chunkArray.filter(c => c !== undefined).length;
                    console.log(`[PeerManager] Chunk ${chunkMsg.chunkIndex + 1}/${chunkMsg.totalChunks} (received: ${receivedCount})`);

                    // If we've received all chunks, process immediately
                    if (receivedCount === this.audioMeta.totalChunks) {
                        console.log('[PeerManager] All chunks received, processing...');
                        this.processReceivedAudio(conn.peer, store);
                    }
                } else {
                    console.warn('[PeerManager] Received chunk but no meta/storage initialized');
                }
                break;

            case MessageType.AUDIO_COMPLETE:
                // Check if we already processed the audio
                if (!this.audioChunks.has(conn.peer)) {
                    console.log('[PeerManager] Audio already processed');
                    break;
                }

                // Guard: Ensure meta is still available
                if (!this.audioMeta) {
                    console.log('[PeerManager] Audio meta already cleared, skipping duplicate process');
                    break;
                }

                // Fallback - try to process even if we missed some chunks
                const completeChunks = this.audioChunks.get(conn.peer)!;
                const totalReceived = completeChunks.filter(c => c !== undefined).length;
                console.log(`[PeerManager] AUDIO_COMPLETE received. Chunks: ${totalReceived}/${this.audioMeta?.totalChunks || '?'}`);

                if (totalReceived > 0) {
                    await this.processReceivedAudio(conn.peer, store);
                } else {
                    console.error('[PeerManager] No chunks received!');
                    store.setPlaybackState('stopped');
                }
                break;

            case MessageType.SCHEDULE_PLAY:
                const playMsg = message as SchedulePlay;

                // Check if audio is ready before playing
                if (!audioEngine.getIsReady()) {
                    console.log('[PeerManager] Audio not ready for play, queueing...');
                    this.pendingPlaybackState = {
                        type: MessageType.PLAYBACK_STATE,
                        isPlaying: true,
                        seekPosition: playMsg.seekPosition,
                        startTime: playMsg.startTime,
                    };
                    break;
                }

                audioEngine.schedulePlay(playMsg.startTime, playMsg.seekPosition, store.clockOffset);
                store.setPlaybackState('playing');
                break;

            case MessageType.SCHEDULE_PAUSE:
                audioEngine.pause();
                store.setPlaybackState('paused');
                break;

            case MessageType.SCHEDULE_STOP:
                audioEngine.stop();
                store.setPlaybackState('stopped');
                break;

            case MessageType.REQUEST_MASTER:
                // Host receives master request
                console.log('[PeerManager] Master request from:', message.peerId);
                // In a full implementation, show UI for approval
                break;

            case MessageType.GRANT_MASTER:
                // Guest receives master grant
                if (message.peerId === store.peerId) {
                    store.setIsMaster(true);
                    console.log('[PeerManager] Master control granted');
                }
                break;

            case MessageType.REVOKE_MASTER:
                store.setIsMaster(false);
                console.log('[PeerManager] Master control revoked');
                break;

            case MessageType.HEARTBEAT:
                // Update peer last seen
                store.updatePeerLatency(conn.peer, Date.now() - message.timestamp);
                break;

            case MessageType.PLAYBACK_STATE:
                // Guest receives current playback state from host
                const stateMsg = message as PlaybackState;
                console.log(`[PeerManager] Received playback state: playing=${stateMsg.isPlaying}, pos=${stateMsg.seekPosition}`);

                // Check if audio is ready
                if (!audioEngine.getIsReady()) {
                    console.log('[PeerManager] Audio not ready yet, queueing playback state...');
                    this.pendingPlaybackState = stateMsg;
                    break;
                }

                if (stateMsg.isPlaying) {
                    audioEngine.schedulePlay(stateMsg.startTime, stateMsg.seekPosition, store.clockOffset);
                    store.setPlaybackState('playing');
                } else {
                    store.setPlaybackState('stopped');
                }
                break;
        }
    }

    /**
     * Process received audio chunks and load into audio engine
     */
    private async processReceivedAudio(peerId: string, store: ReturnType<typeof useMeshBeatStore.getState>): Promise<void> {
        if (!this.audioMeta || !this.audioChunks.has(peerId)) {
            console.error('[PeerManager] Cannot process audio - missing meta or chunks');
            return;
        }

        const receivedChunks = this.audioChunks.get(peerId)!;

        // Save meta before clearing (in case of errors or finally block)
        const savedMeta = { ...this.audioMeta };

        try {
            const buffer = reassembleChunks(receivedChunks);
            console.log(`[PeerManager] Reassembled ${buffer.byteLength} bytes`);

            await audioEngine.loadFromArrayBuffer(buffer, savedMeta.name);
            store.setAudioFile({
                name: savedMeta.name,
                size: savedMeta.size,
                duration: savedMeta.duration,
                buffer,
            });
            store.setPlaybackState('stopped');
            console.log('[PeerManager] Audio loaded successfully');

            // Process any pending playback state that arrived before audio was ready
            if (this.pendingPlaybackState) {
                console.log('[PeerManager] Processing queued playback state...');
                const pendingState = this.pendingPlaybackState;
                this.pendingPlaybackState = null;

                if (pendingState.isPlaying) {
                    // Recalculate timing - use fresh timestamp since we're starting now
                    audioEngine.schedulePlay(
                        performance.now() + SCHEDULE_BUFFER,
                        pendingState.seekPosition,
                        store.clockOffset
                    );
                    store.setPlaybackState('playing');
                }
            }
        } catch (error) {
            console.error('[PeerManager] Failed to load audio:', error);
            store.setPlaybackState('stopped');
        } finally {
            this.audioChunks.delete(peerId);
            this.audioMeta = null;
        }
    }

    /**
     * Stream audio file to a specific peer
     */
    async streamAudioToPeer(
        conn: DataConnection,
        buffer: ArrayBuffer,
        name: string,
        duration: number
    ): Promise<void> {
        const chunks = chunkArrayBuffer(buffer);

        // Send metadata
        const meta: AudioMeta = {
            type: MessageType.AUDIO_META,
            name,
            size: buffer.byteLength,
            duration,
            mimeType: 'audio/mpeg',
            totalChunks: chunks.length,
        };
        conn.send(meta);

        // Send chunks with small delay to prevent overwhelming
        for (let i = 0; i < chunks.length; i++) {
            const chunk: AudioChunk = {
                type: MessageType.AUDIO_CHUNK,
                chunkIndex: i,
                totalChunks: chunks.length,
                data: chunks[i],
            };
            conn.send(chunk);

            // Small delay every 10 chunks
            if (i % 10 === 9) {
                await new Promise(resolve => setTimeout(resolve, 10));
            }
        }

        // Send complete signal
        conn.send({ type: MessageType.AUDIO_COMPLETE });
        console.log('[PeerManager] Audio stream complete');
    }

    /**
     * Stream audio to all connected peers
     */
    async streamAudioToAll(buffer: ArrayBuffer, name: string, duration: number): Promise<void> {
        const promises = Array.from(this.connections.values()).map(conn =>
            this.streamAudioToPeer(conn, buffer, name, duration)
        );
        await Promise.all(promises);
    }

    /**
     * Send current playback state to a specific connection (for sync-on-join)
     */
    private sendPlaybackStateToConnection(conn: DataConnection): void {
        const store = useMeshBeatStore.getState();
        const isPlaying = store.playbackState === 'playing';

        // Calculate current seek position
        // If playing, we need to send where the audio currently is
        const seekPosition = isPlaying ? audioEngine.getCurrentTime?.() || 0 : 0;

        const message: PlaybackState = {
            type: MessageType.PLAYBACK_STATE,
            isPlaying,
            seekPosition,
            startTime: performance.now() + SCHEDULE_BUFFER, // Future time to sync
        };

        conn.send(message);
        console.log(`[PeerManager] Sent playback state: playing=${isPlaying}, pos=${seekPosition}`);
    }

    /**
     * Broadcast scheduled play command to all peers
     */
    broadcastPlay(seekPosition: number = 0): void {
        const startTime = performance.now() + SCHEDULE_BUFFER;

        const message: SchedulePlay = {
            type: MessageType.SCHEDULE_PLAY,
            startTime,
            seekPosition,
        };

        // Send to all peers
        this.connections.forEach(conn => conn.send(message));

        // Play locally too
        audioEngine.schedulePlay(startTime, seekPosition, 0);
        useMeshBeatStore.getState().setPlaybackState('playing');
    }

    /**
     * Broadcast pause command
     */
    broadcastPause(): void {
        this.connections.forEach(conn => conn.send({ type: MessageType.SCHEDULE_PAUSE }));
        audioEngine.pause();
        useMeshBeatStore.getState().setPlaybackState('paused');
    }

    /**
     * Broadcast stop command
     */
    broadcastStop(): void {
        this.connections.forEach(conn => conn.send({ type: MessageType.SCHEDULE_STOP }));
        audioEngine.stop();
        useMeshBeatStore.getState().setPlaybackState('stopped');
    }

    /**
     * Request master control (guest side)
     */
    requestMaster(): void {
        const store = useMeshBeatStore.getState();
        const hostConn = this.connections.get(store.hostPeerId || '');

        if (hostConn) {
            hostConn.send({
                type: MessageType.REQUEST_MASTER,
                peerId: store.peerId,
            });
        }
    }

    /**
     * Grant master control to a peer (host side)
     */
    grantMaster(peerId: string): void {
        const conn = this.connections.get(peerId);
        if (conn) {
            conn.send({
                type: MessageType.GRANT_MASTER,
                peerId,
            });

            // Update local state
            useMeshBeatStore.getState().setIsMaster(false);
        }
    }

    /**
     * Get connection count
     */
    getConnectionCount(): number {
        return this.connections.size;
    }

    /**
     * Clean up and disconnect
     */
    destroy(): void {
        syncEngine.stopSync();
        this.connections.forEach(conn => conn.close());
        this.connections.clear();
        this.peer?.destroy();
        this.peer = null;
        useMeshBeatStore.getState().reset();
    }
}

export const peerManager = new PeerManager();