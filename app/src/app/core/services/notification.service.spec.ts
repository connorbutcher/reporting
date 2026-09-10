import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let add: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    add = vi.fn();
    TestBed.configureTestingModule({
      providers: [NotificationService, { provide: MessageService, useValue: { add, clear: vi.fn() } }],
    });
    service = TestBed.inject(NotificationService);
  });

  const forbidden = new HttpErrorResponse({ status: 403 });
  const notFound = new HttpErrorResponse({ status: 404 });
  const serverError = new HttpErrorResponse({ status: 500 });

  describe('apiError (a failed write)', () => {
    it('defers a 403 to the global interceptor (shows nothing)', () => {
      service.apiError(forbidden, 'Could not save.');
      expect(add).not.toHaveBeenCalled();
    });

    it('shows the fallback for anything else, including a 404', () => {
      service.apiError(notFound, 'Could not save.');
      service.apiError(serverError, 'Could not save 2.');
      expect(add).toHaveBeenCalledTimes(2);
    });
  });

  describe('loadError (a failed read)', () => {
    it('defers both 403 and 404 to the global interceptor', () => {
      service.loadError(forbidden, 'Could not load.');
      service.loadError(notFound, 'Could not load.');
      expect(add).not.toHaveBeenCalled();
    });

    it('shows the fallback for a non-access failure', () => {
      service.loadError(serverError, 'Could not load.');
      expect(add).toHaveBeenCalledTimes(1);
    });
  });

  it('collapses an identical error already on screen into one toast', () => {
    service.error('This couldn\'t be found.', 'Not found');
    service.error('This couldn\'t be found.', 'Not found');
    expect(add).toHaveBeenCalledTimes(1);
  });
});
