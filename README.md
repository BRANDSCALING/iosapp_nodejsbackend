# BrandScaling Node.js Backend + iOS Integration Package

## 📦 Complete Package for iOS → Node.js → Aurora Architecture

This package contains everything you need to implement a secure, scalable backend for your BrandScaling E-DNA Quiz iOS app.

---

## 🎯 What's Included

### 📄 Documentation Files

1. **README.md** (this file) - Overview and quick start
2. **COMPLETE_WORKFLOW_GUIDE.md** ⭐⭐⭐ - **START HERE** - Step-by-step implementation guide
3. **CURSOR_PROMPT_NODEJS.md** - Detailed prompt for building Node.js backend with Cursor AI
4. **CURSOR_PROMPT_IOS.md** - Detailed prompt for updating iOS app with Cursor AI

### 🔧 Backend Code Files

5. **package.json** - Node.js dependencies
6. **.env.example** - Environment variables template
7. **src/server.js** - Main Express server
8. **src/config/database.js** - PostgreSQL connection pool
9. **src/routes/quizRoutes.js** - API route definitions
10. **src/controllers/quizController.js** - Business logic for all endpoints
11. **src/middleware/errorHandler.js** - Global error handling
12. **src/middleware/rateLimiter.js** - Rate limiting middleware

---

## 🏗️ Architecture

```
┌─────────────────┐
│   iOS App       │  Your existing Swift/SwiftUI app
│  (Swift/SwiftUI)│  • Remove direct DB connection
│                 │  • Add API service layer
└────────┬────────┘
         │
         │ HTTPS REST API (JSON)
         │
         ↓
┌─────────────────┐
│   Node.js       │  NEW - This package
│   Express API   │  • 10 REST endpoints
│   Port: 3000    │  • Validation & error handling
└────────┬────────┘
         │
         │ PostgreSQL Protocol (SQL)
         │
         ↓
┌─────────────────┐
│  AWS Aurora     │  Your existing database
│  PostgreSQL     │  • Already has tables & data
│  Port: 5432     │  • No changes needed
└─────────────────┘
```

---

## 🚀 Quick Start (3 Steps)

### Step 1: Set Up Node.js Backend (2-3 hours)

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your database credentials
nano .env

# Start server
npm run dev
```

**Verify:** Visit http://localhost:3000/health

### Step 2: Update iOS App (2 hours)

1. Open your iOS project in Cursor
2. Open `CURSOR_PROMPT_IOS.md`
3. Copy the entire prompt
4. Paste into Cursor AI chat
5. Let Cursor make the changes

**Verify:** Build and run iOS app

### Step 3: Test Connection (30 minutes)

1. Ensure Node.js server is running
2. Run iOS app
3. Start quiz
4. Check console logs for successful API calls

**Verify:** Questions load from API, answers save to database

---

## 📋 For Project Managers

### Implementation Timeline

| Phase | Task | Time | Who |
|-------|------|------|-----|
| 1 | Set up Node.js backend | 2-3 hours | Backend Dev |
| 2 | Test backend with Postman | 30 min | Backend Dev |
| 3 | Update iOS app API layer | 2 hours | iOS Dev |
| 4 | Test iOS → Node.js connection | 30 min | iOS Dev |
| 5 | End-to-end testing | 1 hour | Both |
| 6 | Deploy to production | 1 hour | DevOps |
| **Total** | **7-8 hours** | | |

### Read This First

**For complete step-by-step guidance:** Open `COMPLETE_WORKFLOW_GUIDE.md`

It contains:
- ✅ Detailed implementation steps
- ✅ Testing procedures
- ✅ Troubleshooting guide
- ✅ Deployment instructions
- ✅ Communication flow diagrams
- ✅ Final checklists

---

## 📚 For Developers

### Backend Developer

**Your mission:** Build Node.js REST API

1. Read `CURSOR_PROMPT_NODEJS.md`
2. Use Cursor AI to generate code
3. Test with Postman
4. Deploy to server

**Key files:**
- `src/server.js` - Main entry point
- `src/controllers/quizController.js` - Business logic
- `src/config/database.js` - Database connection

### iOS Developer

**Your mission:** Update iOS app to use API

1. Read `CURSOR_PROMPT_IOS.md`
2. Use Cursor AI to update code
3. Remove direct database connection
4. Add API service layer
5. Test offline support

**Key changes:**
- Remove `DatabaseService.swift`
- Add `APIService.swift`
- Add `QuizAPIService.swift`
- Update `QuizService.swift`
- Update `QuizViewModel.swift`

---

## 🎯 API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/health` | Health check |
| GET | `/api/v1/quiz/questions?layer={1-7}` | Get questions |
| POST | `/api/v1/quiz/session` | Create session |
| POST | `/api/v1/quiz/progress` | Save answer |
| GET | `/api/v1/quiz/progress/:userId` | Get progress |
| POST | `/api/v1/quiz/sync` | Sync offline answers |
| POST | `/api/v1/quiz/results` | Save results |
| GET | `/api/v1/quiz/results/:userId` | Get results |
| GET | `/api/v1/quiz/retake-check/:userId` | Check retake eligibility |
| GET | `/api/v1/quiz/layer-intro/:layer` | Get layer intro |

---

## 🔧 Environment Variables

Required in `.env`:

```env
# Server
NODE_ENV=development
PORT=3000

# Database (AWS Aurora PostgreSQL)
DB_HOST=database-2-brandscaling-ios-instance-1.cc1k8qu4cwi2.us-east-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=postgres
DB_USER=database_ios
DB_PASSWORD=Letmein786!

# CORS
ALLOWED_ORIGINS=*

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

---

## 🧪 Testing

### Test Backend

```bash
# Health check
curl http://localhost:3000/health

# Get questions
curl "http://localhost:3000/api/v1/quiz/questions?layer=1"

# Create session
curl -X POST http://localhost:3000/api/v1/quiz/session \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-123"}'
```

### Test iOS App

1. Build and run
2. Start quiz
3. Answer questions
4. Check Xcode console for API logs
5. Check Node.js console for incoming requests

---

## 🐛 Troubleshooting

### Backend Won't Start

**Check:**
- Node.js is installed (`node --version`)
- Dependencies installed (`npm install`)
- `.env` file exists
- Database credentials are correct

### iOS Can't Connect

**Check:**
- Node.js server is running
- Firewall allows port 3000
- Using correct IP address (not localhost for physical device)
- CORS is enabled

### Database Connection Failed

**Check:**
- Database credentials in `.env`
- Your IP is whitelisted in Aurora security group
- Database is running
- Can connect with psql

---

## 📖 Documentation Structure

```
README.md (You are here)
│
├─ COMPLETE_WORKFLOW_GUIDE.md
│  └─ Complete step-by-step implementation guide
│
├─ CURSOR_PROMPT_NODEJS.md
│  └─ Detailed prompt for Node.js backend
│
└─ CURSOR_PROMPT_IOS.md
   └─ Detailed prompt for iOS app updates
```

---

## ✅ Success Criteria

Your implementation is complete when:

### Backend
- ✅ Server starts without errors
- ✅ Health endpoint returns "ok"
- ✅ All 10 API endpoints work
- ✅ Database connection is stable
- ✅ CORS is enabled
- ✅ Error handling works

### iOS App
- ✅ Builds without errors
- ✅ No direct database connection
- ✅ API service layer exists
- ✅ Questions load from API
- ✅ Answers save via API
- ✅ Offline mode works
- ✅ Auto-sync works

### Integration
- ✅ iOS can fetch questions from Node.js
- ✅ iOS can save progress via Node.js
- ✅ Node.js saves to Aurora database
- ✅ Offline answers sync when online
- ✅ 7-day retake restriction works

---

## 🚀 Deployment

### Deploy Node.js Backend

**Option 1: AWS EC2**
- Launch EC2 instance
- Install Node.js
- Upload code
- Use PM2 for process management

**Option 2: Heroku**
- Install Heroku CLI
- Create app
- Set environment variables
- Deploy with git

**Option 3: AWS Elastic Beanstalk**
- Install EB CLI
- Initialize project
- Create environment
- Deploy

### Update iOS App

Update `APIConfig.swift`:

```swift
#if DEBUG
static let baseURL = "http://localhost:3000"
#else
static let baseURL = "https://api.brandscaling.com"
#endif
```

---

## 💡 Why This Architecture?

### Before (Direct Connection)
❌ **Insecure** - Database credentials in iOS app  
❌ **Not scalable** - Direct connections limited  
❌ **Hard to maintain** - Changes require app update  
❌ **No business logic** - All logic in iOS app

### After (API Layer)
✅ **Secure** - No database credentials in app  
✅ **Scalable** - Add more API servers as needed  
✅ **Easy to maintain** - Update backend independently  
✅ **Business logic** - Centralized in API layer  
✅ **Better monitoring** - API logs and metrics  
✅ **Rate limiting** - Prevent abuse

---

## 📞 Support

### Issues?

1. Check `COMPLETE_WORKFLOW_GUIDE.md` → Troubleshooting section
2. Check console logs (both Node.js and iOS)
3. Test each component separately
4. Verify environment variables
5. Check network connectivity

### Resources

- **Express.js:** https://expressjs.com/
- **node-postgres:** https://node-postgres.com/
- **Swift URLSession:** https://developer.apple.com/documentation/foundation/urlsession

---

## 📄 License

Proprietary - BrandScaling

---

## 🎉 Let's Build!

**Estimated Time:** 7-8 hours  
**Difficulty:** Intermediate  
**Team:** 1-2 developers

**Start with:** `COMPLETE_WORKFLOW_GUIDE.md`

**Good luck! 🚀**
