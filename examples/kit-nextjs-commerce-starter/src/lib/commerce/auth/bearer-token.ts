import 'server-only';

export const readBearerToken = (request: Request): string | null => {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return null;

  const token = authorization.substring('Bearer '.length).trim();
  return token || null;
};
