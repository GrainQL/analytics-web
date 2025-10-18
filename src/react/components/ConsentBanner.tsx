/**
 * ConsentBanner - Glassmorphic consent popup for GDPR compliance
 * Follows Grain Design System specifications
 */

import * as React from 'react';
import { useGrainAnalytics } from '../hooks/useGrainAnalytics';

export interface ConsentBannerProps {
  position?: 'top' | 'bottom' | 'center';
  theme?: 'light' | 'dark' | 'glass';
  customText?: string;
  onAccept?: () => void;
  onDecline?: () => void;
  showPreferences?: boolean;
  privacyPolicyUrl?: string;
}

export function ConsentBanner({
  position = 'bottom',
  theme = 'glass',
  customText,
  onAccept,
  onDecline,
  showPreferences = false,
  privacyPolicyUrl,
}: ConsentBannerProps) {
  const client = useGrainAnalytics();
  const [visible, setVisible] = React.useState(false);
  const [showPreferencesModal, setShowPreferencesModal] = React.useState(false);

  React.useEffect(() => {
    if (!client) return;

    // Check if user has already made a consent decision
    const consentState = client.getConsentState();
    if (!consentState) {
      setVisible(true);
    }
  }, [client]);

  const handleAccept = () => {
    if (client) {
      client.grantConsent(['necessary', 'analytics', 'functional']);
    }
    setVisible(false);
    onAccept?.();
  };

  const handleDecline = () => {
    if (client) {
      client.revokeConsent();
    }
    setVisible(false);
    onDecline?.();
  };

  const handleEscape = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleDecline();
    }
  };

  if (!visible) return null;

  const defaultText = customText || 
    "We use cookies and similar technologies to improve your experience. By accepting, you consent to our use of analytics and functional cookies.";

  // Position styles
  const positionStyles = {
    top: 'top-4 left-4 right-4',
    bottom: 'bottom-4 left-4 right-4',
    center: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
  };

  // Theme styles (glassmorphic by default)
  const themeStyles = {
    light: 'bg-white/95 border-gray-200 text-gray-900',
    dark: 'bg-zinc-900/95 border-zinc-800 text-zinc-100',
    glass: 'bg-zinc-950/40 backdrop-blur-xl border-zinc-800/40 text-zinc-100',
  };

  const buttonAcceptStyles = {
    light: 'bg-blue-600 hover:bg-blue-700 text-white',
    dark: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    glass: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  };

  const buttonDeclineStyles = {
    light: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
    dark: 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200',
    glass: 'bg-zinc-900/60 hover:bg-zinc-800/60 text-zinc-300 border border-zinc-800/60',
  };

  return (
    <div
      className={`fixed z-50 max-w-2xl ${positionStyles[position]}`}
      onKeyDown={handleEscape}
      role="dialog"
      aria-labelledby="consent-title"
      aria-describedby="consent-description"
    >
      <div className={`rounded-lg shadow-2xl border p-6 transition-all ${themeStyles[theme]}`}>
        <h2 id="consent-title" className="text-lg font-semibold mb-2">
          Cookie Consent
        </h2>
        <p id="consent-description" className="text-sm opacity-80 mb-4">
          {defaultText}
        </p>

        {privacyPolicyUrl && (
          <a
            href={privacyPolicyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm underline opacity-70 hover:opacity-100 transition-opacity block mb-4"
          >
            Read our Privacy Policy
          </a>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleAccept}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${buttonAcceptStyles[theme]}`}
            aria-label="Accept cookies"
          >
            Accept All
          </button>
          <button
            onClick={handleDecline}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${buttonDeclineStyles[theme]}`}
            aria-label="Decline cookies"
          >
            Decline
          </button>
          {showPreferences && (
            <button
              onClick={() => setShowPreferencesModal(true)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${buttonDeclineStyles[theme]}`}
              aria-label="Manage preferences"
            >
              Manage Preferences
            </button>
          )}
          <kbd className="ml-auto px-2 py-1 bg-zinc-900/50 border border-zinc-800 rounded text-[10px] font-mono self-center">
            ESC
          </kbd>
        </div>
      </div>
    </div>
  );
}

