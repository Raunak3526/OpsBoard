import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, CheckCircle2, Command, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../context/AuthContext.jsx';
import { Field } from '../components/ui.jsx';

const schema = z.object({
  email: z.string().email({ message: 'Enter a valid email address.' }),
  password: z.string().min(1, { message: 'Enter your password.' }),
});

export default function Login() {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (data) => {
    setSubmitError('');
    try {
      await login(data.email, data.password);
    } catch (error) {
      const detail = error.response?.data?.error;
      setSubmitError(typeof detail === 'string' ? detail : 'We could not sign you in. Check your credentials and try again.');
    }
  };

  return (
    <main className="auth-layout">
      <section className="auth-brand-panel">
        <div className="auth-brand"><span className="brand-mark"><Command size={18} /></span><span>opsboard</span></div>
        <div className="auth-pitch">
          <h1>Reliable operations start with a clear view.</h1>
          <p>Bring incidents, release readiness, and engineering activity together in one focused workspace.</p>
          <div className="auth-feature"><CheckCircle2 size={17} /> Visibility from incident to resolution</div>
          <div className="auth-feature"><Activity size={17} /> Release readiness your whole team can trust</div>
        </div>
        <div className="auth-footer">A calm command center for engineering teams.</div>
      </section>
      <section className="auth-form-panel">
        <div className="auth-form-wrap">
          <div className="auth-mobile-brand"><span className="brand-mark"><Command size={17} /></span><strong>opsboard</strong></div>
          <h2>Welcome back</h2>
          <p className="auth-subtitle">Sign in to continue to your engineering workspace.</p>
          <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
            <Field label="Work email" error={errors.email?.message} {...register('email')} type="email" autoComplete="email" placeholder="you@company.com" />
            <div className="form-field">
              <label htmlFor="login-password">Password</label>
              <div className="password-wrap">
                <input id="login-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password" {...register('password')} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'login-password-error' : undefined} />
                <button className="icon-button password-toggle" type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
              </div>
              {errors.password && <small className="field-error" id="login-password-error">{errors.password.message}</small>}
            </div>
            {submitError && <p className="form-alert" role="alert">{submitError}</p>}
            <button className="button button--primary auth-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? <><Loader2 size={16} className="spin" /> Signing in…</> : 'Sign in'}</button>
          </form>
          <p className="auth-switch">New to OpsBoard? <Link to="/register">Create an account</Link></p>
        </div>
      </section>
    </main>
  );
}
