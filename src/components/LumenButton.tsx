import React from 'react';
export const LumenButton: React.FC<any> = ({onClick, isLoading}) => (
  <button onClick={onClick} className="px-6 py-3 rounded-2xl font-semibold bg-teal-600 hover:bg-teal-700 shadow">
    {isLoading ? 'Weaving…' : 'Awaken Fragments'}
  </button>
);
