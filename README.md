# SecureCall - Video Conferencing with Deepfake Detection

A full-stack MERN application for secure video conferencing with real-time AI-powered deepfake detection, similar to Zoom or Google Meet.

## 🚀 Features

- **Real-time Video Conferencing**: WebRTC-based peer-to-peer video calls
- **AI Deepfake Detection**: Real-time analysis of video streams to detect potential deepfakes
- **Secure Authentication**: JWT-based user authentication
- **Meeting Management**: Create and join meetings with unique IDs
- **Modern UI**: Beautiful, responsive interface with dark mode
- **Real-time Alerts**: Instant notifications when deepfakes are detected

## 🏗️ Architecture

### Tech Stack

- **Frontend**: React 18, Vite, Socket.io-client, Simple-peer (WebRTC)
- **Backend**: Node.js, Express, Socket.io, MongoDB
- **Deepfake Detection**: Python Flask microservice with OpenCV
- **Database**: MongoDB

### Project Structure

```
EDI_DEEPFAKE/
├── backend/              # Node.js Express server
│   ├── config/          # Database configuration
│   ├── models/          # MongoDB models
│   ├── routes/          # API routes
│   ├── middleware/      # Authentication middleware
│   ├── sockets/         # Socket.io event handlers
│   └── server.js        # Main server file
├── frontend/            # React application
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/       # Page components
│   │   ├── services/    # API and Socket services
│   │   └── utils/       # Utility functions
│   └── index.html
└── deepfake-service/    # Python Flask microservice
    ├── app.py           # Flask application
    ├── detector.py      # Deepfake detection logic
    └── utils.py         # Image preprocessing
```

## 📋 Prerequisites

- **Node.js** (v18 or higher)
- **MongoDB** (v6 or higher)
- **Python** (v3.9 or higher)
- **npm** or **yarn**

## 🛠️ Installation

### 1. Clone the Repository

```bash
cd "C:\Users\PRASHANT\OneDrive\Creative Cloud Files\Desktop\EDI_DEEPFAKE"
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create `.env` file:
```bash
copy .env.example .env
```

Edit `.env` and configure:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/deepfake-detection
JWT_SECRET=your_secure_jwt_secret_here
DEEPFAKE_SERVICE_URL=http://localhost:5001
NODE_ENV=development
```

### 3. Frontend Setup

```bash
cd ..\frontend
npm install
```

Create `.env` file:
```bash
copy .env.example .env
```

The default configuration should work:
```env
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
```

### 4. Deepfake Service Setup

```bash
cd ..\deepfake-service
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

Create `.env` file:
```bash
copy .env.example .env
```

## 🚀 Running the Application

You need to run three services simultaneously:

### Terminal 1: MongoDB

```bash
mongod
```

### Terminal 2: Backend Server

```bash
cd backend
npm run dev
```

Server runs on: `http://localhost:5000`

### Terminal 3: Frontend

```bash
cd frontend
npm run dev
```

Frontend runs on: `http://localhost:5173`

### Terminal 4: Deepfake Detection Service

```bash
cd deepfake-service
venv\Scripts\activate
python app.py
```

Service runs on: `http://localhost:5001`

## 📖 Usage

1. **Register/Login**: Create an account or login at `http://localhost:5173`

2. **Create Meeting**: 
   - Click "Create Meeting" on the dashboard
   - Optionally add a meeting title
   - You'll be redirected to the meeting room

3. **Join Meeting**:
   - Enter the meeting ID shared by the host
   - Click "Join Meeting"

4. **In Meeting**:
   - Your video will appear in the grid
   - Other participants will join automatically
   - Use controls to mute/unmute audio and video
   - Deepfake alerts will appear if suspicious activity is detected

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: Bcrypt password encryption
- **CORS Protection**: Configured CORS policies
- **Real-time Monitoring**: Continuous deepfake detection

## ⚠️ Important Notes

### Deepfake Detection

The current implementation includes a **placeholder** deepfake detection model for demonstration purposes. For production use, you should integrate a real deepfake detection model such as:

- **MesoNet** or **MesoInception4**
- **Xception-based models**
- **EfficientNet-based models**
- Pre-trained models from **FaceForensics++**
- Commercial APIs like **Sensity AI** or **Microsoft Video Authenticator**

To integrate a real model:

1. Train or download a pre-trained model
2. Update `deepfake-service/detector.py`
3. Load the model in the `load_model()` method
4. Update the `detect()` method to use actual model predictions

### Performance Considerations

- Frame analysis runs every 10 seconds by default (configurable in `MeetingRoom.jsx`)
- Real-time deepfake detection is computationally intensive
- For production, consider:
  - GPU acceleration
  - Optimized model inference
  - Load balancing for multiple concurrent meetings
  - CDN for static assets

## 🧪 Testing

### Test User Flow

1. Open two browser windows (or use incognito mode)
2. Register two different users
3. Create a meeting with User 1
4. Copy the meeting ID
5. Join the meeting with User 2
6. Verify video streams appear for both users

### Test Deepfake Detection

The placeholder implementation will randomly flag frames. To test with a real model:

1. Integrate a trained deepfake detection model
2. Use test videos with known deepfakes
3. Verify alerts appear when deepfakes are detected

## 🐛 Troubleshooting

### Camera/Microphone Not Working

- Check browser permissions
- Ensure HTTPS or localhost (WebRTC requirement)
- Try different browsers (Chrome/Edge recommended)

### Connection Issues

- Verify all services are running
- Check MongoDB is accessible
- Ensure ports 5000, 5001, 5173 are not blocked

### WebRTC Connection Fails

- Check firewall settings
- Verify STUN servers are accessible
- For production, configure TURN servers

## 📝 API Documentation

### Authentication Endpoints

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Meeting Endpoints

- `POST /api/meetings` - Create new meeting
- `GET /api/meetings/:meetingId` - Get meeting details
- `GET /api/meetings` - Get user's meetings
- `PUT /api/meetings/:meetingId/end` - End meeting

### Deepfake Detection Endpoints

- `POST /api/detect` - Analyze single image
- `POST /api/batch-detect` - Analyze multiple images

## 🤝 Contributing

This is a demonstration project. For production use:

1. Integrate a real deepfake detection model
2. Add comprehensive error handling
3. Implement rate limiting
4. Add automated tests
5. Configure production deployment

## 📄 License

MIT License - feel free to use this project for learning and development.

## 🙏 Acknowledgments

- WebRTC implementation using Simple-peer
- Socket.io for real-time communication
- OpenCV for image processing
- React and Vite for modern frontend development

---

**Note**: This is a demonstration project. The deepfake detection component uses placeholder logic and should be replaced with a production-ready model before deployment.
