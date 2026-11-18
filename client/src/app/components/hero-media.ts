import { AfterViewInit, Component, ElementRef, Input, OnDestroy, ViewChild } from '@angular/core';

@Component({
  selector: 'app-hero-media',
  standalone: true,
  template: `
    <video #primary class="primary-video" autoplay muted loop playsinline preload="auto" [poster]="poster" aria-hidden="true">
      <source src="/videos/rabah-hero.mp4" type="video/mp4" />
    </video>
    <video #secondary class="mobile-video" muted loop playsinline preload="auto" [poster]="poster" aria-hidden="true">
      <source src="/videos/rabah-hero.mp4" type="video/mp4" />
    </video>
  `,
  styles: [`
    :host { position: absolute; inset: 0; display: block; pointer-events: none; background: #332325; }
    video { display: block; width: 100%; height: 100%; object-fit: cover; object-position: 70% center; }
    .mobile-video { display: none; }
    @media (max-width: 640px) {
      :host { display: grid; grid-template-rows: repeat(2, minmax(0, 1fr)); gap: 2px; }
      video, .mobile-video { display: block; width: 100%; height: 100%; min-width: 0; min-height: 0; max-width: 100%; max-height: 100%; object-fit: cover; object-position: center; }
    }
    @supports (-webkit-touch-callout: none) {
      @media (max-width: 640px) {
        :host { gap: 0; }
        video, .mobile-video { object-fit: contain; object-position: center center; }
      }
    }
  `],
})
export class HeroMediaComponent implements AfterViewInit, OnDestroy {
  @Input() poster = '';
  @ViewChild('primary', { static: true }) private primary!: ElementRef<HTMLVideoElement>;
  @ViewChild('secondary', { static: true }) private secondary!: ElementRef<HTMLVideoElement>;
  private destroyed = false;
  private visible = true;
  private observer?: IntersectionObserver;
  private readonly pending = new Set<HTMLVideoElement>();
  private readonly cleanup: Array<() => void> = [];
  private readonly mobile = window.matchMedia('(max-width: 640px)');

  ngAfterViewInit(): void {
    const primary = this.primary.nativeElement;
    const secondary = this.secondary.nativeElement;
    this.configure(primary);
    this.configure(secondary);

    const resume = () => this.resume();
    for (const video of [primary, secondary]) {
      this.listen(video, 'loadedmetadata', () => { this.syncSecondary(true); this.resume(); });
      this.listen(video, 'canplay', resume);
    }
    this.listen(primary, 'playing', () => { this.syncSecondary(true); this.resume(); });
    this.listen(primary, 'timeupdate', () => this.syncSecondary());
    this.listen(primary, 'seeked', () => this.syncSecondary(true));

    this.listen(document, 'visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.pauseAll();
      else this.resume();
    });
    this.listen(window, 'pageshow', resume);
    this.listen(window, 'focus', resume);
    // Keep play() inside the activation event so iOS can recover if its first
    // muted-autoplay attempt was declined by power or data-saving settings.
    this.listen(document, 'touchstart', resume);
    this.listen(document, 'pointerdown', resume);

    const layoutChanged = () => {
      if (!this.mobile.matches) secondary.pause();
      this.syncSecondary(true);
      this.resume();
    };
    this.mobile.addEventListener?.('change', layoutChanged);
    this.cleanup.push(() => this.mobile.removeEventListener?.('change', layoutChanged));

    if (typeof IntersectionObserver !== 'undefined') {
      this.observer = new IntersectionObserver(entries => {
        this.visible = entries.some(entry => entry.isIntersecting);
        if (this.visible) this.resume();
        else this.pauseAll();
      });
      this.observer.observe(primary.parentElement!);
    }
    this.resume();
  }

  private configure(video: HTMLVideoElement): void {
    video.muted = video.defaultMuted = true;
    video.playsInline = true;
    // WebKit checks the content attributes as well as the DOM properties when
    // deciding whether inline autoplay is permitted.
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
  }

  private resume(): void {
    const primary = this.primary.nativeElement;
    const secondary = this.secondary.nativeElement;
    if (this.destroyed || !this.visible || document.visibilityState === 'hidden') return;

    this.play(primary);
    if (this.mobile.matches) {
      this.syncSecondary(true);
      this.play(secondary);
    } else {
      secondary.pause();
    }
  }

  private play(video: HTMLVideoElement): void {
    if (!video.paused || video.error || this.pending.has(video)) return;
    video.muted = true;
    this.pending.add(video);
    void video.play().then(() => {
      this.pending.delete(video);
      if (this.destroyed || !this.visible || document.visibilityState === 'hidden'
        || (video === this.secondary.nativeElement && !this.mobile.matches)) {
        video.pause();
        return;
      }
      this.syncSecondary(true);
    }, () => {
      // Readiness, visibility and real user gestures retry blocked autoplay.
      this.pending.delete(video);
    });
  }

  private syncSecondary(force = false): void {
    if (!this.mobile.matches) return;
    const primary = this.primary.nativeElement;
    const secondary = this.secondary.nativeElement;
    if (primary.readyState < 1 || secondary.readyState < 1) return;
    const drift = Math.abs(secondary.currentTime - primary.currentTime);
    if (force || drift > 0.12) {
      try {
        secondary.currentTime = primary.currentTime;
      } catch {
        // iOS can reject seeking briefly while metadata is still settling.
      }
    }
  }

  private pauseAll(): void {
    this.primary.nativeElement.pause();
    this.secondary.nativeElement.pause();
  }

  private listen(target: EventTarget, name: string, handler: () => void): void {
    target.addEventListener(name, handler, { passive: true });
    this.cleanup.push(() => target.removeEventListener(name, handler));
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.observer?.disconnect();
    this.cleanup.forEach(remove => remove());
    this.pending.clear();
    this.pauseAll();
  }
}
