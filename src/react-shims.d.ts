declare module 'react' {
  export function useEffect(effect: () => void | (() => void), deps?: unknown[]): void;
  export function useRef<T>(initialValue: T): { current: T };
  export function useRef<T>(initialValue: T | null): { current: T | null };
  const React: { StrictMode: (props: { children?: unknown }) => unknown };
  export default React;
}

declare module 'react-dom/client' {
  export function createRoot(container: Element): { render(element: unknown): void };
}

declare module 'react/jsx-runtime' {
  export const jsx: (...args: unknown[]) => unknown;
  export const jsxs: (...args: unknown[]) => unknown;
  export const Fragment: unknown;
}

declare module '*.css';

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: Record<string, unknown>;
  }
}

interface Window {
  webkitAudioContext?: typeof AudioContext;
}
