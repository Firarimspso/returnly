import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { adminAuthInterceptor } from './admin-auth.interceptor';
import { HttpClient } from '@angular/common/http';

describe('adminAuthInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([adminAuthInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  it('attaches the admin bearer token to redemption requests', () => {
    localStorage.setItem('returnly_token', 'admin-jwt');

    http.get('http://localhost:5230/api/redemption-requests').subscribe();

    const request = controller.expectOne('http://localhost:5230/api/redemption-requests');
    expect(request.request.headers.get('Authorization')).toBe('Bearer admin-jwt');
    request.flush({});
  });

  it('does not attach the admin token to public customer APIs', () => {
    localStorage.setItem('returnly_token', 'admin-jwt');

    http.get('http://localhost:5230/api/public/qr/token').subscribe();

    const request = controller.expectOne('http://localhost:5230/api/public/qr/token');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
  });
});
