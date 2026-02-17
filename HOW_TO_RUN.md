# How to Run SecureCall - Step by Step Guide

This guide provides detailed instructions for running the video conferencing platform with deepfake detection.

## Prerequisites Check

Before starting, ensure you have installed:

- ✅ **Node.js** (version 18 or higher) - [Download here](https://nodejs.org/)
- ✅ **MongoDB** (version 6 or higher) - [Download here](https://www.mongodb.com/try/download/community)
- ✅ **Python** (version 3.9 or higher) - [Download here](https://www.python.org/downloads/)
- ✅ **Git** (optional, for version control)

### Verify Installations

Open Command Prompt and run:

```bash
node --version
npm --version
mongod --version
python --version
```

---

## Step 1: Navigate to Project Directory

Open Command Prompt and navigate to the project folder:

```bash
cd "C:\Users\PRASHANT\OneDrive\Creative Cloud Files\Desktop\EDI_DEEPFAKE"
```

---

## Step 2: Setup Backend

### 2.1 Install Backend Dependencies

```bash
cd backend
npm install
```

Wait for all packages to install (this may take 2-3 minutes).

### 2.2 Configure Backend Environment

Create the environment file:

```bash
copy .env.example .env
```

Open `backend\.env` in a text editor and configure:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/deepfake-detection
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
DEEPFAKE_SERVICE_URL=http://localhost:5001
NODE_ENV=development
```

> **Important:** Change `JWT_SECRET` to a random secure string for production use.

---

## Step 3: Setup Frontend

### 3.1 Install Frontend Dependencies

```bash
cd ..\frontend
npm install
```

Wait for all packages to install (this may take 2-3 minutes).

### 3.2 Configure Frontend Environment

Create the environment file:

```bash
copy .env.example .env
```

The default configuration should work:

```env
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
```

---

## Step 4: Setup Deepfake Detection Service

### 4.1 Create Python Virtual Environment

```bash
cd ..\deepfake-service
python -m venv venv
```

### 4.2 Activate Virtual Environment

```bash
venv\Scripts\activate
```

You should see `(venv)` in your command prompt.

### 4.3 Install Python Dependencies

```bash
pip install -r requirements.txt
```

Wait for all packages to install (this may take 3-5 minutes).

### 4.4 Configure Service Environment

```bash
copy .env.example .env
```

The default configuration should work:

```env
PORT=5001
FLASK_ENV=development
```

---

## Step 5: Start All Services

You need **4 separate Command Prompt windows** to run all services.

### Terminal 1: Start MongoDB

Open a new Command Prompt window:

```bash
mongod
```

**Expected output:**
```
[initandlisten] waiting for connections on port 27017
```

Leave this window running.

### Terminal 2: Start Backend Server

Open a new Command Prompt window:

```bash
cd "C:\Users\PRASHANT\OneDrive\Creative Cloud Files\Desktop\EDI_DEEPFAKE\backend"
npm run dev
```

**Expected output:**
```
Server running on port 5000
MongoDB Connected: localhost
```

Leave this window running.

### Terminal 3: Start Frontend

Open a new Command Prompt window:

```bash
cd "C:\Users\PRASHANT\OneDrive\Creative Cloud Files\Desktop\EDI_DEEPFAKE\frontend"
npm run dev
```

**Expected output:**
```
VITE v5.0.8  ready in 500 ms

➜  Local:   http://localhost:5173/
```

Leave this window running.

### Terminal 4: Start Deepfake Detection Service

Open a new Command Prompt window:

```bash
cd "C:\Users\PRASHANT\OneDrive\Creative Cloud Files\Desktop\EDI_DEEPFAKE\deepfake-service"
venv\Scripts\activate
python app.py
```

**Expected output:**
```
Starting deepfake detection service on port 5001
Running on http://0.0.0.0:5001
```

Leave this window running.

---

## Step 6: Access the Application

1. Open your web browser (Chrome or Edge recommended)
2. Navigate to: **http://localhost:5173**
3. You should see the SecureCall login page

---

## Step 7: Create Your First Account

1. Click **"Sign up"** link
2. Fill in the registration form:
   - **Name:** Your name
   - **Email:** your.email@example.com
   - **Password:** At least 6 characters
   - **Confirm Password:** Same as password
3. Click **"Sign Up"** button
4. You'll be automatically logged in and redirected to the dashboard

---

## Step 8: Start Your First Meeting

### Option A: Create a New Meeting

1. On the dashboard, enter a meeting title (optional)
2. Click **"Create Meeting"** button
3. Allow camera and microphone access when prompted
4. You'll enter the meeting room with your video

### Option B: Join an Existing Meeting

1. Get the meeting ID from someone who created a meeting
2. Enter the meeting ID in the "Join Meeting" field
3. Click **"Join Meeting"** button
4. Allow camera and microphone access when prompted

---

## Step 9: Test Multi-User Meeting

To test with multiple participants:

1. **Keep your first browser window open** (User 1 in meeting)
2. **Open a new incognito/private window** (Ctrl + Shift + N in Chrome)
3. Navigate to: http://localhost:5173
4. **Register a second user** with different email
5. **Copy the meeting ID** from User 1's meeting room
6. **Join the meeting** as User 2
7. You should now see both video streams!

---

## Step 10: Using Meeting Controls

### Mute/Unmute Audio
- Click the **microphone icon** at the bottom
- Red = muted, Gray = unmuted

### Turn Video On/Off
- Click the **camera icon** at the bottom
- Red = camera off, Gray = camera on

### Leave Meeting
- Click the **power icon** (red button)
- You'll return to the dashboard

---

## Troubleshooting

### Problem: "Cannot connect to MongoDB"

**Solution:**
- Ensure MongoDB is running (Terminal 1)
- Check if port 27017 is available
- Try restarting MongoDB

### Problem: "Camera/Microphone not working"

**Solution:**
- Check browser permissions (click lock icon in address bar)
- Ensure no other app is using camera/microphone
- Try a different browser (Chrome recommended)

### Problem: "Cannot see other participant's video"

**Solution:**
- Check if both users are in the same meeting ID
- Verify backend server is running (Terminal 2)
- Check browser console for errors (F12)
- Ensure firewall isn't blocking connections

### Problem: "Port already in use"

**Solution:**
- Check if another service is using the port
- Kill the process using the port:
  ```bash
  netstat -ano | findstr :5000
  taskkill /PID <process_id> /F
  ```

### Problem: Python packages won't install

**Solution:**
- Ensure Python is added to PATH
- Try upgrading pip: `python -m pip install --upgrade pip`
- Install Visual C++ Build Tools if needed

---

## Stopping the Application

To stop all services:

1. Go to each Command Prompt window
2. Press **Ctrl + C**
3. Type **Y** when asked to terminate
4. Close the windows

---

## Quick Start Script (Optional)

Create a file `start-all.bat` in the project root:

```batch
@echo off
echo Starting SecureCall Platform...
echo.

echo Starting MongoDB...
start cmd /k "mongod"
timeout /t 3

echo Starting Backend Server...
start cmd /k "cd backend && npm run dev"
timeout /t 3

echo Starting Frontend...
start cmd /k "cd frontend && npm run dev"
timeout /t 3

echo Starting Deepfake Service...
start cmd /k "cd deepfake-service && venv\Scripts\activate && python app.py"

echo.
echo All services started!
echo Open http://localhost:5173 in your browser
pause
```

Double-click `start-all.bat` to start all services at once!

---

## Next Steps

- ✅ Explore the dashboard features
- ✅ Create multiple meetings
- ✅ Test with friends or colleagues
- ✅ Review the code to understand the implementation
- ✅ Integrate a real deepfake detection model for production use

---

## Need Help?

- Check the [README.md](file:///c:/Users/PRASHANT/OneDrive/Creative%20Cloud%20Files/Desktop/EDI_DEEPFAKE/README.md) for detailed documentation
- Review the [walkthrough.md](file:///C:/Users/PRASHANT/.gemini/antigravity/brain/d264fcff-96c5-4b50-bacc-08b224bb6c70/walkthrough.md) for technical details
- Check browser console (F12) for error messages
- Verify all services are running without errors

---

**Enjoy your secure video conferencing platform! 🎉**
