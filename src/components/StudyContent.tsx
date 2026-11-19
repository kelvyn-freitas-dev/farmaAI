'use client';

import { useState } from 'react';
import { BookOpenCheck, CheckCircle2, MessageSquareText, Sparkles } from 'lucide-react';
import type { StudyGeneration } from '@/lib/study-generation';

type QuizQuestion = {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
};

type Flashcard = {
  question: string;
  answer: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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

function isFlashcard(value: unknown): value is Flashcard {
  return (
    isRecord(value) &&
    typeof value.question === 'string' &&
    typeof value.answer === 'string'
  );
}

function getStringList(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(date);
}

function ReviewQuestionCard({
  question,
  questionIndex,
  selectedOption,
  onSelect,
}: {
  question: QuizQuestion;
  questionIndex: number;
  selectedOption: number | undefined;
  onSelect: (optionIndex: number) => void;
}) {
  const answered = selectedOption !== undefined;
  const correctLetter = String.fromCharCode(65 + question.correctAnswer);

  return (
    <fieldset className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <legend className="max-w-full px-1 text-sm font-semibold leading-6 text-slate-900">
        {questionIndex + 1}. {question.question}
      </legend>
      <div className="mt-3 space-y-2">
        {question.options.map((option, optionIndex) => {
          const selected = selectedOption === optionIndex;
          const isCorrect = question.correctAnswer === optionIndex;
          const optionStyle = !answered
            ? 'border-slate-200 bg-white text-slate-700 hover:border-red-200 hover:bg-red-50'
            : isCorrect
              ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
              : selected
                ? 'border-red-300 bg-red-50 text-red-800'
                : 'border-slate-200 bg-white text-slate-600';

          return (
            <button
              key={optionIndex}
              type="button"
              aria-pressed={selected}
              disabled={answered}
              onClick={() => onSelect(optionIndex)}
              className={`w-full rounded-xl border p-3 text-left text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:cursor-default ${optionStyle}`}
            >
              <span className="mr-2 font-bold">
                {String.fromCharCode(65 + optionIndex)}.
              </span>
              {option}
            </button>
          );
        })}
      </div>
      {answered && (
        <>
          <p
            role="status"
            className={`mt-3 text-sm font-semibold ${
              selectedOption === question.correctAnswer
                ? 'text-emerald-700'
                : 'text-red-700'
            }`}
          >
            {selectedOption === question.correctAnswer
              ? 'Resposta correta!'
              : `Resposta incorreta. A correta é ${correctLetter}.`}
          </p>
          <p className="mt-2 rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-600">
            <span className="font-semibold text-slate-800">Explicação:</span>{' '}
            {question.explanation}
          </p>
        </>
      )}
    </fieldset>
  );
}

export default function StudyContent({
  generation,
  onContinueChat,
  onAskAbout,
}: {
  generation: StudyGeneration;
  onContinueChat: (generation: StudyGeneration) => void;
  onAskAbout: (generation: StudyGeneration) => void;
}) {
  const [answers, setAnswers] = useState<Record<number, number>>({});

  const questions = Array.isArray(generation.content.questions)
    ? generation.content.questions.filter(isQuizQuestion)
    : [];
  const keyTopics = getStringList(generation.content.keyTopics);
  const flashcards = Array.isArray(generation.content.flashcards)
    ? generation.content.flashcards.filter(isFlashcard)
    : [];
  const summary =
    typeof generation.content.summary === 'string'
      ? generation.content.summary
      : '';
  const answer =
    typeof generation.content.answer === 'string'
      ? generation.content.answer
      : '';
  const score = questions.reduce(
    (total, question, index) =>
      total + (answers[index] === question.correctAnswer ? 1 : 0),
    0,
  );
  const answeredCount = Object.keys(answers).length;
  const kindLabel =
    generation.kind === 'chat'
      ? 'Conversa'
      : generation.kind === 'quiz'
        ? 'Questionário'
        : 'Material';

  return (
    <article className="mx-auto w-full max-w-4xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-50 text-red-600">
            {generation.kind === 'chat' ? (
              <MessageSquareText aria-hidden="true" className="h-4 w-4" />
            ) : generation.kind === 'quiz' ? (
              <Sparkles aria-hidden="true" className="h-4 w-4" />
            ) : (
              <BookOpenCheck aria-hidden="true" className="h-4 w-4" />
            )}
          </span>
          {kindLabel}
        </div>
        <time
          dateTime={generation.created_at}
          className="text-xs text-slate-400"
        >
          {formatDate(generation.created_at)}
        </time>
      </div>

      <h1 className="mb-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        {generation.title}
      </h1>
      {generation.kind !== 'chat' && (
        <p className="mb-6 text-sm text-slate-500">
          {generation.kind === 'quiz'
            ? 'Responda às perguntas e confira as explicações.'
            : 'Material de estudo processado e guardado no seu histórico.'}
        </p>
      )}

      {generation.kind === 'chat' && (
        <div className="space-y-5">
          <div className="ml-auto max-w-3xl rounded-2xl rounded-tr-md bg-red-600 px-5 py-4 text-sm leading-6 text-white shadow-sm">
            {generation.prompt}
          </div>
          <div className="max-w-3xl rounded-2xl rounded-tl-md border border-slate-200 bg-white px-5 py-4 text-sm leading-7 text-slate-700 shadow-sm">
            {answer || 'Não foi encontrada uma resposta para esta conversa.'}
          </div>
          <button
            type="button"
            onClick={() => onContinueChat(generation)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
          >
            <MessageSquareText aria-hidden="true" className="h-4 w-4" />
            Continuar esta conversa
          </button>
        </div>
      )}

      {generation.kind === 'material' && (
        <div className="space-y-5">
          {summary && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-bold text-slate-900">Resumo</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                {summary}
              </p>
            </section>
          )}
          {keyTopics.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-bold text-slate-900">Tópicos-chave</h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {keyTopics.map((topic, index) => (
                  <li
                    key={`${index}-${topic}`}
                    className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700"
                  >
                    {topic}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {flashcards.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-bold text-slate-900">
                Cartões de revisão
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {flashcards.map((flashcard, index) => (
                  <div
                    key={`${index}-${flashcard.question}`}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <p className="text-sm font-semibold leading-6 text-slate-900">
                      {flashcard.question}
                    </p>
                    <p className="mt-2 border-t border-slate-100 pt-2 text-sm leading-6 text-slate-600">
                      {flashcard.answer}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
          {questions.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-bold text-slate-900">
                Questões de revisão
              </h2>
              <div className="space-y-3">
                {questions.map((question, questionIndex) => (
                  <ReviewQuestionCard
                    key={`${questionIndex}-${question.question}`}
                    question={question}
                    questionIndex={questionIndex}
                    selectedOption={answers[questionIndex]}
                    onSelect={(optionIndex) =>
                      setAnswers((current) => ({
                        ...current,
                        [questionIndex]: optionIndex,
                      }))
                    }
                  />
                ))}
              </div>
              {answeredCount > 0 && (
                <p role="status" className="mt-3 text-sm font-medium text-slate-600">
                  Acertos: {score} de {answeredCount} respondidas.
                </p>
              )}
              {answeredCount > 0 && (
                <button
                  type="button"
                  onClick={() => setAnswers({})}
                  className="mt-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                >
                  Limpar respostas
                </button>
              )}
            </section>
          )}
          {!summary &&
            keyTopics.length === 0 &&
            flashcards.length === 0 &&
            questions.length === 0 && (
            <p className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
              Não foi possível apresentar os detalhes deste material.
            </p>
            )}
          <button
            type="button"
            onClick={() => onAskAbout(generation)}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-red-200 transition-all hover:bg-red-700 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
          >
            <MessageSquareText aria-hidden="true" className="h-4 w-4" />
            Perguntar sobre este material
          </button>
        </div>
      )}

      {generation.kind === 'quiz' && (
        <div className="space-y-4">
          {answeredCount > 0 && (
            <div
              role="status"
              className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-slate-700"
            >
              <CheckCircle2 aria-hidden="true" className="h-5 w-5 shrink-0" />
              <p className="text-sm font-semibold">
                Acertos: {score} de {answeredCount} respondidas.
              </p>
            </div>
          )}
          {questions.map((question, questionIndex) => (
            <ReviewQuestionCard
              key={`${questionIndex}-${question.question}`}
              question={question}
              questionIndex={questionIndex}
              selectedOption={answers[questionIndex]}
              onSelect={(optionIndex) =>
                setAnswers((current) => ({
                  ...current,
                  [questionIndex]: optionIndex,
                }))
              }
            />
          ))}
          {questions.length === 0 && (
            <p className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
              Não foi possível apresentar as perguntas deste questionário.
            </p>
          )}
          {questions.length > 0 && answeredCount > 0 && (
            <button
              type="button"
              onClick={() => setAnswers({})}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
            >
              Limpar respostas
            </button>
          )}
          <button
            type="button"
            onClick={() => onAskAbout(generation)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
          >
            <MessageSquareText aria-hidden="true" className="h-4 w-4" />
            Perguntar sobre este questionário
          </button>
        </div>
      )}
    </article>
  );
}
