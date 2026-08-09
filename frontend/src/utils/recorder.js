// Composite recorder: draws every visible <video> element onto a hidden
// canvas each frame (so the recording matches what's on screen: grid layout,
// all participants), and mixes every stream's audio track together through
// a Web Audio destination node. The combined canvas video track + mixed
// audio track are fed into a single MediaRecorder.
//
// This is more involved than just recording your own camera, but it's what
// makes the recording actually useful — it captures the whole call.

export function createCompositeRecorder({ getVideoElements, getAudioStreams, width = 1280, height = 720 }) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  let rafId = null;
  let audioContext = null;
  let destination = null;
  let recorder = null;
  let chunks = [];
  const connectedSourceNodes = new Set();

  function drawFrame() {
    const videos = getVideoElements().filter((v) => v && v.readyState >= 2);
    ctx.fillStyle = '#111318';
    ctx.fillRect(0, 0, width, height);

    const count = videos.length || 1;
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);
    const cellW = width / cols;
    const cellH = height / rows;

    videos.forEach((video, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = col * cellW;
      const y = row * cellH;

      // preserve aspect ratio, letterbox if needed
      const vRatio = video.videoWidth / video.videoHeight || 16 / 9;
      const cRatio = cellW / cellH;
      let drawW = cellW;
      let drawH = cellH;
      if (vRatio > cRatio) {
        drawH = cellW / vRatio;
      } else {
        drawW = cellH * vRatio;
      }
      const dx = x + (cellW - drawW) / 2;
      const dy = y + (cellH - drawH) / 2;

      try {
        ctx.drawImage(video, dx, dy, drawW, drawH);
      } catch (e) {
        // video not ready this frame, skip
      }
    });

    rafId = requestAnimationFrame(drawFrame);
  }

  function start() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    destination = audioContext.createMediaStreamDestination();

    getAudioStreams().forEach((stream) => {
      if (!stream) return;
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) return;
      try {
        const source = audioContext.createMediaStreamSource(new MediaStream(audioTracks));
        source.connect(destination);
        connectedSourceNodes.add(source);
      } catch (e) {
        console.warn('Could not connect audio source to recorder', e);
      }
    });

    drawFrame();

    const canvasStream = canvas.captureStream(30);
    const combinedStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...destination.stream.getAudioTracks(),
    ]);

    chunks = [];
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus'
      : 'video/webm';

    recorder = new MediaRecorder(combinedStream, { mimeType });
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };
    recorder.start(1000);
  }

  function stop() {
    return new Promise((resolve) => {
      if (!recorder) {
        resolve(null);
        return;
      }
      recorder.onstop = () => {
        if (rafId) cancelAnimationFrame(rafId);
        connectedSourceNodes.forEach((n) => n.disconnect());
        connectedSourceNodes.clear();
        if (audioContext) audioContext.close();

        const blob = new Blob(chunks, { type: 'video/webm' });
        resolve(blob);
      };
      recorder.stop();
    });
  }

  return { start, stop };
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
