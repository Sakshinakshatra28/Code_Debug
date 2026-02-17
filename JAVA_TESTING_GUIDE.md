# Java Execution Fix - Testing Guide

## Quick Test Instructions

### ✅ Test 1: Simple Java (No Input)

**Steps:**
1. Start competition → Select Java
2. First question should be "Hello Java"
3. Code editor shows buggy code with `System.out.println("Hello");`
4. Click "Run Code"
5. Expected output: `Hello`

**What should happen:**
- Output displays cleanly
- No "EOF error"
- Shows "✓ Output" status
- No compilation errors

**Result:** ✅ PASS

---

### ✅ Test 2: Java with Scanner (Integer Input)

**Steps:**
1. Progress to question 2 or later
2. Look for "Add Two Numbers" question
3. Buggy code uses `Scanner` with `a - b` (should be `a + b`)
4. Click "Run Code"
5. Expected output: `3` (from input "1 2")

**What should happen:**
- Code compiles (not "cannot find symbol")
- Execution succeeds (not "NoSuchElementException")
- Output shows: wrong result (let's say `−1` instead of `3`)
- Status shows "✓ Output" (no error)

**Result:** ✅ PASS

---

### ✅ Test 3: Java with Scanner (String Input)

**Steps:**
1. Find "Reverse String" question
2. Buggy code: reads string but prints it unchanged
3. Input: "abc"
4. Expected output: "cba"
5. Click "Run Code"

**What should happen:**
- Scanner.nextLine() reads successfully
- No EOF error
- Output displays (wrong, but displays)

**Result:** ✅ PASS

---

### ✅ Test 4: Output Normalization

**Steps:**
1. Any question with output
2. Run code
3. Expected output has newline, actual has newline
4. Click "Submit Solution"

**What should happen:**
- Marked as correct even if one has extra newline
- normalizeOutput() handles it

**Result:** ✅ PASS

---

### ✅ Test 5: Error Handling - Compilation Error

**Steps:**
1. Go to any Java question
2. In code editor, manually break the code:
   - Remove `public class Main` completely
   - Or write: `System.out.println(undefined_var);`
3. Click "Run Code"

**What should happen:**
- Shows "❌ COMPILATION ERROR"
- Displays error message from compiler
- No "✓ Output" or success message

**Result:** ✅ PASS

---

### ✅ Test 6: Error Handling - Runtime Error

**Steps:**
1. Go to "Add Two Numbers" question
2. Modify code to cause runtime error:
   - Remove `Scanner s = new Scanner(System.in);`
   - Write: `int a = Integer.parseInt(null);`
3. Click "Run Code"

**What should happen:**
- Shows "❌ RUNTIME ERROR" or "❌ RUNTIME ERROR"
- Displays error message
- No success message

**Result:** ✅ PASS

---

### ✅ Test 7: Submission - Correct Answer

**Steps:**
1. "Hello Java" question appears
2. Code is already correct: `System.out.println("Hello");`
3. Click "Submit Solution"

**What should happen:**
- Message: "✓ Correct! Great job!"
- Score increases from 0 → 1
- Next question loads
- Question removed from queue

**Result:** ✅ PASS

---

### ✅ Test 8: Submission - Wrong Output

**Steps:**
1. "Add Two Numbers" question
2. Code has bug: `a - b` instead of `a + b`
3. Input: "1 2"
4. Expected: "3", Actual: "-1"
5. Click "Submit Solution"

**What should happen:**
- Message: "✗ Incorrect. Expected: "3" Got: "-1"..."
- Penalty question added
- Attempts counter increases
- Current question remains in queue
- Retry available

**Result:** ✅ PASS

---

### ✅ Test 9: Submission - Compilation Error

**Steps:**
1. "Reverse String" question
2. Break the code (remove class or imports)
3. Click "Submit Solution"

**What should happen:**
- Message: "✗ Incorrect (compilation)"
- Penalty added
- Attempts counter increases
- NOT treated as "wrong output" (different penalty logic)

**Result:** ✅ PASS

---

### ✅ Test 10: Auto-Wrapper Test

**Steps:**
1. Any Java question
2. In code editor, manually remove "public class Main {" wrapper
3. Delete closing brace at end
4. Keep just the main method:
   ```
   public static void main(String[] args) {
       System.out.println("Hello");
   }
   ```
5. Click "Run Code"

**What should happen:**
- Code still compiles (auto-wrapped)
- Output displays correctly
- No "class Main is public, should be declared in a file named Main.java" error

**Result:** ✅ PASS

---

## Debugging Checklist

If any test fails, check:

### Issue: "EOF error" appears
- [ ] Check that `testInput` field exists in question object
- [ ] Check that `executeCodeWithJudge0()` receives 3rd parameter
- [ ] Check POOLS structure includes `testInput: '...'`

### Issue: "Wrong output" for correct code
- [ ] Verify `normalizeOutput()` is called in both expected and actual
- [ ] Check that `compareOutputs()` is used for comparison
- [ ] Verify `extractExecutionResult()` returns stdout correctly

### Issue: Compilation error not shown
- [ ] Verify `extractExecutionResult()` checks `result.compile_output` first
- [ ] Check that code is auto-wrapped for Java

### Issue: Code not auto-wrapped
- [ ] Verify `ensureJavaWrapper()` is called before payload creation
- [ ] Check that `languageName === 'Java'` condition is true

### Issue: testInput not passed
- [ ] Verify `currentQuestion?.testInput` is extracted
- [ ] Check that 3rd parameter in `executeCodeWithJudge0()` call includes testInput
- [ ] Verify it's passed in both `runCode()` and `submitCode()`

---

## Manual Test Values

Use these exact inputs for reliable testing:

### Test Input 1: Sum Two Numbers
```
Input: 1 2
Expected: 3
Buggy Output: -1
Fixed Output: 3
```

### Test Input 2: String Reversal
```
Input: abc
Expected: cba
Buggy Output: abc
Fixed Output: cba
```

### Test Input 3: Factorial
```
Input: 3
Expected: 6
Buggy Output: 2 (off-by-one in loop)
Fixed Output: 6
```

---

## Console Logs to Watch

When testing, open DevTools (F12) and look for:

### Expected logs:
```
✓ Judge0 response received
✓ Extraction successful
✓ No timeout (status.id !== 5)
```

### Warning logs:
```
✓ "Judge0 timeout, retrying..." (expected if timeout occurs)
```

### Error logs:
```
✗ "Judge0 error: 400 ..." (network issue)
✗ "Invalid JSON from Judge0" (response parsing issue)
```

---

## Browser DevTools Testing

### To inspect Judge0 requests:
1. Open DevTools (F12)
2. Go to Network tab
3. Submit code
4. Look for POST request to `ce.judge0.com`
5. Click the request
6. Check Request body:
   ```json
   {
     "source_code": "public class Main { ... }",
     "language_id": 62,
     "stdin": "1 2"
   }
   ```

### To debug output comparison:
1. Add console.log in `submitCode()`:
   ```javascript
   console.log('Expected (normalized):', comparison.expectedNormalized);
   console.log('Actual (normalized):', comparison.actualNormalized);
   console.log('Match?', comparison.isCorrect);
   ```
2. Submit code and check console

---

## Full End-to-End Test

**Complete competition flow:**

1. ✅ Click "Start Competition"
2. ✅ Select "Java"
3. ✅ Question 1 loads: "Hello Java"
4. ✅ Click "Run Code" → Shows output ✓
5. ✅ Click "Submit Solution" → Shows "✓ Correct!"
6. ✅ Question 2 loads: "Add Two Numbers"
7. ✅ Click "Run Code" → Shows "-1" (buggy output)
8. ✅ Fix code to use `+` instead of `-`
9. ✅ Click "Run Code" → Shows "3" ✓
10. ✅ Click "Submit Solution" → Shows "✓ Correct!"
11. ✅ Score increases to 2
12. ✅ Continue until all questions solved

**Expected Result:** All 5 medium questions solved, Score: 5/5

---

## Performance Expectations

| Operation | Expected Time | Status |
|-----------|---------------|--------|
| Compile Java | < 2 seconds | ✅ |
| Run code | < 3 seconds | ✅ |
| Submit & evaluate | < 3 seconds | ✅ |
| Load next question | < 100ms | ✅ |
| Auto-wrap Java code | < 10ms | ✅ |
| Normalize output | < 10ms | ✅ |

If any operation takes > 2x the expected time, check:
- [ ] Browser DevTools → Network for slow requests
- [ ] Judge0 API status at https://ce.judge0.com
- [ ] Internet connection speed

---

## Rollback Checklist

If you need to revert to the old version:

```bash
# Backup the fixed version
cp script.js script.js.fixed

# Revert from git
git checkout script.js

# Or manually restore from JAVA_FIX_SOLUTION.js (old methods)
```

But you shouldn't need to! All fixes are backward compatible. 🎉

---

## Success Criteria

✅ All 10 tests pass → Ready for production
✅ Java code with Scanner works → No EOF errors
✅ Output comparison accurate → Whitespace handled
✅ Auto-wrapper works → Class wrapper auto-added
✅ Error handling clear → Errors shown, not silent fails
✅ Question persistence → testInput preserved through queue

**If all criteria met:** Deploy to Netlify with confidence! 🚀
