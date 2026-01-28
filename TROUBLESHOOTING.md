# 🔧 BrandScaling Backend Troubleshooting Guide

Common issues and their solutions.

---

## Table of Contents

1. [Port Already in Use (EADDRINUSE)](#1-port-already-in-use)
2. [Database Connection Timeout](#2-database-connection-timeout)
3. [Database Connection Refused](#3-database-connection-refused)
4. [API Returns 500 Errors](#4-api-returns-500-errors)
5. [CORS Errors](#5-cors-errors)
6. [SSL/TLS Errors](#6-ssltls-errors)
7. [Rate Limiting Issues](#7-rate-limiting-issues)

---

## 1. Port Already in Use

**Error:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution:**
```bash
# Kill process on port 3000
kill -9 $(lsof -ti:3000)

# Or use different port
PORT=3001 npm start
```

See [FIX_PORT_CONFLICT.md](./FIX_PORT_CONFLICT.md) for detailed guide.

---

## 2. Database Connection Timeout

**Error:**
```
Error: Connection timeout
TimeoutError: Connection terminated due to connection timeout
```

**Solutions:**

### A. Check your IP is whitelisted
Your IP must be in the AWS Security Group for Aurora:
1. Go to AWS Console → RDS → Databases
2. Click on your database instance
3. Go to Security Groups
4. Add inbound rule for your IP on port 5432

### B. Increase timeout values
Edit `.env`:
```env
DB_CONNECTION_TIMEOUT=20000
DB_IDLE_TIMEOUT=60000
```

### C. Verify database credentials
```bash
# Test connection manually
PGPASSWORD='Letmein786!' psql \
  -h database-2-brandscaling-ios-instance-1.cc1k8qu4cwi2.us-east-1.rds.amazonaws.com \
  -p 5432 \
  -U database_ios \
  -d postgres \
  -c "SELECT 1"
```

---

## 3. Database Connection Refused

**Error:**
```
Error: connect ECONNREFUSED
Error: Connection refused
```

**Solutions:**

### A. Check database is running
Verify in AWS Console that Aurora instance status is "Available"

### B. Check network connectivity
```bash
# Test if you can reach the database host
nc -zv database-2-brandscaling-ios-instance-1.cc1k8qu4cwi2.us-east-1.rds.amazonaws.com 5432
```

### C. Check Security Group rules
- Inbound: PostgreSQL (5432) from your IP
- Outbound: All traffic (default)

---

## 4. API Returns 500 Errors

**Error:**
```json
{"success":false,"error":"Internal Server Error"}
```

**Debugging Steps:**

### A. Check server logs
The actual error is printed in the terminal running the server.

### B. Check database connection
```bash
curl http://localhost:3000/health
```

If database shows "unhealthy", fix database connection first.

### C. Check request format
Ensure you're sending proper JSON:
```bash
curl -X POST http://localhost:3000/api/v1/quiz/session \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user"}'
```

### D. Check validation errors
Many endpoints require specific fields. Check the 400 error response for details.

---

## 5. CORS Errors

**Error (in browser console):**
```
Access to fetch at 'http://localhost:3000/...' has been blocked by CORS policy
```

**Solutions:**

### A. Check ALLOWED_ORIGINS in .env
```env
ALLOWED_ORIGINS=*
```

### B. Verify CORS middleware is loaded
Check `src/server.js` has CORS before routes:
```javascript
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
```

### C. Check response headers
```bash
curl -I http://localhost:3000/health
```

Should include:
```
Access-Control-Allow-Origin: *
```

---

## 6. SSL/TLS Errors

**Error:**
```
Error: self signed certificate in certificate chain
Error: unable to verify the first certificate
```

**Solution:**

AWS Aurora requires SSL. Ensure database config has:
```javascript
ssl: { rejectUnauthorized: false }
```

This is already configured in `src/config/database.js`.

---

## 7. Rate Limiting Issues

**Error:**
```json
{"success":false,"error":"Too many requests from this IP, please try again later."}
```

**Solutions:**

### A. Wait for rate limit window to expire
Default is 15 minutes (900000ms)

### B. Increase limits in .env for development
```env
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=1000
```

### C. Disable rate limiting temporarily
Comment out in `src/server.js`:
```javascript
// app.use(rateLimiter);
```

---

## Quick Diagnostic Commands

```bash
# Check if server is running
curl http://localhost:3000/

# Check database connection
curl http://localhost:3000/health

# Check questions endpoint
curl 'http://localhost:3000/api/v1/quiz/questions?layer=1'

# Check what's using port 3000
lsof -i:3000

# Test database directly
PGPASSWORD='Letmein786!' psql \
  -h database-2-brandscaling-ios-instance-1.cc1k8qu4cwi2.us-east-1.rds.amazonaws.com \
  -p 5432 -U database_ios -d postgres -c "SELECT 1"

# Check Node.js version
node --version

# Check npm packages installed
npm ls --depth=0
```

---

## Environment Checklist

Verify your `.env` file has all required values:

```env
# Server
NODE_ENV=development
PORT=3000
API_VERSION=v1

# Database (AWS Aurora)
DB_HOST=database-2-brandscaling-ios-instance-1.cc1k8qu4cwi2.us-east-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=postgres
DB_USER=database_ios
DB_PASSWORD=Letmein786!
DB_MAX_CONNECTIONS=20
DB_IDLE_TIMEOUT=60000
DB_CONNECTION_TIMEOUT=20000

# Other
ALLOWED_ORIGINS=*
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

---

## Still Stuck?

1. Check terminal output for detailed error messages
2. Verify all environment variables are set
3. Ensure your IP is whitelisted in AWS
4. Try restarting the server: `kill -9 $(lsof -ti:3000) && npm start`



