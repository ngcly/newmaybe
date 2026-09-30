import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createBrowserTheme } from '../browser-theme-core';

describe('createBrowserTheme', () => {
  const colors = {
    light: '#f7f3ec',
    dark: '#1e1b18',
    studyLight: '#f7f4ee',
    studyDark: '#10171f',
  };

  let mockHeadChildren: HTMLElement[] = [];
  let mockBodyChildren: HTMLElement[] = [];
  let scrollPos = 400;
  let activeElement: HTMLElement | null = null;
  let rafCallback: (() => void) | null = null;

  function runAnimationFrame() {
    if (!rafCallback) throw new Error('Expected a scheduled animation frame');
    rafCallback();
  }

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    mockHeadChildren = [];
    mockBodyChildren = [];
    scrollPos = 400;
    activeElement = null;
    rafCallback = null;

    const mockDocument = {
      head: {
        appendChild: (el: HTMLElement) => {
          mockHeadChildren.push(el);
          return el;
        },
      },
      body: {
        appendChild: (el: HTMLElement) => {
          mockBodyChildren.push(el);
          return el;
        },
        style: {},
      },
      documentElement: {
        dataset: {},
        classList: {
          contains: () => false,
          toggle: vi.fn(),
          add: vi.fn(),
          remove: vi.fn(),
        },
        style: {},
      },
      querySelectorAll: (selector: string) => {
        if (selector === 'meta[name="theme-color"]') {
          return mockHeadChildren.filter((el) => (el as HTMLMetaElement).name === 'theme-color');
        }
        if (selector === 'meta[name="color-scheme"]') {
          return mockHeadChildren.filter((el) => (el as HTMLMetaElement).name === 'color-scheme');
        }
        return [];
      },
      querySelector: (selector: string) => {
        if (selector === 'meta[name="color-scheme"]') {
          return (
            mockHeadChildren.find((el) => (el as HTMLMetaElement).name === 'color-scheme') ?? null
          );
        }
        return null;
      },
      createElement: (tagName: string) => {
        const el = {
          tagName: tagName.toUpperCase(),
          name: '',
          content: '',
          style: {},
          setAttribute: vi.fn(),
          remove: () => {
            mockHeadChildren = mockHeadChildren.filter((child) => child !== el);
            mockBodyChildren = mockBodyChildren.filter((child) => child !== el);
          },
        } as unknown as HTMLElement;
        return el;
      },
      get activeElement() {
        return activeElement;
      },
      dispatchEvent: vi.fn(),
    };

    vi.stubGlobal('document', mockDocument);
    vi.stubGlobal('window', {
      get scrollY() {
        return scrollPos;
      },
      set scrollY(val: number) {
        scrollPos = val;
      },
      scrollTo: vi.fn((opts: ScrollToOptions | number, y?: number) => {
        if (typeof opts === 'object') {
          scrollPos = opts.top ?? 0;
        } else {
          scrollPos = y ?? 0;
        }
      }),
      requestAnimationFrame: vi.fn((cb: () => void) => {
        rafCallback = cb;
        return 1;
      }),
      cancelAnimationFrame: vi.fn(() => {
        rafCallback = null;
      }),
      matchMedia: () => ({ matches: false, addEventListener: vi.fn() }),
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('does not blur active inputs or buttons during theme sync', () => {
    const input = {
      tagName: 'INPUT',
      blur: vi.fn(),
    } as unknown as HTMLElement;
    // Set active element to input as if typing in search box
    activeElement = input;
    // Stub HTMLElement so instanceof HTMLElement returns true
    vi.stubGlobal('HTMLElement', Object);

    const theme = createBrowserTheme(colors);
    theme.sync('dark');

    expect(input.blur).not.toHaveBeenCalled();
  });

  it('does not revert scroll position if the user scrolled after sync', () => {
    vi.stubGlobal('HTMLElement', Object);
    scrollPos = 400;

    const theme = createBrowserTheme(colors);
    theme.sync('dark');

    // tick moved position by 1px to 399
    expect(scrollPos).toBe(399);

    // Simulate user scrolling further down to 700px before RAF fires
    scrollPos = 700;

    // Trigger RAF cleanup
    runAnimationFrame();

    // Scroll should remain at 700, NOT pulled back to 400
    expect(scrollPos).toBe(700);

    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(80);
    expect(scrollPos).toBe(700);
  });

  it('restores scroll position if user has not scrolled away from the 1px tick', () => {
    vi.stubGlobal('HTMLElement', Object);
    scrollPos = 400;

    const theme = createBrowserTheme(colors);
    theme.sync('dark');

    expect(scrollPos).toBe(399);
    expect(vi.getTimerCount()).toBe(1);

    // User did not scroll; RAF fires
    runAnimationFrame();

    // Scroll restored to original 400
    expect(scrollPos).toBe(400);
    expect(mockBodyChildren).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);

    // Scrolling after the frame must not be undone by a delayed cleanup.
    scrollPos = 700;
    vi.advanceTimersByTime(80);
    expect(scrollPos).toBe(700);
  });

  it.each(['delayed', 'unavailable'] as const)(
    'restores scroll via the timeout when animation frames are %s',
    (frameState) => {
      if (frameState === 'unavailable') {
        Object.defineProperty(window, 'requestAnimationFrame', { value: undefined });
      }

      createBrowserTheme(colors).sync('dark');

      expect(vi.getTimerCount()).toBe(1);
      vi.advanceTimersByTime(79);
      expect(scrollPos).toBe(399);
      expect(mockBodyChildren).toHaveLength(1);

      vi.advanceTimersByTime(1);
      expect(scrollPos).toBe(400);
      expect(mockBodyChildren).toHaveLength(0);
      expect(vi.getTimerCount()).toBe(0);
      expect(rafCallback).toBeNull();
      if (frameState === 'delayed') {
        expect(window.cancelAnimationFrame).toHaveBeenCalledWith(1);
      }
    },
  );

  it('preserves user scrolling when the timeout runs before the animation frame', () => {
    createBrowserTheme(colors).sync('dark');
    expect(vi.getTimerCount()).toBe(1);

    scrollPos = 700;
    vi.advanceTimersByTime(80);

    expect(scrollPos).toBe(700);
    expect(mockBodyChildren).toHaveLength(0);
    expect(window.cancelAnimationFrame).toHaveBeenCalledWith(1);
    expect(rafCallback).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });
});
