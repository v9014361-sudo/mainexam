# Clear Exam Data Guide

This guide explains how to remove previously conducted exams and their associated data from the database.

## Available Scripts

### 1. List All Exams

View all exams in the database with their details and session counts:

```bash
cd server
npm run list:exams
```

**Output includes:**
- Exam ID
- Title
- Creator information
- Number of questions and total points
- Session breakdown (submitted, terminated, in progress)

### 2. Clear All Exam Sessions

Remove all student attempts and results while preserving exam definitions:

```bash
cd server
npm run clear:sessions
```

**This will delete:**
- All exam sessions (student attempts)
- All results and scores
- All violation logs
- All answer submissions

**This will preserve:**
- Exam definitions (questions, settings)
- User accounts
- System configuration

### 3. Clear Everything (Sessions + Exams)

Remove all exam data including exam definitions:

```bash
cd server
npm run clear:all
```

**This will delete:**
- All exam sessions
- All exam definitions
- All questions and settings

**This will preserve:**
- User accounts
- System configuration

### 4. Clear Specific Exam

Remove sessions for a single exam:

```bash
cd server
npm run clear:exam <examId>
```

**Example:**
```bash
npm run clear:exam 507f1f77bcf86cd799439011
```

**This will delete:**
- All sessions for the specified exam
- All results for that exam

**This will preserve:**
- The exam definition itself
- Sessions for other exams

## Step-by-Step Usage

### Scenario 1: Clear All Old Results (Keep Exams)

1. **List exams to see what will be affected:**
   ```bash
   npm run list:exams
   ```

2. **Clear all sessions:**
   ```bash
   npm run clear:sessions
   ```

3. **Confirm by typing "DELETE"** when prompted

### Scenario 2: Complete Database Reset

1. **Backup your database first** (recommended):
   ```bash
   mongodump --uri="mongodb://localhost:27017/secure_exam_db" --out=./backup
   ```

2. **Clear everything:**
   ```bash
   npm run clear:all
   ```

3. **Confirm by typing "DELETE"** when prompted

### Scenario 3: Clear One Specific Exam

1. **Find the exam ID:**
   ```bash
   npm run list:exams
   ```

2. **Copy the exam ID from the output**

3. **Clear that exam's sessions:**
   ```bash
   npm run clear:exam 507f1f77bcf86cd799439011
   ```

4. **Confirm by typing "DELETE"** when prompted

## Safety Features

All scripts include safety measures:

1. **Confirmation Required:** You must type "DELETE" to proceed
2. **Preview:** Shows what will be deleted before confirmation
3. **Counts:** Displays number of items to be deleted
4. **Cannot be undone:** Clear warning before deletion

## What Gets Deleted

### Exam Sessions Include:
- Student answers (encrypted and plain)
- Scores and percentages
- Pass/fail status
- Violation logs (tab switches, fullscreen exits, etc.)
- Timestamps (started, submitted, terminated)
- IP addresses and browser fingerprints
- Edit history (if marks were manually adjusted)

### Exams Include:
- Questions and options
- Correct answers
- Point values
- Exam settings (duration, passing score, etc.)
- Proctoring settings
- Encryption settings

## Database Backup (Recommended)

Before clearing data, create a backup:

### Using mongodump:
```bash
mongodump --uri="mongodb://localhost:27017/secure_exam_db" --out=./backup-$(date +%Y%m%d)
```

### Using MongoDB Compass:
1. Connect to your database
2. Click on the database name
3. Select "Export Collection"
4. Choose JSON or CSV format

### Restore from backup:
```bash
mongorestore --uri="mongodb://localhost:27017/secure_exam_db" ./backup-20240329
```

## Common Use Cases

### 1. Start Fresh for New Semester
```bash
# Keep exams, clear all student attempts
npm run clear:sessions
```

### 2. Remove Test Data
```bash
# Clear specific test exam
npm run list:exams  # Find test exam ID
npm run clear:exam <test-exam-id>
```

### 3. Complete System Reset
```bash
# Remove everything
npm run clear:all
```

### 4. Archive and Clear
```bash
# 1. Backup first
mongodump --uri="mongodb://localhost:27017/secure_exam_db" --out=./archive-2024

# 2. Clear sessions
npm run clear:sessions
```

## Troubleshooting

### Script won't run
```bash
# Make sure you're in the server directory
cd server

# Check if Node.js is installed
node --version

# Install dependencies if needed
npm install
```

### Database connection error
```bash
# Check if MongoDB is running
# Windows:
net start MongoDB

# Linux/Mac:
sudo systemctl status mongod

# Check .env file has correct MONGODB_URI
cat .env | grep MONGODB_URI
```

### Permission denied
```bash
# Run with appropriate permissions
# Linux/Mac:
sudo npm run clear:sessions

# Windows: Run terminal as Administrator
```

## Alternative: Manual Database Cleanup

If you prefer using MongoDB directly:

### Using MongoDB Shell:
```javascript
// Connect to database
use secure_exam_db

// Count documents before deletion
db.examsessions.countDocuments()
db.exams.countDocuments()

// Delete all exam sessions
db.examsessions.deleteMany({})

// Delete all exams
db.exams.deleteMany({})

// Verify deletion
db.examsessions.countDocuments()
db.exams.countDocuments()
```

### Using MongoDB Compass:
1. Connect to your database
2. Select `examsessions` collection
3. Click "Delete" button
4. Confirm deletion
5. Repeat for `exams` collection if needed

## Important Notes

⚠️ **Warning:** Deletion is permanent and cannot be undone!

✅ **Best Practices:**
- Always backup before clearing data
- Use `list:exams` to preview what will be deleted
- Test scripts on a development database first
- Clear sessions only (not exams) to preserve question banks
- Document why you're clearing data (for audit purposes)

🔒 **Security:**
- Scripts require database access
- Only administrators should run these scripts
- Log all data deletion operations
- Keep backups for compliance/audit requirements

## Support

If you encounter issues:

1. Check MongoDB connection
2. Verify you're in the correct directory
3. Ensure proper permissions
4. Check server logs for errors
5. Restore from backup if needed
