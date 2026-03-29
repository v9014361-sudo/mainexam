# How to Delete All Exams

## Quick Command

To remove ALL exams and their sessions from the database:

```bash
cd server
npm run clear:exams
```

**This will delete:**
- ✅ All exam definitions (questions, settings)
- ✅ All exam sessions (student attempts, results)
- ✅ All violation logs
- ✅ All scores and submissions

**This will preserve:**
- ✅ User accounts (students, teachers, admins)
- ✅ System settings

## Step-by-Step Instructions

### 1. Open Terminal/Command Prompt

**Windows:**
- Press `Win + R`
- Type `cmd` and press Enter

**Mac/Linux:**
- Press `Cmd + Space` (Mac) or `Ctrl + Alt + T` (Linux)
- Type `terminal` and press Enter

### 2. Navigate to Server Directory

```bash
cd path/to/your/project/server
```

Example:
```bash
cd C:\Users\YourName\Desktop\secure-exam\server
```

### 3. Run the Delete Command

```bash
npm run clear:exams
```

### 4. Confirm Deletion

When prompted, type exactly:
```
DELETE
```

Then press Enter.

### 5. Verify Deletion

The script will show:
```
✓ Deleted X exam sessions
✓ Deleted Y exams

Remaining Exam Sessions: 0
Remaining Exams: 0
```

## Alternative: Delete Only Sessions (Keep Exams)

If you want to keep the exam questions but remove student attempts:

```bash
npm run clear:sessions
```

This preserves your exam bank for future use.

## Troubleshooting

### "npm: command not found"

Install Node.js from https://nodejs.org/

### "Cannot find module"

Run this first:
```bash
npm install
```

### "Database connection error"

Make sure MongoDB is running:

**Windows:**
```bash
net start MongoDB
```

**Mac/Linux:**
```bash
sudo systemctl start mongod
```

### Script doesn't delete anything

Check your `.env` file has the correct database connection:
```
MONGODB_URI=mongodb://localhost:27017/secure_exam_db
```

## What You'll See

Before deletion:
```
=== Current Database Status ===
Total Exam Sessions: 15
Total Exams: 8

⚠️  WARNING: This action cannot be undone!

You are about to delete:
- 15 exam sessions (all student attempts and results)
- 8 exams (all exam definitions)

Type "DELETE" to confirm:
```

After deletion:
```
🗑️  Starting deletion process...

Deleting exam sessions...
✓ Deleted 15 exam sessions
Deleting exams...
✓ Deleted 8 exams

=== Cleanup Complete ===
Database has been cleared successfully.

Remaining Exam Sessions: 0
Remaining Exams: 0
```

## Backup First (Recommended)

Before deleting, create a backup:

```bash
mongodump --uri="mongodb://localhost:27017/secure_exam_db" --out=./backup
```

To restore later:
```bash
mongorestore --uri="mongodb://localhost:27017/secure_exam_db" ./backup
```

## Need Help?

If the exams are still showing after running the script:

1. **Refresh your browser** (Ctrl+F5 or Cmd+Shift+R)
2. **Check if script ran successfully** - look for "Deleted X exams" message
3. **Verify database connection** - check MongoDB is running
4. **Check the right database** - verify MONGODB_URI in .env file
5. **Clear browser cache** - old data might be cached

## Manual Deletion (If Script Fails)

Using MongoDB Compass:
1. Open MongoDB Compass
2. Connect to `mongodb://localhost:27017`
3. Select `secure_exam_db` database
4. Click on `exams` collection
5. Click "Delete" button
6. Confirm deletion
7. Repeat for `examsessions` collection

Using MongoDB Shell:
```javascript
use secure_exam_db
db.exams.deleteMany({})
db.examsessions.deleteMany({})
```
