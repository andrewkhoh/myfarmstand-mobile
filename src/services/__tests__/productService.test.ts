/**
 * ProductService Test
 * Testing product management functionality
 */

import productService from '../productService';

// Mock the supabase module
const mockSupabase = require('../../config/supabase').supabase;

describe('ProductService', () => {
  const mockProducts = [
    {
      id: 'product-1',
      name: 'Test Product 1',
      description: 'A test product for testing',
      price: 10.00,
      stock_quantity: 5,
      category_id: 'cat-1',
      is_available: true,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z'
    },
    {
      id: 'product-2',
      name: 'Test Product 2',
      description: 'Another test product',
      price: 15.00,
      stock_quantity: 0,
      category_id: 'cat-2',
      is_available: false,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should get all products successfully', async () => {
    // Only return available products since service filters for is_available: true
    const availableProducts = mockProducts.filter(p => p.is_available);
    
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: availableProducts.map(p => ({
                ...p,
                categories: {
                  id: p.category_id,
                  name: 'Test Category',
                  description: 'Test Description',
                  image_url: null,
                  sort_order: 1,
                  is_available: true,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }
              })),
              error: null
            })
          })
        })
      })
    });

    const result = await productService.getProducts();
    
    expect(result.success).toBe(true);
    expect(result.products).toHaveLength(1); // Only one available product
    expect(result.products![0].name).toBe('Test Product 1');
  });

  it('should handle get products error', async () => {
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' }
            })
          })
        })
      })
    });

    const result = await productService.getProducts();
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Failed to fetch products');
  });

  it('should get product by ID', async () => {
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  ...mockProducts[0],
                  categories: {
                    id: mockProducts[0].category_id,
                    name: 'Test Category',
                    description: 'Test Description',
                    image_url: null,
                    sort_order: 1,
                    is_available: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  }
                },
                error: null
              })
            })
          })
        })
      })
    });

    const result = await productService.getProductById('product-1');
    
    expect(result.success).toBe(true);
    expect(result.product?.id).toBe('product-1');
    expect(result.product?.name).toBe('Test Product 1');
  });

  it('should handle product not found', async () => {
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116' }
              })
            })
          })
        })
      })
    });

    const result = await productService.getProductById('invalid-id');
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Product not found');
  });

  it('should get products by category', async () => {
    const categoryProducts = [{
      ...mockProducts[0],
      categories: {
        id: mockProducts[0].category_id,
        name: 'Test Category',
        description: 'Test Description',
        image_url: null,
        sort_order: 1,
        is_available: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    }];
    
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: categoryProducts,
                error: null
              })
            })
          })
        })
      })
    });

    const result = await productService.getProductsByCategory('cat-1');
    
    expect(result.success).toBe(true);
    expect(result.products).toHaveLength(1);
    expect(result.products![0].category_id).toBe('cat-1');
  });

  it('should search products', async () => {
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            or: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: [{
                  ...mockProducts[0],
                  categories: {
                    id: mockProducts[0].category_id,
                    name: 'Test Category',
                    description: 'Test Description',
                    image_url: null,
                    sort_order: 1,
                    is_available: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  }
                }],
                error: null
              })
            })
          })
        })
      })
    });

    const result = await productService.searchProducts('Test');
    
    expect(result.success).toBe(true);
    expect(result.products).toHaveLength(1);
  });

  // Note: These methods may not exist in the actual service
  // Testing only the methods that actually exist

  it('should update product stock', async () => {
    const updatedProduct = { 
      ...mockProducts[0], 
      stock_quantity: 15,
      // Ensure all required fields are present for validation
      category: {
        id: 'cat-1',
        name: 'Test Category',
        description: 'Test Description',
        imageUrl: null,
        sortOrder: 1,
        isActive: true,
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z'
      }
    };
    
    mockSupabase.from.mockReturnValue({
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: updatedProduct,
              error: null
            })
          })
        })
      })
    });

    // Mock getProductById to return a valid product
    productService.getProductById = jest.fn().mockResolvedValue({
      success: true,
      product: updatedProduct
    });

    const result = await productService.updateProductStock('product-1', 15);
    
    expect(result.success).toBe(true);
    expect(result.message).toContain('Product stock updated to 15');
  });
});