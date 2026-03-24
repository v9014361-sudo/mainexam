const PDFDocument = require('pdfkit');

/**
 * Utility to generate PDF reports for exam violations/cheating.
 * @param {Array} sessions - Array of exam session objects with violations.
 * @param {string} examTitle - Title of the exam.
 * @returns {Promise<Buffer>} - A promise that resolves to the PDF buffer.
 */
const generateCheatingReportPDF = (sessions, examTitle) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', (err) => reject(err));

    doc.fontSize(20).text(`Security Report: ${examTitle}`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Generated on: ${new Date().toLocaleString()}`);
    doc.moveDown();

    if (sessions.length === 0) {
      doc.text('No sessions found for this exam.');
    } else {
      sessions.forEach((session, index) => {
        doc.fontSize(14).text(`${index + 1}. Student: ${session.userId.name} (${session.userId.email})`, { underline: true });
        doc.fontSize(12).text(`Total Violations: ${session.totalViolations}`);
        doc.text(`Status: ${session.status}`);
        
        if (session.violations && session.violations.length > 0) {
          doc.text('Violations:');
          session.violations.forEach((v) => {
            doc.text(`  - [${v.timestamp.toLocaleString()}] ${v.type}: ${v.details} (Severity: ${v.severity})`);
          });
        } else {
          doc.text('No specific violations recorded.');
        }
        doc.moveDown();
      });
    }

    doc.end();
  });
};

/**
 * Utility to generate CSV reports for exam performance.
 * @param {Array} sessions - Array of exam session objects.
 * @returns {Promise<Buffer>} - A promise that resolves to the CSV buffer.
 */
const generateExamPerformanceCSV = (sessions) => {
  return new Promise((resolve) => {
    let csv = 'Student Name,Email,Score,Percentage,Passed,Violations,Status,Submitted At\n';
    
    sessions.forEach((s) => {
      const name = s.userId.name.replace(/,/g, '');
      const email = s.userId.email;
      const score = s.score || 0;
      const percentage = s.percentage || 0;
      const passed = s.passed ? 'Yes' : 'No';
      const violations = s.totalViolations || 0;
      const status = s.status;
      const submittedAt = s.submittedAt ? new Date(s.submittedAt).toLocaleString().replace(/,/g, '') : 'N/A';
      
      csv += `${name},${email},${score},${percentage}%,${passed},${violations},${status},${submittedAt}\n`;
    });

    resolve(Buffer.from(csv, 'utf-8'));
  });
};

module.exports = {
  generateCheatingReportPDF,
  generateExamPerformanceCSV,
};
