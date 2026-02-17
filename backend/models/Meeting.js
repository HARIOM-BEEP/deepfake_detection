import mongoose from 'mongoose';

const meetingSchema = new mongoose.Schema({
  meetingId: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true
  },
  host: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    leftAt: Date
  }],
  status: {
    type: String,
    enum: ['active', 'ended'],
    default: 'active'
  },
  chatEnabled: {
    type: Boolean,
    default: true
  },
  isRecording: {
    type: Boolean,
    default: false
  },
  recordingUrl: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  endedAt: Date
});

const Meeting = mongoose.model('Meeting', meetingSchema);

export default Meeting;
