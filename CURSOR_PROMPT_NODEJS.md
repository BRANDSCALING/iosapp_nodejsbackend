# 🎯 Cursor AI Prompt: BrandScaling Node.js Backend

## 📋 Project Context

You are building a **Node.js + Express REST API backend** for the BrandScaling E-DNA Quiz iOS app. This backend sits between the iOS app and AWS Aurora PostgreSQL database.

### Architecture:
```
iOS App (Swift) → Node.js API (Express) → Aurora PostgreSQL
```

---

## 🎯 Your Mission

Create a production-ready Node.js backend with the following:

1. **Express REST API** with 10 endpoints
2. **PostgreSQL connection** to AWS Aurora
3. **Error handling** and validation
4. **CORS** enabled for iOS app
5. **Rate limiting** to prevent abuse
6. **Health checks** for monitoring
7. **Offline sync** support
8. **7-day retake restriction** logic

---

## 📦 Project Structure

```
brandscaling-nodejs-backend/
├── src/
│   ├── server.js              # Main entry point
│   ├── config/
│   │   └── database.js        # PostgreSQL connection pool
│   ├── routes/
│   │   └── quizRoutes.js      # API route definitions
│   ├── controllers/
│   │   └── quizController.js  # Business logic
│   ├── middleware/
│   │   ├── errorHandler.js    # Global error handler
│   │   └── rateLimiter.js     # Rate limiting
│   └── utils/
│       └── logger.js          # Logging utility
├── tests/
│   └── quiz.test.js           # API tests
├── .env                       # Environment variables
├── .env.example               # Example env file
├── package.json               # Dependencies
└── README.md                  # Documentation
```

---

## 🔧 Step 1: Initialize Project

```bash
# Create project directory
mkdir brandscaling-nodejs-backend
cd brandscaling-nodejs-backend

# Initialize npm
npm init -y

# Install dependencies
npm install express pg pg-pool dotenv cors helmet morgan express-rate-limit express-validator compression

# Install dev dependencies
npm install --save-dev nodemon jest eslint
```

---

## 🔧 Step 2: Create Environment Configuration

Create `.env` file:

```env
# Server Configuration
NODE_ENV=development
PORT=3000
API_VERSION=v1

# Database Configuration - AWS Aurora PostgreSQL
DB_HOST=database-2-brandscaling-ios-instance-1.cc1k8qu4cwi2.us-east-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=postgres
DB_USER=database_ios
DB_PASSWORD=Letmein786!
DB_MAX_CONNECTIONS=20
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=10000

# CORS Configuration
ALLOWED_ORIGINS=*

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Quiz Configuration
QUIZ_RETAKE_DAYS=7
MAX_QUIZ_LAYERS=7
```

---

## 🔧 Step 3: Database Connection

**File: `src/config/database.js`**

Requirements:
- Use `pg` Pool for connection pooling
- Load credentials from `.env`
- Add error handling
- Add health check function
- Log connection status

Key functions needed:
- `query(text, params)` - Execute SQL queries
- `getClient()` - Get a client from the pool
- `healthCheck()` - Test database connection

---

## 🔧 Step 4: Create API Endpoints

### Required Endpoints:

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/health` | Health check (database + API) |
| GET | `/api/v1/quiz/questions` | Get questions (with layer filter) |
| POST | `/api/v1/quiz/session` | Create new quiz session |
| POST | `/api/v1/quiz/progress` | Save single answer |
| GET | `/api/v1/quiz/progress/:userId` | Get user's progress |
| POST | `/api/v1/quiz/sync` | Sync multiple offline answers |
| POST | `/api/v1/quiz/results` | Save final quiz results |
| GET | `/api/v1/quiz/results/:userId` | Get user's results |
| GET | `/api/v1/quiz/retake-check/:userId` | Check 7-day retake eligibility |
| GET | `/api/v1/quiz/layer-intro/:layer` | Get layer introduction content |

---

## 🔧 Step 5: Request/Response Formats

### GET /api/v1/quiz/questions?layer=1

**Response:**
```json
{
  "success": true,
  "layer": 1,
  "count": 8,
  "questions": [
    {
      "id": 1,
      "layerNumber": 1,
      "questionNumber": "Q1",
      "questionText": "When I'm about to make an important decision...",
      "questionType": null,
      "weight": 1,
      "options": [
        {
          "id": 1,
          "optionKey": "a",
          "optionText": "I begin by clarifying the facts...",
          "optionDescription": "Decision loop activates — I begin with logic",
          "scoreType": "architect"
        }
      ]
    }
  ]
}
```

### POST /api/v1/quiz/session

**Request:**
```json
{
  "userId": "user-123",
  "startedAt": "2026-01-06T10:00:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "session": {
    "id": 1,
    "userId": "user-123",
    "startedAt": "2026-01-06T10:00:00Z",
    "isCompleted": false
  }
}
```

### POST /api/v1/quiz/progress

**Request:**
```json
{
  "userId": "user-123",
  "sessionId": "1",
  "questionId": 1,
  "selectedOptionId": 1,
  "layerNumber": 1,
  "answeredAt": "2026-01-06T10:01:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Progress saved",
  "progressId": 1
}
```

### GET /api/v1/quiz/retake-check/:userId

**Response (can retake):**
```json
{
  "success": true,
  "allowed": true,
  "message": "You can take the quiz now"
}
```

**Response (cannot retake):**
```json
{
  "success": true,
  "allowed": false,
  "lastCompletionDate": "2026-01-01T10:00:00Z",
  "retakeAvailableAt": "2026-01-08T10:00:00Z",
  "daysRemaining": 2,
  "hoursRemaining": 48,
  "message": "You can retake the quiz in 2 days"
}
```

---

## 🔧 Step 6: Error Handling

All endpoints must return consistent error format:

```json
{
  "success": false,
  "error": "Error message here"
}
```

Handle these database errors:
- `23505` - Duplicate entry (409 Conflict)
- `23503` - Foreign key violation (400 Bad Request)
- `22P02` - Invalid input syntax (400 Bad Request)

---

## 🔧 Step 7: Validation

Use `express-validator` for input validation:

- **userId** - Required, non-empty string
- **sessionId** - Required, non-empty string
- **questionId** - Required, integer
- **selectedOptionId** - Required, integer
- **layerNumber** - Required, integer (1-7)
- **layer** query param - Optional, integer (1-7)

---

## 🔧 Step 8: Middleware Stack

Order matters! Apply middleware in this order:

1. `helmet()` - Security headers
2. `cors()` - CORS for iOS app
3. `express.json()` - Body parsing
4. `compression()` - Response compression
5. `morgan()` - Request logging
6. `rateLimiter` - Rate limiting
7. Routes
8. 404 handler
9. Error handler (must be last)

---

## 🔧 Step 9: Database Queries

### Get Questions with Options:
```sql
SELECT 
  q.id, q.layer_number, q.question_number, q.question_text, 
  q.question_type, q.weight,
  o.id as option_id, o.option_key, o.option_text, 
  o.option_description, o.score_type
FROM quiz_questions q
LEFT JOIN quiz_options o ON q.id = o.question_id
WHERE q.layer_number = $1
ORDER BY q.id, o.id
```

### Save Progress with Upsert:
```sql
INSERT INTO user_quiz_progress 
(user_id, session_id, question_id, selected_option_id, layer_number, answered_at)
VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (session_id, question_id) 
DO UPDATE SET 
  selected_option_id = EXCLUDED.selected_option_id,
  answered_at = EXCLUDED.answered_at
RETURNING id
```

### Check Retake Eligibility:
```sql
SELECT completed_at, retake_available_at
FROM user_quiz_results
WHERE user_id = $1
ORDER BY completed_at DESC
LIMIT 1
```

---

## 🔧 Step 10: Testing

Create test file `tests/quiz.test.js`:

```javascript
const request = require('supertest');
const app = require('../src/server');

describe('Quiz API', () => {
  test('GET /health returns 200', async () => {
    const response = await request(app).get('/health');
    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe('ok');
  });

  test('GET /api/v1/quiz/questions?layer=1 returns questions', async () => {
    const response = await request(app).get('/api/v1/quiz/questions?layer=1');
    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.questions).toBeDefined();
  });
});
```

Run tests:
```bash
npm test
```

---

## 🔧 Step 11: Start Server

Add scripts to `package.json`:

```json
{
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",
    "test": "jest --coverage"
  }
}
```

Start development server:
```bash
npm run dev
```

Server should start on `http://localhost:3000`

---

## ✅ Success Criteria

Your backend is ready when:

1. ✅ Server starts without errors
2. ✅ `/health` endpoint returns database connection status
3. ✅ `/api/v1/quiz/questions?layer=1` returns 8 questions
4. ✅ Can create session with POST `/api/v1/quiz/session`
5. ✅ Can save progress with POST `/api/v1/quiz/progress`
6. ✅ Can retrieve progress with GET `/api/v1/quiz/progress/:userId`
7. ✅ Retake check works correctly (7-day restriction)
8. ✅ CORS headers present in all responses
9. ✅ Error handling returns consistent format
10. ✅ Rate limiting prevents abuse

---

## 🐛 Common Issues & Solutions

### Issue: Cannot connect to database

**Solution:**
- Check `.env` file has correct credentials
- Verify your IP is whitelisted in Aurora security group
- Test connection with `psql` command first

### Issue: CORS errors

**Solution:**
- Ensure `cors()` middleware is applied before routes
- Check `ALLOWED_ORIGINS` in `.env`
- Verify response headers include `Access-Control-Allow-Origin`

### Issue: Validation errors not showing

**Solution:**
- Use `express-validator` properly
- Call `validationResult(req)` in controller
- Return errors before processing request

---

## 📚 Additional Requirements

### Logging:
- Log all database queries with duration
- Log errors with stack traces
- Use different log levels (info, warn, error)

### Security:
- Use `helmet()` for security headers
- Validate all inputs
- Sanitize error messages (don't expose internal details)
- Use parameterized queries (prevent SQL injection)

### Performance:
- Use connection pooling
- Enable response compression
- Add database indexes for common queries
- Cache frequently accessed data (optional)

---

## 🚀 Deployment Checklist

Before deploying to production:

- [ ] Change `NODE_ENV` to `production`
- [ ] Update `ALLOWED_ORIGINS` to actual iOS app domain
- [ ] Change database password
- [ ] Enable SSL for database connection
- [ ] Set up proper logging (Winston, Bunyan)
- [ ] Add monitoring (PM2, New Relic)
- [ ] Configure reverse proxy (Nginx)
- [ ] Set up CI/CD pipeline
- [ ] Add API documentation (Swagger)
- [ ] Load test the API

---

## 📖 Reference Documentation

- **Express.js:** https://expressjs.com/
- **node-postgres:** https://node-postgres.com/
- **express-validator:** https://express-validator.github.io/
- **PostgreSQL:** https://www.postgresql.org/docs/

---

## 🎯 Final Notes

This backend is designed to:
- ✅ Be **stateless** (no session storage)
- ✅ Support **offline sync** from iOS app
- ✅ Handle **concurrent requests** safely
- ✅ Provide **clear error messages**
- ✅ Be **easy to test** and maintain
- ✅ Scale **horizontally** (add more servers)

**Good luck building! 🚀**
