/**
 * useDataDeletion - Hook for triggering data deletion requests
 * This is a client-side utility - actual deletion happens on the server
 */

import * as React from 'react';

export interface DataDeletionOptions {
  apiUrl: string;
  tenantId: string;
  onSuccess?: (message: string) => void;
  onError?: (error: string) => void;
}

export function useDataDeletion(options: DataDeletionOptions) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const requestDeletion = React.useCallback(
    async (userId: string) => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `${options.apiUrl}/v1/privacy/${options.tenantId}/data-deletion`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId,
              deleteEvents: true,
              deleteProperties: true,
              deleteConsentAudit: false,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();
        options.onSuccess?.(result.message);
        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        options.onError?.(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [options]
  );

  const requestAnonymization = React.useCallback(
    async (userId: string) => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `${options.apiUrl}/v1/privacy/${options.tenantId}/anonymize-user`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId,
              anonymizeEvents: true,
              anonymizeProperties: true,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();
        options.onSuccess?.(result.message);
        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        options.onError?.(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [options]
  );

  return {
    requestDeletion,
    requestAnonymization,
    loading,
    error,
  };
}

