# 🔒 SecureExam - E2E Encrypted Examination Platform

Full-stack secured online exam platform with **AES-256 encryption**, **fullscreen enforcement**, **3rd-party app detection**, and **comprehensive proctoring**.

## 🛡️ Security Features

### Encryption
- AES-256 encryption for questions & answers
- HMAC-SHA256 integrity verification
- Unique session keys per exam attempt

### Proctoring & Anti-Cheat
| Feature | Method |
|---------|--------|
| Tab switching | Page Visibility API + blur events |
| External apps | Window blur + focus duration tracking |
| Copy/Paste/Cut | Clipboard event blocking |
| Right-click | Context menu prevention |
| Keyboard shortcuts | Capture-phase keydown (Ctrl+C, F12, Alt+Tab, etc.) |
| Developer tools | Window size discrepancy + timing |
| Screenshots | PrintScreen blocking + clipboard clearing |
| Screen sharing | getDisplayMedia API interception |
| Multiple monitors | Screen API detection |
| Fullscreen exit | Fullscreen change events + auto re-prompt |
| Idle detection | 5-minute inactivity timer |
| Heartbeat | 30-second server health pings |

### Auth & Server Security
- bcrypt (12 rounds), JWT access+refresh rotation, account lockout
- Helmet.js, rate limiting, CORS, CSP, HSTS, HPP prevention

## 🚀 Quick Start

```bash
# Server
cd server && npm install && npm start

# Client (separate terminal)
cd client && npm install && npm start
```

Configure `server/.env` with your MongoDB URI and secrets.

## 📁 Structure

```
server/   → Express + MongoDB backend (models, routes, middleware, encryption)
client/   → React frontend (auth, dashboard, exam-taking, proctoring engine)
```

## Tech Stack
React 18 • Node.js/Express • MongoDB • CryptoJS • JWT • Helmet • Fullscreen API
