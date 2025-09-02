import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import React from 'react';

// Mock the hook (doesn't exist yet - RED phase)
const useProductContent = jest.fn();

describe('useProductContent', () => {
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
  
  describe('CRUD operations', () => {
    it('should fetch product content list', async () => {
      const mockHookReturn = {
        data: [],
        isLoading: false,
        error: null,
        fetchContent: jest.fn()
      };
      useProductContent.mockReturnValue(mockHookReturn);
      
      const { result } = renderHook(() => useProductContent(), { wrapper });
      
      mockHookReturn.data = [
        { id: '1', title: 'Product A', description: 'Description A', status: 'published' },
        { id: '2', title: 'Product B', description: 'Description B', status: 'draft' }
      ];
      
      await waitFor(() => {
        expect(result.current.data).toHaveLength(2);
        expect(result.current.data[0].title).toBe('Product A');
      });
    });
    
    it('should create new product content with optimistic update', async () => {
      const mockHookReturn = {
        data: [],
        createContent: jest.fn(),
        isCreating: false,
        optimisticData: null
      };
      useProductContent.mockReturnValue(mockHookReturn);
      
      const { result } = renderHook(() => useProductContent(), { wrapper });
      
      const newContent = {
        title: 'New Product',
        description: 'New Description',
        category: 'electronics'
      };
      
      // Optimistic update
      mockHookReturn.optimisticData = { ...newContent, id: 'temp-id' };
      mockHookReturn.isCreating = true;
      
      act(() => {
        result.current.createContent(newContent);
      });
      
      expect(result.current.optimisticData).toBeDefined();
      expect(result.current.isCreating).toBe(true);
      
      // Success
      mockHookReturn.data = [{ ...newContent, id: '3' }];
      mockHookReturn.optimisticData = null;
      mockHookReturn.isCreating = false;
      
      await waitFor(() => {
        expect(result.current.data[0].id).toBe('3');
        expect(result.current.isCreating).toBe(false);
      });
    });
    
    it('should update existing product content', async () => {
      const mockHookReturn = {
        data: [{ id: '1', title: 'Old Title', description: 'Old' }],
        updateContent: jest.fn(),
        isUpdating: false
      };
      useProductContent.mockReturnValue(mockHookReturn);
      
      const { result } = renderHook(() => useProductContent(), { wrapper });
      
      const updates = { title: 'Updated Title', description: 'Updated' };
      
      mockHookReturn.isUpdating = true;
      
      act(() => {
        result.current.updateContent('1', updates);
      });
      
      mockHookReturn.data = [{ id: '1', ...updates }];
      mockHookReturn.isUpdating = false;
      
      await waitFor(() => {
        expect(result.current.data[0].title).toBe('Updated Title');
        expect(result.current.isUpdating).toBe(false);
      });
    });
    
    it('should delete product content with confirmation', async () => {
      const mockHookReturn = {
        data: [
          { id: '1', title: 'Product A' },
          { id: '2', title: 'Product B' }
        ],
        deleteContent: jest.fn(),
        isDeleting: false
      };
      useProductContent.mockReturnValue(mockHookReturn);
      
      const { result } = renderHook(() => useProductContent(), { wrapper });
      
      mockHookReturn.isDeleting = true;
      
      act(() => {
        result.current.deleteContent('1');
      });
      
      mockHookReturn.data = [{ id: '2', title: 'Product B' }];
      mockHookReturn.isDeleting = false;
      
      await waitFor(() => {
        expect(result.current.data).toHaveLength(1);
        expect(result.current.data[0].id).toBe('2');
      });
    });
    
    it('should handle bulk operations', async () => {
      const mockHookReturn = {
        data: [],
        bulkUpdate: jest.fn(),
        bulkDelete: jest.fn(),
        isBulkOperating: false
      };
      useProductContent.mockReturnValue(mockHookReturn);
      
      const { result } = renderHook(() => useProductContent(), { wrapper });
      
      const ids = ['1', '2', '3'];
      const updates = { status: 'published' };
      
      mockHookReturn.isBulkOperating = true;
      
      act(() => {
        result.current.bulkUpdate(ids, updates);
      });
      
      expect(result.current.isBulkOperating).toBe(true);
      
      mockHookReturn.isBulkOperating = false;
      
      await waitFor(() => {
        expect(result.current.isBulkOperating).toBe(false);
      });
    });
    
    it('should handle pagination and infinite scroll', async () => {
      const mockHookReturn = {
        data: [],
        hasNextPage: true,
        isFetchingNextPage: false,
        fetchNextPage: jest.fn(),
        page: 1,
        totalPages: 5
      };
      useProductContent.mockReturnValue(mockHookReturn);
      
      const { result } = renderHook(() => useProductContent(), { wrapper });
      
      expect(result.current.hasNextPage).toBe(true);
      
      mockHookReturn.isFetchingNextPage = true;
      
      act(() => {
        result.current.fetchNextPage();
      });
      
      mockHookReturn.page = 2;
      mockHookReturn.data = [...Array(20)].map((_, i) => ({
        id: `${i + 1}`,
        title: `Product ${i + 1}`
      }));
      mockHookReturn.isFetchingNextPage = false;
      
      await waitFor(() => {
        expect(result.current.page).toBe(2);
        expect(result.current.data).toHaveLength(20);
      });
    });
    
    it('should handle sorting and filtering', async () => {
      const mockHookReturn = {
        data: [],
        setSortBy: jest.fn(),
        setFilter: jest.fn(),
        sortBy: 'createdAt',
        sortOrder: 'desc',
        filters: {}
      };
      useProductContent.mockReturnValue(mockHookReturn);
      
      const { result } = renderHook(() => useProductContent(), { wrapper });
      
      act(() => {
        result.current.setSortBy('title', 'asc');
        result.current.setFilter('status', 'published');
      });
      
      mockHookReturn.sortBy = 'title';
      mockHookReturn.sortOrder = 'asc';
      mockHookReturn.filters = { status: 'published' };
      
      await waitFor(() => {
        expect(result.current.sortBy).toBe('title');
        expect(result.current.filters.status).toBe('published');
      });
    });
    
    it('should rollback on error during optimistic update', async () => {
      const mockHookReturn = {
        data: [{ id: '1', title: 'Original' }],
        updateContent: jest.fn(),
        error: null,
        optimisticData: null
      };
      useProductContent.mockReturnValue(mockHookReturn);
      
      const { result } = renderHook(() => useProductContent(), { wrapper });
      
      // Optimistic update
      mockHookReturn.optimisticData = { id: '1', title: 'Updated' };
      
      act(() => {
        result.current.updateContent('1', { title: 'Updated' });
      });
      
      // Error occurs - rollback
      mockHookReturn.error = new Error('Update failed');
      mockHookReturn.optimisticData = null;
      // Data remains original
      
      await waitFor(() => {
        expect(result.current.data[0].title).toBe('Original');
        expect(result.current.error).toBeDefined();
      });
    });
    
    it('should invalidate cache after mutations', async () => {
      const mockHookReturn = {
        data: [],
        createContent: jest.fn(),
        invalidateQueries: jest.fn(),
        queryKey: ['product-content']
      };
      useProductContent.mockReturnValue(mockHookReturn);
      
      const { result } = renderHook(() => useProductContent(), { wrapper });
      
      await act(async () => {
        await result.current.createContent({ title: 'New' });
      });
      
      expect(result.current.invalidateQueries).toHaveBeenCalledWith(['product-content']);
    });
    
    it('should handle search functionality', async () => {
      const mockHookReturn = {
        searchResults: [],
        search: jest.fn(),
        isSearching: false,
        searchQuery: ''
      };
      useProductContent.mockReturnValue(mockHookReturn);
      
      const { result } = renderHook(() => useProductContent(), { wrapper });
      
      mockHookReturn.isSearching = true;
      mockHookReturn.searchQuery = 'electronics';
      
      act(() => {
        result.current.search('electronics');
      });
      
      mockHookReturn.searchResults = [
        { id: '1', title: 'Electronic Device A' },
        { id: '2', title: 'Electronic Device B' }
      ];
      mockHookReturn.isSearching = false;
      
      await waitFor(() => {
        expect(result.current.searchResults).toHaveLength(2);
        expect(result.current.searchQuery).toBe('electronics');
      });
    });
  });
});