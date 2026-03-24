const { createFile, deleteFile, runcpp, runjava, runpy, runc } = require('../utils/compilerUtils');
const path = require('path');
const fs = require('fs');

async function testPython() {
    console.log('Testing Python...');
    const code = 'import sys\nname = sys.stdin.readline().strip()\nprint(f"Hello, {name}!")';
    const input = 'Vijay';
    const codePath = await createFile(code, 'py');
    const inputPath = await createFile(input, 'txt');
    try {
        const [stdout, stderr] = await runpy(codePath, inputPath);
        console.log('Output:', stdout.trim());
        if (stdout.trim() === 'Hello, Vijay!') {
            console.log('✅ Python Test Passed');
        } else {
            console.log('❌ Python Test Failed');
            console.log('Stderr:', stderr);
        }
    } finally {
        deleteFile(codePath);
        deleteFile(inputPath);
    }
}

async function testCpp() {
    console.log('\nTesting C++...');
    const code = '#include <iostream>\n#include <string>\nint main() {\n    std::string name;\n    std::cin >> name;\n    std::cout << "Hello, " << name << "!" << std::endl;\n    return 0;\n}';
    const input = 'Vijay';
    const codePath = await createFile(code, 'cpp');
    const inputPath = await createFile(input, 'txt');
    try {
        const [stdout, stderr] = await runcpp(codePath, inputPath);
        console.log('Output:', stdout.trim());
        if (stdout.trim() === 'Hello, Vijay!') {
            console.log('✅ C++ Test Passed');
        } else {
            console.log('❌ C++ Test Failed (Check if g++ is installed)');
            console.log('Stderr:', stderr);
        }
    } finally {
        deleteFile(codePath);
        deleteFile(inputPath);
    }
}

async function testJava() {
    console.log('\nTesting Java...');
    const code = 'import java.util.Scanner;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (sc.hasNext()) {\n            String name = sc.next();\n            System.out.println("Hello, " + name + "!");\n        }\n    }\n}';
    const input = 'Vijay';
    const codePath = await createFile(code, 'java');
    const inputPath = await createFile(input, 'txt');
    try {
        const [stdout, stderr] = await runjava(codePath, inputPath);
        console.log('Output:', stdout.trim());
        if (stdout.trim() === 'Hello, Vijay!') {
            console.log('✅ Java Test Passed');
        } else {
            console.log('❌ Java Test Failed');
            console.log('Stderr:', stderr);
        }
    } finally {
        deleteFile(codePath);
        deleteFile(inputPath);
    }
}

async function runTests() {
    try {
        await testPython();
        await testJava();
        await testCpp();
    } catch (err) {
        console.error('Test error:', err);
    }
}

runTests();
