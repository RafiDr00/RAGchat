@echo off
echo ========================================
echo   RAGchat Backend Startup
echo ========================================
echo.

cd backend

REM Check if venv exists
if not exist "venv" (
    echo [ERROR] Virtual environment not found!
    echo.
    echo Please run setup first:
    echo   cd backend
    echo   python -m venv venv
    echo   venv\Scripts\activate
    echo   pip install -r requirements.txt
    echo.
    pause
    exit /b 1
)

echo [INFO] Activating virtual environment...
call venv\Scripts\activate

echo [INFO] Starting RAGchat backend on http://localhost:8001...
echo [INFO] Press Ctrl+C to stop the server
echo.

python -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload

pause
