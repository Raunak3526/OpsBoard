// src/controllers/incidentController.js
import Incident from '../models/Incident.js';
import Activity from '../models/Activity.js';
import User from '../models/User.js';

// Helper to create activity log
const logActivity = async (incidentId, actorId, action, details = '', previous = null, newVal = null) => {
  await Activity.create({
    incident: incidentId,
    actor: actorId,
    action,
    details,
    previousValue: previous,
    newValue: newVal,
  });
};

export const getIncidents = async (req, res) => {
  try {
    const { page = 1, limit = 20, severity, status, assignee } = req.query;
    const filter = {};
    if (severity) filter.severity = severity;
    if (status) filter.status = status;
    if (assignee) filter.assignee = assignee;

    const incidents = await Incident.find(filter)
      .populate('assignee', 'name email')
      .populate('createdBy', 'name email')
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 })
      .lean();
    const total = await Incident.countDocuments(filter);
    res.json({ total, page: Number(page), limit: Number(limit), incidents });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch incidents' });
  }
};

export const getIncidentById = async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id)
      .populate('assignee', 'name email')
      .populate('createdBy', 'name email')
      .lean();
    if (!incident) return res.status(404).json({ error: 'Incident not found' });
    res.json({ incident });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch incident' });
  }
};

export const createIncident = async (req, res) => {
  try {
    const { title, description, severity, assignee } = req.body;
    if (assignee && !await User.findOne({ _id: assignee, active: true })) {
      return res.status(400).json({ error: 'Assignee must be an active user' });
    }
    const incident = await Incident.create({
      title,
      description,
      severity,
      assignee,
      createdBy: req.user._id,
    });
    await logActivity(incident._id, req.user._id, 'CREATE', 'Incident created');
    res.status(201).json({ incident });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create incident' });
  }
};

export const updateIncident = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const incident = await Incident.findById(id);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });

    if (updates.status && updates.status !== incident.status && incident.status === 'RESOLVED') {
      return res.status(400).json({ error: 'Use the reopen action to change a resolved incident' });
    }
    if (updates.status === 'RESOLVED' && !updates.resolutionNote?.trim()) {
      return res.status(400).json({ error: 'Resolution note required when resolving' });
    }
    if (updates.assignee && !await User.findOne({ _id: updates.assignee, active: true })) {
      return res.status(400).json({ error: 'Assignee must be an active user' });
    }

    // Record activity for each changed field
    const allowed = ['title', 'description', 'severity', 'status', 'assignee', 'resolutionNote'];
    for (const key of allowed) {
      if (key in updates && incident[key] !== updates[key]) {
        const nextValue = key === 'assignee' && updates[key] === null ? undefined : updates[key];
        await logActivity(
          incident._id,
          req.user._id,
          'UPDATE',
          `${key} changed`,
          incident[key],
          nextValue
        );
        incident[key] = nextValue;
      }
    }

    if (updates.status === 'RESOLVED') {
      incident.resolvedAt = new Date();
    }
    await incident.save();
    res.json({ incident });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update incident' });
  }
};

export const reopenIncident = async (req, res) => {
  try {
    const { id } = req.params;
    const incident = await Incident.findById(id);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });
    if (incident.status !== 'RESOLVED') {
      return res.status(400).json({ error: 'Only resolved incidents can be reopened' });
    }
    incident.status = 'OPEN';
    incident.resolutionNote = undefined;
    incident.resolvedAt = undefined;
    await incident.save();
    await logActivity(incident._id, req.user._id, 'REOPEN', 'Incident reopened');
    res.json({ incident });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reopen incident' });
  }
};

export const getIncidentActivity = async (req, res) => {
  try {
    const activities = await Activity.find({ incident: req.params.id })
      .populate('actor', 'name email')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ activities });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
};
