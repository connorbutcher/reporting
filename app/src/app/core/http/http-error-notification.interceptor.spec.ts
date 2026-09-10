import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NotificationService } from '../services/notification.service';
import {
  httpErrorNotificationInterceptor,
  skipHttpErrorNotification,
} from './http-error-notification.interceptor';

describe('httpErrorNotificationInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let notify: { error: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    notify = { error: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([httpErrorNotificationInterceptor])),
        provideHttpClientTesting(),
        { provide: NotificationService, useValue: notify },
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  /** Fires <method> <url>, responds with <status>, and swallows the (expected) error. */
  function request(method: 'GET' | 'POST', url: string, status: number, opts?: { skip?: boolean }): void {
    const observable =
      method === 'GET'
        ? http.get(url, opts?.skip ? { context: skipHttpErrorNotification() } : {})
        : http.post(url, {}, opts?.skip ? { context: skipHttpErrorNotification() } : {});
    observable.subscribe({ next: () => {}, error: () => {} });
    httpMock.expectOne(url).flush('err', { status, statusText: 'x' });
  }

  it('shows an access-denied toast on a 403, whatever the method', () => {
    request('POST', '/api/reports/1', 403);
    expect(notify.error).toHaveBeenCalledTimes(1);
    expect(notify.error).toHaveBeenCalledWith(expect.any(String), 'Access denied');
  });

  it('shows a not-found toast on a GET 404', () => {
    request('GET', '/api/reports/1', 404);
    expect(notify.error).toHaveBeenCalledWith(expect.any(String), 'Not found');
  });

  it('does not toast a 404 on a write (left to the call site)', () => {
    request('POST', '/api/reports/1/favorite', 404);
    expect(notify.error).not.toHaveBeenCalled();
  });

  it('stays silent on success and on unrelated errors', () => {
    http.get('/api/reports').subscribe({ next: () => {}, error: () => {} });
    httpMock.expectOne('/api/reports').flush([]);
    request('GET', '/api/reports/1', 500);
    expect(notify.error).not.toHaveBeenCalled();
  });

  it('honours the skip token', () => {
    request('GET', '/api/reports/1/draft', 404, { skip: true });
    request('POST', '/api/reports/1', 403, { skip: true });
    expect(notify.error).not.toHaveBeenCalled();
  });
});
