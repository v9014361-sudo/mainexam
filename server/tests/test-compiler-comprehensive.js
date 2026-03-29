/**
 * Comprehensive Compiler Test
 * Tests code execution for Python, C++, Java, and C
 */

const axios = require('axios');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  validateStatus: () => true,
});

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  blue: '\x1b[36m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ ${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.blue}${'='.repeat(60)}\n${msg}\n${'='.repeat(60)}${colors.reset}\n`),
};

let passed = 0;
let failed = 0;

const assert = (condition, message) => {
  if (condition) {
    passed++;
    log.success(message);
  } else {
    failed++;
    log.error(message);
  }
};

async function setupAuth() {
  const timestamp = Date.now();
  await api.post('/api/auth/register', {
    name: 'Compiler Test User',
    email: `compilertest${timestamp}@test.com`,
    password: 'Test@123456',
    role: 'student',
  });
}

async function testPythonCompiler() {
  log.section('PYTHON COMPILER TESTS');
  
  const tests = [
    {
      name: 'Simple Print',
      code: 'print("Hello, World!")',
      input: '',
      expected: 'Hello, World!',
    },
    {
      name: 'Arithmetic Operations',
      code: 'a = 10\nb = 20\nprint(a + b)\nprint(a * b)\nprint(b - a)',
      input: '',
      expected: '30',
    },
    {
      name: 'Input Processing',
      code: 'x = int(input())\ny = int(input())\nprint(x + y)',
      input: '15\n25',
      expected: '40',
    },
    {
      name: 'Loops',
      code: 'for i in range(5):\n    print(i, end=" ")',
      input: '',
      expected: '0 1 2 3 4',
    },
    {
      name: 'Functions',
      code: 'def factorial(n):\n    if n <= 1:\n        return 1\n    return n * factorial(n-1)\nprint(factorial(5))',
      input: '',
      expected: '120',
    },
    {
      name: 'Lists and Comprehension',
      code: 'nums = [1, 2, 3, 4, 5]\nsquares = [x**2 for x in nums]\nprint(sum(squares))',
      input: '',
      expected: '55',
    },
  ];
  
  for (let testCase of tests) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      const res = await api.post('/api/compiler/run', {
        language: 'python',
        code: testCase.code,
        input: testCase.input,
      });
      
      assert(res.status === 200, `${testCase.name} - Attempt ${attempt}: Execution successful`);
      if (res.data.stdout) {
        const output = res.data.stdout.trim();
        assert(output.includes(testCase.expected), `${testCase.name} - Attempt ${attempt}: Output correct`);
      }
    }
  }
}

async function testCppCompiler() {
  log.section('C++ COMPILER TESTS');
  
  const tests = [
    {
      name: 'Simple Output',
      code: '#include<iostream>\nusing namespace std;\nint main(){cout<<"Hello C++";return 0;}',
      expected: 'Hello C++',
    },
    {
      name: 'Arithmetic',
      code: '#include<iostream>\nusing namespace std;\nint main(){int a=15,b=5;cout<<a+b<<" "<<a*b;return 0;}',
      expected: '20 75',
    },
    {
      name: 'Loops',
      code: '#include<iostream>\nusing namespace std;\nint main(){for(int i=0;i<5;i++)cout<<i<<" ";return 0;}',
      expected: '0 1 2 3 4',
    },
  ];
  
  for (let testCase of tests) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      const res = await api.post('/api/compiler/run', {
        language: 'cpp',
        code: testCase.code,
        input: '',
      });
      
      assert(res.status === 200, `${testCase.name} - Attempt ${attempt}: Execution successful`);
      if (res.data.stdout) {
        assert(res.data.stdout.includes(testCase.expected), `${testCase.name} - Attempt ${attempt}: Output correct`);
      }
    }
  }
}

async function testJavaCompiler() {
  log.section('JAVA COMPILER TESTS');
  
  const tests = [
    {
      name: 'Simple Print',
      code: 'public class Main{public static void main(String[]args){System.out.println("Hello Java");}}',
      expected: 'Hello Java',
    },
    {
      name: 'Arithmetic',
      code: 'public class Main{public static void main(String[]args){int a=10,b=5;System.out.println(a+b);}}',
      expected: '15',
    },
    {
      name: 'Loops',
      code: 'public class Main{public static void main(String[]args){for(int i=0;i<3;i++)System.out.print(i+" ");}}',
      expected: '0 1 2',
    },
  ];
  
  for (let testCase of tests) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      const res = await api.post('/api/compiler/run', {
        language: 'java',
        code: testCase.code,
        input: '',
      });
      
      assert(res.status === 200, `${testCase.name} - Attempt ${attempt}: Execution successful`);
    }
  }
}

async function testCCompiler() {
  log.section('C COMPILER TESTS');
  
  const tests = [
    {
      name: 'Simple Output',
      code: '#include<stdio.h>\nint main(){printf("Hello C");return 0;}',
      expected: 'Hello C',
    },
    {
      name: 'Arithmetic',
      code: '#include<stdio.h>\nint main(){int a=8,b=4;printf("%d",a+b);return 0;}',
      expected: '12',
    },
    {
      name: 'Loops',
      code: '#include<stdio.h>\nint main(){for(int i=0;i<4;i++)printf("%d ",i);return 0;}',
      expected: '0 1 2 3',
    },
  ];
  
  for (let testCase of tests) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      const res = await api.post('/api/compiler/run', {
        language: 'c',
        code: testCase.code,
        input: '',
      });
      
      assert(res.status === 200, `${testCase.name} - Attempt ${attempt}: Execution successful`);
      if (res.data.stdout) {
        assert(res.data.stdout.includes(testCase.expected), `${testCase.name} - Attempt ${attempt}: Output correct`);
      }
    }
  }
}

async function testErrorHandling() {
  log.section('COMPILER ERROR HANDLING TESTS');
  
  // Test 1: Syntax errors (3 languages)
  const syntaxErrors = [
    { language: 'python', code: 'print("missing paren"' },
    { language: 'cpp', code: '#include<iostream>\nint main(){cout<<"missing semicolon"return 0;}' },
    { language: 'java', code: 'public class Main{public static void main(String[]args){System.out.println("missing brace")' },
  ];
  
  for (let i = 0; i < 3; i++) {
    const res = await api.post('/api/compiler/run', syntaxErrors[i]);
    assert(res.status === 200, `Syntax error ${i + 1} handled gracefully`);
    assert(res.data.stderr && res.data.stderr.length > 0, `Syntax error ${i + 1} reported in stderr`);
  }
  
  // Test 2: Runtime errors (3 times)
  for (let i = 1; i <= 3; i++) {
    const res = await api.post('/api/compiler/run', {
      language: 'python',
      code: 'x = 10 / 0',
      input: '',
    });
    assert(res.status === 200, `Runtime error ${i} handled`);
  }
  
  // Test 3: Timeout/infinite loops (3 times)
  for (let i = 1; i <= 3; i++) {
    const res = await api.post('/api/compiler/run', {
      language: 'python',
      code: 'while True:\n    pass',
      input: '',
    });
    log.info(`Infinite loop test ${i}: Status ${res.status}`);
  }
}

async function runCompilerTests() {
  log.section('🚀 COMPREHENSIVE COMPILER TESTS');
  
  await setupAuth();
  
  await testPythonCompiler();
  await testCppCompiler();
  await testJavaCompiler();
  await testCCompiler();
  await testErrorHandling();
  
  log.section('📊 COMPILER TEST SUMMARY');
  console.log(`Passed: ${colors.green}${passed}${colors.reset}`);
  console.log(`Failed: ${colors.red}${failed}${colors.reset}`);
  console.log(`Success Rate: ${((passed / (passed + failed)) * 100).toFixed(2)}%`);
  
  process.exit(failed > 0 ? 1 : 0);
}

if (require.main === module) {
  runCompilerTests().catch(error => {
    log.error(`Fatal: ${error.message}`);
    console.error(error);
    process.exit(1);
  });
}

module.exports = { runCompilerTests };
