import React, { useEffect, useRef } from 'react';
import { MicOff, VideoOff } from 'lucide-react';
import ConnectionBadge from './ConnectionBadge.jsx';

const VideoTile = ({
  stream,
  emailId,
  isLocal = false,
  isMuted = false,
  isCameraOff = false,
  quality,
  registerNode,
}) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    if (registerNode) registerNode(videoRef.current);
    return () => {
      if (registerNode) registerNode(null);
    };
  }, [registerNode]);

  return (
    <div className="video-tile">
      {isCameraOff ? (
        <div className="video-tile__avatar">
          <span>{(emailId || '?').charAt(0).toUpperCase()}</span>
        </div>
      ) : (
        <video ref={videoRef} autoPlay playsInline muted={isLocal} />
      )}

      <div className="video-tile__overlay">
        <span className="video-tile__name">
          {emailId} {isLocal && '(You)'}
        </span>
        <div className="video-tile__icons">
          {isMuted && <MicOff size={14} />}
          {!isLocal && quality && <ConnectionBadge quality={quality} />}
        </div>
      </div>
    </div>
  );
};

export default VideoTile;
