# Vercel Deployment Fix

## 🚨 Current Issues

1. Frontend calling wrong URL: `mainexam.onrender.com` instead of `mainexam-1.onrender.com`
2. CORS blocking requests from `https://mainexam-gamma.vercel.app`

## ✅ Fix Steps

### 1. Update Vercel Environment Variable

Go to your Vercel project settings:

1. **Go to**: https://vercel.com/dashboard
2. **Select your project**: `mainexam`
3. **Click**: Settings → Environment Variables
4. **Add/Update**:
   ```
   Name: REACT_APP_API_URL
   Value: https://mainexam-1.onrender.com/api
   ```
5. **Apply to**: Production, Preview, Development
6. **Click**: Save

### 2. Redeploy on Vercel

After updating the environment variable:

1. Go to **Deployments** tab
2. Click **"Redeploy"** on the latest deployment
3. Wait 2-3 minutes

### 3. Update Backend CORS on Render

Go to your Render backend service:

1. **Go to**: https://dashboard.render.com/
2. **Select**: `mainexam-1` service
3. **Click**: Environment
4. **Find**: `CLIENT_URL` variable
5. **Update to**:
   ```
   https://mainexam-gamma.vercel.app
   ```
6. **Click**: Save Changes
7. Service will auto-redeploy

### 4. Test

After both redeploy:

1. Visit: `https://mainexam-gamma.vercel.app`
2. Try to login
3. Should work without CORS errors

## 🔍 Verify Settings

### Check Frontend is using correct API:

Open browser console on your Vercel site and run:
```javascript
console.log(process.env.REACT_APP_API_URL)
```

Should show: `https://mainexam-1.onrender.com/api`

### Check Backend allows your frontend:

The backend `CLIENT_URL` should be:
```
https://mainexam-gamma.vercel.app
```

## 📝 Summary

**Frontend (Vercel):**
- Environment Variable: `REACT_APP_API_URL=https://mainexam-1.onrender.com/api`

**Backend (Render):**
- Environment Variable: `CLIENT_URL=https://mainexam-gamma.vercel.app`

Both must match for CORS to work!
