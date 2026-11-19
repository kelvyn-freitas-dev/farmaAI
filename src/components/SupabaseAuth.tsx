'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type FormEvent,
  type PropsWithChildren,
} from 'react';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from '@/lib/supabaseBrowser';

type SupabaseAuthValue = {
  client: SupabaseClient | null;
  session: Session | null;
  loading: boolean;
  error: string;
  clearError: () => void;
  signOut: () => Promise<void>;
};

const SupabaseAuthContext = createContext<SupabaseAuthValue | null>(null);

export function SupabaseAuthProvider({ children }: PropsWithChildren) {
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    let unsubscribe = () => {};

    const initialize = async () => {
      try {
        await Promise.resolve();
        const supabase = getSupabaseBrowserClient();
        if (!active) return;

        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, nextSession) => {
          if (active) {
            setSession(nextSession);
            setError('');
          }
        });
        unsubscribe = () => subscription.unsubscribe();

        const { data, error: sessionError } = await supabase.auth.getSession();
        if (!active) return;

        setClient(supabase);
        if (sessionError) setError(sessionError.message);
        setSession(data.session);
        setLoading(false);
      } catch (clientError) {
        if (!active) return;
        setError(
          clientError instanceof Error
            ? clientError.message
            : 'Não foi possível configurar a autenticação Supabase.',
        );
        setLoading(false);
      }
    };

    void initialize();

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const clearError = useCallback(() => setError(''), []);
  const signOut = useCallback(async () => {
    if (!client) return;

    const { error: signOutError } = await client.auth.signOut();
    if (signOutError) {
      setError(signOutError.message);
      return;
    }

    setError('');
  }, [client]);

  return (
    <SupabaseAuthContext.Provider
      value={{ client, session, loading, error, clearError, signOut }}
    >
      {children}
    </SupabaseAuthContext.Provider>
  );
}

export function useSupabaseAuth() {
  const value = useContext(SupabaseAuthContext);
  if (!value) {
    throw new Error('useSupabaseAuth deve ser usado dentro de SupabaseAuthProvider.');
  }
  return value;
}

export function SupabaseAuthForm() {
  const { client, clearError, error: contextError } = useSupabaseAuth();
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!client || loading) return;

    setLoading(true);
    setError('');
    setNotice('');
    clearError();

    try {
      if (mode === 'sign-up') {
        const { data, error: signUpError } = await client.auth.signUp({
          email: email.trim(),
          password,
        });
        if (signUpError) throw signUpError;

        if (!data.session) {
          setNotice('Verifique o seu email para confirmar a conta e depois inicie sessão.');
        } else {
          setNotice('Conta criada com sucesso.');
        }
      } else {
        const { error: signInError } = await client.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
      }
    } catch (authError) {
      setError(
        authError instanceof Error
          ? authError.message
          : 'Não foi possível autenticar. Tente novamente.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
          PharmaStudy AI
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {mode === 'sign-in'
            ? 'Inicie sessão para continuar os seus estudos.'
            : 'Crie uma conta para guardar o seu histórico de estudo.'}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="auth-email" className="mb-1 block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="auth-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
            />
          </div>
          <div>
            <label htmlFor="auth-password" className="mb-1 block text-sm font-medium text-slate-700">
              Palavra-passe
            </label>
            <input
              id="auth-password"
              type="password"
              autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
              minLength={6}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
            />
          </div>
          {(error || contextError) && (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error || contextError}
            </p>
          )}
          {notice && (
            <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
              {notice}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-red-600 px-4 py-3 font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
          >
            {loading
              ? 'Aguarde...'
              : mode === 'sign-in'
                ? 'Iniciar sessão'
                : 'Criar conta'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode((current) => (current === 'sign-in' ? 'sign-up' : 'sign-in'));
            setError('');
            setNotice('');
          }}
          className="mt-4 w-full text-sm font-medium text-red-700 hover:text-red-800"
        >
          {mode === 'sign-in'
            ? 'Ainda não tem conta? Criar conta'
            : 'Já tem conta? Iniciar sessão'}
        </button>
      </section>
    </main>
  );
}
