#!/bin/bash

echo "🚀 Запуск Fashion Store..."
echo ""

# Проверка Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не установлен. Установите Node.js: https://nodejs.org/"
    exit 1
fi

# Установка зависимостей frontend
echo "📦 Установка зависимостей frontend..."
npm install

# Установка зависимостей backend
echo "📦 Установка зависимостей backend..."
cd server
npm install

# Создание .env если не существует
if [ ! -f .env ]; then
    echo "⚙️  Создание .env файла..."
    cp .env.example .env
fi

cd ..

echo ""
echo "✅ Готово! Теперь откройте 2 терминала:"
echo ""
echo "📌 Терминал 1 (Backend):"
echo "   cd server && npm start"
echo ""
echo "📌 Терминал 2 (Frontend):"
echo "   npm run dev"
echo ""
echo "🌐 Затем откройте: http://localhost:8080"
echo ""
