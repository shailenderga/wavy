# Real-Time Chat App (React + MySQL + Tailwind CSS)

A full-stack, real-time chat application built with **React**, **Tailwind CSS**, **Node.js/Express**, **Socket.IO**, and **MySQL**.

---

## 🌟 Features

- **Modern & Responsive UI**: Styled with Tailwind CSS and Lucide React icons, featuring sleek dark mode.
- **Real-Time Communication**: Bi-directional communication powered by Socket.IO for instant messaging.
- **MySQL Database Persistence**: All messages, channels, users, and room memberships are permanently saved in MySQL.
- **Group Channels**: Default channels (`#general`, `#tech-talk`, `#random`) plus the ability to create new custom channels.
- **1-on-1 Direct Messaging**: Private conversations with other registered users with real-time online/offline presence indicators.
- **Typing Indicators**: Real-time feedback when another user is typing.
- **Authentication**: JWT-based user registration and login, with one-click demo presets (`Rahul`, `Priya`, `Amit`).
- **Auto-Initialization**: Automatic creation of the `chatapp_db` database and tables on server startup.

---

## 📁 Project Structure

```
react-mysql-chat-app/
├── server/                    # Node.js + Express + Socket.IO + MySQL
│   ├── src/
│   │   ├── config/db.js       # MySQL connection pool & auto-schema migration
│   │   ├── controllers/       # Auth, Room, and Message controllers
│   │   ├── middleware/        # JWT authentication middleware
│   │   ├── routes/            # REST API endpoints
│   │   ├── sockets/           # Socket.IO event handlers
│   │   └── server.js          # Express server entry point
│   ├── .env                   # Database and server environment variables
│   ├── schema.sql             # SQL table definitions
│   └── package.json
│
├── client/                    # React (Vite) + Tailwind CSS + Socket.io-client
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.jsx    # Channels, direct messages, and user profile
│   │   │   ├── ChatArea.jsx   # Active room messages and input form
│   │   │   ├── MessageBubble.jsx # Sent vs received styled bubbles
│   │   │   └── AuthModal.jsx  # Login/Register modal with demo presets
│   │   ├── context/
│   │   │   ├── AuthContext.jsx
│   │   │   └── SocketContext.jsx
│   │   ├── services/api.js    # Axios API client
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── tailwind.config.js
│   └── package.json
│
├── start-app.bat              # One-click launcher for Windows
└── package.json
```

---

## 🚀 Getting Started

### 1. Configure MySQL Credentials

Open [`server/.env`](file:///C:/Users/KeyPrime/.gemini/antigravity/scratch/react-mysql-chat-app/server/.env) and set your MySQL `root` password:

```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=YOUR_MYSQL_PASSWORD_HERE
DB_NAME=chatapp_db
DB_PORT=3306
JWT_SECRET=super_secret_jwt_key_chatapp_2026
CLIENT_URL=http://localhost:5173
```

> **Note**: If you want to test your password first, run:
> ```bash
> cd server
> node test-db.js
> ```

### 2. Start the Application

You can start both server and client using the one-click script:
- Double click [`start-app.bat`](file:///C:/Users/KeyPrime/.gemini/antigravity/scratch/react-mysql-chat-app/start-app.bat)

OR start them manually in two separate terminal windows:

#### Terminal 1 (Backend Server):
```bash
cd server
npm start
```
*Server will start on `http://localhost:5000` and automatically create the `chatapp_db` database and tables.*

#### Terminal 2 (Frontend Client):
```bash
cd client
npm run dev
```
*Frontend will be available at `http://localhost:5173`.*

---

## 💬 How to Test Real-Time Chat

1. Open `http://localhost:5173` in your browser.
2. Click **Rahul** under "Quick Demo Presets" and click **Sign Up** (or enter any username/password).
3. Open an **Incognito / Private window** (or another browser) and go to `http://localhost:5173`.
4. Click **Priya** under "Quick Demo Presets" and sign up.
5. You will now see both users online in the sidebar!
6. Chat in `#general` or click on each other's name under **Direct Messages** to chat privately in real-time.
