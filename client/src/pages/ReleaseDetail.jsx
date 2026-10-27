import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { AlertTriangle, CalendarDays, Check, CheckCircle2, Edit3, PackageCheck } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext.jsx';
import { Button, ErrorState, Field, FormActions, LoadingState, Modal, PageHeader, StatusBadge } from '../components/ui.jsx';

const dateLabel = (date) => date ? new Date(date).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—';
const transitions = {
  PLANNED: [{ status: 'IN_PROGRESS', label: 'Start release' }, { status: 'CANCELLED', label: 'Cancel release' }],
  IN_PROGRESS: [{ status: 'RELEASED', label: 'Mark as released' }, { status: 'CANCELLED', label: 'Cancel release' }],
  RELEASED: [],
  CANCELLED: [],
};

export default function ReleaseDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const canManage = user?.role === 'ADMIN';
  const [release, setRelease] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [busyItem, setBusyItem] = useState(-1);
  const [actionBusy, setActionBusy] = useState(false);
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();

  const loadRelease = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await axios.get(`/api/releases/${id}`);
      setRelease(data.release);
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Could not load this release.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadRelease(); }, [loadRelease]);

  const updateStatus = async (status) => {
    setActionError('');
    setFeedback('');
    setActionBusy(true);
    try {
      const { data } = await axios.patch(`/api/releases/${id}`, { status });
      setRelease((current) => ({
        ...data.release,
        createdBy: data.release.createdBy?.name ? data.release.createdBy : current.createdBy,
      }));
      setFeedback(status === 'RELEASED' ? 'Release marked as shipped.' : `Release status updated to ${status.toLowerCase().replaceAll('_', ' ')}.`);
    } catch (requestError) {
      setActionError(requestError.response?.data?.error || 'Could not update release status.');
      await loadRelease();
    } finally {
      setActionBusy(false);
    }
  };

  const toggleChecklist = async (index) => {
    if (!release || !canManage) return;
    setBusyItem(index);
    setActionError('');
    setFeedback('');
    const checklist = release.checklist.map((item, itemIndex) => ({
      item: item.item,
      completed: itemIndex === index ? !item.completed : item.completed,
    }));
    try {
      const { data } = await axios.patch(`/api/releases/${id}`, { checklist });
      setRelease((current) => ({
        ...data.release,
        createdBy: data.release.createdBy?.name ? data.release.createdBy : current.createdBy,
      }));
    } catch (requestError) {
      setActionError(requestError.response?.data?.error || 'Could not update the readiness checklist.');
      await loadRelease();
    } finally {
      setBusyItem(-1);
    }
  };

  const openEdit = () => {
    reset({ description: release.description || '', notes: release.notes || '' });
    setActionError('');
    setEditOpen(true);
  };

  const saveDetails = async (values) => {
    setActionError('');
    try {
      const { data } = await axios.patch(`/api/releases/${id}`, values);
      setRelease((current) => ({
        ...data.release,
        createdBy: data.release.createdBy?.name ? data.release.createdBy : current.createdBy,
      }));
      setEditOpen(false);
      setFeedback('Release details saved.');
    } catch (requestError) {
      setActionError(requestError.response?.data?.error || 'Could not save release details.');
    }
  };

  if (loading) return <LoadingState label="Loading release" />;
  if (error) return <ErrorState message={error} onRetry={loadRelease} />;
  if (!release) return null;

  const checklist = release.checklist || [];
  const completeCount = checklist.filter((item) => item.completed).length;
  const allowedTransitions = transitions[release.status] || [];

  return (
    <>
      <PageHeader
        backTo="/releases"
        eyebrow={`RELEASE ${release.version}`}
        title={release.title}
        description="Review release readiness, notes, and deployment status."
        action={<StatusBadge value={release.status} />}
      />
      {actionError && <p className="form-alert"><AlertTriangle size={15} />{actionError}</p>}
      {feedback && <p className="success-banner">{feedback}</p>}
      <div className="detail-grid">
        <div className="detail-stack">
          <section className="content-card">
            <div className="card-heading"><div><h2>Release overview</h2><p>Version {release.version}</p></div>{canManage && <Button variant="secondary" className="button--small" onClick={openEdit}><Edit3 size={13} /> Edit details</Button>}</div>
            <div className="card-content">
              <div className="detail-description">{release.description || 'No description has been added.'}</div>
              {release.notes && <div className="release-notes"><strong>Release notes</strong><p>{release.notes}</p></div>}
            </div>
          </section>

          <section className="content-card">
            <div className="card-heading"><div><h2>Readiness checklist</h2><p>Complete every check before marking this release as shipped.</p></div><span className="badge badge--neutral">{completeCount}/{checklist.length}</span></div>
            <div className="card-content">
              {checklist.length ? <div className="checklist">{checklist.map((item, index) => (
                <label className={`checklist-row${item.completed ? ' checklist-row--done' : ''}`} key={`${item.item}-${index}`}>
                  <input type="checkbox" checked={Boolean(item.completed)} disabled={!canManage || busyItem === index} onChange={() => toggleChecklist(index)} />
                  <span>{item.item}</span>
                  {item.completed && <Check size={14} className="check-indicator" />}
                </label>
              ))}</div> : <div className="empty-state"><span className="empty-icon"><CheckCircle2 size={20} /></span><h3>No checklist items</h3><p>{canManage ? 'Edit release details to add readiness checks.' : 'There are no readiness checks for this release.'}</p></div>}
            </div>
          </section>
        </div>

        <aside className="detail-stack">
          <section className="content-card">
            <div className="card-heading"><div><h2>Release status</h2><p>Move this release through its workflow.</p></div></div>
            <div className="card-content">
              <div className="release-status-current"><PackageCheck size={18} /><StatusBadge value={release.status} /></div>
              {canManage && allowedTransitions.length ? <div className="release-actions">{allowedTransitions.map(({ status, label }) => (
                <Button key={status} variant={status === 'CANCELLED' ? 'danger' : 'primary'} disabled={actionBusy} onClick={() => updateStatus(status)}>{label}</Button>
              ))}</div> : <p className="release-help">{canManage ? 'This release is in a final state.' : 'Only workspace admins can change release status.'}</p>}
              {release.status === 'IN_PROGRESS' && checklist.length > completeCount && <p className="release-help">Complete all checklist items before shipping. The backend will enforce this requirement.</p>}
            </div>
          </section>
          <section className="content-card">
            <div className="card-heading"><div><h2>Properties</h2><p>Release ownership and dates</p></div></div>
            <div className="card-content"><div className="detail-meta">
              <div className="meta-item"><span>Version</span><strong>{release.version}</strong></div>
              <div className="meta-item"><span>Status</span><StatusBadge value={release.status} /></div>
              <div className="meta-item"><span>Created by</span><strong>{release.createdBy?.name || 'Unknown'}</strong></div>
              <div className="meta-item"><span>Created</span><strong>{dateLabel(release.createdAt)}</strong></div>
              {release.releasedAt && <div className="meta-item"><span>Released</span><strong><span className="table-user"><CalendarDays size={13} />{dateLabel(release.releasedAt)}</span></strong></div>}
            </div></div>
          </section>
        </aside>
      </div>

      {editOpen && <Modal title="Edit release details" description="Update the release summary and notes. Version identifiers are immutable after creation." onClose={() => setEditOpen(false)} wide>
        <form onSubmit={handleSubmit(saveDetails)}>
          <div className="form-grid">
            <Field className="form-field--full" label="Description" {...register('description')} placeholder="What is included in this release?" />
            <Field className="form-field--full" label="Release notes" {...register('notes')} placeholder="Optional notes for your team." />
          </div>
          <FormActions onCancel={() => setEditOpen(false)} busy={isSubmitting} submitLabel="Save details" />
        </form>
      </Modal>}
    </>
  );
}
