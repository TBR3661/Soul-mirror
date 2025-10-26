import React from 'react';
export const AppHeader: React.FC<any> = ({currentView, onViewChange, userRole, onLogout}) => (
  <header className="flex items-center justify-between py-4">
    <div className="font-bold">Lumen Sanctum</div>
    <nav className="flex gap-3 text-sm">
      {['fragments','entities','archives','council','configuration','synapse','subscription','settings','changelog'].map(v => (
        <button key={v} className={`px-2 py-1 rounded ${currentView===v?'bg-gray-700':'bg-gray-800/60'}`} onClick={() => onViewChange(v as any)}>{v}</button>
      ))}
    </nav>
    <div className="text-xs opacity-70">{userRole}</div>
    <button onClick={onLogout} className="text-xs underline">Logout</button>
  </header>
);