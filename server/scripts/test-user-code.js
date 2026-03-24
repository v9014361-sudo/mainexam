const { createFile, deleteFile, runpy } = require('../utils/compilerUtils');
const fs = require('fs');
const path = require('path');

const userCode = `
import json
import os

FILE_NAME = "tasks.json"

def load_tasks():
    if not os.path.exists(FILE_NAME):
        return []
    with open(FILE_NAME, "r") as f:
        return json.load(f)

def save_tasks(tasks):
    with open(FILE_NAME, "w") as f:
        json.dump(tasks, f, indent=4)

def add_task(tasks):
    # title = input("Enter task title: ")
    title = input()
    task = {"title": title, "done": False}
    tasks.append(task)
    print("Task added!")

def view_tasks(tasks):
    if not tasks:
        print("No tasks found.")
        return
    for i, task in enumerate(tasks):
        status = "✔" if task["done"] else "✘"
        print(f"{i + 1}. {task['title']} [{status}]")

def main():
    tasks = [] # Start fresh for test
    
    # Simulate choices from stdin
    while True:
        try:
            choice = input()
            if choice == "1":
                view_tasks(tasks)
            elif choice == "2":
                add_task(tasks)
            elif choice == "5":
                print("Goodbye!")
                break
            else:
                break
        except EOFError:
            break

if __name__ == "__main__":
    main()
`;

async function testUserCode() {
    console.log('Testing User Task Manager Code...');
    const input = '2\nTest Task\n1\n5\n';
    const codePath = await createFile(userCode, 'py');
    const inputPath = await createFile(input, 'txt');
    try {
        const [stdout, stderr] = await runpy(codePath, inputPath);
        console.log('--- STDOUT ---');
        console.log(stdout);
        console.log('--- STDERR ---');
        console.log(stderr);
        
        if (stdout.includes('Task added!') && stdout.includes('Test Task [✘]') && stdout.includes('Goodbye!')) {
            console.log('✅ User Code Execution Verified Successfully');
        } else {
            console.log('❌ User Code Execution Verification Failed');
        }
    } finally {
        deleteFile(codePath);
        deleteFile(inputPath);
    }
}

testUserCode();
