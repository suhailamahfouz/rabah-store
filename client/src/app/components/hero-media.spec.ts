import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { HeroMediaComponent } from './hero-media';

describe('One playback source for all three mobile hero rows', () => {
  let paused: boolean;
  let frame: VideoFrameRequestCallback;
  const drawImage = vi.fn();
  beforeEach(() => {
    paused = true;
    drawImage.mockClear();
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
    vi.stubGlobal('IntersectionObserver', undefined);
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    vi.spyOn(HTMLMediaElement.prototype, 'paused', 'get').mockImplementation(() => paused);
    vi.spyOn(HTMLMediaElement.prototype, 'readyState', 'get').mockReturnValue(2);
    vi.spyOn(HTMLVideoElement.prototype, 'videoWidth', 'get').mockReturnValue(1920);
    vi.spyOn(HTMLVideoElement.prototype, 'videoHeight', 'get').mockReturnValue(1080);
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(async () => { paused = false; });
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => { paused = true; });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D);
    vi.stubGlobal('requestAnimationFrame', vi.fn());
    // JSDOM does not implement decoded-video callbacks.
    Object.defineProperty(HTMLVideoElement.prototype, 'requestVideoFrameCallback', { configurable: true, value: vi.fn(callback => { frame = callback; return 1; }) });
    Object.defineProperty(HTMLVideoElement.prototype, 'cancelVideoFrameCallback', { configurable: true, value: vi.fn() });
    TestBed.configureTestingModule({ imports: [HeroMediaComponent] });
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    Reflect.deleteProperty(HTMLVideoElement.prototype, 'requestVideoFrameCallback');
    Reflect.deleteProperty(HTMLVideoElement.prototype, 'cancelVideoFrameCallback');
  });

  it('uses the native video as the first row and copies it into rows two and three', async () => {
    const fixture = TestBed.createComponent(HeroMediaComponent);
    fixture.detectChanges();
    await Promise.resolve();
    const video = fixture.nativeElement.querySelector('video') as HTMLVideoElement;
    expect(fixture.nativeElement.querySelectorAll('video')).toHaveLength(1);
    expect(fixture.nativeElement.children[0]).toBe(video);
    expect(fixture.nativeElement.children[1].tagName).toBe('CANVAS');
    expect(fixture.nativeElement.children[2].tagName).toBe('CANVAS');
    expect(video.muted && video.defaultMuted && video.playsInline).toBe(true);
    expect(video.hasAttribute('webkit-playsinline')).toBe(true);
    frame(0, {} as VideoFrameCallbackMetadata);
    expect(drawImage).toHaveBeenCalledTimes(2);
    expect(drawImage.mock.calls.every(args => args[0] === video)).toBe(true);
    expect(drawImage.mock.calls[0].slice(1)).toEqual([0, 0, 720, 405]);
  });

  it('retries blocked autoplay on a real gesture without creating another player', async () => {
    vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValueOnce(new DOMException('Blocked', 'NotAllowedError'));
    const fixture = TestBed.createComponent(HeroMediaComponent);
    fixture.detectChanges();
    await Promise.resolve();
    document.dispatchEvent(new Event('touchstart'));
    await Promise.resolve();
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(2);
    expect(paused).toBe(false);
    expect(fixture.nativeElement.querySelectorAll('video')).toHaveLength(1);
  });

  it('stops playback and removes gesture listeners after leaving the page', async () => {
    const fixture = TestBed.createComponent(HeroMediaComponent);
    fixture.detectChanges();
    await Promise.resolve();
    fixture.destroy();
    expect(paused).toBe(true);
    expect(HTMLVideoElement.prototype.cancelVideoFrameCallback).toHaveBeenCalledWith(1);
    document.dispatchEvent(new Event('touchstart'));
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1);
  });

  it('keeps the second mirror updating when one canvas temporarily rejects a frame', async () => {
    drawImage.mockImplementationOnce(() => { throw new DOMException('Frame unavailable', 'InvalidStateError'); });
    const fixture = TestBed.createComponent(HeroMediaComponent);
    fixture.detectChanges();
    await Promise.resolve();
    frame(0, {} as VideoFrameCallbackMetadata);
    expect(drawImage).toHaveBeenCalledTimes(2);
  });
});
