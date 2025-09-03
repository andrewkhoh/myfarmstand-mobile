import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { ProductContentScreen } from '../ProductContentScreen';
import { marketingService } from '../../../services/marketing/marketingService';
import { workflowService } from '../../../services/marketing/workflowService';

jest.mock('../../../services/marketing/marketingService');
jest.mock('../../../services/marketing/workflowService');

describe('ProductContentScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state initially', () => {
    const { getByTestId } = render(<ProductContentScreen />);
    expect(getByTestId('loading-state')).toBeTruthy();
  });

  it('should display content list after loading', async () => {
    const mockContent = [
      {
        id: '1',
        title: 'Product Feature Article',
        type: 'blog',
        status: 'published',
        body: 'Article content here',
        metadata: {
          tags: ['product', 'feature'],
          category: 'features',
          seoTitle: 'Amazing Product Feature',
          seoDescription: 'Learn about our latest feature',
          keywords: ['product', 'innovation'],
          targetAudience: ['users']
        },
        campaignId: 'campaign1',
        authorId: 'author1',
        publishedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    (marketingService.getContent as jest.Mock).mockResolvedValue(mockContent);

    const { getByTestId, getByText } = render(<ProductContentScreen />);

    await waitFor(() => {
      expect(getByTestId('product-content-screen')).toBeTruthy();
      expect(getByText('Product Feature Article')).toBeTruthy();
    });
  });

  it('should handle content creation', async () => {
    const newContent = {
      title: 'New Product Content',
      type: 'blog',
      status: 'draft',
      body: 'New content body',
      metadata: {
        tags: ['new'],
        category: 'product',
        seoTitle: 'New Content',
        seoDescription: 'Description',
        keywords: ['new'],
        targetAudience: ['all']
      },
      campaignId: 'campaign1',
      authorId: 'author1'
    };

    (marketingService.createContent as jest.Mock).mockResolvedValue({
      ...newContent,
      id: '2',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const { getByTestId, getByPlaceholderText } = render(<ProductContentScreen />);
    
    await waitFor(() => {
      expect(getByTestId('product-content-screen')).toBeTruthy();
    });

    const createButton = getByTestId('create-content-button');
    fireEvent.press(createButton);

    const titleInput = getByPlaceholderText('Content Title');
    fireEvent.changeText(titleInput, 'New Product Content');

    const submitButton = getByTestId('submit-content-button');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(marketingService.createContent).toHaveBeenCalledWith(expect.objectContaining({
        title: 'New Product Content'
      }));
    });
  });

  it('should handle content workflow transitions', async () => {
    const mockWorkflow = {
      id: 'wf1',
      entity_id: 'content1',
      entity_type: 'content',
      current_state: 'draft',
      steps: [
        { id: '1', name: 'Draft', type: 'create', status: 'completed' },
        { id: '2', name: 'Review', type: 'review', status: 'pending' }
      ],
      currentStep: 0,
      status: 'in_progress',
      createdAt: new Date()
    };

    (workflowService.getWorkflowState as jest.Mock).mockResolvedValue(mockWorkflow);
    (workflowService.transitionState as jest.Mock).mockResolvedValue({
      ...mockWorkflow,
      current_state: 'review'
    });

    const { getByTestId } = render(<ProductContentScreen contentId="content1" />);

    await waitFor(() => {
      expect(getByTestId('workflow-state')).toBeTruthy();
      expect(getByTestId('workflow-state-draft')).toBeTruthy();
    });

    const transitionButton = getByTestId('transition-to-review');
    fireEvent.press(transitionButton);

    await waitFor(() => {
      expect(workflowService.transitionState).toHaveBeenCalledWith('wf1', 'review');
    });
  });

  it('should display content metadata and SEO fields', async () => {
    const mockContent = [
      {
        id: '1',
        title: 'SEO Optimized Content',
        type: 'article',
        status: 'published',
        body: 'Content body',
        metadata: {
          tags: ['seo', 'marketing'],
          category: 'guide',
          seoTitle: 'SEO Best Practices Guide',
          seoDescription: 'Learn how to optimize your content for search engines',
          keywords: ['seo', 'optimization', 'search'],
          targetAudience: ['marketers', 'content creators']
        },
        campaignId: 'campaign1',
        authorId: 'author1',
        publishedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    (marketingService.getContent as jest.Mock).mockResolvedValue(mockContent);

    const { getByTestId, getByText } = render(<ProductContentScreen />);

    await waitFor(() => {
      expect(getByText('SEO Best Practices Guide')).toBeTruthy();
      expect(getByText('seo')).toBeTruthy();
      expect(getByText('marketing')).toBeTruthy();
    });
  });

  it('should handle content deletion', async () => {
    const mockContent = [
      {
        id: '1',
        title: 'Content to Delete',
        type: 'blog',
        status: 'draft',
        body: 'This will be deleted',
        metadata: {},
        campaignId: 'campaign1',
        authorId: 'author1',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    (marketingService.getContent as jest.Mock).mockResolvedValue(mockContent);
    (marketingService.deleteContent as jest.Mock).mockResolvedValue(undefined);

    const { getByTestId, queryByText } = render(<ProductContentScreen />);

    await waitFor(() => {
      expect(getByTestId('content-item-1')).toBeTruthy();
    });

    const deleteButton = getByTestId('delete-content-1');
    fireEvent.press(deleteButton);

    await waitFor(() => {
      expect(marketingService.deleteContent).toHaveBeenCalledWith('1');
    });
  });

  it('should support rich text editing', async () => {
    const { getByTestId, getByPlaceholderText } = render(<ProductContentScreen />);

    await waitFor(() => {
      expect(getByTestId('product-content-screen')).toBeTruthy();
    });

    const createButton = getByTestId('create-content-button');
    fireEvent.press(createButton);

    const richTextEditor = getByTestId('rich-text-editor');
    expect(richTextEditor).toBeTruthy();

    // Test formatting buttons
    const boldButton = getByTestId('format-bold');
    const italicButton = getByTestId('format-italic');
    const linkButton = getByTestId('format-link');

    expect(boldButton).toBeTruthy();
    expect(italicButton).toBeTruthy();
    expect(linkButton).toBeTruthy();
  });

  it('should handle media upload for content', async () => {
    const { getByTestId } = render(<ProductContentScreen />);

    await waitFor(() => {
      expect(getByTestId('product-content-screen')).toBeTruthy();
    });

    const createButton = getByTestId('create-content-button');
    fireEvent.press(createButton);

    const uploadButton = getByTestId('upload-media-button');
    expect(uploadButton).toBeTruthy();

    fireEvent.press(uploadButton);

    // Mock file selection would happen here
    await waitFor(() => {
      expect(getByTestId('media-gallery')).toBeTruthy();
    });
  });

  it('should filter content by status', async () => {
    const mockContent = [
      {
        id: '1',
        title: 'Published Content',
        type: 'blog',
        status: 'published',
        body: 'Published',
        metadata: {},
        campaignId: 'campaign1',
        authorId: 'author1',
        publishedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '2',
        title: 'Draft Content',
        type: 'blog',
        status: 'draft',
        body: 'Draft',
        metadata: {},
        campaignId: 'campaign1',
        authorId: 'author1',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    (marketingService.getContent as jest.Mock).mockResolvedValue(mockContent);

    const { getByTestId, getByText, queryByText } = render(<ProductContentScreen />);

    await waitFor(() => {
      expect(getByText('Published Content')).toBeTruthy();
      expect(getByText('Draft Content')).toBeTruthy();
    });

    // Filter to show only published
    const filterButton = getByTestId('filter-published');
    fireEvent.press(filterButton);

    await waitFor(() => {
      expect(getByText('Published Content')).toBeTruthy();
      expect(queryByText('Draft Content')).toBeFalsy();
    });
  });

  it('should handle content search', async () => {
    const mockContent = [
      {
        id: '1',
        title: 'Product Launch Article',
        type: 'blog',
        status: 'published',
        body: 'Launch details',
        metadata: {},
        campaignId: 'campaign1',
        authorId: 'author1',
        publishedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '2',
        title: 'Feature Update',
        type: 'blog',
        status: 'published',
        body: 'Update info',
        metadata: {},
        campaignId: 'campaign1',
        authorId: 'author1',
        publishedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    (marketingService.getContent as jest.Mock).mockResolvedValue(mockContent);

    const { getByTestId, getByPlaceholderText, getByText, queryByText } = render(<ProductContentScreen />);

    await waitFor(() => {
      expect(getByText('Product Launch Article')).toBeTruthy();
      expect(getByText('Feature Update')).toBeTruthy();
    });

    const searchInput = getByPlaceholderText('Search content...');
    fireEvent.changeText(searchInput, 'Launch');

    await waitFor(() => {
      expect(getByText('Product Launch Article')).toBeTruthy();
      expect(queryByText('Feature Update')).toBeFalsy();
    });
  });
});