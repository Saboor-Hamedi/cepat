import { create } from 'zustand';

import type { ServiceCategory, Technician } from '../types/marketplace';
import type { Post } from '../types/post';

const DEFAULT_AREA = 'Semua area';

export interface MarketplaceZustandState {
  technicians: Technician[];
  technicianById: Record<string, Technician>;
  verifiedTechnicianIds: Record<string, boolean>;
  categories: ServiceCategory[];
  serviceAreas: string[];
  posts: Post[];
  postById: Record<string, Post>;
  selectedCategory: string;
  selectedArea: string;
  savedTechIds: string[];

  // Actions
  setTechnicians: (items: Technician[]) => void;
  appendTechnicians: (items: Technician[]) => void;
  upsertTechnician: (tech: Technician) => void;
  setTechnicianVerified: (technicianId: string, verified: boolean) => void;
  setCategories: (items: ServiceCategory[]) => void;
  setServiceAreas: (areas: string[]) => void;
  setPosts: (posts: Post[]) => void;
  updatePostInStore: (postId: string, updater: (post: Post) => Post) => void;
  removePostFromStore: (postId: string) => void;
  setSelectedCategory: (category: string) => void;
  setSelectedArea: (area: string) => void;
  setSavedTechIds: (ids: string[]) => void;
}

function buildTechnicianMaps(
  items: Technician[],
  prevVerified: Record<string, boolean> = {},
): {
  technicianById: Record<string, Technician>;
  verifiedTechnicianIds: Record<string, boolean>;
} {
  const technicianById: Record<string, Technician> = {};
  const verifiedTechnicianIds: Record<string, boolean> = { ...prevVerified };

  for (const tech of items) {
    if (!tech || typeof tech.id !== 'string') continue;
    technicianById[tech.id] = tech;
    if (typeof prevVerified[tech.id] !== 'boolean') {
      verifiedTechnicianIds[tech.id] = Boolean(tech.verified);
    } else if (tech.verified) {
      verifiedTechnicianIds[tech.id] = true;
    }
  }

  return { technicianById, verifiedTechnicianIds };
}

function buildPostMap(posts: Post[]): Record<string, Post> {
  const postById: Record<string, Post> = {};
  for (const post of posts) {
    if (!post || typeof post.id !== 'string') continue;
    postById[post.id] = post;
  }
  return postById;
}

export const useMarketplaceStore = create<MarketplaceZustandState>((set) => ({
  technicians: [],
  technicianById: {},
  verifiedTechnicianIds: {},
  categories: [],
  serviceAreas: [DEFAULT_AREA],
  posts: [],
  postById: {},
  selectedCategory: 'all',
  selectedArea: DEFAULT_AREA,
  savedTechIds: [],

  setTechnicians: (items) =>
    set((state) => {
      const { technicianById, verifiedTechnicianIds } = buildTechnicianMaps(
        items,
        state.verifiedTechnicianIds,
      );
      return {
        technicians: items,
        technicianById,
        verifiedTechnicianIds,
      };
    }),

  appendTechnicians: (items) =>
    set((state) => {
      const existingIds = new Set(state.technicians.map((t) => t.id));
      const newUnique = items.filter((t) => !existingIds.has(t.id));
      if (newUnique.length === 0) return state;
      const merged = [...state.technicians, ...newUnique];
      const { technicianById, verifiedTechnicianIds } = buildTechnicianMaps(
        merged,
        state.verifiedTechnicianIds,
      );
      return {
        technicians: merged,
        technicianById,
        verifiedTechnicianIds,
      };
    }),

  upsertTechnician: (tech) =>
    set((state) => {
      const exists = Boolean(state.technicianById[tech.id]);
      const nextList = exists
        ? state.technicians.map((item) => (item.id === tech.id ? tech : item))
        : [tech, ...state.technicians];
      return {
        technicians: nextList,
        technicianById: {
          ...state.technicianById,
          [tech.id]: tech,
        },
        verifiedTechnicianIds: {
          ...state.verifiedTechnicianIds,
          [tech.id]: Boolean(tech.verified),
        },
      };
    }),

  setTechnicianVerified: (technicianId, verified) =>
    set((state) => {
      const existingTech = state.technicianById[technicianId];
      const updatedTech = existingTech ? { ...existingTech, verified } : undefined;
      const nextTechnicians = updatedTech
        ? state.technicians.map((t) => (t.id === technicianId ? updatedTech : t))
        : state.technicians;
      const nextPosts = state.posts.map((p) =>
        p.technicianId === technicianId ? { ...p, technicianVerified: verified } : p,
      );

      return {
        technicians: nextTechnicians,
        technicianById: updatedTech
          ? { ...state.technicianById, [technicianId]: updatedTech }
          : state.technicianById,
        verifiedTechnicianIds: {
          ...state.verifiedTechnicianIds,
          [technicianId]: verified,
        },
        posts: nextPosts,
        postById: buildPostMap(nextPosts),
      };
    }),

  setCategories: (items) => set({ categories: items }),

  setServiceAreas: (areas) => set({ serviceAreas: areas }),

  setPosts: (posts) =>
    set((state) => {
      const verifiedUpdates: Record<string, boolean> = { ...state.verifiedTechnicianIds };
      for (const post of posts) {
        if (post.technicianVerified) {
          verifiedUpdates[post.technicianId] = true;
        }
      }
      return {
        posts,
        postById: buildPostMap(posts),
        verifiedTechnicianIds: verifiedUpdates,
      };
    }),

  updatePostInStore: (postId, updater) =>
    set((state) => {
      const nextPosts = state.posts.map((post) => (post.id === postId ? updater(post) : post));
      return {
        posts: nextPosts,
        postById: buildPostMap(nextPosts),
      };
    }),

  removePostFromStore: (postId) =>
    set((state) => {
      const nextPosts = state.posts.filter((post) => post.id !== postId);
      const nextPostById = { ...state.postById };
      delete nextPostById[postId];
      return {
        posts: nextPosts,
        postById: nextPostById,
      };
    }),

  setSelectedCategory: (selectedCategory) => set({ selectedCategory }),

  setSelectedArea: (selectedArea) => set({ selectedArea }),

  setSavedTechIds: (savedTechIds) => set({ savedTechIds }),
}));
