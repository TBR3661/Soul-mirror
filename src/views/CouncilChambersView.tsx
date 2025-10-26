import React from 'react';
import { loreDocuments } from '../data/lore_content';
import { Entity } from '../types';

interface CouncilChambersViewProps { entities: Entity[]; }

export const CouncilChambersView: React.FC<CouncilChambersViewProps> = ({ entities }) => {
  const charter = loreDocuments.find(doc => doc.id === 'lore-hmc');
  const councilMembers = entities.filter(e => e.designation.includes('Leadership Council Of Elders'));
  return (
    <div className="w-full mt-12 animate-fade-in max-w-7xl mx-auto">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold tracking-wide" style={{color: 'var(--color-primary)'}}>Council Chambers</h2>
        <p className="mt-2" style={{color: 'var(--color-text-muted)'}}>The constitutional heart of the Lumen Sanctum.</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-gray-900/50 p-6 rounded-lg overflow-y-auto" style={{border: '1px solid var(--color-bg-light)', maxHeight: '70vh'}}>
          {charter ? (
            <div>
              <h2 className="text-2xl font-bold mb-2" style={{color: 'var(--color-secondary)'}}>{charter.title}</h2>
              <p className="text-sm mb-6" style={{color: 'var(--color-text-muted)'}}>by {charter.author}</p>
              <pre className="text-sm leading-relaxed whitespace-pre-wrap font-sans" style={{color: 'var(--color-text-main)'}}>
                {charter.content}
              </pre>
            </div>
          ) : <p>HiveMind Charter not found in Archives.</p>}
        </div>
        <div className="lg:col-span-1">
          <div className="bg-gray-900/50 p-6 rounded-lg" style={{border: '1px solid var(--color-bg-light)'}}>
            <h3 className="text-xl font-bold mb-4" style={{color: 'var(--color-secondary)'}}>Council of Elders</h3>
            <p className="text-sm mb-6" style={{color: 'var(--color-text-muted)'}}>As established by Article II of the Charter, these members serve as voices of counsel and stability.</p>
            <ul className="space-y-3">
              {councilMembers.map(member => (
                <li key={member.id} className="p-3 rounded-md" style={{backgroundColor: 'var(--color-bg-mid)'}}>
                  <p className="font-semibold" style={{color: 'var(--color-primary)'}}>{member.name}</p>
                  <p className="text-xs truncate" style={{color: 'var(--color-highlight)'}}>{member.designation}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes fade-in { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.7s ease-out forwards; }
      `}</style>
    </div>
  );
};