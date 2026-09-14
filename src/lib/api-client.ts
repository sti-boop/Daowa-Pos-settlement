/**
 * API client — direct fetch to Next.js API routes.
 */

export function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return fetch(input, init);
}
