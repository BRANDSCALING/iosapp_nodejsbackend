# 🚀 Quick Start Guide - BrandScaling Backend

## ⏱️ 15-Minute Setup

This is the fastest way to get started. For detailed instructions, see `COMPLETE_WORKFLOW_GUIDE.md`.

---

## 📋 Prerequisites

- ✅ Node.js 18+ installed
- ✅ Your Mac IP address (for iOS testing)
- ✅ Database credentials (already provided)

---

## 🎯 Step 1: Set Up Node.js Backend (5 minutes)

```bash
# Navigate to project
cd brandscaling-nodejs-backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Start server
npm run dev
```

**Expected output:**
```
🚀 ============================================
   BrandScaling E-DNA Quiz Backend API
   ============================================
   Environment: development
   Port: 3000
   ...
```

**Test it:**
```bash
curl http://localhost:3000/health
```

Should return: `{"status":"ok",...}`

✅ **Backend is running!**

---

## 📱 Step 2: Update iOS App (5 minutes)

### Option A: Use Cursor AI (Recommended)

1. Open your iOS project in Cursor
2. Open file: `CURSOR_PROMPT_IOS.md`
3. Copy the entire content
4. Paste into Cursor AI chat
5. Press Enter and let Cursor work

### Option B: Manual Changes

Create these files in your iOS project:

**1. APIConfig.swift**
```swift
import Foundation

struct APIConfig {
    // Replace with your Mac's IP address
    static let baseURL = "http://192.168.1.100:3000"
    
    struct Endpoints {
        static let questions = "/api/v1/quiz/questions"
        static let session = "/api/v1/quiz/session"
        static let progress = "/api/v1/quiz/progress"
        // ... see CURSOR_PROMPT_IOS.md for complete list
    }
}
```

**2. Find Your Mac IP:**
```bash
# On Mac
ifconfig | grep "inet " | grep -v 127.0.0.1
```

Use the IP address (e.g., `192.168.1.100`)

**3. Update APIConfig.swift:**
```swift
static let baseURL = "http://YOUR_MAC_IP:3000"
```

✅ **iOS app is configured!**

---

## 🧪 Step 3: Test Connection (5 minutes)

### Terminal 1: Keep Node.js Running
```bash
npm run dev
```

### Terminal 2: Run iOS App
```bash
# Or use Xcode to run
```

### Test Flow:

1. **Open iOS app**
2. **Navigate to Quiz**
3. **Check Xcode console:**
   ```
   ✅ API Health: ok
   ✅ Loaded 8 questions for layer 1
   ```

4. **Check Node.js console:**
   ```
   Executed query { text: 'SELECT ...', duration: 45, rows: 8 }
   ✅ Returned 8 questions for layer 1
   ```

5. **Answer a question**
6. **Check both consoles for success messages**

✅ **Connection working!**

---

## 🎯 What Just Happened?

```
┌─────────────────┐
│   iOS App       │  Your app
└────────┬────────┘
         │
         │ HTTP Request: GET /api/v1/quiz/questions?layer=1
         │
         ↓
┌─────────────────┐
│   Node.js       │  Running on your Mac (port 3000)
│   localhost:3000│
└────────┬────────┘
         │
         │ SQL Query: SELECT * FROM quiz_questions WHERE layer_number = 1
         │
         ↓
┌─────────────────┐
│  AWS Aurora     │  Your database in the cloud
│  PostgreSQL     │
└─────────────────┘
```

---

## 🐛 Common Issues

### Issue: iOS shows "Network Error"

**Fix:**
```bash
# 1. Check Node.js is running
curl http://localhost:3000/health

# 2. Check your Mac's IP address
ifconfig | grep "inet " | grep -v 127.0.0.1

# 3. Update APIConfig.swift with correct IP
# Use IP address, not "localhost" for physical device
```

### Issue: "Database connection failed"

**Fix:**
```bash
# Check .env file has correct credentials
cat .env | grep DB_

# Should show:
# DB_HOST=database-2-brandscaling-ios-instance-1.cc1k8qu4cwi2.us-east-1.rds.amazonaws.com
# DB_PORT=5432
# DB_NAME=postgres
# DB_USER=database_ios
# DB_PASSWORD=Letmein786!
```

### Issue: "Cannot find module 'express'"

**Fix:**
```bash
# Install dependencies
npm install
```

---

## 📚 Next Steps

### For Complete Implementation:
→ Read `COMPLETE_WORKFLOW_GUIDE.md`

### For Node.js Development:
→ Read `CURSOR_PROMPT_NODEJS.md`

### For iOS Development:
→ Read `CURSOR_PROMPT_IOS.md`

---

## ✅ Quick Checklist

- [ ] Node.js installed
- [ ] Dependencies installed (`npm install`)
- [ ] `.env` file created
- [ ] Server starts (`npm run dev`)
- [ ] Health check works (`curl http://localhost:3000/health`)
- [ ] iOS app updated with API layer
- [ ] Mac IP address in `APIConfig.swift`
- [ ] iOS app connects to Node.js
- [ ] Questions load from API
- [ ] Answers save via API

---

## 🎉 Success!

If all checkboxes are ✅, you're done!

**Your app now uses the secure architecture:**
```
iOS → Node.js → Aurora PostgreSQL
```

**Next:** Deploy to production (see `COMPLETE_WORKFLOW_GUIDE.md`)

---

## 💡 Tips

1. **Keep Node.js running** while testing iOS app
2. **Check both consoles** (Xcode + Terminal) for logs
3. **Use your Mac's IP** (not localhost) for physical iOS devices
4. **Test offline mode** by stopping Node.js server
5. **Read full guides** for production deployment

---

**Need help?** See `COMPLETE_WORKFLOW_GUIDE.md` → Troubleshooting section

**Good luck! 🚀**
