import { AfterViewInit, Component, ElementRef, Input, OnDestroy, ViewChild } from '@angular/core';

@Component({
  selector: 'app-hero-media',
  standalone: true,
  template: `
    <!-- Keep the decoder before every canvas. On iOS the decoded frames are
         valid even when WebKit's native video compositor renders black. -->
    <video #source class="source-video" autoplay muted loop playsinline preload="auto" [poster]="poster" aria-hidden="true">
      <source src="/videos/rabah-hero.mp4" type="video/mp4" />
    </video>
    <canvas #top class="mobile-panel" [style.background-image]="poster ? 'url(' + poster + ')' : null" aria-hidden="true"></canvas>
    <canvas #middle class="mobile-panel" [style.background-image]="poster ? 'url(' + poster + ')' : null" aria-hidden="true"></canvas>
    <canvas #bottom class="mobile-panel" [style.background-image]="poster ? 'url(' + poster + ')' : null" aria-hidden="true"></canvas>
  `,
  styles: [`
    :host { position: absolute; inset: 0; display: block; pointer-events: none; background: #332325; }
    .source-video { display: block; width: 100%; height: 100%; object-fit: cover; object-position: 70% center; }
    .mobile-panel { display: none; }
    @media (max-width: 640px) {
      :host { display: grid; grid-template-rows: repeat(3, minmax(0, 1fr)); gap: 2px; }
      .source-video {
        position: absolute;
        inset: 0 auto auto 0;
        width: 1px;
        height: 1px;
        min-width: 1px;
        min-height: 1px;
        opacity: 0.001;
      }
      .mobile-panel {
        display: block;
        width: 100%;
        height: 100%;
        min-width: 0;
        min-height: 0;
        max-width: 100%;
        max-height: 100%;
        object-fit: cover;
        object-position: center;
        background-size: cover;
        background-repeat: no-repeat;
        background-position: center;
      }
    }
    @supports (-webkit-touch-callout: none) {
      @media (max-width: 640px) {
        :host { gap: 0; }
        .mobile-panel { object-fit: contain; background-size: contain; }
      }
    }
  `],
})
export class HeroMediaComponent implements AfterViewInit, OnDestroy {
  @Input() poster = '';
  @ViewChild('source', { static: true }) private source!: ElementRef<HTMLVideoElement>;
  @ViewChild('top', { static: true }) private top!: ElementRef<HTMLCanvasElement>;
  @ViewChild('middle', { static: true }) private middle!: ElementRef<HTMLCanvasElement>;
  @ViewChild('bottom', { static: true }) private bottom!: ElementRef<HTMLCanvasElement>;
  private frameId?: number;
  private videoFrame = false;
  private destroyed = false;
  private visible = true;
  private pending = false;
  private observer?: IntersectionObserver;
  private readonly cleanup: Array<() => void> = [];
  private readonly mobile = window.matchMedia('(max-width: 640px)');

  ngAfterViewInit(): void {
    const video = this.source.nativeElement;
    video.muted = video.defaultMuted = true;
    video.playsInline = true;
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');

    const resume = () => this.resume();
    this.listen(video, 'loadedmetadata', resume);
    this.listen(video, 'loadeddata', () => { this.paint(); this.resume(); });
    this.listen(video, 'canplay', resume);
    this.listen(video, 'playing', () => { this.paint(); this.scheduleFrame(); });
    // Some iOS versions advance playback while delaying video-frame callbacks.
    this.listen(video, 'timeupdate', () => this.paint());
    this.listen(video, 'pause', () => this.cancelFrame());
    this.listen(video, 'error', () => this.cancelFrame());
    this.listen(document, 'visibilitychange', () => {
      if (document.visibilityState === 'hidden') { video.pause(); this.cancelFrame(); }
      else this.resume();
    });
    this.listen(window, 'pageshow', resume);
    this.listen(window, 'focus', resume);
    this.listen(document, 'touchstart', resume);
    this.listen(document, 'pointerdown', resume);

    const layoutChanged = () => { this.paint(); this.resume(); };
    this.mobile.addEventListener?.('change', layoutChanged);
    this.cleanup.push(() => this.mobile.removeEventListener?.('change', layoutChanged));
    if (typeof IntersectionObserver !== 'undefined') {
      this.observer = new IntersectionObserver(entries => {
        this.visible = entries.some(entry => entry.isIntersecting);
        if (this.visible) this.resume();
        else { video.pause(); this.cancelFrame(); }
      });
      this.observer.observe(video.parentElement!);
    }
    this.resume();
  }

  private resume(): void {
    const video = this.source.nativeElement;
    if (this.destroyed || !this.visible || document.visibilityState === 'hidden' || video.error) return;
    if (!video.paused) { this.scheduleFrame(); return; }
    if (this.pending) return;
    video.muted = true;
    this.pending = true;
    void video.play().then(() => {
      this.pending = false;
      if (this.destroyed || !this.visible || document.visibilityState === 'hidden') video.pause();
      else { this.paint(); this.scheduleFrame(); }
    }, () => {
      // Readiness, visibility and real user gestures retry blocked autoplay.
      this.pending = false;
    });
  }

  private paint(): void {
    const video = this.source.nativeElement;
    if (!this.mobile.matches || video.readyState < 2 || !video.videoWidth || !video.videoHeight) return;
    // 480px is enough for a mobile panel and keeps three canvas copies light.
    const width = Math.min(480, video.videoWidth);
    const height = Math.round(width * video.videoHeight / video.videoWidth);
    for (const canvas of [this.top.nativeElement, this.middle.nativeElement, this.bottom.nativeElement]) {
      if (canvas.width !== width) canvas.width = width;
      if (canvas.height !== height) canvas.height = height;
      try {
        const context = canvas.getContext('2d');
        if (!context) continue;
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';
        context.drawImage(video, 0, 0, width, height);
      } catch {
        // Keep the poster visible and retry on the next decoded frame.
      }
    }
  }

  private scheduleFrame(): void {
    const video = this.source.nativeElement;
    if (this.frameId !== undefined || this.destroyed || !this.visible || !this.mobile.matches
      || video.paused || document.visibilityState === 'hidden') return;
    const render = () => {
      this.frameId = undefined;
      if (this.destroyed) return;
      this.paint();
      this.scheduleFrame();
    };
    this.videoFrame = typeof video.requestVideoFrameCallback === 'function'
      && typeof video.cancelVideoFrameCallback === 'function';
    this.frameId = this.videoFrame ? video.requestVideoFrameCallback(render) : requestAnimationFrame(render);
  }

  private cancelFrame(): void {
    if (this.frameId === undefined) return;
    if (this.videoFrame) this.source.nativeElement.cancelVideoFrameCallback(this.frameId);
    else cancelAnimationFrame(this.frameId);
    this.frameId = undefined;
  }

  private listen(target: EventTarget, name: string, handler: () => void): void {
    target.addEventListener(name, handler, { passive: true });
    this.cleanup.push(() => target.removeEventListener(name, handler));
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.observer?.disconnect();
    this.cleanup.forEach(remove => remove());
    this.cancelFrame();
    this.source.nativeElement.pause();
  }
}
