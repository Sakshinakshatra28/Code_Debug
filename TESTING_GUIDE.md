# 🧪 Testing & Troubleshooting Guide

## Quick Test Commands

### 1. Check if Compilers Are Installed

```powershell
# Windows PowerShell
python --version
gcc --version
javac -version
java -version
```

```bash
# Linux/macOS
python3 --version
gcc --version
javac -version
java -version
```

### 2. Manual Execution Tests

#### Python Test
```bash
cd temp
echo 'print("Hello Python")' > test.py
python test.py
# Expected Output: Hello Python
```

#### C Test (Windows)
```powershell
cd temp
echo '#include <stdio.h>' > test.c
echo 'int main() { printf("Hello C\n"); return 0; }' >> test.c
gcc test.c -o test.exe
.\test.exe
# Expected Output: Hello C
```

#### C Test (Linux)
```bash
cd temp
cat > test.c << 'EOF'
#include <stdio.h>
int main() {
    printf("Hello C\n");
    return 0;
}
EOF
gcc test.c -o test
./test
# Expected Output: Hello C
```

#### Java Test
```bash
cd temp
cat > Main.java << 'EOF'
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello Java");
    }
}
EOF
javac Main.java
java Main
# Expected Output: Hello Java
```

---

## Test Cases for the Web Application

### Test 1: C Simple Output

**Code:**
```c
#include <stdio.h>
int main() {
    printf("10\n");
    return 0;
}
```

**Expected Output:** `10`

**Test Steps:**
1. Open the web app
2. Select "C" language
3. Copy the code above into the editor
4. Click "Run Code"
5. Verify output shows "10"

---

### Test 2: C Compilation Error

**Code:**
```c
#include <stdio.h>
int main() {
    int x = 10  // Missing semicolon
    printf("%d\n", x);
    return 0;
}
```

**Expected Result:**
- Should show compilation error message
- Error should contain "error: expected ';'"

**Test Steps:**
1. Select "C" language
2. Paste the buggy code
3. Click "Run Code"
4. Should show error, not crash

---

### Test 3: Java Simple Output

**Code:**
```java
public class Main {
    public static void main(String[] args) {
        System.out.println("3");
    }
}
```

**Expected Output:** `3`

**Test Steps:**
1. Select "Java" language
2. Copy the code above
3. Click "Run Code"
4. Verify output shows "3"

---

### Test 4: Java Compilation Error

**Code:**
```java
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello")  // Missing semicolon
    }
}
```

**Expected Result:**
- Should show compilation error
- Error should contain "';' expected"

---

### Test 5: Python Simple Output

**Code:**
```python
print('hello')
```

**Expected Output:** `hello`

---

### Test 6: Infinite Loop (Timeout Test)

**C Version:**
```c
#include <stdio.h>
int main() {
    while(1);  // Infinite loop
    return 0;
}
```

**Expected Result:**
- After 5 seconds, should timeout
- Error: "Execution timeout (5 seconds limit). Possible infinite loop."

---

### Test 7: Array Index Out of Bounds

**C Version:**
```c
#include <stdio.h>
int main() {
    int arr[3] = {1, 2, 3};
    printf("%d\n", arr[5]);  // Out of bounds
    return 0;
}
```

**Expected Result:**
- Code runs (no crash)
- Output may vary (undefined behavior in C)
- But program should complete

---

### Test 8: Runtime Error with Output

**C Version:**
```c
#include <stdio.h>
int main() {
    printf("Before error\n");
    int a = 5, b = 0;
    int c = a / b;  // Division by zero
    return 0;
}
```

**Expected Behavior:**
- Prints "Before error"
- Program crashes with runtime error
- Error message captured

---

## Common Issues & Solutions

### Issue 1: "gcc: command not found"

**Problem:** GCC compiler not installed

**Solution (Windows):**
```powershell
# Using Scoop
scoop install gcc

# Or using Chocolatey
choco install mingw
```

**Solution (Linux - Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install build-essential
```

**Solution (macOS):**
```bash
brew install gcc
```

---

### Issue 2: "javac: command not found"

**Problem:** Java Development Kit not installed

**Solution (Windows):**
```powershell
scoop install openjdk
# Or
choco install openjdk
```

**Solution (Linux):**
```bash
sudo apt-get install default-jdk
```

**Solution (macOS):**
```bash
brew install openjdk
```

---

### Issue 3: "python: command not found" (Linux)

**Problem:** Python not in PATH or Python 3 named differently

**Solution:**
```bash
# Check if python3 is available
python3 --version

# Create alias (temporary)
alias python=python3

# Or update server.js to use python3 explicitly
```

---

### Issue 4: Java "ClassNotFoundException: Main"

**Before Fix:**
- File was `Main_123456.java`
- Class inside was `public class Main`
- Created `Main_123456.class` file
- Tried to run `java -cp tempDir Main_123456`
- Error: Can't find class Main_123456 (it was named Main)

**After Fix:**
- File is always `Main.java`
- Class inside is `public class Main`
- Creates `Main.class` file
- Runs `java -cp tempDir Main` ✅

---

### Issue 5: C Executable Not Found on Linux

**Before Fix:**
```javascript
// Always created .exe extension
outputFile = path.join(tempDir, `program_${timestamp}.exe`);
// On Linux, gcc creates: program_123456 (no .exe)
// Execution fails because program_123456.exe doesn't exist!
```

**After Fix:**
```javascript
// Platform detection
outputFile = path.join(
    tempDir,
    os.platform() === 'win32'
        ? `program_${timestamp}.exe`
        : `program_${timestamp}`
);
// Windows: program_123456.exe ✅
// Linux: program_123456 ✅
```

---

### Issue 6: Shell Metacharacters in Windows Paths

**Before Fix:**
```javascript
command = `"${exePath}"`; // Shell string
execSync(command, { timeout: 5000 });
```

If path contains special characters, shell parsing fails.

**After Fix:**
```javascript
runCommand = [exePath]; // Array, no shell parsing
spawnSync(runCommand[0], runCommand.slice(1), { ... });
```

---

### Issue 7: Files Not Cleaned Up

**Before Fix:**
```javascript
// Incomplete cleanup
if (fs.existsSync(filename)) fs.unlinkSync(filename);
if (language === 'C' || language === 'Java') {
    const exePath = path.join(tempDir, 
        language === 'C' ? `program_${timestamp}.exe` : `Main_${timestamp}.class`);
    if (fs.existsSync(exePath)) fs.unlinkSync(exePath);
}
// Only removes main files, not all temporary files
```

**After Fix:**
```javascript
const filesToClean = [];
// ... add all files to filesToClean array ...

finally {
    filesToClean.forEach(file => {
        try {
            if (fs.existsSync(file)) {
                fs.unlinkSync(file);
            }
        } catch (e) {}
    });
}
// Removes all temporary files reliably
```

---

## Debugging Tips

### 1. Enable Verbose Logging

Add this to `server.js` in the `executeCode` function:

```javascript
console.log(`[${language}] Executing:`, runCommand);
console.log(`[${language}] Source:`, sourceFile);
console.log(`[${language}] Temp dir:`, tempDir);
```

### 2. Check Response Format

In browser DevTools (F12), check Network tab:

**Expected response for successful run:**
```json
{
  "success": true,
  "output": "program output here",
  "errors": "",
  "compileError": false
}
```

**Expected response for compilation error:**
```json
{
  "success": false,
  "output": "",
  "errors": "error message from compiler",
  "compileError": true
}
```

### 3. Manually Test Backend

```bash
# Test C execution
curl -X POST http://localhost:3000/session/test/run \
  -H "Content-Type: application/json" \
  -d '{
    "code": "#include <stdio.h>\nint main() { printf(\"test\\n\"); return 0; }",
    "language": "C"
  }'

# Test Java execution
curl -X POST http://localhost:3000/session/test/run \
  -H "Content-Type: application/json" \
  -d '{
    "code": "public class Main { public static void main(String[] args) { System.out.println(\"test\"); } }",
    "language": "Java"
  }'
```

### 4. Check Temp Directory

```bash
# Linux/macOS
ls -lah temp/

# Windows PowerShell
Get-ChildItem temp\ -Force
```

Should be mostly empty (files cleaned up immediately after execution).

---

## Performance Considerations

| Metric | Value |
|--------|-------|
| Execution Timeout | 5 seconds |
| Max Buffer Size | 10 MB |
| Temp Directory | `./temp` (relative to server) |
| Cleanup | Automatic after each execution |

To change timeout, edit `server.js`:

```javascript
const result = spawnSync(runCommand[0], runCommand.slice(1), {
    timeout: 10000,  // Change to 10 seconds
    encoding: 'utf-8',
    maxBuffer: 10 * 1024 * 1024
});
```

---

## Integration Testing Checklist

- [ ] Python "Hello World" runs correctly
- [ ] C "Hello World" compiles and runs correctly
- [ ] Java "Hello World" compiles and runs correctly
- [ ] C compilation errors are caught and displayed
- [ ] Java compilation errors are caught and displayed
- [ ] Infinite loops timeout after 5 seconds
- [ ] Runtime errors are captured correctly
- [ ] Temp files are cleaned up after execution
- [ ] Test works on Windows
- [ ] Test works on Linux (if applicable)
- [ ] Output formatting matches expected results
- [ ] Large outputs (10MB+) are handled gracefully
- [ ] Special characters in output are preserved
- [ ] Multiple concurrent requests work

---

## Final Verification

```bash
# 1. Start the server
node server.js

# 2. In another terminal, test all three languages via web interface
# Open: http://localhost:3000

# 3. Run through Test Cases 1-8 above

# 4. Check the console for any errors

# 5. Verify temp folder is cleaned up
ls -la temp/  # Should be mostly empty

# 6. Check for any memory leaks
# Run for several minutes with multiple submissions
```

If all tests pass, your multi-language code execution is working correctly! 🎉
