import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { Activity, ArrowRight, Boxes, Shield, UserCheck, UserX, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  Pagination,
  SearchField,
  StatusBadge,
} from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const limit = 20;
const dateLabel = (date) => date ? new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const errorMessage = (error, fallback) => {
  const detail = error.response?.data?.error;
  return typeof detail === 'string' ? detail : fallback;
};

export default function Admin() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [dashboard, setDashboard] = useState(null);
  const [activity, setActivity] = useState([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [busyUsers, setBusyUsers] = useState({});

  const loadAdminData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [usersResponse, dashboardResponse] = await Promise.all([
        axios.get('/api/admin/users', {
          params: { page, limit, ...(search.trim() && { search: search.trim() }) },
        }),
        axios.get('/api/dashboard'),
      ]);
      setUsers(usersResponse.data.users);
      setTotalUsers(usersResponse.data.total);
      setDashboard(dashboardResponse.data);
      setActivity(dashboardResponse.data.recentActivity || []);
    } catch (requestError) {
      setError(errorMessage(requestError, 'Could not load administrator data. Try again.'));
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { loadAdminData(); }, [loadAdminData]);

  const updateRole = async (target, role) => {
    setActionError('');
    setFeedback('');
    setBusyUsers((current) => ({ ...current, [target._id]: true }));
    try {
      const { data } = await axios.patch(`/api/admin/users/${target._id}/role`, { role });
      setUsers((current) => current.map((item) => item._id === target._id ? data.user : item));
      setFeedback(`${target.name}'s role is now ${role}.`);
    } catch (requestError) {
      setActionError(errorMessage(requestError, 'Could not update this user role.'));
    } finally {
      setBusyUsers((current) => ({ ...current, [target._id]: false }));
    }
  };

  const updateActive = async (target) => {
    const active = !target.active;
    setActionError('');
    setFeedback('');
    setBusyUsers((current) => ({ ...current, [target._id]: true }));
    try {
      const { data } = await axios.patch(`/api/admin/users/${target._id}/active`, { active });
      setUsers((current) => current.map((item) => item._id === target._id ? data.user : item));
      setFeedback(`${target.name}'s account is ${active ? 'enabled' : 'disabled'}.`);
    } catch (requestError) {
      setActionError(errorMessage(requestError, 'Could not update this account.'));
    } finally {
      setBusyUsers((current) => ({ ...current, [target._id]: false }));
    }
  };

  const onSearchChange = (event) => {
    setPage(1);
    setSearch(event.target.value);
  };

  if (loading) return <><PageHeader eyebrow="ADMINISTRATION" title="Admin" description="Manage workspace accounts and review recent operational activity." /><LoadingState label="Loading administrator data" /></>;
  if (error) return <><PageHeader eyebrow="ADMINISTRATION" title="Admin" description="Manage workspace accounts and review recent operational activity." /><ErrorState message={error} onRetry={loadAdminData} /></>;

  const activeReleases = dashboard?.activeReleases || [];
  const metrics = [
    { label: 'Registered users', value: totalUsers, icon: Users },
    { label: 'Open incidents', value: dashboard?.openIncidents ?? 0, icon: Activity },
    { label: 'Critical incidents', value: dashboard?.criticalOpen ?? 0, icon: Shield },
    { label: 'Active releases', value: activeReleases.length, icon: Boxes },
  ];

  return (
    <>
      <PageHeader
        eyebrow="ADMINISTRATION"
        title="Admin"
        description="Manage workspace accounts and review recent operational activity."
        action={<Link to="/" className="button button--secondary">Dashboard <ArrowRight size={15} /></Link>}
      />

      <section className="metric-grid" aria-label="Administrator overview">
        {metrics.map(({ label, value, icon: Icon }) => (
          <article className="metric-card" key={label}>
            <div className="metric-card-head"><span>{label}</span><span className="metric-icon"><Icon size={16} /></span></div>
            <div className="metric-value">{value}</div>
          </article>
        ))}
      </section>

      {actionError && <p className="form-alert" role="alert">{actionError}</p>}
      {feedback && <p className="success-banner" role="status">{feedback}</p>}

      <section className="content-card">
        <div className="card-heading">
          <div><h2>Workspace users</h2><p>Roles and account status are enforced by the API.</p></div>
          <span className="badge badge--neutral">{totalUsers} total</span>
        </div>
        <div className="toolbar">
          <SearchField value={search} onChange={onSearchChange} placeholder="Search users by name or email…" />
          <Button variant="secondary" className="button--small" onClick={loadAdminData}>Refresh</Button>
        </div>
        {users.length ? (
          <>
            <div className="data-table-wrap"><table className="data-table">
              <thead><tr><th>User</th><th>Role</th><th>Account</th><th>Created</th><th>Incident assignment ID</th><th>Manage</th></tr></thead>
              <tbody>{users.map((target) => {
                const isCurrentUser = String(target._id) === String(currentUser?._id || currentUser?.id);
                return <tr key={target._id}>
                  <td><div className="table-title"><strong>{target.name}</strong><small>{target.email}</small></div></td>
                  <td>
                    <select
                      aria-label={`Role for ${target.name}`}
                      className="filter-select"
                      value={target.role}
                      disabled={isCurrentUser || busyUsers[target._id]}
                      onChange={(event) => updateRole(target, event.target.value)}
                    >
                      <option value="ENGINEER">Engineer</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                    {isCurrentUser && <small className="muted-text">Your role cannot be changed here.</small>}
                  </td>
                  <td><StatusBadge value={target.active ? 'ACTIVE' : 'DISABLED'} /></td>
                  <td>{dateLabel(target.createdAt)}</td>
                  <td><code>{target._id}</code></td>
                  <td>
                    <Button
                      variant={target.active ? 'danger' : 'secondary'}
                      className="button--small"
                      disabled={isCurrentUser || busyUsers[target._id]}
                      onClick={() => updateActive(target)}
                    >
                      {target.active ? <><UserX size={13} /> Disable</> : <><UserCheck size={13} /> Enable</>}
                    </Button>
                  </td>
                </tr>;
              })}</tbody>
            </table></div>
            <Pagination page={page} limit={limit} total={totalUsers} onChange={setPage} />
          </>
        ) : <EmptyState title={search ? 'No matching users' : 'No users found'} description={search ? 'Try another name or email address.' : 'Registered accounts will appear here.'} />}
      </section>

      <section className="content-card" style={{ marginTop: 16 }}>
        <div className="card-heading"><div><h2>Recent workspace activity</h2><p>Incident, release, and account changes.</p></div></div>
        <div className="card-content">
          {activity.length ? <div className="activity-list">{activity.slice(0, 10).map((item, index) => {
            const subjectName = item.incident?.title || item.release?.title || item.subject?.name;
            return <div className="activity-item" key={item._id || `${item.action}-${index}`}>
              <span className="activity-marker"><Activity size={13} /></span>
              <div className="activity-copy">
                <strong>{item.actor?.name || 'Workspace member'}</strong> {item.action?.toLowerCase().replaceAll('_', ' ') || 'updated an item'}
                {subjectName && <> · <strong>{subjectName}</strong></>}
                {item.details && <> · {item.details}</>}
                <small>{dateLabel(item.createdAt)}</small>
              </div>
            </div>;
          })}</div> : <EmptyState title="No activity yet" description="Changes to incidents, releases, and user accounts will appear here." />}
        </div>
      </section>
    </>
  );
}
