import { configurationError } from '../errors/create_error';

/**
 * HTTP status codes that indicate a null body response.
 * Per the Fetch specification, responses with these status codes cannot have a body.
 * Attempting to construct a Response with a body for these statuses throws:
 * "TypeError: Response with null body status cannot have body"
 *
 * @see https://fetch.spec.whatwg.org/#null-body-status
 */
const NULL_BODY_STATUSES = new Set([101, 103, 204, 205, 304]);

export function isNullBodyStatus(status: number): boolean {
  return NULL_BODY_STATUSES.has(status);
}

export type FetchApiRecord = Record<
  string,
  string | string[] | number | boolean | null | undefined
>;

export function mergeRecords(
  ...records: (FetchApiRecord | undefined | null)[]
): FetchApiRecord {
  const final: Record<string, string | string[]> = {};

  for (const item of records) {
    if (typeof item !== 'object') {
      continue;
    }
    for (const [key, value] of Object.entries(item || {})) {
      const newCleanValue = clearValue(value);
      if (newCleanValue === null) {
        continue;
      }
      if (final[key]) {
        final[key] = [final[key], newCleanValue].flat();
      } else {
        final[key] = newCleanValue;
      }
    }
  }

  return final;
}

export function mergeQueryStrings(
  ...queryStrings: (FetchApiRecord | string | undefined | null)[]
): string {
  const final: string[] = [];

  for (const item of queryStrings) {
    if (!item) {
      continue;
    }

    let curr: string;
    if (typeof item !== 'string') {
      curr = recordToUrlSearchParams(item).toString();
    } else {
      curr = item;
    }
    final.push(curr);
  }

  return final.join('&');
}

export function formatHeaders(headersRecord: FetchApiRecord): Headers {
  const headers = new Headers();
  for (const [key, value] of Object.entries(headersRecord)) {
    const cleanValue = clearValue(value);

    if (Array.isArray(cleanValue)) {
      for (const v of cleanValue) {
        headers.append(key, v);
      }
    } else if (cleanValue !== null) {
      headers.append(key, cleanValue);
    }
  }

  return headers;
}

export function formatUrl(
  url: string,
  queryRecord: FetchApiRecord | string
): URL {
  let urlBase: string | undefined;
  if (url.startsWith('/')) {
    urlBase = window.location.origin;
  }

  let urlString: string;
  let queryString: string;

  if (typeof queryRecord === 'string') {
    queryString = queryRecord;
  } else {
    queryString = recordToUrlSearchParams(queryRecord).toString();
  }

  if (!queryString) {
    urlString = url;
  } else {
    urlString = `${url}?${queryString}`;
  }

  /**
   * Workararound for Safari 14.0
   * @see https://github.com/igorkamyshev/farfetched/issues/528
   */
  const urlArgs = [urlString, urlBase].filter(Boolean) as [string, string];

  try {
    return new URL(...urlArgs);
  } catch (e) {
    throw configurationError({
      reason: 'Invalid URL',
      validationErrors: [`"${urlString}" is not valid URL`],
    });
  }
}

function recordToUrlSearchParams(record: FetchApiRecord): URLSearchParams {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(record)) {
    const cleanValue = clearValue(value);
    if (Array.isArray(cleanValue)) {
      for (const v of cleanValue) {
        params.append(key, v);
      }
    } else if (cleanValue !== null) {
      params.append(key, cleanValue);
    }
  }

  return params;
}

function clearValue(
  value: string | string[] | number | boolean | null | undefined
): string | string[] | null {
  if (typeof value === 'number' || typeof value === 'boolean') {
    return value.toString();
  }

  return value ?? null;
}
