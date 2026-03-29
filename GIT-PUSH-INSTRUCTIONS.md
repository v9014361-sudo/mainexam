# Git Push Instructions

## Current Situation
Your push to `main` was rejected because the remote has changes you don't have locally.

## Solution: Push to "vijay" Branch

Run these commands in order:

### Step 1: Navigate to Project Root
```bash
cd C:\Users\ASUS\Downloads\secure-exam-platform
```

### Step 2: Create and Switch to "vijay" Branch
```bash
git checkout -b vijay
```

### Step 3: Push to Remote "vijay" Branch
```bash
git push origin vijay
```

### Step 4: Set Upstream (Optional - for future pushes)
```bash
git push --set-upstream origin vijay
```

## Alternative: Force Push to Main (⚠️ Use with Caution)

If you want to overwrite the remote main branch (this will delete remote changes):

```bash
git checkout main
git push origin main --force
```

**Warning:** Only use `--force` if you're sure you want to overwrite remote changes!

## Alternative: Pull and Merge First

If you want to keep both local and remote changes:

```bash
# Switch to main branch
git checkout main

# Pull remote changes
git pull origin main --no-rebase

# Resolve any conflicts if they appear
# Then commit the merge
git commit -m "Merge remote changes"

# Push to main
git push origin main
```

## Recommended Approach: Push to "vijay" Branch

The safest approach is to push to a new branch:

```bash
# Make sure you're in the project root
cd C:\Users\ASUS\Downloads\secure-exam-platform

# Create and switch to vijay branch
git checkout -b vijay

# Push to remote vijay branch
git push origin vijay
```

Then you can create a Pull Request on GitHub to merge "vijay" into "main".

## Quick Copy-Paste Commands

**For pushing to vijay branch:**
```bash
cd C:\Users\ASUS\Downloads\secure-exam-platform
git checkout -b vijay
git push origin vijay
```

**Check current branch:**
```bash
git branch
```

**Check remote branches:**
```bash
git branch -r
```

**View commit history:**
```bash
git log --oneline -5
```

## After Successful Push

Once pushed, you can:
1. Go to GitHub: https://github.com/v9014361-sudo/mainexam
2. You'll see a prompt to create a Pull Request from "vijay" to "main"
3. Review the changes
4. Merge the Pull Request

## Troubleshooting

**If you get authentication errors:**
```bash
# Use personal access token instead of password
# Generate token at: https://github.com/settings/tokens
```

**If branch already exists remotely:**
```bash
# Delete remote branch first
git push origin --delete vijay

# Then push again
git push origin vijay
```

**If you want to rename your current branch:**
```bash
# Rename current branch to vijay
git branch -m vijay

# Push to remote
git push origin vijay
```
