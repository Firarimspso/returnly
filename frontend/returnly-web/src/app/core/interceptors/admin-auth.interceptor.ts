import { HttpInterceptorFn } from '@angular/common/http';

const ADMIN_TOKEN_KEY = 'returnly_token';

export const adminAuthInterceptor: HttpInterceptorFn = (request, next) => {
  if (!isProtectedAdminRequest(request.url) || request.headers.has('Authorization')) {
    return next(request);
  }

  const token = globalThis.localStorage?.getItem(ADMIN_TOKEN_KEY)
    ?? globalThis.sessionStorage?.getItem(ADMIN_TOKEN_KEY)
    ?? globalThis.localStorage?.getItem('token');

  return next(token
    ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : request);
};

function isProtectedAdminRequest(url: string): boolean {
  try {
    const parsedUrl = new URL(url, globalThis.location?.origin ?? 'http://localhost');
    return parsedUrl.pathname.startsWith('/api/')
      && !parsedUrl.pathname.startsWith('/api/auth/')
      && !parsedUrl.pathname.startsWith('/api/public/');
  } catch {
    return false;
  }
}
