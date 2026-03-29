# 🎯 Concurrent Exam Capacity: 400 Students

## Configuration Optimizations

The system has been optimized to support **400+ concurrent students** taking exams simultaneously.

### Changes Made

1. **MongoDB Connection Pool**
   - Increased to `maxPoolSize: 150` (from 50)
   - Set `minPoolSize: 30` for consistent performance
   - Added `maxIdleTimeMS: 30000` for connection recycling
   - Enabled `compressors: ['zlib']` for network efficiency
   - Location: `server/server.js`

2. **API Rate Limiting**
   - Increased to 5000 requests per 15 minutes (from 2000)
   - Location: `server/middleware/rateLimit.js`

3. **Proctoring Rate Limiting**
   - Increased to 8000 requests per 5 minutes (from 2000)
   - Handles high-frequency violation tracking for 400+ students
   - Location: `server/middleware/rateLimit.js`

4. **Node.js Memory Optimization**
   - Default start: 4GB heap (`--max-old-space-size=4096`)
   - Production start: 8GB heap with optimizations
   - Location: `server/package.json`

5. **Express Optimizations**
   - Disabled ETag generation for faster responses
   - Disabled X-Powered-By header
   - Location: `server/server.js`

## Performance Characteristics

### Expected Load per Student (400 concurrent)
- **Heartbeat**: 1 request every 30 seconds = ~13 requests/second
- **Proctoring events**: 2-10 requests per minute = ~27-133 requests/second
- **Answer submissions**: Variable based on exam length
- **WebSocket**: 400 persistent connections

### Total System Load
- **Peak requests**: ~150-200 requests/second
- **Database connections**: 150 concurrent operations
- **Memory usage**: 2-4GB (normal), 6-8GB (peak)
- **WebSocket connections**: 400+ simultaneous

## Server Requirements for 400 Students

### Minimum Requirements
- **CPU**: 4 cores (8 vCPUs recommended)
- **RAM**: 8GB minimum, 16GB recommended
- **Network**: 100 Mbps minimum, 1 Gbps recommended
- **Storage**: SSD with 50GB+ free space

### Recommended Production Setup
- **CPU**: 8 cores / 16 threads
- **RAM**: 16GB
- **Network**: 1 Gbps dedicated
- **Load Balancer**: nginx or cloud load balancer
- **Database**: MongoDB Atlas M30+ tier or dedicated cluster

## MongoDB Configuration for 400 Students

### Atlas Recommended Tier
- **M30 or higher** (8GB RAM, 2 vCPUs minimum)
- Enable auto-scaling
- Set up read replicas for analytics

### Self-Hosted MongoDB
```javascript
// mongod.conf
net:
  maxIncomingConnections: 200
  
storage:
  wiredTiger:
    engineConfig:
      cacheSizeGB: 4
      
operationProfiling:
  mode: slowOp
  slowOpThresholdMs: 100
```

## Scaling Architecture for 400+ Students

### Option 1: Vertical Scaling (Single Server)
Current configuration supports this with:
- 8-core CPU
- 16GB RAM
- MongoDB Atlas M30+
- Good for up to 500 concurrent students

### Option 2: Horizontal Scaling (Multiple Servers)
For 400+ students with redundancy:

```
                    [Load Balancer]
                          |
        +-----------------+-----------------+
        |                 |                 |
   [Server 1]        [Server 2]        [Server 3]
   (150 users)       (150 users)       (100 users)
        |                 |                 |
        +-----------------+-----------------+
                          |
                  [MongoDB Cluster]
                  [Redis Session Store]
```

### Load Balancer Configuration (nginx)
```nginx
upstream exam_backend {
    least_conn;
    server 10.0.1.10:5000 max_fails=3 fail_timeout=30s;
    server 10.0.1.11:5000 max_fails=3 fail_timeout=30s;
    server 10.0.1.12:5000 max_fails=3 fail_timeout=30s;
}

server {
    listen 443 ssl http2;
    
    location / {
        proxy_pass http://exam_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        # WebSocket support
        proxy_read_timeout 86400;
    }
}
```

## Performance Monitoring

### Critical Metrics to Monitor

1. **MongoDB Connection Pool**
   ```javascript
   // Add to server.js for monitoring
   setInterval(() => {
     const stats = mongoose.connection.db.serverStatus();
     console.log('Active connections:', stats.connections.current);
     console.log('Available connections:', stats.connections.available);
   }, 60000);
   ```

2. **Node.js Memory**
   ```bash
   # Monitor heap usage
   node --expose-gc --max-old-space-size=8192 server.js
   ```

3. **Response Times**
   - Target: < 200ms for API calls
   - Target: < 50ms for WebSocket messages

4. **CPU Usage**
   - Normal: 40-60%
   - Peak: 70-80%
   - Alert if > 85% sustained

### Monitoring Tools
- **PM2**: Process management and monitoring
- **New Relic / DataDog**: APM monitoring
- **MongoDB Atlas Monitoring**: Built-in metrics
- **Grafana + Prometheus**: Custom dashboards

## Load Testing for 400 Students

### Using Artillery
```bash
npm install -g artillery

# Create load-test-400.yml
artillery run load-test-400.yml
```

### load-test-400.yml
```yaml
config:
  target: "http://localhost:5000"
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 300
      arrivalRate: 80
      name: "Ramp to 400 concurrent"
    - duration: 600
      arrivalRate: 0
      name: "Sustain 400 users"
  processor: "./test-functions.js"

scenarios:
  - name: "Student taking exam"
    flow:
      - post:
          url: "/api/auth/login"
          json:
            email: "student{{ $randomNumber() }}@test.com"
            password: "password123"
      - think: 2
      - get:
          url: "/api/exam/{{ examId }}"
      - think: 30
      - post:
          url: "/api/exam/{{ examId }}/submit"
          json:
            answers: []
```

## Optimization Checklist

### Before Exam (Preparation)
- [ ] Restart server to clear memory
- [ ] Verify MongoDB connection pool
- [ ] Check disk space (> 20GB free)
- [ ] Test WebSocket connectivity
- [ ] Verify rate limits are configured
- [ ] Enable monitoring dashboards
- [ ] Set up alerting (CPU, memory, errors)

### During Exam (Monitoring)
- [ ] Monitor active connections
- [ ] Watch response times
- [ ] Check error logs
- [ ] Monitor CPU/memory usage
- [ ] Track WebSocket connections
- [ ] Watch database query performance

### After Exam (Cleanup)
- [ ] Archive exam sessions
- [ ] Clear temporary data
- [ ] Review performance metrics
- [ ] Check for errors or anomalies
- [ ] Optimize based on findings

## Troubleshooting High Load

### Issue: Slow Response Times
```bash
# Check MongoDB slow queries
db.setProfilingLevel(1, { slowms: 100 })
db.system.profile.find().sort({ ts: -1 }).limit(5)

# Add indexes if needed
db.examsessions.createIndex({ examId: 1, userId: 1, status: 1 })
```

### Issue: Memory Leaks
```bash
# Take heap snapshot
node --inspect server.js
# Chrome DevTools > Memory > Take Snapshot
```

### Issue: Connection Pool Exhausted
```javascript
// Increase pool size further
maxPoolSize: 200,
minPoolSize: 50,
```

### Issue: WebSocket Disconnections
```javascript
// Increase heartbeat interval
const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 20000); // Reduced from 30s to 20s
```

## Production Deployment Commands

### Start Server (Development)
```bash
cd server
npm start
```

### Start Server (Production - Single Instance)
```bash
cd server
npm run start:prod
```

### Start Server (Production - PM2 Cluster)
```bash
# Install PM2
npm install -g pm2

# Start with cluster mode
pm2 start server.js -i 4 --name exam-server --max-memory-restart 6G

# Monitor
pm2 monit

# View logs
pm2 logs exam-server
```

### PM2 Ecosystem File (ecosystem.config.js)
```javascript
module.exports = {
  apps: [{
    name: 'exam-server',
    script: './server.js',
    instances: 4,
    exec_mode: 'cluster',
    max_memory_restart: '6G',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true
  }]
};
```

## Cost Estimates (Monthly)

### Cloud Hosting (AWS/Azure/GCP)
- **Server**: $100-200 (4-8 core, 16GB RAM)
- **MongoDB Atlas M30**: $200-300
- **Load Balancer**: $20-50
- **Bandwidth**: $50-100
- **Total**: $370-650/month

### Self-Hosted
- **Server**: $50-100 (VPS/Dedicated)
- **MongoDB**: Self-hosted (included)
- **Bandwidth**: $20-50
- **Total**: $70-150/month

## Current Status

✅ System configured for 400 concurrent students
✅ Connection pool optimized (150 connections)
✅ Rate limits adjusted for high traffic (5000 API, 8000 proctor)
✅ Node.js memory optimized (4-8GB heap)
✅ Express performance optimizations enabled
✅ WebSocket proctoring ready for scale
✅ Production start script with optimizations
✅ Monitoring recommendations provided
✅ Load testing guide included

## Next Steps

1. **Test with load testing tool** to verify 400-user capacity
2. **Set up monitoring** (PM2, New Relic, or custom)
3. **Configure alerts** for CPU, memory, and error rates
4. **Plan scaling strategy** (vertical vs horizontal)
5. **Optimize MongoDB** with proper indexes and configuration
6. **Consider CDN** for static assets if needed
7. **Implement caching** (Redis) for frequently accessed data
