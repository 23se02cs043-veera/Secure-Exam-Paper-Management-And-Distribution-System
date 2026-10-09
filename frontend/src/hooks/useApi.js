import { useState, useCallback } from 'react';
import client from '../api/client';
import { toast } from 'react-toastify';

/**
 * Generic API hook with loading/error state.
 * @param {Function} apiFunc - Async function returning Axios response
 */
export function useApi(apiFunc) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFunc(...args);
      setData(response.data);
      return { data: response.data, error: null };
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'An error occurred';
      setError(msg);
      return { data: null, error: msg };
    } finally {
      setLoading(false);
    }
  }, [apiFunc]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { data, loading, error, execute, reset };
}

export default useApi;
