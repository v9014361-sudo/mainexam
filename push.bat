@echo off
echo ==============================================
echo Pushing Exam Portal to GitHub
echo ==============================================
echo Clearing old kavyatanigadapa GitHub credentials to fix 403 error...
cmdkey /delete:LegacyGeneric:target=git:https://github.com >nul 2>&1
echo.
echo ==============================================
echo Please log in to GitHub as "v9014361-sudo" when prompted!
echo ==============================================
echo.
echo ==============================================
echo Updating local repository from GitHub...
echo ==============================================
git pull --rebase origin main
echo.
git push -u origin main
echo.
pause
