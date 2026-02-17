# Code Debugging Competition - Complete File Reference

## Project Summary

A full-stack web application for coding challenges where users fix buggy code within a 30-minute timer.

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Node.js + Express
- **Execution**: Local child_process (Python, C, Java)
- **Storage**: In-Memory (No Database)
- **Languages**: Python, C, Java (5 questions each)

---

## File Directory

```
code-debug/
├── index.html                      ← Main HTML file
├── style.css                       ← All styling (split-screen)
├── script.js                       ← Frontend logic (1000+ lines)
├── server.js                       ← Backend Express server
├── package.json                    ← NPM dependencies
├── README.md                       ← Quick start (this doc)
├── SETUP_GUIDE.md                  ← Detailed setup & APIs
├── SYSTEM_ARCHITECTURE.md          ← Architecture & queue logic
├── IMPLEMENTATION_EXAMPLES.md      ← Code examples
└── temp/                           ← Temporary files (auto-created)
    ├── script_TIMESTAMP.py
    ├── program_TIMESTAMP.c
    └── Main_TIMESTAMP.java
```

---

## File Details

### 1. index.html (320 lines)

**Purpose**: Main HTML structure for the entire application

**Key Sections**:
- `#start-page` - Landing page with start button
- `#language-page` - Language selection (Python/C/Java)
- `#competition-page` - Split-screen competition page
  - Left: Question display panel
  - Right: Code editor/compiler
  - Top: Timer, score, language badge
- `#results-page` - Final results and statistics

**Key Elements**:
```html
<textarea id="user-code" class="code-editor"></textarea>
<button onclick="runCode()">▶ Run Code</button>
<button onclick="submitCode()">✓ Submit Solution</button>
<pre id="output" class="output-box"></pre>
<span id="timer">30:00</span>
<span id="score">0</span>
```

### 2. style.css (450 lines)

**Purpose**: Complete styling for split-screen layout

**Key Classes**:
- `.split-container` - Main flex container (50/50 split)
- `.question-section` - Left panel (question display)
- `.compiler-section` - Right panel (code editor)
- `.top-bar` - Header with timer/score
- `.code-editor` - Textarea styling
- `.code-block` - Code display blocks
- `.button-group` - Button styling
- `.output-box` - Output display area

**Responsive Design**:
- Desktop: Side-by-side layout
- Tablet/Mobile: Stacked layout

### 3. script.js (500+ lines)

**Purpose**: Frontend JavaScript - entire user interaction logic

**Key Functions**:

```javascript
startCompetition(lang)      // Initialize session
displayQuestion(q)           // Show question and code
startTimer()                 // 30-minute countdown
runCode()                    // Execute without validation
submitCode()                 // Execute and validate
loadNextQuestion()          // Get next from queue
endCompetition(timedOut)    // Show results
restartCompetition()        // Reset everything
```

**Key Variables**:
```javascript
let sessionId = '';         // Current session ID
let currentQuestion = null; // Current question
let score = 0;              // Running score
let totalTime = 1800;       // Seconds remaining
let timerInterval = null;   // Timer reference
```

### 4. server.js (550+ lines)

**Purpose**: Node.js Express backend with code execution

**Key Routes**:

```javascript
POST  /session/init                  // Create session
GET   /session/:sessionId/question   // Get next question
POST  /session/:sessionId/run        // Run code (no validation)
POST  /session/:sessionId/submit     // Run and validate
GET   /session/:sessionId/stats      // Get statistics
GET   /health                        // Health check
```

**Key Data Structures**:

```javascript
sessions Map {
  sessionId → { language, score, questionsAttempted, ... }
}

questionQueues Map {
  sessionId → { originalQueue, currentQueue, solvedQuestions, ... }
}

allQuestions Object {
  'Python': [5 question objects],
  'C': [5 question objects],
  'Java': [5 question objects]
}
```

**Key Functions**:

```javascript
initializeSession(language, sessionId)  // Create new session
executeCode(code, language)             // Execute Python/C/Java
handleSubmission(sessionId, isCorrect)  // Update queue
```

### 5. package.json (25 lines)

**Purpose**: NPM configuration and dependencies

**Dependencies**:
- `express@^4.18.0` - Web framework
- `cors@^2.8.5` - Cross-origin requests
- `body-parser@^1.20.0` - Parse JSON bodies

**Dev Dependencies**:
- `nodemon@^3.0.1` - Auto-reload during development

**Scripts**:
```bash
npm start          # Run server
npm run dev        # Run with auto-reload
```

### 6. README.md (This File)

**Purpose**: Quick start guide (5-minute setup)

**Contents**:
- Installation steps
- 30-second startup
- Feature overview
- Sample questions
- Queue explanation
- Troubleshooting

### 7. SETUP_GUIDE.md (400+ lines)

**Purpose**: Comprehensive setup and API reference

**Sections**:
- Installation prerequisites (Python, GCC, Java)
- Step-by-step setup
- Complete project structure
- All API endpoints with examples
- Queue management theory
- Timer implementation
- Error handling
- Performance considerations
- Future enhancements

### 8. SYSTEM_ARCHITECTURE.md (500+ lines)

**Purpose**: Detailed architecture and queue logic

**Sections**:
- High-level system architecture (diagram)
- Complete user flow (visual)
- Queue logic deep-dive with examples
- Timer state management
- Frontend/Backend state
- Code execution flow for each language
- Error handling strategies
- Testing the queue logic

### 9. IMPLEMENTATION_EXAMPLES.md (600+ lines)

**Purpose**: Real code examples and walkthroughs

**Sections**:
- Frontend HTML structure
- Complete JavaScript flow (7 steps)
- Backend Node.js implementation
- Route-by-route breakdown
- Queue algorithm visualization
- Example session walkthrough

---

## Quick Reference

### Frontend Files
- **index.html** - HTML structure
- **style.css** - All styling
- **script.js** - All logic

### Backend Files
- **server.js** - Express server + questions
- **package.json** - Dependencies

### Documentation
- **README.md** - Quick start
- **SETUP_GUIDE.md** - Detailed setup
- **SYSTEM_ARCHITECTURE.md** - Architecture
- **IMPLEMENTATION_EXAMPLES.md** - Code examples

---

## Data Flow Summary

### Initialization
```
User clicks Start
    ↓
Select Language
    ↓
POST /session/init
    ↓
Backend: Create sessionId, shuffle questions
    ↓
Response: { sessionId, firstQuestion }
    ↓
Display question on screen
    ↓
Start 30-minute timer
```

### Submission
```
User clicks Submit
    ↓
POST /session/:sessionId/submit
    ↓
Backend: Execute code
    ↓
Compare output with expected
    ↓
Update queue (remove or re-queue)
    ↓
Response: { isCorrect, score, testComplete }
    ↓
Frontend: Show result, load next question
    ↓
If testComplete: Show results
Else: Display next question
```

### Completion
```
Queue becomes empty OR Timer reaches 0
    ↓
GET /session/:sessionId/stats
    ↓
Backend: Calculate stats
    ↓
Response: { score, questionsSolved, timeSpent, ... }
    ↓
Display results page
    ↓
User can restart or exit
```

---

## Key Concepts

### Queue System
- Questions are shuffled on start
- Correct answer → Remove from queue
- Wrong answer → Re-add to end of queue
- Test ends when queue is empty

### Timer
- Starts at 30:00 (1800 seconds)
- Counts down every 1 second
- Color changes: Green → Yellow → Red
- Auto-ends competition at 0:00

### Scoring
- 5 points per correct answer
- Maximum 25 points (5 questions × 5 points)
- Wrong answers don't deduct points
- Can retry failed questions unlimited times

### Code Execution
- Python: Direct execution (`python script.py`)
- C: Compile then execute (`gcc` + executable)
- Java: Compile then execute (`javac` + `java`)
- Timeout: 5 seconds per execution
- Output comparison: Exact string match (trimmed)

---

## Important Notes

⚠️ **This is for educational purposes. Production deployments should:**

1. Use Docker containers for sandboxed execution
2. Implement user authentication
3. Use a real database (MongoDB, PostgreSQL)
4. Add rate limiting and DDOS protection
5. Encrypt sensitive data
6. Use HTTPS instead of HTTP
7. Implement proper error logging
8. Add unit and integration tests

---

## Troubleshooting Quick Links

| Issue | Solution |
|-------|----------|
| "Cannot find module" | Run `npm install` |
| "Port already in use" | Use `PORT=3001 npm start` |
| "Python not found" | Install Python from python.org |
| "GCC not found" | Install MinGW (Windows) or brew install gcc (Mac) |
| "CORS error" | Ensure server is running on localhost:3000 |
| "Code won't execute" | Check 5-second timeout, code syntax |

---

## API Quick Reference

### GET /health
Check if server is running

### POST /session/init
Create new session and get first question
```json
{ "language": "Python" }
```

### GET /session/:sessionId/question
Get next question from queue

### POST /session/:sessionId/run
Execute code without validation
```json
{ "code": "...", "language": "Python" }
```

### POST /session/:sessionId/submit
Execute code and validate against expected output
```json
{ "code": "...", "questionId": "py1" }
```

### GET /session/:sessionId/stats
Get final statistics and score

---

## File Sizes (Approximate)

| File | Lines | Size |
|------|-------|------|
| index.html | 320 | 8 KB |
| style.css | 450 | 12 KB |
| script.js | 550 | 15 KB |
| server.js | 550 | 18 KB |
| package.json | 25 | 0.5 KB |
| Documentation | 2000+ | 100+ KB |
| **TOTAL** | **4000+** | **150+ KB** |

---

## Next Steps

1. ✅ Read README.md (5 minutes)
2. ✅ Run `npm install` (2 minutes)
3. ✅ Run `npm start` (30 seconds)
4. ✅ Open http://localhost:3000 (immediately)
5. ✅ Start debugging questions!

For deeper understanding:
- Read SYSTEM_ARCHITECTURE.md for queue logic
- Read IMPLEMENTATION_EXAMPLES.md for code examples
- Read SETUP_GUIDE.md for API details

---

## Support

For issues:
1. Check README.md troubleshooting section
2. Check SETUP_GUIDE.md error handling
3. Review console errors (browser F12)
4. Check terminal output (server logs)

Happy coding! 🚀

