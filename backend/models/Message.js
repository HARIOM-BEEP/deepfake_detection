import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  meetingId: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  userAvatar: {
    type: String,
    default: ''
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient querying
messageSchema.index({ meetingId: 1, timestamp: 1 });

const Message = mongoose.model('Message', messageSchema);

export default Message;
