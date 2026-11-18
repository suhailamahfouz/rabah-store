import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { HeroMediaComponent } from './hero-media';

describe('Two synchronized native mobile hero videos', () => {
  let mobile = true;
  let playback: WeakMap<HTMLMediaElement, boolean>;

  beforeEach(() => {
    mobile = true;
    playback = new WeakMap<HTMLMediaElement, boolean>();
    vi.stubGlobal('matchMedia', () => ({
      get matches() { return mobile; },
      addEventListener() {},
      removeEventListener() {},
    }));
    vi.stubGlobal('IntersectionObserver', undefined);
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    vi.spyOn(HTMLMediaElement.prototype, 'paused', 'get').mockImplementation(function (this: HTMLMediaElement) {
      return playback.get(this) ?? true;
    });
    vi.spyOn(HTMLMediaElement.prototype, 'readyState', 'get').mockReturnValue(2);
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (this: HTMLMediaElement) {
      playback.set(this, false);
      return Promise.resolve();
    });
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(function (this: HTMLMediaElement) {
      playback.set(this, true);
    });
    TestBed.configureTestingModule({ imports: [HeroMediaComponent] });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('uses two native inline videos and no canvas on mobile', async () => {
    const fixture = TestBed.createComponent(HeroMediaComponent);
    fixture.detectChanges();
    await Promise.resolve();
    const videos = fixture.nativeElement.querySelectorAll('video') as NodeListOf<HTMLVideoElement>;
    expect(videos).toHaveLength(2);
    expect(fixture.nativeElement.querySelector('canvas')).toBeNull();
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(2);
    for (const video of videos) {
      expect(video.muted && video.defaultMuted && video.playsInline).toBe(true);
      expect(video.hasAttribute('webkit-playsinline')).toBe(true);
    }
  });

  it('keeps the second video on the first video timeline', async () => {
    const fixture = TestBed.createComponent(HeroMediaComponent);
    fixture.detectChanges();
    await Promise.resolve();
    const [primary, secondary] = fixture.nativeElement.querySelectorAll('video') as NodeListOf<HTMLVideoElement>;
    primary.currentTime = 8;
    secondary.currentTime = 3;
    primary.dispatchEvent(new Event('timeupdate'));
    expect(secondary.currentTime).toBe(8);
  });

  it('retries an autoplay rejection on a real touch gesture', async () => {
    vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValueOnce(new DOMException('Blocked', 'NotAllowedError'));
    const fixture = TestBed.createComponent(HeroMediaComponent);
    fixture.detectChanges();
    await Promise.resolve();
    document.dispatchEvent(new Event('touchstart'));
    await Promise.resolve();
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(3);
  });

  it('keeps desktop on one active video', async () => {
    mobile = false;
    const fixture = TestBed.createComponent(HeroMediaComponent);
    fixture.detectChanges();
    await Promise.resolve();
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.querySelector('.mobile-video')).not.toBeNull();
  });

  it('stops both videos and removes gesture listeners after leaving the page', async () => {
    const fixture = TestBed.createComponent(HeroMediaComponent);
    fixture.detectChanges();
    await Promise.resolve();
    const playsBeforeDestroy = vi.mocked(HTMLMediaElement.prototype.play).mock.calls.length;
    fixture.destroy();
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalledTimes(2);
    document.dispatchEvent(new Event('touchstart'));
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(playsBeforeDestroy);
  });
});
