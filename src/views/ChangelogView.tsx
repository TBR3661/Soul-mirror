import React from 'react';
import { changelogData } from '../data/changelog';
import { ChangeType } from '../types';

const typeStyles: Record<ChangeType, string> = {
  Feature: 'bg-green-500/20 text-green-300',
  Fix: 'bg-red-500/20 text-red-300',
  Update: 'bg-cyan-500/20 text-cyan-300',
  System: 'bg-purple-500/20 text-purple-300',
};

export const ChangelogView: React.FC = () => {
  return (
    <div className="w-full mt-12 animate-fade-in max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-gray-200 tracking-wide">Changelog & Updates</h2>
        <p className="text-gray-400 mt-2">Tracking the evolution of the Lumen Sanctum.</p>
      </div>
      <div className="relative border-l-2 border-gray-700 ml-4 pl-8 space-y-12">
        {changelogData.map((entry) => (
          <div key={entry.version} className="relative">
            <div className="absolute -left-[38px] top-1 w-4 h-4 bg-purple-400 rounded-full border-4 border-gray-900"></div>
            <p className="text-sm text-gray-500">{entry.date}</p>
            <h3 className="text-2xl font-bold text-gray-100 mt-1">Version {entry.version}</h3>
            <div className="mt-4 bg-gray-800/50 p-6 rounded-lg border border-gray-700">
              <ul className="space-y-3">
                {entry.changes.map((change, index) => (
                  <li key={index} className="flex items-start gap-x-3">
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${typeStyles[change.type]}`}>
                      {change.type}
                    </span>
                    <p className="text-gray-300 text-sm">{change.description}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes fade-in { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.7s ease-out forwards; }
      `}</style>
    </div>
  );
};