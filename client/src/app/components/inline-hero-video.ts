import { AfterViewInit, Directive, ElementRef, OnDestroy, inject } from '@angular/core';

/** Each decorative video recovers independently from Safari autoplay suspension. */
@Directive({ selector: 'video[appInlineHeroVideo]', standalone: true })
export class InlineHeroVideoDirective implements AfterViewInit, OnDestroy {
  private readonly video = inject<ElementRef<HTMLVideoElement>>(ElementRef).nativeElement;
  private readonly cleanups: Array<() => void> = [];
  private observer?: IntersectionObserver;
  private destroyed = false;
  private pending = false;
  private visible = true;

  ngAfterViewInit(): void {
    this.video.defaultMuted = true;
    this.video.muted = true;
    this.video.playsInline = true;
    this.video.setAttribute('muted', '');
    this.video.setAttribute('playsinline', '');
    const resume = () => this.resume();
    for (const event of ['loadeddata', 'canplay']) this.listen(this.video, event, resume);
    this.listen(document, 'visibilitychange', resume);
    this.listen(window, 'pageshow', resume);
    // A real gesture also recovers when iOS declines autoplay (e.g. power saving).
    this.listen(document, 'touchend', resume);
    this.listen(document, 'click', resume);
    if (typeof IntersectionObserver !== 'undefined') {
      this.observer = new IntersectionObserver(entries => {
        this.visible = entries.some(entry => entry.isIntersecting);
        if (this.visible) this.resume();
      });
      this.observer.observe(this.video);
    }
    this.resume();
  }

  private resume(): void {
    if (this.destroyed || this.pending || !this.visible || document.visibilityState === 'hidden' || !this.video.paused || this.video.error) return;
    this.video.muted = true;
    this.pending = true;
    // Rejection is not a broken file. Retry on readiness, visibility or a gesture,
    // without hiding the other videos or running an endless polling loop.
    try {
      Promise.resolve(this.video.play()).catch(() => {}).finally(() => {
        this.pending = false;
        if (this.destroyed) this.video.pause();
      });
    } catch {
      this.pending = false;
    }
  }

  private listen(target: EventTarget, event: string, callback: () => void): void {
    target.addEventListener(event, callback, { passive: true });
    this.cleanups.push(() => target.removeEventListener(event, callback));
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.observer?.disconnect();
    this.cleanups.forEach(cleanup => cleanup());
    this.video.pause();
  }
}
