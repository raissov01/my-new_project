/**
 * Stub — Supabase has been removed. Components that still import this
 * will get a dummy client that returns empty data.
 * TODO: Remove these imports from avatar-menu, edit-profile-form, use-auth.
 */

export function createClient() {
  return {
    from: (_table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null }),
          single: async () => ({ data: null }),
        }),
      }),
      update: () => ({ eq: async () => ({ error: null }) }),
    }),
    auth: {
      getUser: async () => ({ data: { user: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      updateUser: async () => ({ data: { user: null }, error: null }),
    },
    storage: {
      from: () => ({
        upload: async () => ({ data: null, error: { message: "Storage removed" } }),
        remove: async () => ({ error: null }),
        getPublicUrl: () => ({ data: { publicUrl: "" } }),
      }),
    },
  } as any; // eslint-disable-line
}

export function createClientSafe() {
  return null;
}
