// FILE: client/src/pages/AgentRegisterPage.jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { INDIA_STATES, CITIES_BY_STATE, VEHICLE_TYPES } from '../utils/indiaData';
import { Truck, CheckCircle, AlertCircle, Activity } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

export default function AgentRegisterPage() {
  const [form, setForm]       = useState({ serviceState: '', serviceCity: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError]     = useState('');

  const cities = form.serviceState ? (CITIES_BY_STATE[form.serviceState] || []) : [];

  const handleStateChange = (e) => {
    setForm(p => ({ ...p, serviceState: e.target.value, serviceCity: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/agents/register', {
        fullName:     form.fullName,
        phone:        form.phone,
        email:        form.email,
        password:     form.password,
        vehicleType:  form.vehicleType,
        serviceCity:  form.serviceCity,
        serviceState: form.serviceState,
      });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const f = (key) => ({
    value: form[key] || '',
    onChange: e => setForm(p => ({ ...p, [key]: e.target.value })),
  });

  if (success) {
    return (
      <div className="min-h-screen bg-synapse-bg grid-bg flex items-center justify-center p-4">
        <div className="text-center max-w-md animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={36} className="text-green-400" />
          </div>
          <h2 className="text-2xl font-display font-bold text-synapse-text mb-3">Registration Submitted!</h2>
          <p className="text-synapse-muted text-sm mb-6">
            Your delivery agent profile is pending SuperAdmin verification.
            You'll be able to login once approved.
          </p>
          <Link to="/login" className="text-synapse-accent hover:underline text-sm">Go to Login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-synapse-bg grid-bg flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-xl animate-fade-in">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <Activity size={24} className="text-synapse-accent" />
            <span className="text-2xl font-display font-bold text-synapse-text tracking-tight">SYNAPSE</span>
          </div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Truck size={20} className="text-synapse-green" />
            <h2 className="text-xl font-display font-semibold text-synapse-text">Delivery Agent Registration</h2>
          </div>
          <p className="text-sm text-synapse-muted">Register to deliver medicines between hospitals</p>
        </div>

        <div className="bg-synapse-surface border border-synapse-border rounded-2xl p-8 shadow-2xl">
          {error && (
            <div className="flex items-center gap-2 p-3 mb-6 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              <AlertCircle size={14} className="shrink-0" /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Personal Details */}
            <div>
              <div className="text-xs font-mono text-synapse-accent uppercase tracking-widest mb-4">Personal Details</div>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Input label="Full Name" required placeholder="Rahul Kumar" {...f('fullName')} />
                </div>
                <Input label="Phone Number" required placeholder="9876543210" type="tel" {...f('phone')} />
                <Input label="Email" required placeholder="rahul@gmail.com" type="email" {...f('email')} />
                <div className="col-span-2">
                  <Input label="Password (min 6 chars)" required placeholder="••••••••" type="password" {...f('password')} />
                </div>
              </div>
            </div>

            {/* Vehicle */}
            <div>
              <div className="text-xs font-mono text-synapse-accent uppercase tracking-widest mb-3">Vehicle Type</div>
              <div className="grid grid-cols-1 gap-2">
                {VEHICLE_TYPES.map(v => (
                  <button
                    key={v.value}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, vehicleType: v.value }))}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                      form.vehicleType === v.value
                        ? 'border-synapse-accent/60 bg-synapse-accent/10'
                        : 'border-synapse-border bg-synapse-bg hover:border-synapse-accent/30'
                    }`}
                  >
                    <span className="text-xl">{v.label.split(' ')[0]}</span>
                    <div>
                      <div className="text-sm font-medium text-synapse-text">{v.label.split(' ').slice(1).join(' ')}</div>
                      <div className="text-xs text-synapse-muted">{v.desc}</div>
                    </div>
                    {form.vehicleType === v.value && (
                      <CheckCircle size={16} className="text-synapse-accent ml-auto" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Service Area */}
            <div>
              <div className="text-xs font-mono text-synapse-accent uppercase tracking-widest mb-3">Service Area</div>
              <div className="grid grid-cols-2 gap-4">
                {/* State dropdown */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-mono text-synapse-muted uppercase tracking-widest">State</label>
                  <select
                    value={form.serviceState}
                    onChange={handleStateChange}
                    required
                    className="w-full bg-synapse-bg border border-synapse-border rounded-lg px-3 py-2.5 text-sm text-synapse-text focus:outline-none focus:border-synapse-accent"
                  >
                    <option value="">Select State</option>
                    {INDIA_STATES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {/* City dropdown — auto-fills based on state */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-mono text-synapse-muted uppercase tracking-widest">
                    City {form.serviceState && <span className="text-synapse-accent normal-case">({cities.length} cities)</span>}
                  </label>
                  <select
                    value={form.serviceCity}
                    onChange={e => setForm(p => ({ ...p, serviceCity: e.target.value }))}
                    required
                    disabled={!form.serviceState}
                    className="w-full bg-synapse-bg border border-synapse-border rounded-lg px-3 py-2.5 text-sm text-synapse-text focus:outline-none focus:border-synapse-accent disabled:opacity-50"
                  >
                    <option value="">Select City</option>
                    {cities.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  {!form.serviceState && (
                    <span className="text-xs text-synapse-muted">Select state first</span>
                  )}
                </div>
              </div>
            </div>

            <Button
              type="submit"
              loading={loading}
              disabled={loading || !form.vehicleType || !form.serviceState || !form.serviceCity}
              className="w-full justify-center mt-2"
            >
              <Truck size={14} /> Submit Registration
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-synapse-border text-center space-y-2">
            <p className="text-sm text-synapse-muted">
              Already registered?{' '}
              <Link to="/login" className="text-synapse-accent hover:underline font-medium">Sign In</Link>
            </p>
            <p className="text-sm text-synapse-muted">
              Hospital?{' '}
              <Link to="/register" className="text-synapse-accent hover:underline font-medium">Register Hospital</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
