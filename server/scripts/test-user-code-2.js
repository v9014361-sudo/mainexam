const { createFile, deleteFile, runpy } = require('../utils/compilerUtils');

const userCode = `
import random

def generate_numbers(n):
    nums = []
    for i in range(n):
        nums.append(random.randint(1, 100))
    return nums

def calculate_average(numbers):
    total = 0
    for num in numbers:
        total += num
    return total / len(numbers) + 5   # BUG: incorrect average calculation

def find_max(numbers):
    max_num = 0   # BUG: fails if all numbers are negative
    for num in numbers:
        if num > max_num:
            max_num = num
    return max_num

def search_number(numbers, target):
    for i in range(len(numbers)):
        if numbers[i] == target:
            return i
    return -1

def main():
    count = int(input("How many numbers? "))
    nums = generate_numbers(count)

    print("Generated numbers:", nums)

    avg = calculate_average(nums)
    print("Average:", avg)

    maximum = find_max(nums)
    print("Maximum:", maximum)

    target = int(input("Enter number to search: "))
    result = search_number(nums, target)

    if result:
        print("Found at index:", result)  # BUG: index 0 won't print correctly
    else:
        print("Not found")

    print("Done")  # Might never reach here in some edge cases

main()
`;

async function testUserCode() {
    console.log('Testing Buggy Python Code...');
    // Provide inputs: 5 (number of items), 42 (target to search)
    const input = '5\n42\n';
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
