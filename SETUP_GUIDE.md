# Code Debugging Competition - Complete Setup Guide

## Overview

This is a full-stack coding challenge application built with:
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Backend**: Node.js + Express
- **Code Execution**: Child Process (local execution)
- **Storage**: In-Memory (no database)
- **Languages Supported**: Python, C, Java

## Project Structure

```
code-debug/
├── index.html          # Main HTML file (split-screen layout)
├── style.css           # All styling
├── script.js           # Frontend JavaScript logic
├── server.js           # Backend Express server
├── package.json        # Node.js dependencies
└── README.md           # This file
```

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- Python 3.x (for Python code execution)
- GCC (for C code compilation) - Windows: `MinGW`, macOS: `brew install gcc`, Linux: `sudo apt-get install build-essential`
- Java JDK (for Java code compilation)

### Step 1: Install Dependencies

```bash
cd code-debug
npm install
```

This installs:
- `express` - Web framework
- `cors` - Cross-Origin Resource Sharing
- `body-parser` - Parse JSON request bodies

### Step 2: Update package.json

Ensure `package.json` has these dependencies:

```json
{
  "name": "code-debugging-competition",
  "version": "1.0.0",
  "main": "server.js",
  "dependencies": {
    "express": "^4.18.0",
    "cors": "^2.8.5",
    "body-parser": "^1.20.0"
  }
}
```

### Step 3: Start the Server

```bash
npm start
```

Or for development with auto-reload:

```bash
npm install -D nodemon
npx nodemon server.js
```

Server will run on `http://localhost:3000`

### Step 4: Open in Browser

Open `http://localhost:3000` in your browser.

---

## Architecture Overview

### Frontend (Client-Side)

```
Start Page
    ↓
Language Selection (Python / C / Java)
    ↓
Initialize Session
    ↓
Split-Screen Competion Page
├── Left Panel: Question Display
│   ├── Question Title
│   ├── Problem Description
│   ├── Buggy Code
│   └── Expected Output
│
└── Right Panel: Compiler
    ├── Code Editor (with buggy code)
    ├── Run Button (execute without submit)
    ├── Submit Button (validate output)
    ├── Output Panel
    └── Result Message
    ↓
Results Page (Score, Stats, Restart Option)
```

### Backend (Server-Side)

```
Express Server (Port 3000)
├── Routes:
│   ├── GET /health
│   ├── GET /questions/:language
│   ├── POST /session/init
│   ├── GET /session/:sessionId/question
│   ├── POST /session/:sessionId/run
│   ├── POST /session/:sessionId/submit
│   └── GET /session/:sessionId/stats
│
├── In-Memory Storage:
│   ├── sessions Map (active sessions)
│   ├── questionQueues Map (question state)
│   └── Question data (Python, C, Java)
│
└── Code Execution:
    ├── Python: execSync('python script.py')
    ├── C: execSync('gcc compile + run')
    └── Java: execSync('javac + java run')
```

---

## Queue Management Logic

### Queue Data Structure

Each session has a queue of questions:

```javascript
{
  sessionId: "session_1707240600000_abc123",
  originalQueue: ["py1", "py2", "py3", "py4", "py5"],  // Original order
  currentQueue: ["py1", "py2", "py3", "py4", "py5"],    // Changes as questions are solved/failed
  solvedQuestions: [],                                   // Track solved questions
  unsolvedQuestions: []                                  // Track failed attempts
}
```

### Flow Examples

#### Scenario 1: Correct Answer
```
Initial Queue: [py1, py2, py3, py4, py5]
User submits correct answer for py1
    ↓
Remove py1 from front
Score += 5
solvedQuestions.push(py1)
    ↓
New Queue: [py2, py3, py4, py5]
Next Question: py2
```

#### Scenario 2: Wrong Answer
```
Initial Queue: [py1, py2, py3, py4, py5]
User submits wrong answer for py1
    ↓
Remove py1 from front
Add py1 to END of queue
unsolvedQuestions.push(py1)
    ↓
New Queue: [py2, py3, py4, py5, py1]
Next Question: py2
```

#### Scenario 3: Complete All Questions
```
Queue: [py1]
User solves py1 correctly
    ↓
Remove py1
solvedQuestions = [py1, py2, py3, py4, py5]
    ↓
Queue is EMPTY → Test Complete!
Score: 5 * 5 = 25 points
```

### Key Rules

1. **Correct submissions**: Remove from queue, add 5 points
2. **Wrong submissions**: Re-add to end of queue, NO points
3. **Queue complete**: All original 5 questions solved
4. **Test ends when**: Queue is empty OR timer reaches 0

---

## Timer Implementation

### Timer Logic

```javascript
// Initial: 30 minutes = 1800 seconds
totalTime = 30 * 60;

// Every 1 second:
timerInterval = setInterval(() => {
  const minutes = Math.floor(totalTime / 60);
  const seconds = totalTime % 60;
  display = `${minutes}:${seconds}`;
  
  totalTime--;
  
  if (totalTime < 0) {
    endCompetition();
  }
}, 1000);
```

### Timer Color Changes
- **Full (30:00 - 10:01)**: Default
- **Moderate (10:00 - 5:01)**: Yellow
- **Low (5:00 - 0:00)**: Red

---

## API Endpoints

### 1. Health Check
```
GET /health
Response: { status: "ok", timestamp: "2024-02-06T10:30:00Z" }
```

### 2. Get All Questions
```
GET /questions/:language
Response: [
  {
    id: "py1",
    title: "Fix String Typo",
    buggyCode: "print('helo')",
    difficulty: "easy"
  },
  ...
]
```

### 3. Initialize Session
```
POST /session/init
Body: { language: "Python" }
Response: {
  sessionId: "session_...",
  language: "Python",
  question: {...},
  progress: { current: 1, total: 5 }
}
```

### 4. Get Next Question
```
GET /session/:sessionId/question
Response: {
  question: {...},
  progress: { current: 1, total: 5 },
  completed: false
}
```

### 5. Run Code (Show Output)
```
POST /session/:sessionId/run
Body: { code: "print('hello')", language: "Python" }
Response: {
  output: "hello",
  errors: "",
  compileOutput: ""
}
```

### 6. Submit Code (Validate)
```
POST /session/:sessionId/submit
Body: { code: "print('hello')", questionId: "py1" }
Response: {
  isCorrect: true,
  output: "hello",
  expectedOutput: "hello",
  explanation: "String typo fixed",
  score: 5,
  questionsAttempted: 1,
  questionsSolved: 1,
  testComplete: false
}
```

### 7. Get Session Statistics
```
GET /session/:sessionId/stats
Response: {
  score: 25,
  questionsAttempted: 5,
  questionsSolved: 5,
  timeSpent: 240,
  timespentFormatted: "4:00",
  language: "Python"
}
```

---

## Code Execution Details

### Python Execution
```javascript
// 1. Write code to temp file
fs.writeFileSync('script.py', code);

// 2. Execute
execSync('python script.py', { timeout: 5000 });

// 3. Get stdout, capture errors
// 4. Compare with expected output
```

### C Execution
```javascript
// 1. Write code to temp file
fs.writeFileSync('program.c', code);

// 2. Compile
execSync('gcc program.c -o program.exe', { timeout: 5000 });

// 3. Run executable
execSync('program.exe', { timeout: 5000 });

// 4. Get stdout
```

### Java Execution
```javascript
// 1. Write code to temp file
fs.writeFileSync('Main.java', code);

// 2. Compile
execSync('javac Main.java', { timeout: 5000 });

// 3. Run compiled class
execSync('java Main', { timeout: 5000 });

// 4. Get stdout
```

---

## Question Data Structure

Each question has:

```javascript
{
  id: "py1",                          // Unique ID
  title: "Fix String Typo",           // Question title
  description: "Fix the typo...",     // Problem statement
  buggyCode: "print('helo')",         // Buggy code to debug
  expectedOutput: "hello",            // Correct output
  difficulty: "easy",                 // easy|medium|hard
  explanation: "String typo: 'helo' should be 'hello'"  // Solution explanation
}
```

### Sample Python Questions

1. **py1**: String typo - Print 'hello' but code says 'helo'
2. **py2**: Division by zero - Fix divide by zero error
3. **py3**: Missing colon - Add missing : after for loop
4. **py4**: Indentation error - Fix indentation in if block
5. **py5**: Index out of range - Access correct array index

### Sample C Questions

1. **c1**: Missing semicolon
2. **c2**: Array out of bounds
3. **c3**: Division by zero
4. **c4**: Assignment vs comparison (= vs ==)
5. **c5**: Uninitialized pointer

### Sample Java Questions

1. **java1**: String typo
2. **java2**: Array index out of bounds
3. **java3**: NullPointerException
4. **java4**: Integer vs float division
5. **java5**: Missing loop braces

---

## Scoring System

- **Points per correct answer**: 5 points
- **Points per wrong answer**: 0 points
- **Maximum score**: 5 questions × 5 points = 25 points
- **Attempt limit**: None (can retry failed questions)

---

## Session Management

### Session Lifecycle

```
1. User clicks "Start"
2. Selects language
3. Backend creates session:
   - sessionId: unique identifier
   - Shuffles 5 questions
   - Creates queue
   - Starts timer (frontend)
4. User solves questions:
   - Submits code
   - Backend executes and validates
   - Updates queue
5. User finishes or time runs out:
   - Stop timer
   - Calculate final score
   - Show results
6. User restarts:
   - New session created
   - State reset
```

### Session Storage (In-Memory)

```javascript
sessions = Map {
  "session_1707240600000_abc123": {
    language: "Python",
    score: 15,
    questionsAttempted: 3,
    questionsSolved: 3,
    startTime: 1707240600000,
    endTime: null
  }
}

questionQueues = Map {
  "session_1707240600000_abc123": {
    originalQueue: ["py1", "py2", "py3", "py4", "py5"],
    currentQueue: ["py3", "py4", "py5"],
    solvedQuestions: ["py1", "py2"],
    unsolvedQuestions: []
  }
}
```

---

## Error Handling

### Frontend Error Handling
- Network errors: Show "Connection error" alert
- Validation errors: Show error from backend
- Execution timeout: Show "Code execution timed out"

### Backend Error Handling
- Invalid language: Return 400 error
- Session not found: Return 404 error
- Code execution error: Return error message
- Compilation failure: Return compiler error

---

## Troubleshooting

### Issue: "Cannot find command 'python'"
**Solution**: Ensure Python is installed and in PATH
```bash
# Windows
python --version

# macOS/Linux
python3 --version
```

### Issue: "Cannot find command 'gcc'"
**Solution**: Install compiler
```bash
# Windows: Install MinGW
# macOS: brew install gcc
# Linux: sudo apt-get install build-essential
```

### Issue: "Cannot find command 'java'"
**Solution**: Install Java JDK
```bash
java -version
javac -version
```

### Issue: "CORS error"
**Solution**: Ensure server is running and frontend URL matches backend configuration

### Issue: "Port 3000 already in use"
**Solution**: Use different port
```bash
PORT=3001 npm start
```

---

## File Cleanup

The server creates temporary files during code execution in a `temp/` folder:

```
code-debug/
├── temp/
│   ├── script_1707240600000.py  (deleted after execution)
│   ├── program_1707240600000.c  (deleted after execution)
│   └── Main_1707240600000.java  (deleted after execution)
```

These are automatically cleaned up after code execution.

---

## Performance Considerations

1. **Execution Timeout**: 5 seconds per code execution
2. **File Size Limit**: 50MB for request body (code)
3. **Output Buffer**: 10MB max
4. **Session Storage**: In-memory (resets on server restart)

---

## Future Enhancements

1. **Database Integration**: Replace Map with MongoDB
2. **User Authentication**: Add login/registration
3. **Leaderboard**: Track top scores
4. **Code Templates**: Pre-fill common bugs
5. **Hints System**: Provide hints for struggling users
6. **Analytics**: Track user progress
7. **Multiplayer**: Real-time competition
8. **Docker**: Containerized code execution

---

## License

MIT License - Feel free to use and modify

