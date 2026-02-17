import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import Meeting from '../models/Meeting.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @route   POST /api/meetings
// @desc    Create a new meeting
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { title } = req.body;
    const meetingId = uuidv4();

    const meeting = await Meeting.create({
      meetingId,
      title,
      host: req.user._id,
      participants: [{
        user: req.user._id,
        joinedAt: new Date()
      }]
    });

    res.status(201).json(meeting);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/meetings/:meetingId
// @desc    Get meeting details
// @access  Private
router.get('/:meetingId', protect, async (req, res) => {
  try {
    const meeting = await Meeting.findOne({ meetingId: req.params.meetingId })
      .populate('host', 'name email')
      .populate('participants.user', 'name email');

    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    res.json(meeting);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/meetings
// @desc    Get all active meetings for user
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const meetings = await Meeting.find({
      $or: [
        { host: req.user._id },
        { 'participants.user': req.user._id }
      ],
      status: 'active'
    })
      .populate('host', 'name email')
      .sort({ createdAt: -1 });

    res.json(meetings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/meetings/:meetingId/end
// @desc    End a meeting
// @access  Private
router.put('/:meetingId/end', protect, async (req, res) => {
  try {
    const meeting = await Meeting.findOne({ meetingId: req.params.meetingId });

    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    if (meeting.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only host can end the meeting' });
    }

    meeting.status = 'ended';
    meeting.endedAt = new Date();
    await meeting.save();

    res.json(meeting);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
