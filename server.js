const express = require('express');
const { execSync, spawnSync } = require('child_process');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
app.use(bodyParser.json({ limit: '50mb' }));
app.use(cors());

// Serve static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname)));

// ==================== IN-MEMORY STORAGE ====================
const sessions = new Map(); // sessionId -> { language, score, queue, questionsAttempted, startTime }
const questionQueues = new Map(); // sessionId -> { originalQueue, currentQueue, solvedQuestions }

// ==================== QUESTION DATA (IN-MEMORY) ====================

const pythonQuestions = [
    {
        id: 'py1',
        title: 'Fix String Typo',
        description: 'The program should print "hello" but it prints "helo".',
        buggyCode: "print('helo')",
        expectedOutput: 'hello',
        difficulty: 'easy',
        explanation: 'String typo: "helo" should be "hello"'
    },
    {
        id: 'py2',
        title: 'Division by Zero',
        description: 'Fix the division by zero error. The program should divide 5 by 2.',
        buggyCode: 'a = 5\nb = 0\nprint(a / b)',
        expectedOutput: '2.5',
        difficulty: 'easy',
        explanation: 'Cannot divide by zero. Change b from 0 to 2.'
    },
    {
        id: 'py3',
        title: 'Missing Colon in Loop',
        description: 'Fix the syntax error in the for loop.',
        buggyCode: 'for i in range(3)\n    print(i)',
        expectedOutput: '0\n1\n2',
        difficulty: 'easy',
        explanation: 'Missing colon (:) after for statement'
    },
    {
        id: 'py4',
        title: 'Indentation Error',
        description: 'Fix the indentation inside the if block.',
        buggyCode: "if True:\nprint('Yes')",
        expectedOutput: 'Yes',
        difficulty: 'easy',
        explanation: 'Missing indentation inside if block'
    },
    {
        id: 'py5',
        title: 'List Index Out of Range',
        description: 'Access the last element of the list correctly.',
        buggyCode: 'x = [1, 2, 3]\nprint(x[3])',
        expectedOutput: '3',
        difficulty: 'medium',
        explanation: 'List has indices 0, 1, 2. Index 3 is out of range. Use index 2.'
    }
];

const cQuestions = [
    {
        id: 'c1',
        title: 'Missing Semicolon',
        description: 'Add the missing semicolon to fix the syntax error.',
        buggyCode: '#include <stdio.h>\nint main() {\n    int x = 10\n    printf("%d\\n", x);\n    return 0;\n}',
        expectedOutput: '10',
        difficulty: 'easy',
        explanation: 'Missing semicolon after variable declaration'
    },
    {
        id: 'c2',
        title: 'Array Index Out of Bounds',
        description: 'Fix the array index to access a valid element.',
        buggyCode: '#include <stdio.h>\nint main() {\n    int arr[3] = {1, 2, 3};\n    printf("%d\\n", arr[5]);\n    return 0;\n}',
        expectedOutput: '3',
        difficulty: 'easy',
        explanation: 'Array indices are 0, 1, 2. Use index 2 to get 3.'
    },
    {
        id: 'c3',
        title: 'Division by Zero',
        description: 'Fix the division by zero error.',
        buggyCode: '#include <stdio.h>\nint main() {\n    int x = 5, y = 0;\n    printf("%d\\n", x / y);\n    return 0;\n}',
        expectedOutput: '5',
        difficulty: 'easy',
        explanation: 'Cannot divide by zero. Change y to 1.'
    },
    {
        id: 'c4',
        title: 'Assignment vs Comparison',
        description: 'Use the correct operator for comparison.',
        buggyCode: '#include <stdio.h>\nint main() {\n    int x = 10;\n    if (x = 5) {\n        printf("Equal\\n");\n    }\n    return 0;\n}',
        expectedOutput: 'Equal',
        difficulty: 'medium',
        explanation: 'Use == for comparison, not = for assignment'
    },
    {
        id: 'c5',
        title: 'Uninitialized Pointer',
        description: 'Initialize the pointer before dereferencing it.',
        buggyCode: '#include <stdio.h>\nint main() {\n    int *ptr;\n    printf("%d\\n", *ptr);\n    return 0;\n}',
        expectedOutput: '10',
        difficulty: 'hard',
        explanation: 'Uninitialized pointer. Initialize: int x = 10; int *ptr = &x;'
    }
];

const javaQuestions = [
    {
        id: 'java1',
        title: 'Fix String Typo',
        description: 'The program should print "Hello World" but it prints "Helo World".',
        buggyCode: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Helo World");\n    }\n}',
        expectedOutput: 'Helo World',
        difficulty: 'easy',
        explanation: 'String typo: "Helo" should be "Hello"'
    },
    {
        id: 'java2',
        title: 'Array Index Out of Bounds',
        description: 'Access a valid element of the array.',
        buggyCode: 'public class Main {\n    public static void main(String[] args) {\n        int[] arr = {1, 2, 3};\n        System.out.println(arr[5]);\n    }\n}',
        expectedOutput: '3',
        difficulty: 'easy',
        explanation: 'Array has indices 0, 1, 2. Use index 2 to get 3.'
    },
    {
        id: 'java3',
        title: 'NullPointerException',
        description: 'Initialize the string before calling methods on it.',
        buggyCode: 'public class Main {\n    public static void main(String[] args) {\n        String str = null;\n        System.out.println(str.length());\n    }\n}',
        expectedOutput: '5',
        difficulty: 'easy',
        explanation: 'String is null. Initialize: String str = "Hello";'
    },
    {
        id: 'java4',
        title: 'Integer vs Float Division',
        description: 'Use float/double for decimal division.',
        buggyCode: 'public class Main {\n    public static void main(String[] args) {\n        int x = 10;\n        int y = 4;\n        System.out.println(x / y);\n    }\n}',
        expectedOutput: '2.5',
        difficulty: 'medium',
        explanation: 'Use double for decimal: double x = 10; double y = 4;'
    },
    {
        id: 'java5',
        title: 'Missing Loop Braces',
        description: 'Add braces to the for loop.',
        buggyCode: 'public class Main {\n    public static void main(String[] args) {\n        for (int i = 1; i <= 3; i++)\n            System.out.println(i);\n    }\n}',
        expectedOutput: '1\n2\n3',
        difficulty: 'medium',
        explanation: 'Add braces {} to ensure all statements execute in loop'
    }
];

const allQuestions = {
    'Python': pythonQuestions,
    'C': cQuestions,
    'Java': javaQuestions
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Initialize a new session with a shuffled question queue
 */
function initializeSession(language, sessionId) {
    const questions = allQuestions[language];
    const shuffledQuestions = [...questions].sort(() => Math.random() - 0.5);
    
    sessions.set(sessionId, {
        language,
        score: 0,
        questionsAttempted: 0,
        questionsSolved: 0,
        startTime: Date.now(),
        endTime: null
    });

    questionQueues.set(sessionId, {
        originalQueue: shuffledQuestions.map(q => q.id),
        currentQueue: shuffledQuestions.map(q => q.id),
        solvedQuestions: [],
        unsolvedQuestions: []
    });

    return shuffledQuestions[0];
}

/**
 * Get question by ID
 */
function getQuestion(questionId, language) {
    return allQuestions[language].find(q => q.id === questionId);
}

/**
 * Get next question from current queue
 */
function getNextQuestion(sessionId) {
    const queue = questionQueues.get(sessionId);
    if (!queue || queue.currentQueue.length === 0) {
        return null;
    }
    const questionId = queue.currentQueue[0];
    const session = sessions.get(sessionId);
    return getQuestion(questionId, session.language);
}

/**
 * Handle submission: update queue and score
 */
function handleSubmission(sessionId, questionId, isCorrect) {
    const queue = questionQueues.get(sessionId);
    const session = sessions.get(sessionId);

    // Remove current question from queue
    queue.currentQueue.shift();

    session.questionsAttempted++;

    if (isCorrect) {
        queue.solvedQuestions.push(questionId);
        session.score += 5;
        session.questionsSolved++;
    } else {
        // Add back to end of queue for retry
        queue.currentQueue.push(questionId);
        queue.unsolvedQuestions.push(questionId);
    }

    // Check if test is complete
    const isComplete = queue.currentQueue.length === 0;
    if (isComplete) {
        session.endTime = Date.now();
    }

    return { session, isComplete };
}

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

// ==================== API ROUTES ====================

/**
 * GET /questions/:language
 * Get all questions for a language
 */
app.get('/questions/:language', (req, res) => {
    const { language } = req.params;
    const questions = allQuestions[language];

    if (!questions) {
        return res.status(404).json({ error: 'Language not found' });
    }

    // Return without expectedOutput for security
    const publicQuestions = questions.map(q => ({
        id: q.id,
        title: q.title,
        description: q.description,
        buggyCode: q.buggyCode,
        difficulty: q.difficulty
    }));

    res.json(publicQuestions);
});

/**
 * POST /session/init
 * Initialize a new session
 */
app.post('/session/init', (req, res) => {
    const { language } = req.body;

    if (!allQuestions[language]) {
        return res.status(400).json({ error: 'Invalid language' });
    }

    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const firstQuestion = initializeSession(language, sessionId);

    res.json({
        sessionId,
        language,
        question: {
            id: firstQuestion.id,
            title: firstQuestion.title,
            description: firstQuestion.description,
            buggyCode: firstQuestion.buggyCode,
            difficulty: firstQuestion.difficulty
        },
        progress: {
            current: 1,
            total: 5
        }
    });
});

/**
 * GET /session/:sessionId/question
 * Get the next question
 */
app.get('/session/:sessionId/question', (req, res) => {
    const { sessionId } = req.params;

    if (!sessions.has(sessionId)) {
        return res.status(404).json({ error: 'Session not found' });
    }

    const question = getNextQuestion(sessionId);

    if (!question) {
        return res.json({ completed: true });
    }

    const queue = questionQueues.get(sessionId);
    const progress = {
        current: 6 - queue.currentQueue.length,
        total: 5
    };

    res.json({
        question: {
            id: question.id,
            title: question.title,
            description: question.description,
            buggyCode: question.buggyCode,
            difficulty: question.difficulty
        },
        progress
    });
});

/**
 * POST /session/:sessionId/submit
 * Submit code and validate
 */
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

/**
 * POST /session/:sessionId/run
 * Run code without submitting (show output only)
 */
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

/**
 * GET /session/:sessionId/stats
 * Get session statistics
 */
app.get('/session/:sessionId/stats', (req, res) => {
    const { sessionId } = req.params;

    if (!sessions.has(sessionId)) {
        return res.status(404).json({ error: 'Session not found' });
    }

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

/**
 * GET /health
 * Health check
 */
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ==================== UTILITY ====================

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
}

// ==================== ERROR HANDLING ====================

app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// ==================== START SERVER ====================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n🚀 Code Debugging Server Started`);
    console.log(`📍 http://localhost:${PORT}`);
    console.log(`\n📚 Languages: Python, C, Java`);
    console.log(`❓ Questions per language: 5`);
    console.log(`⏱️  Timer: 30 minutes`);
    console.log(`💾 Storage: In-Memory (No Database)\n`);
});

