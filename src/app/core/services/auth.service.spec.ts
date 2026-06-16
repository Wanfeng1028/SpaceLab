import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuthService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('login', () => {
    it('should POST to /auth/login and store auth data', () => {
      const mockResponse = {
        token: 'abc',
        refresh_token: 'def',
        user: { id: '1', email: 'test@example.com', username: 'test', role: 'viewer', status: 'active', created_at: '2025-01-01' },
        expires_at: '2026-01-01',
      };

      service.login('test@example.com', 'password123').subscribe((res) => {
        expect(res.token).toBe('abc');
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ email: 'test@example.com', password: 'password123' });
      req.flush(mockResponse);
    });
  });

  describe('register', () => {
    it('should POST to /auth/register', () => {
      const mockResponse = {
        token: 'abc',
        refresh_token: 'def',
        user: { id: '1', email: 'test@example.com', username: 'testuser', role: 'viewer', status: 'active', created_at: '2025-01-01' },
        expires_at: '2026-01-01',
      };

      service.register('test@example.com', 'password123', 'testuser').subscribe((res) => {
        expect(res.user.email).toBe('test@example.com');
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/register`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ email: 'test@example.com', password: 'password123', username: 'testuser' });
      req.flush(mockResponse);
    });
  });
});

describe('login with captcha params', () => {
  it('should include captcha_token, captcha_id and captcha_answer', () => {
    const mockResponse = {
      token: 'abc', refresh_token: 'def',
      user: { id: '1', email: 'test@example.com', username: 'test', role: 'viewer', status: 'active', created_at: '2025-01-01' },
      expires_at: '2026-01-01',
    };

    service.login('test@example.com', 'password123', 'turnstile_token', 'cid', '42').subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
    expect(req.request.body).toEqual({
      email: 'test@example.com',
      password: 'password123',
      captcha_token: 'turnstile_token',
      captcha_id: 'cid',
      captcha_answer: '42',
    });
    req.flush(mockResponse);
  });
});

describe('register with captcha params', () => {
  it('should include captcha fields', () => {
    const mockResponse = {
      token: 'abc', refresh_token: 'def',
      user: { id: '1', email: 'test@example.com', username: 'testuser', role: 'viewer', status: 'active', created_at: '2025-01-01' },
      expires_at: '2026-01-01',
    };

    service.register('test@example.com', 'Password123', 'testuser', 'ts_token', 'cid', '42').subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/register`);
    expect(req.request.body).toEqual({
      email: 'test@example.com',
      password: 'Password123',
      username: 'testuser',
      captcha_token: 'ts_token',
      captcha_id: 'cid',
      captcha_answer: '42',
    });
    req.flush(mockResponse);
  });
});
