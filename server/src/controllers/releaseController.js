// src/controllers/releaseController.js
import Release from '../models/Release.js';
import Activity from '../models/Activity.js';

// Helper to log activity for releases (reuse Activity model)
const logReleaseActivity = async (releaseId, actorId, action, details = '') => {
  await Activity.create({
    release: releaseId,
    actor: actorId,
    action,
    details,
  });
};

export const getReleases = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const filter = {};
    if (status) filter.status = status;
    const releases = await Release.find(filter)
      .populate('createdBy', 'name email')
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 })
      .lean();
    const total = await Release.countDocuments(filter);
    res.json({ total, page: Number(page), limit: Number(limit), releases });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch releases' });
  }
};

export const getReleaseById = async (req, res) => {
  try {
    const release = await Release.findById(req.params.id).populate('createdBy', 'name email').lean();
    if (!release) return res.status(404).json({ error: 'Release not found' });
    res.json({ release });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch release' });
  }
};

export const createRelease = async (req, res) => {
  try {
    const { title, version, description, notes, checklist } = req.body;
    const existing = await Release.findOne({ version });
    if (existing) return res.status(409).json({ error: 'Release version already exists' });
    const release = await Release.create({
      title,
      version,
      description,
      notes,
      checklist,
      createdBy: req.user._id,
    });
    await logReleaseActivity(release._id, req.user._id, 'CREATE', 'Release created');
    res.status(201).json({ release });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create release' });
  }
};

export const updateRelease = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const release = await Release.findById(id);
    if (!release) return res.status(404).json({ error: 'Release not found' });

    // Prevent duplicate version on update
    if (updates.version && updates.version !== release.version) {
      const dup = await Release.findOne({ version: updates.version });
      if (dup) return res.status(409).json({ error: 'Release version already exists' });
    }

    const currentStatus = release.status;
    const validTransitions = {
      PLANNED: ['IN_PROGRESS', 'CANCELLED'],
      IN_PROGRESS: ['RELEASED', 'CANCELLED'],
      RELEASED: [],
      CANCELLED: [],
    };
    if (updates.status && !validTransitions[currentStatus].includes(updates.status)) {
      return res.status(400).json({ error: `Invalid status transition from ${currentStatus} to ${updates.status}` });
    }

    if (updates.status === 'RELEASED') {
      const checklist = updates.checklist || release.checklist;
      const incomplete = checklist?.some(item => !item.completed);
      if (incomplete) return res.status(400).json({ error: 'All checklist items must be completed before releasing' });
      release.releasedAt = new Date();
    }

    const allowed = ['title', 'description', 'notes', 'status', 'checklist'];
    for (const key of allowed) {
      if (key in updates) release[key] = updates[key];
    }

    await release.save();
    await logReleaseActivity(release._id, req.user._id, 'UPDATE', `Release updated: ${JSON.stringify(updates)}`);
    res.json({ release });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update release' });
  }
};

export const updateChecklistItem = async (req, res) => {
  try {
    const { id, itemId } = req.params;
    const { completed } = req.body;
    const release = await Release.findById(id);
    if (!release) return res.status(404).json({ error: 'Release not found' });
    const checklistItem = release.checklist.id(itemId);
    if (!checklistItem) return res.status(404).json({ error: 'Checklist item not found' });
    checklistItem.completed = completed;
    await release.save();
    await logReleaseActivity(release._id, req.user._id, 'CHECKLIST_UPDATE', `Item ${itemId} set to ${completed}`);
    res.json({ release });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update checklist item' });
  }
};
