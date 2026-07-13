# 🎵 MeshBeat

**Real-time synchronized audio across multiple devices — no lag, no drift.**

MeshBeat turns listening into a shared moment. Multiple devices play the same track at the exact same instant, synchronized through WebRTC peer-to-peer connections. Create a room, share the code, and everyone hears the music together.

---

## ✨ Features

- **Zero-drift Sync** — Peer-to-peer audio synchronization via PeerJS/WebRTC with sub-50ms accuracy
- **Room System** — Create or join rooms with a simple room code or QR scan
- **Host Controls** — Host manages playback (play/pause/seek/skip) for everyone in the room
- **Shared Queue** — Build collaborative playlists in real-time
- **QR Code Join** — Scan to join a room instantly from any device
- **Responsive UI** — Works on desktop and mobile browsers

---

## 📸 Screenshots

<p align="center">
  <img width="800" alt="Landing page" src="https://github.com/user-attachments/assets/f40d4b30-5be4-4db6-bbfb-109b26701584" />
  <br/><em>Landing page — create or join a listening room</em>
</p>

<p align="center">
  <img width="800" alt="Join room popup" src="https://github.com/user-attachments/assets/8139fb09-4f23-4f7b-918f-4af565cf3af1" />
  <br/><em>Join room popup with room code entry and QR scan</em>
</p>

<p align="center">
  <img width="800" alt="Host controls" src="https://github.com/user-attachments/assets/aeec0b09-265d-4246-aced-a2f17d6efa4f" />
  <br/><em>Host playback controls with shared queue</em>
</p>

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16, React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| P2P | PeerJS (WebRTC) |
| Audio | Tone.js, Web Audio API |
| QR | html5-qrcode, qrcode |
| Animation | Framer Motion |

---

## 🚀 Getting Started

```bash
# Clone the repository
git clone https://github.com/jajos12/MeshBeat.git
cd MeshBeat

# Install dependencies
npm install

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 💡 How It Works

1. **Host creates a room** — generates a unique room ID and becomes the audio controller
2. **Peers join** — enter the room code or scan the QR code to connect via WebRTC
3. **Host plays music** — the audio signal and precise timestamp are broadcast to all peers
4. **Tone.js syncs playback** — each peer adjusts their local playback position to match the host's clock, compensating for network latency
5. **Real-time queue** — anyone can add tracks; the host controls playback order

---

## 📄 License

MIT
