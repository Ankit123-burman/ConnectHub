import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSocket } from '../provider/Socket.jsx';
import { usePeer } from '../provider/Peer.jsx';
import VideoTile from '../components/VideoTile.jsx';
import Controls from '../components/Controls.jsx';
import ChatPanel from '../components/ChatPanel.jsx';
import { createCompositeRecorder, downloadBlob } from '../utils/recorder.js';
import { X } from 'lucide-react';

function Room() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { socket } = useSocket();
  const {
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
  } = usePeer();

  const emailId = sessionStorage.getItem('emailId');
  const roomPassword = sessionStorage.getItem('roomPassword') || '';

  const [myStream, setMyStream] = useState(null);
  const [participants, setParticipants] = useState(new Map()); // socketId -> emailId
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [callDuration, setCallDuration] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [devices, setDevices] = useState({ cameras: [], mics: [] });
  const [selectedCamera, setSelectedCamera] = useState('');
  const [selectedMic, setSelectedMic] = useState('');
  const [fatalError, setFatalError] = useState('');

  const participantsRef = useRef(new Map());
  const videoNodesRef = useRef(new Map()); // socketId | 'local' -> video DOM node
  const localVideoTrackRef = useRef(null); // original camera track, saved during screen share
  const recorderRef = useRef(null);
  const joinedRef = useRef(false);
  const myStreamRef = useRef(null); // always holds the LATEST stream, used by the unmount cleanup

  useEffect(() => {
    participantsRef.current = participants;
  }, [participants]);

  useEffect(() => {
    myStreamRef.current = myStream;
  }, [myStream]);

  const registerVideoNode = useCallback((key) => (node) => {
    if (node) videoNodesRef.current.set(key, node);
    else videoNodesRef.current.delete(key);
  }, []);

  // ---------- ICE relay helper ----------
  const sendIceCandidate = useCallback(
    (remoteSocketId, candidate) => {
      socket.emit('signal', { to: remoteSocketId, type: 'ice-candidate', data: candidate });
    },
    [socket]
  );

  // ---------- 1. Get local media, then join the room ----------
  useEffect(() => {
    if (!emailId) {
      navigate('/');
      return;
    }
    let cancelled = false;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localVideoTrackRef.current = stream.getVideoTracks()[0] || null;
        setMyStream(stream);
        setLocalStream(stream);
      } catch (err) {
        console.error('getUserMedia failed', err);
        setFatalError(
          'Could not access camera/microphone. Make sure you are on HTTPS or localhost, and that permissions are granted.'
        );
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!myStream || !socket || joinedRef.current) return;
    joinedRef.current = true;
    socket.emit('join-room', { roomId, emailId, password: roomPassword });
  }, [myStream, socket, roomId, emailId, roomPassword]);

  // ---------- 2. Signaling ----------
  useEffect(() => {
    if (!socket) return;

    const onJoinError = ({ message }) => {
      alert(message || 'Could not join room');
      navigate('/');
    };

    const onJoinedRoom = async ({ users }) => {
      const map = new Map();
      users.forEach((u) => map.set(u.socketId, u.emailId));
      setParticipants((prev) => new Map([...prev, ...map]));

      // We're the new joiner: initiate an offer to each existing participant.
      for (const u of users) {
        const offer = await createOfferFor(u.socketId, sendIceCandidate);
        socket.emit('signal', { to: u.socketId, type: 'offer', data: offer, emailId });
      }
    };

    const onUserJoined = ({ socketId, emailId: newEmailId }) => {
      setParticipants((prev) => new Map(prev).set(socketId, newEmailId));
      // We do NOT initiate an offer here — the new joiner initiates to us
      // (see onJoinedRoom above). This one-directional rule avoids glare.
    };

    const onSignal = async ({ from, type, data, emailId: fromEmailId }) => {
      if (fromEmailId && !participantsRef.current.has(from)) {
        setParticipants((prev) => new Map(prev).set(from, fromEmailId));
      }

      if (type === 'offer') {
        const answer = await createAnswerFor(from, data, sendIceCandidate);
        socket.emit('signal', { to: from, type: 'answer', data: answer, emailId });
      } else if (type === 'answer') {
        await setRemoteAnswerFor(from, data);
      } else if (type === 'ice-candidate') {
        await addIceCandidateFor(from, data);
      }
    };

    const onUserLeft = ({ socketId }) => {
      removePeer(socketId);
      setParticipants((prev) => {
        const next = new Map(prev);
        next.delete(socketId);
        return next;
      });
    };

    const onChatMessage = (payload) => {
      setMessages((prev) => [...prev, payload]);
    };

    socket.on('join-error', onJoinError);
    socket.on('joined-room', onJoinedRoom);
    socket.on('user-joined', onUserJoined);
    socket.on('signal', onSignal);
    socket.on('user-left', onUserLeft);
    socket.on('chat-message', onChatMessage);

    return () => {
      socket.off('join-error', onJoinError);
      socket.off('joined-room', onJoinedRoom);
      socket.off('user-joined', onUserJoined);
      socket.off('signal', onSignal);
      socket.off('user-left', onUserLeft);
      socket.off('chat-message', onChatMessage);
    };
  }, [socket, createOfferFor, createAnswerFor, setRemoteAnswerFor, addIceCandidateFor, removePeer, sendIceCandidate, emailId, navigate]);

  // ---------- 3. Cleanup on unmount ----------
  // IMPORTANT: this effect has an empty dependency array so it only runs
  // once, on mount — which means its cleanup closure is created ONCE too.
  // If we referenced `myStream` (state) directly here, the closure would
  // permanently capture whatever `myStream` was on that FIRST render (null,
  // since getUserMedia hasn't resolved yet) — so `myStream.getTracks()`
  // would never run and the camera light would stay on after leaving.
  // Using a ref instead always reads the CURRENT value at cleanup time.
  useEffect(() => {
    return () => {
      if (socket) socket.emit('leave-room');
      closeAll();
      if (myStreamRef.current) {
        myStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- 4. Call timer ----------
  useEffect(() => {
    if (!myStream) return;
    const start = Date.now();
    const interval = setInterval(() => setCallDuration((Date.now() - start) / 1000), 1000);
    return () => clearInterval(interval);
  }, [myStream]);

  // ---------- 5. Connection quality polling ----------
  useEffect(() => {
    const interval = setInterval(pollStats, 2500);
    return () => clearInterval(interval);
  }, [pollStats]);

  // ---------- Controls ----------
  const toggleMute = () => {
    if (!myStream) return;
    myStream.getAudioTracks().forEach((t) => (t.enabled = isMuted));
    setIsMuted((v) => !v);
  };

  const toggleCamera = () => {
    if (!myStream) return;
    myStream.getVideoTracks().forEach((t) => (t.enabled = isCameraOff));
    setIsCameraOff((v) => !v);
  };

  const toggleScreenShare = async () => {
    if (!isSharingScreen) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];
        replaceTrackOnAllPeers(screenTrack);

        // Swap what the LOCAL preview shows too, so you can see you're sharing.
        setMyStream((prev) => {
          const next = new MediaStream([screenTrack, ...prev.getAudioTracks()]);
          return next;
        });

        screenTrack.onended = () => stopScreenShare();
        setIsSharingScreen(true);
      } catch (err) {
        console.error('getDisplayMedia failed', err);
      }
    } else {
      stopScreenShare();
    }
  };

  const stopScreenShare = () => {
    if (localVideoTrackRef.current) {
      replaceTrackOnAllPeers(localVideoTrackRef.current);
      setMyStream((prev) => {
        const audioTracks = prev ? prev.getAudioTracks() : [];
        return new MediaStream([localVideoTrackRef.current, ...audioTracks]);
      });
    }
    setIsSharingScreen(false);
  };

  const toggleRecording = async () => {
    if (!isRecording) {
      recorderRef.current = createCompositeRecorder({
        getVideoElements: () => Array.from(videoNodesRef.current.values()),
        getAudioStreams: () => [myStream, ...Array.from(remoteStreams.values())],
      });
      recorderRef.current.start();
      setIsRecording(true);
    } else {
      const blob = await recorderRef.current.stop();
      setIsRecording(false);
      if (blob) downloadBlob(blob, `call-recording-${roomId}-${Date.now()}.webm`);
    }
  };

  const sendChatMessage = (message) => {
    socket.emit('chat-message', { message });
    setMessages((prev) => [...prev, { emailId, message, time: Date.now(), socketId: 'me' }]);
  };

  const openSettings = async () => {
    const list = await navigator.mediaDevices.enumerateDevices();
    setDevices({
      cameras: list.filter((d) => d.kind === 'videoinput'),
      mics: list.filter((d) => d.kind === 'audioinput'),
    });
    setShowSettings(true);
  };

  const applyDevice = async (kind, deviceId) => {
    try {
      const constraints = kind === 'camera' ? { video: { deviceId: { exact: deviceId } } } : { audio: { deviceId: { exact: deviceId } } };
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      const newTrack = kind === 'camera' ? newStream.getVideoTracks()[0] : newStream.getAudioTracks()[0];

      replaceTrackOnAllPeers(newTrack);

      setMyStream((prev) => {
        const others = kind === 'camera' ? prev.getAudioTracks() : prev.getVideoTracks();
        const oldTrack = kind === 'camera' ? prev.getVideoTracks()[0] : prev.getAudioTracks()[0];
        if (oldTrack) oldTrack.stop();
        if (kind === 'camera') localVideoTrackRef.current = newTrack;
        return new MediaStream(kind === 'camera' ? [newTrack, ...others] : [...others, newTrack]);
      });

      if (kind === 'camera') setSelectedCamera(deviceId);
      else setSelectedMic(deviceId);
    } catch (err) {
      console.error('applyDevice failed', err);
    }
  };

  const leaveCall = () => {
    // Stop tracks and notify the server RIGHT NOW, rather than only relying
    // on the unmount cleanup effect — this guarantees the camera light
    // turns off immediately on click, not whenever React gets around to
    // unmounting the component.
    if (socket) socket.emit('leave-room');
    closeAll();
    if (myStreamRef.current) {
      myStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    navigate('/');
  };

  if (fatalError) {
    return (
      <div className="room-error">
        <h2>Camera/Microphone Error</h2>
        <p>{fatalError}</p>
        <button className="btn-primary" onClick={() => navigate('/')}>
          Back to home
        </button>
      </div>
    );
  }

  const remoteEntries = Array.from(participants.entries());

  return (
    <div className="room-page">
      <header className="room-header">
        <div>
          <h1>Room {roomId}</h1>
          <span className="room-header__count">{remoteEntries.length + 1} in call</span>
        </div>
      </header>

      <div className="room-body">
        <div className="video-grid" data-count={remoteEntries.length + 1}>
          <VideoTile
            stream={myStream}
            emailId={emailId}
            isLocal
            isMuted={isMuted}
            isCameraOff={isCameraOff}
            registerNode={registerVideoNode('local')}
          />
          {remoteEntries.map(([socketId, remoteEmailId]) => (
            <VideoTile
              key={socketId}
              stream={remoteStreams.get(socketId)}
              emailId={remoteEmailId}
              quality={connectionStats.get(socketId)?.quality || 'unknown'}
              registerNode={registerVideoNode(socketId)}
            />
          ))}
        </div>

        {isChatOpen && (
          <ChatPanel
            messages={messages}
            onSend={sendChatMessage}
            onClose={() => setIsChatOpen(false)}
            myEmailId={emailId}
          />
        )}
      </div>

      <Controls
        isMuted={isMuted}
        isCameraOff={isCameraOff}
        isSharingScreen={isSharingScreen}
        isRecording={isRecording}
        isChatOpen={isChatOpen}
        participantCount={remoteEntries.length + 1}
        callDuration={callDuration}
        onToggleMute={toggleMute}
        onToggleCamera={toggleCamera}
        onToggleScreenShare={toggleScreenShare}
        onToggleRecording={toggleRecording}
        onToggleChat={() => setIsChatOpen((v) => !v)}
        onOpenSettings={openSettings}
        onLeave={leaveCall}
      />

      {showSettings && (
        <div className="modal-backdrop" onClick={() => setShowSettings(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h3>Device Settings</h3>
              <button className="icon-btn" onClick={() => setShowSettings(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="form-group">
              <label>Camera</label>
              <select value={selectedCamera} onChange={(e) => applyDevice('camera', e.target.value)}>
                <option value="" disabled>
                  Select camera
                </option>
                {devices.cameras.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || 'Camera'}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Microphone</label>
              <select value={selectedMic} onChange={(e) => applyDevice('mic', e.target.value)}>
                <option value="" disabled>
                  Select microphone
                </option>
                {devices.mics.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || 'Microphone'}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Room;
