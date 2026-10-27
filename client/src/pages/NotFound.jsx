import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Command } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="not-found">
      <Link to="/login" className="not-found-brand"><span className="brand-mark"><Command size={17} /></span>opsboard</Link>
      <div className="not-found-content">
        <span>404 · PAGE NOT FOUND</span>
        <h1>This page isn’t in the workspace.</h1>
        <p>The link may be outdated, or the page may have moved.</p>
        <Link to="/" className="button button--primary"><ArrowLeft size={15} /> Return to overview</Link>
      </div>
      <span className="not-found-footer">OpsBoard engineering workspace</span>
    </main>
  );
}
