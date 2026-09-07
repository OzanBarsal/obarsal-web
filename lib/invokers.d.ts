// @types/react 19.2 predates the invoker command attributes (Baseline 2025);
// React renders them verbatim, only the JSX types lack them.
import 'react';

declare module 'react' {
  interface ButtonHTMLAttributes<T> extends HTMLAttributes<T> {
    command?: 'show-modal' | 'close' | 'toggle-popover' | 'show-popover' | 'hide-popover' | undefined;
    commandfor?: string | undefined;
  }
}
