import { api, setToken } from './client.js';
import type {
  Category,
  FailureType,
  RootCause,
  Suggestion,
  SuggestionStatus,
  DashboardCounters,
  SiteSettings,
  AssistantResponse,
} from '../types.js';

// --- Public / viewer --------------------------------------------------------
export const publicApi = {
  listCategories: () => api.get<Category[]>('/categories').then((r) => r.data),

  getCategory: (id: number) =>
    api
      .get<{ category: Category; failureTypes: FailureType[] }>(`/categories/${id}`)
      .then((r) => r.data),

  getFailureType: (id: number) =>
    api
      .get<{ failureType: FailureType; rootCauses: RootCause[] }>(`/failure-types/${id}`)
      .then((r) => r.data),

  search: (q: string) =>
    api.get<FailureType[]>('/search', { params: { q } }).then((r) => r.data),

  submitSuggestion: (failureTypeId: number, text: string, photo?: File | null) => {
    const form = new FormData();
    form.append('failureTypeId', String(failureTypeId));
    form.append('text', text);
    if (photo) form.append('photo', photo);
    return api.post<Suggestion>('/suggestions', form).then((r) => r.data);
  },

  getSettings: () => api.get<SiteSettings>('/settings').then((r) => r.data),

  ask: (question: string) =>
    api.post<AssistantResponse>('/assistant/ask', { question }).then((r) => r.data),
};

// --- Auth -------------------------------------------------------------------
export const authApi = {
  login: async (username: string, password: string) => {
    const { data } = await api.post<{ token: string; user: { username: string } }>(
      '/auth/login',
      { username, password },
    );
    setToken(data.token);
    return data;
  },
  me: () => api.get('/auth/me').then((r) => r.data),
};

// --- Admin ------------------------------------------------------------------
type ReorderDir = 'up' | 'down';

export const adminApi = {
  dashboard: () => api.get<DashboardCounters>('/admin/dashboard').then((r) => r.data),

  // Categories
  listCategories: () => api.get<Category[]>('/admin/categories').then((r) => r.data),
  getCategory: (id: number) =>
    api
      .get<{ category: Category; failureTypes: FailureType[] }>(`/admin/categories/${id}`)
      .then((r) => r.data),
  createCategory: (body: { name: string; description?: string | null }) =>
    api.post<Category>('/admin/categories', body).then((r) => r.data),
  updateCategory: (id: number, body: Partial<{ name: string; description: string | null }>) =>
    api.patch<Category>(`/admin/categories/${id}`, body).then((r) => r.data),
  setCategoryActive: (id: number, isActive: boolean) =>
    api.patch<Category>(`/admin/categories/${id}/active`, { isActive }).then((r) => r.data),
  reorderCategory: (id: number, direction: ReorderDir) =>
    api.patch<Category>(`/admin/categories/${id}/reorder`, { direction }).then((r) => r.data),
  uploadCategoryImage: (id: number, file: File) =>
    uploadImage(`/admin/categories/${id}/image`, 'image', file),
  deleteCategory: (id: number) => api.delete(`/admin/categories/${id}`),

  // Failure types
  getFailureType: (id: number) =>
    api
      .get<{ failureType: FailureType; rootCauses: RootCause[] }>(`/admin/failure-types/${id}`)
      .then((r) => r.data),
  createFailureType: (body: { categoryId: number; name: string; description?: string | null }) =>
    api.post<FailureType>('/admin/failure-types', body).then((r) => r.data),
  updateFailureType: (id: number, body: Partial<{ name: string; description: string | null }>) =>
    api.patch<FailureType>(`/admin/failure-types/${id}`, body).then((r) => r.data),
  setFailureTypeActive: (id: number, isActive: boolean) =>
    api.patch<FailureType>(`/admin/failure-types/${id}/active`, { isActive }).then((r) => r.data),
  reorderFailureType: (id: number, direction: ReorderDir) =>
    api.patch<FailureType>(`/admin/failure-types/${id}/reorder`, { direction }).then((r) => r.data),
  uploadFailureTypeImage: (id: number, file: File) =>
    uploadImage(`/admin/failure-types/${id}/image`, 'image', file),
  deleteFailureType: (id: number) => api.delete(`/admin/failure-types/${id}`),

  // Root causes
  getRootCause: (id: number) =>
    api.get<RootCause>(`/admin/root-causes/${id}`).then((r) => r.data),
  createRootCause: (body: {
    failureTypeId: number;
    title: string;
    description?: string | null;
    steps?: { instruction: string; type: 'step' | 'check' }[];
  }) => api.post<RootCause>('/admin/root-causes', body).then((r) => r.data),
  updateRootCause: (
    id: number,
    body: Partial<{
      title: string;
      description: string | null;
      steps: { instruction: string; type: 'step' | 'check' }[];
    }>,
  ) => api.patch<RootCause>(`/admin/root-causes/${id}`, body).then((r) => r.data),
  setRootCauseActive: (id: number, isActive: boolean) =>
    api.patch<RootCause>(`/admin/root-causes/${id}/active`, { isActive }).then((r) => r.data),
  reorderRootCause: (id: number, direction: ReorderDir) =>
    api.patch<RootCause>(`/admin/root-causes/${id}/reorder`, { direction }).then((r) => r.data),
  deleteRootCause: (id: number) => api.delete(`/admin/root-causes/${id}`),
  uploadRootCauseMedia: (id: number, kind: 'OK' | 'NG', file: File, caption?: string) => {
    const form = new FormData();
    form.append('image', file);
    form.append('kind', kind);
    if (caption) form.append('caption', caption);
    return api.post(`/admin/root-causes/${id}/media`, form).then((r) => r.data);
  },
  deleteMedia: (id: number) => api.delete(`/admin/media/${id}`),

  // Suggestions
  listSuggestions: (status?: SuggestionStatus) =>
    api
      .get<Suggestion[]>('/admin/suggestions', { params: status ? { status } : {} })
      .then((r) => r.data),
  approveSuggestion: (id: number, adminComment?: string) =>
    api.post<Suggestion>(`/admin/suggestions/${id}/approve`, { adminComment }).then((r) => r.data),
  rejectSuggestion: (id: number, adminComment: string) =>
    api.post<Suggestion>(`/admin/suggestions/${id}/reject`, { adminComment }).then((r) => r.data),

  // Settings / branding
  getSettings: () => api.get<SiteSettings>('/admin/settings').then((r) => r.data),
  updateSettings: (body: { siteName?: string; slogan?: string; logoScale?: number }) =>
    api.patch<SiteSettings>('/admin/settings', body).then((r) => r.data),
  uploadLogo: (file: File) => {
    const form = new FormData();
    form.append('logo', file);
    return api.post<SiteSettings>('/admin/settings/logo', form).then((r) => r.data);
  },
};

function uploadImage(url: string, field: string, file: File) {
  const form = new FormData();
  form.append(field, file);
  return api.post(url, form).then((r) => r.data);
}
