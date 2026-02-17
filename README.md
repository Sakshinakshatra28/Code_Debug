# Quick Start Guide - Code Debugging Competition

## 5-Minute Setup

### Step 1: Install Dependencies (1 minute)

```bash
cd code-debug
npm install
```

**Required:**
- Node.js (already installed? Run `node --version`)
- Python 3 (Run `python --version`)
- GCC compiler (Run `gcc --version`)
- Java (Run `java -version`)

### Step 2: Start the Server (30 seconds)

```bash
npm start
```

You should see:
```
🚀 Code Debugging Server Started
📍 http://localhost:3000

📚 Languages: Python, C, Java
❓ Questions per language: 5
⏱️  Timer: 30 minutes
💾 Storage: In-Memory (No Database)
```

### Step 3: Open in Browser (30 seconds)

```
http://localhost:3000
```

Click **"Start Competition"**

---

## What You'll See

### Page 1: Language Selection
- Choose Python, C, or Java
- Each has 5 unique buggy questions

### Page 2: Split-Screen Competition
**Left Side (Question Display):**
- Question title & difficulty
- Problem description
- Buggy code
- Expected output

**Right Side (Compiler):**
- Code editor (with buggy code pre-filled)
- **Run** button: Execute code, show output only
- **Submit** button: Check if output is correct
- **Skip** button: Move to next question
- Output panel: Shows execution results

**Top Bar:**
- Timer (30:00 countdown)
- Score display
- Language badge

### Page 3: Results
- Final score (out of 25)
- Questions solved
- Time spent
- Success rate

---

## Sample Questions

### Python
1. Fix string typo: `print('helo')` → `print('hello')`
2. Division by zero error
3. Missing colon in for loop
4. Indentation error in if block
5. Array index out of range

### C
1. Missing semicolon
2. Array bounds error
3. Division by zero
4. Assignment vs comparison (= vs ==)
5. Uninitialized pointer

### Java
1. String typo
2. Array out of bounds
3. NullPointerException
4. Integer vs float division
5. Missing loop braces

---

## How the Queue Works

### Simple Example:
```
Start with 5 questions: [Q1, Q2, Q3, Q4, Q5]

1. Solve Q1 ✓ → Score +5, move to Q2
   Queue: [Q2, Q3, Q4, Q5]

2. Try Q2 ✗ → Score +0, Q2 goes to end
   Queue: [Q3, Q4, Q5, Q2]

3. Solve Q3 ✓ → Score +5, move to Q4
   Queue: [Q4, Q5, Q2]

...continue solving...

Final: Solve Q2 ✓ → Score +5
   Queue: [] ← EMPTY!
   
TEST COMPLETE! Final Score: 25 points
```

---

## Keyboard Shortcuts

- **Ctrl+Enter**: Submit code (in code editor)
- **Tab**: Indent code (4 spaces)

---

## Tips for Debugging

### For Python
- Check for typos in strings and variable names
- Watch for indentation errors
- Remember Python uses `:` after if/for/while
- Zero is not valid for division

### For C
- Don't forget semicolons `;`
- Include necessary headers `#include`
- Check array bounds (0 to length-1)
- Initialize variables before use

### For Java
- Use `==` for comparison, not `=`
- Don't forget braces `{}`
- Initialize objects before using
- Watch for NullPointerException

---

## Scoring System

| Questions Solved | Score |
|------------------|-------|
| 0 / 5            | 0     |
| 1 / 5            | 5     |
| 2 / 5            | 10    |
| 3 / 5            | 15    |
| 4 / 5            | 20    |
| 5 / 5            | 25    |

**Note:** You need to solve ALL 5 original questions (even if you got them wrong initially) to complete the test.

---

## File Structure

```
code-debug/
├── index.html              ← Open this in browser
├── style.css               ← All styling
├── script.js               ← Frontend logic
├── server.js               ← Backend server
├── package.json            ← Dependencies
├── SETUP_GUIDE.md          ← Detailed setup
├── SYSTEM_ARCHITECTURE.md  ← Technical details
└── README.md               ← This file
```

---

## Troubleshooting

### "Cannot find module 'express'"
```bash
npm install
```

### "Port 3000 already in use"
```bash
PORT=3001 npm start
```

### "Python not found"
- Windows: Install Python from python.org
- macOS: `brew install python3`
- Linux: `sudo apt-get install python3`

### "GCC not found"
- Windows: Install MinGW-w64
- macOS: `brew install gcc`
- Linux: `sudo apt-get install build-essential`

### "Java not found"
- Download and install JDK from oracle.com
- Add to PATH

### "CORS error in console"
Make sure the backend is running on `http://localhost:3000`

---

## Features

✅ **Split-Screen Layout**: Question and compiler side-by-side  
✅ **30-Minute Timer**: Countdown with color alerts  
✅ **Queue System**: Failed questions re-queue automatically  
✅ **Live Code Execution**: Python, C, Java support  
✅ **Real-Time Validation**: Compare output instantly  
✅ **Scoring System**: 5 points per correct answer  
✅ **In-Memory Storage**: No database needed  
✅ **Responsive Design**: Works on desktop and tablet  
✅ **Error Messages**: Clear feedback on mistakes  

---

## Example Workflow

### Session: Solving Python Questions

```
TIME: 29:50    SCORE: 0

Question 1: Fix String Typo
Buggy Code: print('helo')
Expected:   hello

You type: print('hello')
Click "Submit"
✓ Correct! String typo fixed.
Score: 5 points

---

TIME: 28:30    SCORE: 5

Question 2: Division by Zero
Buggy Code: print(5 / 0)
Expected:   2.5

You type: print(5 / 2)
Click "Submit"
✓ Correct!
Score: 10 points

---

TIME: 25:00    SCORE: 25

All 5 questions solved!
Final Score: 25/25
Success Rate: 100%
Time Spent: 5:00
```

---

## API Reference (For Developers)

### POST /session/init
Initialize a new session
```json
Request:  { "language": "Python" }
Response: { "sessionId": "...", "question": {...}, "progress": {...} }
```

### GET /session/:sessionId/question
Get next question
```json
Response: { "question": {...}, "progress": {...}, "completed": false }
```

### POST /session/:sessionId/submit
Submit solution and validate
```json
Request:  { "code": "...", "questionId": "py1" }
Response: { "isCorrect": true, "score": 5, "testComplete": false, ... }
```

### POST /session/:sessionId/run
Run code without validation
```json
Request:  { "code": "...", "language": "Python" }
Response: { "output": "...", "errors": "", "compileOutput": "" }
```

---

## Next Steps

1. ✅ Install and start the server
2. ✅ Open `http://localhost:3000` in browser
3. ✅ Select a language
4. ✅ Start debugging!

For detailed architecture and queue logic, see **SYSTEM_ARCHITECTURE.md**

Happy coding! 🚀

