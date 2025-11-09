import { Dispatch, SetStateAction, useCallback, useEffect, useMemo, useState } from 'react';

import type { Artifact, ArtifactType } from '../types';

interface UseArtifactFiltersOptions {
  initialViewMode?: 'table' | 'graph' | 'kanban';
  onViewModeChange?: (viewMode: 'table' | 'graph' | 'kanban') => void;
}

interface UseArtifactFiltersResult {
  viewMode: 'table' | 'graph' | 'kanban';
  setViewMode: (viewMode: 'table' | 'graph' | 'kanban') => void;
  artifactTypeFilter: 'ALL' | ArtifactType;
  setArtifactTypeFilter: (filter: 'ALL' | ArtifactType) => void;
  statusFilter: 'ALL' | string;
  setStatusFilter: (filter: 'ALL' | string) => void;
  activeTagFilters: string[];
  setActiveTagFilters: Dispatch<SetStateAction<string[]>>;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  filteredArtifacts: Artifact[];
  availableStatuses: string[];
  availableTagFilters: string[];
  hasActiveFilters: boolean;
  resetFilters: () => void;
  toggleTagFilter: (tag: string) => void;
  isSelectedArtifactHidden: (artifactId: string | null) => boolean;
}

export function useArtifactFilters(
  projectArtifacts: Artifact[],
  options: UseArtifactFiltersOptions = {},
): UseArtifactFiltersResult {
  const { initialViewMode = 'table', onViewModeChange } = options;
  const [viewMode, setViewModeState] = useState<'table' | 'graph' | 'kanban'>(initialViewMode);
  const [artifactTypeFilter, setArtifactTypeFilter] = useState<'ALL' | ArtifactType>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | string>('ALL');
  const [activeTagFilters, setActiveTagFilters] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const handleViewModeChange = useCallback(
    (mode: 'table' | 'graph' | 'kanban') => {
      setViewModeState(mode);
      onViewModeChange?.(mode);
    },
    [onViewModeChange],
  );

  const availableStatuses = useMemo(
    () => Array.from(new Set(projectArtifacts.map((artifact) => artifact.status))).sort(),
    [projectArtifacts],
  );

  const availableTagFilters = useMemo(() => {
    const seen = new Map<string, string>();

    for (const artifact of projectArtifacts) {
      for (const rawTag of artifact.tags) {
        const trimmed = rawTag.trim();
        if (!trimmed) {
          continue;
        }

        const key = trimmed.toLowerCase();
        if (!seen.has(key)) {
          seen.set(key, trimmed);
        }
      }
    }

    return Array.from(seen.values()).sort((a, b) => a.localeCompare(b));
  }, [projectArtifacts]);

  useEffect(() => {
    setActiveTagFilters((previous) => {
      if (previous.length === 0) {
        return previous;
      }

      const available = new Set(availableTagFilters.map((tag) => tag.toLowerCase()));
      const next = previous.filter((tag) => available.has(tag.toLowerCase()));
      return next.length === previous.length ? previous : next;
    });
  }, [availableTagFilters]);

  const normalizedActiveTagFilters = useMemo(
    () => activeTagFilters.map((tag) => tag.toLowerCase()),
    [activeTagFilters],
  );

  const filteredArtifacts = useMemo(() => {
    const normalizedQuery = searchTerm.trim().toLowerCase();

    return projectArtifacts.filter((artifact) => {
      if (artifactTypeFilter !== 'ALL' && artifact.type !== artifactTypeFilter) {
        return false;
      }

      if (statusFilter !== 'ALL' && artifact.status !== statusFilter) {
        return false;
      }

      if (normalizedActiveTagFilters.length > 0) {
        const artifactTagSet = new Set(artifact.tags.map((tag) => tag.toLowerCase()));
        const matchesAllTags = normalizedActiveTagFilters.every((tag) => artifactTagSet.has(tag));
        if (!matchesAllTags) {
          return false;
        }
      }

      if (normalizedQuery) {
        const haystack = `${artifact.title} ${artifact.summary} ${artifact.tags.join(' ')}`.toLowerCase();
        if (!haystack.includes(normalizedQuery)) {
          return false;
        }
      }

      return true;
    });
  }, [
    projectArtifacts,
    artifactTypeFilter,
    statusFilter,
    normalizedActiveTagFilters,
    searchTerm,
  ]);

  const hasActiveFilters =
    artifactTypeFilter !== 'ALL' ||
    statusFilter !== 'ALL' ||
    searchTerm.trim() !== '' ||
    activeTagFilters.length > 0;

  const resetFilters = useCallback(() => {
    setArtifactTypeFilter('ALL');
    setStatusFilter('ALL');
    setActiveTagFilters([]);
    setSearchTerm('');
  }, []);

  const toggleTagFilter = useCallback((tag: string) => {
    setActiveTagFilters((previous) => {
      const normalized = tag.toLowerCase();
      const isActive = previous.some((item) => item.toLowerCase() === normalized);
      if (isActive) {
        return previous.filter((item) => item.toLowerCase() !== normalized);
      }

      const next = [...previous, tag];
      next.sort((a, b) => a.localeCompare(b));
      return next;
    });
  }, []);

  const isSelectedArtifactHidden = useCallback(
    (artifactId: string | null) => {
      if (!artifactId) {
        return false;
      }

      return !filteredArtifacts.some((artifact) => artifact.id === artifactId);
    },
    [filteredArtifacts],
  );

  return {
    viewMode,
    setViewMode: handleViewModeChange,
    artifactTypeFilter,
    setArtifactTypeFilter,
    statusFilter,
    setStatusFilter,
    activeTagFilters,
    setActiveTagFilters,
    searchTerm,
    setSearchTerm,
    filteredArtifacts,
    availableStatuses,
    availableTagFilters,
    hasActiveFilters,
    resetFilters,
    toggleTagFilter,
    isSelectedArtifactHidden,
  };
}
