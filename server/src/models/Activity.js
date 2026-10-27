// src/models/Activity.js
import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema({
  incident: { type: mongoose.Schema.Types.ObjectId, ref: 'Incident' },
  release: { type: mongoose.Schema.Types.ObjectId, ref: 'Release' },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action: { type: String, required: true },
  details: { type: String },
  previousValue: { type: String },
  newValue: { type: String },
}, { timestamps: { createdAt: true, updatedAt: false } });

export default mongoose.model('Activity', activitySchema);
