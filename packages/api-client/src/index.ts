/**
 * @udhbha/api-client — Shared API Client
 * Single API interface used by both surveyor and auditor apps.
 * Handles JWT token management, auth expiry, and typed API calls.
 */

import type {
  SubmissionPayload,
  PaginatedResponse,
  AuditReport,
  AuthResponse,
} from '@udhbha/types';

// ============ Configuration ============

const getApiBase = (): string => {
  if (typeof window !== 'undefined' && (window as any).__VITE_API_BASE__) {
    return (window as any).__VITE_API_BASE__;
  }
  // Vite env var (works at build time)
  try {
    return (import.meta as any).env?.VITE_API_BASE || 'http://localhost:5000/api';
  } catch {
    return 'http://localhost:5000/api';
  }
};

// ============ Token Management ============

let _token: string | null = null;

export function setToken(token: string): void {
  _token = token;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('auth_token', token);
  }
}

export function getToken(): string | null {
  if (_token) return _token;
  if (typeof localStorage !== 'undefined') {
    _token = localStorage.getItem('auth_token');
  }
  return _token;
}

export function clearToken(): void {
  _token = null;
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  }
}

export function getStoredUser(): { email: string; name: string } | null {
  if (typeof localStorage === 'undefined') return null;
  const data = localStorage.getItem('auth_user');
  return data ? JSON.parse(data) : null;
}

export function setStoredUser(user: { email: string; name: string }): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('auth_user', JSON.stringify(user));
  }
}

// ============ Core Fetch Wrapper ============

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const base = getApiBase();
  const token = getToken();

  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (response.status === 401) {
    const body = await response.clone().json().catch(() => ({}));
    if (body.code === 'TOKEN_EXPIRED') {
      clearToken();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:expired'));
      }
    }
    throw new ApiError('Unauthorized', 401, body);
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: response.statusText }));
    throw new ApiError(body.error || response.statusText, response.status, body);
  }

  return response.json();
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ============ Auth API ============

export async function login(email: string, password: string): Promise<AuthResponse> {
  const data = await apiFetch<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setToken(data.token);
  setStoredUser(data.user);
  return data;
}

export async function signup(email: string, password: string, name: string): Promise<AuthResponse> {
  const data = await apiFetch<AuthResponse>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password, name }),
  });
  setToken(data.token);
  setStoredUser(data.user);
  return data;
}

export function logout(): void {
  clearToken();
}

// ============ Submissions API ============

export async function getSubmissions(params?: {
  email?: string;
  status?: string;
  page?: number;
  per_page?: number;
}): Promise<PaginatedResponse<SubmissionPayload>> {
  const query = new URLSearchParams();
  if (params?.email) query.set('email', params.email);
  if (params?.status) query.set('status', params.status);
  if (params?.page) query.set('page', String(params.page));
  if (params?.per_page) query.set('per_page', String(params.per_page));

  const qs = query.toString();
  return apiFetch(`/submissions${qs ? `?${qs}` : ''}`);
}

export async function getSubmission(id: string): Promise<SubmissionPayload> {
  return apiFetch(`/submissions/${id}`);
}

export async function saveSubmission(submission: SubmissionPayload): Promise<SubmissionPayload> {
  return apiFetch('/submissions', {
    method: 'POST',
    body: JSON.stringify(submission),
  });
}

export async function deleteSubmission(id: string): Promise<void> {
  await apiFetch(`/submissions/${id}`, { method: 'DELETE' });
}

export async function getSubmissionCounts(): Promise<Record<string, number>> {
  return apiFetch('/submissions/counts');
}

// ============ Audit API ============

export async function getAuditReports(): Promise<AuditReport[]> {
  return apiFetch('/audit-reports');
}

export async function getAuditReport(submissionId: string): Promise<AuditReport> {
  return apiFetch(`/audit-reports/${submissionId}`);
}

export async function saveAuditReport(report: Partial<AuditReport>): Promise<AuditReport> {
  return apiFetch('/audit-reports', {
    method: 'POST',
    body: JSON.stringify(report),
  });
}

// ============ Registrar API ============

export async function getRegistrarRecords(): Promise<any[]> {
  return apiFetch('/registrar/records');
}

export async function getRegistrarRecord(submissionId: string): Promise<any> {
  return apiFetch(`/registrar/records/${submissionId}`);
}

export async function saveRegistrarRecord(record: any): Promise<any> {
  return apiFetch('/registrar/records', {
    method: 'POST',
    body: JSON.stringify(record),
  });
}

// ============ Transparency API ============

export async function getTransparencyBundles(): Promise<any[]> {
  return apiFetch('/registrar/transparency-bundles');
}

export async function getTransparencyBundle(submissionId: string): Promise<any> {
  return apiFetch(`/registrar/transparency-bundles/${submissionId}`);
}

export async function saveTransparencyBundle(bundle: any): Promise<any> {
  return apiFetch('/registrar/transparency-bundles', {
    method: 'POST',
    body: JSON.stringify(bundle),
  });
}

// ============ Blockchain API ============

export async function anchorToBlockchain(bundleData: any, submissionId: string): Promise<any> {
  return apiFetch('/blockchain/anchor', {
    method: 'POST',
    body: JSON.stringify({ bundle_data: bundleData, submission_id: submissionId }),
  });
}

export async function getBlockchainReceipt(txHash: string): Promise<any> {
  return apiFetch(`/blockchain/receipt/${txHash}`);
}

// ============ Public API (no auth) ============

export async function publicQueryParcel(parcelId: string): Promise<SubmissionPayload> {
  return apiFetch(`/public/parcel/${parcelId}`);
}

export async function publicQueryByTx(txHash: string): Promise<SubmissionPayload> {
  return apiFetch(`/public/tx/${txHash}`);
}
