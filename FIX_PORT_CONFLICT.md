# 🔧 Fix Port Conflict (EADDRINUSE Error)

If you see this error when starting the server:

```
Error: listen EADDRINUSE: address already in use :::3000
```

It means another process is already using port 3000.

---

## Quick Fix Options

### Option 1: Kill the Process Using Port 3000

**macOS/Linux:**
```bash
# Find and kill the process in one command
kill -9 $(lsof -ti:3000)
```

Or step by step:
```bash
# Step 1: Find what's using port 3000
lsof -i:3000

# Step 2: Note the PID (Process ID) from the output
# Step 3: Kill that process
kill -9 <PID>
```

**Windows:**
```powershell
# Find what's using port 3000
netstat -ano | findstr :3000

# Kill the process (replace PID with actual number)
taskkill /PID <PID> /F
```

### Option 2: Use a Different Port

Edit your `.env` file:
```env
PORT=3001
```

Then access your API at `http://localhost:3001`

### Option 3: Kill All Node Processes

⚠️ **Warning:** This kills ALL Node.js processes!

```bash
# macOS/Linux
killall node

# Windows
taskkill /f /im node.exe
```

---

## Verify the Fix

After killing the process or changing the port:

```bash
# Start the server
npm start

# Test it's working
curl http://localhost:3000/health
```

You should see:
```json
{"status":"ok","database":{"status":"healthy"}}
```

---

## Prevent Future Conflicts

### Add a cleanup script to package.json:

```json
{
  "scripts": {
    "prestart": "kill -9 $(lsof -ti:3000) 2>/dev/null || true",
    "start": "node src/server.js"
  }
}
```

### Use nodemon properly:

```bash
# Use npx to ensure fresh start
npx nodemon src/server.js
```

---

## Common Causes

1. **Previous server didn't shut down cleanly** - Use Ctrl+C to stop servers
2. **Multiple terminal windows** running the same server
3. **Background process** still running from earlier
4. **IDE/Editor** running the server in debug mode

---

## Still Having Issues?

Check if the port is in use:
```bash
lsof -i:3000
```

If you see output, something is using the port. Kill it with:
```bash
kill -9 $(lsof -ti:3000)
```

If no output, the port is free and something else is wrong.



