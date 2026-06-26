// FILE: client/src/components/layout/Sidebar.jsx
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Activity, Package, ArrowLeftRight, AlertTriangle,
  Building2, LogOut, Shield, ChevronRight, Truck, Map, Users,
} from 'lucide-react';
import NotificationBell from './NotificationBell';

const NavItem = ({ to, icon: Icon, label, badge }) => (
  <NavLink to={to}
    className={({ isActive }) =>
      `group flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200
       ${isActive
         ? 'bg-synapse-accent/10 text-synapse-accent border border-synapse-accent/30 glow-accent'
         : 'text-synapse-muted hover:text-synapse-text hover:bg-white/5 border border-transparent'
       }`
    }
  >
    <Icon size={16} className="shrink-0" />
    <span className="flex-1">{label}</span>
    {badge != null && badge > 0 && (
      <span className="px-1.5 py-0.5 text-xs font-mono bg-red-500/20 text-red-400 border border-red-500/30 rounded">
        {badge}
      </span>
    )}
    <ChevronRight size={12} className="opacity-0 group-hover:opacity-50 transition-opacity" />
  </NavLink>
);

export default function Sidebar({ wasteCount = 0 }) {
  const { user, logout, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const isAgent = user?.role === 'DeliveryAgent';

  return (
    <aside className="w-64 shrink-0 flex flex-col bg-synapse-surface border-r border-synapse-border">
      {/* Logo */}
      <div className="p-6 border-b border-synapse-border">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-lg bg-synapse-accent/10 border border-synapse-accent/40 flex items-center justify-center">
              <Activity size={18} className="text-synapse-accent" />
            </div>
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-synapse-green rounded-full border-2 border-synapse-surface" />
          </div>
          <div>
            <div className="font-display font-bold text-synapse-text tracking-tight text-lg">SYNAPSE</div>
            <div className="text-xs text-synapse-muted font-mono tracking-widest">
              {isAgent ? 'AGENT PORTAL' : 'ONCOLOGY EXCHANGE'}
            </div>
          </div>
        </div>
      </div>

      {/* User info */}
      <div className="p-4 border-b border-synapse-border">
        <div className="bg-synapse-card rounded-lg p-3 border border-synapse-border">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Shield size={12} className={
                isSuperAdmin ? 'text-synapse-accent' :
                isAgent ? 'text-yellow-400' :
                'text-synapse-green'
              } />
              <span className="text-xs font-mono text-synapse-muted uppercase tracking-widest">{user?.role}</span>
            </div>
            {!isAgent && <NotificationBell />}
          </div>
          <div className="text-sm font-medium text-synapse-text truncate">
            {user?.fullName || user?.full_name || user?.email}
          </div>
          {(user?.hospitalName || user?.hospital_name) && (
            <div className="text-xs text-synapse-muted truncate mt-0.5">
              {user?.hospitalName || user?.hospital_name}
            </div>
          )}
          {isAgent && user?.agentProfile && (
            <div className="text-xs text-synapse-muted truncate mt-0.5">
              {user.agentProfile.service_city}, {user.agentProfile.service_state}
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {/* Delivery Agent navigation */}
        {isAgent ? (
          <>
            <div className="text-xs font-mono text-synapse-muted uppercase tracking-widest mb-3 px-1">Agent Portal</div>
            <NavItem to="/my-deliveries" icon={Truck} label="My Deliveries" />
            <NavItem to="/map"           icon={Map}   label="Hospital Map" />
          </>
        ) : (
          <>
            <div className="text-xs font-mono text-synapse-muted uppercase tracking-widest mb-3 px-1">Navigation</div>
            <NavItem to="/dashboard"    icon={Activity}       label="Command Center" />
            <NavItem to="/inventory"    icon={Package}        label="Inventory" />
            <NavItem to="/transfers"    icon={ArrowLeftRight} label="Transfers" />
            <NavItem to="/deliveries"   icon={Truck}          label="Deliveries" />
            <NavItem to="/waste-alerts" icon={AlertTriangle}  label="Waste Alerts" badge={wasteCount} />
            <NavItem to="/map"          icon={Map}            label="Hospital Map" />

            {isSuperAdmin && (
              <>
                <div className="text-xs font-mono text-synapse-muted uppercase tracking-widest mb-3 mt-5 px-1">Administration</div>
                <NavItem to="/hospitals" icon={Building2} label="Hospitals" />
                <NavItem to="/agents"    icon={Users}     label="Delivery Agents" />
              </>
            )}
          </>
        )}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-synapse-border">
        <button onClick={() => { logout(); navigate('/login'); }}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-synapse-muted hover:text-red-400 hover:bg-red-500/5 border border-transparent hover:border-red-500/20 transition-all duration-200">
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
