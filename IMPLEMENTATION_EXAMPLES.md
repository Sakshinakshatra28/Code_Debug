# Code Debugging Competition - Implementation Examples

## Frontend Implementation

### HTML Structure (Split-Screen)

```html
<!-- Competition Page Container -->
<div class="container-fluid" id="competition-page">
    <!-- Top Bar: Timer, Score, Language -->
    <div class="top-bar">
        <div class="d-flex justify-content-between">
            <span id="timer" class="badge badge-lg bg-danger">30:00</span>
            <span id="language-badge" class="badge bg-primary">Python</span>
            <span class="badge bg-success">Score: <span id="score">0</span></span>
        </div>
    </div>

    <!-- Main Split Container -->
    <div class="split-container">
        <!-- LEFT: Question Display Section -->
        <div class="question-section">
            <div class="question-header">
                <h4>Question Title</h4>
                <span class="badge bg-info">Easy</span>
            </div>
            <div class="question-content">
                <h6>Problem Statement:</h6>
                <p id="question-description"></p>
                
                <h6>Buggy Code:</h6>
                <pre id="buggy-code" class="code-block"></pre>
                
                <h6>Expected Output:</h6>
                <pre id="expected-output" class="code-block"></pre>
            </div>
        </div>

        <!-- Divider -->
        <div class="divider"></div>

        <!-- RIGHT: Compiler Section -->
        <div class="compiler-section">
            <textarea id="user-code" class="code-editor"></textarea>
            <div class="button-group">
                <button class="btn btn-primary" onclick="runCode()">Run</button>
                <button class="btn btn-success" onclick="submitCode()">Submit</button>
                <button class="btn btn-secondary" onclick="skipQuestion()">Skip</button>
            </div>
            <div class="output-section">
                <pre id="output" class="output-box"></pre>
            </div>
            <div id="result-message" class="alert"></div>
        </div>
    </div>
</div>
```

### JavaScript: Complete Flow

```javascript
// ==================== STEP 1: Start Competition ====================

async function startCompetition(lang) {
    language = lang;
    
    // Request session from backend
    const response = await fetch('http://localhost:3000/session/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language })
    });
    
    const data = await response.json();
    sessionId = data.sessionId;
    currentQuestion = data.question;
    
    // Show competition page
    document.getElementById('competition-page').style.display = 'block';
    
    // Start timer
    startTimer();
    
    // Display first question
    displayQuestion(currentQuestion);
}

// ==================== STEP 2: Display Question ====================

function displayQuestion(question) {
    document.getElementById('question-title').textContent = question.title;
    document.getElementById('question-description').textContent = question.description;
    document.getElementById('buggy-code').textContent = question.buggyCode;
    document.getElementById('expected-output').textContent = question.expectedOutput;
    
    // Pre-fill user code with buggy code
    document.getElementById('user-code').value = question.buggyCode;
}

// ==================== STEP 3: Timer Management ====================

function startTimer() {
    let totalTime = 30 * 60; // 1800 seconds
    
    timerInterval = setInterval(() => {
        const minutes = Math.floor(totalTime / 60);
        const seconds = totalTime % 60;
        
        // Update display
        const display = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
        document.getElementById('timer').textContent = display;
        
        // Color based on time
        if (totalTime < 300)
            document.getElementById('timer').className = 'badge badge-lg bg-danger';
        else if (totalTime < 600)
            document.getElementById('timer').className = 'badge badge-lg bg-warning';
        
        totalTime--;
        
        // End when time runs out
        if (totalTime < 0) {
            clearInterval(timerInterval);
            endCompetition(true);
        }
    }, 1000);
}

// ==================== STEP 4: Run Code (Without Validation) ====================

async function runCode() {
    const code = document.getElementById('user-code').value;
    
    const response = await fetch(`http://localhost:3000/session/${sessionId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language })
    });
    
    const data = await response.json();
    
    // Display output
    const outputElement = document.getElementById('output');
    if (data.errors) {
        outputElement.textContent = 'ERROR:\n' + data.errors;
        outputElement.style.borderLeft = '4px solid red';
    } else {
        outputElement.textContent = data.output || '(No output)';
        outputElement.style.borderLeft = '4px solid green';
    }
}

// ==================== STEP 5: Submit Code (With Validation) ====================

async function submitCode() {
    const code = document.getElementById('user-code').value;
    
    const response = await fetch(`http://localhost:3000/session/${sessionId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            code,
            questionId: currentQuestion.id
        })
    });
    
    const data = await response.json();
    
    // Show output
    document.getElementById('output').textContent = data.output;
    
    // Show result
    if (data.isCorrect) {
        showMessage('✓ Correct! ' + data.explanation, 'success');
        score = data.score;
        
        // Load next question after 2 seconds
        setTimeout(() => loadNextQuestion(), 2000);
    } else {
        showMessage('✗ Incorrect. Expected: ' + data.expectedOutput, 'danger');
        
        // Question re-queued, load next after 2 seconds
        setTimeout(() => loadNextQuestion(), 2000);
    }
}

// ==================== STEP 6: Load Next Question ====================

async function loadNextQuestion() {
    const response = await fetch(`http://localhost:3000/session/${sessionId}/question`);
    const data = await response.json();
    
    if (data.completed) {
        endCompetition(false);
        return;
    }
    
    currentQuestion = data.question;
    displayQuestion(data.question);
}

// ==================== STEP 7: End Competition ====================

async function endCompetition(timedOut) {
    clearInterval(timerInterval);
    
    const response = await fetch(`http://localhost:3000/session/${sessionId}/stats`);
    const stats = await response.json();
    
    // Show results
    document.getElementById('competition-page').style.display = 'none';
    document.getElementById('results-page').style.display = 'block';
    
    document.getElementById('final-score').textContent = stats.score;
    document.getElementById('questions-solved').textContent = stats.questionsSolved;
    document.getElementById('time-spent').textContent = stats.timespentFormatted;
}
```

---

## Backend Implementation

### Node.js Express Server

```javascript
const express = require('express');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

// ==================== IN-MEMORY STORAGE ====================

const sessions = new Map();        // sessionId -> session data
const questionQueues = new Map();  // sessionId -> queue data
const allQuestions = {
    'Python': [...pythonQuestions],
    'C': [...cQuestions],
    'Java': [...javaQuestions]
};

// ==================== ROUTE 1: Initialize Session ====================

app.post('/session/init', (req, res) => {
    const { language } = req.body;
    
    // Validate language
    if (!allQuestions[language]) {
        return res.status(400).json({ error: 'Invalid language' });
    }
    
    // Generate session ID
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Shuffle questions
    const questions = allQuestions[language];
    const shuffled = [...questions].sort(() => Math.random() - 0.5);
    
    // Store session
    sessions.set(sessionId, {
        language,
        score: 0,
        questionsAttempted: 0,
        questionsSolved: 0,
        startTime: Date.now()
    });
    
    // Store question queue
    questionQueues.set(sessionId, {
        originalQueue: shuffled.map(q => q.id),
        currentQueue: shuffled.map(q => q.id),
        solvedQuestions: [],
        unsolvedQuestions: []
    });
    
    // Return first question
    res.json({
        sessionId,
        language,
        question: {
            id: shuffled[0].id,
            title: shuffled[0].title,
            description: shuffled[0].description,
            buggyCode: shuffled[0].buggyCode,
            difficulty: shuffled[0].difficulty
        }
    });
});

// ==================== ROUTE 2: Get Next Question ====================

app.get('/session/:sessionId/question', (req, res) => {
    const { sessionId } = req.params;
    
    if (!sessions.has(sessionId)) {
        return res.status(404).json({ error: 'Session not found' });
    }
    
    const queue = questionQueues.get(sessionId);
    const session = sessions.get(sessionId);
    
    // Check if queue is empty
    if (queue.currentQueue.length === 0) {
        return res.json({ completed: true });
    }
    
    // Get next question
    const questionId = queue.currentQueue[0];
    const question = allQuestions[session.language].find(q => q.id === questionId);
    
    res.json({
        question: {
            id: question.id,
            title: question.title,
            description: question.description,
            buggyCode: question.buggyCode,
            difficulty: question.difficulty
        },
        progress: {
            current: 6 - queue.currentQueue.length,
            total: 5
        }
    });
});

// ==================== ROUTE 3: Run Code (Without Validation) ====================

app.post('/session/:sessionId/run', (req, res) => {
    const { code, language } = req.body;
    
    const executionResult = executeCode(code, language);
    
    res.json({
        output: executionResult.stdout,
        errors: executionResult.stderr,
        compileOutput: executionResult.compileOutput
    });
});

// ==================== ROUTE 4: Submit Code (With Validation) ====================

app.post('/session/:sessionId/submit', (req, res) => {
    const { sessionId } = req.params;
    const { code, questionId } = req.body;
    
    // Get session and question
    const session = sessions.get(sessionId);
    const question = allQuestions[session.language].find(q => q.id === questionId);
    
    if (!question) {
        return res.status(404).json({ error: 'Question not found' });
    }
    
    // Execute code
    const executionResult = executeCode(code, session.language);
    const stdout = (executionResult.stdout || '').trim();
    const expectedOutput = (question.expectedOutput || '').trim();
    
    // Check if correct
    const isCorrect = stdout === expectedOutput;
    
    // Update queue
    const queue = questionQueues.get(sessionId);
    queue.currentQueue.shift(); // Remove first (current) question
    
    if (isCorrect) {
        // Correct: add to solved
        queue.solvedQuestions.push(questionId);
        session.score += 5;
        session.questionsSolved++;
    } else {
        // Wrong: re-queue
        queue.currentQueue.push(questionId);
        queue.unsolvedQuestions.push(questionId);
    }
    
    session.questionsAttempted++;
    
    // Check if test is complete
    const testComplete = queue.currentQueue.length === 0;
    if (testComplete) {
        session.endTime = Date.now();
    }
    
    res.json({
        isCorrect,
        output: executionResult.stdout,
        errors: executionResult.stderr,
        compileOutput: executionResult.compileOutput,
        expectedOutput: question.expectedOutput,
        explanation: question.explanation,
        score: session.score,
        questionsAttempted: session.questionsAttempted,
        questionsSolved: session.questionsSolved,
        testComplete
    });
});

// ==================== ROUTE 5: Get Session Statistics ====================

app.get('/session/:sessionId/stats', (req, res) => {
    const { sessionId } = req.params;
    
    const session = sessions.get(sessionId);
    const timespent = session.endTime ?
        Math.round((session.endTime - session.startTime) / 1000) :
        Math.round((Date.now() - session.startTime) / 1000);
    
    res.json({
        score: session.score,
        questionsAttempted: session.questionsAttempted,
        questionsSolved: session.questionsSolved,
        timeSpent: timespent,
        timespentFormatted: formatTime(timespent),
        language: session.language
    });
});

// ==================== HELPER: Execute Code ====================

function executeCode(code, language) {
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
    }
    
    const timestamp = Date.now();
    let filename, command;
    
    try {
        switch (language) {
            case 'Python':
                filename = path.join(tempDir, `script_${timestamp}.py`);
                fs.writeFileSync(filename, code);
                command = `python "${filename}"`;
                break;
            
            case 'C':
                filename = path.join(tempDir, `program_${timestamp}.c`);
                const exePath = path.join(tempDir, `program_${timestamp}.exe`);
                fs.writeFileSync(filename, code);
                
                // Compile
                try {
                    execSync(`gcc "${filename}" -o "${exePath}"`, { timeout: 5000 });
                } catch (err) {
                    return { stdout: '', stderr: err.message, compileOutput: err.message };
                }
                
                command = `"${exePath}"`;
                break;
            
            case 'Java':
                filename = path.join(tempDir, `Main_${timestamp}.java`);
                fs.writeFileSync(filename, code);
                
                // Compile
                try {
                    execSync(`javac "${filename}"`, { timeout: 5000, cwd: tempDir });
                } catch (err) {
                    return { stdout: '', stderr: err.message, compileOutput: err.message };
                }
                
                command = `java -cp "${tempDir}" Main_${timestamp}`;
                break;
        }
        
        // Execute
        const output = execSync(command, {
            timeout: 5000,
            maxBuffer: 10 * 1024 * 1024,
            encoding: 'utf-8'
        });
        
        return { stdout: output, stderr: '', compileOutput: '' };
        
    } catch (error) {
        return {
            stdout: '',
            stderr: error.message,
            compileOutput: error.stderr ? error.stderr.toString() : ''
        };
    } finally {
        // Cleanup
        try {
            if (fs.existsSync(filename)) fs.unlinkSync(filename);
        } catch (e) {
            // Ignore cleanup errors
        }
    }
}

// ==================== HELPER: Format Time ====================

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
}

// ==================== START SERVER ====================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
```

---

## Queue Algorithm Visualization

```
┌─────────────────────────────────────────────────────┐
│ INITIAL STATE                                       │
├─────────────────────────────────────────────────────┤
│ originalQueue: [PY1, PY2, PY3, PY4, PY5]            │
│ currentQueue:  [PY1, PY2, PY3, PY4, PY5]            │
│ solved:        []                                   │
│ score:         0                                    │
└─────────────────────────────────────────────────────┘

User submits solution for PY1 → CORRECT ✓
┌─────────────────────────────────────────────────────┐
│ AFTER CORRECT SUBMISSION                            │
├─────────────────────────────────────────────────────┤
│ currentQueue.shift() → Remove PY1 from front        │
│ solvedQuestions.push(PY1)                           │
│ score += 5                                          │
│                                                     │
│ currentQueue:  [PY2, PY3, PY4, PY5]                 │
│ solved:        [PY1]                                │
│ score:         5                                    │
│ nextQuestion:  PY2 ← Load this                      │
└─────────────────────────────────────────────────────┘

User submits solution for PY2 → WRONG ✗
┌─────────────────────────────────────────────────────┐
│ AFTER WRONG SUBMISSION                              │
├─────────────────────────────────────────────────────┤
│ currentQueue.shift() → Remove PY2 from front        │
│ currentQueue.push(PY2) → Add to end                 │
│ score += 0 (no change)                              │
│                                                     │
│ currentQueue:  [PY3, PY4, PY5, PY2]                 │
│ solved:        [PY1]                                │
│ score:         5                                    │
│ nextQuestion:  PY3 ← Load this                      │
└─────────────────────────────────────────────────────┘

... (continue solving PY3, PY4, PY5) ...

Finally, user solves PY2 → CORRECT ✓
┌─────────────────────────────────────────────────────┐
│ FINAL STATE                                         │
├─────────────────────────────────────────────────────┤
│ currentQueue:  [] ← EMPTY!                          │
│ solved:        [PY1, PY3, PY4, PY5, PY2]            │
│ score:         25                                   │
│ status:        COMPLETED ✓                          │
└─────────────────────────────────────────────────────┘
```

---

## Example Session Flow

### User Journey: Python Competition

```
TIME: 29:58  |  SCORE: 0  |  Q1 of 5

Question: Fix String Typo
Buggy Code:     print('helo')
Expected Output: hello

[User types: print('hello')]
[Clicks: Run Code]

Output:
hello

[Clicks: Submit Solution]
✓ Correct! String typo fixed.

─────────────────────────────────────

TIME: 28:45  |  SCORE: 5  |  Q2 of 5

Question: Division by Zero
Buggy Code:     a = 5; b = 0; print(a/b)
Expected Output: 2.5

[User types: a = 5; b = 2; print(a/b)]
[Clicks: Submit Solution]
✓ Correct!

─────────────────────────────────────

TIME: 25:30  |  SCORE: 25  |  

All 5 questions solved!

═════════════════════════════════════
         RESULTS
═════════════════════════════════════
Final Score:      25 / 25
Questions Solved: 5 / 5
Time Spent:       4:30
Success Rate:     100%
═════════════════════════════════════
```

This complete implementation guide covers all the core features and flows!

