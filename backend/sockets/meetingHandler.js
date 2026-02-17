import axios from 'axios';
import DetectionLog from '../models/DetectionLog.js';
import Message from '../models/Message.js';

const activeMeetings = new Map(); // meetingId -> Set of socketIds

export default function meetingHandler(io) {
  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    // Join meeting room
    socket.on('join-meeting', async ({ meetingId, userId, userName }) => {
      socket.join(meetingId);

      // Track active meeting participants
      if (!activeMeetings.has(meetingId)) {
        activeMeetings.set(meetingId, new Set());
      }
      activeMeetings.get(meetingId).add(socket.id);

      // Store user info in socket
      socket.userId = userId;
      socket.userName = userName;
      socket.meetingId = meetingId;

      // Notify others in the room
      socket.to(meetingId).emit('user-joined', {
        socketId: socket.id,
        userId,
        userName
      });

      // Send list of existing participants to the new user
      const participants = Array.from(activeMeetings.get(meetingId))
        .filter(id => id !== socket.id)
        .map(id => {
          const participantSocket = io.sockets.sockets.get(id);
          return {
            socketId: id,
            userId: participantSocket?.userId,
            userName: participantSocket?.userName
          };
        });

      socket.emit('existing-participants', participants);

      console.log(`User ${userName} joined meeting ${meetingId}`);
    });

    // WebRTC signaling - offer
    socket.on('offer', ({ to, offer }) => {
      socket.to(to).emit('offer', {
        from: socket.id,
        offer
      });
    });

    // WebRTC signaling - answer
    socket.on('answer', ({ to, answer }) => {
      socket.to(to).emit('answer', {
        from: socket.id,
        answer
      });
    });

    // WebRTC signaling - ICE candidate
    socket.on('ice-candidate', ({ to, candidate }) => {
      socket.to(to).emit('ice-candidate', {
        from: socket.id,
        candidate
      });
    });

    // Handle deepfake detection request
    socket.on('analyze-frame', async ({ meetingId, userId, frameData }) => {
      try {
        // Send frame to deepfake detection service
        const response = await axios.post(
          `${process.env.DEEPFAKE_SERVICE_URL}/api/detect`,
          { image: frameData },
          { timeout: 5000 }
        );

        const { result, confidence } = response.data;

        // Log detection result
        await DetectionLog.create({
          meetingId,
          userId,
          detectionResult: result,
          confidence,
          timestamp: new Date()
        });

        // If deepfake detected, alert all participants
        if (result === 'fake' && confidence > 0.7) {
          io.to(meetingId).emit('deepfake-detected', {
            userId,
            confidence,
            timestamp: new Date()
          });
        }

        // Send result back to requester
        socket.emit('detection-result', {
          userId,
          result,
          confidence
        });

      } catch (error) {
        console.error('Deepfake detection error:', error.message);
        socket.emit('detection-error', {
          message: 'Failed to analyze frame'
        });
      }
    });

    // Toggle video
    socket.on('toggle-video', ({ meetingId, enabled }) => {
      socket.to(meetingId).emit('user-video-toggle', {
        socketId: socket.id,
        enabled
      });
    });

    // Toggle audio
    socket.on('toggle-audio', ({ meetingId, enabled }) => {
      socket.to(meetingId).emit('user-audio-toggle', {
        socketId: socket.id,
        enabled
      });
    });

    // Leave meeting
    socket.on('leave-meeting', () => {
      handleDisconnect();
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      handleDisconnect();
    });

    // Handle chat messages
    socket.on('send-message', async ({ meetingId, userId, userName, userAvatar, message }) => {
      try {
        // Save message to database
        const savedMessage = await Message.create({
          meetingId,
          userId,
          userName,
          userAvatar: userAvatar || '',
          message,
          timestamp: new Date()
        });

        // Broadcast message to all participants in the meeting
        io.to(meetingId).emit('receive-message', {
          _id: savedMessage._id,
          userId,
          userName,
          userAvatar: userAvatar || '',
          message,
          timestamp: savedMessage.timestamp
        });
      } catch (error) {
        console.error('Error saving chat message:', error);
        socket.emit('message-error', { message: 'Failed to send message' });
      }
    });

    // Get chat history
    socket.on('get-chat-history', async ({ meetingId }) => {
      try {
        const messages = await Message.find({ meetingId })
          .sort({ timestamp: 1 })
          .limit(100);
        
        socket.emit('chat-history', messages);
      } catch (error) {
        console.error('Error fetching chat history:', error);
        socket.emit('chat-history-error', { message: 'Failed to load chat history' });
      }
    });

    // Screen sharing events
    socket.on('start-screen-share', ({ meetingId }) => {
      socket.to(meetingId).emit('user-screen-share-started', {
        socketId: socket.id,
        userId: socket.userId,
        userName: socket.userName
      });
    });

    socket.on('stop-screen-share', ({ meetingId }) => {
      socket.to(meetingId).emit('user-screen-share-stopped', {
        socketId: socket.id,
        userId: socket.userId
      });
    });

    // Participant management events
    socket.on('mute-participant', ({ meetingId, targetSocketId }) => {
      io.to(targetSocketId).emit('force-mute', {
        by: socket.userName
      });
    });

    socket.on('remove-participant', ({ meetingId, targetSocketId }) => {
      const targetSocket = io.sockets.sockets.get(targetSocketId);
      if (targetSocket) {
        io.to(targetSocketId).emit('removed-from-meeting', {
          by: socket.userName
        });
        targetSocket.disconnect(true);
      }
    });

    function handleDisconnect() {
      if (socket.meetingId) {
        const meetingParticipants = activeMeetings.get(socket.meetingId);
        if (meetingParticipants) {
          meetingParticipants.delete(socket.id);
          if (meetingParticipants.size === 0) {
            activeMeetings.delete(socket.meetingId);
          }
        }

        socket.to(socket.meetingId).emit('user-left', {
          socketId: socket.id,
          userId: socket.userId,
          userName: socket.userName
        });

        console.log(`User ${socket.userName} left meeting ${socket.meetingId}`);
      }
      console.log('Client disconnected:', socket.id);
    }
  });
}
