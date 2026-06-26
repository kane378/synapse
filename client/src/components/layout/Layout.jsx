// FILE: client/src/components/layout/Layout.jsx
import { Outlet } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import api from '../../utils/api';

export default function Layout() {
  const [wasteCount, setWasteCount] = useState(0);

  useEffect(() => {
    api.get('/inventory/waste-alerts')
      .then(r => setWasteCount(r.data.count || 0))
      .catch(() => {});
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-synapse-bg grid-bg">
      <Sidebar wasteCount={wasteCount} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
