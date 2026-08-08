@echo off
echo ========================================
echo   Fixing Git PATH issue...
echo ========================================
echo.

:: Check common Git installation paths
set GIT_PATH=

if exist "C:\Program Files\Git\cmd\git.exe" (
    set GIT_PATH=C:\Program Files\Git\cmd
    goto :found
)

if exist "C:\Program Files (x86)\Git\cmd\git.exe" (
    set GIT_PATH=C:\Program Files (x86)\Git\cmd
    goto :found
)

if exist "%LOCALAPPDATA%\Programs\Git\cmd\git.exe" (
    set GIT_PATH=%LOCALAPPDATA%\Programs\Git\cmd
    goto :found
)

echo [ERROR] Could not find Git installation.
echo Please reinstall Git from https://git-scm.com
pause
exit /b 1

:found
echo [FOUND] Git at: %GIT_PATH%
echo.
echo Adding Git to your permanent PATH...

:: Add to user PATH permanently
setx PATH "%PATH%;%GIT_PATH%"

echo.
echo [SUCCESS] Git added to PATH permanently!
echo.
echo ========================================
echo   Now running git push...
echo ========================================
echo.

cd /d "c:\Users\HP\Downloads\AI Learning Assistant Features"

"%GIT_PATH%\git.exe" add .
echo [1/3] Files staged

"%GIT_PATH%\git.exe" commit -m "feat: migrate entire backend from Supabase to MongoDB"
echo [2/3] Committed

"%GIT_PATH%\git.exe" push
echo [3/3] Pushed!

echo.
echo ========================================
echo   DONE! Vercel is deploying now!
echo ========================================
pause
