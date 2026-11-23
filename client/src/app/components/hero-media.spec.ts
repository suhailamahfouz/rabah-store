import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { HeroMediaComponent } from './hero-media';

describe('One decoder with one three-panel mobile canvas', () => {
  let paused: boolean;
  let frame: VideoFrameRequestCallback;
  const drawImage = vi.fn();

  beforeEach(() => {
    paused = true;
    drawImage.mockReset();
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
    vi.stubGlobal('IntersectionObserver', undefined);
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    vi.spyOn(HTMLMediaElement.prototype, 'paused', 'get').mockImplementation(() => paused);
    vi.spyOn(HTMLMediaElement.prototype, 'readyState', 'get').mockReturnValue(2);
    vi.spyOn(HTMLVideoElement.prototype, 'videoWidth', 'get').mockReturnValue(1920);
    vi.spyOn(HTMLVideoElement.prototype, 'videoHeight', 'get').mockReturnValue(1080);
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(async () => { paused = false; });
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => { paused = true; });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage, fillRect() {} } as unknown as CanvasRenderingContext2D);
    Object.defineProperty(HTMLVideoElement.prototype, 'requestVideoFrameCallback', {
      configurable: true,
      value: vi.fn(callback => { frame = callback; return 1; }),
    });
    Object.defineProperty(HTMLVideoElement.prototype, 'cancelVideoFrameCallback', { configurable: true, value: vi.fn() });
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({ width: 390, height: 709 } as DOMRect);
    TestBed.configureTestingModule({ imports: [HeroMediaComponent] });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    Reflect.deleteProperty(HTMLVideoElement.prototype, 'requestVideoFrameCallback');
    Reflect.deleteProperty(HTMLVideoElement.prototype, 'cancelVideoFrameCallback');
  });

  it('places one decoder before all three visible canvas panels', async () => {
    const fixture = TestBed.createComponent(HeroMediaComponent);
    fixture.detectChanges();
    await Promise.resolve();
    const video = fixture.nativeElement.querySelector('video') as HTMLVideoElement;
    expect(fixture.nativeElement.querySelectorAll('video')).toHaveLength(1);
    expect(fixture.nativeElement.querySelectorAll('canvas')).toHaveLength(1);
    expect(fixture.nativeElement.children[0]).toBe(video);
    expect([...fixture.nativeElement.children].slice(1).every((item: Element) => item.tagName === 'CANVAS')).toBe(true);
    expect(video.muted && video.defaultMuted && video.playsInline).toBe(true);
    expect(video.hasAttribute('webkit-playsinline')).toBe(true);
  });

  it('paints the same decoded frame into all three panels of the single canvas', async () => {
    const fixture = TestBed.createComponent(HeroMediaComponent);
    fixture.detectChanges();
    await Promise.resolve();
    const video = fixture.nativeElement.querySelector('video') as HTMLVideoElement;
    drawImage.mockClear();
    frame(0, {} as VideoFrameCallbackMetadata);
    expect(drawImage).toHaveBeenCalledTimes(3);
    expect(drawImage.mock.calls.every(args => args[0] === video)).toBe(true);
    const destinations = drawImage.mock.calls.map(args => args[6]);
    expect(destinations[0]).toBe(0);
    expect(destinations[1]).toBeGreaterThan(destinations[0]);
    expect(destinations[2]).toBeGreaterThan(destinations[1]);
  });

  it('logs a failed draw and paints again on the next frame', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fixture = TestBed.createComponent(HeroMediaComponent);
    fixture.detectChanges();
    await Promise.resolve();
    drawImage.mockReset();
    drawImage.mockImplementationOnce(() => { throw new DOMException('Frame unavailable', 'InvalidStateError'); });
    frame(0, {} as VideoFrameCallbackMetadata);
    expect(warn).toHaveBeenCalled();
    drawImage.mockReset();
    frame(0, {} as VideoFrameCallbackMetadata);
    expect(drawImage).toHaveBeenCalledTimes(3);
  });

  it('retries blocked autoplay on the first real touch', async () => {
    vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValueOnce(new DOMException('Blocked', 'NotAllowedError'));
    const fixture = TestBed.createComponent(HeroMediaComponent);
    fixture.detectChanges();
    await Promise.resolve();
    document.dispatchEvent(new Event('touchstart'));
    await Promise.resolve();
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(2);
  });

  it('stops playback and removes listeners after leaving the page', async () => {
    const fixture = TestBed.createComponent(HeroMediaComponent);
    fixture.detectChanges();
    await Promise.resolve();
    fixture.destroy();
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalledTimes(1);
    expect(HTMLVideoElement.prototype.cancelVideoFrameCallback).toHaveBeenCalledWith(1);
    document.dispatchEvent(new Event('touchstart'));
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1);
  });
});
