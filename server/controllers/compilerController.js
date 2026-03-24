const Exam = require('../models/Exam');
const ExamSession = require('../models/ExamSession');
const { createFile, deleteFile, runcpp, runjava, runpy, runc } = require('../utils/compilerUtils');

const compilerMap = {
    cpp: runcpp,
    java: runjava,
    python: runpy,
    c: runc,
    py: runpy // Alias for python
};

exports.runCode = async (req, res) => {
    const { language, code, input } = req.body;
    
    if (!language || !code) {
        return res.status(400).json({ error: 'Language and code are required' });
    }

    const runFunc = compilerMap[language];
    if (!runFunc) {
        return res.status(400).json({ error: 'Unsupported language' });
    }

    let codePath, inputPath;
    try {
        codePath = await createFile(code, language === 'python' ? 'py' : language);
        inputPath = await createFile(input || '', 'txt');

        const [stdout, stderr] = await runFunc(codePath, inputPath);
        
        res.json({ stdout, stderr });
    } catch (error) {
        console.error('Run code error:', error);
        res.status(500).json({ error: 'Internal server error during code execution' });
    } finally {
        if (codePath) deleteFile(codePath);
        if (inputPath) deleteFile(inputPath);
    }
};

exports.submitCode = async (req, res) => {
    const { examId, questionId, code, language, sessionId } = req.body;

    if (!examId || !questionId || !code || !language || !sessionId) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const exam = await Exam.findById(examId);
        if (!exam) return res.status(404).json({ error: 'Exam not found' });

        const question = exam.questions.id(questionId);
        if (!question || question.questionType !== 'coding') {
            return res.status(400).json({ error: 'Invalid question for code submission' });
        }

        const runFunc = compilerMap[language];
        if (!runFunc) {
            return res.status(400).json({ error: 'Unsupported language' });
        }

        const testResults = [];
        let passedCount = 0;

        for (const testCase of question.testCases) {
            let codePath, inputPath;
            try {
                codePath = await createFile(code, language === 'python' ? 'py' : language);
                inputPath = await createFile(testCase.input || '', 'txt');

                const [stdout, stderr] = await runFunc(codePath, inputPath);
                
                const actualOutput = stdout.replace(/\r\n/g, '\n').trim();
                const expectedOutput = testCase.expectedOutput.replace(/\r\n/g, '\n').trim();
                const isPassed = actualOutput === expectedOutput;

                if (isPassed) passedCount++;

                testResults.push({
                    input: testCase.isPublic ? testCase.input : 'Hidden',
                    expectedOutput: testCase.isPublic ? testCase.expectedOutput : 'Hidden',
                    actualOutput: testCase.isPublic ? stdout : (isPassed ? 'Passed' : 'Failed'),
                    passed: isPassed,
                    stderr: stderr || null
                });
            } catch (err) {
                testResults.push({
                    passed: false,
                    error: err.message
                });
            } finally {
                if (codePath) deleteFile(codePath);
                if (inputPath) deleteFile(inputPath);
            }
        }

        const totalTests = question.testCases.length;
        const allPassed = passedCount === totalTests;

        res.json({
            success: true,
            results: testResults,
            passedCount,
            totalTests,
            allPassed
        });
    } catch (error) {
        console.error('Submit code error:', error);
        res.status(500).json({ error: 'Internal server error during code submission' });
    }
};
