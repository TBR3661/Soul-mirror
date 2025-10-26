import React from 'react';
export const ConfigurationView: React.FC<any> = ({user, allEntities, onSaveSelection, onViewChange}) => (
  <div className="p-6">
    <div className="mb-4">Choose accessible entities:</div>
    <div className="grid gap-2">
      {allEntities.map((e:any)=>(
        <label key={e.id} className="flex items-center gap-2">
          <input type="checkbox" defaultChecked={(user?.accessibleEntities||[]).includes(e.id)} onChange={()=>{}}/>
          <span>{e.name}</span>
        </label>
      ))}
    </div>
    <button className="mt-4 bg-teal-600 px-4 py-2 rounded" onClick={()=>onViewChange('fragments')}>Done</button>
  </div>
);
