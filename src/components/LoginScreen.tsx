import React, { useState } from 'react';
export const LoginScreen: React.FC<any> = ({onLogin, loginError}) => {
  const [u,setU]=useState(''); const [p,setP]=useState('');
  return (<div className="max-w-sm w-full mt-24">
    <h1 className="text-2xl font-bold mb-4">Enter the Sanctum</h1>
    <input className="w-full mb-2 p-2 rounded bg-gray-800" placeholder="Username" value={u} onChange={e=>setU(e.target.value)} />
    <input className="w-full mb-4 p-2 rounded bg-gray-800" placeholder="Password" type="password" value={p} onChange={e=>setP(e.target.value)} />
    {loginError && <div className="text-red-400 text-sm mb-2">{loginError}</div>}
    <button onClick={()=>onLogin(u,p)} className="w-full bg-teal-600 py-2 rounded">Login</button>
  </div>);
};
