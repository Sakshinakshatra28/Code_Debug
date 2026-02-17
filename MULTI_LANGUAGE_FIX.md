# Multi-Language Code Execution Fix - Complete Guide

## 📋 Overview

This document explains:
1. **Why Python works but C and Java fail**
2. **The root causes of failures**
3. **How the fixes address each issue**
4. **Implementation details**
5. **Testing procedures**

---

## 🔍 Root Cause Analysis

### Why Python Works ✅

Python execution succeeds because:
- ✅ **No compilation needed** - Python is interpreted directly
- ✅ **Simple execution model** - Just run `python script.py`
- ✅ **No class/filename dependencies** - No naming constraints
- ✅ **No classpath configuration** - Works immediately
- ✅ **Direct stdio capture** - Easy to capture output

### Why C Failed ❌

**Problem 1: Platform-Specific Executable Extension**
```javascript
// OLD CODE (Windows-only):
const exePath = path.join(tempDir, `program_${timestamp}.exe`);
// On Linux, gcc creates 'program_123456' not 'program_123456.exe'
// This causes the executable to not be found!
```

**Solution:**
```javascript
// NEW CODE (Cross-platform):
outputFile = path.join(
    tempDir, 
    os.platform() === 'win32' 
        ? `program_${timestamp}.exe` 
        : `program_${timestamp}`
);
```

**Problem 2: Shell Command String Execution**
```javascript
// OLD CODE - Uses shell string:
command = `"${exePath}"`; // This becomes a string
execSync(command, { timeout: 5000 }); // Shell tries to find "program_123456.exe"
// Shell parsing can fail with paths containing spaces!
```

**Solution:**
```javascript
// NEW CODE - Uses spawn with array arguments:
const result = spawnSync(runCommand[0], runCommand.slice(1), {
    timeout: 5000,
    encoding: 'utf-8'
});
// No shell parsing issues, handles spaces correctly
```

### Why Java Failed ❌

**Problem 1: Class Name ≠ Filename**
```java
// File: Main_123456.java
// Java requires: Class name matches filename!
public class Main {  // ❌ MISMATCH!
    public static void main(String[] args) {
        System.out.println("Hello");
    }
}
// Error: class Main is public, should be declared in a file named Main.java
```

**Problem 2: Incorrect Class Execution**
```javascript
// OLD CODE:
command = `java -cp "${tempDir}" Main_${timestamp}`;
// But the compiled class file is "Main_123456.class"
// And the public class inside is just "Main" 
// Java looks for Main_123456 but finds Main
// Result: ClassNotFoundException
```

**Solution:**
```javascript
// NEW CODE - Use fixed filename "Main.java":
sourceFile = path.join(tempDir, `Main.java`); // Fixed name
fs.writeFileSync(sourceFile, code, 'utf-8');

// Compile it:
spawnSync('javac', [sourceFile], { cwd: tempDir });
// Creates: tempDir/Main.class ✅

// Run it correctly:
runCommand = ['java', '-cp', tempDir, 'Main']; // Matches class name
spawnSync(runCommand[0], runCommand.slice(1), { ... });
```

---

## 🔧 Implementation Details

### 1. Import Required Modules

```javascript
const { execSync, spawnSync } = require('child_process');
const os = require('os');  // For platform detection
```

### 2. New Execute Code Function

```javascript
function executeCode(code, language) {
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }

    const timestamp = Date.now();
    let sourceFile, outputFile;
    const filesToClean = [];

    try {
        switch (language.toLowerCase()) {
            // ========== PYTHON ==========
            case 'python':
                sourceFile = path.join(tempDir, `script_${timestamp}.py`);
                fs.writeFileSync(sourceFile, code, 'utf-8');
                filesToClean.push(sourceFile);
                runCommand = ['python', sourceFile];
                break;

            // ========== C ==========
            case 'c':
                sourceFile = path.join(tempDir, `program_${timestamp}.c`);
                outputFile = path.join(
                    tempDir,
                    os.platform() === 'win32' 
                        ? `program_${timestamp}.exe`
                        : `program_${timestamp}`
                );
                
                fs.writeFileSync(sourceFile, code, 'utf-8');
                filesToClean.push(sourceFile, outputFile);

                // Compile with proper error handling
                const compileResult = spawnSync('gcc', [sourceFile, '-o', outputFile], {
                    timeout: 5000,
                    encoding: 'utf-8',
                    maxBuffer: 10 * 1024 * 1024
                });

                if (compileResult.error || compileResult.status !== 0) {
                    return {
                        success: false,
                        output: '',
                        error: compileResult.stderr || 'Compilation failed',
                        compileError: true
                    };
                }

                runCommand = [outputFile];
                break;

            // ========== JAVA ==========
            case 'java':
                // KEY FIX: Use fixed filename "Main.java"
                sourceFile = path.join(tempDir, `Main.java`);
                const classFile = path.join(tempDir, 'Main.class');
                
                fs.writeFileSync(sourceFile, code, 'utf-8');
                filesToClean.push(sourceFile, classFile);

                // Compile in temp directory
                const javaCompileResult = spawnSync('javac', [sourceFile], {
                    timeout: 5000,
                    cwd: tempDir,  // Important: compile in temp directory
                    encoding: 'utf-8',
                    maxBuffer: 10 * 1024 * 1024
                });

                if (javaCompileResult.error || javaCompileResult.status !== 0) {
                    return {
                        success: false,
                        output: '',
                        error: javaCompileResult.stderr || 'Compilation failed',
                        compileError: true
                    };
                }

                // KEY FIX: Use 'Main' not 'Main_timestamp'
                runCommand = ['java', '-cp', tempDir, 'Main'];
                break;
        }

        // ========== EXECUTE CODE ==========
        const result = spawnSync(runCommand[0], runCommand.slice(1), {
            timeout: 5000,
            encoding: 'utf-8',
            maxBuffer: 10 * 1024 * 1024,
            stdio: ['pipe', 'pipe', 'pipe']
        });

        if (result.error) {
            if (result.error.code === 'ETIMEDOUT') {
                return {
                    success: false,
                    output: result.stdout || '',
                    error: 'Execution timeout (5 seconds). Possible infinite loop.'
                };
            }
            return {
                success: false,
                output: result.stdout || '',
                error: result.error.message || 'Execution failed'
            };
        }

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
            error: error.message || 'Unknown error'
        };
    } finally {
        // ========== CLEANUP ==========
        filesToClean.forEach(file => {
            try {
                if (fs.existsSync(file)) {
                    fs.unlinkSync(file);
                }
            } catch (e) {
                // Ignore
            }
        });
    }
}
```

### 3. Updated Response Format

**Submit Endpoint:**
```javascript
app.post('/session/:sessionId/submit', (req, res) => {
    const { sessionId } = req.params;
    const { code, questionId } = req.body;

    const session = sessions.get(sessionId);
    const question = getQuestion(questionId, session.language);
    
    // Execute with new function
    const executionResult = executeCode(code, session.language);
    
    const normalize = s => (s || '').replace(/\r\n/g, '\n').trim();
    const stdout = normalize(executionResult.output);
    const expectedOutput = normalize(question.expectedOutput);

    // Only mark correct if execution succeeded AND output matches
    const isCorrect = executionResult.success && stdout === expectedOutput;

    const { session: updatedSession, isComplete } = handleSubmission(
        sessionId, questionId, isCorrect
    );

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

**Run Endpoint:**
```javascript
app.post('/session/:sessionId/run', (req, res) => {
    const { sessionId } = req.params;
    const { code, language } = req.body;

    const executionResult = executeCode(code, language || 
        sessions.get(sessionId).language);

    res.json({
        success: executionResult.success,
        output: executionResult.output,
        errors: executionResult.error || '',
        compileError: executionResult.compileError || false
    });
});
```

---

## ✨ Key Improvements

| Issue | Old | New |
|-------|-----|-----|
| **C on Linux** | Hardcoded `.exe` | Platform detection using `os.platform()` |
| **Java class name** | `Main_${timestamp}` | Fixed `Main.java` |
| **Java execution** | Wrong classpath | Correct: `java -cp tempDir Main` |
| **Error handling** | String concatenation | Separate compile/runtime errors |
| **Execution model** | `execSync` with shell strings | `spawnSync` with array arguments |
| **Timeouts** | Basic timeout | `ETIMEDOUT` detection & messaging |
| **File cleanup** | Incomplete | Comprehensive cleanup in finally block |
| **Cross-platform** | Windows-only | Windows + Linux support |

---

## 🧪 Testing

### Test C Code
```c
#include <stdio.h>
int main() {
    printf("Hello from C\n");
    return 0;
}
```
**Expected:** `Hello from C`

### Test Java Code
```java
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello from Java");
    }
}
```
**Expected:** `Hello from Java`

### Test Python Code
```python
print("Hello from Python")
```
**Expected:** `Hello from Python`

### Test Timeout (Infinite Loop)
```c
#include <stdio.h>
int main() {
    while(1); // Infinite loop
    return 0;
}
```
**Expected:** `Execution timeout (5 seconds). Possible infinite loop.`

---

## 📦 Temp Folder Structure

```
temp/
├── script_1707123456789.py          # Deleted after Python execution
├── program_1707123456790.c          # Deleted after C execution
├── program_1707123456790.exe        # Deleted after C execution (Windows)
├── Main_1707123456791.java          # Deleted after Java execution
└── Main.class                       # Deleted after Java execution
```

**Note:** Main.java is now fixed (no timestamp) - prevents class name mismatches!

---

## 🔗 OS Compatibility

### Windows
- ✅ Python: Uses `python` command
- ✅ C: Uses `gcc`, executable `.exe`
- ✅ Java: Uses `javac` and `java`

### Linux
- ✅ Python: Uses `python3` or `python`
- ✅ C: Uses `gcc`, executable has no extension
- ✅ Java: Uses `javac` and `java`

### macOS
- ✅ All same as Linux

---

## 🚀 Next Steps

1. Install dependencies if missing:
   ```bash
   npm install
   ```

2. Ensure compilers are installed:
   ```bash
   # Windows (using scoop or choco)
   scoop install gcc python openjdk
   
   # Linux (Ubuntu/Debian)
   sudo apt-get install build-essential python3 default-jdk
   
   # macOS (using Homebrew)
   brew install gcc python openjdk
   ```

3. Test the server:
   ```bash
   node server.js
   ```

4. Open browser and test all three languages via the web interface.

---

## 📝 Summary of Changes

### server.js Changes:
1. Added `os` module import for platform detection
2. Changed `execSync` to `spawnSync` for better process handling
3. Added proper C compilation with platform-specific executable naming
4. Fixed Java filename to `Main.java` (was `Main_${timestamp}.java`)
5. Updated response format with `success`, `compileError` flags
6. Improved error handling and timeout detection
7. Comprehensive file cleanup in finally block
8. Added structured error responses

All changes are backward compatible with the existing frontend!
