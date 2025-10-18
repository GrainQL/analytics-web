/**
 * PrivacyPreferenceCenter - Detailed preference management modal
 * Follows Grain Design System specifications
 */

import * as React from 'react';
import { useGrainAnalytics } from '../hooks/useGrainAnalytics';

export interface PrivacyPreferenceCenterProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (categories: string[]) => void;
}

interface CategoryPreference {
  id: string;
  name: string;
  description: string;
  required: boolean;
}

const CATEGORIES: CategoryPreference[] = [
  {
    id: 'necessary',
    name: 'Necessary',
    description: 'Essential for the website to function properly. Cannot be disabled.',
    required: true,
  },
  {
    id: 'analytics',
    name: 'Analytics',
    description: 'Help us understand how visitors interact with our website.',
    required: false,
  },
  {
    id: 'functional',
    name: 'Functional',
    description: 'Enable enhanced functionality and personalization.',
    required: false,
  },
];

export function PrivacyPreferenceCenter({
  isOpen,
  onClose,
  onSave,
}: PrivacyPreferenceCenterProps) {
  const client = useGrainAnalytics();
  const [selectedCategories, setSelectedCategories] = React.useState<string[]>(['necessary']);

  React.useEffect(() => {
    if (!client) return;

    const consentState = client.getConsentState();
    if (consentState) {
      setSelectedCategories(consentState.categories);
    }
  }, [client, isOpen]);

  const handleToggle = (categoryId: string, required: boolean) => {
    if (required) return; // Cannot toggle required categories

    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleSave = () => {
    if (client) {
      if (selectedCategories.length > 0) {
        client.grantConsent(selectedCategories);
      } else {
        client.revokeConsent();
      }
    }
    onSave?.(selectedCategories);
    onClose();
  };

  const handleEscape = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onKeyDown={handleEscape}
      role="dialog"
      aria-labelledby="preferences-title"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-zinc-950/95 border border-zinc-800/60 backdrop-blur-xl rounded-lg shadow-2xl max-w-2xl w-full mx-4 p-6">
        <h2 id="preferences-title" className="text-xl font-semibold text-zinc-100 mb-4">
          Privacy Preferences
        </h2>

        <div className="space-y-4 mb-6">
          {CATEGORIES.map((category) => (
            <div
              key={category.id}
              className="p-4 bg-zinc-900/40 border border-zinc-800/40 rounded-lg"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-zinc-200 mb-1">
                    {category.name}
                    {category.required && (
                      <span className="ml-2 text-xs text-emerald-500">(Required)</span>
                    )}
                  </h3>
                  <p className="text-sm text-zinc-400">{category.description}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(category.id)}
                    onChange={() => handleToggle(category.id, category.required)}
                    disabled={category.required}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-900/60 hover:bg-zinc-800/60 text-zinc-300 border border-zinc-800/60 rounded-lg font-medium transition-all"
          >
            Cancel
            <kbd className="ml-2 px-2 py-0.5 bg-zinc-900/50 border border-zinc-800 rounded text-[10px] font-mono">
              ESC
            </kbd>
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-all"
          >
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
}

