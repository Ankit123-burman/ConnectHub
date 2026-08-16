import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Video, ArrowRight, Loader2, User, Mail, Lock, CheckCircle2, AlertCircle } from 'lucide-react';

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
  return String(n).padStart(2, '0');
}

export default function LoginPage() {
  const { login, register, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [stars] = useState(generateStars);
  const [lines] = useState(() => buildConstellationLines(stars));
  const [linesOn, setLinesOn] = useState({});
  const [ra, setRa] = useState(32);
  const [dec, setDec] = useState(52);
  const [seeing, setSeeing] = useState('1.4');
  const tickRef = useRef(0);

  // If already authenticated, redirect to home or previous location
  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

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
      '(prefers-reduced-motion: reduce)'
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }

    if (mode === 'register') {
      if (!name.trim()) {
        setError('Please enter your full name.');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }

      setSubmitting(true);
      const res = await register(name, email, password);
      setSubmitting(false);

      if (res.success) {
        setSuccessMsg('Account created successfully! Redirecting…');
        setTimeout(() => {
          navigate(from, { replace: true });
        }, 600);
      } else {
        setError(res.message);
      }
    } else {
      setSubmitting(true);
      const res = await login(email, password);
      setSubmitting(false);

      if (res.success) {
        setSuccessMsg('Signed in successfully! Redirecting…');
        setTimeout(() => {
          navigate(from, { replace: true });
        }, 500);
      } else {
        setError(res.message);
      }
    }
  };

  const switchMode = (newMode) => {
    setError('');
    setSuccessMsg('');
    setMode(newMode);
  };

  return (
    <div className="login-root-container">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Public+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

        .meridian-root, .meridian-root *{ box-sizing: border-box; }

        .meridian-root{
          --sky:#0B0E1A;
          --sky-deep:#1B1F33;
          --cream:#F2EEE3;
          --gold:#C9A227;
          --gold-bright:#E0BC4C;
          --blue:#5B7FA6;
          --accent-blue:#4A7BFF;
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
          font-weight:600;
          font-size:1.35rem;
          letter-spacing:0.04em;
          color:var(--cream);
          display:flex;
          align-items:center;
          gap:10px;
        }

        .meridian-brand .dot{
          width:9px;
          height:9px;
          border-radius:50%;
          background:var(--gold-bright);
          box-shadow:0 0 10px 3px rgba(224,188,76,0.6);
        }

        .meridian-sky-copy{
          position:relative;
          z-index:2;
          max-width:380px;
        }

        .meridian-sky-copy h1{
          font-family:'Fraunces', serif;
          font-weight:400;
          font-size:clamp(1.8rem, 3vw, 2.3rem);
          line-height:1.25;
          color:var(--cream);
          margin:0 0 14px;
        }

        .meridian-sky-copy p{
          font-size:0.95rem;
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
          overflow-y:auto;
        }

        .meridian-form-inner{
          width:100%;
          max-width:380px;
        }

        .meridian-tab-header {
          display: flex;
          background: rgba(11, 14, 26, 0.07);
          padding: 4px;
          border-radius: 8px;
          margin-bottom: 24px;
        }

        .meridian-tab-btn {
          flex: 1;
          padding: 9px 12px;
          background: transparent;
          border: none;
          font-family: 'Public Sans', sans-serif;
          font-size: 0.88rem;
          font-weight: 600;
          color: #5b5847;
          border-radius: 6px;
          transition: all 0.18s ease;
          cursor: pointer;
        }

        .meridian-tab-btn.active {
          background: #ffffff;
          color: var(--sky);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }

        .meridian-form-inner .eyebrow{
          font-family:'JetBrains Mono', monospace;
          font-size:0.7rem;
          letter-spacing:0.14em;
          text-transform:uppercase;
          color:var(--blue);
          margin:0 0 8px;
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
          margin:0 0 24px;
          line-height:1.5;
        }

        .meridian-form{
          display:flex;
          flex-direction:column;
          gap:16px;
        }

        .meridian-field-group{
          display:flex;
          flex-direction:column;
          gap:6px;
        }

        .meridian-field-group label{
          font-size:0.78rem;
          font-weight:600;
          color:var(--sky);
          letter-spacing:0.01em;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .meridian-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .meridian-field-group input{
          font-family:'Public Sans', sans-serif;
          font-size:0.95rem;
          padding:11px 14px;
          border:1.5px solid rgba(11,14,26,0.15);
          border-radius:6px;
          background:#fff;
          color:var(--sky);
          outline:none;
          transition:border-color 0.15s ease, box-shadow 0.15s ease;
          width:100%;
        }

        .meridian-field-group input::placeholder{
          color:rgba(11,14,26,0.35);
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
          margin-top: 2px;
        }

        .meridian-remember{
          display:flex;
          align-items:center;
          gap:7px;
          color:#5b5847;
          cursor: pointer;
        }

        .meridian-remember input{
          accent-color:var(--gold);
          width:15px;
          height:15px;
        }

        .meridian-forgot{
          color:var(--blue);
          text-decoration:none;
          font-weight:500;
        }
        .meridian-forgot:hover{text-decoration:underline;}

        .meridian-signin-btn{
          margin-top:8px;
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

        .meridian-signin-btn:hover:not(:disabled){background:var(--gold-bright);}
        .meridian-signin-btn:active:not(:disabled){transform:translateY(1px);}
        .meridian-signin-btn:disabled{
          opacity: 0.7;
          cursor: not-allowed;
        }

        .meridian-alert-error {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #ffe3e3;
          border: 1px solid #ffb8b8;
          color: #d63333;
          padding: 10px 12px;
          border-radius: 6px;
          font-size: 0.85rem;
          margin-bottom: 6px;
        }

        .meridian-alert-success {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #e6f9ed;
          border: 1px solid #b4eec9;
          color: #1b874b;
          padding: 10px 12px;
          border-radius: 6px;
          font-size: 0.85rem;
          margin-bottom: 6px;
        }

        .meridian-divider{
          display:flex;
          align-items:center;
          gap:12px;
          margin:22px 0 16px;
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
          margin: 0;
        }
        .meridian-apply-line button{
          background: none;
          border: none;
          padding: 0;
          font: inherit;
          color:var(--sky);
          font-weight:600;
          cursor: pointer;
          border-bottom:1.5px solid var(--gold);
        }
        .meridian-apply-line button:hover{color:var(--gold);}

        @media (max-width:860px){
          .meridian-wrap{flex-direction:column;}
          .meridian-sky{
            min-height:220px;
            padding:28px 24px;
          }
          .meridian-sky-copy{display:none;}
          .meridian-panel{padding:36px 24px 48px;}
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
                    linesOn[line.id] ? ' on' : ''
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
                    '--base-op': star.op,
                    animationDuration: `${star.dur}s`,
                    animationDelay: `${star.delay}s`,
                  }}
                />
              ))}
            </svg>

            <div className="meridian-brand">
              <span className="dot" />
              <Video size={22} color="var(--gold-bright)" />
              ConnectHub
            </div>

            <div className="meridian-sky-copy">
              <h1>Real-time encrypted mesh video conferencing.</h1>
              <p>
                Secure and fast peer-to-peer rooms. Sign in to launch instant video calls, collaborate with teammates, and share screens with low latency.
              </p>
            </div>

            <div className="meridian-readout">
              <div className="field">
                <span className="label">Node ID</span>
                <span className="value">05h 34m {pad(ra)}s</span>
              </div>
              <div className="field">
                <span className="label">Network</span>
                <span className="value">+22° 00′ {pad(dec)}″</span>
              </div>
              <div className="field">
                <span className="label">Latency Index</span>
                <span className="value">{seeing} ms</span>
              </div>
            </div>
          </div>

          {/* FORM PANEL */}
          <div className="meridian-panel">
            <div className="meridian-form-inner">
              <div className="meridian-tab-header">
                <button
                  type="button"
                  className={`meridian-tab-btn ${mode === 'login' ? 'active' : ''}`}
                  onClick={() => switchMode('login')}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  className={`meridian-tab-btn ${mode === 'register' ? 'active' : ''}`}
                  onClick={() => switchMode('register')}
                >
                  Create Account
                </button>
              </div>

              <p className="eyebrow">Authentication Deck</p>
              <h2>{mode === 'login' ? 'Welcome back' : 'Get started'}</h2>
              <p className="sub">
                {mode === 'login'
                  ? 'Sign in to access your video rooms and instant calling.'
                  : 'Register a free account to create and manage rooms.'}
              </p>

              {error && (
                <div className="meridian-alert-error">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              {successMsg && (
                <div className="meridian-alert-success">
                  <CheckCircle2 size={16} />
                  <span>{successMsg}</span>
                </div>
              )}

              <form className="meridian-form" onSubmit={handleSubmit}>
                {mode === 'register' && (
                  <div className="meridian-field-group">
                    <label htmlFor="reg-name">
                      <User size={14} /> Full Name
                    </label>
                    <input
                      type="text"
                      id="reg-name"
                      placeholder="e.g. John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                )}

                <div className="meridian-field-group">
                  <label htmlFor="auth-email">
                    <Mail size={14} /> Email Address
                  </label>
                  <input
                    type="email"
                    id="auth-email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>

                <div className="meridian-field-group">
                  <label htmlFor="auth-password">
                    <Lock size={14} /> Password
                  </label>
                  <input
                    type="password"
                    id="auth-password"
                    placeholder="••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    required
                  />
                </div>

                {mode === 'register' && (
                  <div className="meridian-field-group">
                    <label htmlFor="auth-confirm-password">
                      <Lock size={14} /> Confirm Password
                    </label>
                    <input
                      type="password"
                      id="auth-confirm-password"
                      placeholder="••••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      required
                    />
                  </div>
                )}

                {mode === 'login' && (
                  <div className="meridian-row-between">
                    <label className="meridian-remember">
                      <input type="checkbox" defaultChecked />
                      Remember me
                    </label>
                  </div>
                )}

                <button
                  type="submit"
                  className="meridian-signin-btn"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="spin-icon" />
                      {mode === 'login' ? 'Signing in…' : 'Creating account…'}
                    </>
                  ) : (
                    <>
                      {mode === 'login' ? 'Sign In' : 'Create Account'}
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>

              <div className="meridian-divider">or</div>

              <p className="meridian-apply-line">
                {mode === 'login' ? (
                  <>
                    New user?{' '}
                    <button type="button" onClick={() => switchMode('register')}>
                      Create an account
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{' '}
                    <button type="button" onClick={() => switchMode('login')}>
                      Sign in here
                    </button>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
