# ConnectHub — Group Video Calling App

WebRTC-based group video calling app (mesh topology, up to 6 participants),
built with React + Vite (frontend) and Node/Express/Socket.IO (backend signaling server).

## Features

- Group video calls (mesh WebRTC, up to 6 participants per room)
- Modern dark theme UI
- Room password protection
- In-call text chat
- Mute / camera toggle, device (camera/mic) selection
- Screen sharing
- Composite call recording (records the whole grid, downloads as `.webm`)
- Live connection quality indicator (Good / Fair / Poor) per participant
- Call duration timer

## Project structure

```
video-call-app/
  backend/    -> Express + Socket.IO signaling server (port 4000)
  frontend/   -> React + Vite app (port 5173)
```

## Setup

### 1. Backend

```bash
cd backend
npm install
npm start
```

Runs the signaling server on `http://localhost:4000`.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs the app on `http://localhost:5173`. Open it, enter your name, create or
join a room, and you're in.

## IMPORTANT: Camera access over the network (HTTPS requirement)

Browsers only allow `getUserMedia()` (camera/mic access) on a **secure
context**: `https://`, `localhost`, or `127.0.0.1`. Plain `http://<local-ip>`
(e.g. `http://192.168.1.5:5173`) will be blocked by Chrome with a
"secure context" error — this is a browser policy, not a bug in this app.

To test across multiple devices on the same Wi-Fi:

**Option A — mkcert (recommended for repeated local testing)**
```bash
brew install mkcert   # or see https://github.com/FiloSottile/mkcert for your OS
mkcert -install
mkcert localhost 192.168.1.5   # replace with your actual local IP
```
Then configure Vite (`vite.config.js`) and the backend to use the generated
cert/key with HTTPS. Access the app via `https://192.168.1.5:5173`.

**Option B — ngrok (fastest for a one-off demo)**

The free ngrok plan only allows **one tunnel at a time**, so this project
is set up to need only ONE public URL:

```bash
# terminal 1 — backend (stays local, never exposed directly)
cd backend && npm start

# terminal 2 — frontend
cd frontend && npm run dev

# terminal 3 — the ONE ngrok tunnel, pointed at the frontend
ngrok http 5173
# or, with your reserved static domain:
ngrok http --url=your-static-domain.ngrok-free.dev 5173
```

Open the ngrok URL it gives you (or your static domain) — that's it. Vite's
dev server proxies `/socket.io` and `/api` requests through to the backend
on `localhost:4000` internally (see the `proxy` block in `vite.config.js`),
so the browser only ever talks to the one ngrok origin. You do **not** need
a second tunnel for the backend.

If you specifically want the backend on a different host later, override
`VITE_SOCKET_URL` / `VITE_API_URL` in `frontend/.env` — but for the default
single-tunnel ngrok setup, leave them unset.

**Option C — Chrome flag (dev-only, single machine)**
Visit `chrome://flags/#unsafely-treat-insecure-origin-as-secure`, add your
`http://192.168.x.x:5173` origin, relaunch Chrome. Not suitable for a real
demo since it only affects that one browser instance.

## Environment variables (optional)

Only needed if your backend runs on a genuinely different host than your
frontend (e.g. two separate ngrok tunnels on a paid plan, or a real
deployment). Create `frontend/.env`:

```
VITE_SOCKET_URL=https://your-backend-host
VITE_API_URL=https://your-backend-host
```

For the default single-tunnel local/ngrok setup described above, leave
`.env` unset — same-origin + the Vite proxy handles everything.

## Architecture notes

- **Mesh WebRTC**: every participant holds one `RTCPeerConnection` per other
  participant. This keeps the app simple and serverless-media, but doesn't
  scale past small groups — a production app with large rooms would use an
  SFU (e.g. LiveKit, mediasoup) instead.
- **Signaling**: a single `signal` Socket.IO event carries offers, answers,
  and ICE candidates, targeted at a specific participant's `socketId`.
- **Glare avoidance**: only the newly-joined participant initiates offers to
  everyone already in the room; existing participants only ever answer. This
  avoids both sides creating offers simultaneously.
- **Recording**: implemented client-side. All visible video tiles are drawn
  onto a hidden `<canvas>` every frame (so the recording matches the on-screen
  grid), and every stream's audio track is mixed through a Web Audio
  `MediaStreamDestination`. Both are fed into one `MediaRecorder`, so you get
  a single `.webm` file with everyone's audio and video — not just your own
  camera.
