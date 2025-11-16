import { API_BASE_URL } from '../apiConfig';
import { useAuth } from '../context/AuthContext';

interface FetchOptions extends RequestInit {
  headers?: Record<string, string>;
}

export const useApiCall = () => {
  const { getAuthHeader } = useAuth();

  const apiCall = async <T = any>(endpoint: string, options?: FetchOptions): Promise<T> => {
    const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
      ...options?.headers,
    };

    const response = await fetch(url, { ...options, headers });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || `HTTP error ${response.status}`);
    return data as T;
  };

  return { apiCall };
};

export default useApiCall;
