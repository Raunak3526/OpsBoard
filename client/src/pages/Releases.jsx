import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Boxes, CalendarDays, Plus, RotateCw, Trash2 } from 'lucide-react';
import { useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../context/AuthContext.jsx';
import { Button, EmptyState, ErrorState, Field, FormActions, LoadingState, Modal, PageHeader, Pagination, SearchField, StatusBadge } from '../components/ui.jsx';

const schema = z.object({
  title: z.string().trim().min(1, 'Add a release name.'),
  version: z.string().trim().min(1, 'Add a version identifier.'),
  description: z.string().optional(),
  notes: z.string().optional(),
  checklist: z.array(z.object({ item: z.string().trim().min(1, 'Enter a checklist item.'), completed: z.boolean() })),
});
const limit = 20;
const dateLabel = (date) => date ? new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const errorMessage = (error, fallback) => typeof error.response?.data?.error === 'string' ? error.response.data.error : fallback;

export default function Releases() {
  const { user } = useAuth();
  const canCreate = user?.role === 'ADMIN';
  const [releases, setReleases] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const { control, register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { title: '', version: '', description: '', notes: '', checklist: [{ item: '', completed: false }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'checklist' });

  const loadReleases = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await axios.get('/api/releases', { params: { page, limit, ...(status && { status }) } });
      setReleases(data.releases);
      setTotal(data.total);
    } catch (requestError) {
      setError(errorMessage(requestError, 'Could not load releases. Try again.'));
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => { loadReleases(); }, [loadReleases]);

  const visibleReleases = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term ? releases.filter((release) => `${release.title} ${release.version} ${release.description || ''}`.toLowerCase().includes(term)) : releases;
  }, [releases, search]);

  const onCreate = async (values) => {
    setSubmitError('');
    try {
      await axios.post('/api/releases', {
        ...values,
        checklist: values.checklist.filter((item) => item.item.trim()).map((item) => ({ item: item.item.trim(), completed: false })),
      });
      setCreateOpen(false);
      reset();
      setPage(1);
      if (page === 1) await loadReleases();
    } catch (requestError) {
      setSubmitError(errorMessage(requestError, 'Could not create the release. Check the version and your permissions.'));
    }
  };

  const openCreate = () => {
    reset({ title: '', version: '', description: '', notes: '', checklist: [{ item: '', completed: false }] });
    setSubmitError('');
    setCreateOpen(true);
  };

  return (
    <>
      <PageHeader
        eyebrow="DELIVERY"
        title="Releases"
        description="Plan deployments, track readiness, and keep release work moving."
        action={canCreate && <Button onClick={openCreate}><Plus size={16} /> New release</Button>}
      />
      <section className="content-card">
        <div className="toolbar">
          <div className="toolbar-group">
            <SearchField value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search this page…" />
            <select className="filter-select" aria-label="Filter by release status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
              <option value="">All statuses</option><option value="PLANNED">Planned</option><option value="IN_PROGRESS">In progress</option><option value="RELEASED">Released</option><option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <Button variant="secondary" className="button--small" onClick={loadReleases}><RotateCw size={13} /> Refresh</Button>
        </div>
        {loading ? <LoadingState label="Loading releases" /> : error ? <ErrorState message={error} onRetry={loadReleases} /> : visibleReleases.length ? (
          <>
            <div className="data-table-wrap"><table className="data-table">
              <thead><tr><th>Release</th><th>Status</th><th>Checklist</th><th>Created</th><th>Owner</th></tr></thead>
              <tbody>{visibleReleases.map((release) => {
                const checklist = release.checklist || [];
                const done = checklist.filter((item) => item.completed).length;
                return <tr key={release._id}>
                  <td><div className="table-title"><Link to={`/releases/${release._id}`}>{release.title}</Link><small>Version {release.version}</small></div></td>
                  <td><StatusBadge value={release.status} /></td>
                  <td>{checklist.length ? `${done} of ${checklist.length} complete` : <span className="muted-text">No checklist</span>}</td>
                  <td><span className="table-user"><CalendarDays size={13} className="muted-text" />{dateLabel(release.createdAt)}</span></td>
                  <td>{release.createdBy?.name || <span className="muted-text">—</span>}</td>
                </tr>;
              })}</tbody>
            </table></div>
            {!search && <Pagination page={page} limit={limit} total={total} onChange={setPage} />}
            {search && <div className="pagination"><span>Showing {visibleReleases.length} matching results on this page</span></div>}
          </>
        ) : <EmptyState title={search ? 'No matching releases' : 'No releases yet'} description={search ? 'Try another search or clear the current filter.' : 'Create a release to plan and track your next deployment.'} action={!search && canCreate && <Button onClick={openCreate}><Plus size={15} /> Create release</Button>} />}
      </section>

      {createOpen && <Modal title="Create a release" description="Add release metadata and the checks required before shipping." onClose={() => setCreateOpen(false)} wide>
        <form onSubmit={handleSubmit(onCreate)} noValidate>
          <div className="form-grid">
            <Field label="Release name" error={errors.title?.message} {...register('title')} placeholder="e.g. Payments reliability improvements" />
            <Field label="Version" error={errors.version?.message} hint="Must be unique, such as 2.4.0." {...register('version')} placeholder="2.4.0" />
            <Field className="form-field--full" label="Description" {...register('description')} placeholder="What is included in this release?" />
            <Field className="form-field--full" label="Release notes" {...register('notes')} placeholder="Optional notes for your team." />
            <div className="form-field form-field--full">
              <label>Readiness checklist</label>
              <div className="checklist-editor">
                {fields.map((field, index) => <div className="checklist-editor-row" key={field.id}>
                  <input className="form-control" aria-label={`Checklist item ${index + 1}`} placeholder="e.g. Verify deployment health checks" {...register(`checklist.${index}.item`)} />
                  <button className="icon-button" type="button" aria-label={`Remove checklist item ${index + 1}`} onClick={() => remove(index)}><Trash2 size={15} /></button>
                  {errors.checklist?.[index]?.item && <small className="field-error">{errors.checklist[index].item.message}</small>}
                </div>)}
              </div>
              <button type="button" className="text-link checklist-add" onClick={() => append({ item: '', completed: false })}><Plus size={14} /> Add checklist item</button>
            </div>
          </div>
          {submitError && <p className="form-alert"><Boxes size={15} />{submitError}</p>}
          <FormActions onCancel={() => setCreateOpen(false)} busy={isSubmitting} submitLabel="Create release" />
        </form>
      </Modal>}
    </>
  );
}
