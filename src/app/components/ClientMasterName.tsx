import React from 'react';

export function ClientMasterName({ clientId, name, onOpen, className = '' }: {
  clientId: string;
  name: string;
  onOpen: (clientId: string) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={`block max-w-full cursor-pointer truncate text-left hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${className}`}
      style={{ color: '#1b365d' }}
      title={`${name} — Double-click to open in Client Master`}
      aria-label={`Open ${name} in Client Master (double-click or press Enter)`}
      onClick={event => {
        event.stopPropagation();
        // Keyboard and assistive technology activate buttons with detail 0.
        if (event.detail === 0) onOpen(clientId);
      }}
      onDoubleClick={event => {
        event.stopPropagation();
        onOpen(clientId);
      }}
    >
      {name}
    </button>
  );
}
