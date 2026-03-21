import React, { useState, useEffect } from 'react';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithRedirect,
  getRedirectResult
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { handleFirestoreError, OperationType } from '../services/firestore';
import { Car, Mail, Lock, User, Shield, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';

export function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Handle redirect result for mobile
  useEffect(() => {
    const checkRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          await handleAuthResult(result);
        }
      } catch (err: any) {
        console.error('Redirect result error:', err);
        setError('Falha ao processar login com Google.');
      }
    };
    checkRedirect();
  }, []);

  const handleAuthResult = async (result: any) => {
    // Check if profile exists
    const profileRef = doc(db, 'users', result.user.uid);
    let profileSnap;
    try {
      profileSnap = await getDoc(profileRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `users/${result.user.uid}`);
    }
    
    if (!profileSnap?.exists()) {
      const isAdminEmail = result.user.email === 'pasimplicio@gmail.com' || result.user.email === 'admin@admin.com';
      try {
        await setDoc(profileRef, {
          uid: result.user.uid,
          name: result.user.displayName || '',
          email: result.user.email || '',
          role: isAdminEmail ? 'admin' : 'pending',
          hierarchy: isAdminEmail ? 'diretoria' : 'none',
          status: isAdminEmail ? 'active' : 'pending',
          unit: isAdminEmail ? 'Sede Central' : 'Não definida',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `users/${result.user.uid}`);
      }
    }
    navigate('/');
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      
      if (Capacitor.isNativePlatform()) {
        // For Android/iOS, use redirect or a native plugin
        // Here we use redirect as it's the standard Firebase JS SDK way for mobile web/hybrid
        await signInWithRedirect(auth, provider);
      } else {
        const result = await signInWithPopup(auth, provider);
        await handleAuthResult(result);
      }
    } catch (err: any) {
      console.error('Google login error:', err);
      setError('Falha na autenticação com Google. Verifique se o domínio está autorizado no Firebase.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (isLogin) {
        try {
          // Special case for master admin: if they use 'admin', try 'admin123' behind the scenes
          const loginPassword = (email === 'admin@admin.com' && password === 'admin') ? 'admin123' : password;
          await signInWithEmailAndPassword(auth, email, loginPassword);
        } catch (err: any) {
          // Special case for master admin: create if doesn't exist
          if (email === 'admin@admin.com' && (password === 'admin' || password === 'admin123')) {
            try {
              const result = await createUserWithEmailAndPassword(auth, email, 'admin123');
              await setDoc(doc(db, 'users', result.user.uid), {
                uid: result.user.uid,
                name: 'Administrador Master',
                email: 'admin@admin.com',
                role: 'admin',
                hierarchy: 'diretoria',
                status: 'active',
                unit: 'Sede Central',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
              });
            } catch (createErr: any) {
              if (createErr.code === 'auth/email-already-in-use') {
                throw err;
              }
              throw createErr;
            }
          } else {
            throw err;
          }
        }
      } else {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        try {
          await setDoc(doc(db, 'users', result.user.uid), {
            uid: result.user.uid,
            name,
            email,
            role: 'pending',
            hierarchy: 'none',
            status: 'pending',
            unit: 'Não definida',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `users/${result.user.uid}`);
        }
      }
      navigate('/');
    } catch (err: any) {
      console.error('Email auth error:', err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('E-mail ou senha incorretos.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Este e-mail já está em uso.');
      } else {
        setError('Ocorreu um erro na autenticação.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center sm:p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full sm:max-w-md min-h-screen sm:min-h-[auto] bg-white sm:rounded-3xl sm:shadow-2xl sm:border border-zinc-100 overflow-hidden flex flex-col"
      >
        <div className="p-8 sm:p-10 flex-1 flex flex-col justify-center">
          <div className="flex flex-col items-center mb-10">
            <div className="w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center shadow-xl shadow-emerald-500/20 mb-6">
              <Car className="text-white" size={40} />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-zinc-900">ControlFrota</h1>
            <p className="text-zinc-500 text-sm font-medium mt-1">Gestão Inteligente de Frotas</p>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-600 text-sm"
              >
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <p>{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleEmailAuth} className="space-y-4">
            {!isLogin && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Nome Completo</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                  <input 
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-zinc-900"
                    placeholder="Seu nome"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-500 uppercase ml-1">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input 
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-zinc-900"
                  placeholder="exemplo@email.com"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input 
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-zinc-900"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
            >
              {loading ? 'Processando...' : (isLogin ? 'Entrar' : 'Criar Conta')}
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-200"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-4 text-zinc-500">Ou continuar com</span>
            </div>
          </div>

          <button 
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-4 bg-white border border-zinc-200 text-zinc-700 font-bold rounded-2xl hover:bg-zinc-50 transition-all flex items-center justify-center gap-3"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
            Google
          </button>

          <div className="mt-8 text-center">
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-emerald-600 font-bold hover:underline"
            >
              {isLogin ? 'Não tem uma conta? Cadastre-se' : 'Já tem uma conta? Entre agora'}
            </button>
          </div>
        </div>
        
        <div className="bg-zinc-50 p-6 flex items-center justify-center gap-3 border-t border-zinc-200">
          <Shield className="text-emerald-500" size={18} />
          <p className="text-xs text-zinc-500">Ambiente seguro e criptografado</p>
        </div>
      </motion.div>
    </div>
  );
}
