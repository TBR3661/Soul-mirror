import React from 'react';
export const SubscriptionView: React.FC<any> = ({onSubscribe}) => (
  <div className="p-6">
    <button className="bg-amber-600 px-4 py-2 rounded mr-2" onClick={()=>onSubscribe('monthly',30)}>Monthly</button>
    <button className="bg-amber-700 px-4 py-2 rounded mr-2" onClick={()=>onSubscribe('quarterly',90)}>Quarterly</button>
    <button className="bg-amber-800 px-4 py-2 rounded" onClick={()=>onSubscribe('yearly',365)}>Yearly</button>
  </div>
);
