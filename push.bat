@echo off
echo.
echo ========================================
echo   Pushing to GitHub...
echo ========================================
echo.

cd /d "c:\Users\HP\Downloads\AI Learning Assistant Features"

git add .
echo [1/3] Files staged ✓

git commit -m "feat: migrate entire backend from Supabase to MongoDB"
echo [2/3] Committed ✓

git push
echo [3/3] Pushed to GitHub ✓

echo.
echo ========================================
echo   DONE! Vercel will auto-deploy now.
echo ========================================
echo.
pause
