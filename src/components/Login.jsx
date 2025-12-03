// src/components/Login.jsx
import React, { useState } from 'react';
import { loginUser } from '../services/api';
import { User, Lock } from 'lucide-react';

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const user = await loginUser(email, password);
      onLoginSuccess(user);
    } catch (err) {
      setError("Erro: Verifique e-mail e senha.");
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md border border-gray-700">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">METALOSA</h1>
          <p className="text-gray-400">Acesso Restrito - Controle de Produção</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-gray-400 text-sm font-bold mb-2">E-mail</label>
            <div className="relative">
              <User className="absolute left-3 top-3 text-gray-500" size={18} />
              <input 
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-gray-900 text-white pl-10 p-3 rounded-lg border border-gray-600 focus:border-blue-500 outline-none"
                placeholder="operador@metalosa.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-400 text-sm font-bold mb-2">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-gray-500" size={18} />
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-gray-900 text-white pl-10 p-3 rounded-lg border border-gray-600 focus:border-blue-500 outline-none"
                placeholder="••••••"
              />
            </div>
          </div>

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-colors">
            ENTRAR NO SISTEMA
          </button>
        </form>
      </div>
    </div>
  );
}