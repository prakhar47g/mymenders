import { handleAdminRequest } from '../lib/admin.js';

export default async function handler(request: Request) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\/admin\/?/, '').replace(/\/$/, '');
  return handleAdminRequest(request, path);
}
