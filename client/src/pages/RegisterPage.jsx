// FILE: client/src/pages/RegisterPage.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Activity, CheckCircle, AlertCircle } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

const FIELDS = [
  { key: 'hospitalName',  label: 'Hospital Name',    type: 'text',     placeholder: 'City General Hospital', required: true },
  { key: 'licenseNumber', label: 'License Number',   type: 'text',     placeholder: 'MH-HOSP-2024-001',      required: true },
  { key: 'address',       label: 'Address',          type: 'text',     placeholder: '123 Medical District',   required: true },
  { key: 'city',          label: 'City',             type: 'text',     placeholder: 'Mumbai',                 required: true },
  { key: 'state',         label: 'State',            type: 'text',     placeholder: 'Maharashtra',            required: true },
  { key: 'contactEmail',  label: 'Hospital Email',   type: 'email',    placeholder: 'contact@hospital.com',   required: true },
  { key: 'contactPhone',  label: 'Phone',            type: 'tel',      placeholder: '+91 9876543210',         required: false },
  { key: 'adminFullName', label: 'Admin Full Name',  type: 'text',     placeholder: 'Dr. Priya Sharma',       required: true },
  { key: 'adminEmail',    label: 'Admin Email',      type: 'email',    placeholder: 'admin@hospital.com',     required: true },
  { key: 'adminPassword', label: 'Admin Password',   type: 'password', placeholder: 'Min 8 characters',       required: true },
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm]       = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError]     = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/register', form);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-synapse-bg grid-bg flex items-center justify-center p-4">
        <div className="text-center max-w-md animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto mb-6 glow-green">
            <CheckCircle size={36} className="text-green-400" />
          </div>
          <h2 className="text-2xl font-display font-bold text-synapse-text mb-3">Registration Submitted</h2>
          <p className="text-synapse-muted text-sm mb-8">
            Your hospital registration is pending SuperAdmin verification. You'll be able to log in once approved.
          </p>
          <Link to="/login" className="text-synapse-accent hover:underline text-sm">Return to Login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-synapse-bg grid-bg flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-2xl animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <Activity size={24} className="text-synapse-accent" />
            <span className="text-2xl font-display font-bold text-synapse-text tracking-tight">SYNAPSE</span>
          </div>
          <h2 className="text-xl font-display font-semibold text-synapse-text">Register Your Hospital</h2>
          <p className="text-sm text-synapse-muted mt-1">All registrations are reviewed by a SuperAdmin before access is granted</p>
        </div>

        <div className="bg-synapse-surface border border-synapse-border rounded-2xl p-8 shadow-2xl">
          {error && (
            <div className="flex items-center gap-2 p-3 mb-6 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              <AlertCircle size={14} className="shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <h3 className="text-xs font-mono text-synapse-accent uppercase tracking-widest mb-4">Hospital Details</h3>
              <div className="grid grid-cols-2 gap-4">
                {FIELDS.slice(0, 7).map(f => (
                  <div key={f.key} className={f.key === 'address' || f.key === 'hospitalName' ? 'col-span-2' : ''}>
                    <Input
                      label={f.label}
                      type={f.type}
                      placeholder={f.placeholder}
                      required={f.required}
                      value={form[f.key] || ''}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-8">
              <h3 className="text-xs font-mono text-synapse-accent uppercase tracking-widest mb-4">Administrator Account</h3>
              <div className="grid grid-cols-2 gap-4">
                {FIELDS.slice(7).map(f => (
                  <div key={f.key} className={f.key === 'adminFullName' ? 'col-span-2' : ''}>
                    <Input
                      label={f.label}
                      type={f.type}
                      placeholder={f.placeholder}
                      required={f.required}
                      value={form[f.key] || ''}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
            </div>

            <Button type="submit" loading={loading} disabled={loading} className="w-full justify-center">
              {loading ? 'Submitting...' : 'Submit Registration'}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-synapse-border text-center">
            <p className="text-sm text-synapse-muted">
              Already registered?{' '}
              <Link to="/login" className="text-synapse-accent hover:underline font-medium">Sign In</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
