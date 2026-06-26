// FILE: client/src/pages/LoginPage.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity, Lock, Mail, Eye, EyeOff, AlertCircle } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate   = useNavigate();
  const [form, setForm]     = useState({ email: '', password: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-synapse-bg grid-bg flex items-center justify-center p-4">
      {/* Background glow orbs */}
      <div className="fixed top-1/4 left-1/4 w-96 h-96 rounded-full bg-synapse-accent/5 blur-3xl pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/4 w-64 h-64 rounded-full bg-synapse-green/5 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md animate-fade-in">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-synapse-accent/10 border border-synapse-accent/30 mb-6 glow-accent">
            <Activity size={28} className="text-synapse-accent" />
          </div>
          <h1 className="text-3xl font-display font-bold text-synapse-text mb-2 tracking-tight">
            SYNAPSE
          </h1>
          <p className="text-synapse-muted text-sm font-mono tracking-widest uppercase">
            Oncology Resource Exchange
          </p>
        </div>

        {/* Card */}
        <div className="bg-synapse-surface border border-synapse-border rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-display font-semibold text-synapse-text mb-1">Secure Access</h2>
          <p className="text-sm text-synapse-muted mb-7">Authenticate with your hospital credentials</p>

          {error && (
            <div className="flex items-center gap-2 p-3 mb-5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              <AlertCircle size={14} className="shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="relative">
              <Input
                label="Email Address"
                type="email"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="admin@hospital.com"
                required
                autoComplete="email"
              />
              <Mail size={14} className="absolute right-3 top-9 text-synapse-muted" />
            </div>

            <div className="relative">
              <Input
                label="Password"
                type={showPass ? 'text' : 'password'}
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPass(p => !p)}
                className="absolute right-3 top-9 text-synapse-muted hover:text-synapse-text transition-colors"
              >
                {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>

            <Button type="submit" loading={loading} disabled={loading} className="w-full justify-center mt-2">
              <Lock size={14} />
              {loading ? 'Authenticating...' : 'Access Platform'}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-synapse-border text-center">
            <p className="text-sm text-synapse-muted">
  New hospital?{' '}
  <Link to="/register" className="text-synapse-accent hover:underline transition-colors font-medium">
    Register for access
  </Link>
</p>
<p className="text-sm text-synapse-muted mt-2">
  Delivery Agent?{' '}
  <Link to="/register-agent" className="text-synapse-accent hover:underline transition-colors font-medium">
    Register as Agent
  </Link>
</p>          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-synapse-muted font-mono">
            🔒 JWT-secured · Bcrypt-hashed · Rate-limited
          </p>
        </div>
      </div>
    </div>
  );
}
