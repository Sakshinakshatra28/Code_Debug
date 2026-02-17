// ============================================================================
// CORRECTED EXECUTE CODE FUNCTION (Multi-Language Support)
// ============================================================================
// This file contains the corrected executeCode function that properly handles
// Python, C, and Java execution with proper error handling, timeouts, and
// cross-platform support.

const { spawnSync } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');

/**
 * Execute code using child_process (with proper multi-language support)
 * Handles Python, C, and Java with proper error handling and timeouts
 * 
 * @param {string} code - The source code to execute
 * @param {string} language - 'Python', 'C', or 'Java'
 * @returns {object} - Execution result:
 *   {
 *     success: boolean,
 *     output: string,        // stdout from program
 *     error: string,         // stderr or error message
 *     compileError: boolean  // true if compilation failed before execution
 *   }
 */
function executeCode(code, language) {
    const tempDir = path.join(__dirname, 'temp');
    
    // Ensure temp directory exists
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }

    const timestamp = Date.now();
    let sourceFile, outputFile, runCommand;
    const filesToClean = [];

    try {
        switch (language.toLowerCase()) {
            // ========== PYTHON EXECUTION ==========
            case 'python':
                sourceFile = path.join(tempDir, `script_${timestamp}.py`);
                fs.writeFileSync(sourceFile, code, 'utf-8');
                filesToClean.push(sourceFile);

                // Run directly with python
                runCommand = ['python', sourceFile];
                break;

            // ========== C EXECUTION ==========
            case 'c':
                sourceFile = path.join(tempDir, `program_${timestamp}.c`);
                
                // FIX #1: Platform-specific executable name
                // Windows: program_123456.exe
                // Linux/macOS: program_123456 (no extension)
                outputFile = path.join(
                    tempDir, 
                    os.platform() === 'win32' 
                        ? `program_${timestamp}.exe` 
                        : `program_${timestamp}`
                );
                
                fs.writeFileSync(sourceFile, code, 'utf-8');
                filesToClean.push(sourceFile, outputFile);

                // Compile C code using gcc
                const compileResult = spawnSync('gcc', [sourceFile, '-o', outputFile], {
                    timeout: 5000,
                    encoding: 'utf-8',
                    maxBuffer: 10 * 1024 * 1024
                });

                // Check for compilation errors
                if (compileResult.error || compileResult.status !== 0) {
                    return {
                        success: false,
                        output: '',
                        error: compileResult.stderr || compileResult.error?.message || 'Compilation failed',
                        compileError: true
                    };
                }

                // FIX #2: Use array arguments instead of shell string
                // This avoids shell parsing issues and handles spaces in paths
                runCommand = [outputFile];
                break;

            // ========== JAVA EXECUTION ==========
            case 'java':
                // FIX #3: Use fixed filename "Main.java" instead of Main_${timestamp}.java
                // Java REQUIRES class name == filename (without .java extension)
                // If file is "Main_123456.java", public class must be "Main_123456"
                // This causes a ClassNotFoundException mismatch!
                sourceFile = path.join(tempDir, `Main.java`);
                const classFile = path.join(tempDir, 'Main.class');
                
                fs.writeFileSync(sourceFile, code, 'utf-8');
                filesToClean.push(sourceFile, classFile);

                // Compile Java code using javac
                const javaCompileResult = spawnSync('javac', [sourceFile], {
                    timeout: 5000,
                    cwd: tempDir,  // Important: compile in temp directory
                    encoding: 'utf-8',
                    maxBuffer: 10 * 1024 * 1024
                });

                // Check for compilation errors
                if (javaCompileResult.error || javaCompileResult.status !== 0) {
                    return {
                        success: false,
                        output: '',
                        error: javaCompileResult.stderr || javaCompileResult.error?.message || 'Compilation failed',
                        compileError: true
                    };
                }

                // FIX #4: Use 'Main' as class name (not Main_timestamp)
                // This matches the fixed filename "Main.java"
                runCommand = ['java', '-cp', tempDir, 'Main'];
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

        // Handle spawn errors (e.g., timeout, command not found)
        if (result.error) {
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

        // Successful execution
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
        // Clean up all generated files to avoid disk bloat
        filesToClean.forEach(file => {
            try {
                if (fs.existsSync(file)) {
                    fs.unlinkSync(file);
                }
            } catch (e) {
                // Silently ignore cleanup errors
                // (file might be locked or already deleted)
            }
        });
    }
}

// ============================================================================
// EXPORT
// ============================================================================
module.exports = { executeCode };


// ============================================================================
// COMPARISON: OLD vs NEW
// ============================================================================
/*

OLD EXECUTE CODE (BROKEN):
───────────────────────────

function executeCode(code, language) {
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);  // ❌ Not recursive
    }

    const timestamp = Date.now();
    let filename, command;

    try {
        switch (language) {
            case 'Python':
                filename = path.join(tempDir, `script_${timestamp}.py`);
                fs.writeFileSync(filename, code);
                command = `python "${filename}"`;  // ❌ Shell string
                break;

            case 'C':
                filename = path.join(tempDir, `program_${timestamp}.c`);
                const exePath = path.join(tempDir, `program_${timestamp}.exe`);  // ❌ Always .exe
                fs.writeFileSync(filename, code);
                try {
                    execSync(`gcc "${filename}" -o "${exePath}"`, { timeout: 5000 });
                } catch (compileErr) {
                    return {
                        stdout: '',
                        stderr: compileErr.message || 'Compilation error',
                        compileOutput: compileErr.message  // ❌ Wrong field
                    };
                }
                command = `"${exePath}"`;  // ❌ Shell string, fails on Linux
                break;

            case 'Java':
                filename = path.join(tempDir, `Main_${timestamp}.java`);  // ❌ Wrong filename
                fs.writeFileSync(filename, code);
                try {
                    execSync(`javac "${filename}"`, { timeout: 5000, cwd: tempDir });  // ❌ Shell string
                } catch (compileErr) {
                    return {
                        stdout: '',
                        stderr: compileErr.message || 'Compilation error',
                        compileOutput: compileErr.message
                    };
                }
                command = `java -cp "${tempDir}" Main_${timestamp}`;  // ❌ Class name mismatch!
                break;
        }

        const output = execSync(command, {
            timeout: 5000,
            maxBuffer: 10 * 1024 * 1024,
            encoding: 'utf-8'
        });

        return { stdout: output, stderr: '', compileOutput: '' };

    } catch (error) {
        return {
            stdout: '',
            stderr: error.message || 'Execution error',
            compileOutput: error.stderr ? error.stderr.toString() : ''  // ❌ Wrong field
        };
    } finally {
        try {
            if (fs.existsSync(filename)) fs.unlinkSync(filename);
            if (language === 'C' || language === 'Java') {
                const exePath = path.join(tempDir, 
                    language === 'C' ? `program_${timestamp}.exe` : `Main_${timestamp}.class`);
                if (fs.existsSync(exePath)) fs.unlinkSync(exePath);  // ❌ Incomplete cleanup
            }
        } catch (e) {}
    }
}


NEW EXECUTE CODE (FIXED):
────────────────────────

✅ Uses spawnSync instead of execSync
✅ Platform detection for C executable (.exe vs no extension)
✅ Fixed Java filename to Main.java
✅ Fixed Java class name to Main (not Main_timestamp)
✅ Array arguments instead of shell strings
✅ Proper error handling with compileError flag
✅ Timeout detection with ETIMEDOUT
✅ Comprehensive file cleanup
✅ Cross-platform support (Windows + Linux + macOS)

*/
