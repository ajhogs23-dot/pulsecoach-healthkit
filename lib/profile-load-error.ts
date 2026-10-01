export function profileLoadError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const requiresSignIn = /sign in|please login|unauthorized|invalid session/i.test(message);
  return {
    requiresSignIn,
    message: requiresSignIn
      ? "Your saved sign-in is no longer accepted by this server. Sign in again to load your Personal Details."
      : /timed out/i.test(message)
        ? "The server took too long to respond. Check your connection and retry."
        : `Could not load your Personal Details. ${message}`,
  };
}
