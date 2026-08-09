import React, { useEffect, useRef, useState } from "react";

const STAR_COUNT = 90;
const W = 600;
const H = 800;

function generateStars() {
  const stars = [];
  for (let i = 0; i < STAR_COUNT; i++) {
    stars.push({
      id: i,
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.3 + 0.4,
      op: Math.random() * 0.6 + 0.35,
      dur: (Math.random() * 4 + 3).toFixed(2),
      delay: (Math.random() * 5).toFixed(2),
    });
  }
  return stars;
}

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function buildConstellationLines(stars) {
  const used = new Set();
  const lines = [];
  for (let i = 0; i < stars.length && lines.length < 7; i++) {
    if (used.has(i)) continue;
    let nearest = -1;
    let best = 9999;
    for (let j = 0; j < stars.length; j++) {
      if (i === j || used.has(j)) continue;
      const d = dist(stars[i], stars[j]);
      if (d < best && d < 90) {
        best = d;
        nearest = j;
      }
    }
    if (nearest !== -1) {
      lines.push({
        id: `${i}-${nearest}`,
        x1: stars[i].x,
        y1: stars[i].y,
        x2: stars[nearest].x,
        y2: stars[nearest].y,
        delay: 300 + lines.length * 250,
      });
      used.add(i);
      used.add(nearest);
    }
  }
  return lines;
}

function pad(n) {
  return String(n).padStart(2, "0");
}

export default function Login() {
  const [stars] = useState(generateStars);
  const [lines] = useState(() => buildConstellationLines(stars));
  const [linesOn, setLinesOn] = useState({});
  const [ra, setRa] = useState(32);
  const [dec, setDec] = useState(52);
  const [seeing, setSeeing] = useState("1.4");
  const tickRef = useRef(0);

  useEffect(() => {
    const timers = lines.map((line) =>
      setTimeout(() => {
        setLinesOn((prev) => ({ ...prev, [line.id]: true }));
      }, line.delay)
    );
    return () => timers.forEach(clearTimeout);
  }, [lines]);

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduceMotion) return;

    const interval = setInterval(() => {
      setRa((prev) => (prev + 1) % 60);
      setDec((prev) => (prev + 1) % 60);
      tickRef.current += 1;
      if (tickRef.current % 3 === 0) {
        setSeeing((1.1 + Math.random() * 0.6).toFixed(1));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Public+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

        .meridian-root, .meridian-root *{ box-sizing: border-box; }

        .meridian-root{
          --sky:#0B0E1A;
          --sky-deep:#1B1F33;
          --cream:#F2EEE3;
          --gold:#C9A227;
          --gold-bright:#E0BC4C;
          --blue:#5B7FA6;
          font-family:'Public Sans', sans-serif;
          background:var(--cream);
          color:var(--sky);
          min-height:100vh;
        }

        .meridian-wrap{
          display:flex;
          min-height:100vh;
        }

        .meridian-sky{
          position:relative;
          flex:1.15;
          min-width:0;
          background:
            radial-gradient(ellipse at 30% 20%, var(--sky-deep) 0%, var(--sky) 55%),
            var(--sky);
          overflow:hidden;
          display:flex;
          flex-direction:column;
          justify-content:space-between;
          padding:48px 44px;
        }

        .meridian-sky svg{
          position:absolute;
          inset:0;
          width:100%;
          height:100%;
        }

        .meridian-star{
          fill:var(--cream);
          animation:meridian-twinkle 5s ease-in-out infinite;
        }

        @keyframes meridian-twinkle{
          0%,100%{opacity:var(--base-op,0.85);}
          50%{opacity:calc(var(--base-op,0.85) * 0.35);}
        }

        .meridian-constellation-line{
          stroke:var(--blue);
          stroke-width:1;
          opacity:0;
          transition:opacity 1.8s ease;
        }
        .meridian-constellation-line.on{opacity:0.55;}

        .meridian-brand{
          position:relative;
          z-index:2;
          font-family:'Fraunces', serif;
          font-weight:500;
          font-size:1.25rem;
          letter-spacing:0.08em;
          color:var(--cream);
          display:flex;
          align-items:center;
          gap:10px;
        }

        .meridian-brand .dot{
          width:7px;
          height:7px;
          border-radius:50%;
          background:var(--gold-bright);
          box-shadow:0 0 8px 2px rgba(224,188,76,0.6);
        }

        .meridian-sky-copy{
          position:relative;
          z-index:2;
          max-width:340px;
        }

        .meridian-sky-copy h1{
          font-family:'Fraunces', serif;
          font-weight:400;
          font-size:clamp(1.7rem, 3vw, 2.2rem);
          line-height:1.25;
          color:var(--cream);
          margin:0 0 14px;
        }

        .meridian-sky-copy p{
          font-size:0.92rem;
          line-height:1.6;
          color:var(--blue);
          margin:0;
        }

        .meridian-readout{
          position:relative;
          z-index:2;
          font-family:'JetBrains Mono', monospace;
          font-size:0.72rem;
          color:var(--blue);
          letter-spacing:0.02em;
          display:flex;
          gap:22px;
        }

        .meridian-readout .field{
          display:flex;
          flex-direction:column;
          gap:3px;
        }

        .meridian-readout .label{
          color:rgba(91,127,166,0.65);
          font-size:0.62rem;
          text-transform:uppercase;
          letter-spacing:0.12em;
        }

        .meridian-readout .value{
          color:var(--gold-bright);
          font-variant-numeric:tabular-nums;
        }

        .meridian-panel{
          flex:1;
          min-width:0;
          display:flex;
          align-items:center;
          justify-content:center;
          padding:48px 40px;
          background:var(--cream);
        }

        .meridian-form-inner{
          width:100%;
          max-width:360px;
        }

        .meridian-form-inner .eyebrow{
          font-family:'JetBrains Mono', monospace;
          font-size:0.7rem;
          letter-spacing:0.14em;
          text-transform:uppercase;
          color:var(--blue);
          margin:0 0 10px;
        }

        .meridian-form-inner h2{
          font-family:'Fraunces', serif;
          font-weight:500;
          font-size:1.85rem;
          margin:0 0 8px;
          color:var(--sky);
        }

        .meridian-form-inner .sub{
          font-size:0.92rem;
          color:#5b5847;
          margin:0 0 32px;
          line-height:1.5;
        }

        .meridian-form{
          display:flex;
          flex-direction:column;
          gap:18px;
        }

        .meridian-field-group{
          display:flex;
          flex-direction:column;
          gap:7px;
        }

        .meridian-field-group label{
          font-size:0.78rem;
          font-weight:600;
          color:var(--sky);
          letter-spacing:0.01em;
        }

        .meridian-field-group input{
          font-family:'Public Sans', sans-serif;
          font-size:0.95rem;
          padding:12px 14px;
          border:1.5px solid rgba(11,14,26,0.15);
          border-radius:6px;
          background:#fff;
          color:var(--sky);
          outline:none;
          transition:border-color 0.15s ease, box-shadow 0.15s ease;
          width:100%;
        }

        .meridian-field-group input::placeholder{
          color:rgba(11,14,26,0.32);
        }

        .meridian-field-group input:focus-visible{
          border-color:var(--gold);
          box-shadow:0 0 0 3px rgba(201,162,39,0.18);
        }

        .meridian-row-between{
          display:flex;
          align-items:center;
          justify-content:space-between;
          font-size:0.82rem;
        }

        .meridian-remember{
          display:flex;
          align-items:center;
          gap:7px;
          color:#5b5847;
        }

        .meridian-remember input{
          accent-color:var(--gold);
          width:14px;
          height:14px;
        }

        .meridian-forgot{
          color:var(--blue);
          text-decoration:none;
          font-weight:500;
        }
        .meridian-forgot:hover{text-decoration:underline;}
        .meridian-forgot:focus-visible{outline:2px solid var(--gold);outline-offset:3px;border-radius:3px;}

        .meridian-signin-btn{
          margin-top:6px;
          font-family:'Public Sans', sans-serif;
          font-size:0.95rem;
          font-weight:600;
          letter-spacing:0.01em;
          color:var(--sky);
          background:var(--gold);
          border:none;
          border-radius:6px;
          padding:13px 18px;
          cursor:pointer;
          display:flex;
          align-items:center;
          justify-content:center;
          gap:8px;
          transition:background 0.15s ease, transform 0.1s ease;
        }

        .meridian-signin-btn:hover{background:var(--gold-bright);}
        .meridian-signin-btn:active{transform:translateY(1px);}
        .meridian-signin-btn:focus-visible{outline:2px solid var(--sky);outline-offset:3px;}

        .meridian-signin-btn svg{transition:transform 0.15s ease;}
        .meridian-signin-btn:hover svg{transform:translateX(3px);}

        .meridian-divider{
          display:flex;
          align-items:center;
          gap:12px;
          margin:26px 0 20px;
          color:rgba(11,14,26,0.35);
          font-size:0.75rem;
        }
        .meridian-divider::before,.meridian-divider::after{
          content:"";
          flex:1;
          height:1px;
          background:rgba(11,14,26,0.12);
        }

        .meridian-apply-line{
          text-align:center;
          font-size:0.88rem;
          color:#5b5847;
        }
        .meridian-apply-line a{
          color:var(--sky);
          font-weight:600;
          text-decoration:none;
          border-bottom:1.5px solid var(--gold);
        }
        .meridian-apply-line a:hover{color:var(--gold);}

        @media (max-width:860px){
          .meridian-wrap{flex-direction:column;}
          .meridian-sky{
            min-height:260px;
            padding:32px 28px;
          }
          .meridian-sky-copy{display:none;}
          .meridian-panel{padding:40px 28px 56px;}
        }

        @media (prefers-reduced-motion: reduce){
          .meridian-star{animation:none;}
        }
      `}</style>

      <div className="meridian-root">
        <div className="meridian-wrap">
          {/* SKY PANEL */}
          <div className="meridian-sky">
            <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice">
              {lines.map((line) => (
                <line
                  key={line.id}
                  x1={line.x1}
                  y1={line.y1}
                  x2={line.x2}
                  y2={line.y2}
                  className={`meridian-constellation-line${
                    linesOn[line.id] ? " on" : ""
                  }`}
                />
              ))}
              {stars.map((star) => (
                <circle
                  key={star.id}
                  cx={star.x}
                  cy={star.y}
                  r={star.r}
                  className="meridian-star"
                  style={{
                    "--base-op": star.op,
                    animationDuration: `${star.dur}s`,
                    animationDelay: `${star.delay}s`,
                  }}
                />
              ))}
            </svg>

            <div className="meridian-brand">
              <span className="dot" />
              MERIDIAN
            </div>

            <div className="meridian-sky-copy">
              <h1>Your telescope is waiting under a clear sky somewhere else.</h1>
              <p>
                Sign in to check tonight's queue, review your last capture, or
                reserve time on the array.
              </p>
            </div>

            <div className="meridian-readout">
              <div className="field">
                <span className="label">Right Ascension</span>
                <span className="value">05h 34m {pad(ra)}s</span>
              </div>
              <div className="field">
                <span className="label">Declination</span>
                <span className="value">+22° 00′ {pad(dec)}″</span>
              </div>
              <div className="field">
                <span className="label">Seeing</span>
                <span className="value">{seeing}″</span>
              </div>
            </div>
          </div>

          {/* FORM PANEL */}
          <div className="meridian-panel">
            <div className="meridian-form-inner">
              <p className="eyebrow">Observatory access</p>
              <h2>Sign in</h2>
              <p className="sub">Enter your credentials to reach the control deck.</p>

              <form
                className="meridian-form"
                onSubmit={(e) => e.preventDefault()}
              >
                <div className="meridian-field-group">
                  <label htmlFor="meridian-email">Email</label>
                  <input
                    type="email"
                    id="meridian-email"
                    name="email"
                    placeholder="you@observatory.org"
                    autoComplete="email"
                    required
                  />
                </div>

                <div className="meridian-field-group">
                  <label htmlFor="meridian-password">Password</label>
                  <input
                    type="password"
                    id="meridian-password"
                    name="password"
                    placeholder="••••••••••"
                    autoComplete="current-password"
                    required
                  />
                </div>

                <div className="meridian-row-between">
                  <label className="meridian-remember">
                    <input type="checkbox" id="meridian-remember" />
                    Keep me signed in
                  </label>
                  <a href="#" className="meridian-forgot">
                    Forgot password?
                  </a>
                </div>

                <button type="submit" className="meridian-signin-btn">
                  Sign in
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path
                      d="M2 7H12M12 7L7.5 2.5M12 7L7.5 11.5"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </form>

              <div className="meridian-divider">or</div>

              <p className="meridian-apply-line">
                New observer? <a href="#">Apply for access</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}