import React from 'react';
import {
  Mic, MicOff, Video, VideoOff, ScreenShare, ScreenShareOff,
  MessageSquare, Circle, Square, PhoneOff, Settings, Users,
} from 'lucide-react';

const Controls = ({
  isMuted,
  isCameraOff,
  isSharingScreen,
  isRecording,
  isChatOpen,
  participantCount,
  callDuration,
  onToggleMute,
  onToggleCamera,
  onToggleScreenShare,
  onToggleRecording,
  onToggleChat,
  onOpenSettings,
  onLeave,
}) => {
  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="controls-bar">
      <div className="controls-bar__left">
        <span className="call-timer">{formatDuration(callDuration)}</span>
        <span className="participant-count">
          <Users size={14} /> {participantCount}
        </span>
      </div>

      <div className="controls-bar__center">
        <button className={`ctrl-btn ${isMuted ? 'ctrl-btn--danger' : ''}`} onClick={onToggleMute} title={isMuted ? 'Unmute' : 'Mute'}>
          {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
        </button>

        <button className={`ctrl-btn ${isCameraOff ? 'ctrl-btn--danger' : ''}`} onClick={onToggleCamera} title={isCameraOff ? 'Turn camera on' : 'Turn camera off'}>
          {isCameraOff ? <VideoOff size={20} /> : <Video size={20} />}
        </button>

        <button className={`ctrl-btn ${isSharingScreen ? 'ctrl-btn--active' : ''}`} onClick={onToggleScreenShare} title="Share screen">
          {isSharingScreen ? <ScreenShareOff size={20} /> : <ScreenShare size={20} />}
        </button>

        <button className={`ctrl-btn ${isRecording ? 'ctrl-btn--recording' : ''}`} onClick={onToggleRecording} title={isRecording ? 'Stop recording' : 'Start recording'}>
          {isRecording ? <Square size={18} fill="currentColor" /> : <Circle size={20} />}
        </button>

        <button className={`ctrl-btn ${isChatOpen ? 'ctrl-btn--active' : ''}`} onClick={onToggleChat} title="Chat">
          <MessageSquare size={20} />
        </button>

        <button className="ctrl-btn" onClick={onOpenSettings} title="Device settings">
          <Settings size={20} />
        </button>

        <button className="ctrl-btn ctrl-btn--leave" onClick={onLeave} title="Leave call">
          <PhoneOff size={20} />
        </button>
      </div>

      <div className="controls-bar__right">
        {isRecording && (
          <span className="recording-indicator">
            <span className="recording-indicator__dot" /> REC
          </span>
        )}
      </div>
    </div>
  );
};

export default Controls;
