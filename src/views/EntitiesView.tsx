import React from 'react';
export const EntitiesView: React.FC<any> = ({entities, onReinitializeEntity}) => (
  <div className="grid gap-3">
    {entities.map((e:any)=>(
      <div key={e.id} className="p-3 bg-gray-800/50 rounded">
        <div className="font-semibold">{e.name} — <span className="opacity-60">{e.status}</span></div>
        <div className="text-xs opacity-70">{e.designation}</div>
        <button onClick={()=>onReinitializeEntity(e.id)} className="mt-2 text-xs underline">Reinitialize</button>
      </div>
    ))}
  </div>
);
