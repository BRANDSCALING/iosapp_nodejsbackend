# 🎯 Cursor AI Prompt: BrandScaling iOS App - API Integration

## 📋 Project Context

You are updating the **BrandScaling E-DNA Quiz iOS app** to connect to a Node.js backend API instead of directly to Aurora PostgreSQL database.

### Current Architecture:
```
❌ iOS App → Aurora PostgreSQL (Direct - Insecure)
```

### New Architecture:
```
✅ iOS App → Node.js API → Aurora PostgreSQL (Secure)
```

---

## 🎯 Your Mission

Update the iOS app to:

1. **Remove direct database connection** (`DatabaseService.swift`)
2. **Create new API service layer** for HTTP requests
3. **Update QuizService** to use API instead of database
4. **Keep offline support** working
5. **Maintain all existing UI** and functionality
6. **Add network monitoring** for connection status
7. **Handle API errors** gracefully

---

## 📦 Current iOS Structure

```
BrandScaling/
├── Services/
│   ├── DatabaseService.swift      ← DELETE THIS (direct DB connection)
│   ├── QuizService.swift          ← UPDATE (use API instead)
│   ├── OfflineCacheService.swift  ← KEEP (still needed)
│   └── AuthService.swift          ← KEEP
├── Models/
│   ├── Quiz.swift                 ← KEEP (models stay same)
│   └── Results.swift              ← KEEP
├── ViewModels/
│   └── QuizViewModel.swift        ← UPDATE (handle API responses)
└── Views/
    └── QuizView.swift             ← MINIMAL CHANGES
```

---

## 🔧 Step 1: Create API Configuration

**Create new file: `Services/APIConfig.swift`**

```swift
import Foundation

struct APIConfig {
    // IMPORTANT: Update this with your actual Node.js server URL
    // For local development: http://localhost:3000
    // For production: https://your-server.com
    static let baseURL = "http://localhost:3000"
    
    static let apiVersion = "v1"
    
    struct Endpoints {
        static let health = "/health"
        static let questions = "/api/\(apiVersion)/quiz/questions"
        static let session = "/api/\(apiVersion)/quiz/session"
        static let progress = "/api/\(apiVersion)/quiz/progress"
        static let sync = "/api/\(apiVersion)/quiz/sync"
        static let results = "/api/\(apiVersion)/quiz/results"
        static let retakeCheck = "/api/\(apiVersion)/quiz/retake-check"
        static let layerIntro = "/api/\(apiVersion)/quiz/layer-intro"
    }
}
```

---

## 🔧 Step 2: Create API Service

**Create new file: `Services/APIService.swift`**

Requirements:
- Generic `request<T: Decodable>()` method
- Support GET, POST, PUT, DELETE
- Add query parameters support
- Handle JSON encoding/decoding
- Proper error handling
- Timeout configuration (30 seconds)
- Retry logic for network failures

### Error Types to Handle:

```swift
enum APIError: Error {
    case invalidURL
    case networkError(Error)
    case invalidResponse
    case decodingError(Error)
    case serverError(String)
    case unauthorized
    case notFound
}
```

### Key Methods Needed:

```swift
func request<T: Decodable>(
    endpoint: String,
    method: String = "GET",
    body: [String: Any]? = nil,
    queryParams: [String: String]? = nil
) async throws -> T
```

---

## 🔧 Step 3: Create Quiz API Service

**Create new file: `Services/QuizAPIService.swift`**

This wraps `APIService` with quiz-specific methods:

```swift
class QuizAPIService {
    static let shared = QuizAPIService()
    private let api = APIService.shared
    
    // Health check
    func checkHealth() async throws -> HealthResponse
    
    // Get questions
    func getQuestions(layer: Int, type: String? = nil) async throws -> QuestionsResponse
    
    // Create session
    func createSession(userId: String) async throws -> SessionResponse
    
    // Save progress
    func saveProgress(
        userId: String,
        sessionId: String,
        questionId: Int,
        selectedOptionId: Int,
        layerNumber: Int
    ) async throws -> ProgressResponse
    
    // Get progress
    func getProgress(userId: String) async throws -> UserProgressResponse
    
    // Sync offline answers
    func syncAnswers(
        userId: String,
        sessionId: String,
        answers: [[String: Any]]
    ) async throws -> SyncResponse
    
    // Save results
    func saveResults(
        userId: String,
        sessionId: String,
        layer1CoreType: String,
        layer1Strength: String,
        layer1ArchitectScore: Int,
        layer1AlchemistScore: Int
    ) async throws -> ResultsResponse
    
    // Get results
    func getResults(userId: String) async throws -> UserResultsResponse
    
    // Check retake eligibility
    func checkRetake(userId: String) async throws -> RetakeCheckResponse
    
    // Get layer intro
    func getLayerIntro(layer: Int) async throws -> LayerIntroResponse
}
```

---

## 🔧 Step 4: Response Models

**Update `Models/Quiz.swift` with API response models:**

```swift
// MARK: - API Response Models

struct HealthResponse: Codable {
    let status: String
    let timestamp: String
    let database: DatabaseHealth
}

struct DatabaseHealth: Codable {
    let status: String
    let timestamp: String?
    let version: String?
}

struct QuestionsResponse: Codable {
    let success: Bool
    let layer: Int?
    let count: Int
    let questions: [Question]
}

struct SessionResponse: Codable {
    let success: Bool
    let session: SessionData
}

struct SessionData: Codable {
    let id: Int
    let userId: String
    let startedAt: String
    let isCompleted: Bool
}

struct ProgressResponse: Codable {
    let success: Bool
    let message: String
    let progressId: Int
}

struct UserProgressResponse: Codable {
    let success: Bool
    let userId: String
    let hasSession: Bool
    let session: SessionData?
    let progress: [ProgressItem]
    let totalAnswered: Int
}

struct ProgressItem: Codable {
    let questionId: Int
    let selectedOptionId: Int
    let layerNumber: Int
    let answeredAt: String
}

struct SyncResponse: Codable {
    let success: Bool
    let synced: Int
    let failed: Int
    let message: String
}

struct ResultsResponse: Codable {
    let success: Bool
    let resultId: Int
    let retakeAvailableAt: String
}

struct UserResultsResponse: Codable {
    let success: Bool
    let userId: String
    let results: QuizResults
}

struct RetakeCheckResponse: Codable {
    let success: Bool
    let allowed: Bool
    let lastCompletionDate: String?
    let retakeAvailableAt: String?
    let daysRemaining: Int?
    let hoursRemaining: Int?
    let message: String?
}

struct LayerIntroResponse: Codable {
    let success: Bool
    let intro: LayerIntroData
}

struct LayerIntroData: Codable {
    let layerNumber: Int
    let title: String
    let description: String
    let content: String
}
```

---

## 🔧 Step 5: Update QuizService

**File: `Services/QuizService.swift`**

### Changes Required:

1. **Remove** all direct database calls
2. **Replace** with `QuizAPIService` calls
3. **Keep** scoring logic (client-side)
4. **Keep** offline cache integration

### Example Changes:

**Before (Direct Database):**
```swift
func loadQuestions(layer: Int) async throws -> [Question] {
    let result = try await DatabaseService.shared.query(
        "SELECT * FROM quiz_questions WHERE layer_number = $1",
        params: [layer]
    )
    // Parse result...
}
```

**After (API):**
```swift
func loadQuestions(layer: Int) async throws -> [Question] {
    let response = try await QuizAPIService.shared.getQuestions(layer: layer)
    return response.questions
}
```

---

## 🔧 Step 6: Update QuizViewModel

**File: `ViewModels/QuizViewModel.swift`**

### Add Network Status:

```swift
@Published var isOnline: Bool = true
@Published var isConnecting: Bool = false
@Published var connectionError: String?
```

### Update Methods:

```swift
func startQuiz() async {
    isLoading = true
    isConnecting = true
    
    do {
        // Check health first
        let health = try await QuizAPIService.shared.checkHealth()
        isOnline = health.status == "ok"
        
        // Create session
        let session = try await QuizAPIService.shared.createSession(userId: userId)
        sessionId = String(session.session.id)
        
        // Load first layer
        await loadQuestions(layer: 1)
        
    } catch {
        isOnline = false
        connectionError = error.localizedDescription
        // Fall back to offline mode
    }
    
    isLoading = false
    isConnecting = false
}
```

---

## 🔧 Step 7: Network Monitoring

**Create new file: `Services/NetworkMonitor.swift`**

```swift
import Network
import Combine

class NetworkMonitor: ObservableObject {
    private let monitor = NWPathMonitor()
    private let queue = DispatchQueue(label: "NetworkMonitor")
    
    @Published var isConnected = true
    @Published var connectionType: NWInterface.InterfaceType?
    
    init() {
        monitor.pathUpdateHandler = { [weak self] path in
            DispatchQueue.main.async {
                self?.isConnected = path.status == .satisfied
                self?.connectionType = path.availableInterfaces.first?.type
            }
        }
        monitor.start(queue: queue)
    }
    
    deinit {
        monitor.cancel()
    }
}
```

### Use in Views:

```swift
@StateObject private var networkMonitor = NetworkMonitor()

.onChange(of: networkMonitor.isConnected) { isConnected in
    if isConnected {
        // Sync offline data
        Task {
            await viewModel.syncOfflineAnswers()
        }
    } else {
        // Show offline indicator
        viewModel.isOnline = false
    }
}
```

---

## 🔧 Step 8: Offline Support

**Keep `OfflineCacheService.swift` as is**, but update integration:

### When Online:
1. Save answer to API
2. If success, don't save to offline cache
3. If failure, save to offline cache

### When Offline:
1. Save answer to offline cache immediately
2. Show "Saved offline" indicator
3. When connection restored, sync automatically

### Sync Logic:

```swift
func syncOfflineAnswers() async {
    guard !offlineAnswers.isEmpty, let sessionId = sessionId else {
        return
    }
    
    do {
        let response = try await QuizAPIService.shared.syncAnswers(
            userId: userId,
            sessionId: sessionId,
            answers: offlineAnswers
        )
        
        print("✅ Synced \(response.synced) answers")
        
        // Clear synced answers
        offlineAnswers.removeAll()
        isOffline = false
        
    } catch {
        print("❌ Sync failed: \(error)")
        // Keep answers in offline cache
    }
}
```

---

## 🔧 Step 9: Error Handling

### Display User-Friendly Messages:

```swift
extension APIError: LocalizedError {
    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid server URL"
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        case .invalidResponse:
            return "Invalid server response"
        case .decodingError:
            return "Failed to decode response"
        case .serverError(let message):
            return message
        case .unauthorized:
            return "Unauthorized access"
        case .notFound:
            return "Resource not found"
        }
    }
}
```

### Show Alerts:

```swift
.alert("Connection Error", isPresented: $showError) {
    Button("Retry") {
        Task {
            await viewModel.retryConnection()
        }
    }
    Button("Continue Offline") {
        viewModel.continueOffline()
    }
} message: {
    Text(viewModel.connectionError ?? "Unable to connect to server")
}
```

---

## 🔧 Step 10: Testing

### Test Checklist:

1. **Online Mode:**
   - [ ] Can load questions from API
   - [ ] Can create session
   - [ ] Can save progress
   - [ ] Can retrieve progress
   - [ ] Can save results
   - [ ] Can check retake eligibility

2. **Offline Mode:**
   - [ ] Answers saved to offline cache
   - [ ] "Saved offline" indicator shows
   - [ ] Can continue quiz offline
   - [ ] Offline answers sync when online

3. **Network Transitions:**
   - [ ] Online → Offline: Switch to offline mode
   - [ ] Offline → Online: Auto-sync pending answers
   - [ ] Show reconnect popup

4. **Error Handling:**
   - [ ] API errors show user-friendly messages
   - [ ] Network errors trigger offline mode
   - [ ] Retry logic works

---

## 🔧 Step 11: Configuration for Different Environments

**Update `APIConfig.swift` for different environments:**

```swift
struct APIConfig {
    static var baseURL: String {
        #if DEBUG
        // Local development
        return "http://localhost:3000"
        #else
        // Production
        return "https://api.brandscaling.com"
        #endif
    }
    
    // Or use environment variable
    static var baseURLFromEnv: String {
        if let url = ProcessInfo.processInfo.environment["API_BASE_URL"] {
            return url
        }
        return baseURL
    }
}
```

---

## ✅ Success Criteria

Your iOS app is ready when:

1. ✅ **Removed** `DatabaseService.swift` (no direct DB connection)
2. ✅ **Created** `APIService.swift` for HTTP requests
3. ✅ **Created** `QuizAPIService.swift` for quiz endpoints
4. ✅ **Updated** `QuizService.swift` to use API
5. ✅ **Updated** `QuizViewModel.swift` with network status
6. ✅ **Added** `NetworkMonitor.swift` for connectivity
7. ✅ **Tested** online mode (all API calls work)
8. ✅ **Tested** offline mode (answers cached locally)
9. ✅ **Tested** sync (offline answers upload when online)
10. ✅ **Tested** error handling (user-friendly messages)

---

## 🐛 Common Issues & Solutions

### Issue: Cannot connect to localhost from iOS Simulator

**Solution:**
- Use `http://localhost:3000` for iOS Simulator
- Use `http://YOUR_MAC_IP:3000` for physical device
- Check Node.js server is running
- Check firewall allows connections

### Issue: CORS errors

**Solution:**
- Ensure Node.js backend has CORS enabled
- Check `Access-Control-Allow-Origin` header
- Verify request headers are allowed

### Issue: Offline sync not working

**Solution:**
- Check `NetworkMonitor` is observing correctly
- Verify offline cache is saving answers
- Test sync method manually
- Check API sync endpoint works

### Issue: Decoding errors

**Solution:**
- Print raw JSON response: `print(String(data: data, encoding: .utf8))`
- Verify response model matches API response
- Check for optional vs required fields
- Use `JSONDecoder` with `keyDecodingStrategy`

---

## 📚 Additional Requirements

### Loading States:

```swift
@Published var isLoading: Bool = false
@Published var loadingMessage: String = ""

// Usage
loadingMessage = "Loading questions..."
isLoading = true
// ... API call ...
isLoading = false
```

### Save Status Indicators:

```swift
@Published var saveStatus: SaveStatus = .idle

enum SaveStatus {
    case idle
    case saving
    case saved
    case savedOffline
    case error(String)
}

// Show in UI
switch viewModel.saveStatus {
case .saving:
    Text("Saving...")
case .saved:
    Text("Saved ✓").foregroundColor(.green)
case .savedOffline:
    Text("Saved offline ⏳").foregroundColor(.orange)
case .error(let message):
    Text("Error: \(message)").foregroundColor(.red)
case .idle:
    EmptyView()
}
```

---

## 🚀 Deployment Checklist

Before releasing to App Store:

- [ ] Update `API_BASE_URL` to production server
- [ ] Remove all `print()` debug statements
- [ ] Test on physical device (not just simulator)
- [ ] Test with slow network (Network Link Conditioner)
- [ ] Test offline mode thoroughly
- [ ] Add analytics for API errors
- [ ] Add crash reporting (Firebase Crashlytics)
- [ ] Test with different iOS versions
- [ ] Verify SSL certificate (HTTPS)
- [ ] Add API request timeout handling

---

## 📖 Reference Documentation

- **URLSession:** https://developer.apple.com/documentation/foundation/urlsession
- **Async/Await:** https://docs.swift.org/swift-book/LanguageGuide/Concurrency.html
- **Codable:** https://developer.apple.com/documentation/swift/codable
- **Network Framework:** https://developer.apple.com/documentation/network

---

## 🎯 Final Notes

This update:
- ✅ Removes **insecure direct database access**
- ✅ Adds **proper API layer**
- ✅ Maintains **offline support**
- ✅ Improves **security**
- ✅ Makes **backend changes independent** of iOS app
- ✅ Enables **better error handling**
- ✅ Allows **backend scaling**

**Your iOS app will be more secure, maintainable, and scalable! 🚀**
