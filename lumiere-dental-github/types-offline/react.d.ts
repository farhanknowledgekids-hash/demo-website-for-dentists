/**
 * Minimal offline stand-in for @types/react, used ONLY when the real type packages could not be
 * installed (no package registry access in the build sandbox). It types hooks and core APIs
 * precisely enough to check application logic, but treats JSX attributes loosely.
 * With network access, run `npm install` and `npm run typecheck` for a full check.
 */
declare module 'react' {
  export type ReactNode = ReactElement | string | number | bigint | boolean | null | undefined | Iterable<ReactNode>;
  export interface ReactElement { type: any; props: any; key: string | null }
  export type Key = string | number;
  export type SetStateAction<S> = S | ((prev: S) => S);
  export type Dispatch<A> = (value: A) => void;
  export interface RefObject<T> { current: T }
  export type Ref<T> = RefObject<T | null> | ((instance: T | null) => void | (() => void)) | null;
  export type ElementType = string | ((props: any) => ReactNode);
  export interface Context<T> { Provider: (props: { value: T; children?: ReactNode }) => ReactElement }
  export type CSSProperties = { [key: string]: string | number | undefined };

  export function useState<S>(initial: S | (() => S)): [S, Dispatch<SetStateAction<S>>];
  export function useState<S = undefined>(): [S | undefined, Dispatch<SetStateAction<S | undefined>>];
  export function useEffect(effect: () => void | (() => void), deps?: readonly unknown[]): void;
  export function useLayoutEffect(effect: () => void | (() => void), deps?: readonly unknown[]): void;
  export function useRef<T>(initial: T): RefObject<T>;
  export function useRef<T>(initial: T | null): RefObject<T | null>;
  export function useMemo<T>(factory: () => T, deps: readonly unknown[]): T;
  export function useCallback<T extends (...args: any[]) => any>(cb: T, deps: readonly unknown[]): T;
  export function useContext<T>(ctx: Context<T>): T;
  export function createContext<T>(defaultValue: T): Context<T>;
  export function useId(): string;
  export const StrictMode: (props: { children?: ReactNode }) => ReactElement;
  export const Fragment: (props: { children?: ReactNode }) => ReactElement;

  interface SyntheticEvent<T = Element, E = Event> {
    currentTarget: T; target: EventTarget; nativeEvent: E;
    preventDefault(): void; stopPropagation(): void;
  }
  export interface FormEvent<T = Element> extends SyntheticEvent<T> {}
  export interface KeyboardEvent<T = Element> extends SyntheticEvent<T, globalThis.KeyboardEvent> { key: string; shiftKey: boolean }
  export interface ChangeEvent<T = Element> extends SyntheticEvent<T> { target: EventTarget & T }
  export interface InputHTMLAttributes<T> {
    type?: string; autoComplete?: string; inputMode?: string; required?: boolean; maxLength?: number;
    placeholder?: string; value?: string; onChange?: (e: ChangeEvent<T>) => void; [attr: string]: unknown;
  }
  export interface SVGAttributes<T> { [attr: string]: unknown; __t?: T }
}

declare module 'react/jsx-runtime' {
  export const jsx: any;
  export const jsxs: any;
  export const Fragment: any;
}

declare namespace JSX {
  type Element = import('react').ReactElement;
  interface ElementChildrenAttribute { children: {} }
  interface IntrinsicAttributes { key?: string | number }
  interface IntrinsicElements { [tag: string]: any }
}

declare module 'react-dom/client' {
  export function createRoot(el: Element): { render(node: import('react').ReactNode): void; unmount(): void };
}

declare module 'react-icons/lu' {
  type Icon = (props: { 'aria-hidden'?: boolean; className?: string }) => import('react').ReactElement;
  export const LuArrowDown: Icon, LuArrowLeft: Icon, LuArrowRight: Icon, LuArrowUpRight: Icon, LuCheck: Icon,
    LuChevronLeft: Icon, LuChevronRight: Icon, LuCircleAlert: Icon, LuClock: Icon, LuCopy: Icon, LuMail: Icon,
    LuMapPin: Icon, LuMenu: Icon, LuPencil: Icon, LuPhone: Icon, LuPlus: Icon, LuX: Icon;
}
