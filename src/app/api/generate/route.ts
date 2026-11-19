import {
  AIProvidersUnavailableError,
  generateWithFallback,
} from '@/lib/aiRouter';
import { logAIError } from '@/lib/ai-error';
import { apiOptions, withApiCors } from '@/lib/api-cors';
import {
  authenticateSupabaseRequest,
  saveStudyGeneration,
} from '@/lib/supabaseServer';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type QuizQuestion = {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isChatMessage(value: unknown): value is ChatMessage {
  return (
    isRecord(value) &&
    (value.role === 'user' || value.role === 'assistant') &&
    typeof value.content === 'string' &&
    value.content.length <= 2000
  );
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

async function handleGenerate(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { success: false, error: 'O corpo do pedido deve conter JSON válido.' },
      { status: 400 },
    );
  }

  if (!isRecord(body) || (body.mode !== 'chat' && body.mode !== 'quiz')) {
    return Response.json(
      { success: false, error: 'Modo de geração inválido.' },
      { status: 400 },
    );
  }

  const authenticatedUser = await authenticateSupabaseRequest(request);
  if (authenticatedUser instanceof Response) return authenticatedUser;

  try {
    if (body.mode === 'chat') {
      if (
        typeof body.message !== 'string' ||
        !body.message.trim() ||
        body.message.length > 2000 ||
        !Array.isArray(body.history) ||
        !body.history.every(isChatMessage)
      ) {
        return Response.json(
          { success: false, error: 'Pergunta ou histórico inválido.' },
          { status: 400 },
        );
      }

      const history = (body.history as ChatMessage[])
        .slice(-12)
        .map(
          (message) =>
            `${message.role === 'user' ? 'Estudante' : 'Assistente'}: ${message.content}`,
        )
        .join('\n');

      const prompt =
        'És um assistente de estudos de Farmácia. Responde em português europeu, com clareza e rigor académico. ' +
        'Ajuda a compreender os conceitos e assinala quando uma questão clínica deve ser confirmada com um profissional. ' +
        (history ? `Histórico da conversa:\n${history}\n\n` : '') +
        `Pergunta atual do estudante: ${body.message.trim()}`;
      const result = await generateWithFallback(prompt, 'text');
      const answer = result.text.trim();

      if (!answer) {
        return Response.json(
          { success: false, error: 'O assistente não devolveu uma resposta.' },
          { status: 502 },
        );
      }

      try {
        await saveStudyGeneration(authenticatedUser, {
          kind: 'chat',
          title: body.message.trim(),
          provider: result.provider,
          model: result.model,
          prompt: body.message.trim(),
          content: { answer },
        });
      } catch (error) {
        logAIError('Falha ao guardar a resposta de chat no Supabase:', error);
        return Response.json(
          {
            success: false,
            error: 'A resposta foi gerada, mas não foi possível guardá-la no histórico. Tente novamente.',
          },
          { status: 503 },
        );
      }

      return Response.json({
        success: true,
        answer,
        provider: result.provider,
      });
    }

    if (
      typeof body.topic !== 'string' ||
      !body.topic.trim() ||
      body.topic.length > 150 ||
      typeof body.count !== 'number' ||
      !Number.isInteger(body.count) ||
      body.count < 1 ||
      body.count > 10
    ) {
      return Response.json(
        { success: false, error: 'Tema ou número de perguntas inválido.' },
        { status: 400 },
      );
    }

    const prompt =
      `Cria exatamente ${body.count} perguntas de escolha múltipla, em português europeu, ` +
      `sobre o tema de Farmácia "${body.topic.trim()}". ` +
      'Cada pergunta deve ter exatamente quatro opções e uma única resposta correta. ' +
      'Devolve apenas um objeto JSON válido, sem blocos Markdown, com o formato: ' +
      '{"questions":[{"question":"...","options":["...","...","...","..."],"correctAnswer":0,"explanation":"..."}]}. ' +
      'correctAnswer deve ser o índice (de 0 a 3) da opção correta. As explicações devem ser breves e educativas.';
    const result = await generateWithFallback(prompt, 'json');
    const text = result.text.trim();

    if (!text) {
      return Response.json(
        { success: false, error: 'Não foi possível gerar perguntas para este tema.' },
        { status: 502 },
      );
    }

    let generated: unknown;
    try {
      generated = JSON.parse(text);
    } catch {
      return Response.json(
        { success: false, error: 'A resposta da IA não contém um questionário válido.' },
        { status: 502 },
      );
    }

    if (
      !isRecord(generated) ||
      !Array.isArray(generated.questions) ||
      generated.questions.length !== body.count ||
      !generated.questions.every(isQuizQuestion)
    ) {
      return Response.json(
        { success: false, error: 'A resposta da IA não contém um questionário válido.' },
        { status: 502 },
      );
    }

    try {
      await saveStudyGeneration(authenticatedUser, {
        kind: 'quiz',
        title: body.topic.trim(),
        provider: result.provider,
        model: result.model,
        prompt: body.topic.trim(),
        content: { questions: generated.questions },
      });
    } catch (error) {
      logAIError('Falha ao guardar o questionário no Supabase:', error);
      return Response.json(
        {
          success: false,
          error: 'O questionário foi gerado, mas não foi possível guardá-lo no histórico. Tente novamente.',
        },
        { status: 503 },
      );
    }

    return Response.json({
      success: true,
      questions: generated.questions,
      provider: result.provider,
    });
  } catch (error) {
    logAIError('Falha ao gerar conteúdo de estudo:', error);
    const noProvidersConfigured =
      error instanceof AIProvidersUnavailableError &&
      error.configuredProviders === 0;
    return Response.json(
      {
        success: false,
        error: noProvidersConfigured
          ? 'Nenhum provedor de IA está configurado no servidor.'
          : 'Os provedores de IA estão indisponíveis. Tente novamente dentro de alguns minutos.',
      },
      { status: 503 },
    );
  }
}

export async function OPTIONS(request: Request) {
  return apiOptions(request);
}

export async function POST(request: Request) {
  return withApiCors(request, await handleGenerate(request));
}
