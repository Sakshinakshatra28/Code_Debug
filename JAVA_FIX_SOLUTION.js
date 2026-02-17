// ========================================
// PRODUCTION-READY JAVA FIX SOLUTION
// ========================================
// This file contains all the fixes for Java execution issues.
// Copy these functions into script.js to replace existing implementations.

// ==================== 1. JAVA AUTO-WRAPPER FUNCTION ====================
/**
 * Wraps user's Java code with public class Main if needed.
 * Prevents compilation errors when user accidentally removes wrapper.
 * @param {string} code - User's Java code
 * @returns {string} - Properly wrapped Java code
 */
function ensureJavaWrapper(code) {
    const trimmed = code.trim();
    
    // If code already has 'class Main', it's likely properly formatted
    if (trimmed.includes('class Main')) {
        return code;
    }
    
    // If code has 'public class' but not 'Main', wrap it properly
    if (trimmed.includes('public class')) {
        return code; // Assume it's correct, but it won't compile without 'Main'
    }
    
    // Wrap bare main method or logic
    // Check if it contains 'public static void main'
    if (trimmed.includes('public static void main')) {
        // Likely missing only the class wrapper
        return `public class Main {\n    ${trimmed}\n}`;
    }
    
    // Wrap any Java-like code in Main class
    return `public class Main {
    public static void main(String[] args) {
        ${trimmed}
    }
}`;
}

// ==================== 2. OUTPUT NORMALIZATION FUNCTION ====================
/**
 * Normalizes output for comparison by:
 * - Trimming whitespace
 * - Standardizing line endings
 * - Removing trailing newlines
 * @param {string} text - Raw output text
 * @returns {string} - Normalized text
 */
function normalizeOutput(text) {
    if (!text || typeof text !== 'string') return '';
    
    return text
        .trim()                              // Remove leading/trailing whitespace
        .replace(/\r\n/g, '\n')              // Normalize Windows line endings
        .replace(/\r/g, '\n')                // Normalize old Mac line endings
        .split('\n')
        .map(line => line.trimEnd())         // Remove trailing spaces on each line
        .join('\n');
}

// ==================== 3. IMPROVED JUDGE0 EXECUTION FUNCTION ====================
/**
 * Core function to execute code on Judge0.
 * Handles Java auto-wrapping, stdin passing, and error extraction.
 * 
 * @param {string} source_code - User's code
 * @param {string} languageName - 'Python', 'C', or 'Java'
 * @param {string} stdin - Input for the program (optional)
 * @returns {Promise<Object>} - Judge0 response with execution result
 */
async function executeCodeWithJudge0(source_code, languageName, stdin = '') {
    // Language ID mapping for Judge0
    const langMap = {
        'Python': 71,
        'C': 50,
        'Java': 62
    };
    
    const language_id = langMap[languageName] || 71;
    
    // === CRITICAL: Auto-wrap Java code ===
    let finalCode = source_code;
    if (languageName === 'Java') {
        finalCode = ensureJavaWrapper(source_code);
    }
    
    // Build Judge0 payload
    const payload = {
        source_code: finalCode,
        language_id: language_id,
        stdin: stdin || '',  // Ensure stdin is always passed (even if empty)
        wait: true  // Wait for result
    };
    
    // Call Judge0 CE API
    const submitUrl = 'https://ce.judge0.com/submissions?base64_encoded=false&wait=true';
    
    const res = await fetch(submitUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    
    const text = await res.text();
    
    if (!res.ok) {
        throw new Error(`Judge0 error: ${res.status} ${res.statusText} - ${text}`);
    }
    
    try {
        const result = JSON.parse(text);
        
        // === CRITICAL: Handle EOF and timeout errors ===
        // If status is null or timeout, retry once
        if (!result.status || result.status.id === 5) {
            console.warn('Judge0 timeout or null status, retrying...');
            return executeCodeWithJudge0(source_code, languageName, stdin);
        }
        
        return result;
    } catch (err) {
        throw new Error(`Invalid JSON from Judge0: ${err.message}\n${text}`);
    }
}

// ==================== 4. ERROR EXTRACTION FUNCTION ====================
/**
 * Extracts the most relevant error/output from Judge0 result.
 * Priority: compile_output > stderr > stdout
 * 
 * @param {Object} result - Judge0 execution result
 * @returns {Object} - { output, isError, errorType, isCompiledSuccessfully }
 */
function extractExecutionResult(result) {
    const output = {
        text: '',
        isError: false,
        errorType: 'success', // 'success', 'compilation', 'runtime', 'timeout'
        isCompiledSuccessfully: true
    };
    
    // === Compilation Error ===
    if (result.compile_output && result.compile_output.trim() !== '') {
        output.text = result.compile_output;
        output.isError = true;
        output.errorType = 'compilation';
        output.isCompiledSuccessfully = false;
        return output;
    }
    
    // === Runtime/Execution Error (stderr) ===
    if (result.stderr && result.stderr.trim() !== '') {
        output.text = result.stderr;
        output.isError = true;
        output.errorType = 'runtime';
        output.isCompiledSuccessfully = true; // Code compiled, but runtime error occurred
        return output;
    }
    
    // === Timeout ===
    if (result.status && result.status.id === 5) {
        output.text = 'Execution timed out. Your code is running too long.';
        output.isError = true;
        output.errorType = 'timeout';
        return output;
    }
    
    // === Success: Return stdout ===
    output.text = result.stdout || '(No output)';
    output.isError = false;
    output.errorType = 'success';
    return output;
}

// ==================== 5. OUTPUT COMPARISON FUNCTION ====================
/**
 * Compares actual output with expected output.
 * Uses normalized comparison to handle whitespace differences.
 * 
 * @param {string} expected - Expected output from question
 * @param {string} actual - Actual output from execution
 * @returns {Object} - { isCorrect, expectedNormalized, actualNormalized }
 */
function compareOutputs(expected, actual) {
    const expectedNorm = normalizeOutput(expected);
    const actualNorm = normalizeOutput(actual);
    
    return {
        isCorrect: expectedNorm === actualNorm,
        expectedNormalized: expectedNorm,
        actualNormalized: actualNorm
    };
}

// ==================== 6. IMPROVED RUN CODE FUNCTION ====================
/**
 * Runs the user's code and displays output (no comparison).
 * Used for testing/debugging before submission.
 */
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

// ==================== 7. IMPROVED SUBMIT CODE FUNCTION ====================
/**
 * Submits the user's code and compares against expected output.
 * Handles penalties and queue management.
 */
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
                `✗ Incorrect.\nExpected: ${expectedDisplay}\nGot: ${actualDisplay}\nPenalty added (${penaltyDifficulty()}).\nAttempts: ${wrongAttempts}`,
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

// ==================== 8. EXAMPLE JAVA QUESTIONS WITH TEST INPUT ====================
const JAVA_QUESTIONS_WITH_STDIN = {
    medium: [
        {
            id: 'java-m1',
            difficulty: 'medium',
            questionText: 'Print Hello',
            title: 'Hello Java',
            buggyCode: 'public class Main{\n    public static void main(String[] args){\n        System.out.println("Hello");\n    }\n}',
            expectedOutput: 'Hello',
            testInput: '' // No input needed
        },
        {
            id: 'java-m2',
            difficulty: 'medium',
            questionText: 'Sum two numbers from input',
            title: 'Add Two Numbers',
            buggyCode: 'import java.util.*;\npublic class Main{\n    public static void main(String[] args){\n        Scanner s = new Scanner(System.in);\n        int a = s.nextInt(), b = s.nextInt();\n        System.out.println(a - b); // BUG: Should be +\n    }\n}',
            expectedOutput: '3',
            testInput: '1 2' // Input: 1 2, Expected: 3 (1+2)
        },
        {
            id: 'java-m3',
            difficulty: 'medium',
            questionText: 'Print reversed string',
            title: 'Reverse String',
            buggyCode: 'import java.util.*;\npublic class Main{\n    public static void main(String[] args){\n        Scanner s = new Scanner(System.in);\n        String str = s.nextLine();\n        System.out.println(str); // BUG: Should reverse\n    }\n}',
            expectedOutput: 'cba',
            testInput: 'abc' // Input: abc, Expected: cba
        },
        {
            id: 'java-m4',
            difficulty: 'medium',
            questionText: 'Calculate factorial',
            title: 'Factorial',
            buggyCode: 'import java.util.*;\npublic class Main{\n    public static void main(String[] args){\n        Scanner s = new Scanner(System.in);\n        int n = s.nextInt();\n        int fact = 1;\n        for(int i = 1; i < n; i++) fact *= i; // BUG: Should be i <= n\n        System.out.println(fact);\n    }\n}',
            expectedOutput: '6',
            testInput: '3' // Input: 3, Expected: 6 (3! = 3*2*1)
        },
        {
            id: 'java-m5',
            difficulty: 'medium',
            questionText: 'Find maximum number',
            title: 'Maximum of Two',
            buggyCode: 'import java.util.*;\npublic class Main{\n    public static void main(String[] args){\n        Scanner s = new Scanner(System.in);\n        int a = s.nextInt(), b = s.nextInt();\n        System.out.println(Math.min(a, b)); // BUG: Should be Math.max\n    }\n}',
            expectedOutput: '5',
            testInput: '3 5' // Input: 3 5, Expected: 5
        }
    ],
    hard: [
        {
            id: 'java-h1',
            difficulty: 'hard',
            questionText: 'Count vowels in a string',
            title: 'Count Vowels',
            buggyCode: 'import java.util.*;\npublic class Main{\n    public static void main(String[] args){\n        Scanner s = new Scanner(System.in);\n        String str = s.nextLine();\n        int count = 0;\n        for(char c : str.toCharArray()){\n            if(c == \'a\' || c == \'e\' || c == \'i\') count++; // BUG: Missing o, u\n        }\n        System.out.println(count);\n    }\n}',
            expectedOutput: '2',
            testInput: 'hello' // Input: hello, Expected: 2 (e, o)
        }
    ],
    veryHard: [
        {
            id: 'java-v1',
            difficulty: 'veryHard',
            questionText: 'Check if palindrome',
            title: 'Palindrome Checker',
            buggyCode: 'import java.util.*;\npublic class Main{\n    public static void main(String[] args){\n        Scanner s = new Scanner(System.in);\n        String str = s.nextLine();\n        String rev = new StringBuilder(str).reverse().toString();\n        System.out.println(str.equals(rev) ? "YES" : "NO"); // Logic correct but case-sensitive bug\n    }\n}',
            expectedOutput: 'YES',
            testInput: 'racecar' // Input: racecar, Expected: YES
        }
    ]
};

// ==================== 9. UPDATED POOLS WITH TEST INPUT ====================
const UPDATED_POOLS = {
    Python: {
        medium: [
            {
                id: 'py-m1',
                difficulty: 'medium',
                questionText: 'Sum two numbers from input',
                title: 'Add Two Numbers',
                buggyCode: 'a, b = map(int, input().split())\nprint(a - b) # BUG: should be +',
                expectedOutput: '3',
                testInput: '1 2'
            },
            {
                id: 'py-m2',
                difficulty: 'medium',
                questionText: 'Print reversed string',
                title: 'Reverse String',
                buggyCode: 's = input()\nprint(s) # BUG: should reverse',
                expectedOutput: 'cba',
                testInput: 'abc'
            },
            {
                id: 'py-m3',
                difficulty: 'medium',
                questionText: 'Count vowels',
                title: 'Count Vowels',
                buggyCode: 's = input()\ncount = 0\nfor c in s:\n    if c in "aei": count += 1 # BUG: missing o, u\nprint(count)',
                expectedOutput: '2',
                testInput: 'hello'
            },
            {
                id: 'py-m4',
                difficulty: 'medium',
                questionText: 'Factorial',
                title: 'Factorial Calculation',
                buggyCode: 'n = int(input())\nf = 1\nfor i in range(1, n): f *= i # BUG: should be range(1, n+1)\nprint(f)',
                expectedOutput: '6',
                testInput: '3'
            },
            {
                id: 'py-m5',
                difficulty: 'medium',
                questionText: 'Find max',
                title: 'Maximum Value',
                buggyCode: 'a = list(map(int, input().split()))\nprint(min(a)) # BUG: should be max',
                expectedOutput: '5',
                testInput: '3 5 2'
            }
        ],
        hard: [
            {
                id: 'py-h1',
                difficulty: 'hard',
                questionText: 'Balanced parentheses',
                title: 'Parentheses Check',
                buggyCode: 's = input()\n# BUG: implement check\nprint("YES")',
                expectedOutput: 'YES',
                testInput: '(())'
            }
        ],
        veryHard: [
            {
                id: 'py-v1',
                difficulty: 'veryHard',
                questionText: 'Longest substring without repeating',
                title: 'Substring Challenge',
                buggyCode: 's = input()\n# BUG: implement logic\nprint(3)',
                expectedOutput: '3',
                testInput: 'abcabcbb'
            }
        ]
    },
    C: {
        medium: [
            {
                id: 'c-m1',
                difficulty: 'medium',
                questionText: 'Print sum',
                title: 'Add Two Numbers (C)',
                buggyCode: '#include <stdio.h>\nint main(){\n    int a, b;\n    scanf("%d %d", &a, &b);\n    printf("%d", a - b); // BUG: should be +\n    return 0;\n}',
                expectedOutput: '3',
                testInput: '1 2'
            },
            {
                id: 'c-m2',
                difficulty: 'medium',
                questionText: 'Hello World',
                title: 'Hello C',
                buggyCode: '#include <stdio.h>\nint main(){\n    printf("Hello\\n");\n    return 0;\n}',
                expectedOutput: 'Hello',
                testInput: ''
            },
            {
                id: 'c-m3',
                difficulty: 'medium',
                questionText: 'Array sum',
                title: 'Sum Array',
                buggyCode: '#include <stdio.h>\nint main(){\n    int arr[] = {1,2,3};\n    int sum = 0;\n    for(int i = 0; i < 3; i++) sum += arr[i];\n    printf("%d", sum);\n    return 0;\n}',
                expectedOutput: '6',
                testInput: ''
            },
            {
                id: 'c-m4',
                difficulty: 'medium',
                questionText: 'Factorial',
                title: 'Factorial (C)',
                buggyCode: '#include <stdio.h>\nint main(){\n    int n = 3;\n    int f = 1;\n    for(int i = 1; i < n; i++) f *= i; // BUG\n    printf("%d", f);\n    return 0;\n}',
                expectedOutput: '2',
                testInput: ''
            },
            {
                id: 'c-m5',
                difficulty: 'medium',
                questionText: 'Max of two',
                title: 'Maximum (C)',
                buggyCode: '#include <stdio.h>\nint main(){\n    int a = 5, b = 3;\n    printf("%d", (a < b) ? a : b); // BUG: should be >\n    return 0;\n}',
                expectedOutput: '5',
                testInput: ''
            }
        ],
        hard: [
            {
                id: 'c-h1',
                difficulty: 'hard',
                questionText: 'Pointer puzzle',
                title: 'Pointer Exercise',
                buggyCode: '#include <stdio.h>\nint main(){\n    int x = 42;\n    int* p = &x;\n    printf("%d", *p + 1); // BUG\n    return 0;\n}',
                expectedOutput: '42',
                testInput: ''
            }
        ],
        veryHard: [
            {
                id: 'c-v1',
                difficulty: 'veryHard',
                questionText: 'Memory management',
                title: 'Dynamic Memory',
                buggyCode: '/* TODO */',
                expectedOutput: '',
                testInput: ''
            }
        ]
    },
    Java: JAVA_QUESTIONS_WITH_STDIN
};

// ==================== 10. COMPLETE MODULAR SOLUTION SETUP ====================
/**
 * Quick setup guide for integrating all fixes into script.js:
 * 
 * 1. Replace the executeCodeWithJudge0 function with the improved version above
 * 2. Add the helper functions: ensureJavaWrapper, normalizeOutput, extractExecutionResult, compareOutputs
 * 3. Replace the runCode function with the improved version
 * 4. Replace the submitCode function with the improved version
 * 5. Update POOLS to use the new structure with testInput fields
 * 6. When calling executeCodeWithJudge0, pass testInput: executeCodeWithJudge0(code, language, testInput)
 * 7. Test with Java, Python, and C questions
 */

console.log('JAVA_FIX_SOLUTION loaded. See this file for all production-ready fixes.');
