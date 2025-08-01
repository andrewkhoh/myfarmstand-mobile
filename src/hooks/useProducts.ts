import { useState, useEffect, useCallback } from 'react';
import { Product, Category, ListDataState, DataState } from '../types';
import { ProductService } from '../services/productService';

// Hook for fetching all products
export const useProducts = () => {
  const [state, setState] = useState<ListDataState<Product>>({
    data: [],
    loading: false,
    error: null,
    lastFetch: undefined,
  });

  const fetchProducts = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await ProductService.getProducts();
      
      if (response.success) {
        setState({
          data: response.data,
          loading: false,
          error: null,
          lastFetch: new Date(),
        });
      } else {
        setState(prev => ({
          ...prev,
          loading: false,
          error: response.error || 'Failed to fetch products',
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }));
    }
  }, []);

  const refetch = useCallback(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return {
    products: state.data,
    loading: state.loading,
    error: state.error,
    lastFetch: state.lastFetch,
    refetch,
  };
};

// Hook for fetching a single product
export const useProduct = (productId: string | null) => {
  const [state, setState] = useState<DataState<Product>>({
    data: null,
    loading: false,
    error: null,
    lastFetch: undefined,
  });

  const fetchProduct = useCallback(async (id: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await ProductService.getProductById(id);
      
      if (response.success) {
        setState({
          data: response.data,
          loading: false,
          error: null,
          lastFetch: new Date(),
        });
      } else {
        setState(prev => ({
          ...prev,
          loading: false,
          error: response.error || 'Failed to fetch product',
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }));
    }
  }, []);

  useEffect(() => {
    if (productId) {
      fetchProduct(productId);
    } else {
      setState({
        data: null,
        loading: false,
        error: null,
        lastFetch: undefined,
      });
    }
  }, [productId, fetchProduct]);

  const refetch = useCallback(() => {
    if (productId) {
      fetchProduct(productId);
    }
  }, [productId, fetchProduct]);

  return {
    product: state.data,
    loading: state.loading,
    error: state.error,
    lastFetch: state.lastFetch,
    refetch,
  };
};

// Hook for searching products
export const useProductSearch = () => {
  const [state, setState] = useState<ListDataState<Product>>({
    data: [],
    loading: false,
    error: null,
    lastFetch: undefined,
  });

  const searchProducts = useCallback(async (query: string) => {
    if (!query.trim()) {
      setState({
        data: [],
        loading: false,
        error: null,
        lastFetch: undefined,
      });
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await ProductService.searchProducts(query);
      
      if (response.success) {
        setState({
          data: response.data,
          loading: false,
          error: null,
          lastFetch: new Date(),
        });
      } else {
        setState(prev => ({
          ...prev,
          loading: false,
          error: response.error || 'Search failed',
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Search error occurred',
      }));
    }
  }, []);

  const clearSearch = useCallback(() => {
    setState({
      data: [],
      loading: false,
      error: null,
      lastFetch: undefined,
    });
  }, []);

  return {
    searchResults: state.data,
    loading: state.loading,
    error: state.error,
    lastFetch: state.lastFetch,
    searchProducts,
    clearSearch,
  };
};

// Hook for fetching categories
export const useCategories = () => {
  const [state, setState] = useState<ListDataState<Category>>({
    data: [],
    loading: false,
    error: null,
    lastFetch: undefined,
  });

  const fetchCategories = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await ProductService.getCategories();
      
      if (response.success) {
        setState({
          data: response.data,
          loading: false,
          error: null,
          lastFetch: new Date(),
        });
      } else {
        setState(prev => ({
          ...prev,
          loading: false,
          error: response.error || 'Failed to fetch categories',
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }));
    }
  }, []);

  const refetch = useCallback(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return {
    categories: state.data,
    loading: state.loading,
    error: state.error,
    lastFetch: state.lastFetch,
    refetch,
  };
};

// Hook for fetching products by category
export const useProductsByCategory = (categoryId: string | null) => {
  const [state, setState] = useState<ListDataState<Product>>({
    data: [],
    loading: false,
    error: null,
    lastFetch: undefined,
  });

  const fetchProductsByCategory = useCallback(async (catId: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await ProductService.getProductsByCategory(catId);
      
      if (response.success) {
        setState({
          data: response.data,
          loading: false,
          error: null,
          lastFetch: new Date(),
        });
      } else {
        setState(prev => ({
          ...prev,
          loading: false,
          error: response.error || 'Failed to fetch products',
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }));
    }
  }, []);

  useEffect(() => {
    if (categoryId) {
      fetchProductsByCategory(categoryId);
    } else {
      setState({
        data: [],
        loading: false,
        error: null,
        lastFetch: undefined,
      });
    }
  }, [categoryId, fetchProductsByCategory]);

  const refetch = useCallback(() => {
    if (categoryId) {
      fetchProductsByCategory(categoryId);
    }
  }, [categoryId, fetchProductsByCategory]);

  return {
    products: state.data,
    loading: state.loading,
    error: state.error,
    lastFetch: state.lastFetch,
    refetch,
  };
};
