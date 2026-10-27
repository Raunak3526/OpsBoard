import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, CheckCircle2, Command, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../context/AuthContext.jsx';
import { Field } from '../components/ui.jsx';

const schema = z.object({
  name: z.string().trim().min(1, { message: 'Enter your name.' }),
  email: z.string().email({ message: 'Enter a valid email address.' }),
  password: z.string().min(6, { message: 'Use at least 6 characters.' }),
});

export default function Register() {
  const { register: registerUser } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (data) => {
    setSubmitError('');
    try {
      await registerUser(data.name, data.email, data.password);
    } catch (error) {
      const detail = error.response?.data?.error;
      setSubmitError(typeof detail === 'string' ? detail : 'We could not create your account. Check your details and try again.');
    }
  };

  return (
    <main className="auth-layout">
      <section className="auth-brand-panel">
        <div className="auth-brand"><span className="brand-mark"><Command size={18} /></span><span>opsboard</span></div>
        <div className="auth-pitch">
          <h1>Make the next release your smoothest yet.</h1>
          <p>Give your engineering team a shared place to respond to incidents and deliver with confidence.</p>
          <div className="auth-feature"><CheckCircle2 size={17} /> Keep incident response in context</div>
          <div className="auth-feature"><Activity size={17} /> Know what is ready before it ships</div>
        </div>
        <div className="auth-footer">A calm command center for engineering teams.</div>
      </section>
      <section className="auth-form-panel">
        <div className="auth-form-wrap">
          <div className="auth-mobile-brand"><span className="brand-mark"><Command size={17} /></span><strong>opsboard</strong></div>
          <h2>Create your account</h2>
          <p className="auth-subtitle">Set up your profile to join the engineering workspace.</p>
          <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
            <Field label="Full name" error={errors.name?.message} {...register('name')} autoComplete="name" placeholder="Your name" />
            <Field label="Work email" error={errors.email?.message} {...register('email')} type="email" autoComplete="email" placeholder="you@company.com" />
            <div className="form-field">
              <label htmlFor="register-password">Password</label>
              <div className="password-wrap">
                <input id="register-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="At least 6 characters" {...register('password')} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'register-password-error' : undefined} />
                <button className="icon-button password-toggle" type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
              </div>
              {errors.password && <small className="field-error" id="register-password-error">{errors.password.message}</small>}
            </div>
            {submitError && <p className="form-alert" role="alert">{submitError}</p>}
            <button className="button button--primary auth-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? <><Loader2 size={16} className="spin" /> Creating account…</> : 'Create account'}</button>
          </form>
          <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
        </div>
      </section>
    </main>
  );
}
