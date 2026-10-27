import { env } from 'cloudflare:workers';
import { handleAPI } from '../../../lib/wolfguard/core.mjs';
export const dynamic = 'force-dynamic';
const dispatch = (request: Request) => handleAPI(request, env);
export { dispatch as GET, dispatch as POST, dispatch as PUT, dispatch as OPTIONS };
