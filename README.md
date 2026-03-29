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
| Fullscreen exit | 8 chances with 30-second grace period per exit |
| Idle detection | 5-minute inactivity timer |
| Heartbeat | 30-second server health pings |

### Auth & Server Security
- bcrypt (12 rounds), JWT access+refresh rotation, account lockout
- Helmet.js, rate limiting, CORS, CSP, HSTS, HPP prevention
- Login with email or roll number

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd secure-exam

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### Configuration

1. **Server Configuration** (`server/.env`):
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/secure_exam_db
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_REFRESH_SECRET=your-refresh-secret-key-change-this
NODE_ENV=development
CLIENT_URL=http://localhost:3000
```

2. **Client Configuration** (`client/.env`):
```env
REACT_APP_API_URL=http://localhost:5000/api
```

### Running the Application

**Development Mode:**

```bash
# Terminal 1 - Start MongoDB
mongod

# Terminal 2 - Start Server
cd server
npm start

# Terminal 3 - Start Client
cd client
npm start
```

**Production Mode:**

```bash
# Build client
cd client
npm run build

# Start server (serves built client)
cd ../server
NODE_ENV=production npm start
```

## 📁 Project Structure

```
secure-exam/
├── client/                 # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── context/       # React context (Auth)
│   │   ├── pages/         # Page components
│   │   ├── styles/        # Global styles
│   │   └── utils/         # Utilities (API, encryption, proctor)
│   └── package.json
│
├── server/                # Express backend
│   ├── controllers/       # Request handlers
│   ├── middleware/        # Auth, rate limiting, audit
│   ├── models/           # MongoDB schemas
│   ├── routes/           # API routes
│   ├── scripts/          # Utility scripts
│   ├── tests/            # Test suites
│   ├── utils/            # Utilities (encryption, compiler, etc.)
│   ├── server.js         # Main server file
│   └── package.json
│
└── README.md
```

## 🎯 Key Features

### For Students
- **Secure Exam Taking**: Fullscreen mode with 8 exit chances (30-second grace period each)
- **Coding Questions**: Built-in code editor with multiple language support (C, C++, Java, Python)
- **Custom Input Testing**: Test code with custom inputs before submission
- **Public Test Cases**: View sample test cases during the exam
- **Real-time Feedback**: Instant violation alerts and countdown timers
- **Login Options**: Login with email or roll number

### For Teachers
- **Exam Creation**: Create exams with MCQ, True/False, Short Answer, and Coding questions
- **Live Monitoring**: Real-time student activity and violation tracking
- **Analytics Dashboard**: Comprehensive exam statistics and performance metrics
- **Violation Details**: Detailed logs of all security violations
- **Manual Grading**: Edit marks and add remarks for individual students
- **Bulk Operations**: Upload students via Excel/CSV, export results

### For Administrators
- **User Management**: Create and manage students, teachers, and admins
- **Bulk Upload**: Import users from Excel/CSV files
- **Audit Logs**: Complete system activity tracking
- **Workflow Automation**: Automated actions based on exam events
- **System Settings**: Configure security policies and exam settings

## 🔧 Advanced Configuration

### Concurrent User Capacity

The system is optimized for **400+ concurrent students**:

- MongoDB connection pool: 150 connections
- API rate limit: 5000 requests per 15 minutes
- Proctoring rate limit: 8000 requests per 5 minutes

**For higher capacity**, see `CONCURRENT-CAPACITY.md`

### Production Deployment

**Using PM2 (Recommended):**

```bash
cd server
npm install -g pm2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

**Server Requirements (400 students):**
- CPU: 8 cores / 16 threads
- RAM: 16GB
- Network: 1 Gbps
- MongoDB: Atlas M30+ or dedicated cluster

### Database Management

**Clear all exam data:**
```bash
cd server
npm run clear:exams        # Delete all exams and sessions
npm run clear:sessions     # Delete only sessions (keep exams)
npm run list:exams         # List all exams
```

**Recalculate scores for terminated exams:**
```bash
cd server
npm run migrate:scores
```

## 🧪 Testing

```bash
# Server tests
cd server
npm run test              # Run all tests
npm run test:encryption   # Test encryption
npm run test:compiler     # Test code compiler
npm run security-audit    # Security audit

# Client tests
cd client
npm test
```

## 📚 API Documentation

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login (email or roll number)
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Exams
- `GET /api/exam/my-exams` - Get user's exams
- `POST /api/exam/create` - Create exam (teacher)
- `POST /api/exam/:id/start` - Start exam attempt
- `POST /api/exam/:id/submit` - Submit exam
- `GET /api/exam/:id/results` - Get exam results

### Proctoring
- `POST /api/proctor/violation/:sessionId` - Report violation
- `POST /api/proctor/heartbeat/:sessionId` - Send heartbeat
- `GET /api/proctor/violations/:sessionId` - Get violation details

### Admin
- `GET /api/admin/users` - Get all users
- `POST /api/admin/users` - Create user
- `POST /api/admin/users/bulk-upload` - Bulk upload users
- `GET /api/admin/audit-logs` - Get audit logs

## 🔐 Security Best Practices

1. **Change default secrets** in `.env` files
2. **Use HTTPS** in production
3. **Enable MongoDB authentication**
4. **Set up firewall rules**
5. **Regular backups** of database
6. **Monitor logs** for suspicious activity
7. **Keep dependencies updated**

## 🐛 Troubleshooting

### MongoDB Connection Error
```bash
# Check if MongoDB is running
mongod --version
# Start MongoDB
mongod
```

### Port Already in Use
```bash
# Change PORT in server/.env
PORT=5001
```

### CORS Errors
```bash
# Add your client URL to server/.env
CLIENT_URL=http://localhost:3000
```

### Fullscreen Not Working
- Ensure browser supports Fullscreen API
- Check browser permissions
- Try different browser (Chrome/Firefox recommended)

## 📖 Additional Documentation

- `CONCURRENT-CAPACITY.md` - Scaling for 400+ concurrent users
- `CLEAR-EXAM-DATA-GUIDE.md` - Database cleanup procedures
- `DELETE-ALL-EXAMS.md` - How to delete all exam data
- `ROLL-NUMBER-LOGIN.md` - Roll number login feature details

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Built with React 18, Node.js/Express, and MongoDB
- Uses CryptoJS for encryption
- Proctoring powered by browser APIs
- UI inspired by modern design principles

## 📧 Support

For issues and questions:
- Open an issue on GitHub
- Check existing documentation
- Review troubleshooting section

---

**Tech Stack:** React 18 • Node.js/Express • MongoDB • CryptoJS • JWT • Helmet • Fullscreen API

**Version:** 1.0.0
