# 🚨 Quick Fix for "Route not found" Error

## The Problem

Your frontend shows "Route not found" when trying to login because it's calling:
```
https://mainexam.onrender.com/api/auth/login
```

But the backend server isn't responding.

## ✅ Immediate Solutions

### Option 1: Check if Backend is Running

Open these URLs in your browser:

1. **Backend Root**: https://mainexam.onrender.com/
   - Should show: `{"message": "Secure Exam backend is running"}`

2. **Backend Health**: https://mainexam.onrender.com/api/health
   - Should show: `{"status": "ok", "db": "connected"}`

**If these don't work**, your backend isn't deployed or is down.

### Option 2: Deploy Backend on Render

#### Quick Deploy Steps:

1. **Go to Render**: https://dashboard.render.com/
2. **Create New Web Service**
3. **Connect GitHub**: Select `v9014361-sudo/mainexam` repo, `vijay` branch
4. **Configure**:
   ```
   Name: mainexam-backend
   Root Directory: server
   Build Command: npm install
   Start Command: npm start
   ```
5. **Add Environment Variables** (click "Advanced" → "Add Environment Variable"):
   ```
   NODE_ENV=production
   MONGODB_URI=mongodb://vijay:vijaykumar123@ac-7ld365z-shard-00-00.9dta47c.mongodb.net:27017,ac-7ld365z-shard-00-01.9dta47c.mongodb.net:27017,ac-7ld365z-shard-00-02.9dta47c.mongodb.net:27017/mydb?ssl=true&replicaSet=atlas-dj0g49-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0
   JWT_SECRET=your_super_secret_jwt_key_change_this_in_production_2024
   JWT_REFRESH_SECRET=your_refresh_secret_key_change_this_in_production_2024
   ENCRYPTION_KEY=your_32_char_encryption_key_here
   CLIENT_URL=http://localhost:3000
   ```
6. **Click "Create Web Service"**
7. **Wait 5-10 minutes** for deployment

### Option 3: Test Locally First

If you want to test locally before deploying:

```bash
# Terminal 1 - Start Backend
cd server
npm install
npm start

# Terminal 2 - Start Frontend
cd client
npm install
npm start
```

Then update `client/.env`:
```
REACT_APP_API_URL=http://localhost:5000/api
```

## 🔍 Verify Backend is Working

### Test with curl:

```bash
# Test health endpoint
curl https://mainexam.onrender.com/api/health

# Test login endpoint
curl -X POST https://mainexam.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

### Test in Browser Console:

Open browser console (F12) and run:

```javascript
fetch('https://mainexam.onrender.com/api/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)
```

## 🎯 Most Likely Issues

### 1. Backend Not Deployed
- **Solution**: Deploy backend on Render (see Option 2 above)

### 2. Backend URL Wrong
- **Check**: Is your backend actually at `mainexam.onrender.com`?
- **Fix**: Update `client/.env.production` with correct URL

### 3. MongoDB Connection Failed
- **Check**: Render logs for "MongoDB connection failed"
- **Fix**: Verify MongoDB Atlas allows connections from `0.0.0.0/0`

### 4. CORS Error
- **Check**: Browser console shows CORS error
- **Fix**: Add frontend URL to backend `CLIENT_URL` environment variable

## 📋 Checklist

- [ ] Backend deployed on Render
- [ ] Backend URL is `https://mainexam.onrender.com`
- [ ] Backend health endpoint returns `{"status": "ok"}`
- [ ] MongoDB connection is successful
- [ ] Frontend `.env.production` has correct backend URL
- [ ] Frontend is rebuilt after changing `.env.production`
- [ ] CORS is configured with frontend URL

## 🆘 Still Not Working?

### Check Render Logs:

1. Go to Render Dashboard
2. Click on your backend service
3. Click "Logs" tab
4. Look for errors

### Common Log Errors:

- **"MongoDB connection failed"**: Check MongoDB URI
- **"CORS blocked"**: Add frontend URL to `CLIENT_URL`
- **"Port already in use"**: Render handles this automatically
- **"Module not found"**: Run `npm install` in build command

## 📞 Next Steps

1. **Deploy backend** if not already deployed
2. **Test health endpoint**: https://mainexam.onrender.com/api/health
3. **Rebuild frontend** with correct API URL
4. **Deploy frontend** on Render
5. **Update CORS** with frontend URL

See `RENDER-DEPLOYMENT-GUIDE.md` for detailed deployment instructions.
