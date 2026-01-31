// MeshBeat Data Protocol
// Message types for P2P communication

export enum MessageType {
    // Clock synchronization
    SYNC_REQUEST = 'SYNC_REQUEST',
    SYNC_RESPONSE = 'SYNC_RESPONSE',

    // Audio streaming
    AUDIO_META = 'AUDIO_META',
    AUDIO_CHUNK = 'AUDIO_CHUNK',
    AUDIO_COMPLETE = 'AUDIO_COMPLETE',

    // Playback control
    SCHEDULE_PLAY = 'SCHEDULE_PLAY',
    SCHEDULE_PAUSE = 'SCHEDULE_PAUSE',
    SCHEDULE_STOP = 'SCHEDULE_STOP',
    SCHEDULE_SEEK = 'SCHEDULE_SEEK',

    // Master control
    REQUEST_MASTER = 'REQUEST_MASTER',
    GRANT_MASTER = 'GRANT_MASTER',
    REVOKE_MASTER = 'REVOKE_MASTER',

    // Status
    PEER_INFO = 'PEER_INFO',
    HEARTBEAT = 'HEARTBEAT',
    PLAYBACK_STATE = 'PLAYBACK_STATE', // Sync current playback state to new guests
}

export interface SyncRequest {
    type: MessageType.SYNC_REQUEST;
    t1: number; // Client send time (performance.now())
}

export interface SyncResponse {
    type: MessageType.SYNC_RESPONSE;
    t1: number; // Original client send time
    t2: number; // Server receive time
    t3: number; // Server send time
}

export interface AudioMeta {
    type: MessageType.AUDIO_META;
    name: string;
    size: number;
    duration: number;
    mimeType: string;
    totalChunks: number;
}

export interface AudioChunk {
    type: MessageType.AUDIO_CHUNK;
    chunkIndex: number;
    totalChunks: number;
    data: Uint8Array; // Binary audio data - Uint8Array for proper msgpack serialization
}

export interface AudioComplete {
    type: MessageType.AUDIO_COMPLETE;
}

export interface SchedulePlay {
    type: MessageType.SCHEDULE_PLAY;
    startTime: number; // Synchronized time to start playback
    seekPosition: number; // Position in audio (seconds)
}

export interface SchedulePause {
    type: MessageType.SCHEDULE_PAUSE;
    pauseTime: number; // Synchronized time to pause
}

export interface ScheduleStop {
    type: MessageType.SCHEDULE_STOP;
}

export interface ScheduleSeek {
    type: MessageType.SCHEDULE_SEEK;
    position: number;
    startTime: number;
}

export interface RequestMaster {
    type: MessageType.REQUEST_MASTER;
    peerId: string;
}

export interface GrantMaster {
    type: MessageType.GRANT_MASTER;
    peerId: string;
}

export interface RevokeMaster {
    type: MessageType.REVOKE_MASTER;
}

export interface PeerInfo {
    type: MessageType.PEER_INFO;
    peerId: string;
    name: string;
}

export interface Heartbeat {
    type: MessageType.HEARTBEAT;
    timestamp: number;
}

export interface PlaybackState {
    type: MessageType.PLAYBACK_STATE;
    isPlaying: boolean;
    seekPosition: number; // Current position in seconds
    startTime: number; // When playback started (performance.now() on host)
}

export type ProtocolMessage =
    | SyncRequest
    | SyncResponse
    | AudioMeta
    | AudioChunk
    | AudioComplete
    | SchedulePlay
    | SchedulePause
    | ScheduleStop
    | ScheduleSeek
    | RequestMaster
    | GrantMaster
    | RevokeMaster
    | PeerInfo
    | Heartbeat
    | PlaybackState;

// Chunk size for audio streaming (16KB) - safer for cross-browser WebRTC
export const CHUNK_SIZE = 16 * 1024;

// Sync interval (ms) - reduced for more responsive measurements
export const SYNC_INTERVAL = 1000;

// Playback scheduling buffer (ms ahead of current time) - reduced for tighter sync
export const SCHEDULE_BUFFER = 300;