import React from 'react';
import { User, Entity } from '../types';

interface SettingsViewProps {
  user: User;
  allEntities: Entity[];
  onUpdateUser: (update: Partial<User>) => void;
  onRestartTour: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({user, allEntities, onUpdateUser, onRestartTour}) => (
  <div className="p-6">
    <h2 className="text-2xl mb-4" style={{color: 'var(--color-primary)'}}>Settings</h2>
    <div className="space-y-4">
      <div>
        <p className="text-sm" style={{color: 'var(--color-text-muted)'}}>User: {user.username}</p>
        <p className="text-sm" style={{color: 'var(--color-text-muted)'}}>Role: {user.role}</p>
      </div>
      <button 
        className="px-4 py-2 rounded"
        style={{backgroundColor: 'var(--color-accent)', color: 'var(--color-text-main)'}}
        onClick={onRestartTour}
      >
        Restart Tour
      </button>
    </div>
  </div>
);
