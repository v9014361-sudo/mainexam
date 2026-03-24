const { createFile, deleteFile, runpy } = require('../utils/compilerUtils');

async function runTest(testName, code, input, expected) {
    const codePath = await createFile(code, 'py');
    const inputPath = await createFile(input, 'txt');
    try {
        const [stdout, stderr] = await runpy(codePath, inputPath);
        const actual = stdout.replace(/\r\n/g, '\n').trim();
        const passed = actual === expected.replace(/\r\n/g, '\n').trim();
        if (passed) {
            console.log(`  ✅ ${testName}`);
        } else {
            console.log(`  ❌ ${testName}`);
            console.log(`     Expected: "${expected.trim()}"`);
            console.log(`     Actual:   "${actual}"`);
            if (stderr) console.log(`     Stderr:   "${stderr}"`);
        }
        return passed;
    } catch (err) {
        console.log(`  ❌ ${testName} - Error: ${err.message}`);
        return false;
    } finally {
        deleteFile(codePath);
        deleteFile(inputPath);
    }
}

async function runAllTests() {
    let passed = 0;
    let total = 0;

    console.log('\n=== Python Compiler Comprehensive Tests ===\n');

    // ---- Test 1: Basic print ----
    console.log('1. Basic Output Tests:');
    total++;
    if (await runTest('Hello World', 'print("Hello, World!")', '', 'Hello, World!')) passed++;

    // ---- Test 2: stdin input ----
    total++;
    if (await runTest('Read stdin input',
        'import sys\nname = sys.stdin.readline().strip()\nprint(f"Hello, {name}!")',
        'Vijay', 'Hello, Vijay!')) passed++;

    // ---- Test 3: Multiple inputs ----
    total++;
    if (await runTest('Multiple inputs',
        'a = int(input())\nb = int(input())\nprint(a + b)',
        '10\n20', '30')) passed++;

    // ---- Test 4: Loop ----
    total++;
    if (await runTest('For loop',
        'n = int(input())\nfor i in range(1, n+1):\n    print(i, end=" ")\nprint()',
        '5', '1 2 3 4 5')) passed++;

    // ---- Test 5: List processing ----
    total++;
    if (await runTest('List sort and output',
        'nums = list(map(int, input().split()))\nnums.sort()\nprint(" ".join(map(str, nums)))',
        '5 3 8 1 9 2', '1 2 3 5 8 9')) passed++;

    // ---- Test 6: String manipulation ----
    total++;
    if (await runTest('String reverse',
        's = input().strip()\nprint(s[::-1])',
        'python', 'nohtyp')) passed++;

    // ---- Test 7: Math operations ----
    total++;
    if (await runTest('Math operations (factorial)',
        'import math\nn = int(input())\nprint(math.factorial(n))',
        '10', '3628800')) passed++;

    // ---- Test 8: Dictionary usage ----
    total++;
    if (await runTest('Dictionary word count',
        'words = input().split()\ncount = {}\nfor w in words:\n    count[w] = count.get(w, 0) + 1\nfor k in sorted(count.keys()):\n    print(f"{k}:{count[k]}")',
        'apple banana apple cherry banana apple',
        'apple:3\nbanana:2\ncherry:1')) passed++;

    // ---- Test 9: Recursive function ----
    total++;
    if (await runTest('Recursive fibonacci',
        'def fib(n):\n    if n <= 1: return n\n    return fib(n-1) + fib(n-2)\nn = int(input())\nprint(fib(n))',
        '10', '55')) passed++;

    // ---- Test 10: Error handling ----
    total++;
    if (await runTest('Try-except (division by zero)',
        'try:\n    a = int(input())\n    b = int(input())\n    print(a // b)\nexcept ZeroDivisionError:\n    print("Error: Division by zero")',
        '10\n0', 'Error: Division by zero')) passed++;

    // ---- Test 11: Multi-line output ----
    total++;
    if (await runTest('Multi-line output (multiplication table)',
        'n = int(input())\nfor i in range(1, 4):\n    print(f"{n}x{i}={n*i}")',
        '5', '5x1=5\n5x2=10\n5x3=15')) passed++;

    // ---- Test 12: Empty input handling ----
    total++;
    if (await runTest('No input needed',
        'print(sum(range(1, 11)))',
        '', '55')) passed++;

    // ---- Test 13: Large computation ----
    total++;
    if (await runTest('Large computation (prime check)',
        'n = int(input())\nis_prime = n > 1 and all(n % i != 0 for i in range(2, int(n**0.5)+1))\nprint("Prime" if is_prime else "Not Prime")',
        '97', 'Prime')) passed++;

    // ---- Test 14: Class and OOP ----
    total++;
    if (await runTest('Class and OOP',
        'class Calculator:\n    def add(self, a, b): return a + b\n    def mul(self, a, b): return a * b\nc = Calculator()\na, b = map(int, input().split())\nprint(f"Sum={c.add(a,b)} Product={c.mul(a,b)}")',
        '3 7', 'Sum=10 Product=21')) passed++;

    // ---- Test 15: Syntax error detection ----
    console.log('\n2. Error Detection Tests:');
    total++;
    const codePath15 = await createFile('print("Hello"\n# Missing closing paren', 'py');
    const inputPath15 = await createFile('', 'txt');
    try {
        const [stdout15, stderr15] = await runpy(codePath15, inputPath15);
        if (stderr15 && stderr15.includes('SyntaxError')) {
            console.log('  ✅ Syntax error detected correctly');
            passed++;
        } else {
            console.log('  ❌ Syntax error not detected');
            console.log(`     Stdout: "${stdout15}"`);
            console.log(`     Stderr: "${stderr15}"`);
        }
    } finally {
        deleteFile(codePath15);
        deleteFile(inputPath15);
    }

    // ---- Test 16: Runtime error detection ----
    total++;
    const codePath16 = await createFile('x = 1/0', 'py');
    const inputPath16 = await createFile('', 'txt');
    try {
        const [stdout16, stderr16] = await runpy(codePath16, inputPath16);
        if (stderr16 && stderr16.includes('ZeroDivisionError')) {
            console.log('  ✅ Runtime error (ZeroDivisionError) detected correctly');
            passed++;
        } else {
            console.log('  ❌ Runtime error not detected');
            console.log(`     Stdout: "${stdout16}"`);
            console.log(`     Stderr: "${stderr16}"`);
        }
    } finally {
        deleteFile(codePath16);
        deleteFile(inputPath16);
    }

    // ---- Summary ----
    console.log(`\n=== Results: ${passed}/${total} tests passed ===`);
    if (passed === total) {
        console.log('🎉 All Python compiler tests PASSED!\n');
    } else {
        console.log(`⚠️  ${total - passed} test(s) FAILED.\n`);
    }
}

runAllTests().catch(err => console.error('Test runner error:', err));
