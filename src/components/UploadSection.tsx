'use client';

import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Loader2,
  Sparkles,
  Upload,
} from 'lucide-react';
import { apiUrl } from '@/lib/api-url';

type UploadMessage = {
  type: 'success' | 'error';
  text: string;
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

function formatFileSize(size: number) {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadSection({
  onUploadComplete,
  accessToken,
}: {
  onUploadComplete: () => void;
  accessToken: string;
}) {
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<UploadMessage | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file || loading) return;

    setLoading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title || file.name);

    try {
      const response = await fetch(apiUrl('/api/process'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      });

      const data: unknown = await response.json().catch(() => null);
      if (!response.ok || !isRecord(data) || data.success !== true) {
        throw new Error(
          getErrorMessage(data, 'Não foi possível processar o ficheiro enviado.'),
        );
      }

      setMessage({
        type: 'success',
        text:
          isRecord(data) && data.truncated === true
            ? 'Material processado. Para respeitar os limites do modelo, foram analisados os primeiros 12 000 caracteres.'
            : 'Material processado e conteúdo estruturado com sucesso!',
      });
      setTitle('');
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onUploadComplete();
    } catch (requestError) {
      setMessage({
        type: 'error',
        text:
          requestError instanceof Error
            ? requestError.message
            : 'Falha ao processar o ficheiro.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md sm:p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-600">
          <Upload aria-hidden="true" className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900">
            Materiais de estudo
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Resumos, flashcards e perguntas a partir dos seus ficheiros
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="study-title"
            className="mb-1.5 block text-sm font-semibold text-slate-700"
          >
            Título da aula ou matéria
          </label>
          <input
            id="study-title"
            type="text"
            placeholder="Ex.: Farmacologia — anti-inflamatórios"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={150}
            className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
          />
        </div>

        <div>
          <span className="mb-1.5 block text-sm font-semibold text-slate-700">
            Ficheiro de estudo
          </span>
          <input
            ref={fileInputRef}
            id="study-file"
            type="file"
            accept=".pdf,.txt"
            aria-label="Selecionar ficheiro PDF ou TXT"
            onChange={(event) => {
              setFile(event.target.files?.[0] || null);
              setMessage(null);
            }}
            className="sr-only"
          />
          {file ? (
            <div className="flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50/60 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-red-600 shadow-sm">
                <FileText aria-hidden="true" className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800">
                  {file.name}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {formatFileSize(file.size)} · PDF ou TXT
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setMessage(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-600 transition hover:bg-white hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              >
                Remover
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-4 py-6 text-center transition-colors hover:border-red-300 hover:bg-red-50/30">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm">
                <FileText aria-hidden="true" className="h-5 w-5" />
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-700">
                Escolha um material para começar
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Ficheiros PDF ou TXT, até 10 MB
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-red-200 hover:text-red-700 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
              >
                <Upload aria-hidden="true" className="h-4 w-4" />
                Procurar ficheiro
              </button>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !file}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-red-200 transition-all hover:bg-red-700 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
          ) : (
            <Sparkles aria-hidden="true" className="h-5 w-5" />
          )}
          {loading ? 'A analisar o material...' : 'Processar material'}
        </button>
      </form>

      {loading && (
        <p
          role="status"
          className="mt-4 flex items-center gap-2 rounded-xl bg-slate-50 px-3.5 py-3 text-sm text-slate-600"
        >
          <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin text-red-600" />
          A extrair o conteúdo e a preparar os seus materiais de revisão.
        </p>
      )}
      {message && (
        <div
          role={message.type === 'error' ? 'alert' : 'status'}
          className={`mt-4 flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm ${
            message.type === 'success'
              ? 'border-emerald-100 bg-emerald-50 text-emerald-800'
              : 'border-red-100 bg-red-50 text-red-700'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2
              aria-hidden="true"
              className="mt-0.5 h-4 w-4 shrink-0"
            />
          ) : (
            <AlertCircle
              aria-hidden="true"
              className="mt-0.5 h-4 w-4 shrink-0"
            />
          )}
          {message.text}
        </div>
      )}
    </section>
  );
}
