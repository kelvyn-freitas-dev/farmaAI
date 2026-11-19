'use client';

import { useState, type FormEvent } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { apiUrl } from '@/lib/api-url';
import type { StudyGenerationDraft } from '@/lib/study-generation';

type QuizQuestion = {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isQuizQuestion(value: unknown): value is QuizQuestion {
  return (
    isRecord(value) &&
    typeof value.question === 'string' &&
    Array.isArray(value.options) &&
    value.options.length === 4 &&
    value.options.every((option) => typeof option === 'string') &&
    typeof value.correctAnswer === 'number' &&
    Number.isInteger(value.correctAnswer) &&
    value.correctAnswer >= 0 &&
    value.correctAnswer < 4 &&
    typeof value.explanation === 'string'
  );
}

function getErrorMessage(data: unknown, fallback: string) {
  if (isRecord(data) && typeof data.error === 'string') {
    return data.error;
  }

  return fallback;
}

export default function QuizModule({
  accessToken,
  onGenerated,
}: {
  accessToken: string;
  onGenerated: (generation: StudyGenerationDraft) => void;
}) {
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function handleGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const selectedTopic = topic.trim();
    if (!selectedTopic || loading) return;

    setLoading(true);
    setError('');
    setNotice('');

    try {
      const response = await fetch(apiUrl('/api/generate'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          mode: 'quiz',
          topic: selectedTopic,
          count,
        }),
      });
      const data: unknown = await response.json().catch(() => null);

      if (!response.ok || !isRecord(data) || data.success !== true) {
        throw new Error(
          getErrorMessage(data, 'Não foi possível gerar as questões.'),
        );
      }

      if (
        !Array.isArray(data.questions) ||
        data.questions.length !== count ||
        !data.questions.every(isQuizQuestion)
      ) {
        throw new Error('As questões recebidas têm um formato inválido.');
      }

      onGenerated({
        kind: 'quiz',
        title: selectedTopic,
        prompt: selectedTopic,
        content: { questions: data.questions },
        provider: typeof data.provider === 'string' ? data.provider : undefined,
      });
      setNotice('Questões geradas e guardadas no histórico.');
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Falha ao gerar as questões.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section aria-labelledby="quiz-generator-title">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-600">
          <Sparkles aria-hidden="true" className="h-4 w-4" />
        </span>
        <div>
          <h2
            id="quiz-generator-title"
            className="text-sm font-bold text-slate-900"
          >
            Gerador de questões
          </h2>
          <p className="text-xs text-slate-500">Pratique um tema específico</p>
        </div>
      </div>

      <form onSubmit={handleGenerate} className="space-y-3">
        <div>
          <label
            htmlFor="quiz-topic"
            className="mb-1 block text-xs font-semibold text-slate-700"
          >
            Tema
          </label>
          <input
            id="quiz-topic"
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            placeholder="Ex.: farmacocinética"
            maxLength={150}
            required
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
          />
        </div>
        <div>
          <label
            htmlFor="quiz-count"
            className="mb-1 block text-xs font-semibold text-slate-700"
          >
            Número de perguntas
          </label>
          <select
            id="quiz-count"
            value={count}
            onChange={(event) => setCount(Number(event.target.value))}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
          >
            <option value={5}>5 perguntas</option>
            <option value={10}>10 perguntas</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={loading || !topic.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles aria-hidden="true" className="h-4 w-4" />
          )}
          {loading ? 'A gerar...' : 'Gerar questões'}
        </button>
      </form>

      {loading && (
        <p role="status" className="mt-3 flex items-center gap-2 text-xs text-slate-500">
          <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin text-red-600" />
          A preparar as questões...
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="mt-3 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 p-2.5 text-xs leading-5 text-red-700"
        >
          <AlertCircle aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="mt-3 flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50 p-2.5 text-xs leading-5 text-emerald-800"
        >
          <CheckCircle2 aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {notice}
        </p>
      )}
    </section>
  );
}
