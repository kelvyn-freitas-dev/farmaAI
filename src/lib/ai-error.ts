function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function logAIError(context: string, error: unknown) {
  const details = isRecord(error) ? error : undefined;
  const cause = error instanceof Error ? error.cause : details?.cause;
  const causeDetails = isRecord(cause) ? cause : undefined;
  const statusValue = details?.status ?? details?.statusCode;
  const codeValue = details?.code;
  const failures = Array.isArray(details?.failures)
    ? details.failures.map((failure) => {
        if (!isRecord(failure)) return { message: String(failure) };
        return {
          provider:
            typeof failure.provider === 'string' ? failure.provider : undefined,
          status: typeof failure.status === 'number' ? failure.status : undefined,
          message:
            typeof failure.message === 'string' ? failure.message : undefined,
        };
      })
    : undefined;

  const logDetails = {
    name: error instanceof Error ? error.name : details?.name,
    message:
      error instanceof Error
        ? error.message
        : details?.message ?? String(error),
    stack: error instanceof Error ? error.stack : details?.stack,
    status: typeof statusValue === 'number' ? statusValue : undefined,
    code:
      typeof codeValue === 'string' || typeof codeValue === 'number'
        ? codeValue
        : undefined,
    failures,
    cause:
      cause instanceof Error
        ? {
            name: cause.name,
            message: cause.message,
            status:
              typeof (causeDetails?.status ?? causeDetails?.statusCode) ===
              'number'
                ? causeDetails?.status ?? causeDetails?.statusCode
                : undefined,
            code:
              typeof causeDetails?.code === 'string' ||
              typeof causeDetails?.code === 'number'
                ? causeDetails.code
                : undefined,
          }
        : typeof cause === 'string'
          ? cause
          : undefined,
  };

  console.error(`${context} ${JSON.stringify(logDetails)}`);
}
