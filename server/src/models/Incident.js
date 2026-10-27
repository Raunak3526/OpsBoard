import mongoose from 'mongoose';

const incidentSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  severity: {
    type: String,
    enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
    default: 'LOW'
  },
  status: {
    type: String,
    enum: ['OPEN', 'INVESTIGATING', 'RESOLVED'],
    default: 'OPEN'
  },
  assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  resolutionNote: { type: String },
  resolvedAt: { type: Date },
}, { timestamps: true });

export default mongoose.model('Incident', incidentSchema);
