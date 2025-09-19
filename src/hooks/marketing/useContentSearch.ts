import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { contentService } from '../../services/marketing/content.service';
// import type { WorkflowState } from '../../types/marketing.types'; // Removed unused import


interface SearchFilters {
  type?: 'all' | 'product' | 'campaign' | 'bundle' | 'article';
  status?: 'all' | 'draft' | 'published' | 'archived';
  dateFrom?: Date;
  dateTo?: Date;
  tags?: string[];
  categories?: string[];
  sortBy?: 'relevance' | 'date' | 'popularity' | 'title';
  sortOrder?: 'asc' | 'desc';
}

interface SearchResult {
  id: string;
  type: string;
  title: string;
  description: string;
  thumbnail?: string;
  url?: string;
  relevanceScore?: number;
  publishedAt?: Date;
  author?: string;
  tags?: string[];
  highlights?: string[];
}

interface SearchSuggestion {
  term: string;
  count: number;
  category?: string;
}

interface SearchFacet {
  field: string;
  values: Array<{
    value: string;
    count: number;
  }>;
}

export function useContentSearch(initialQuery?: string) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState(initialQuery || '');
  const [filters, setFilters] = useState<SearchFilters>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [savedSearches, setSavedSearches] = useState<Array<{ id: string; name: string; query: string; filters: SearchFilters }>>([]);

  // Main search query
  const searchQuery_ = useQuery({
    queryKey: ['search', 'query', searchQuery, filters, page, pageSize],
    queryFn: async () => {
      if (!searchQuery && Object.keys(filters).length === 0) {
        return { results: [], total: 0, facets: [], suggestions: [] };
      }
      
      if (contentService.searchContent) {
        return contentService.searchContent(searchQuery, filters, page, pageSize);
      }
      
      // Mock search results
      return {
        results: [
          {
            id: '1',
            type: 'product',
            title: 'Product Content Match',
            description: 'This product content matches your search',
            relevanceScore: 0.95,
            publishedAt: new Date(),
            tags: ['product', 'featured'],
            highlights: ['Matching <mark>search term</mark> found here']
          },
          {
            id: '2',
            type: 'campaign',
            title: 'Campaign Content',
            description: 'Campaign content relevant to search',
            relevanceScore: 0.85,
            publishedAt: new Date(),
            tags: ['campaign', 'marketing']
          }
        ],
        total: 42,
        facets: [
          {
            field: 'type',
            values: [
              { value: 'product', count: 15 },
              { value: 'campaign', count: 12 },
              { value: 'article', count: 10 },
              { value: 'bundle', count: 5 }
            ]
          },
          {
            field: 'status',
            values: [
              { value: 'published', count: 30 },
              { value: 'draft', count: 10 },
              { value: 'archived', count: 2 }
            ]
          }
        ],
        suggestions: searchQuery ? [
          { term: searchQuery + ' tips', count: 8, category: 'article' },
          { term: searchQuery + ' guide', count: 5, category: 'article' },
          { term: searchQuery + ' bundle', count: 3, category: 'bundle' }
        ] : []
      };
    },
    enabled: true,
    staleTime: 5000
  });

  // Autocomplete suggestions query
  const suggestionsQuery = useQuery({
    queryKey: ['search', 'suggestions', searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return [];
      
      if (contentService.getSearchSuggestions) {
        return contentService.getSearchSuggestions(searchQuery);
      }
      
      // Mock suggestions
      return [
        { term: searchQuery + ' product', count: 10 },
        { term: searchQuery + ' campaign', count: 5 },
        { term: searchQuery + ' bundle', count: 3 }
      ];
    },
    enabled: searchQuery.length >= 2,
    staleTime: 30000
  });

  // Save search mutation
  const saveSearchMutation = useMutation({
    mutationFn: async ({ name, query, filters }: { name: string; query: string; filters: SearchFilters }) => {
      const saved = {
        id: `search-${Date.now()}`,
        name,
        query,
        filters
      };
      
      setSavedSearches(prev => [...prev, saved]);
      
      if (contentService.saveSearch) {
        return contentService.saveSearch(saved);
      }
      
      return saved;
    }
  });

  // Delete saved search mutation
  const deleteSearchMutation = useMutation({
    mutationFn: async (searchId: string) => {
      setSavedSearches(prev => prev.filter(s => s.id !== searchId));
      
      if (contentService.deleteSavedSearch) {
        return contentService.deleteSavedSearch(searchId);
      }
      
      return true;
    }
  });

  // Search functions
  const search = useCallback((query: string, newFilters?: SearchFilters) => {
    setSearchQuery(query);
    if (newFilters) {
      setFilters(newFilters);
    }
    setPage(1);
    
    // Add to search history
    if (query && !searchHistory.includes(query)) {
      setSearchHistory(prev => [query, ...prev.slice(0, 9)]);
    }
  }, [searchHistory]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setFilters({});
    setPage(1);
  }, []);

  const updateFilters = useCallback((newFilters: SearchFilters) => {
    setFilters(newFilters);
    setPage(1);
  }, []);

  const addFilter = useCallback((key: keyof SearchFilters, value: string | number | boolean | string[]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  }, []);

  const removeFilter = useCallback((key: keyof SearchFilters) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[key];
      return newFilters;
    });
    setPage(1);
  }, []);

  const nextPage = useCallback(() => {
    const totalPages = Math.ceil((searchQuery_?.data?.total || 0) / pageSize);
    if (page < totalPages) {
      setPage(prev => prev + 1);
    }
  }, [page, pageSize, searchQuery_?.data?.total]);

  const previousPage = useCallback(() => {
    if (page > 1) {
      setPage(prev => prev - 1);
    }
  }, [page]);

  const goToPage = useCallback((pageNumber: number) => {
    const totalPages = Math.ceil((searchQuery_?.data?.total || 0) / pageSize);
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setPage(pageNumber);
    }
  }, [pageSize, searchQuery_?.data?.total]);

  const saveSearch = useCallback((name: string) => {
    return saveSearchMutation.mutate({ name, query: searchQuery, filters }, {
      onError: (error) => {
        console.error('Mutation error:', error);
        // Handle error appropriately
      }
    });
  }, [searchQuery, filters, saveSearchMutation]);

  const loadSavedSearch = useCallback((searchId: string) => {
    const saved = savedSearches.find(s => s.id === searchId);
    if (saved) {
      setSearchQuery(saved.query);
      setFilters(saved.filters);
      setPage(1);
    }
  }, [savedSearches]);

  const deleteSavedSearch = useCallback((searchId: string) => {
    return deleteSearchMutation.mutate(searchId, {
      onError: (error) => {
        console.error('Mutation error:', error);
        // Handle error appropriately
      }
    });
  }, [deleteSearchMutation]);

  // Export results
  const exportResults = useCallback(async (format: 'csv' | 'json' | 'pdf') => {
    if (contentService.exportSearchResults) {
      return contentService.exportSearchResults(
        searchQuery_?.data?.results || [],
        format
      );
    }
    
    // Mock export
    return {
      url: `https://download.example.com/search-results.${format}`,
      filename: `search-results-${Date.now()}.${format}`
    };
  }, [searchQuery_?.data?.results]);

  // Load saved searches on mount
  useEffect(() => {
    const loadSaved = async () => {
      if (contentService.getSavedSearches) {
        let saved;
    try {
      saved = await contentService.getSavedSearches();
    } catch (error) {
      console.error('Failed to get saved searches:', error);
      saved = [];
    }
        setSavedSearches(saved);
      }
    };
    loadSaved();
  }, []);

  // Clear search history after unmount
  useEffect(() => {
    return () => {
      // Optionally persist search history
      if (contentService.saveSearchHistory) {
        contentService.saveSearchHistory(searchHistory);
      }
    };
  }, [searchHistory]);

  return {
    // Search state
    query: searchQuery,
    filters,
    results: searchQuery_?.data?.results || [],
    total: searchQuery_?.data?.total || 0,
    facets: searchQuery_?.data?.facets || [],
    suggestions: suggestionsQuery.data || [],
    searchSuggestions: searchQuery_?.data?.suggestions || [],
    
    // Pagination
    page,
    pageSize,
    totalPages: Math.ceil((searchQuery_?.data?.total || 0) / pageSize),
    hasNextPage: page < Math.ceil((searchQuery_?.data?.total || 0) / pageSize),
    hasPreviousPage: page > 1,
    
    // History & saved searches
    searchHistory,
    savedSearches,
    
    // Actions
    search,
    clearSearch,
    updateFilters,
    addFilter,
    removeFilter,
    nextPage,
    previousPage,
    goToPage,
    setPageSize,
    saveSearch,
    loadSavedSearch,
    deleteSavedSearch,
    exportResults,
    
    // Status
    isLoading: searchQuery_.isLoading,
    isSearching: searchQuery_.isFetching,
    error: searchQuery_.error,
    isSavingSearch: saveSearchMutation.isPending,
    isDeletingSearch: deleteSearchMutation.isPending
  };
}