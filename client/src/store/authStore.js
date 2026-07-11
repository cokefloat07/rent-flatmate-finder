import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      loading: false,
      error: null,
      hydrated: false,

      isAuthenticated: () => {
        const s = get();
        return !!s.token && !!s.user;
      },

      hasRole: (...roles) => {
        const s = get();
        return !!s.user && roles.includes(s.user.role);
      },

      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error, loading: false }),
      clearError: () => set({ error: null }),

      setAuth: ({ user, token }) =>
        set({
          user,
          token,
          loading: false,
          error: null,
        }),

      logout: () =>
        set({
          user: null,
          token: null,
          loading: false,
          error: null,
        }),

      setHydrated: (hydrated) => set({ hydrated }),
    }),
    {
      name: 'rent-find-auth',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);

export default useAuthStore;