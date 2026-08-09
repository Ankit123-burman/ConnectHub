import React, { createContext, useContext, useRef, useState, useCallback } from 'react';

const PeerContext = createContext(null);
export const usePeer = () => useContext(PeerContext);

// STUN alone is NOT enough for every network. STUN only helps when both
// peers are behind "easy" NATs that allow direct peer-to-peer traffic once
// each side knows its own public IP/port. If either peer is behind a
// symmetric NAT, a strict corporate/campus firewall, or certain mobile
// carrier networks, direct P2P is blocked entirely — ICE will silently get
// stuck in "checking" forever with no error thrown. A TURN server relays
// the media through a third-party server in that case, at the cost of
// slightly higher latency.
//
// The TURN servers below (openrelay.metered.ca) are a FREE, public,
// rate-limited service meant for development/testing — fine for demos and
// resume projects, but for real production use get your own TURN
// credentials (e.g. Twilio, Xirsys, or self-hosted coturn) since the free
// one can be slow or unavailable under load.
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' },
    { urls: 'stun:openrelay.metered.ca:80' },
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
};

// Mesh topology: every participant holds ONE RTCPeerConnection per OTHER
// participant. For a 6-person call that's up to 5 connections per browser.
// Fine for small groups (this app caps rooms at 6); a large-scale app would
// switch to an SFU (e.g. mediasoup/LiveKit) instead of full mesh.
export const PeerProvider = ({ children }) => {
  const peersRef = useRef(new Map()); // socketId -> RTCPeerConnection
  const localStreamRef = useRef(null);

  const [remoteStreams, setRemoteStreams] = useState(new Map()); // socketId -> MediaStream
  const [connectionStats, setConnectionStats] = useState(new Map()); // socketId -> { quality, rtt }

  const setLocalStream = useCallback((stream) => {
    localStreamRef.current = stream;
  }, []);

  const createPeerConnection = useCallback((remoteSocketId, onIceCandidate) => {
    const existing = peersRef.current.get(remoteSocketId);
    if (existing) return existing;

    const pc = new RTCPeerConnection(ICE_SERVERS);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    pc.onicecandidate = (ev) => {
      if (ev.candidate) onIceCandidate(remoteSocketId, ev.candidate);
    };

    pc.ontrack = (ev) => {
      setRemoteStreams((prev) => {
        const next = new Map(prev);
        next.set(remoteSocketId, ev.streams[0]);
        return next;
      });
    };

    // Debug logging — open the browser console to see exactly where a
    // failing connection gets stuck. "checking" that never advances to
    // "connected"/"completed" almost always means no usable ICE candidate
    // pair was found (commonly: no TURN server + a restrictive NAT).
    pc.oniceconnectionstatechange = () => {
      console.log(`[peer ${remoteSocketId}] ICE state:`, pc.iceConnectionState);
    };
    pc.onconnectionstatechange = () => {
      console.log(`[peer ${remoteSocketId}] connection state:`, pc.connectionState);
    };

    peersRef.current.set(remoteSocketId, pc);
    return pc;
  }, []);

  const createOfferFor = useCallback(
    async (remoteSocketId, onIceCandidate) => {
      const pc = createPeerConnection(remoteSocketId, onIceCandidate);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      return offer;
    },
    [createPeerConnection]
  );

  const createAnswerFor = useCallback(
    async (remoteSocketId, offer, onIceCandidate) => {
      const pc = createPeerConnection(remoteSocketId, onIceCandidate);
      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      return answer;
    },
    [createPeerConnection]
  );

  const setRemoteAnswerFor = useCallback(async (remoteSocketId, answer) => {
    const pc = peersRef.current.get(remoteSocketId);
    if (!pc) return;
    await pc.setRemoteDescription(answer);
  }, []);

  const addIceCandidateFor = useCallback(async (remoteSocketId, candidate) => {
    const pc = peersRef.current.get(remoteSocketId);
    if (!pc) return;
    try {
      await pc.addIceCandidate(candidate);
    } catch (e) {
      console.error('addIceCandidate failed', e);
    }
  }, []);

  const removePeer = useCallback((remoteSocketId) => {
    const pc = peersRef.current.get(remoteSocketId);
    if (pc) {
      pc.close();
      peersRef.current.delete(remoteSocketId);
    }
    setRemoteStreams((prev) => {
      const next = new Map(prev);
      next.delete(remoteSocketId);
      return next;
    });
    setConnectionStats((prev) => {
      const next = new Map(prev);
      next.delete(remoteSocketId);
      return next;
    });
  }, []);

  // Used when toggling screen-share <-> camera: swaps the outgoing track on
  // every existing peer connection without renegotiating from scratch.
  const replaceTrackOnAllPeers = useCallback((track) => {
    peersRef.current.forEach((pc) => {
      const sender = pc.getSenders().find((s) => s.track && s.track.kind === track.kind);
      if (sender) sender.replaceTrack(track);
    });
  }, []);

  const pollStats = useCallback(async () => {
    const results = new Map();
    for (const [socketId, pc] of peersRef.current.entries()) {
      try {
        const stats = await pc.getStats();
        let rtt = null;
        let packetsLost = 0;
        let packetsReceived = 0;

        stats.forEach((report) => {
          if (report.type === 'candidate-pair' && report.state === 'succeeded' && report.currentRoundTripTime != null) {
            rtt = report.currentRoundTripTime;
          }
          if (report.type === 'inbound-rtp' && report.kind === 'video') {
            packetsLost += report.packetsLost || 0;
            packetsReceived += report.packetsReceived || 0;
          }
        });

        let quality = 'good';
        if (rtt != null) {
          if (rtt > 0.3) quality = 'poor';
          else if (rtt > 0.15) quality = 'medium';
        }
        const total = packetsLost + packetsReceived;
        const lossRatio = total > 0 ? packetsLost / total : 0;
        if (lossRatio > 0.05 && quality === 'good') quality = 'medium';
        if (lossRatio > 0.15) quality = 'poor';

        results.set(socketId, { quality, rtt });
      } catch (e) {
        // stats not available yet, skip
      }
    }
    setConnectionStats(results);
  }, []);

  const closeAll = useCallback(() => {
    peersRef.current.forEach((pc) => pc.close());
    peersRef.current.clear();
    setRemoteStreams(new Map());
    setConnectionStats(new Map());
  }, []);

  return (
    <PeerContext.Provider
      value={{
        setLocalStream,
        createOfferFor,
        createAnswerFor,
        setRemoteAnswerFor,
        addIceCandidateFor,
        removePeer,
        replaceTrackOnAllPeers,
        remoteStreams,
        connectionStats,
        pollStats,
        closeAll,
      }}
    >
      {children}
    </PeerContext.Provider>
  );
};
