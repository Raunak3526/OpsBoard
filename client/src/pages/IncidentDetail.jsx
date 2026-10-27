import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { AlertTriangle, CalendarDays, CircleUserRound, Clock3, RotateCcw, Save } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../context/AuthContext.jsx';
import { Button, ErrorState, Field, LoadingState, PageHeader, StatusBadge } from '../components/ui.jsx';

const schema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).optional(),
  status: z.enum(['OPEN', 'INVESTIGATING', 'RESOLVED']).optional(),
  assignee: z.string().optional().refine((value) => !value || /^[a-f\d]{24}$/i.test(value), 'Enter a valid user ID.'),
  resolutionNote: z.string().optional(),
}).superRefine((values, context) => {
  if (values.title !== undefined && !values.title.trim()) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['title'], message: 'Title cannot be empty.' });
  }
  if (values.description !== undefined && !values.description.trim()) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['description'], message: 'Description cannot be empty.' });
  }
  if (values.status === 'RESOLVED' && !values.resolutionNote?.trim()) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['resolutionNote'], message: 'Add a resolution note before resolving.' });
  }
});
const dateLabel = (date) => date ? new Date(date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—';

export default function IncidentDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const canEdit = ['ADMIN', 'ENGINEER'].includes(user?.role);
  const [incident, setIncident] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [feedback, setFeedback] = useState('');
  const { register, handleSubmit, reset, watch, formState: { isSubmitting, errors } } = useForm({ resolver: zodResolver(schema) });
  const selectedStatus = watch('status');

  const loadIncident = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [incidentResponse, activityResponse] = await Promise.all([
        axios.get(`/api/incidents/${id}`),
        axios.get(`/api/incidents/${id}/activity`),
      ]);
      const data = incidentResponse.data.incident;
      setIncident(data);
      setActivity(activityResponse.data.activities || []);
      reset({
        title: data.title,
        description: data.description,
        severity: data.severity,
        status: data.status,
        assignee: data.assignee?._id || '',
        resolutionNote: data.resolutionNote || '',
      });
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Could not load this incident.');
    } finally {
      setLoading(false);
    }
  }, [id, reset]);

  useEffect(() => { loadIncident(); }, [loadIncident]);

  const onSubmit = async (values) => {
    setSubmitError('');
    setFeedback('');
    const payload = { ...values };
    if (payload.assignee !== undefined) payload.assignee = payload.assignee.trim() || null;
    if (!payload.resolutionNote?.trim()) delete payload.resolutionNote;
    try {
      await axios.patch(`/api/incidents/${id}`, payload);
      setFeedback('Incident changes saved.');
      await loadIncident();
    } catch (requestError) {
      const detail = requestError.response?.data?.error;
      setSubmitError(typeof detail === 'string' ? detail : 'Could not save changes. Check the incident details and try again.');
    }
  };

  const reopen = async () => {
    setSubmitError('');
    setFeedback('');
    try {
      await axios.post(`/api/incidents/${id}/reopen`);
      setFeedback('Incident reopened.');
      await loadIncident();
    } catch (requestError) {
      setSubmitError(requestError.response?.data?.error || 'Could not reopen this incident.');
    }
  };

  if (loading) return <LoadingState label="Loading incident" />;
  if (error) return <ErrorState message={error} onRetry={loadIncident} />;
  if (!incident) return null;

  return (
    <>
      <PageHeader
        backTo="/incidents"
        eyebrow={`INCIDENT #${incident._id.slice(-6).toUpperCase()}`}
        title={incident.title}
        description="Review incident context, ownership, status, and the change timeline."
        action={<StatusBadge value={incident.status} />}
      />
      {submitError && <p className="form-alert"><AlertTriangle size={15} />{submitError}</p>}
      {feedback && <p className="success-banner">{feedback}</p>}
      <div className="detail-grid">
        <div className="detail-stack">
          <section className="content-card">
            <div className="card-heading"><div><h2>Incident details</h2><p>Summary and investigation context</p></div><StatusBadge value={incident.severity} /></div>
            <div className="card-content"><p className="detail-description">{incident.description || 'No description provided.'}</p></div>
          </section>

          {canEdit && <section className="content-card">
            <div className="card-heading"><div><h2>Update incident</h2><p>Changes are recorded in the activity history.</p></div></div>
            <form className="card-content" onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="form-grid">
                <Field className="form-field--full" label="Title" error={errors.title?.message} {...register('title')} />
                <Field className="form-field--full" label="Description" error={errors.description?.message}>
                  <textarea {...register('description')} rows={4} />
                </Field>
                <Field label="Severity"><select {...register('severity')}><option value="CRITICAL">Critical</option><option value="HIGH">High</option><option value="MEDIUM">Medium</option><option value="LOW">Low</option></select></Field>
                <Field label="Status"><select {...register('status')}><option value="OPEN">Open</option><option value="INVESTIGATING">Investigating</option><option value="RESOLVED">Resolved</option></select></Field>
                <Field className="form-field--full" label="Assignee user ID" error={errors.assignee?.message} hint={incident.assignee ? `Currently assigned to ${incident.assignee.name || 'this user'}. Leave unchanged to keep assignment.` : 'Optional. Enter an existing user ID.'} {...register('assignee')} placeholder="User ID" />
                {(selectedStatus === 'RESOLVED' || incident.status === 'RESOLVED') && (
                  <Field className="form-field--full" label="Resolution note" error={errors.resolutionNote?.message} hint="Required when resolving an incident.">
                    <textarea {...register('resolutionNote')} rows={3} placeholder="Summarize the fix or mitigation." />
                  </Field>
                )}
              </div>
              <div className="form-actions">
                {incident.status === 'RESOLVED' && <Button variant="secondary" onClick={reopen} disabled={isSubmitting}><RotateCcw size={14} /> Reopen incident</Button>}
                <Button type="submit" disabled={isSubmitting}><Save size={14} />{isSubmitting ? 'Saving…' : 'Save changes'}</Button>
              </div>
            </form>
          </section>}

          <section className="content-card">
            <div className="card-heading"><div><h2>Activity history</h2><p>Updates associated with this incident</p></div><span className="badge badge--neutral">{activity.length}</span></div>
            <div className="card-content">
              {activity.length ? <div className="activity-timeline">{activity.map((item) => (
                <div className="timeline-item" key={item._id}>
                  <span className="activity-marker"><Clock3 size={13} /></span>
                  <div className="timeline-copy"><strong>{item.actor?.name || 'Workspace member'}</strong> {item.action?.toLowerCase().replaceAll('_', ' ') || 'updated incident'}{item.details && <> · {item.details}</>}<small>{dateLabel(item.createdAt)}</small></div>
                </div>
              ))}</div> : <p className="muted-text">No activity has been recorded for this incident yet.</p>}
            </div>
          </section>
        </div>

        <aside className="content-card">
          <div className="card-heading"><div><h2>Properties</h2><p>Ownership and timestamps</p></div></div>
          <div className="card-content"><div className="detail-meta">
            <div className="meta-item"><span>Status</span><StatusBadge value={incident.status} /></div>
            <div className="meta-item"><span>Severity</span><StatusBadge value={incident.severity} /></div>
            <div className="meta-item"><span>Assignee</span><strong><span className="table-user"><CircleUserRound size={14} />{incident.assignee?.name || 'Unassigned'}</span></strong></div>
            <div className="meta-item"><span>Reported by</span><strong>{incident.createdBy?.name || 'Unknown'}</strong></div>
            <div className="meta-item"><span>Created</span><strong><span className="table-user"><CalendarDays size={13} />{dateLabel(incident.createdAt)}</span></strong></div>
            <div className="meta-item"><span>Last updated</span><strong>{dateLabel(incident.updatedAt)}</strong></div>
          </div>
          {incident.resolutionNote && <div className="resolution-note"><strong>Resolution note</strong><p>{incident.resolutionNote}</p></div>}
          </div>
        </aside>
      </div>
    </>
  );
}
