import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { NavbarComponent } from './navbar';

describe('landing navigation customer entry', () => {
  it('routes View my rewards to the standalone customer login', async () => {
    await TestBed.configureTestingModule({
      imports: [NavbarComponent],
      providers: [provideRouter([{ path: 'my-rewards', component: NavbarComponent }])],
    }).compileComponents();
    const fixture = TestBed.createComponent(NavbarComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const link = host.querySelector<HTMLAnchorElement>('.customer-rewards-link');

    expect(link?.textContent?.trim()).toBe('View my rewards');
    link?.click();
    await TestBed.inject(Router).navigateByUrl('/my-rewards');

    expect(TestBed.inject(Router).url).toBe('/my-rewards');
  });
});
