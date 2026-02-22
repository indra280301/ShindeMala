import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import api from '../api/axios';

// Users assets
import bgImage from '../assets/restaurant_night_bg.png';
import logoImage from '../assets/shinde_mala_logo_yellow.png';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const setAuth = useStore((state) => state.setAuth);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await api.post('/auth/login', { username, password });
      setAuth(data.user, data.token);
      if (data.user.role === 'waiter') {
        navigate('/orders');
      } else {
        navigate('/');
      }
    } catch (err) {
      console.error('Network Error:', err);
      setError(err.response?.data?.error || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@300;500;700&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Poppins:wght@200;400;600&display=swap');

          @keyframes breathe {
            0% { box-shadow: 0 0 15px rgba(212, 175, 55, 0.2); border-color: rgba(212, 175, 55, 0.3); }
            50% { box-shadow: 0 0 35px rgba(212, 175, 55, 0.5); border-color: rgba(212, 175, 55, 0.6); }
            100% { box-shadow: 0 0 15px rgba(212, 175, 55, 0.2); border-color: rgba(212, 175, 55, 0.3); }
          }

          @keyframes glint {
            0% { left: -150%; }
            100% { left: 150%; }
          }

          .login-wrapper {
            height: 100vh;
            width: 100vw;
            display: flex;
            justify-content: center;
            align-items: center;
            background: radial-gradient(circle at center, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.8) 100%), url(${bgImage});
            background-size: cover;
            background-position: center;
            font-family: 'Poppins', sans-serif;
            overflow: hidden;
          }

          .heritage-card {
            position: relative;
            width: 440px;
            padding: 65px 50px;
            background: linear-gradient(145deg, rgba(40, 26, 21, 0.95) 0%, rgba(20, 10, 8, 0.98) 100%);
            backdrop-filter: blur(12px);
            border-radius: 40px;
            border: 1px solid rgba(212, 175, 55, 0.3);
            text-align: center;
            animation: breathe 5s ease-in-out infinite;
            z-index: 5;
          }

          .heritage-card::before {
            content: "";
            position: absolute;
            inset: 15px;
            border: 1px solid rgba(212, 175, 55, 0.15);
            border-radius: 30px;
            pointer-events: none;
          }

          .warli-corner {
            position: absolute;
            width: 90px;
            height: 90px;
            pointer-events: none;
          }

          .warli-corner svg { fill: #d4af37; opacity: 0.7; }
          .tl { top: 20px; left: 20px; }
          .tr { top: 20px; right: 20px; transform: rotate(90deg); }
          .bl { bottom: 20px; left: 20px; transform: rotate(-90deg); }
          .br { bottom: 20px; right: 20px; transform: rotate(180deg); }

          .brand-logo {
            width: 210px;
            margin-bottom: 5px;
            filter: drop-shadow(0 0 12px rgba(212, 175, 55, 0.4));
          }

          .tagline {
            font-family: 'Playfair Display', serif;
            font-style: italic;
            color: #d4af37;
            font-size: 1.1rem;
            margin-bottom: 40px;
            opacity: 0.9;
            letter-spacing: 1px;
          }

          .input-container {
            margin-bottom: 25px;
            text-align: left;
          }

          .marathi-label {
            font-family: 'Noto Sans Devanagari', sans-serif;
            color: #e6c768;
            font-size: 0.9rem;
            margin-bottom: 10px;
            display: block;
            font-weight: 500;
            letter-spacing: 0.5px;
          }

          .styled-input {
            width: 100%;
            padding: 16px 20px;
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(212, 175, 55, 0.2);
            border-radius: 14px;
            color: #fff;
            font-size: 1rem;
            outline: none;
            transition: 0.4s;
            box-sizing: border-box;
          }

          .styled-input:focus {
            background: rgba(255, 255, 255, 0.07);
            border-color: #d4af37;
            box-shadow: inset 0 0 8px rgba(212, 175, 55, 0.1);
          }

          .error-message {
            color: #ff6b6b;
            font-size: 0.9rem;
            margin-bottom: 15px;
            background: rgba(255, 107, 107, 0.1);
            padding: 10px;
            border-radius: 8px;
            border: 1px solid rgba(255, 107, 107, 0.3);
          }

          .premium-btn {
            position: relative;
            width: 100%;
            padding: 18px;
            background: linear-gradient(135deg, #d4af37 0%, #b38f2d 100%);
            border: none;
            border-radius: 16px;
            color: #1a0f0d;
            font-size: 1.1rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 2px;
            cursor: pointer;
            overflow: hidden;
            box-shadow: 0 8px 25px rgba(0,0,0,0.4);
            transition: 0.3s;
            margin-top: 5px;
          }

          .premium-btn::after {
            content: "";
            position: absolute;
            top: 0;
            height: 100%;
            width: 50px;
            background: rgba(255, 255, 255, 0.3);
            transform: skewX(-45deg);
            animation: glint 4s infinite;
          }

          .premium-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 30px rgba(212, 175, 55, 0.3);
            filter: brightness(1.1);
          }

          .link-box {
            margin-top: 35px;
            display: flex;
            justify-content: space-between;
          }

          .lovable-link {
            color: rgba(212, 175, 55, 0.6);
            font-size: 0.8rem;
            text-decoration: none;
            transition: 0.3s;
            cursor: pointer;
            border-bottom: 1px solid transparent;
          }

          .lovable-link:hover {
            color: #fff;
            border-bottom: 1px solid #d4af37;
          }

          .welcome-marathi {
            font-family: 'Noto Sans Devanagari', sans-serif;
            font-size: 0.8rem;
            color: rgba(212, 175, 55, 0.4);
            margin-top: 15px;
            display: block;
          }
        `}
      </style>

      <div className="login-wrapper">
        <div className="heritage-card">
          {['tl', 'tr', 'bl', 'br'].map(pos => (
            <div key={pos} className={`warli-corner ${pos}`}>
              <svg viewBox="0 0 100 100"><path d="M0 0 L30 0 L30 5 L5 5 L5 30 L0 30 Z" /></svg>
            </div>
          ))}

          <img src={logoImage} alt="Shinde Mala" className="brand-logo" />
          <p className="tagline">Traditional Taste, Modern Service</p>

          <form onSubmit={handleLogin}>
            <div className="input-container">
              <label className="marathi-label">वापरकर्तानाव / Username</label>
              <input
                type="text"
                className="styled-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="input-container">
              <label className="marathi-label">पासवर्ड / Password</label>
              <input
                type="password"
                className="styled-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" className="premium-btn" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div className="link-box">
            <span className="lovable-link">Forgot Password?</span>
            <span className="lovable-link">New Account</span>
          </div>

          <span className="welcome-marathi">तुमचे स्वागत आहे</span>
        </div>
      </div>
    </>
  );
};

export default Login;
