# API Configuration Guide

## ✅ Current Setup

Your application is correctly configured to use the production API URL.

### API Base URL
```
https://mainexam.onrender.com/api
```

### How It Works

1. **Environment Configuration** (`client/.env.production`):
   ```
   REACT_APP_API_URL=https://mainexam.onrender.com/api
   ```

2. **API Utility** (`client/src/utils/api.js`):
   - Creates axios instance with base URL from environment variable
   - Automatically prepends `/api` to all endpoints
   - Handles authentication and token refresh

3. **Endpoint Examples**:
   - Login: `api.post('/auth/login')` → `https://mainexam.onrender.com/api/auth/login`
   - Register: `api.post('/auth/register')` → `https://mainexam.onrender.com/api/auth/register`
   - Get Exams: `api.get('/exam')` → `https://mainexam.onrender.com/api/exam`

## 🔧 Local Development

For local development, update `client/.env`:
```
REACT_APP_API_URL=http://localhost:5000/api
```

## 🚀 Production Deployment

The `.env.production` file is automatically used when building for production:
```bash
npm run build
```

## ✅ Verification

All API calls in your application use the `api` utility from `client/src/utils/api.js`, ensuring consistent endpoint formatting:

- ✅ AuthContext uses `api.post('/auth/login')`
- ✅ All pages import and use `api` utility
- ✅ No direct axios calls bypassing the configuration
- ✅ Automatic `/api` prefix on all endpoints

## 📝 Important Notes

1. The `.env` file is in `.gitignore` for security
2. `.env.production` is committed to the repository
3. All endpoints automatically get `/api` prefix
4. No code changes needed - configuration is centralized
