import { Component } from '@angular/core';

@Component({
  selector: 'app-storefront-intro',
  template: `<div class="icons" role="status" aria-label="RABAH">
    <svg viewBox="0 0 64 64" aria-hidden="true"><path d="M15 24h34l4 30H11l4-30ZM23 26V18a9 9 0 0 1 18 0v8M19 33v4m26-4v4"/></svg>
    <svg viewBox="0 0 64 64" aria-hidden="true"><path d="m22 17 5-7h10l5 7-10 11-10-11Zm0 0h20M27 10l5 18 5-18"/><circle cx="32" cy="41" r="15"/></svg>
    <svg viewBox="0 0 64 64" aria-hidden="true"><path d="M5 29 9 18h11m39 11-4-11H44M27 33c3-4 7-4 10 0M5 29h22v8a9 9 0 0 1-22 0v-8Zm32 0h22v8a9 9 0 0 1-22 0v-8Z"/></svg>
    <svg viewBox="0 0 64 64" aria-hidden="true"><path d="M13 18h37v35H13a5 5 0 0 1-5-5V19a5 5 0 0 1 4-5l31-6v10M8 23h42M42 32h13v12H42a6 6 0 0 1 0-12Z"/><path d="M44 38h1"/></svg>
  </div>`,
  styles: [`
    :host{position:fixed;inset:0;bottom:var(--storefront-bottom-nav-height,0px);z-index:30;background:#f3f3f2;display:grid;place-items:center;pointer-events:none;animation:exit 1.25s ease both}
    .icons{display:flex;gap:clamp(14px,5vw,32px);align-items:center;padding:24px}
    svg{width:clamp(42px,12vw,64px);fill:none;stroke:#171717;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round;animation:arrive .55s ease both}
    svg:nth-child(2){animation-delay:.16s}svg:nth-child(3){animation-delay:.32s}svg:nth-child(4){animation-delay:.48s}
    @keyframes arrive{from{opacity:0;transform:translateY(9px)}to{opacity:1;transform:translateY(0)}}
    @keyframes exit{0%,80%{opacity:1}100%{opacity:0}}
    @media(prefers-reduced-motion:reduce){:host,svg{animation:none}}
  `],
})
export class StorefrontIntroComponent {}
