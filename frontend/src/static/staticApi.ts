/**
 * Static (no-backend) implementation of the public API, used by the GitHub
 * Pages build. Reads the knowledge base bundled at build time and runs the
 * assistant in the browser.
 */
import knowledge from '../data/knowledge.json';
import { ask as localAsk } from '../assistant/localAssistant.js';
import type {
  Category,
  FailureType,
  RootCause,
  SiteSettings,
  AssistantResponse,
} from '../types.js';

const categories = knowledge.categories as unknown as Category[];
const failureTypes = knowledge.failureTypes as unknown as FailureType[];
const rootCauses = knowledge.rootCauses as unknown as RootCause[];

const ok = <T,>(value: T): Promise<T> => Promise.resolve(value);

export const staticApi = {
  listCategories: () => ok(categories),

  getCategory: (id: number) => {
    const category = categories.find((c) => c.id === id);
    if (!category) return Promise.reject(new Error('Category not found'));
    return ok({
      category,
      failureTypes: failureTypes.filter((f) => f.categoryId === id),
    });
  },

  getFailureType: (id: number) => {
    const failureType = failureTypes.find((f) => f.id === id);
    if (!failureType) return Promise.reject(new Error('Failure type not found'));
    return ok({
      failureType,
      rootCauses: rootCauses
        .filter((r) => r.failureTypeId === id)
        .sort((a, b) => a.rank - b.rank),
    });
  },

  search: (q: string) => {
    const needle = q.trim().toLowerCase();
    if (!needle) return ok([] as FailureType[]);
    return ok(
      failureTypes
        .filter((f) => f.name.toLowerCase().includes(needle))
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(0, 10),
    );
  },

  getSettings: () => ok(knowledge.settings as SiteSettings),

  ask: (question: string) => ok(localAsk(question) as AssistantResponse),

  // No backend to receive suggestions in the static build.
  submitSuggestion: () =>
    Promise.reject(new Error('Suggestions are unavailable in the published read-only version.')),
};

// True when the app was built for static hosting (no API server).
export const IS_STATIC = import.meta.env.VITE_STATIC === '1';
