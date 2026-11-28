// Standalone Cloudflare Worker for the WolfGuard API (no framework, no Sites tooling).
// It only exposes /api/* through handleAPI; every other address answers 404 like the current host.
import { handleAPI } from '../lib/wolfguard/core.mjs';

const METHODS = new Set(['GET', 'POST', 'PUT', 'OPTIONS']);

const worker = {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (!pathname.startsWith('/api/')) return new Response('Not found', { status: 404 });
    if (!METHODS.has(request.method))
      return new Response(null, { status: 405, headers: { Allow: 'GET, POST, PUT, OPTIONS' } });
    return handleAPI(request, env);
  }
};

export default worker;
