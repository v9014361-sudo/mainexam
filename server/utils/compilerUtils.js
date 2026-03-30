const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const crypto = require('crypto');

const CODES_DIR = path.join(__dirname, '..', 'codes');

// Ensure codes directory exists
if (!fs.existsSync(CODES_DIR)) {
    fs.mkdirSync(CODES_DIR, { recursive: true });
}

const createFile = async (content, ext) => {
    // Prefix with 'Code_' to ensure valid Java class name (can't start with digit)
    const filename = 'Code_' + crypto.randomBytes(8).toString('hex') + Date.now();
    const filePath = path.join(CODES_DIR, `${filename}.${ext}`);
    
    let processedContent = content;
    if (ext === 'java') {
        // Replace the public class name with the filename for Java
        processedContent = content.replace(/public\s+class\s+\w+/, `public class ${filename}`);
    }
    
    fs.writeFileSync(filePath, processedContent, 'utf8');
    return filePath;
};

const deleteFile = (filePath) => {
    try {
        const basename = path.basename(filePath);
        const filename = basename.split('.')[0];
        const ext = basename.split('.')[1];

        // Delete source file
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        // Clean up binaries (check both .exe for Windows and no extension for Linux)
        if (ext === 'java') {
            const classFile = path.join(CODES_DIR, `${filename}.class`);
            if (fs.existsSync(classFile)) fs.unlinkSync(classFile);
        } else if (ext === 'c' || ext === 'cpp') {
            // Windows executable
            const exeFile = path.join(CODES_DIR, `${filename}.exe`);
            if (fs.existsSync(exeFile)) fs.unlinkSync(exeFile);
            
            // Linux/Mac executable (no extension)
            const linuxExe = path.join(CODES_DIR, filename);
            if (fs.existsSync(linuxExe)) {
                try {
                    fs.unlinkSync(linuxExe);
                } catch (e) {
                    // Ignore if it's the source file
                }
            }
        }
    } catch (e) {
        console.error(`Error deleting file ${filePath}:`, e.message);
    }
};

const runcpp = (codePath, inputPath) => {
    return new Promise((resolve) => {
        const base = path.basename(codePath).split('.')[0];
        const dir = path.dirname(codePath);
        const inputName = path.basename(inputPath);
        
        // Detect OS and use appropriate command
        const isWindows = process.platform === 'win32';
        const exeName = isWindows ? `${base}.exe` : base;
        const exePath = isWindows ? `.\\${exeName}` : `./${base}`;
        
        const command = `cd "${dir}" && g++ ${base}.cpp -o ${exeName} && ${exePath} < ${inputName}`;

        const env = { ...process.env, PYTHONIOENCODING: 'utf-8', LC_ALL: 'en_US.UTF-8' };
        exec(command, { timeout: 10000, maxBuffer: 1024 * 1024, env }, (error, stdout, stderr) => {
            resolve([
                stdout ? stdout.toString() : '',
                stderr ? stderr.toString() : (error ? error.message : '')
            ]);
        });
    });
};

const runjava = (codePath, inputPath) => {
    return new Promise((resolve) => {
        const base = path.basename(codePath).split('.')[0];
        const dir = path.dirname(codePath);
        const inputName = path.basename(inputPath);
        
        const command = `cd "${dir}" && javac ${base}.java && java ${base} < ${inputName}`;

        const env = { ...process.env, PYTHONIOENCODING: 'utf-8', LC_ALL: 'en_US.UTF-8' };
        exec(command, { timeout: 10000, maxBuffer: 1024 * 1024, env }, (error, stdout, stderr) => {
            resolve([
                stdout ? stdout.toString() : '',
                stderr ? stderr.toString() : (error ? error.message : '')
            ]);
        });
    });
};

const runpy = (codePath, inputPath) => {
    return new Promise((resolve) => {
        const base = path.basename(codePath).split('.')[0];
        const dir = path.dirname(codePath);
        const inputName = path.basename(inputPath);
        
        const command = `cd "${dir}" && python ${base}.py < ${inputName}`;

        const env = { ...process.env, PYTHONIOENCODING: 'utf-8', LC_ALL: 'en_US.UTF-8' };
        exec(command, { timeout: 10000, maxBuffer: 1024 * 1024, env }, (error, stdout, stderr) => {
            resolve([
                stdout ? stdout.toString() : '',
                stderr ? stderr.toString() : (error ? error.message : '')
            ]);
        });
    });
};

const runc = (codePath, inputPath) => {
    return new Promise((resolve) => {
        const base = path.basename(codePath).split('.')[0];
        const dir = path.dirname(codePath);
        const inputName = path.basename(inputPath);
        
        // Detect OS and use appropriate command
        const isWindows = process.platform === 'win32';
        const exeName = isWindows ? `${base}.exe` : base;
        const exePath = isWindows ? `.\\${exeName}` : `./${base}`;
        
        const command = `cd "${dir}" && gcc ${base}.c -o ${exeName} && ${exePath} < ${inputName}`;

        const env = { ...process.env, PYTHONIOENCODING: 'utf-8', LC_ALL: 'en_US.UTF-8' };
        exec(command, { timeout: 10000, maxBuffer: 1024 * 1024, env }, (error, stdout, stderr) => {
            resolve([
                stdout ? stdout.toString() : '',
                stderr ? stderr.toString() : (error ? error.message : '')
            ]);
        });
    });
};

module.exports = {
    createFile,
    deleteFile,
    runcpp,
    runjava,
    runpy,
    runc
};
