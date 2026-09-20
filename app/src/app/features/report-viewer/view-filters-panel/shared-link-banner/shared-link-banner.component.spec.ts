import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { beforeEach, describe, expect, it } from 'vitest';
import { SharedLinkState } from '../../filters/shared-link-state';
import { SharedLinkBannerComponent } from './shared-link-banner.component';

describe('SharedLinkBannerComponent', () => {
  let fixture: ComponentFixture<SharedLinkBannerComponent>;

  async function render(link: SharedLinkState): Promise<SharedLinkBannerComponent> {
    fixture = TestBed.createComponent(SharedLinkBannerComponent);
    fixture.componentRef.setInput('link', link);
    await fixture.whenStable();
    return fixture.componentInstance;
  }

  const text = () => (fixture.nativeElement as HTMLElement).textContent!.replace(/\s+/g, ' ');

  beforeEach(() => TestBed.configureTestingModule({}));

  it('just says the filters came from a link when all of them applied', async () => {
    const banner = await render({ total: 2, unmatched: 0, missingColumns: 0 });

    expect(text()).toContain('Showing filters from a shared link.');
    expect(banner.unmatchedText()).toBe('');
    expect(banner.missingText()).toBe('');
  });

  it('counts filters left out because their widget is not in this version', async () => {
    const banner = await render({ total: 3, unmatched: 2, missingColumns: 0 });

    expect(banner.unmatchedText()).toBe("2 of 3 filters in it don't apply to this version and were left out.");
  });

  it('uses the singular for one', async () => {
    const banner = await render({ total: 1, unmatched: 1, missingColumns: 0 });

    expect(banner.unmatchedText()).toBe("1 of 1 filter in it doesn't apply to this version and was left out.");
  });

  it('counts conditions left out because their column no longer exists', async () => {
    const many = await render({ total: 1, unmatched: 0, missingColumns: 2 });
    expect(many.missingText()).toBe('2 conditions in it test columns that no longer exist, so they were left out.');

    const one = await render({ total: 1, unmatched: 0, missingColumns: 1 });
    expect(one.missingText()).toBe('1 condition in it tests a column that no longer exists, so it was left out.');
  });

  it('shows both notes when both apply', async () => {
    await render({ total: 3, unmatched: 1, missingColumns: 1 });

    expect(text()).toContain('left out.');
    expect(fixture.nativeElement.querySelectorAll('.warning')).toHaveLength(2);
  });

  it('offers "Save as mine" and "Back to mine"', async () => {
    const banner = await render({ total: 1, unmatched: 0, missingColumns: 0 });
    let saved = 0;
    let discarded = 0;
    banner.save.subscribe(() => saved++);
    banner.discard.subscribe(() => discarded++);

    const [save, discard] = fixture.debugElement.queryAll(By.css('p-button'));
    save.triggerEventHandler('onClick', {});
    discard.triggerEventHandler('onClick', {});

    expect([saved, discarded]).toEqual([1, 1]);
    expect(text()).toContain('Save as mine');
    expect(text()).toContain('Back to mine');
  });
});
