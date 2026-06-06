import '@testing-library/jest-dom';

// jsdom does not implement scrollIntoView — stub it globally
Element.prototype.scrollIntoView = jest.fn();

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn().mockReturnValue({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: jest.fn().mockReturnValue('/'),
  useSearchParams: jest.fn().mockReturnValue(new URLSearchParams()),
}));

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: function MockImage({ src, alt, ...rest }: { src: string; alt: string; [key: string]: unknown }) {
    // eslint-disable-next-line @next/next/no-img-element
    return Object.assign(
      document.createElement('img'),
      { src, alt, ...rest }
    );
  },
}));

// Mock window.YT (YouTube IFrame API stub)
Object.defineProperty(window, 'YT', {
  writable: true,
  value: {
    Player: jest.fn().mockImplementation(() => ({
      getDuration: jest.fn().mockReturnValue(300),
      getCurrentTime: jest.fn().mockReturnValue(0),
      getPlayerState: jest.fn().mockReturnValue(-1),
      seekTo: jest.fn(),
      playVideo: jest.fn(),
      pauseVideo: jest.fn(),
      mute: jest.fn(),
      unMute: jest.fn(),
      isMuted: jest.fn().mockReturnValue(false),
      getVolume: jest.fn().mockReturnValue(80),
      setVolume: jest.fn(),
      destroy: jest.fn(),
    })),
  },
});

// Silence React 19 act() warnings in tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('act(') || args[0].includes('Warning:'))
    ) return;
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
