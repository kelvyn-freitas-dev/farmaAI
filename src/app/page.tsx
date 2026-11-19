'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  BookOpenCheck,
  ChevronRight,
  FileText,
  Loader2,
  LogOut,
  Menu,
  MessageSquareText,
  Plus,
  RefreshCw,
  Sparkles,
  X,
} from 'lucide-react';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  SupabaseAuthForm,
  SupabaseAuthProvider,
  useSupabaseAuth,
} from '@/components/SupabaseAuth';
import ChatModule from '@/components/ChatModule';
import QuizModule from '@/components/QuizModule';
import UploadSection from '@/components/UploadSection';
import {
  isStudyGeneration,
  type StudyGeneration,
  type StudyGenerationDraft,
} from '@/lib/study-generation';

function getKindLabel(kind: StudyGeneration['kind']) {
  if (kind === 'chat') return 'Conversa';
  if (kind === 'quiz') return 'Questionário';
  return 'Material';
}

async function loadStudyHistory(client: SupabaseClient) {
  const { data, error } = await client
    .from('study_generations')
    .select('id, kind, title, provider, model, prompt, content, created_at')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;

  return Array.isArray(data) ? data.filter(isStudyGeneration) : [];
}

function StudyHome() {
  const { session, loading, client, error, signOut } = useSupabaseAuth();
  const [history, setHistory] = useState<StudyGeneration[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState('');
  const [selectedGeneration, setSelectedGeneration] =
    useState<StudyGeneration | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [chatResetToken, setChatResetToken] = useState(0);

  const refreshHistory = useCallback(async () => {
    if (!client || !session) return [];

    setHistoryLoading(true);
    try {
      const records = await loadStudyHistory(client);
      setHistory(records);
      setHistoryError('');
      return records;
    } catch (requestError) {
      console.error('Falha ao carregar o histórico de estudo:', requestError);
      setHistoryError(
        requestError instanceof Error
          ? requestError.message
          : 'Não foi possível carregar o histórico.',
      );
      return [];
    } finally {
      setHistoryLoading(false);
    }
  }, [client, session]);

  useEffect(() => {
    if (!client || !session) return;

    let active = true;
    loadStudyHistory(client)
      .then((records) => {
        if (active) {
          setHistory(records);
          setHistoryError('');
        }
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        console.error('Falha ao carregar o histórico de estudo:', requestError);
        setHistoryError(
          requestError instanceof Error
            ? requestError.message
            : 'Não foi possível carregar o histórico.',
        );
      })
      .finally(() => {
        if (active) setHistoryLoading(false);
      });

    return () => {
      active = false;
    };
  }, [client, session]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div role="status" className="flex items-center gap-3 text-sm font-medium text-slate-600">
          <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin text-red-600" />
          A carregar a sua área de estudo...
        </div>
      </main>
    );
  }

  if (!client) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <p
          role="alert"
          className="max-w-lg rounded-2xl border border-red-100 bg-white p-5 text-sm text-red-700 shadow-sm"
        >
          {error || 'Não foi possível configurar a autenticação Supabase.'}
        </p>
      </main>
    );
  }

  if (!session) return <SupabaseAuthForm />;

  async function handleQuizGenerated(generation: StudyGenerationDraft) {
    const records = await refreshHistory();
    const savedGeneration = records.find(
      (record) =>
        record.kind === generation.kind && record.prompt === generation.prompt,
    );

    setSelectedGeneration(
      savedGeneration ?? {
        id: `local-${Date.now()}`,
        kind: generation.kind,
        title: generation.title,
        provider: generation.provider || 'unknown',
        model: '',
        prompt: generation.prompt,
        content: generation.content,
        created_at: new Date().toISOString(),
      },
    );
    setSidebarOpen(false);
  }

  async function handleMaterialUploaded() {
    const records = await refreshHistory();
    const savedGeneration = records.find((record) => record.kind === 'material');
    if (savedGeneration) setSelectedGeneration(savedGeneration);
    setUploadOpen(false);
  }

  const selectedTitle = selectedGeneration?.title ?? 'Espaço de estudo';

  return (
    <div className="h-screen overflow-hidden bg-slate-50 text-slate-900">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-slate-950/30 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-80 flex-col border-r border-slate-200 bg-white shadow-xl transition-transform duration-300 lg:z-20 lg:shadow-none ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        aria-label="Navegação e ferramentas de estudo"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600 text-white">
              <BookOpenCheck aria-hidden="true" className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-extrabold tracking-tight text-slate-900">
                PharmaStudy AI
              </p>
              <p className="mt-0.5 text-xs text-slate-500">Workspace de Farmácia</p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Fechar barra lateral"
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 lg:hidden"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>

        <section className="flex min-h-0 flex-1 flex-col px-4 pb-4 pt-5">
          <div className="mb-3 flex items-center justify-between px-1">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Histórico</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                As suas sessões e materiais
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setHistoryLoading(true);
                void refreshHistory();
              }}
              disabled={historyLoading}
              aria-label="Atualizar histórico"
              className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
            >
              <RefreshCw
                aria-hidden="true"
                className={`h-4 w-4 ${historyLoading ? 'animate-spin' : ''}`}
              />
            </button>
          </div>

          {historyError && (
            <div className="mb-3 rounded-xl border border-red-100 bg-red-50 p-3 text-xs leading-5 text-red-700">
              {historyError}
            </div>
          )}

          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
            {historyLoading && history.length === 0 ? (
              <div role="status" className="flex items-center gap-2 px-2 py-4 text-xs text-slate-500">
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                A carregar histórico...
              </div>
            ) : history.length === 0 ? (
              !historyError && (
                <p className="rounded-xl border border-dashed border-slate-200 px-3 py-5 text-center text-xs leading-5 text-slate-500">
                  Ainda não há registos. As suas conversas, questionários e
                  materiais aparecerão aqui.
                </p>
              )
            ) : (
              history.map((record) => {
                const active = selectedGeneration?.id === record.id;
                const Icon =
                  record.kind === 'chat'
                    ? MessageSquareText
                    : record.kind === 'quiz'
                      ? Sparkles
                      : FileText;

                return (
                  <button
                    key={record.id}
                    type="button"
                    onClick={() => {
                      setSelectedGeneration(record);
                      setSidebarOpen(false);
                    }}
                    className={`group flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-all ${
                      active
                        ? 'bg-red-50 text-red-900'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        active
                          ? 'bg-white text-red-600'
                          : 'bg-slate-100 text-slate-500 group-hover:bg-white'
                      }`}
                    >
                      <Icon aria-hidden="true" className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                          {getKindLabel(record.kind)}
                        </span>
                        <ChevronRight
                          aria-hidden="true"
                          className={`h-3.5 w-3.5 shrink-0 transition ${
                            active
                              ? 'text-red-500'
                              : 'text-slate-300 group-hover:translate-x-0.5'
                          }`}
                        />
                      </span>
                      <span className="mt-1 block truncate text-sm font-medium text-slate-800">
                        {record.title}
                      </span>
                      <time
                        dateTime={record.created_at}
                        className="mt-1 block text-[11px] text-slate-400"
                      >
                        {new Intl.DateTimeFormat('pt-BR', {
                          dateStyle: 'short',
                          timeZone: 'UTC',
                        }).format(new Date(record.created_at))}
                      </time>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </section>

        <div className="border-t border-slate-200 bg-slate-50/70 p-4">
          <QuizModule
            accessToken={session.access_token}
            onGenerated={(generation) => void handleQuizGenerated(generation)}
          />
        </div>
      </aside>

      <div className="flex h-screen flex-col lg:pl-80">
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label="Abrir barra lateral"
              onClick={() => setSidebarOpen(true)}
              className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition hover:bg-slate-50 lg:hidden"
            >
              <Menu aria-hidden="true" className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-900">
                {selectedTitle}
              </p>
              <p className="hidden text-xs text-slate-500 sm:block">
                Plataforma de estudos de Farmácia · Mackenzie
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectedGeneration(null);
                setChatResetToken((current) => current + 1);
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 sm:text-sm"
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
              <span className="hidden sm:inline">Nova conversa</span>
              <span className="sm:hidden">Novo</span>
            </button>
            <button
              type="button"
              onClick={() => void signOut()}
              aria-label="Terminar sessão"
              className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
            >
              <LogOut aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </header>

        {error && (
          <p
            role="alert"
            className="mx-4 mt-4 flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3.5 py-3 text-sm text-red-700 sm:mx-6 lg:mx-8"
          >
            <AlertCircle aria-hidden="true" className="h-4 w-4 shrink-0" />
            {error}
          </p>
        )}

        <main className="flex min-h-0 flex-1 flex-col">
          <ChatModule
            key={chatResetToken}
            accessToken={session.access_token}
            selectedGeneration={selectedGeneration}
            onClearSelected={() => setSelectedGeneration(null)}
            onOpenUpload={() => setUploadOpen(true)}
            onGenerated={() => void refreshHistory()}
          />
        </main>
      </div>

      {uploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
          <button
            type="button"
            tabIndex={-1}
            aria-label="Fechar envio de material"
            onClick={() => setUploadOpen(false)}
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Enviar material de estudo"
            className="relative z-10 w-full max-w-xl"
          >
            <button
              type="button"
              aria-label="Fechar"
              onClick={() => setUploadOpen(false)}
              className="absolute right-3 top-3 z-10 rounded-lg bg-white p-2 text-slate-500 shadow-sm transition hover:bg-slate-100 hover:text-slate-900"
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
            <UploadSection
              accessToken={session.access_token}
              onUploadComplete={() => void handleMaterialUploaded()}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <SupabaseAuthProvider>
      <StudyHome />
    </SupabaseAuthProvider>
  );
}
