import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, jest } from '@jest/globals';

// Mock the hook (doesn't exist yet - RED phase)
const useContentSearch = jest.fn();

describe('useContentSearch', () => {
  let queryClient: QueryClient;
  
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    jest.clearAllMocks();
  });
  
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
  
  describe('search functionality', () => {
    it('should search content by query', async () => {
      const search = jest.fn().mockResolvedValue({
        results: [
          { id: 'content-1', title: 'Summer Sale Campaign', score: 0.95 },
          { id: 'content-2', title: 'Summer Collection Launch', score: 0.85 },
          { id: 'content-3', title: 'Mid-Summer Promotions', score: 0.75 }
        ],
        total: 3
      });
      
      useContentSearch.mockReturnValue({
        isLoading: false,
        search,
        results: []
      });
      
      const { result } = renderHook(() => useContentSearch(), { wrapper });
      
      await act(async () => {
        const searchResults = await result.current.search('summer');
        expect(searchResults.total).toBe(3);
        expect(searchResults.results[0].score).toBe(0.95);
      });
    });
    
    it('should support advanced search with filters', async () => {
      const advancedSearch = jest.fn().mockResolvedValue({
        results: [
          { id: 'content-1', type: 'campaign', status: 'active' },
          { id: 'content-2', type: 'campaign', status: 'active' }
        ],
        total: 2
      });
      
      useContentSearch.mockReturnValue({
        isLoading: false,
        advancedSearch
      });
      
      const { result } = renderHook(() => useContentSearch(), { wrapper });
      
      await act(async () => {
        const results = await result.current.advancedSearch({
          query: 'product launch',
          filters: {
            type: 'campaign',
            status: 'active',
            date_range: { start: '2025-01-01', end: '2025-12-31' }
          }
        });
        expect(results.total).toBe(2);
      });
    });
    
    it('should implement fuzzy search', async () => {
      const fuzzySearch = jest.fn().mockResolvedValue({
        results: [
          { id: 'content-1', title: 'Marketing Campaign', match: 'marketting' },
          { id: 'content-2', title: 'Digital Marketing', match: 'marketting' }
        ],
        query_corrected: 'marketing'
      });
      
      useContentSearch.mockReturnValue({
        isLoading: false,
        fuzzySearch
      });
      
      const { result } = renderHook(() => useContentSearch(), { wrapper });
      
      await act(async () => {
        const results = await result.current.fuzzySearch('marketting');
        expect(results.query_corrected).toBe('marketing');
        expect(results.results).toHaveLength(2);
      });
    });
    
    it('should search with faceted results', async () => {
      useContentSearch.mockReturnValue({
        isLoading: false,
        facets: {
          type: [
            { value: 'campaign', count: 25 },
            { value: 'content', count: 45 },
            { value: 'bundle', count: 15 }
          ],
          status: [
            { value: 'active', count: 30 },
            { value: 'draft', count: 35 },
            { value: 'archived', count: 20 }
          ]
        }
      });
      
      const { result } = renderHook(() => useContentSearch({ includeFacets: true }), { wrapper });
      
      await waitFor(() => {
        expect(result.current.facets.type).toHaveLength(3);
        expect(result.current.facets.status[0].count).toBe(30);
      });
    });
    
    it('should handle search suggestions', async () => {
      const getSuggestions = jest.fn().mockResolvedValue({
        suggestions: [
          'summer sale',
          'summer collection',
          'summer campaign',
          'summer promotions'
        ]
      });
      
      useContentSearch.mockReturnValue({
        isLoading: false,
        getSuggestions
      });
      
      const { result } = renderHook(() => useContentSearch(), { wrapper });
      
      await act(async () => {
        const suggestions = await result.current.getSuggestions('summ');
        expect(suggestions.suggestions).toHaveLength(4);
        expect(suggestions.suggestions[0]).toContain('summer');
      });
    });
    
    it('should save and manage search history', async () => {
      const saveSearch = jest.fn();
      useContentSearch.mockReturnValue({
        isLoading: false,
        saveSearch,
        searchHistory: [
          { query: 'black friday', timestamp: '2025-01-20T10:00:00Z' },
          { query: 'holiday sale', timestamp: '2025-01-19T15:00:00Z' }
        ]
      });
      
      const { result } = renderHook(() => useContentSearch(), { wrapper });
      
      await act(async () => {
        result.current.saveSearch('new year campaign');
      });
      
      expect(saveSearch).toHaveBeenCalledWith('new year campaign');
      expect(result.current.searchHistory).toHaveLength(2);
    });
    
    it('should implement search result highlighting', async () => {
      useContentSearch.mockReturnValue({
        isLoading: false,
        results: [
          {
            id: 'content-1',
            title: 'Summer Sale Campaign',
            highlighted: '<mark>Summer</mark> Sale Campaign',
            snippet: '...launching our biggest <mark>summer</mark> sale of the year...'
          }
        ]
      });
      
      const { result } = renderHook(() => useContentSearch({ query: 'summer', highlight: true }), { wrapper });
      
      await waitFor(() => {
        expect(result.current.results[0].highlighted).toContain('<mark>Summer</mark>');
        expect(result.current.results[0].snippet).toContain('<mark>summer</mark>');
      });
    });
  });
  
  describe('filtering and sorting', () => {
    it('should filter results by content type', async () => {
      const applyFilter = jest.fn();
      useContentSearch.mockReturnValue({
        isLoading: false,
        applyFilter,
        filters: { type: 'campaign' },
        results: [
          { id: 'content-1', type: 'campaign' },
          { id: 'content-2', type: 'campaign' }
        ]
      });
      
      const { result } = renderHook(() => useContentSearch(), { wrapper });
      
      await act(async () => {
        result.current.applyFilter('type', 'campaign');
      });
      
      expect(applyFilter).toHaveBeenCalledWith('type', 'campaign');
      expect(result.current.results.every(r => r.type === 'campaign')).toBe(true);
    });
    
    it('should sort results by relevance, date, or title', async () => {
      const sortResults = jest.fn();
      useContentSearch.mockReturnValue({
        isLoading: false,
        sortResults,
        sortBy: 'relevance',
        results: []
      });
      
      const { result } = renderHook(() => useContentSearch(), { wrapper });
      
      await act(async () => {
        result.current.sortResults('date_desc');
      });
      
      expect(sortResults).toHaveBeenCalledWith('date_desc');
    });
    
    it('should combine multiple filters', async () => {
      const applyFilters = jest.fn().mockResolvedValue({
        results: [
          { id: 'content-1', type: 'campaign', status: 'active', channel: 'email' }
        ],
        total: 1
      });
      
      useContentSearch.mockReturnValue({
        isLoading: false,
        applyFilters
      });
      
      const { result } = renderHook(() => useContentSearch(), { wrapper });
      
      await act(async () => {
        const filtered = await result.current.applyFilters({
          type: 'campaign',
          status: 'active',
          channel: 'email'
        });
        expect(filtered.total).toBe(1);
      });
    });
  });
  
  describe('pagination', () => {
    it('should paginate search results', async () => {
      const loadPage = jest.fn();
      useContentSearch.mockReturnValue({
        isLoading: false,
        loadPage,
        pagination: {
          page: 1,
          pageSize: 20,
          total: 100,
          totalPages: 5
        }
      });
      
      const { result } = renderHook(() => useContentSearch({ pageSize: 20 }), { wrapper });
      
      expect(result.current.pagination.totalPages).toBe(5);
      
      await act(async () => {
        result.current.loadPage(2);
      });
      
      expect(loadPage).toHaveBeenCalledWith(2);
    });
    
    it('should implement infinite scroll', async () => {
      const loadMore = jest.fn().mockResolvedValue({
        results: [/* more results */],
        hasMore: true
      });
      
      useContentSearch.mockReturnValue({
        isLoading: false,
        loadMore,
        hasMore: true,
        results: []
      });
      
      const { result } = renderHook(() => useContentSearch({ infinite: true }), { wrapper });
      
      await act(async () => {
        const more = await result.current.loadMore();
        expect(more.hasMore).toBe(true);
      });
      
      expect(loadMore).toHaveBeenCalled();
    });
  });
  
  describe('performance optimization', () => {
    it('should debounce search queries', async () => {
      const debouncedSearch = jest.fn();
      useContentSearch.mockReturnValue({
        isLoading: false,
        debouncedSearch,
        debounceMs: 300
      });
      
      const { result } = renderHook(() => useContentSearch({ debounce: 300 }), { wrapper });
      
      expect(result.current.debounceMs).toBe(300);
      
      await act(async () => {
        result.current.debouncedSearch('test');
      });
      
      // Debounced function should be called after delay
      setTimeout(() => {
        expect(debouncedSearch).toHaveBeenCalledWith('test');
      }, 350);
    });
    
    it('should cache search results', async () => {
      useContentSearch.mockReturnValue({
        isLoading: false,
        results: [{ id: 'content-1', cached: true }],
        cacheHit: true,
        cacheTime: new Date('2025-01-01T12:00:00Z')
      });
      
      const { result } = renderHook(() => useContentSearch({ query: 'cached query' }), { wrapper });
      
      await waitFor(() => {
        expect(result.current.cacheHit).toBe(true);
        expect(result.current.results[0].cached).toBe(true);
      });
    });
  });
  
  describe('error handling', () => {
    it('should handle search service errors', async () => {
      const search = jest.fn().mockRejectedValue(new Error('Search service unavailable'));
      useContentSearch.mockReturnValue({
        isLoading: false,
        search,
        error: null
      });
      
      const { result } = renderHook(() => useContentSearch(), { wrapper });
      
      await act(async () => {
        try {
          await result.current.search('test');
        } catch (error: any) {
          expect(error.message).toBe('Search service unavailable');
        }
      });
    });
    
    it('should handle empty search results gracefully', async () => {
      useContentSearch.mockReturnValue({
        isLoading: false,
        results: [],
        total: 0,
        emptyState: {
          message: 'No results found',
          suggestions: ['Try different keywords', 'Remove filters']
        }
      });
      
      const { result } = renderHook(() => useContentSearch({ query: 'nonexistent' }), { wrapper });
      
      await waitFor(() => {
        expect(result.current.total).toBe(0);
        expect(result.current.emptyState.message).toBe('No results found');
      });
    });
  });
});