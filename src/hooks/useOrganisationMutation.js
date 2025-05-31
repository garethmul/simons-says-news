// Organization mutation hooks and cache keys

export const ORG_CACHE_KEYS = {
  all: ['organizations'] as const,
  lists: () => [...ORG_CACHE_KEYS.all, 'list'] as const,
  list: (params: any) => [...ORG_CACHE_KEYS.lists(), params] as const,
  details: () => [...ORG_CACHE_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...ORG_CACHE_KEYS.details(), id] as const,
}; 