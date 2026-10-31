export function isAuthServiceUnavailable(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const status = (error as Error & { status?: number }).status;
  return error.name === 'AuthRetryableFetchError' || error.name === 'TypeError' || (typeof status === 'number' && status >= 500);
}
