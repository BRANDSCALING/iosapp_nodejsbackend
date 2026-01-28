# 🎯 Cursor Prompt: Fix Backend Issues

## Context

My Node.js backend has these issues:
1. Port 3000 already in use (EADDRINUSE error)
2. Database connection timeout
3. API endpoints failing (500 errors)

---

## Your Task

Fix the backend issues by updating configuration files.

---

## Issue 1: Fix Database Connection Timeout

**File:** `src/config/database.js`

**Problem:** SSL configuration is wrong for AWS Aurora

**Fix:** Change line 13 from:
```javascript
ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
```

To:
```javascript
ssl: { rejectUnauthorized: false }
```

**Reason:** AWS Aurora requires SSL even in development

---

## Issue 2: Port Already in Use

**Create file:** `FIX_PORT_CONFLICT.md`

**Content:** Guide on how to:
1. Find process using port 3000: `lsof -ti:3000`
2. Kill the process: `kill -9 $(lsof -ti:3000)`
3. Or use different port in .env: `PORT=3001`

---

## Issue 3: Connection Timeout Increase

**File:** `.env.example`

**Add these lines:**
```
DB_CONNECTION_TIMEOUT=20000
DB_IDLE_TIMEOUT=60000
```

**Update:** `src/config/database.js` to use these values

---

## Verification

After fixes, these should work:

```bash
# Test health check
curl http://localhost:3000/health

# Should return:
# { "status": "ok", "database": { "status": "healthy" } }
```

---

## Files to Create/Update

1. Update `src/config/database.js` - Fix SSL
2. Create `FIX_PORT_CONFLICT.md` - Port troubleshooting
3. Update `.env.example` - Add timeout values
4. Create `TROUBLESHOOTING.md` - Common issues guide

---

**Focus on fixing the SSL configuration first - that's the main issue.**
