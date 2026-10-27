import React from 'react';
import { AlertCircle, ArrowLeft, ChevronLeft, ChevronRight, Inbox, Loader2, Search, X } from 'lucide-react';
import { Link } from 'react-router-dom';

export function PageHeader({ eyebrow, title, description, action, backTo }) {
  return (
    <div className="page-header">
      <div className="page-heading">
        {backTo && <Link className="back-link" to={backTo}><ArrowLeft size={15} /> Back</Link>}
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action && <div className="page-header-action">{action}</div>}
    </div>
  );
}

export function Button({ children, variant = 'primary', className = '', type = 'button', ...props }) {
  return <button type={type} className={`button button--${variant} ${className}`.trim()} {...props}>{children}</button>;
}

export function IconAction({ label, children, ...props }) {
  return <button type="button" className="icon-button" aria-label={label} title={label} {...props}>{children}</button>;
}

export function StatusBadge({ value }) {
  const tone = {
    OPEN: 'danger',
    CRITICAL: 'danger',
    HIGH: 'warning',
    INVESTIGATING: 'info',
    MEDIUM: 'warning',
    LOW: 'neutral',
    RESOLVED: 'success',
    RELEASED: 'success',
    IN_PROGRESS: 'info',
    PLANNED: 'neutral',
    CANCELLED: 'neutral',
  }[value] || 'neutral';
  return <span className={`badge badge--${tone}`}><span className="badge-dot" />{(value || 'Unknown').replaceAll('_', ' ')}</span>;
}

export function SearchField({ value, onChange, placeholder = 'Search…', className = '' }) {
  return (
    <label className={`search-field ${className}`}>
      <Search size={16} />
      <input value={value} onChange={onChange} placeholder={placeholder} aria-label={placeholder} />
      {value && <button type="button" className="search-clear" onClick={() => onChange({ target: { value: '' } })} aria-label="Clear search"><X size={13} /></button>}
    </label>
  );
}

export function LoadingState({ label = 'Loading' }) {
  return <div className="state-panel" role="status"><Loader2 className="spin" size={22} /><span>{label}…</span></div>;
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="state-panel state-panel--error" role="alert">
      <AlertCircle size={21} />
      <div><strong>Something went wrong</strong><p>{message}</p>{onRetry && <Button variant="secondary" onClick={onRetry}>Try again</Button>}</div>
    </div>
  );
}

export function EmptyState({ title, description, action }) {
  return (
    <div className="empty-state">
      <span className="empty-icon"><Inbox size={22} /></span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}

export function Pagination({ page, limit, total, onChange }) {
  const pages = Math.max(1, Math.ceil(total / limit));
  const start = total ? (page - 1) * limit + 1 : 0;
  const end = Math.min(page * limit, total);
  return (
    <div className="pagination">
      <span>{total ? `Showing ${start}–${end} of ${total}` : 'No results'}</span>
      <div className="pagination-actions">
        <button className="button button--secondary button--small" disabled={page <= 1} onClick={() => onChange(page - 1)}><ChevronLeft size={15} /> Previous</button>
        <span className="page-count">Page {page} of {pages}</span>
        <button className="button button--secondary button--small" disabled={page >= pages} onClick={() => onChange(page + 1)}>Next <ChevronRight size={15} /></button>
      </div>
    </div>
  );
}

export function Modal({ title, description, onClose, children, wide = false }) {
  React.useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className={`modal${wide ? ' modal--wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-header"><div><h2 id="modal-title">{title}</h2>{description && <p>{description}</p>}</div><IconAction label="Close dialog" onClick={onClose}><X size={16} /></IconAction></div>
        {children}
      </section>
    </div>
  );
}

export const Field = React.forwardRef(function Field({ label, error, hint, className = '', children, ...props }, ref) {
  const id = props.id || `field-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return (
    <div className={`form-field ${className}`}>
      <label htmlFor={id}>{label}</label>
      {children ? React.cloneElement(children, { id, 'aria-invalid': Boolean(error), 'aria-describedby': error ? `${id}-error` : undefined }) : <input id={id} ref={ref} {...props} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} />}
      {hint && !error && <small className="field-hint">{hint}</small>}
      {error && <small className="field-error" id={`${id}-error`}>{error}</small>}
    </div>
  );
});

export function FormActions({ onCancel, busy, submitLabel = 'Save changes' }) {
  return <div className="form-actions"><Button variant="secondary" onClick={onCancel} disabled={busy}>Cancel</Button><Button type="submit" disabled={busy}>{busy && <Loader2 size={15} className="spin" />}{busy ? 'Saving…' : submitLabel}</Button></div>;
}
