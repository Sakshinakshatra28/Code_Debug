# 🚀 Quick Start - Multi-Language Code Execution

## 1. Prerequisites Check

Run this to verify all compilers are installed:

### Windows (PowerShell)
```powershell
Write-Host "=== Checking Prerequisites ===" -ForegroundColor Green
Write-Host ""

# Check Python
try {
    $pythonVersion = python --version 2>&1
    Write-Host "✅ Python: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Python NOT FOUND - Install from python.org" -ForegroundColor Red
}

# Check GCC
try {
    $gccVersion = gcc --version 2>&1 | Select-Object -First 1
    Write-Host "✅ GCC: $gccVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ GCC NOT FOUND - Install with: scoop install gcc" -ForegroundColor Red
}

# Check Java
try {
    $javacVersion = javac -version 2>&1
    Write-Host "✅ Javac: $javacVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Javac NOT FOUND - Install with: scoop install openjdk" -ForegroundColor Red
}

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js NOT FOUND - Install from nodejs.org" -ForegroundColor Red
}
```

### Linux/macOS (Bash)
```bash
echo "=== Checking Prerequisites ==="
echo ""

# Check Python
if command -v python3 &> /dev/null; then
    echo "✅ Python: $(python3 --version)"
else
    echo "❌ Python NOT FOUND - Install: sudo apt-get install python3"
fi

# Check GCC
if command -v gcc &> /dev/null; then
    echo "✅ GCC: $(gcc --version | head -n1)"
else
    echo "❌ GCC NOT FOUND - Install: sudo apt-get install build-essential"
fi

# Check Java
if command -v javac &> /dev/null; then
    echo "✅ Javac: $(javac -version 2>&1)"
else
    echo "❌ Javac NOT FOUND - Install: sudo apt-get install default-jdk"
fi

# Check Node.js
if command -v node &> /dev/null; then
    echo "✅ Node.js: $(node --version)"
else
    echo "❌ Node.js NOT FOUND - Install from nodejs.org"
fi
```

---

## 2. Install Missing Tools (if needed)

### Windows
```powershell
# Install package manager (scoop or chocolatey)
# Using Scoop:
irm get.scoop.sh | iex

# Then install tools:
scoop install gcc python openjdk nodejs
```

### Linux (Ubuntu/Debian)
```bash
sudo apt-get update
sudo apt-get install -y build-essential python3 default-jdk nodejs npm
```

### macOS
```bash
brew install gcc python openjdk node
```

---

## 3. Install NPM Dependencies

```bash
cd c:\Users\SASIKUMAR\Desktop\code-debug
npm install
```

**Expected packages:** express, body-parser, cors

---

## 4. Start the Server

```bash
node server.js
```

**Expected output:**
```
🚀 Code Debugging Server Started
📍 http://localhost:3000

📚 Languages: Python, C, Java
❓ Questions per language: 5
⏱️  Timer: 30 minutes
💾 Storage: In-Memory (No Database)
```

---

## 5. Test in Browser

1. Open: http://localhost:3000
2. Click "Start Competition"
3. Select "Python" first (should work)
4. Run the example code - should execute successfully
5. Repeat with "C" and "Java"

---

## 6. Quick API Test (Without Browser)

### Using curl

#### Test Python
```bash
curl -X POST http://localhost:3000/session/test/run \
  -H "Content-Type: application/json" \
  -d '{
    "code": "print(\"Hello Python\")",
    "language": "Python"
  }'
```

Expected response:
```json
{
  "success": true,
  "output": "Hello Python\n",
  "errors": "",
  "compileError": false
}
```

#### Test C
```bash
curl -X POST http://localhost:3000/session/test/run \
  -H "Content-Type: application/json" \
  -d '{
    "code": "#include <stdio.h>\nint main() { printf(\"Hello C\\n\"); return 0; }",
    "language": "C"
  }'
```

Expected response:
```json
{
  "success": true,
  "output": "Hello C\n",
  "errors": "",
  "compileError": false
}
```

#### Test Java
```bash
curl -X POST http://localhost:3000/session/test/run \
  -H "Content-Type: application/json" \
  -d '{
    "code": "public class Main { public static void main(String[] args) { System.out.println(\"Hello Java\"); } }",
    "language": "Java"
  }'
```

Expected response:
```json
{
  "success": true,
  "output": "Hello Java\n",
  "errors": "",
  "compileError": false
}
```

### Using PowerShell (Windows)

```powershell
$params = @{
    Uri = "http://localhost:3000/session/test/run"
    Method = "POST"
    Headers = @{"Content-Type" = "application/json"}
    Body = @{
        code = 'print("Hello Python")'
        language = "Python"
    } | ConvertTo-Json
}
Invoke-WebRequest @params
```

---

## 7. Verify File Cleanup

After running some tests, check temp folder:

```bash
# Linux/macOS
ls -lah temp/

# Windows PowerShell
Get-ChildItem temp\ -Force | Format-Table Name, Length
```

**Should see:**
- Mostly empty (files auto-deleted)
- Maybe 1 or 2 files in use if execution is ongoing
- Not thousands of temp files accumulating

---

## 8. Run Full Test Suite

Create a test file `test-all.js`:

```javascript
const http = require('http');

function testLanguage(language, code) {
    return new Promise((resolve) => {
        const postData = JSON.stringify({
            code,
            language
        });

        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/session/test/run',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                const result = JSON.parse(data);
                console.log(`\n✅ ${language}:`);
                console.log(`   Success: ${result.success}`);
                console.log(`   Output: ${result.output?.trim() || '(empty)'}`);
                if (result.errors) console.log(`   Errors: ${result.errors?.substring(0, 50)}...`);
                resolve();
            });
        });

        req.on('error', (e) => {
            console.log(`\n❌ ${language}: Connection error - ${e.message}`);
            resolve();
        });

        req.write(postData);
        req.end();
    });
}

async function runTests() {
    console.log('🧪 Testing Multi-Language Code Execution\n');

    // Python test
    await testLanguage('Python', 'print("Python Works")');

    // C test
    await testLanguage('C', `#include <stdio.h>
int main() {
    printf("C Works\\n");
    return 0;
}`);

    // Java test
    await testLanguage('Java', `public class Main {
    public static void main(String[] args) {
        System.out.println("Java Works");
    }
}`);

    console.log('\n✨ All tests complete!');
    process.exit(0);
}

runTests();
```

Run it:
```bash
node test-all.js
```

Expected output:
```
🧪 Testing Multi-Language Code Execution

✅ Python:
   Success: true
   Output: Python Works

✅ C:
   Success: true
   Output: C Works

✅ Java:
   Success: true
   Output: Java Works

✨ All tests complete!
```

---

## 9. Troubleshooting

If something doesn't work:

1. **Check console output:** Look for error messages
2. **Check browser console:** F12 → Console tab
3. **Manual compile test:** Try compiling C/Java manually in terminal
4. **Check PATH:** Make sure gcc/javac/python are in system PATH
5. **Kill and restart:** 
   ```bash
   # Kill server (Ctrl+C in terminal)
   # Check temp folder is empty
   # Restart: node server.js
   ```

---

## 10. What's Fixed

✅ **C Compilation:** Uses platform-specific executable names  
✅ **Java Execution:** Fixed Main.java class name issue  
✅ **Error Handling:** Separate compile/runtime errors  
✅ **Timeout Detection:** Catches infinite loops properly  
✅ **Cross-Platform:** Works on Windows, Linux, macOS  
✅ **File Cleanup:** Temp files cleaned up automatically  

---

## 📚 Documentation Files

- **MULTI_LANGUAGE_FIX.md** - Comprehensive explanation of all fixes
- **BEFORE_AFTER_COMPARISON.md** - Visual side-by-side comparison
- **TESTING_GUIDE.md** - Detailed testing procedures
- **EXECUTE_CODE_REFERENCE.js** - Standalone reference implementation

---

## ✅ Verification Checklist

- [ ] All prerequisites installed (Python, GCC, Java, Node.js)
- [ ] `npm install` completed without errors
- [ ] Server starts: `node server.js` works
- [ ] Browser test: Can access http://localhost:3000
- [ ] Python test: Code runs and outputs correctly
- [ ] C test: Code compiles and runs correctly
- [ ] Java test: Code compiles and runs correctly
- [ ] Temp folder: No accumulation of files
- [ ] Timeout test: Infinite loop detected
- [ ] All three languages selectable from web UI

---

## 🎉 Success!

Once all checks pass, your multi-language coding platform is ready to use!

For production use, consider:
- Adding database persistence
- Implementing rate limiting
- Adding code validation/sandboxing
- Using container-based execution
- Adding more languages
