// FILE: client/src/pages/DashboardPage.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import StatCard from '../components/ui/StatCard';
import { Activity, Package, AlertTriangle, ArrowLeftRight, Building2, TrendingUp } from 'lucide-react';

export default function DashboardPage() {
  const { user, isSuperAdmin } = useAuth();
  const [stats, setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/hospitals/stats')
      .then(r => setStats(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const now = new Date().toLocaleString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-synapse-green animate-pulse" />
            <span className="text-xs font-mono text-synapse-muted uppercase tracking-widest">System Online</span>
          </div>
          <h1 className="text-3xl font-display font-bold text-synapse-text tracking-tight">
            Command Center
          </h1>
          <p className="text-synapse-muted text-sm mt-1">
            Welcome back, <span className="text-synapse-accent">{user?.fullName}</span>
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs font-mono text-synapse-muted">{now}</div>
          <div className="text-xs font-mono text-synapse-accent mt-1">{user?.role}</div>
        </div>
      </div>

      {/* Stats Grid */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 rounded-xl bg-synapse-surface border border-synapse-border animate-pulse" />
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Drug Items"
            value={stats.inventory?.total_items ?? '—'}
            sub={`${stats.inventory?.total_units ?? 0} total units`}
            icon={Package}
            color="accent"
          />
          <StatCard
            label="Expiring Soon"
            value={stats.inventory?.expiring_soon ?? '—'}
            sub="Within 30 days"
            icon={AlertTriangle}
            color="yellow"
          />
          <StatCard
            label="Critical Expiry"
            value={stats.inventory?.critical_expiry ?? '—'}
            sub="Within 7 days"
            icon={AlertTriangle}
            color="red"
          />
          <StatCard
            label="Pending Transfers"
            value={stats.transfers?.pending ?? '—'}
            sub={`${stats.transfers?.completed ?? 0} completed total`}
            icon={ArrowLeftRight}
            color="green"
          />
          {isSuperAdmin && stats.hospitals && (
            <>
              <StatCard
                label="Verified Hospitals"
                value={stats.hospitals?.verified ?? '—'}
                sub={`${stats.hospitals?.total ?? 0} total registered`}
                icon={Building2}
                color="accent"
              />
              <StatCard
                label="Approved Transfers"
                value={stats.transfers?.approved ?? '—'}
                sub="Awaiting completion"
                icon={TrendingUp}
                color="green"
              />
            </>
          )}
        </div>
      ) : null}

      {/* Waste Alert Banner */}
      {stats && parseInt(stats.wasteAlerts) > 0 && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-5 flex items-center gap-4 animate-slide-up">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
              <AlertTriangle size={20} className="text-red-400" />
            </div>
            <div className="absolute inset-0 rounded-full bg-red-500/20 ping-slow" />
          </div>
          <div className="flex-1">
            <h3 className="font-display font-semibold text-red-400 text-sm">
              WASTE ALERT — {stats.wasteAlerts} items expiring within 30 days
            </h3>
            <p className="text-xs text-synapse-muted mt-0.5">
              Immediate transfer action required to prevent drug wastage.
            </p>
          </div>
          <a
            href="/waste-alerts"
            className="px-4 py-2 text-xs font-mono border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/10 transition-colors"
          >
            VIEW ALERTS →
          </a>
        </div>
      )}

      {/* Activity section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-synapse-surface border border-synapse-border rounded-xl p-6">
          <h3 className="text-sm font-display font-semibold text-synapse-text mb-4 flex items-center gap-2">
            <Activity size={14} className="text-synapse-accent" />
            Transfer Overview
          </h3>
          <div className="space-y-3">
            {[
              { label: 'Pending Approval', value: stats?.transfers?.pending ?? 0, color: 'text-yellow-400' },
              { label: 'Approved / In Transit', value: stats?.transfers?.approved ?? 0, color: 'text-blue-400' },
              { label: 'Completed', value: stats?.transfers?.completed ?? 0, color: 'text-green-400' },
              { label: 'Total Requests', value: stats?.transfers?.total ?? 0, color: 'text-synapse-accent' },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between py-2 border-b border-synapse-border/50 last:border-0">
                <span className="text-sm text-synapse-muted">{item.label}</span>
                <span className={`font-display font-bold font-mono text-lg ${item.color}`}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-synapse-surface border border-synapse-border rounded-xl p-6">
          <h3 className="text-sm font-display font-semibold text-synapse-text mb-4 flex items-center gap-2">
            <Package size={14} className="text-synapse-accent" />
            Inventory Health
          </h3>
          <div className="space-y-4">
            {[
              { label: 'Safe (>30 days)', pct: Math.round(((stats?.inventory?.total_items ?? 0) - (stats?.inventory?.expiring_soon ?? 0)) / Math.max(stats?.inventory?.total_items ?? 1, 1) * 100), color: 'bg-green-500' },
              { label: 'Warning (≤30 days)', pct: Math.round(((stats?.inventory?.expiring_soon ?? 0) - (stats?.inventory?.critical_expiry ?? 0)) / Math.max(stats?.inventory?.total_items ?? 1, 1) * 100), color: 'bg-yellow-500' },
              { label: 'Critical (≤7 days)', pct: Math.round((stats?.inventory?.critical_expiry ?? 0) / Math.max(stats?.inventory?.total_items ?? 1, 1) * 100), color: 'bg-red-500' },
            ].map(item => (
              <div key={item.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-synapse-muted">{item.label}</span>
                  <span className="text-synapse-text font-mono">{item.pct}%</span>
                </div>
                <div className="h-1.5 bg-synapse-bg rounded-full overflow-hidden">
                  <div className={`h-full ${item.color} rounded-full transition-all duration-700`} style={{ width: `${item.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
