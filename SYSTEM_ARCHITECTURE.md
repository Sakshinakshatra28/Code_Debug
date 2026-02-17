# Code Debugging Competition - Architecture & Queue Logic

## Complete System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────┐
│                    USER BROWSER                      │
├─────────────────────────────────────────────────────┤
│  HTML5 + CSS3 + Vanilla JavaScript                  │
│  - Split-screen layout                              │
│  - Timer management (30 minutes)                     │
│  - Form submission and display                       │
│  - Real-time UI updates                             │
└────────────────────┬────────────────────────────────┘
                     │
                     │ HTTP REST API
                     │ (JSON requests/responses)
                     │
┌────────────────────▼────────────────────────────────┐
│         Node.js EXPRESS SERVER (Port 3000)          │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────────────────────────────────────┐  │
│  │  In-Memory Data Structures                  │  │
│  ├─────────────────────────────────────────────┤  │
│  │  sessions Map:                              │  │
│  │  - sessionId → { language, score, ...}      │  │
│  │                                              │  │
│  │  questionQueues Map:                        │  │
│  │  - sessionId → { currentQueue, solved... }  │  │
│  │                                              │  │
│  │  allQuestions Object:                       │  │
│  │  - Python: [5 questions]                    │  │
│  │  - C: [5 questions]                         │  │
│  │  - Java: [5 questions]                      │  │
│  └─────────────────────────────────────────────┘  │
│                                                     │
│  ┌─────────────────────────────────────────────┐  │
│  │  Code Execution Engine (child_process)      │  │
│  ├─────────────────────────────────────────────┤  │
│  │  Python:  Write → Execute → Capture output │  │
│  │  C:       Write → Compile → Execute → Out  │  │
│  │  Java:    Write → Compile → Execute → Out  │  │
│  │  Timeout: 5 seconds per execution           │  │
│  └─────────────────────────────────────────────┘  │
│                                                     │
│  ┌─────────────────────────────────────────────┐  │
│  │  REST API Routes                            │  │
│  ├─────────────────────────────────────────────┤  │
│  │  POST   /session/init                       │  │
│  │  GET    /session/:id/question               │  │
│  │  POST   /session/:id/run                    │  │
│  │  POST   /session/:id/submit                 │  │
│  │  GET    /session/:id/stats                  │  │
│  │  GET    /questions/:language                │  │
│  └─────────────────────────────────────────────┘  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Complete User Flow

```
START
  │
  ├─────────────────────────────────────────┐
  │  Landing Page                           │
  │  "SQUIDTECH Code Debugging Competition" │
  │  [Start Button]                         │
  └────────────┬────────────────────────────┘
               │ User clicks "Start"
               │
  ┌────────────▼────────────────────────────┐
  │  Language Selection Page                 │
  │  [Python] [C] [Java]                     │
  └────────────┬────────────────────────────┘
               │ User selects language
               │
  ┌────────────▼────────────────────────────┐
  │  Backend: Initialize Session             │
  │  - Generate sessionId                    │
  │  - Create question queue                 │
  │  - Shuffle 5 questions                   │
  └────────────┬────────────────────────────┘
               │
  ┌────────────▼────────────────────────────┐
  │  Split-Screen Competition Page           │
  │                                          │
  │  LEFT: Question Display                  │
  │  - Question Title                        │
  │  - Problem Description                   │
  │  - Buggy Code (read-only)                │
  │  - Expected Output                       │
  │                                          │
  │  RIGHT: Compiler Section                 │
  │  - Code Editor (editable)                │
  │  - [Run] [Submit] [Skip] buttons         │
  │  - Output Panel                          │
  │  - Result Message                        │
  │                                          │
  │  TOP: Timer + Score + Language           │
  └────────────┬────────────────────────────┘
               │
               ├────────────────────────────┐
               │ User clicks "Run Code"     │
               │ (without submitting)       │
               │                            │
               │ ┌──────────────────────┐  │
               │ │ Execute Code         │  │
               │ │ Show Output/Errors   │  │
               │ │ No scoring           │  │
               │ └──────────────────────┘  │
               │                            │
               └────────────┬───────────────┘
                            │
               ┌────────────▼──────────────┐
               │ User clicks "Submit"      │
               │                           │
               │ ┌──────────────────────┐  │
               │ │ Execute Code         │  │
               │ │ Compare with         │  │
               │ │ expected output      │  │
               │ └──────────────────────┘  │
               └────────────┬───────────────┘
                            │
                   ┌────────┴────────┐
                   │                 │
        ┌──────────▼──────────┐   ┌──▼──────────────┐
        │ CORRECT ✓           │   │ INCORRECT ✗     │
        ├─────────────────────┤   ├─────────────────┤
        │ - Score += 5        │   │ - Score += 0    │
        │ - Remove from queue │   │ - Re-queue      │
        │ - Show success msg  │   │ - Show error    │
        │ - Load next Q       │   │ - Load next Q   │
        └──────────┬──────────┘   └────┬────────────┘
                   │                    │
                   └────────┬───────────┘
                            │
                ┌───────────▼────────────┐
                │ Queue Empty?           │
                └───────────┬────────────┘
                            │
                   ┌────────┴────────┐
                   │                 │
                   YES              NO
                   │                 │
        ┌──────────▼──────────┐   │
        │ COMPETITION ENDS ✓  │   │ Load Next Question
        │ Show Results Page   │   │ (repeat loop)
        │ - Final Score       │   │
        │ - Questions Solved  │   └──────────────┐
        │ - Time Spent        │                 │
        │ - Success Rate      │                 │
        │ - [Restart] button  │                 │
        └─────────────────────┘                 │
                   │                            │
                   └────────────────────────────┘
                            │
                            ├─────────────────────────┐
                            │ User clicks "Restart"   │
                            │ or Time Expires         │
                            │                         │
                            └────────────┬────────────┘
                                         │
                                    LOOP BACK TO START
```

## Queue Logic - Deep Dive

### Data Structure

```javascript
// Each session maintains its own queue
{
  sessionId: "session_1707240600000_abc123",
  
  // Original order (never changes)
  originalQueue: ["py3", "py1", "py5", "py2", "py4"],
  
  // Current queue (changes as questions are solved/failed)
  currentQueue: ["py3", "py1", "py5", "py2", "py4"],
  
  // Tracks which questions have been solved
  solvedQuestions: [],
  
  // Tracks which questions were attempted but failed
  unsolvedQuestions: []
}
```

### Algorithm: When User Submits Code

```
STEP 1: Execute Code
├─ Get user's code
├─ Write to temporary file
├─ Compile (if C/Java)
├─ Execute with 5-second timeout
└─ Capture stdout/stderr

STEP 2: Validate Output
├─ Get actual output (trimmed whitespace)
├─ Get expected output (from question)
├─ Compare: actual === expected?
└─ isCorrect = true/false

STEP 3: Update Queue
├─ Remove first question from currentQueue
├─ IF isCorrect:
│  ├─ Add questionId to solvedQuestions
│  ├─ Score += 5
│  └─ questionsAttempted += 1
├─ ELSE (incorrect):
│  ├─ Add questionId to END of currentQueue
│  ├─ Add questionId to unsolvedQuestions
│  └─ questionsAttempted += 1
└─ questionsCorrect = solvedQuestions.length

STEP 4: Check Completion
├─ IF currentQueue is empty:
│  └─ Test Completed!
├─ ELSE:
│  ├─ Get next question: currentQueue[0]
│  └─ Display new question
└─ Send response to frontend
```

### Example Walkthrough

**Initial State:**
```
Questions: ["py1", "py2", "py3", "py4", "py5"]
currentQueue: ["py1", "py2", "py3", "py4", "py5"]
solvedQuestions: []
score: 0
questionsAttempted: 0
```

**User Solves py1 (CORRECT):**
```
Step 1: Execute code → output matches "hello"
Step 2: isCorrect = true
Step 3: 
  - Remove py1 from front
  - solvedQuestions = ["py1"]
  - score = 5
  - questionsAttempted = 1

After: currentQueue = ["py2", "py3", "py4", "py5"]
       Next question: py2
```

**User Attempts py2 (WRONG):**
```
Step 1: Execute code → output doesn't match expected
Step 2: isCorrect = false
Step 3:
  - Remove py2 from front
  - Add py2 to end
  - unsolvedQuestions = ["py2"]
  - score = 5 (no change)
  - questionsAttempted = 2

After: currentQueue = ["py3", "py4", "py5", "py2"]
       Next question: py3
```

**User Solves py3 (CORRECT):**
```
After: currentQueue = ["py4", "py5", "py2"]
       score = 10
       solvedQuestions = ["py1", "py3"]
       questionsAttempted = 3
```

**User Solves py4 (CORRECT):**
```
After: currentQueue = ["py5", "py2"]
       score = 15
```

**User Solves py5 (CORRECT):**
```
After: currentQueue = ["py2"]
       score = 20
```

**User Solves py2 (CORRECT) - 2nd attempt:**
```
After: currentQueue = [] ← EMPTY!
       score = 25
       solvedQuestions = ["py1", "py3", "py4", "py5", "py2"]
       questionsAttempted = 5
       
TEST COMPLETE! ✓
```

## Timer Logic - Deep Dive

### Timer State Management

```javascript
// Initialize
totalTime = 30 * 60; // 1800 seconds

// Every 1000ms (1 second)
timerInterval = setInterval(() => {
    // Calculate display
    const minutes = Math.floor(totalTime / 60);
    const seconds = totalTime % 60;
    const display = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    
    // Update UI
    document.getElementById('timer').textContent = display;
    
    // Change color based on time remaining
    if (totalTime < 300)        // < 5 minutes
        timer.className = 'badge badge-lg bg-danger';
    else if (totalTime < 600)   // < 10 minutes
        timer.className = 'badge badge-lg bg-warning';
    
    // Decrement
    totalTime--;
    
    // Check if expired
    if (totalTime < 0) {
        clearInterval(timerInterval);
        endCompetition(true); // true = timed out
    }
}, 1000);
```

### Timer Visuals

```
Time Remaining    Color      Urgency
─────────────────────────────────────
30:00 - 10:01     Default    Normal
10:00 - 5:01      Yellow     Moderate
5:00 - 0:00       Red        Critical
0:00              STOP       Time's up!
```

## State Management

### Frontend State

```javascript
// Global variables
let language = '';              // Selected language
let sessionId = '';             // Current session ID
let score = 0;                  // Current score
let totalTime = 30 * 60;        // Remaining time (in seconds)
let timerInterval = null;       // Timer reference
let currentQuestion = null;     // Current question object
let isRunning = false;          // Prevent multiple submissions
```

### Backend State

```javascript
// In-memory storage
const sessions = new Map();
// Key: sessionId
// Value: {
//   language: "Python",
//   score: 10,
//   questionsAttempted: 2,
//   questionsSolved: 2,
//   startTime: 1707240600000,
//   endTime: null
// }

const questionQueues = new Map();
// Key: sessionId
// Value: {
//   originalQueue: ["py1", "py2", ...],
//   currentQueue: ["py2", "py3", ...],
//   solvedQuestions: ["py1"],
//   unsolvedQuestions: []
// }
```

## Code Execution Flow

### Python

```
User submits code
    ↓
Write to: temp/script_[timestamp].py
    ↓
Execute: python script_[timestamp].py
    ↓
Capture stdout/stderr
    ↓
Delete temp file
    ↓
Return output to frontend
```

### C

```
User submits code
    ↓
Write to: temp/program_[timestamp].c
    ↓
Compile: gcc program_[timestamp].c -o program_[timestamp].exe
    ├─ If error → Return compile error
    └─ If success → Continue
    ↓
Execute: program_[timestamp].exe
    ↓
Capture stdout/stderr
    ↓
Delete temp files (.c, .exe)
    ↓
Return output to frontend
```

### Java

```
User submits code
    ↓
Write to: temp/Main_[timestamp].java
    ↓
Compile: javac Main_[timestamp].java
    ├─ If error → Return compile error
    └─ If success → Continue
    ↓
Execute: java -cp temp Main_[timestamp]
    ↓
Capture stdout/stderr
    ↓
Delete temp files (.java, .class)
    ↓
Return output to frontend
```

## Error Handling Strategies

### Frontend Error Handling

```javascript
try {
    const response = await fetch('/endpoint');
    const data = await response.json();
    
    if (!response.ok) {
        showError(data.error);
        return;
    }
    
    // Process success
} catch (error) {
    showError('Network error: ' + error.message);
}
```

### Backend Error Handling

```javascript
app.post('/session/:sessionId/submit', (req, res) => {
    const { sessionId } = req.params;
    
    // Check session exists
    if (!sessions.has(sessionId)) {
        return res.status(404).json({
            error: 'Session not found'
        });
    }
    
    try {
        // Execute code
        const result = executeCode(code, language);
        
        // Process result
        res.json({
            isCorrect: result === expected,
            output: result,
            ...
        });
    } catch (error) {
        res.status(500).json({
            error: 'Execution failed: ' + error.message
        });
    }
});
```

## Performance Optimizations

1. **Question Shuffling**: Random order prevents memorization
2. **Debouncing**: Prevent multiple rapid submissions
3. **Timeouts**: 5 seconds per execution prevents infinite loops
4. **In-Memory Storage**: Fast access, no database latency
5. **Temp File Cleanup**: Prevents disk space issues
6. **Lazy Loading**: Load question on demand

## Security Considerations

⚠️ **WARNING**: This is for educational purposes. Production deployments need:

1. **Sandboxing**: Use Docker containers for code execution
2. **Resource Limits**: Memory, CPU, disk constraints
3. **Input Validation**: Check code size, language
4. **Output Sanitization**: Prevent code injection
5. **Rate Limiting**: Prevent abuse
6. **Authentication**: Verify user identity
7. **HTTPS**: Encrypt data in transit

## Testing the Queue Logic

### Test Case 1: All Correct
```
1. Submit Q1 (correct) → score=5, queue=[Q2,Q3,Q4,Q5]
2. Submit Q2 (correct) → score=10, queue=[Q3,Q4,Q5]
3. Submit Q3 (correct) → score=15, queue=[Q4,Q5]
4. Submit Q4 (correct) → score=20, queue=[Q5]
5. Submit Q5 (correct) → score=25, queue=[]
Result: Test Complete! Final Score: 25 ✓
```

### Test Case 2: All Wrong (First Try)
```
1. Submit Q1 (wrong) → score=0, queue=[Q2,Q3,Q4,Q5,Q1]
2. Submit Q2 (wrong) → score=0, queue=[Q3,Q4,Q5,Q1,Q2]
3. Submit Q3 (wrong) → score=0, queue=[Q4,Q5,Q1,Q2,Q3]
4. Submit Q4 (wrong) → score=0, queue=[Q5,Q1,Q2,Q3,Q4]
5. Submit Q5 (wrong) → score=0, queue=[Q1,Q2,Q3,Q4,Q5]
(back to start, now they re-solve)
6. Submit Q1 (correct) → score=5, queue=[Q2,Q3,Q4,Q5]
...continues...
```

### Test Case 3: Mixed Results
```
1. Submit Q1 (correct) → score=5, queue=[Q2,Q3,Q4,Q5]
2. Submit Q2 (wrong) → score=5, queue=[Q3,Q4,Q5,Q2]
3. Submit Q3 (correct) → score=10, queue=[Q4,Q5,Q2]
4. Submit Q4 (wrong) → score=10, queue=[Q5,Q2,Q4]
5. Submit Q5 (correct) → score=15, queue=[Q2,Q4]
6. Submit Q2 (correct) → score=20, queue=[Q4]
7. Submit Q4 (correct) → score=25, queue=[]
Result: Test Complete! Final Score: 25 ✓
```

