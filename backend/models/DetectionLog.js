import mongoose from 'mongoose';

const detectionLogSchema = new mongoose.Schema({
  meetingId: {
    type: String,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  detectionResult: {
    type: String,
    enum: ['real', 'fake', 'uncertain'],
    required: true
  },
  confidence: {
    type: Number,
    required: true,
    min: 0,
    max: 1
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
});

const DetectionLog = mongoose.model('DetectionLog', detectionLogSchema);

export default DetectionLog;
