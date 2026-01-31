import { create } from 'zustand';
import type Peer from 'peerjs';
import type { DataConnection } from 'peerjs';

export type RoomRole = 'host' | 'guest';
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';
export type PlaybackState = 'stopped' | 'playing' | 'paused' | 'loading';

export interface ConnectedPeer {
    id: string;
    name: string;
    connection: DataConnection;
    latencyOffset: number;
    lastPing: number;
    status: ConnectionStatus;
    isMaster: boolean;
}

export interface AudioFile {
    name: string;
    size: number;
    duration: number;
    buffer: ArrayBuffer | null;
}

export interface MeshBeatState {
    // Room state
    role: RoomRole | null;
    peerId: string | null;
    hostPeerId: string | null;
    peer: Peer | null;

    // Connection state
    status: ConnectionStatus;
    connectedPeers: Map<string, ConnectedPeer>;

    // Audio state
    audioFile: AudioFile | null;
    playbackState: PlaybackState;
    currentTime: number;
    isMaster: boolean;

    // Clock sync
    clockOffset: number;
    syncedTime: number;

    // Actions
    setRole: (role: RoomRole) => void;
    setPeerId: (id: string) => void;
    setHostPeerId: (id: string) => void;
    setPeer: (peer: Peer | null) => void;
    setStatus: (status: ConnectionStatus) => void;

    addPeer: (peer: ConnectedPeer) => void;
    removePeer: (id: string) => void;
    updatePeerLatency: (id: string, latency: number) => void;
    updatePeerStatus: (id: string, status: ConnectionStatus) => void;

    setAudioFile: (file: AudioFile | null) => void;
    setPlaybackState: (state: PlaybackState) => void;
    setCurrentTime: (time: number) => void;
    setIsMaster: (isMaster: boolean) => void;

    setClockOffset: (offset: number) => void;
    setSyncedTime: (time: number) => void;

    reset: () => void;
}

const initialState = {
    role: null,
    peerId: null,
    hostPeerId: null,
    peer: null,
    status: 'disconnected' as ConnectionStatus,
    connectedPeers: new Map<string, ConnectedPeer>(),
    audioFile: null,
    playbackState: 'stopped' as PlaybackState,
    currentTime: 0,
    isMaster: false,
    clockOffset: 0,
    syncedTime: 0,
};

export const useMeshBeatStore = create<MeshBeatState>((set) => ({
    ...initialState,

    setRole: (role) => set((state) => {
        // Reset to initial state when role changes (new session)
        if (state.role !== role) {
            return {
                ...initialState,
                role,
                connectedPeers: new Map(),
            };
        }
        return { role };
    }),
    setPeerId: (peerId) => set({ peerId }),
    setHostPeerId: (hostPeerId) => set({ hostPeerId }),
    setPeer: (peer) => set({ peer }),
    setStatus: (status) => set({ status }),

    addPeer: (peer) => set((state) => {
        const newPeers = new Map(state.connectedPeers);
        newPeers.set(peer.id, peer);
        return { connectedPeers: newPeers };
    }),

    removePeer: (id) => set((state) => {
        const newPeers = new Map(state.connectedPeers);
        newPeers.delete(id);
        return { connectedPeers: newPeers };
    }),

    updatePeerLatency: (id, latency) => set((state) => {
        const newPeers = new Map(state.connectedPeers);
        const peer = newPeers.get(id);
        if (peer) {
            newPeers.set(id, { ...peer, latencyOffset: latency, lastPing: Date.now() });
        }
        return { connectedPeers: newPeers };
    }),

    updatePeerStatus: (id, status) => set((state) => {
        const newPeers = new Map(state.connectedPeers);
        const peer = newPeers.get(id);
        if (peer) {
            newPeers.set(id, { ...peer, status });
        }
        return { connectedPeers: newPeers };
    }),

    setAudioFile: (audioFile) => set({ audioFile }),
    setPlaybackState: (playbackState) => set({ playbackState }),
    setCurrentTime: (currentTime) => set({ currentTime }),
    setIsMaster: (isMaster) => set({ isMaster }),

    setClockOffset: (clockOffset) => set({ clockOffset }),
    setSyncedTime: (syncedTime) => set({ syncedTime }),

    reset: () => set(initialState),
}));
