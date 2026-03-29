# Render Deployment Guide

## 🚨 Fix "Route not found" Error

The error occurs because your frontend is trying to reach `https://mainexam.onrender.com/api/auth/login` but the backend server isn't properly configured or running.

## ✅ Step-by-Step Deployment

### 1. Backend Deployment (Server)

#### A. Create Web Service on Render

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository: `v9014361-sudo/mainexam`
4. Select the `vijay` branch

#### B. Configure Build Settings

```
Name: mainexam-backend
Region: Choose closest to your users
Branch: vijay
Root Directory: server
Runtime: Node
Build Command: npm install
Start Command: npm start
```

#### C. Set Environment Variables

Go to "Environment" tab and add these variables:

```bash
NODE_ENV=production
PORT=5000

# MongoDB (your existing connection string)
MONGODB_URI=mongodb://vijay:vijaykumar123@ac-7ld365z-shard-00-00.9dta47c.mongodb.net:27017,ac-7ld365z-shard-00-01.9dta47c.mongodb.net:27017,ac-7ld365z-shard-00-02.9dta47c.mongodb.net:27017/mydb?ssl=true&replicaSet=atlas-dj0g49-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0

# JWT Secrets (CHANGE THESE!)
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production_2024_RANDOM_STRING
JWT_REFRESH_SECRET=your_refresh_secret_key_change_this_in_production_2024_RANDOM_STRING

# Encryption Key (32 characters)
ENCRYPTION_KEY=your_32_char_encryption_key_here_change_this

# Client URL (your frontend URL - will be set after frontend deployment)
CLIENT_URL=https://your-frontend-app.onrender.com

# Session & Rate Limiting
SESSION_EXPIRY=3600000
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=5000

# Allow startup without DB (optional)
ALLOW_START_WITHOUT_DB=false
```

#### D. Deploy Backend

1. Click "Create Web Service"
2. Wait for deployment to complete
3. Note your backend URL: `https://mainexam.onrender.com`
4. Test health endpoint: `https://mainexam.onrender.com/api/health`

### 2. Frontend Deployment (Client)

#### A. Update Environment Variable

Your `.env.production` is already set to:
```
REACT_APP_API_URL=https://mainexam.onrender.com/api
```

#### B. Create Static Site on Render

1. Go to Render Dashboard
2. Click "New +" → "Static Site"
3. Connect your GitHub repository: `v9014361-sudo/mainexam`
4. Select the `vijay` branch

#### C. Configure Build Settings

```
Name: mainexam-frontend
Branch: vijay
Root Directory: client
Build Command: npm install && npm run build
Publish Directory: build
```

#### D. Set Environment Variables

```bash
REACT_APP_API_URL=https://mainexam.onrender.com/api
```

#### E. Deploy Frontend

1. Click "Create Static Site"
2. Wait for deployment
3. Note your frontend URL: `https://mainexam-frontend.onrender.com`

### 3. Update Backend CORS

After frontend is deployed, update backend environment variable:

```bash
CLIENT_URL=https://mainexam-frontend.onrender.com
```

Then redeploy the backend service.

## 🔍 Troubleshooting

### Check Backend Health

Visit: `https://mainexam.onrender.com/api/health`

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-03-29T...",
  "uptime": 123.45,
  "security": "E2E Encrypted",
  "db": "connected",
  "degradedMode": false
}
```

### Check Backend Root

Visit: `https://mainexam.onrender.com/`

Expected response:
```json
{
  "message": "Secure Exam backend is running",
  "apiHealth": "/api/health",
  "db": "connected",
  "degradedMode": false
}
```

### Common Issues

#### 1. "Route not found" Error
- **Cause**: Backend not deployed or wrong URL
- **Fix**: Ensure backend is deployed and `REACT_APP_API_URL` is correct

#### 2. CORS Error
- **Cause**: Frontend URL not in `CLIENT_URL`
- **Fix**: Add frontend URL to backend's `CLIENT_URL` environment variable

#### 3. Database Connection Failed
- **Cause**: MongoDB URI incorrect or network issue
- **Fix**: Verify MongoDB Atlas allows connections from anywhere (0.0.0.0/0)

#### 4. 503 Service Unavailable
- **Cause**: Database disconnected
- **Fix**: Check MongoDB Atlas is running and connection string is correct

## 🚀 Alternative: Single Deployment

You can also deploy both frontend and backend together:

### Update server/server.js

The production block already serves the React build:
```javascript
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
}
```

### Build Script

Add to root `package.json`:
```json
{
  "scripts": {
    "install-all": "cd server && npm install && cd ../client && npm install",
    "build": "cd client && npm run build",
    "start": "cd server && npm start"
  }
}
```

### Render Configuration

```
Root Directory: .
Build Command: npm run install-all && npm run build
Start Command: npm start
```

## 📝 Security Checklist

Before going live:

- [ ] Change all JWT secrets to random strings
- [ ] Change encryption key to random 32-character string
- [ ] Verify MongoDB Atlas network access allows Render IPs
- [ ] Set `NODE_ENV=production`
- [ ] Update `CLIENT_URL` with actual frontend URL
- [ ] Test all API endpoints
- [ ] Test login/register functionality
- [ ] Test exam creation and taking
- [ ] Monitor logs for errors

## 🔗 Quick Links

- Backend Health: `https://mainexam.onrender.com/api/health`
- Backend Root: `https://mainexam.onrender.com/`
- Frontend: `https://your-frontend-url.onrender.com`
- MongoDB Atlas: https://cloud.mongodb.com/

## 📞 Support

If issues persist:
1. Check Render logs for backend errors
2. Check browser console for frontend errors
3. Verify all environment variables are set correctly
4. Test MongoDB connection from Render
