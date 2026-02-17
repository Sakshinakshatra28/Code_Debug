# Code Snippets - Key Changes in server.js

## 1. Import Section (Lines 1-7)

**BEFORE:**
```javascript
const express = require('express');
const { execSync } = require('child_process');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
```

**AFTER:**
```javascript
const express = require('express');
const { execSync, spawnSync } = require('child_process');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const os = require('os');
```

---

## 2. executeCode Function Complete Code (Lines 250-430)

```javascript
/**
 * Execute code using child_process (with proper multi-language support)
 * Handles Python, C, and Java with proper error handling and timeouts
 */
function executeCode(code, language) {
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }

    const timestamp = Date.now();
    let sourceFile, outputFile, compileCommand, runCommand, isExecutable = false;
    const filesToClean = [];

    try {
        switch (language.toLowerCase()) {
            case 'python':
                // ========== PYTHON EXECUTION ==========
                sourceFile = path.join(tempDir, `script_${timestamp}.py`);
                fs.writeFileSync(sourceFile, code, 'utf-8');
                filesToClean.push(sourceFile);

                // Run directly with python
                runCommand = ['python', sourceFile];
                break;

            case 'c':
                // ========== C EXECUTION ==========
                sourceFile = path.join(tempDir, `program_${timestamp}.c`);
                // Platform-specific executable name
                outputFile = path.join(
                    tempDir, 
                    os.platform() === 'win32' 
                        ? `program_${timestamp}.exe` 
                        : `program_${timestamp}`
                );
                
                fs.writeFileSync(sourceFile, code, 'utf-8');
                filesToClean.push(sourceFile, outputFile);

                // Compile C code
                const compileResult = spawnSync('gcc', [sourceFile, '-o', outputFile], {
                    timeout: 5000,
                    encoding: 'utf-8',
                    maxBuffer: 10 * 1024 * 1024
                });

                if (compileResult.error || compileResult.status !== 0) {
                    return {
                        success: false,
                        output: '',
                        error: compileResult.stderr || compileResult.error?.message || 'Compilation failed',
                        compileError: true
                    };
                }

                // Run compiled executable
                runCommand = [outputFile];
                isExecutable = true;
                break;

            case 'java':
                // ========== JAVA EXECUTION ==========
                // Use fixed name "Main.java" - Java requires class name to match filename
                sourceFile = path.join(tempDir, `Main.java`);
                const classFile = path.join(tempDir, 'Main.class');
                
                fs.writeFileSync(sourceFile, code, 'utf-8');
                filesToClean.push(sourceFile, classFile);

                // Compile Java code - compile in the temp directory so .class is created there
                const javaCompileResult = spawnSync('javac', [sourceFile], {
                    timeout: 5000,
                    cwd: tempDir,
                    encoding: 'utf-8',
                    maxBuffer: 10 * 1024 * 1024
                });

                if (javaCompileResult.error || javaCompileResult.status !== 0) {
                    return {
                        success: false,
                        output: '',
                        error: javaCompileResult.stderr || javaCompileResult.error?.message || 'Compilation failed',
                        compileError: true
                    };
                }

                // Run Java class - specify classpath and class name (without .class)
                runCommand = ['java', '-cp', tempDir, 'Main'];
                isExecutable = true;
                break;

            default:
                return {
                    success: false,
                    output: '',
                    error: `Unsupported language: ${language}`
                };
        }

        // ========== EXECUTE THE CODE ==========
        const result = spawnSync(runCommand[0], runCommand.slice(1), {
            timeout: 5000,
            encoding: 'utf-8',
            maxBuffer: 10 * 1024 * 1024,
            stdio: ['pipe', 'pipe', 'pipe']
        });

        if (result.error) {
            // Timeout or spawn error
            if (result.error.code === 'ETIMEDOUT') {
                return {
                    success: false,
                    output: result.stdout || '',
                    error: 'Execution timeout (5 seconds limit). Possible infinite loop.'
                };
            }
            return {
                success: false,
                output: result.stdout || '',
                error: result.error.message || 'Execution failed'
            };
        }

        // Check exit code
        if (result.status !== 0 && result.status !== null) {
            return {
                success: false,
                output: result.stdout || '',
                error: result.stderr || `Program exited with code ${result.status}`
            };
        }

        return {
            success: true,
            output: result.stdout || '',
            error: result.stderr || '',
            compileError: false
        };

    } catch (error) {
        return {
            success: false,
            output: '',
            error: error.message || 'Unknown error during execution'
        };
    } finally {
        // ========== CLEANUP TEMP FILES ==========
        filesToClean.forEach(file => {
            try {
                if (fs.existsSync(file)) {
                    fs.unlinkSync(file);
                }
            } catch (e) {
                // Silently ignore cleanup errors
            }
        });
    }
}
```

---

## 3. Updated /session/:sessionId/submit Endpoint (Lines 507-550)

**BEFORE:**
```javascript
app.post('/session/:sessionId/submit', (req, res) => {
    const { sessionId } = req.params;
    const { code, questionId } = req.body;

    if (!sessions.has(sessionId)) {
        return res.status(404).json({ error: 'Session not found' });
    }

    const session = sessions.get(sessionId);
    const question = getQuestion(questionId, session.language);

    if (!question) {
        return res.status(404).json({ error: 'Question not found' });
    }

    // Execute the code
    const executionResult = executeCode(code, session.language);
    // Normalize line endings and trim for robust comparison (handles CRLF vs LF)
    const normalize = s => (s || '').replace(/\r\n/g, '\n').trim();
    const stdout = normalize(executionResult.stdout);
    const expectedOutput = normalize(question.expectedOutput);

    // Check if correct
    const isCorrect = stdout === expectedOutput;

    // Update queue and session
    const { session: updatedSession, isComplete } = handleSubmission(sessionId, questionId, isCorrect);

    res.json({
        isCorrect,
        output: executionResult.stdout,
        errors: executionResult.stderr,
        compileOutput: executionResult.compileOutput,
        expectedOutput: question.expectedOutput,
        explanation: question.explanation,
        score: updatedSession.score,
        questionsAttempted: updatedSession.questionsAttempted,
        questionsSolved: updatedSession.questionsSolved,
        testComplete: isComplete
    });
});
```

**AFTER:**
```javascript
app.post('/session/:sessionId/submit', (req, res) => {
    const { sessionId } = req.params;
    const { code, questionId } = req.body;

    if (!sessions.has(sessionId)) {
        return res.status(404).json({ error: 'Session not found' });
    }

    const session = sessions.get(sessionId);
    const question = getQuestion(questionId, session.language);

    if (!question) {
        return res.status(404).json({ error: 'Question not found' });
    }

    // Execute the code
    const executionResult = executeCode(code, session.language);
    
    // Normalize line endings and trim for robust comparison (handles CRLF vs LF)
    const normalize = s => (s || '').replace(/\r\n/g, '\n').trim();
    const stdout = normalize(executionResult.output);
    const expectedOutput = normalize(question.expectedOutput);

    // Check if correct (only if execution was successful)
    const isCorrect = executionResult.success && stdout === expectedOutput;

    // Update queue and session
    const { session: updatedSession, isComplete } = handleSubmission(sessionId, questionId, isCorrect);

    res.json({
        isCorrect,
        output: executionResult.output,
        errors: executionResult.error || '',
        compileError: executionResult.compileError || false,
        expectedOutput: question.expectedOutput,
        explanation: question.explanation,
        score: updatedSession.score,
        questionsAttempted: updatedSession.questionsAttempted,
        questionsSolved: updatedSession.questionsSolved,
        testComplete: isComplete
    });
});
```

**Key Changes:**
- Changed `executionResult.stdout` → `executionResult.output`
- Changed `executionResult.stderr` → `executionResult.error`
- Removed `compileOutput` field
- Added `executionResult.compileError` boolean
- Added check for `executionResult.success` in `isCorrect` logic

---

## 4. Updated /session/:sessionId/run Endpoint (Lines 552-567)

**BEFORE:**
```javascript
app.post('/session/:sessionId/run', (req, res) => {
    const { sessionId } = req.params;
    const { code, language } = req.body;

    if (!sessions.has(sessionId) && !language) {
        return res.status(400).json({ error: 'Invalid request' });
    }

    const executionResult = executeCode(code, language || sessions.get(sessionId).language);

    res.json({
        output: executionResult.stdout,
        errors: executionResult.stderr,
        compileOutput: executionResult.compileOutput
    });
});
```

**AFTER:**
```javascript
app.post('/session/:sessionId/run', (req, res) => {
    const { sessionId } = req.params;
    const { code, language } = req.body;

    if (!sessions.has(sessionId) && !language) {
        return res.status(400).json({ error: 'Invalid request' });
    }

    const executionResult = executeCode(code, language || sessions.get(sessionId).language);

    res.json({
        success: executionResult.success,
        output: executionResult.output,
        errors: executionResult.error || '',
        compileError: executionResult.compileError || false
    });
});
```

**Key Changes:**
- Added `success` field
- Changed field names to match new response format
- Changed default values
- Added `compileError` flag

---

## Summary of Changes

| Change | Type | Impact |
|--------|------|--------|
| Added `spawnSync` import | Dependency | Better process handling |
| Added `os` import | Dependency | Platform detection |
| Replaced `executeCode()` | Function | Fixed C/Java issues |
| Updated submit endpoint | API | New response format |
| Updated run endpoint | API | New response format |
| **Total Lines Modified** | - | ~180 lines changed/added |

---

## No Changes Required To:

- ✅ HTML (index.html)
- ✅ CSS (style.css)
- ✅ Frontend JavaScript (script.js)
- ✅ Question data
- ✅ Session management
- ✅ Other API endpoints
- ✅ Package.json (same dependencies)

---

## Testing the Changes

After applying these changes, test with:

```bash
# Start server
node server.js

# In another terminal, test Python
curl -X POST http://localhost:3000/session/test/run \
  -H "Content-Type: application/json" \
  -d '{"code":"print(\"test\")","language":"Python"}'

# Test C
curl -X POST http://localhost:3000/session/test/run \
  -H "Content-Type: application/json" \
  -d '{"code":"#include <stdio.h>\nint main(){printf(\"test\\n\");return 0;}","language":"C"}'

# Test Java
curl -X POST http://localhost:3000/session/test/run \
  -H "Content-Type: application/json" \
  -d '{"code":"public class Main{public static void main(String[] a){System.out.println(\"test\");}}","language":"Java"}'
```

All should return `"success": true` with output captured!
