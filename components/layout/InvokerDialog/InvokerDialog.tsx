'use client';

import { useRef, type MouseEvent, type ReactNode } from 'react';

const nativeCommands = () => 'commandForElement' in HTMLButtonElement.prototype;

export function InvokerDialog({
  id,
  className,
  toggle,
  children,
}: {
  id: string;
  className: string | undefined;
  toggle: { readonly className: string | undefined; readonly label: string };
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  const open = () => {
    if (!nativeCommands()) dialog.current?.showModal();
  };

  const closeOnActivation = (e: MouseEvent<HTMLDialogElement>) => {
    if ((e.target as Element).closest('a, button')) dialog.current?.close();
  };

  return (
    <>
      <button
        type="button"
        className={toggle.className}
        commandfor={id}
        command="show-modal"
        aria-label={toggle.label}
        onClick={open}
      />
      <dialog ref={dialog} id={id} className={className} onClick={closeOnActivation}>
        {children}
      </dialog>
    </>
  );
}
