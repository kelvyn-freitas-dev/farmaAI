'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  BookOpenCheck,
  Bot,
  CheckCircle2,
  Loader2,
  Paperclip,
  Send,
  Sparkles,
  User,
} from 'lucide-react';
import StudyContent from '@/components/StudyContent';
import { apiUrl } from '@/lib/api-url';
import type { StudyGeneration } from '@/lib/study-generation';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getErrorMessage(data: unknown, fallback: string) {
  if (isRecord(data) && typeof data.error === 'string') {
    return data.error;
  }

  return fallback;
}

function getStudyContext(generation: StudyGeneration) {
  const content = generation.content;
  const details = [
    `Tema: ${generation.prompt}`,
    typeof content.summary === 'string' ? `Resumo: ${content.summary}` : '',
    Array.isArray(content.keyTopics)
      ? `Tópicos: ${content.keyTopics.filter((item) => typeof item === 'string').join(', ')}`
      : '',
    Array.isArray(content.questions)
      ? `Questões: ${JSON.stringify(content.questions).slice(0, 900)}`
      : '',
    Array.isArray(content.flashcards)
      ? `Cartões: ${JSON.stringify(content.flashcards).slice(0, 900)}`
      : '',
  ]
    .filter(Boolean)
    .join('\n');

  return details.slice(0, 1750);
}

export default function ChatModule({
  accessToken,
  selectedGeneration,
  onClearSelected,
  onOpenUpload,
  onGenerated,
}: {
  accessToken: string;
  selectedGeneration: StudyGeneration | null;
  onClearSelected: () => void;
  onOpenUpload: () => void;
  onGenerated: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [studyContext, setStudyContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  function continueChat(generation: StudyGeneration) {
    const answer =
      typeof generation.content.answer === 'string'
        ? generation.content.answer
        : 'Não foi encontrada uma resposta para esta conversa.';
    setMessages([
      { role: 'user', content: generation.prompt },
      { role: 'assistant', content: answer },
    ]);
    setStudyContext('');
    setError('');
    setNotice('');
    onClearSelected();
    inputRef.current?.focus();
  }

  function askAboutGeneration(generation: StudyGeneration) {
    setStudyContext(getStudyContext(generation));
    setInput(`Ajuda-me a rever o tema "${generation.prompt}".`);
    setError('');
    setNotice('');
    onClearSelected();
    inputRef.current?.focus();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = input.trim();

    if (!message || loading) return;

    setInput('');
    setError('');
    setNotice('');
    setMessages((current) => [...current, { role: 'user', content: message }]);
    setLoading(true);

    const contextMessage: Message[] = studyContext
      ? [
          {
            role: 'assistant',
            content: `Contexto do material selecionado:\n${studyContext}`,
          },
        ]
      : [];
    const history = [
      ...messages
        .slice(-11)
        .map((item) => ({ ...item, content: item.content.slice(0, 2000) })),
      ...contextMessage,
    ].slice(-12);

    try {
      const response = await fetch(apiUrl('/api/generate'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          mode: 'chat',
          message,
          history,
        }),
      });
      const data: unknown = await response.json().catch(() => null);

      if (!response.ok || !isRecord(data) || data.success !== true) {
        throw new Error(
          getErrorMessage(data, 'Não foi possível obter uma resposta agora.'),
        );
      }

      if (typeof data.answer !== 'string' || !data.answer.trim()) {
        throw new Error('A resposta recebida do assistente está vazia.');
      }

      setMessages((current) => [
        ...current,
        { role: 'assistant', content: data.answer as string },
      ]);
      setNotice('Resposta recebida com sucesso.');
      onGenerated();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Falha ao comunicar com o assistente.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 pb-48 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-4xl">
          {selectedGeneration ? (
            <StudyContent
              key={selectedGeneration.id}
              generation={selectedGeneration}
              onContinueChat={continueChat}
              onAskAbout={askAboutGeneration}
            />
          ) : messages.length === 0 ? (
            <section className="mx-auto mt-8 max-w-2xl text-center sm:mt-16">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-red-50 text-red-600">
                <Sparkles aria-hidden="true" className="h-7 w-7" />
              </div>
              <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-red-600">
                PharmaStudy AI
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                O que vamos estudar?
              </h1>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-500 sm:text-base">
                Faça uma pergunta, envie um material ou gere questões para
                começar uma nova sessão de estudo.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-2">
                {[
                  'Explique a farmacocinética',
                  'Rever interações medicamentosas',
                  'Como funcionam os beta-bloqueadores?',
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => {
                      setInput(suggestion);
                      inputRef.current?.focus();
                    }}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 shadow-sm transition-all hover:border-red-200 hover:text-red-700 hover:shadow-md sm:text-sm"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </section>
          ) : (
            <section aria-label="Conversa com o assistente" className="space-y-5">
              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`flex items-start gap-3 ${
                    message.role === 'user' ? 'flex-row-reverse' : ''
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                      message.role === 'user'
                        ? 'bg-red-100 text-red-700'
                        : 'border border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    {message.role === 'user' ? (
                      <User aria-hidden="true" className="h-4 w-4" />
                    ) : (
                      <Bot aria-hidden="true" className="h-4 w-4" />
                    )}
                  </span>
                  <p
                    className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-7 ${
                      message.role === 'user'
                        ? 'rounded-tr-md bg-red-600 text-white'
                        : 'rounded-tl-md border border-slate-200 bg-white text-slate-700 shadow-sm'
                    }`}
                  >
                    {message.content}
                  </p>
                </div>
              ))}
              {loading && (
                <div role="status" className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-red-600">
                    <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                  </span>
                  <p className="rounded-2xl rounded-tl-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
                    A preparar uma resposta...
                  </p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </section>
          )}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200 bg-white/95 px-3 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.04)] backdrop-blur sm:px-6 sm:py-4 lg:left-80 lg:px-8">
        <div className="mx-auto max-w-4xl">
          {error && (
            <p
              role="alert"
              className="mb-2 flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
            >
              <AlertCircle aria-hidden="true" className="h-4 w-4 shrink-0" />
              {error}
            </p>
          )}
          {notice && (
            <p
              role="status"
              className="mb-2 flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800"
            >
              <CheckCircle2 aria-hidden="true" className="h-4 w-4 shrink-0" />
              {notice}
            </p>
          )}
          {studyContext && (
            <p className="mb-2 flex items-center gap-2 text-xs font-medium text-red-700">
              <BookOpenCheck aria-hidden="true" className="h-3.5 w-3.5" />
              A pergunta inclui o contexto do material selecionado.
              <button
                type="button"
                onClick={() => setStudyContext('')}
                className="underline underline-offset-2"
              >
                Remover contexto
              </button>
            </p>
          )}
          <form
            onSubmit={handleSubmit}
            className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm transition focus-within:border-red-300 focus-within:ring-2 focus-within:ring-red-500/15"
          >
            <button
              type="button"
              onClick={onOpenUpload}
              aria-label="Adicionar PDF ou material de estudo"
              title="Adicionar PDF ou material"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            >
              <Paperclip aria-hidden="true" className="h-5 w-5" />
            </button>
            <label htmlFor="chat-message" className="sr-only">
              Escreva a sua pergunta
            </label>
            <textarea
              ref={inputRef}
              id="chat-message"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              placeholder="Escreva a sua pergunta..."
              rows={1}
              maxLength={2000}
              disabled={loading}
              className="max-h-32 min-h-10 flex-1 resize-none border-0 bg-transparent px-1 py-2 text-sm leading-6 text-slate-900 placeholder:text-slate-400 outline-none focus:ring-0 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Enviar pergunta"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white shadow-sm transition-all hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
              ) : (
                <Send aria-hidden="true" className="h-4 w-4" />
              )}
            </button>
          </form>
          <p className="mt-1.5 hidden text-center text-[11px] text-slate-400 sm:block">
            Enter para enviar · Shift+Enter para uma nova linha
          </p>
        </div>
      </div>
    </div>
  );
}
