// src/controllers/dashboardController.js
import Incident from '../models/Incident.js';
import Release from '../models/Release.js';
import Activity from '../models/Activity.js';
import mongoose from 'mongoose';

export const getDashboardMetrics = async (req, res) => {
  try {
    const [totalIncidents, openIncidents, criticalOpen, resolvedIncidents] = await Promise.all([
      Incident.countDocuments(),
      Incident.countDocuments({ status: 'OPEN' }),
      Incident.countDocuments({ status: 'OPEN', severity: 'CRITICAL' }),
      Incident.countDocuments({ status: 'RESOLVED' })
    ]);

    const incidentsBySeverity = await Incident.aggregate([
      { $group: { _id: '$severity', count: { $sum: 1 } } }
    ]);
    const incidentsByStatus = await Incident.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const recentActivity = await Activity.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('incident', 'title')
      .populate('release', 'title version')
      .populate('actor', 'name email')
      .populate('subject', 'name')
      .lean();

    const activeReleases = await Release.find({ status: { $in: ['PLANNED', 'IN_PROGRESS'] } })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      totalIncidents,
      openIncidents,
      criticalOpen,
      resolvedIncidents,
      incidentsBySeverity,
      incidentsByStatus,
      recentActivity,
      activeReleases,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch dashboard metrics' });
  }
};
