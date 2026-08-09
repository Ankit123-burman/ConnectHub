import React from 'react';

const LABELS = {
  good: 'Good',
  medium: 'Fair',
  poor: 'Poor',
  unknown: '…',
};

const ConnectionBadge = ({ quality = 'unknown' }) => {
  return (
    <div className={`conn-badge conn-badge--${quality}`} title={`Connection: ${LABELS[quality]}`}>
      <span className="conn-badge__dot" />
      {LABELS[quality]}
    </div>
  );
};

export default ConnectionBadge;
