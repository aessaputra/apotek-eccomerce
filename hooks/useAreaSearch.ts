import { useState, useCallback, useEffect, useRef } from 'react';
import { useDebounce } from './useDebounce';
import { searchBiteshipArea } from '@/services/shipping.service';
import type { BiteshipArea } from '@/types/shipping';

export interface UseAreaSearchReturn {
  query: string;
  setQuery: (query: string) => void;
  results: BiteshipArea[];
  isLoading: boolean;
  error: string | null;
  search: (input: string) => Promise<BiteshipArea[]>;
  clearAll: () => void;
}

export function useAreaSearch(): UseAreaSearchReturn {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<BiteshipArea[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedQuery = useDebounce(query, 300);
  const currentRequestRef = useRef<number>(0);

  const clearAll = useCallback(() => {
    currentRequestRef.current += 1;
    setResults([]);
    setError(null);
    setIsLoading(false);
  }, []);

  const search = useCallback(async (input: string): Promise<BiteshipArea[]> => {
    if (!input.trim() || input.trim().length < 3) {
      setResults([]);
      setError(null);
      return [];
    }

    const requestId = Date.now();
    currentRequestRef.current = requestId;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: searchError } = await searchBiteshipArea(input);

      // Ignore stale responses
      if (currentRequestRef.current !== requestId) {
        return [];
      }

      if (searchError) {
        setError(searchError.message);
        setResults([]);
        return [];
      } else {
        setResults(data);
        return data;
      }
    } catch {
      if (currentRequestRef.current === requestId) {
        setError('Gagal mencari area. Silakan coba lagi.');
        setResults([]);
      }
      return [];
    } finally {
      if (currentRequestRef.current === requestId) {
        setIsLoading(false);
      }
    }
  }, []);

  // Auto-search on debounced query
  useEffect(() => {
    if (debouncedQuery.trim().length >= 3) {
      search(debouncedQuery);
    } else {
      currentRequestRef.current += 1;
      setResults([]);
      setError(null);
      setIsLoading(false);
    }
  }, [debouncedQuery, search]);

  return {
    query,
    setQuery,
    results,
    isLoading,
    error,
    search,
    clearAll,
  };
}
