import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { AlertTriangle, CalendarDays, Plus, RotateCw } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../context/AuthContext.jsx';
import {
  Button,
  EmptyState,
  ErrorState,
  Field,
  FormActions,
  LoadingState,
  Modal,
  PageHeader,
  Pagination,
  SearchField,
  StatusBadge,
} from '../components/ui.jsx';

const incidentSchema = z.object({
  title: z.string().trim().min(1, 'Add a short incident title.'),
  description: z.string().trim().min(1, 'Describe what happened.'),
  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
  assignee: z.string().optional().refine((value) => !value || /^[a-f\d]{24}$/i.test(value), 'Enter a valid user ID.'),
});
const limit = 20;
const dateLabel = (date) => date ? new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const initials = (name) => (name || 'U').split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
const errorMessage = (error, fallback) => {
  const detail = error.response?.data?.error;
  return typeof detail === 'string' ? detail : fallback;
};

export default function Incidents() {
  const { user } = useAuth();
  const canCreate = ['ADMIN', 'ENGINEER'].includes(user?.role);
  const [incidents, setIncidents] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [severity, setSeverity] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(incidentSchema),
    defaultValues: { title: '', description: '', severity: 'LOW', assignee: '' },
  });

  const loadIncidents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await axios.get('/api/incidents', {
        params: { page, limit, ...(severity && { severity }), ...(status && { status }) },
      });
      setIncidents(data.incidents);
      setTotal(data.total);
    } catch (requestError) {
      setError(errorMessage(requestError, 'Could not load incidents. Try again.'));
    } finally {
      setLoading(false);
    }
  }, [page, severity, status]);

  useEffect(() => { loadIncidents(); }, [loadIncidents]);

  const visibleIncidents = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term ? incidents.filter((incident) => `${incident.title} ${incident.description} ${incident._id}`.toLowerCase().includes(term)) : incidents;
  }, [incidents, search]);

  const updateFilter = (setter) => (event) => {
    setter(event.target.value);
    setPage(1);
  };

  const onCreate = async (values) => {
    setSubmitError('');
    try {
      await axios.post('/api/incidents', {
        title: values.title,
        description: values.description,
        severity: values.severity,
        ...(values.assignee?.trim() && { assignee: values.assignee.trim() }),
      });
      setCreateOpen(false);
      reset();
      setPage(1);
      if (page === 1) await loadIncidents();
    } catch (requestError) {
      setSubmitError(errorMessage(requestError, 'Could not create the incident. Check your details and permissions.'));
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="RELIABILITY"
        title="Incidents"
        description="Track, triage, and resolve issues affecting your services."
        action={canCreate && <Button onClick={() => { reset(); setSubmitError(''); setCreateOpen(true); }}><Plus size={16} /> New incident</Button>}
      />
      <section className="content-card">
        <div className="toolbar">
          <div className="toolbar-group">
            <SearchField value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search this page…" />
            <select aria-label="Filter by severity" className="filter-select" value={severity} onChange={updateFilter(setSeverity)}>
              <option value="">All severities</option><option value="CRITICAL">Critical</option><option value="HIGH">High</option><option value="MEDIUM">Medium</option><option value="LOW">Low</option>
            </select>
            <select aria-label="Filter by status" className="filter-select" value={status} onChange={updateFilter(setStatus)}>
              <option value="">All statuses</option><option value="OPEN">Open</option><option value="INVESTIGATING">Investigating</option><option value="RESOLVED">Resolved</option>
            </select>
          </div>
          <Button variant="secondary" className="button--small" onClick={loadIncidents}><RotateCw size={13} /> Refresh</Button>
        </div>
        {loading ? <LoadingState label="Loading incidents" /> : error ? <ErrorState message={error} onRetry={loadIncidents} /> : visibleIncidents.length ? (
          <>
            <div className="data-table-wrap"><table className="data-table">
              <thead><tr><th>Incident</th><th>Severity</th><th>Status</th><th>Assignee</th><th>Created</th></tr></thead>
              <tbody>{visibleIncidents.map((incident) => (
                <tr key={incident._id}>
                  <td><div className="table-title"><Link to={`/incidents/${incident._id}`}>{incident.title}</Link><small>#{incident._id.slice(-6).toUpperCase()}</small></div></td>
                  <td><StatusBadge value={incident.severity} /></td>
                  <td><StatusBadge value={incident.status} /></td>
                  <td>{incident.assignee ? <span className="table-user"><span className="mini-avatar">{initials(incident.assignee.name)}</span>{incident.assignee.name}</span> : <span className="muted-text">Unassigned</span>}</td>
                  <td><span className="table-user"><CalendarDays size={13} className="muted-text" />{dateLabel(incident.createdAt)}</span></td>
                </tr>
              ))}</tbody>
            </table></div>
            {!search && <Pagination page={page} limit={limit} total={total} onChange={setPage} />}
            {search && <div className="pagination"><span>Showing {visibleIncidents.length} matching results on this page</span></div>}
          </>
        ) : <EmptyState title={search ? 'No matching incidents' : 'No incidents yet'} description={search ? 'Try a different search term or clear your filters.' : 'Newly reported incidents will appear here.'} action={!search && canCreate && <Button onClick={() => setCreateOpen(true)}><Plus size={15} /> Create incident</Button>} />}
      </section>

      {createOpen && <Modal title="Report an incident" description="Add the details your team needs to start investigating." onClose={() => setCreateOpen(false)}>
        <form onSubmit={handleSubmit(onCreate)} noValidate>
          <div className="form-grid">
            <Field className="form-field--full" label="Title" error={errors.title?.message} {...register('title')} placeholder="e.g. Elevated API latency in us-east" />
            <Field className="form-field--full" label="Description" error={errors.description?.message}>
              <textarea {...register('description')} placeholder="What happened? Include impact, affected services, and useful context." rows={4} />
            </Field>
            <Field label="Severity" error={errors.severity?.message}>
              <select {...register('severity')}><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="CRITICAL">Critical</option></select>
            </Field>
            <Field label="Assignee user ID" error={errors.assignee?.message} hint="Optional. Enter an existing user ID." {...register('assignee')} placeholder="User ID" />
          </div>
          {submitError && <p className="form-alert"><AlertTriangle size={15} />{submitError}</p>}
          <FormActions onCancel={() => setCreateOpen(false)} busy={isSubmitting} submitLabel="Create incident" />
        </form>
      </Modal>}
    </>
  );
}
