import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { InlineHeroVideoDirective } from './inline-hero-video';

@Component({
  imports: [InlineHeroVideoDirective],
  template: '<video appInlineHeroVideo></video><video appInlineHeroVideo></video><video appInlineHeroVideo></video>',
})
class VideoHost {}

describe('Independent inline hero playback', () => {
  beforeEach(() => {
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    vi.stubGlobal('IntersectionObserver', undefined);
    TestBed.configureTestingModule({ imports: [VideoHost] });
  });
  afterEach(() => { TestBed.resetTestingModule(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it('retries the first video when ready after Safari rejects its initial autoplay', async () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play')
      .mockRejectedValueOnce(new DOMException('Autoplay blocked', 'NotAllowedError'))
      .mockResolvedValue();
    const fixture = TestBed.createComponent(VideoHost);
    fixture.detectChanges();
    const videos: HTMLVideoElement[] = Array.from(fixture.nativeElement.querySelectorAll('video'));
    expect(play).toHaveBeenCalledTimes(3);
    expect(videos.every(video => video.muted && video.defaultMuted && video.playsInline)).toBe(true);
    await fixture.whenStable();
    videos[0].dispatchEvent(new Event('canplay'));
    expect(play).toHaveBeenCalledTimes(4);
    expect(play.mock.instances[3]).toBe(videos[0]);
  });

  it('recovers paused videos on a gesture and removes listeners when leaving the page', async () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    const fixture = TestBed.createComponent(VideoHost);
    fixture.detectChanges();
    await fixture.whenStable();
    document.dispatchEvent(new Event('touchend'));
    expect(play).toHaveBeenCalledTimes(6);
    await fixture.whenStable();
    fixture.destroy();
    document.dispatchEvent(new Event('touchend'));
    window.dispatchEvent(new Event('pageshow'));
    expect(play).toHaveBeenCalledTimes(6);
  });

  it('restarts a paused top row when it re-enters the viewport', async () => {
    const callbacks: IntersectionObserverCallback[] = [];
    vi.stubGlobal('IntersectionObserver', class {
      constructor(callback: IntersectionObserverCallback) { callbacks.push(callback); }
      observe() {}
      disconnect() {}
    });
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    const fixture = TestBed.createComponent(VideoHost);
    fixture.detectChanges();
    await fixture.whenStable();
    callbacks[0]([{ isIntersecting: false } as IntersectionObserverEntry], {} as IntersectionObserver);
    fixture.nativeElement.querySelector('video').dispatchEvent(new Event('canplay'));
    expect(play).toHaveBeenCalledTimes(3);
    callbacks[0]([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    expect(play).toHaveBeenCalledTimes(4);
  });
});
