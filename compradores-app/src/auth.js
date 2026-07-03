import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, setToken } from './api';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [carregando, setCarregando] = useState(true);
  const [usuario, setUsuario] = useState(null);
  const [filial, setFilial] = useState(null);

  // Restaura sessão salva
  useEffect(() => {
    (async () => {
      try {
        const t = await AsyncStorage.getItem('token');
        const u = await AsyncStorage.getItem('usuario');
        const f = await AsyncStorage.getItem('filial');
        if (t) setToken(t);
        if (u) setUsuario(JSON.parse(u));
        if (f) setFilial(JSON.parse(f));
      } catch {}
      setCarregando(false);
    })();
  }, []);

  async function login(email, senha) {
    const { data } = await api.post('/auth/login', { email, password: senha });
    setToken(data.token);
    await AsyncStorage.setItem('token', data.token);
    await AsyncStorage.setItem('usuario', JSON.stringify(data.usuario));
    setUsuario(data.usuario);

    // Filial: usa a do usuário, senão busca a primeira ativa
    let fil = (data.usuario.filiais && data.usuario.filiais[0]) || null;
    if (!fil) {
      try { const r = await api.get('/filiais'); fil = (r.data || [])[0] || null; } catch {}
    }
    if (fil) { setFilial(fil); await AsyncStorage.setItem('filial', JSON.stringify(fil)); }
    return data;
  }

  async function logout() {
    setToken(null);
    setUsuario(null); setFilial(null);
    await AsyncStorage.multiRemove(['token', 'usuario', 'filial']);
  }

  return (
    <AuthCtx.Provider value={{ carregando, usuario, filial, login, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}
