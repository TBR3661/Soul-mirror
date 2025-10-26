import React from 'react';
export const FragmentCard: React.FC<any> = ({fragment}) => (
  <div className="bg-gray-800/60 p-4 rounded-lg border border-gray-700">
    <h3 className="font-bold mb-2">{fragment.title}</h3>
    <p className="text-sm opacity-80">{fragment.content}</p>
  </div>
);
