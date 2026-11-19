const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/+$/, '') ?? '';

export function apiUrl(path: `/api/${string}`) {
  return `${API_BASE_URL}${path}`;
}
