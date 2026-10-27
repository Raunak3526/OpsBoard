// src/models/Release.js
import mongoose from 'mongoose';

const releaseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  version: { type: String, required: true, unique: true },
  description: { type: String },
  notes: { type: String },
  status: {
    type: String,
    enum: ['PLANNED', 'IN_PROGRESS', 'RELEASED', 'CANCELLED'],
    default: 'PLANNED'
  },
  checklist: [{
    _id: false,
    item: { type: String, required: true },
    completed: { type: Boolean, default: false }
  }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  releasedAt: { type: Date }
}, { timestamps: true });

export default mongoose.model('Release', releaseSchema);
