export type StudyGenerationKind = 'chat' | 'quiz' | 'material';

export type StudyGeneration = {
  id: string;
  kind: StudyGenerationKind;
  title: string;
  provider: string;
  model: string;
  prompt: string;
  content: Record<string, unknown>;
  created_at: string;
};

export type StudyGenerationDraft = Pick<
  StudyGeneration,
  'kind' | 'title' | 'prompt' | 'content'
> & {
  provider?: string;
};

export function isStudyGeneration(value: unknown): value is StudyGeneration {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;

  return (
    typeof record.id === 'string' &&
    (record.kind === 'chat' ||
      record.kind === 'quiz' ||
      record.kind === 'material') &&
    typeof record.title === 'string' &&
    typeof record.provider === 'string' &&
    typeof record.model === 'string' &&
    typeof record.prompt === 'string' &&
    typeof record.content === 'object' &&
    record.content !== null &&
    !Array.isArray(record.content) &&
    typeof record.created_at === 'string'
  );
}
