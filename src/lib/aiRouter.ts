import { GoogleGenAI } from '@google/genai';
import { logAIError } from '@/lib/ai-error';

export type AIProviderName = 'gemini' | 'openai' | 'anthropic' | 'groq';
export type AIResponseFormat = 'text' | 'json';

export type AIResult = {
  text: string;
  provider: AIProviderName;
  model: string;
};

type ProviderFailure = {
  provider: AIProviderName;
  status?: number;
  message: string;
};

type ProviderDefinition = {
  provider: AIProviderName;
  apiKey: string | undefined;
  model: string;
  generate: (apiKey: string) => Promise<string>;
};

export class AIProvidersUnavailableError extends Error {
  constructor(
    readonly configuredProviders: number,
    readonly failures: ProviderFailure[],
  ) {
    super(
      configuredProviders === 0
        ? 'No AI provider API keys are configured.'
        : 'Every configured AI provider failed.',
    );
    this.name = 'AIProvidersUnavailableError';
  }
}

class AIProviderRequestError extends Error {
  constructor(
    readonly provider: AIProviderName,
    readonly status: number,
    message: string,
  ) {
    super(`${provider} returned HTTP ${status}: ${message}`);
    this.name = 'AIProviderRequestError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getErrorMessage(payload: unknown, status: number) {
  if (isRecord(payload) && isRecord(payload.error)) {
    if (typeof payload.error.message === 'string') {
      return payload.error.message;
    }
  }

  if (isRecord(payload) && typeof payload.message === 'string') {
    return payload.message;
  }

  return `The provider returned HTTP ${status}.`;
}

async function postJson(
  provider: AIProviderName,
  url: string,
  headers: Record<string, string>,
  body: Record<string, unknown>,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const payload: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      throw new AIProviderRequestError(
        provider,
        response.status,
        getErrorMessage(payload, response.status),
      );
    }

    return payload;
  } finally {
    clearTimeout(timeout);
  }
}

function readChatCompletionText(payload: unknown) {
  if (!isRecord(payload) || !Array.isArray(payload.choices)) {
    throw new Error('The provider returned an invalid chat completion.');
  }

  const choice = payload.choices[0];
  if (!isRecord(choice) || !isRecord(choice.message)) {
    throw new Error('The provider returned no chat completion message.');
  }

  const content = choice.message.content;
  if (typeof content === 'string') return content;

  if (Array.isArray(content)) {
    return content
      .filter(
        (part): part is Record<string, unknown> =>
          isRecord(part) && typeof part.text === 'string',
      )
      .map((part) => part.text)
      .join('');
  }

  throw new Error('The provider returned an empty chat completion.');
}

function readAnthropicText(payload: unknown) {
  if (!isRecord(payload) || !Array.isArray(payload.content)) {
    throw new Error('Anthropic returned an invalid message.');
  }

  return payload.content
    .filter(
      (part): part is Record<string, unknown> =>
        isRecord(part) && part.type === 'text' && typeof part.text === 'string',
    )
    .map((part) => part.text)
    .join('');
}

function getErrorStatus(error: unknown) {
  if (!isRecord(error)) return undefined;
  if (typeof error.status === 'number') return error.status;
  if (typeof error.statusCode === 'number') return error.statusCode;
  return undefined;
}

export async function generateWithFallback(
  prompt: string,
  responseFormat: AIResponseFormat = 'text',
): Promise<AIResult> {
  const jsonMode = responseFormat === 'json';
  const openAIModel = 'gpt-6-luna';
  const geminiModel = 'gemini-4-hydrogen';
  const groqModel = 'openai/gpt-oss-20b';
  const anthropicModel = 'claude-haiku-5-5';
  const providers: ProviderDefinition[] = [
    {
      provider: 'openai',
      apiKey: process.env.OPENAI_API_KEY?.trim() || undefined,
      model: openAIModel,
      generate: async (apiKey) => {
        const payload = await postJson(
          'openai',
          'https://api.openai.com/v1/chat/completions',
          {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          {
            model: openAIModel,
            messages: [{ role: 'user', content: prompt }],
            ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
          },
        );
        return readChatCompletionText(payload);
      },
    },
    {
      provider: 'gemini',
      apiKey:
        process.env.GOOGLE_API_KEY?.trim() ||
        process.env.GEMINI_API_KEY?.trim() ||
        undefined,
      model: geminiModel,
      generate: async (apiKey) => {
        const ai = new GoogleGenAI({ apiKey });
        const result = await ai.models.generateContent({
          model: geminiModel,
          contents: prompt,
          ...(jsonMode ? { config: { responseMimeType: 'application/json' } } : {}),
        });
        return result.text ?? '';
      },
    },
    {
      provider: 'groq',
      apiKey: process.env.GROQ_API_KEY?.trim() || undefined,
      model: groqModel,
      generate: async (apiKey) => {
        const payload = await postJson(
          'groq',
          'https://api.groq.com/openai/v1/chat/completions',
          {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          {
            model: groqModel,
            messages: [{ role: 'user', content: prompt }],
            ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
          },
        );
        return readChatCompletionText(payload);
      },
    },
    {
      provider: 'anthropic',
      apiKey: process.env.ANTHROPIC_API_KEY?.trim() || undefined,
      model: anthropicModel,
      generate: async (apiKey) => {
        const payload = await postJson(
          'anthropic',
          'https://api.anthropic.com/v1/messages',
          {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
          {
            model: anthropicModel,
            max_tokens: 4096,
            messages: [{ role: 'user', content: prompt }],
          },
        );
        return readAnthropicText(payload);
      },
    },
  ];

  let configuredProviders = 0;
  const failures: ProviderFailure[] = [];

  for (const provider of providers) {
    if (!provider.apiKey) continue;
    configuredProviders += 1;

    try {
      const text = (await provider.generate(provider.apiKey)).trim();
      if (!text) {
        throw new Error(`${provider.provider} returned an empty response.`);
      }

      return {
        text,
        provider: provider.provider,
        model: provider.model,
      };
    } catch (error) {
      logAIError(`AI provider ${provider.provider} failed; trying the next provider.`, error);
      failures.push({
        provider: provider.provider,
        status: getErrorStatus(error),
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  throw new AIProvidersUnavailableError(configuredProviders, failures);
}
