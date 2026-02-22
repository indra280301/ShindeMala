#!/bin/bash

# Configuration
DB_USER="root"
DB_PASS="admin123"

echo "🔥 Booting Shinde Mala ERP System..."

# 1. Initialize Database
echo "📦 Initializing MySQL Database Schema..."
if [ -z "$DB_PASS" ]; then
    mysql -u $DB_USER < backend/schema.sql
else
    mysql -u $DB_USER -p"$DB_PASS" < backend/schema.sql
fi

if [ $? -ne 0 ]; then
    echo "❌ Database initialization failed. Please check your MySQL credentials in this script."
    exit 1
fi

echo "✅ Database Initialized."

# 2. Start Backend in background
echo "🚀 Starting Node.js Enterprise Backend..."
cd backend
npm install
node index.js &
BACKEND_PID=$!
cd ..

# 3. Start Frontend in background
echo "🎨 Starting React Frontend (Vite)..."
cd frontend
npm install
npm run dev &
FRONTEND_PID=$!
cd ..

echo "========================================================"
echo "🌟 SHINDE MALA ERP IS LIVE!"
echo "👉 Frontend (Dashboard & POS): http://localhost:5173"
echo "👉 Backend API: http://localhost:5001"
echo "========================================================"
echo "To stop the servers, press Ctrl+C"

# Wait for Ctrl+C to stop both processes
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait
