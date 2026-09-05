// Declared narrowly rather than by pulling in all of `vite/client`, whose
// ambient CSS-module declarations collide with `next-env.d.ts`'s.
declare module '*.ttf?inline' {
  const dataUrl: string;
  export default dataUrl;
}
