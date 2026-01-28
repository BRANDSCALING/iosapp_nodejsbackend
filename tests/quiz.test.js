/**
 * Quiz API Tests
 * Tests for all quiz-related endpoints
 */

const request = require('supertest');
const app = require('../src/server');

// Test data
const testUserId = `test-user-${Date.now()}`;
let testSessionId;

describe('Quiz API', () => {
  // ============================================
  // Health Check Tests
  // ============================================
  
  describe('GET /health', () => {
    test('should return 200 and health status', async () => {
      const response = await request(app).get('/health');
      expect(response.statusCode).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.database).toBeDefined();
    });
  });

  // ============================================
  // Root Endpoint Tests
  // ============================================

  describe('GET /', () => {
    test('should return API info', async () => {
      const response = await request(app).get('/');
      expect(response.statusCode).toBe(200);
      expect(response.body.name).toBe('BrandScaling E-DNA Quiz API');
      expect(response.body.endpoints).toBeDefined();
    });
  });

  // ============================================
  // Questions Tests
  // ============================================

  describe('GET /api/v1/quiz/questions', () => {
    test('should return all questions when no layer specified', async () => {
      const response = await request(app).get('/api/v1/quiz/questions');
      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.questions).toBeDefined();
      expect(Array.isArray(response.body.questions)).toBe(true);
    });

    test('should return questions for layer 1', async () => {
      const response = await request(app).get('/api/v1/quiz/questions?layer=1');
      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.layer).toBe(1);
    });

    test('should return 400 for invalid layer', async () => {
      const response = await request(app).get('/api/v1/quiz/questions?layer=10');
      expect(response.statusCode).toBe(400);
    });
  });

  // ============================================
  // Session Tests
  // ============================================

  describe('POST /api/v1/quiz/session', () => {
    test('should create a new session', async () => {
      const response = await request(app)
        .post('/api/v1/quiz/session')
        .send({
          userId: testUserId,
          startedAt: new Date().toISOString()
        });
      
      expect(response.statusCode).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.session).toBeDefined();
      expect(response.body.session.userId).toBe(testUserId);
      
      testSessionId = response.body.session.id;
    });

    test('should return 400 when userId is missing', async () => {
      const response = await request(app)
        .post('/api/v1/quiz/session')
        .send({});
      
      expect(response.statusCode).toBe(400);
    });
  });

  // ============================================
  // Progress Tests
  // ============================================

  describe('POST /api/v1/quiz/progress', () => {
    test('should save progress', async () => {
      // Skip if no session was created
      if (!testSessionId) {
        console.log('Skipping progress test - no session created');
        return;
      }

      const response = await request(app)
        .post('/api/v1/quiz/progress')
        .send({
          userId: testUserId,
          sessionId: testSessionId,
          questionId: 1,
          selectedOptionId: 1,
          layerNumber: 1,
          answeredAt: new Date().toISOString()
        });
      
      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.progressId).toBeDefined();
    });

    test('should return 400 for invalid layerNumber', async () => {
      const response = await request(app)
        .post('/api/v1/quiz/progress')
        .send({
          userId: testUserId,
          sessionId: testSessionId,
          questionId: 1,
          selectedOptionId: 1,
          layerNumber: 10
        });
      
      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/quiz/progress/:userId', () => {
    test('should return user progress', async () => {
      const response = await request(app)
        .get(`/api/v1/quiz/progress/${testUserId}`);
      
      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.userId).toBe(testUserId);
    });

    test('should return empty progress for new user', async () => {
      const response = await request(app)
        .get('/api/v1/quiz/progress/nonexistent-user-12345');
      
      expect(response.statusCode).toBe(200);
      expect(response.body.hasSession).toBe(false);
    });
  });

  // ============================================
  // Sync Tests
  // ============================================

  describe('POST /api/v1/quiz/sync', () => {
    test('should sync multiple answers', async () => {
      // Skip if no session was created
      if (!testSessionId) {
        console.log('Skipping sync test - no session created');
        return;
      }

      const response = await request(app)
        .post('/api/v1/quiz/sync')
        .send({
          userId: testUserId,
          sessionId: testSessionId,
          answers: [
            { questionId: 2, selectedOptionId: 5, layerNumber: 1 },
            { questionId: 3, selectedOptionId: 9, layerNumber: 1 }
          ]
        });
      
      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.synced).toBeGreaterThanOrEqual(0);
    });

    test('should return 400 for invalid answers format', async () => {
      const response = await request(app)
        .post('/api/v1/quiz/sync')
        .send({
          userId: testUserId,
          sessionId: testSessionId,
          answers: 'not-an-array'
        });
      
      expect(response.statusCode).toBe(400);
    });
  });

  // ============================================
  // Retake Check Tests
  // ============================================

  describe('GET /api/v1/quiz/retake-check/:userId', () => {
    test('should allow new user to take quiz', async () => {
      const response = await request(app)
        .get('/api/v1/quiz/retake-check/brand-new-user-xyz');
      
      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.allowed).toBe(true);
    });

    test('should return proper response for existing user', async () => {
      const response = await request(app)
        .get(`/api/v1/quiz/retake-check/${testUserId}`);
      
      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(typeof response.body.allowed).toBe('boolean');
    });
  });

  // ============================================
  // Results Tests
  // ============================================

  describe('GET /api/v1/quiz/results/:userId', () => {
    test('should return 404 for user with no results', async () => {
      const response = await request(app)
        .get('/api/v1/quiz/results/nonexistent-user-xyz');
      
      expect(response.statusCode).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  // ============================================
  // Layer Intro Tests
  // ============================================

  describe('GET /api/v1/quiz/layer-intro/:layer', () => {
    test('should return layer intro for valid layer', async () => {
      const response = await request(app)
        .get('/api/v1/quiz/layer-intro/1');
      
      // May return 404 if no intro content exists yet
      expect([200, 404]).toContain(response.statusCode);
      if (response.statusCode === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.intro).toBeDefined();
      }
    });

    test('should return 400 for invalid layer number', async () => {
      const response = await request(app)
        .get('/api/v1/quiz/layer-intro/99');
      
      expect(response.statusCode).toBe(400);
    });
  });

  // ============================================
  // 404 Tests
  // ============================================

  describe('404 Handler', () => {
    test('should return 404 for unknown endpoints', async () => {
      const response = await request(app).get('/api/v1/nonexistent');
      expect(response.statusCode).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Endpoint not found');
    });
  });
});




