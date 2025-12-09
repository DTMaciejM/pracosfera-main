import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please check your .env file.');
}

/**
 * Sanitizes a string to contain only ASCII characters (ISO-8859-1 compatible)
 */
function sanitizeToASCII(str: string): string {
  if (typeof str !== 'string') return str;
  return str.replace(/[^\x00-\x7F]/g, '');
}

/**
 * Sanitizes headers to prevent ISO-8859-1 encoding errors
 * Always converts to plain object to ensure compatibility
 */
function sanitizeHeaders(headers: HeadersInit | undefined): Record<string, string> | undefined {
  if (!headers) return undefined;

  const sanitized: Record<string, string> = {};

  // Handle different header types and always convert to plain object
  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      sanitized[sanitizeToASCII(key)] = sanitizeToASCII(value);
    });
  } else if (Array.isArray(headers)) {
    headers.forEach(([key, value]) => {
      sanitized[sanitizeToASCII(key)] = sanitizeToASCII(String(value));
    });
  } else if (typeof headers === 'object') {
    for (const [key, value] of Object.entries(headers)) {
      sanitized[sanitizeToASCII(key)] = sanitizeToASCII(String(value));
    }
  }

  return sanitized;
}

/**
 * Custom fetch wrapper that sanitizes request headers and body
 * This prevents ISO-8859-1 encoding errors in production environments
 */
async function safeFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  try {
    // Sanitize URL if it's a string
    const sanitizedInput = typeof input === 'string' ? sanitizeToASCII(input) : input;

    // Create a completely new init object to avoid any reference issues
    const sanitizedInit: RequestInit = {
      method: init?.method,
      mode: init?.mode,
      credentials: init?.credentials,
      cache: init?.cache,
      redirect: init?.redirect,
      referrer: init?.referrer,
      integrity: init?.integrity,
      keepalive: init?.keepalive,
      signal: init?.signal,
    };

    // Sanitize headers - this is critical for preventing ISO-8859-1 errors
    if (init?.headers) {
      sanitizedInit.headers = sanitizeHeaders(init.headers);
    }

    // Sanitize body if it's a string (JSON)
    if (typeof init?.body === 'string') {
      try {
        const parsed = JSON.parse(init.body);
        // Recursively sanitize string values in JSON
        const sanitizedBody = JSON.parse(JSON.stringify(parsed, (key, value) => {
          if (typeof value === 'string') {
            return sanitizeToASCII(value);
          }
          return value;
        }));
        sanitizedInit.body = JSON.stringify(sanitizedBody);
      } catch {
        // If body is not JSON, sanitize as plain string
        sanitizedInit.body = sanitizeToASCII(init.body);
      }
    } else if (init?.body) {
      sanitizedInit.body = init.body;
    }

    // Use native fetch with sanitized values
    return fetch(sanitizedInput, sanitizedInit);
  } catch (error: any) {
    // If error is related to headers, try XMLHttpRequest fallback
    if (error?.message?.includes('ISO-8859-1') || error?.message?.includes('headers')) {
      console.warn('Header encoding error detected, using XMLHttpRequest fallback');
      if (typeof input === 'string' && init) {
        return xhrFetch(input, init);
      }
    }
    console.error('Error in safeFetch:', error);
    throw error;
  }
}

/**
 * Fallback fetch implementation using XMLHttpRequest
 * This is used when native fetch fails due to header encoding issues
 */
function xhrFetch(url: string, init?: RequestInit): Promise<Response> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(init?.method || 'GET', url, true);

    // Set headers
    if (init?.headers) {
      const headers = sanitizeHeaders(init.headers);
      if (headers && typeof headers === 'object' && !Array.isArray(headers)) {
        for (const [key, value] of Object.entries(headers)) {
          xhr.setRequestHeader(sanitizeToASCII(key), sanitizeToASCII(String(value)));
        }
      }
    }

    xhr.onload = () => {
      const response = new Response(xhr.responseText, {
        status: xhr.status,
        statusText: xhr.statusText,
        headers: new Headers(),
      });
      resolve(response);
    };

    xhr.onerror = () => {
      reject(new Error('XMLHttpRequest failed'));
    };

    xhr.send(init?.body as string);
  });
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  global: {
    fetch: safeFetch,
  }
});

