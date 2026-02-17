# Function Reference - Copy & Paste Ready

## Quick Copy-Paste Functions

All these functions are already in **script.js**. This file is for reference and backup.

---

## ✅ Helper Functions (Copy if needed)

### Function 1: ensureJavaWrapper()
```javascript
function ensureJavaWrapper(code) {
    const trimmed = code.trim();
    
    // If code already has 'class Main', it's likely properly formatted
    if (trimmed.includes('class Main')) {
        return code;
    }
    
    // If code contains main method without class wrapper
    if (trimmed.includes('public static void main')) {
        return `public class Main {\n    ${trimmed}\n}`;
    }
    
    // Wrap any Java-like code in Main class
    return `public class Main {
    public static void main(String[] args) {
        ${trimmed}
    }
}`;
}
```

---

### Function 2: normalizeOutput()
```javascript
function normalizeOutput(text) {
    if (!text || typeof text !== 'string') return '';
    
    return text
        .trim()
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .split('\n')
        .map(line => line.trimEnd())
        .join('\n');
}
```

---

### Function 3: extractExecutionResult()
```javascript
function extractExecutionResult(result) {
    const output = {
        text: '',
        isError: false,
        errorType: 'success', // 'success', 'compilation', 'runtime', 'timeout'
        isCompiledSuccessfully: true
    };
    
    if (result.compile_output && result.compile_output.trim() !== '') {
        output.text = result.compile_output;
        output.isError = true;
        output.errorType = 'compilation';
        output.isCompiledSuccessfully = false;
        return output;
    }
    
    if (result.stderr && result.stderr.trim() !== '') {
        output.text = result.stderr;
        output.isError = true;
        output.errorType = 'runtime';
        output.isCompiledSuccessfully = true;
        return output;
    }
    
    if (result.status && result.status.id === 5) {
        output.text = 'Execution timed out. Your code is running too long.';
        output.isError = true;
        output.errorType = 'timeout';
        return output;
    }
    
    output.text = result.stdout || '(No output)';
    output.isError = false;
    output.errorType = 'success';
    return output;
}
```

---

### Function 4: compareOutputs()
```javascript
function compareOutputs(expected, actual) {
    const expectedNorm = normalizeOutput(expected);
    const actualNorm = normalizeOutput(actual);
    
    return {
        isCorrect: expectedNorm === actualNorm,
        expectedNormalized: expectedNorm,
        actualNormalized: actualNorm
    };
}
```

---

## ✅ Main Functions (Already Updated)

### Function 5: executeCodeWithJudge0()

**Location in script.js:** Search for `async function executeCodeWithJudge0`

```javascript
async function executeCodeWithJudge0(source_code, languageName, stdin = '') {
    const langMap = { 'Python': 71, 'C': 50, 'Java': 62 };
    const language_id = langMap[languageName] || 71;

    // === CRITICAL: Auto-wrap Java code ===
    let finalCode = source_code;
    if (languageName === 'Java') {
        finalCode = ensureJavaWrapper(source_code);
    }

    const payload = {
        source_code: finalCode,
        language_id: language_id,
        stdin: stdin || '',
        wait: true
    };

    const res = await fetch(DIRECT_JUDGE0_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    const text = await res.text();
    if (!res.ok) {
        throw new Error('Judge0 error: ' + res.status + ' ' + res.statusText + ' - ' + text);
    }

    try {
        const result = JSON.parse(text);
        
        // Handle timeout
        if (!result.status || result.status.id === 5) {
            console.warn('Judge0 timeout, retrying...');
            return executeCodeWithJudge0(source_code, languageName, stdin);
        }
        
        return result;
    } catch (err) {
        throw new Error('Invalid JSON from Judge0: ' + err.message + '\n' + text);
    }
}
```

---

### Function 6: runCode()

**Location in script.js:** Search for `async function runCode()`

```javascript
async function runCode() {
    if (isRunning) return;

    const code = document.getElementById('user-code').value;

    if (!code.trim()) {
        showResultMessage('Please enter some code', 'warning');
        return;
    }

    isRunning = true;
    setButtonState(true);

    try {
        showResultMessage('Running...', 'info');
        
        // Get test input from current question (if available)
        const testInput = currentQuestion?.testInput || '';
        
        // Execute code
        const result = await executeCodeWithJudge0(code, language, testInput);
        
        // Extract output
        const execution = extractExecutionResult(result);

        const outputElement = document.getElementById('output');
        const outputStatus = document.getElementById('output-status');

        // Update output display
        outputElement.textContent = execution.text;
        
        if (execution.isError) {
            const errorLabel = execution.errorType.toUpperCase();
            outputElement.style.borderLeft = '4px solid #dc3545';
            outputStatus.innerHTML = `<span style="color: #dc3545;">❌ ${errorLabel}</span>`;
        } else {
            outputElement.style.borderLeft = '4px solid #28a745';
            outputStatus.innerHTML = '<span style="color: #28a745;">✓ Output</span>';
        }

    } catch (error) {
        showError('Execution error: ' + error.message);
    } finally {
        isRunning = false;
        setButtonState(false);
    }
}
```

---

### Function 7: submitCode()

**Location in script.js:** Search for `async function submitCode()`

```javascript
async function submitCode() {
    if (isRunning) return;

    const code = document.getElementById('user-code').value;

    if (!code.trim()) {
        showResultMessage('Please enter some code', 'warning');
        return;
    }

    isRunning = true;
    setButtonState(true);

    try {
        showResultMessage('Submitting and evaluating...', 'info');
        
        // Get test input from current question
        const testInput = currentQuestion?.testInput || '';
        
        // Execute code
        const result = await executeCodeWithJudge0(code, language, testInput);
        
        // Extract output
        const execution = extractExecutionResult(result);
        
        const outputElement = document.getElementById('output');

        // Display output to user
        outputElement.textContent = execution.text;
        outputElement.style.borderLeft = execution.isError ? '4px solid #dc3545' : '4px solid #28a745';
        
        // === EVALUATION ===
        // If code didn't compile or had runtime error, it's wrong
        if (execution.isError) {
            wrongAttempts += 1;
            addPenaltyQuestion(language);
            showResultMessage(
                `✗ Incorrect (${execution.errorType}).\nPenalty added (${penaltyDifficulty()}).\nAttempts: ${wrongAttempts}`,
                'danger'
            );
            setTimeout(() => loadNextQuestion(), 700);
            return;
        }
        
        // Compare outputs
        const comparison = compareOutputs(currentQuestion.expectedOutput, execution.text);
        
        if (comparison.isCorrect) {
            // === CORRECT ===
            questionQueue.shift();
            score += 1;
            document.getElementById('score').textContent = score;
            showResultMessage('✓ Correct! Great job!', 'success');
            
            setTimeout(() => loadNextQuestion(), 700);
        } else {
            // === WRONG OUTPUT ===
            wrongAttempts += 1;
            addPenaltyQuestion(language);
            
            const expectedDisplay = comparison.expectedNormalized.substring(0, 100);
            const actualDisplay = comparison.actualNormalized.substring(0, 100);
            
            showResultMessage(
                `✗ Incorrect.\nExpected: "${expectedDisplay}"\nGot: "${actualDisplay}"\nPenalty added (${penaltyDifficulty()}).\nAttempts: ${wrongAttempts}`,
                'danger'
            );
            
            setTimeout(() => loadNextQuestion(), 700);
        }

    } catch (error) {
        showError('Submission error: ' + error.message);
    } finally {
        isRunning = false;
        setButtonState(false);
    }
}
```

---

## 📝 Example Question Structure

```javascript
{
    id: 'java-m2',
    difficulty: 'medium',
    title: 'Add Two Numbers',
    questionText: 'Sum two numbers from input',
    buggyCode: 'import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner s = new Scanner(System.in);\n        int a = s.nextInt(), b = s.nextInt();\n        System.out.println(a - b);  // BUG: should be +\n    }\n}',
    expectedOutput: '3',
    testInput: '1 2'
}
```

**Key Fields:**
- `id` - Unique identifier
- `difficulty` - 'easy', 'medium', 'hard', 'veryHard'
- `title` - Display in UI
- `questionText` - Description
- `buggyCode` - Code students must fix
- `expectedOutput` - Correct answer
- `testInput` - ✨ New field! Test input for Scanner

---

## 🧪 Usage Examples

### Example 1: Call with input
```javascript
const result = await executeCodeWithJudge0(
    'System.out.println(input);',
    'Java',
    '1 2'  // ← testInput parameter
);
```

### Example 2: Call without input
```javascript
const result = await executeCodeWithJudge0(
    'System.out.println("Hello");',
    'Java'
    // testInput defaults to ''
);
```

### Example 3: Extract result
```javascript
const execution = extractExecutionResult(result);
console.log(execution.text);           // "Hello" or error message
console.log(execution.isError);        // true or false
console.log(execution.errorType);      // 'success', 'compilation', 'runtime', etc.
```

### Example 4: Compare output
```javascript
const comparison = compareOutputs('3', '3\n');
console.log(comparison.isCorrect);     // true (differences normalized)
console.log(comparison.expectedNormalized); // "3"
console.log(comparison.actualNormalized);   // "3"
```

---

## 🔌 Integration Checklist

- [x] Helper functions added
- [x] executeCodeWithJudge0() updated
- [x] runCode() updated
- [x] submitCode() updated
- [x] POOLS updated with testInput
- [x] initializeQueueForLanguage() preserves testInput
- [x] addPenaltyQuestion() includes testInput
- [x] All functions in script.js

**Everything is in script.js - no manual copy-paste needed!**

---

## 🐛 Debugging Tips

### Log Judge0 request:
```javascript
// In executeCodeWithJudge0(), after creating payload:
console.log('Sending to Judge0:', payload);
```

### Log execution result:
```javascript
// In submitCode(), after extraction:
console.log('Execution result:', execution);
```

### Log comparison:
```javascript
// In submitCode(), after comparison:
console.log('Comparison:', comparison);
console.log('Expected:', comparison.expectedNormalized);
console.log('Actual:', comparison.actualNormalized);
```

---

## 📊 Function Call Flow

```
User clicks "Run Code"
    ↓
runCode()
    ↓
Get testInput from currentQuestion
    ↓
executeCodeWithJudge0(code, language, testInput)
    ├─ ensureJavaWrapper() [if Java]
    ├─ Send to Judge0 API
    └─ Return result from Judge0
    ↓
extractExecutionResult(result)
    └─ Return { text, isError, errorType }
    ↓
Display output in UI
```

```
User clicks "Submit Solution"
    ↓
submitCode()
    ↓
Get testInput from currentQuestion
    ↓
executeCodeWithJudge0(code, language, testInput)
    [same as above]
    ↓
extractExecutionResult(result)
    [same as above]
    ↓
Check for errors (isError = true/false)
    ├─ If error: Mark wrong, add penalty, return
    └─ If no error: Continue to comparison
    ↓
compareOutputs(expected, actual)
    ├─ normalizeOutput() on both
    └─ Return { isCorrect, expectedNormalized, actualNormalized }
    ↓
Check result (isCorrect = true/false)
    ├─ If correct: Remove from queue, increase score
    └─ If wrong: Add penalty, keep in queue
    ↓
Load next question
```

---

## ✨ You're All Set!

All functions are in **script.js** and ready to use.

**What to do next:**
1. Test the application
2. Share with students
3. Celebrate! 🎉

No further changes needed!
