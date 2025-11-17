@echo off
echo 🚀 Запуск Fashion Store...
echo.

REM Установка зависимостей frontend
echo 📦 Установка зависимостей frontend...
call npm install

REM Установка зависимостей backend
echo 📦 Установка зависимостей backend...
cd server
call npm install

REM Создание .env если не существует
if not exist .env (
    echo ⚙️  Создание .env файла...
    copy .env.example .env
)

cd ..

echo.
echo ✅ Готово! Теперь откройте 2 терминала:
echo.
echo 📌 Терминал 1 (Backend):
echo    cd server ^&^& npm start
echo.
echo 📌 Терминал 2 (Frontend):
echo    npm run dev
echo.
echo 🌐 Затем откройте: http://localhost:8080
echo.
pause
