/**
 * CookieNotice - Simple cookie notification banner
 */

import * as React from 'react';

export interface CookieNoticeProps {
  message?: string;
  privacyPolicyUrl?: string;
  onDismiss?: () => void;
  position?: 'top' | 'bottom';
}

export function CookieNotice({
  message,
  privacyPolicyUrl,
  onDismiss,
  position = 'bottom',
}: CookieNoticeProps) {
  const [visible, setVisible] = React.useState(true);

  const defaultMessage = message || 
    "This website uses cookies to enhance your experience.";

  const handleDismiss = () => {
    setVisible(false);
    onDismiss?.();
  };

  if (!visible) return null;

  const positionStyles = position === 'top' ? 'top-0' : 'bottom-0';

  return (
    <div className={`fixed ${positionStyles} left-0 right-0 z-40`}>
      <div className="bg-zinc-950/90 backdrop-blur-sm border-t border-zinc-800/40 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <p className="text-sm text-zinc-300">
            {defaultMessage}
            {privacyPolicyUrl && (
              <>
                {' '}
                <a
                  href={privacyPolicyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline opacity-70 hover:opacity-100 transition-opacity"
                >
                  Learn more
                </a>
              </>
            )}
          </p>
          <button
            onClick={handleDismiss}
            className="px-3 py-1 bg-zinc-800/60 hover:bg-zinc-700/60 text-zinc-300 rounded text-sm font-medium transition-all flex-shrink-0"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

