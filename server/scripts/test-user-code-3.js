const { createFile, deleteFile, runpy } = require('../utils/compilerUtils');

const userCode = `
name = input("Enter your name: ")
age = int(input("Enter your age: "))

print("Hello", name)
print("Next year you will be", age + 1)
`;

async function testUserCode() {
    console.log('Testing Short Python Code...');
    // Provide inputs: Vijay (name), 25 (age)
    const input = 'Vijay\n25\n';
    const codePath = await createFile(userCode, 'py');
    const inputPath = await createFile(input, 'txt');
    try {
        const [stdout, stderr] = await runpy(codePath, inputPath);
        console.log('--- STDOUT ---');
        console.log(stdout);
        console.log('--- STDERR ---');
        console.log(stderr);
    } finally {
        deleteFile(codePath);
        deleteFile(inputPath);
    }
}

testUserCode();
