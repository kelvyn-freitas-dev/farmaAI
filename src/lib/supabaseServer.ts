import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { AIProviderName } from '@/lib/aiRouter';

export type AuthenticatedSupabaseUser = {
  client: SupabaseClient;
  userId: string;
};

export type StudyGeneration = {
  kind: 'chat' | 'quiz' | 'material';
  title: string;
  provider: AIProviderName;
  model: string;
  prompt: string;
  content: Record<string, unknown>;
};

export async function authenticateSupabaseRequest(
  request: Request,
): Promise<AuthenticatedSupabaseUser | Response> {
  const authorization = request.headers.get('authorization');
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];

  if (!token) {
    return Response.json(
      { success: false, error: 'Inicie sessão para guardar o seu histórico de estudo.' },
      { status: 401 },
    );
  }

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return Response.json(
      {
        success: false,
        error: 'A integração de autenticação e histórico do Supabase não está configurada no servidor.',
      },
      { status: 500 },
    );
  }

  const client = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const { data, error } = await client.auth.getUser(token);

    if (error) {
      if (error.status === 400 || error.status === 401 || error.status === 403) {
        return Response.json(
          { success: false, error: 'A sessão expirou. Inicie sessão novamente.' },
          { status: 401 },
        );
      }

      console.error('Falha ao validar a sessão Supabase:', error.message);
      return Response.json(
        { success: false, error: 'Não foi possível validar a sessão. Tente novamente.' },
        { status: 503 },
      );
    }

    if (!data.user) {
      return Response.json(
        { success: false, error: 'A sessão expirou. Inicie sessão novamente.' },
        { status: 401 },
      );
    }

    return { client, userId: data.user.id };
  } catch (error) {
    console.error('Erro ao validar a sessão Supabase:', error);
    return Response.json(
      { success: false, error: 'Não foi possível validar a sessão. Tente novamente.' },
      { status: 503 },
    );
  }
}

export async function saveStudyGeneration(
  authenticatedUser: AuthenticatedSupabaseUser,
  generation: StudyGeneration,
) {
  const title =
    generation.title.trim() ||
    generation.prompt.trim() ||
    'Estudo de Farmácia';

  const { error } = await authenticatedUser.client.from('study_generations').insert({
    user_id: authenticatedUser.userId,
    kind: generation.kind,
    type: generation.kind,
    title,
    provider: generation.provider,
    model: generation.model,
    prompt: generation.prompt,
    content: generation.content,
  });

  if (error) {
    throw new Error(`Could not persist study history: ${error.message}`, {
      cause: error,
    });
  }
}
