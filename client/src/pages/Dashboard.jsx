import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Boxes,
  CheckCircle2,
  ClipboardList,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ErrorState, LoadingState, PageHeader, StatusBadge } from '../components/ui.jsx';

const severityColors = { CRITICAL: '#cf4e5a', HIGH: '#e4a044', MEDIUM: '#7d80d8', LOW: '#69a68e' };
const formatDate = (date) => date ? new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—';
const relativeTime = (date) => {
  if (!date) return 'Date unavailable';
  const minutes = Math.max(1, Math.floor((Date.now() - new Date(date).getTime()) / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  return `${Math.floor(minutes / 1440)}d ago`;
};

export default function Dashboard() {
  const [metrics, setMetrics] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const [metricsResponse, incidentsResponse] = await Promise.all([
        axios.get('/api/dashboard'),
        axios.get('/api/incidents', { params: { page: 1, limit: 5 } }),
      ]);
      setMetrics(metricsResponse.data);
      setIncidents(incidentsResponse.data.incidents);
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Could not load workspace data. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDashboard(); }, []);

  if (loading) return <><PageHeader eyebrow="ENGINEERING WORKSPACE" title="Overview" description="A real-time view of your incident and release activity." /><LoadingState label="Loading workspace data" /></>;
  if (error) return <><PageHeader eyebrow="ENGINEERING WORKSPACE" title="Overview" description="A real-time view of your incident and release activity." /><ErrorState message={error} onRetry={loadDashboard} /></>;

  const severityData = (metrics.incidentsBySeverity || []).filter((item) => item.count > 0);
  const totalSeverityCount = severityData.reduce((sum, item) => sum + item.count, 0);
  const activity = metrics.recentActivity || [];
  const stats = [
    { title: 'Total incidents', value: metrics.totalIncidents, caption: 'Across all statuses', icon: ClipboardList },
    { title: 'Open incidents', value: metrics.openIncidents, caption: 'Need attention', icon: AlertTriangle, tone: 'danger' },
    { title: 'Critical open', value: metrics.criticalOpen, caption: 'Highest severity', icon: Activity, tone: 'warning' },
    { title: 'Active releases', value: (metrics.activeReleases || []).length, caption: 'Planned or in progress', icon: Boxes },
  ];

  return (
    <>
      <PageHeader
        eyebrow="ENGINEERING WORKSPACE"
        title="Overview"
        description="A real-time view of your incident and release activity."
        action={<Link to="/incidents" className="button button--secondary">View incidents <ArrowRight size={15} /></Link>}
      />

      <section className="metric-grid" aria-label="Workspace metrics">
        {stats.map(({ title, value, caption, icon: Icon, tone }) => (
          <article className="metric-card" key={title}>
            <div className="metric-card-head"><span>{title}</span><span className={`metric-icon${tone ? ` metric-icon--${tone}` : ''}`}><Icon size={16} /></span></div>
            <div className="metric-value">{value ?? '—'}</div>
            <div className="metric-caption">{caption}</div>
          </article>
        ))}
      </section>

      <section className="dashboard-grid">
        <div className="content-card">
          <div className="card-heading"><div><h2>Incident volume by severity</h2><p>Current incident distribution</p></div><span className="badge badge--neutral">{totalSeverityCount} total</span></div>
          {severityData.length ? (
            <>
              <div className="chart-area">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={severityData.map(({ _id, count }) => ({ name: _id, count }))} margin={{ top: 14, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="#f0f1f5" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#85899a', fontSize: 10 }} />
                    <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#a0a2af', fontSize: 10 }} />
                    <Tooltip cursor={{ fill: '#f7f7fb' }} contentStyle={{ border: '1px solid #ececf2', borderRadius: 8, fontSize: 11 }} />
                    <Bar dataKey="count" name="Incidents" radius={[4, 4, 0, 0]} maxBarSize={40}>
                      {severityData.map((item) => <Cell key={item._id} fill={severityColors[item._id] || '#8581d4'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="chart-legend">
                {severityData.map(({ _id, count }) => <span className="legend-item" key={_id}><i className="legend-dot" style={{ background: severityColors[_id] || '#8581d4' }} />{_id} <strong>{count}</strong></span>)}
              </div>
            </>
          ) : <div className="empty-state"><span className="empty-icon"><Activity size={20} /></span><h3>No incident data yet</h3><p>Severity breakdown will appear as incidents are reported.</p></div>}
        </div>

        <div className="content-card">
          <div className="card-heading"><div><h2>Incident status</h2><p>Current workload by status</p></div></div>
          <div className="quick-stat-list">
            {(metrics.incidentsByStatus || []).length ? metrics.incidentsByStatus.map(({ _id, count }) => (
              <div className="quick-stat" key={_id}><span>{_id || 'Unknown'}</span><strong>{count}</strong></div>
            )) : <div className="muted-text">No status data available.</div>}
            <div className="quick-stat"><span>Resolved incidents</span><strong>{metrics.resolvedIncidents ?? 0}</strong></div>
            <div className="quick-stat"><span>Active releases</span><strong>{(metrics.activeReleases || []).length}</strong></div>
          </div>
        </div>
      </section>

      <section className="dashboard-bottom">
        <div className="content-card">
          <div className="card-heading"><div><h2>Recent incidents</h2><p>The latest reported issues in your workspace</p></div><Link to="/incidents" className="text-link">All incidents <ArrowRight size={14} /></Link></div>
          {incidents.length ? <div className="data-table-wrap"><table className="data-table">
            <thead><tr><th>Incident</th><th>Severity</th><th>Status</th><th>Reported</th></tr></thead>
            <tbody>{incidents.map((incident) => <tr key={incident._id}>
              <td><div className="table-title"><Link to={`/incidents/${incident._id}`}>{incident.title}</Link><small>#{incident._id.slice(-6).toUpperCase()}</small></div></td>
              <td><StatusBadge value={incident.severity} /></td><td><StatusBadge value={incident.status} /></td>
              <td>{formatDate(incident.createdAt)}</td>
            </tr>)}</tbody>
          </table></div> : <div className="empty-state"><span className="empty-icon"><CheckCircle2 size={20} /></span><h3>All clear</h3><p>No incidents have been reported yet.</p></div>}
        </div>

        <div className="content-card">
          <div className="card-heading"><div><h2>Recent activity</h2><p>Latest changes across your workspace</p></div></div>
          <div className="card-content">
            {activity.length ? <div className="activity-list">{activity.slice(0, 6).map((item, index) => (
              <div className="activity-item" key={item._id || `${item.action}-${index}`}>
                <span className="activity-marker"><Activity size={13} /></span>
                <div className="activity-copy"><strong>{item.actor?.name || 'Workspace member'}</strong> {item.action?.toLowerCase().replaceAll('_', ' ') || 'updated an item'}{(item.incident?.title || item.release?.title || item.subject?.name) && <> on <strong>{item.incident?.title || item.release?.title || item.subject?.name}</strong></>}<small>{relativeTime(item.createdAt)}</small></div>
              </div>
            ))}</div> : <div className="empty-state"><span className="empty-icon"><Activity size={20} /></span><h3>No activity yet</h3><p>Changes to incidents will appear here.</p></div>}
          </div>
        </div>
      </section>
    </>
  );
}
