# 🎯 BrandScaling Complete Workflow Guide

## 📋 Project Manager's Overview

This guide walks you through the **complete implementation workflow** from start to finish. Follow these steps in order.

---

## 🏗️ Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                    FINAL ARCHITECTURE                     │
└──────────────────────────────────────────────────────────┘

┌─────────────────┐
│   iOS App       │  ← User Interface
│  (Swift/SwiftUI)│     • Quiz UI
│                 │     • Offline cache
│  Port: N/A      │     • Network monitor
└────────┬────────┘
         │
         │ HTTPS REST API
         │ (JSON requests/responses)
         │
         ↓
┌─────────────────┐
│   Node.js       │  ← Backend API Layer
│   Express       │     • Request validation
│                 │     • Business logic
│  Port: 3000     │     • Error handling
└────────┬────────┘
         │
         │ PostgreSQL Protocol
         │ (SQL queries)
         │
         ↓
┌─────────────────┐
│  AWS Aurora     │  ← Database
│  PostgreSQL     │     • Quiz data
│                 │     • User progress
│  Port: 5432     │     • Results
└─────────────────┘
```

---

## 📅 Implementation Timeline

| Phase | Task | Time | Who |
|-------|------|------|-----|
| 1 | Set up Node.js backend | 2-3 hours | Backend Dev |
| 2 | Test backend with Postman | 30 min | Backend Dev |
| 3 | Update iOS app API layer | 2 hours | iOS Dev |
| 4 | Test iOS → Node.js connection | 30 min | iOS Dev |
| 5 | End-to-end testing | 1 hour | Both |
| 6 | Deploy to production | 1 hour | DevOps |
| **Total** | **7-8 hours** | | |

---

## 🚀 Phase 1: Set Up Node.js Backend

### Step 1.1: Prepare Your Mac

```bash
# Check Node.js version (need 18+)
node --version

# If not installed, install via Homebrew
brew install node

# Verify installation
node --version
npm --version
```

### Step 1.2: Create Project

```bash
# Create project directory
mkdir brandscaling-nodejs-backend
cd brandscaling-nodejs-backend

# Initialize npm
npm init -y

# Install dependencies
npm install express pg pg-pool dotenv cors helmet morgan express-rate-limit express-validator compression

# Install dev dependencies
npm install --save-dev nodemon
```

### Step 1.3: Set Up Files

**Option A: Use Cursor AI (Recommended)**

1. Open Cursor
2. Open the `brandscaling-nodejs-backend` folder
3. Open the file `CURSOR_PROMPT_NODEJS.md`
4. Copy the entire prompt
5. Paste into Cursor chat
6. Let Cursor create all files

**Option B: Manual Setup**

Copy all files from the provided backend package:
- `src/server.js`
- `src/config/database.js`
- `src/routes/quizRoutes.js`
- `src/controllers/quizController.js`
- `src/middleware/errorHandler.js`
- `src/middleware/rateLimiter.js`
- `package.json`
- `.env.example`

### Step 1.4: Configure Environment

```bash
# Copy example env file
cp .env.example .env

# Edit .env file
nano .env
```

Update these values:
```env
DB_HOST=database-2-brandscaling-ios-instance-1.cc1k8qu4cwi2.us-east-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=postgres
DB_USER=database_ios
DB_PASSWORD=Letmein786!
```

### Step 1.5: Start Server

```bash
# Start in development mode
npm run dev

# You should see:
# 🚀 ============================================
#    BrandScaling E-DNA Quiz Backend API
#    ============================================
#    Environment: development
#    Port: 3000
#    ...
```

### Step 1.6: Test Health Endpoint

```bash
# In a new terminal
curl http://localhost:3000/health

# Expected response:
# {
#   "status": "ok",
#   "timestamp": "2026-01-06T...",
#   "database": {
#     "status": "healthy",
#     ...
#   }
# }
```

✅ **Phase 1 Complete** when:
- Server starts without errors
- Health endpoint returns "ok"
- Database connection is "healthy"

---

## 🧪 Phase 2: Test Backend with Postman

### Step 2.1: Install Postman

Download from: https://www.postman.com/downloads/

### Step 2.2: Create Collection

Create a new collection called "BrandScaling Quiz API"

### Step 2.3: Test Each Endpoint

#### Test 1: Health Check

```
GET http://localhost:3000/health
```

Expected: Status 200, `"status": "ok"`

#### Test 2: Get Questions

```
GET http://localhost:3000/api/v1/quiz/questions?layer=1
```

Expected: Status 200, array of 8 questions

#### Test 3: Create Session

```
POST http://localhost:3000/api/v1/quiz/session
Content-Type: application/json

{
  "userId": "test-user-123",
  "startedAt": "2026-01-06T10:00:00Z"
}
```

Expected: Status 201, session ID returned

#### Test 4: Save Progress

```
POST http://localhost:3000/api/v1/quiz/progress
Content-Type: application/json

{
  "userId": "test-user-123",
  "sessionId": "1",
  "questionId": 1,
  "selectedOptionId": 1,
  "layerNumber": 1,
  "answeredAt": "2026-01-06T10:01:00Z"
}
```

Expected: Status 200, `"message": "Progress saved"`

#### Test 5: Get Progress

```
GET http://localhost:3000/api/v1/quiz/progress/test-user-123
```

Expected: Status 200, progress array with 1 answer

#### Test 6: Check Retake

```
GET http://localhost:3000/api/v1/quiz/retake-check/test-user-123
```

Expected: Status 200, `"allowed": true`

✅ **Phase 2 Complete** when:
- All 6 tests pass
- No errors in server console
- Database queries execute successfully

---

## 📱 Phase 3: Update iOS App

### Step 3.1: Open iOS Project in Cursor

```bash
# Navigate to your iOS project
cd /path/to/BrandScaling

# Open in Cursor
cursor .
```

### Step 3.2: Use Cursor AI Prompt

1. Open `CURSOR_PROMPT_IOS.md`
2. Copy the entire prompt
3. Paste into Cursor chat
4. Let Cursor make the changes

### Step 3.3: Verify Changes

Cursor should have:
- ✅ Created `APIConfig.swift`
- ✅ Created `APIService.swift`
- ✅ Created `QuizAPIService.swift`
- ✅ Created `NetworkMonitor.swift`
- ✅ Updated `QuizService.swift`
- ✅ Updated `QuizViewModel.swift`
- ✅ Removed/commented out `DatabaseService.swift`

### Step 3.4: Update API Base URL

In `APIConfig.swift`:

```swift
// For local testing (Mac IP address)
static let baseURL = "http://YOUR_MAC_IP:3000"

// Find your Mac IP:
// System Settings → Network → Wi-Fi → Details → IP Address
// Example: "http://192.168.1.100:3000"
```

### Step 3.5: Build and Run

1. Build the project (⌘B)
2. Fix any compilation errors
3. Run on simulator (⌘R)

✅ **Phase 3 Complete** when:
- Project builds without errors
- No direct database imports
- API service layer exists

---

## 🔗 Phase 4: Test iOS → Node.js Connection

### Step 4.1: Ensure Both Are Running

**Terminal 1 (Node.js):**
```bash
cd brandscaling-nodejs-backend
npm run dev
```

**Terminal 2 (iOS):**
```bash
# Run from Xcode or
# iOS Simulator should be running
```

### Step 4.2: Test Connection Flow

1. **Open iOS app**
2. **Navigate to Quiz**
3. **Check console logs:**

**iOS Console (Xcode):**
```
✅ API Health: ok
✅ Database: connected
✅ Loaded 8 questions for layer 1
```

**Node.js Console:**
```
Executed query { text: 'SELECT ...', duration: 45, rows: 8 }
✅ Returned 8 questions for layer 1
```

### Step 4.3: Test Quiz Flow

1. **Start Quiz**
   - Should create session
   - Should load Layer 1 questions

2. **Answer Question**
   - Should save to database via API
   - Should show "Saved ✓"

3. **Check Network Status**
   - Turn off Wi-Fi
   - Answer should save offline
   - Should show "Saved offline ⏳"
   - Turn on Wi-Fi
   - Should auto-sync

### Step 4.4: Test Error Handling

1. **Stop Node.js server**
2. **Try to answer question**
3. **Should:**
   - Show offline mode
   - Save to local cache
   - Show reconnect option

✅ **Phase 4 Complete** when:
- iOS can fetch questions from API
- iOS can save progress via API
- Offline mode works
- Auto-sync works
- Error messages are user-friendly

---

## 🧪 Phase 5: End-to-End Testing

### Test Scenario 1: Complete Quiz Online

1. Start quiz
2. Answer all Layer 1 questions (8 questions)
3. Complete quiz
4. View results
5. Verify in database:

```bash
# Connect to database
psql -h database-2-brandscaling-ios-instance-1.cc1k8qu4cwi2.us-east-1.rds.amazonaws.com \
     -U database_ios -d postgres

# Check data
SELECT COUNT(*) FROM user_quiz_progress;
SELECT * FROM user_quiz_results ORDER BY id DESC LIMIT 1;
```

### Test Scenario 2: Quiz with Offline Period

1. Start quiz online
2. Answer 3 questions
3. Turn off Wi-Fi
4. Answer 3 more questions (saved offline)
5. Turn on Wi-Fi
6. Verify auto-sync
7. Complete quiz
8. Verify all 6 answers in database

### Test Scenario 3: Retake Restriction

1. Complete quiz
2. Try to retake immediately
3. Should show: "You can retake in 7 days"
4. Verify `retake_available_at` in database

### Test Scenario 4: Multiple Users

1. Create session for User A
2. Create session for User B
3. Both answer questions
4. Verify data is separate in database
5. Verify no data leakage

### Test Scenario 5: Error Recovery

1. Start quiz
2. Kill Node.js server mid-answer
3. iOS should switch to offline mode
4. Restart Node.js server
5. iOS should auto-sync
6. Verify no data loss

✅ **Phase 5 Complete** when:
- All 5 test scenarios pass
- No data loss
- No crashes
- Error handling works

---

## 🚀 Phase 6: Deploy to Production

### Step 6.1: Prepare Node.js for Production

**Update `.env`:**
```env
NODE_ENV=production
PORT=3000
ALLOWED_ORIGINS=https://yourdomain.com
```

**Security Checklist:**
- [ ] Change database password
- [ ] Enable SSL for database
- [ ] Set up HTTPS (not HTTP)
- [ ] Configure firewall rules
- [ ] Enable rate limiting
- [ ] Add authentication (JWT)

### Step 6.2: Deploy Options

**Option A: AWS EC2**

```bash
# SSH to EC2 instance
ssh -i your-key.pem ubuntu@your-ec2-ip

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone/upload your code
git clone your-repo
cd brandscaling-nodejs-backend

# Install dependencies
npm install --production

# Install PM2 for process management
sudo npm install -g pm2

# Start with PM2
pm2 start src/server.js --name brandscaling-api
pm2 save
pm2 startup
```

**Option B: AWS Elastic Beanstalk**

```bash
# Install EB CLI
pip install awsebcli

# Initialize
eb init

# Create environment
eb create brandscaling-api-prod

# Deploy
eb deploy
```

**Option C: Heroku**

```bash
# Install Heroku CLI
brew tap heroku/brew && brew install heroku

# Login
heroku login

# Create app
heroku create brandscaling-api

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set DB_HOST=your-db-host
# ... set all env vars

# Deploy
git push heroku main
```

### Step 6.3: Update iOS App

**Update `APIConfig.swift`:**

```swift
static let baseURL: String {
    #if DEBUG
    return "http://localhost:3000"  // Local development
    #else
    return "https://api.brandscaling.com"  // Production
    #endif
}
```

### Step 6.4: Submit to App Store

1. Update version number
2. Create archive (Product → Archive)
3. Upload to App Store Connect
4. Submit for review

✅ **Phase 6 Complete** when:
- Node.js backend is live
- iOS app connects to production API
- App is submitted to App Store

---

## 📊 Communication Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    QUIZ FLOW SEQUENCE                        │
└─────────────────────────────────────────────────────────────┘

1. USER OPENS APP
   iOS App → Node.js: GET /health
   Node.js → Aurora: SELECT NOW()
   Aurora → Node.js: Current time
   Node.js → iOS App: { status: "ok", database: "healthy" }

2. USER STARTS QUIZ
   iOS App → Node.js: POST /api/v1/quiz/session { userId: "..." }
   Node.js → Aurora: INSERT INTO quiz_sessions ...
   Aurora → Node.js: session_id = 1
   Node.js → iOS App: { sessionId: 1, ... }

3. LOAD QUESTIONS
   iOS App → Node.js: GET /api/v1/quiz/questions?layer=1
   Node.js → Aurora: SELECT * FROM quiz_questions WHERE layer_number = 1
   Aurora → Node.js: 8 questions with options
   Node.js → iOS App: { questions: [...] }

4. USER ANSWERS QUESTION
   iOS App → Node.js: POST /api/v1/quiz/progress { questionId: 1, ... }
   Node.js → Aurora: INSERT INTO user_quiz_progress ...
   Aurora → Node.js: progress_id = 1
   Node.js → iOS App: { success: true, message: "Progress saved" }

5. USER COMPLETES QUIZ
   iOS App → Node.js: POST /api/v1/quiz/results { layer1CoreType: "Architect", ... }
   Node.js → Aurora: INSERT INTO user_quiz_results ...
   Aurora → Node.js: result_id = 1, retake_available_at = "..."
   Node.js → iOS App: { resultId: 1, retakeAvailableAt: "..." }

6. USER TRIES TO RETAKE
   iOS App → Node.js: GET /api/v1/quiz/retake-check/user-123
   Node.js → Aurora: SELECT retake_available_at FROM user_quiz_results ...
   Aurora → Node.js: retake_available_at = "2026-01-13"
   Node.js → iOS App: { allowed: false, daysRemaining: 7 }
```

---

## 🐛 Troubleshooting Guide

### Issue 1: iOS Cannot Connect to Node.js

**Symptoms:**
- "Network error" in iOS app
- No requests in Node.js console

**Solutions:**
1. Check Node.js is running: `curl http://localhost:3000/health`
2. Check firewall allows port 3000
3. Use Mac IP address, not localhost (for physical device)
4. Check CORS is enabled in Node.js
5. Check iOS has internet permission in Info.plist

### Issue 2: Database Connection Failed

**Symptoms:**
- Node.js shows "Database connection error"
- Health check returns "unhealthy"

**Solutions:**
1. Check `.env` has correct credentials
2. Verify your IP is whitelisted in Aurora security group
3. Test with psql: `psql -h YOUR_HOST -U database_ios -d postgres`
4. Check VPC and security group settings
5. Verify database is running

### Issue 3: Offline Sync Not Working

**Symptoms:**
- Offline answers not syncing when online
- Duplicate answers in database

**Solutions:**
1. Check `NetworkMonitor` is observing correctly
2. Verify `onChange` handler is called
3. Check sync endpoint works: Test with Postman
4. Verify offline cache is saving answers
5. Check for conflicts in database (session_id + question_id unique)

### Issue 4: CORS Errors

**Symptoms:**
- iOS shows "CORS policy" error
- Requests blocked by browser (if testing in web)

**Solutions:**
1. Ensure `cors()` middleware is in Node.js
2. Check `ALLOWED_ORIGINS` includes iOS app
3. Verify `Access-Control-Allow-Origin` header in response
4. Check `OPTIONS` requests are handled

### Issue 5: 7-Day Retake Not Working

**Symptoms:**
- User can retake immediately
- Retake check always returns "allowed: true"

**Solutions:**
1. Check `retake_available_at` is set in database
2. Verify trigger is working: `SELECT * FROM user_quiz_results`
3. Check date calculation in Node.js controller
4. Verify timezone handling (use UTC)

---

## 📋 Final Checklist

### Backend (Node.js)
- [ ] Server starts without errors
- [ ] Health endpoint works
- [ ] All 10 API endpoints work
- [ ] Database connection is stable
- [ ] CORS is enabled
- [ ] Error handling works
- [ ] Rate limiting is configured
- [ ] Environment variables are set
- [ ] Logging is working
- [ ] Tests pass (if written)

### iOS App
- [ ] Builds without errors
- [ ] No direct database connection
- [ ] API service layer exists
- [ ] Network monitoring works
- [ ] Offline mode works
- [ ] Auto-sync works
- [ ] Error messages are user-friendly
- [ ] Loading states are shown
- [ ] Save status indicators work
- [ ] Retake restriction works

### Database
- [ ] All tables exist
- [ ] Quiz data is inserted (45 questions)
- [ ] Triggers are working
- [ ] Indexes are created
- [ ] Constraints are enforced
- [ ] Backups are configured

### Testing
- [ ] End-to-end flow works
- [ ] Offline scenario works
- [ ] Error recovery works
- [ ] Multiple users work
- [ ] Retake restriction works

### Production
- [ ] Node.js deployed
- [ ] HTTPS enabled
- [ ] Database password changed
- [ ] Monitoring set up
- [ ] Logs configured
- [ ] iOS app updated with production URL
- [ ] App Store submission ready

---

## 🎉 Success!

When all checklists are complete, you have:

✅ **Secure architecture** (iOS → Node.js → Aurora)  
✅ **Offline support** (local cache + auto-sync)  
✅ **Error handling** (user-friendly messages)  
✅ **7-day retake restriction** (enforced)  
✅ **Scalable backend** (can add more servers)  
✅ **Production-ready** (deployed and tested)

**Congratulations! Your BrandScaling E-DNA Quiz app is live! 🚀**
