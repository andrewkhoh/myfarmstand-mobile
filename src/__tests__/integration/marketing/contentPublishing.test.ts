import React from 'react';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { fireEvent, waitFor } from '@testing-library/react-native';
import {
  renderApp,
  setupIntegrationTest,
  cleanupIntegrationTest,
  TestContext,
  navigateTo,
  waitForAsyncOperations
} from '@/test/integration-utils';

describe('Content Publishing Workflow', () => {
  let testContext: TestContext;
  
  beforeEach(async () => {
    testContext = await setupIntegrationTest();
    jest.clearAllMocks();
  });
  
  afterEach(async () => {
    await cleanupIntegrationTest(testContext);
  });
  
  describe('Happy Path', () => {
    it('should complete full content creation, review, approval, and publishing workflow', async () => {
      // Step 1: Navigate to content creation
      // Render the main app with navigation and providers
      // This would normally render the MarketingApp component
      // Since it doesn't exist yet, the test will fail (RED phase)
      const MarketingApp = () => <div />; // Placeholder for non-existent component
      const { getByText, getByTestId, queryByText } = renderApp(
        <MarketingApp />,
        { queryClient: testContext.queryClient }
      );
      
      fireEvent.press(getByText('Create Content'));
      await waitFor(() => {
        expect(getByTestId('content-creation-screen')).toBeTruthy();
      });
      
      // Step 2: Fill content form
      fireEvent.changeText(getByTestId('content-title-input'), 'New Product Launch');
      fireEvent.changeText(getByTestId('content-description-input'), 'Exciting new product description');
      fireEvent.changeText(getByTestId('content-body-input'), 'Full marketing content body text');
      
      // Step 3: Select content type and category
      fireEvent.press(getByTestId('content-type-selector'));
      fireEvent.press(getByText('Product Announcement'));
      
      fireEvent.press(getByTestId('category-selector'));
      fireEvent.press(getByText('Electronics'));
      
      // Step 4: Add tags
      fireEvent.changeText(getByTestId('tags-input'), 'launch, product, new');
      fireEvent.press(getByTestId('add-tags-button'));
      
      // Step 5: Upload images
      fireEvent.press(getByTestId('add-media-button'));
      fireEvent.press(getByTestId('image-picker'));
      
      // Mock image selection
      const mockImageUri = 'file:///mock/image.jpg';
      fireEvent(getByTestId('image-picker'), 'onImageSelected', { uri: mockImageUri });
      
      await waitFor(() => {
        expect(getByTestId('image-preview-0')).toBeTruthy();
      });
      
      // Step 6: Save as draft
      fireEvent.press(getByTestId('save-draft-button'));
      
      await waitFor(() => {
        expect(getByText('Content saved as draft')).toBeTruthy();
      });
      
      // Verify draft state
      const draftContent = await testContext.mockServices.contentService.listContents({ status: 'draft' });
      expect(draftContent.length).toBe(1);
      expect(draftContent[0].title).toBe('New Product Launch');
      
      // Step 7: Submit for review
      fireEvent.press(getByTestId('submit-for-review-button'));
      
      await waitFor(() => {
        expect(getByText('Submitted for review')).toBeTruthy();
        expect(getByTestId('content-status-badge')).toHaveTextContent('In Review');
      });
      
      // Step 8: Switch to reviewer role
      fireEvent.press(getByTestId('user-menu'));
      fireEvent.press(getByText('Switch to Reviewer'));
      
      // Step 9: Navigate to review queue
      fireEvent.press(getByText('Review Queue'));
      
      await waitFor(() => {
        expect(getByTestId('review-queue-screen')).toBeTruthy();
      });
      
      // Step 10: Select content for review
      fireEvent.press(getByTestId('review-item-0'));
      
      await waitFor(() => {
        expect(getByTestId('review-detail-screen')).toBeTruthy();
      });
      
      // Step 11: Review content details
      expect(getByText('New Product Launch')).toBeTruthy();
      expect(getByText('Exciting new product description')).toBeTruthy();
      
      // Step 12: Add review comments
      fireEvent.changeText(getByTestId('review-comments-input'), 'Looks good, approved for publishing');
      
      // Step 13: Approve content
      fireEvent.press(getByTestId('approve-button'));
      
      await waitFor(() => {
        expect(getByText('Content approved')).toBeTruthy();
      });
      
      // Step 14: Switch back to marketer role
      fireEvent.press(getByTestId('user-menu'));
      fireEvent.press(getByText('Switch to Marketer'));
      
      // Step 15: Navigate to approved content
      fireEvent.press(getByText('My Content'));
      fireEvent.press(getByTestId('filter-approved'));
      
      await waitFor(() => {
        expect(getByTestId('content-item-0')).toBeTruthy();
      });
      
      // Step 16: Open approved content
      fireEvent.press(getByTestId('content-item-0'));
      
      // Step 17: Schedule publishing
      fireEvent.press(getByTestId('schedule-publish-button'));
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      fireEvent(getByTestId('date-picker'), 'onDateChange', tomorrow);
      fireEvent.press(getByText('Confirm Schedule'));
      
      // Step 18: Publish immediately instead
      fireEvent.press(getByTestId('publish-now-button'));
      
      await waitFor(() => {
        expect(getByText('Content published successfully')).toBeTruthy();
        expect(getByTestId('content-status-badge')).toHaveTextContent('Published');
      });
      
      // Step 19: Verify in public view
      fireEvent.press(getByTestId('view-published-button'));
      
      await waitFor(() => {
        expect(getByTestId('public-content-view')).toBeTruthy();
        expect(getByText('New Product Launch')).toBeTruthy();
      });
      
      // Step 20: Verify analytics tracking
      const metrics = await testContext.mockServices.analyticsService.getMetrics();
      expect(metrics.events).toContainEqual(
        expect.objectContaining({
          eventName: 'content_published',
          data: expect.objectContaining({ contentId: expect.any(String) })
        })
      );
    });
    
    it('should handle auto-save while editing content', async () => {
      const { getByText, getByTestId } = renderApp(
        <MarketingApp />,
        { queryClient: testContext.queryClient }
      );
      
      fireEvent.press(getByText('Create Content'));
      
      // Start typing
      fireEvent.changeText(getByTestId('content-title-input'), 'Auto');
      
      // Wait for auto-save
      await waitFor(() => {
        expect(getByTestId('auto-save-indicator')).toHaveTextContent('Saving...');
      }, { timeout: 2000 });
      
      await waitFor(() => {
        expect(getByTestId('auto-save-indicator')).toHaveTextContent('Saved');
      });
      
      // Continue typing
      fireEvent.changeText(getByTestId('content-title-input'), 'Auto-saved Content');
      
      await waitFor(() => {
        expect(getByTestId('auto-save-indicator')).toHaveTextContent('Saved');
      });
      
      // Verify content was saved
      const drafts = await testContext.mockServices.contentService.listContents({ status: 'draft' });
      expect(drafts[0].title).toBe('Auto-saved Content');
    });
    
    it('should maintain content history and allow version comparison', async () => {
      const { getByText, getByTestId } = renderApp(
        <MarketingApp />,
        { queryClient: testContext.queryClient }
      );
      
      // Create initial version
      fireEvent.press(getByText('Create Content'));
      fireEvent.changeText(getByTestId('content-title-input'), 'Version 1');
      fireEvent.press(getByTestId('save-draft-button'));
      
      await waitFor(() => {
        expect(getByText('Content saved as draft')).toBeTruthy();
      });
      
      // Edit to create version 2
      fireEvent.changeText(getByTestId('content-title-input'), 'Version 2');
      fireEvent.press(getByTestId('save-draft-button'));
      
      // Edit to create version 3
      fireEvent.changeText(getByTestId('content-title-input'), 'Version 3');
      fireEvent.press(getByTestId('save-draft-button'));
      
      // Open version history
      fireEvent.press(getByTestId('version-history-button'));
      
      await waitFor(() => {
        expect(getByTestId('version-history-modal')).toBeTruthy();
      });
      
      // Should show 3 versions
      expect(getByTestId('version-item-0')).toBeTruthy();
      expect(getByTestId('version-item-1')).toBeTruthy();
      expect(getByTestId('version-item-2')).toBeTruthy();
      
      // Compare versions
      fireEvent.press(getByTestId('compare-version-1-2'));
      
      await waitFor(() => {
        expect(getByTestId('version-diff-view')).toBeTruthy();
        expect(getByText('- Version 1')).toBeTruthy();
        expect(getByText('+ Version 2')).toBeTruthy();
      });
      
      // Restore older version
      fireEvent.press(getByTestId('restore-version-1'));
      fireEvent.press(getByText('Confirm Restore'));
      
      await waitFor(() => {
        expect(getByTestId('content-title-input')).toHaveTextContent('Version 1');
      });
    });
  });
  
  describe('Review Rejection Flow', () => {
    it('should handle content rejection and revision workflow', async () => {
      const { getByText, getByTestId } = renderApp(
        <MarketingApp />,
        { queryClient: testContext.queryClient }
      );
      
      // Create and submit content
      fireEvent.press(getByText('Create Content'));
      fireEvent.changeText(getByTestId('content-title-input'), 'Content for Rejection');
      fireEvent.changeText(getByTestId('content-description-input'), 'This will be rejected');
      fireEvent.press(getByTestId('save-draft-button'));
      fireEvent.press(getByTestId('submit-for-review-button'));
      
      await waitFor(() => {
        expect(getByText('Submitted for review')).toBeTruthy();
      });
      
      // Switch to reviewer
      fireEvent.press(getByTestId('user-menu'));
      fireEvent.press(getByText('Switch to Reviewer'));
      fireEvent.press(getByText('Review Queue'));
      fireEvent.press(getByTestId('review-item-0'));
      
      // Reject with feedback
      fireEvent.changeText(getByTestId('review-comments-input'), 'Needs more detail in description');
      fireEvent.press(getByTestId('reject-button'));
      
      await waitFor(() => {
        expect(getByText('Content rejected')).toBeTruthy();
      });
      
      // Switch back to marketer
      fireEvent.press(getByTestId('user-menu'));
      fireEvent.press(getByText('Switch to Marketer'));
      fireEvent.press(getByText('My Content'));
      
      // Check rejected content
      fireEvent.press(getByTestId('filter-rejected'));
      fireEvent.press(getByTestId('content-item-0'));
      
      // Should see rejection feedback
      expect(getByTestId('rejection-feedback')).toHaveTextContent('Needs more detail in description');
      expect(getByTestId('content-status-badge')).toHaveTextContent('Rejected');
      
      // Revise content
      fireEvent.press(getByTestId('revise-button'));
      fireEvent.changeText(getByTestId('content-description-input'), 'Much more detailed description with all required information');
      fireEvent.press(getByTestId('save-draft-button'));
      
      // Resubmit for review
      fireEvent.press(getByTestId('resubmit-for-review-button'));
      
      await waitFor(() => {
        expect(getByText('Resubmitted for review')).toBeTruthy();
        expect(getByTestId('content-status-badge')).toHaveTextContent('In Review');
      });
      
      // Verify revision history
      fireEvent.press(getByTestId('revision-history-button'));
      expect(getByText('Revision 2: After feedback')).toBeTruthy();
    });
    
    it('should require mandatory fields before submission', async () => {
      const { getByText, getByTestId } = renderApp(
        <MarketingApp />,
        { queryClient: testContext.queryClient }
      );
      
      fireEvent.press(getByText('Create Content'));
      
      // Try to submit without required fields
      fireEvent.press(getByTestId('submit-for-review-button'));
      
      await waitFor(() => {
        expect(getByText('Please fill in all required fields')).toBeTruthy();
      });
      
      // Check field validation
      expect(getByTestId('content-title-input-error')).toHaveTextContent('Title is required');
      expect(getByTestId('content-description-input-error')).toHaveTextContent('Description is required');
      expect(getByTestId('content-body-input-error')).toHaveTextContent('Content body is required');
      
      // Fill required fields
      fireEvent.changeText(getByTestId('content-title-input'), 'Valid Title');
      expect(queryByText('Title is required')).toBeFalsy();
      
      fireEvent.changeText(getByTestId('content-description-input'), 'Valid Description');
      expect(queryByText('Description is required')).toBeFalsy();
      
      fireEvent.changeText(getByTestId('content-body-input'), 'Valid Body');
      expect(queryByText('Content body is required')).toBeFalsy();
      
      // Now submission should work
      fireEvent.press(getByTestId('submit-for-review-button'));
      
      await waitFor(() => {
        expect(getByText('Submitted for review')).toBeTruthy();
      });
    });
  });
  
  describe('Concurrent Editing', () => {
    it('should detect and handle concurrent edits by multiple users', async () => {
      // User 1 starts editing
      const user1 = renderApp(
        <MarketingApp />,
        { queryClient: testContext.queryClient }
      );
      
      fireEvent.press(user1.getByText('Create Content'));
      fireEvent.changeText(user1.getByTestId('content-title-input'), 'Collaborative Content');
      fireEvent.press(user1.getByTestId('save-draft-button'));
      
      await waitFor(() => {
        expect(user1.getByText('Content saved as draft')).toBeTruthy();
      });
      
      const contentId = user1.getByTestId('content-id').props.children;
      
      // User 2 opens same content
      const user2Context = await setupIntegrationTest();
      await user2Context.mockServices.authService.login('user2@example.com', 'password');
      
      const user2 = renderApp(
        <MarketingApp contentId={contentId} />,
        { queryClient: user2Context.queryClient }
      );
      
      // Both users edit simultaneously
      fireEvent.changeText(user1.getByTestId('content-title-input'), 'User 1 Edit');
      fireEvent.changeText(user2.getByTestId('content-title-input'), 'User 2 Edit');
      
      // User 1 saves first
      fireEvent.press(user1.getByTestId('save-draft-button'));
      
      await waitFor(() => {
        expect(user1.getByText('Content saved')).toBeTruthy();
      });
      
      // User 2 tries to save - should detect conflict
      fireEvent.press(user2.getByTestId('save-draft-button'));
      
      await waitFor(() => {
        expect(user2.getByTestId('conflict-modal')).toBeTruthy();
        expect(user2.getByText('Content has been modified by another user')).toBeTruthy();
      });
      
      // Show diff
      expect(user2.getByTestId('conflict-diff')).toBeTruthy();
      expect(user2.getByText('Your version: User 2 Edit')).toBeTruthy();
      expect(user2.getByText('Current version: User 1 Edit')).toBeTruthy();
      
      // User 2 chooses to merge
      fireEvent.press(user2.getByText('Merge Changes'));
      
      await waitFor(() => {
        expect(user2.getByTestId('merge-editor')).toBeTruthy();
      });
      
      // Clean up second context
      await cleanupIntegrationTest(user2Context);
    });
    
    it('should show real-time collaboration indicators', async () => {
      const { getByText, getByTestId } = renderApp(
        <MarketingApp />,
        { queryClient: testContext.queryClient }
      );
      
      // Create content
      fireEvent.press(getByText('Create Content'));
      fireEvent.changeText(getByTestId('content-title-input'), 'Collaborative Content');
      fireEvent.press(getByTestId('save-draft-button'));
      
      const contentId = getByTestId('content-id').props.children;
      
      // Simulate another user joining
      const user2Context = await setupIntegrationTest();
      await user2Context.mockServices.authService.login('user2@example.com', 'password');
      
      renderApp(
        <MarketingApp contentId={contentId} />,
        { queryClient: user2Context.queryClient }
      );
      
      // User 1 should see collaboration indicator
      await waitFor(() => {
        expect(getByTestId('active-users-indicator')).toBeTruthy();
        expect(getByText('2 users editing')).toBeTruthy();
      });
      
      // Should show user avatars
      expect(getByTestId('user-avatar-0')).toBeTruthy();
      expect(getByTestId('user-avatar-1')).toBeTruthy();
      
      // Clean up
      await cleanupIntegrationTest(user2Context);
    });
  });
  
  describe('Media Management', () => {
    it('should handle multiple image uploads with progress tracking', async () => {
      const { getByText, getByTestId } = renderApp(
        <MarketingApp />,
        { queryClient: testContext.queryClient }
      );
      
      fireEvent.press(getByText('Create Content'));
      fireEvent.press(getByTestId('add-media-button'));
      
      // Select multiple images
      const mockImages = [
        { uri: 'file:///image1.jpg', size: 1024000 },
        { uri: 'file:///image2.jpg', size: 2048000 },
        { uri: 'file:///image3.jpg', size: 512000 }
      ];
      
      fireEvent(getByTestId('image-picker'), 'onMultipleImagesSelected', mockImages);
      
      // Should show upload progress for each
      await waitFor(() => {
        expect(getByTestId('upload-progress-0')).toBeTruthy();
        expect(getByTestId('upload-progress-1')).toBeTruthy();
        expect(getByTestId('upload-progress-2')).toBeTruthy();
      });
      
      // Wait for uploads to complete
      await waitFor(() => {
        expect(getByTestId('image-preview-0')).toBeTruthy();
        expect(getByTestId('image-preview-1')).toBeTruthy();
        expect(getByTestId('image-preview-2')).toBeTruthy();
      }, { timeout: 5000 });
      
      // Should be able to reorder images
      fireEvent(getByTestId('image-list'), 'onDragEnd', { 
        data: [mockImages[1], mockImages[0], mockImages[2]] 
      });
      
      // Should be able to delete image
      fireEvent.press(getByTestId('delete-image-1'));
      fireEvent.press(getByText('Confirm Delete'));
      
      await waitFor(() => {
        expect(queryByTestId('image-preview-1')).toBeFalsy();
      });
    });
    
    it('should validate and compress large images before upload', async () => {
      const { getByText, getByTestId } = renderApp(
        <MarketingApp />,
        { queryClient: testContext.queryClient }
      );
      
      fireEvent.press(getByText('Create Content'));
      fireEvent.press(getByTestId('add-media-button'));
      
      // Try to upload oversized image
      const largeImage = { uri: 'file:///large.jpg', size: 10485760 }; // 10MB
      
      fireEvent(getByTestId('image-picker'), 'onImageSelected', largeImage);
      
      // Should show compression dialog
      await waitFor(() => {
        expect(getByTestId('image-compression-dialog')).toBeTruthy();
        expect(getByText('Image is too large (10MB). Compressing...')).toBeTruthy();
      });
      
      // Should complete compression and upload
      await waitFor(() => {
        expect(getByTestId('image-preview-0')).toBeTruthy();
        expect(getByText('Image compressed to 2MB')).toBeTruthy();
      }, { timeout: 5000 });
    });
    
    it('should support video content with thumbnail generation', async () => {
      const { getByText, getByTestId } = renderApp(
        <MarketingApp />,
        { queryClient: testContext.queryClient }
      );
      
      fireEvent.press(getByText('Create Content'));
      fireEvent.press(getByTestId('add-media-button'));
      fireEvent.press(getByTestId('media-type-video'));
      
      // Select video
      const mockVideo = { uri: 'file:///video.mp4', duration: 30, size: 5242880 };
      fireEvent(getByTestId('video-picker'), 'onVideoSelected', mockVideo);
      
      // Should generate thumbnail
      await waitFor(() => {
        expect(getByTestId('video-thumbnail')).toBeTruthy();
        expect(getByTestId('video-duration')).toHaveTextContent('0:30');
      });
      
      // Should show video preview
      fireEvent.press(getByTestId('play-video-preview'));
      
      await waitFor(() => {
        expect(getByTestId('video-player')).toBeTruthy();
      });
    });
  });
  
  describe('Content Templates', () => {
    it('should allow selection and customization of content templates', async () => {
      const { getByText, getByTestId } = renderApp(
        <MarketingApp />,
        { queryClient: testContext.queryClient }
      );
      
      fireEvent.press(getByText('Create Content'));
      fireEvent.press(getByTestId('use-template-button'));
      
      // Should show template gallery
      await waitFor(() => {
        expect(getByTestId('template-gallery')).toBeTruthy();
      });
      
      // Select product launch template
      fireEvent.press(getByTestId('template-product-launch'));
      
      await waitFor(() => {
        // Template should pre-fill fields
        expect(getByTestId('content-title-input')).toHaveTextContent('[Product Name] Launch Announcement');
        expect(getByTestId('content-body-input')).toHaveTextContent(expect.stringContaining('We are excited to announce'));
      });
      
      // Customize template
      fireEvent.changeText(
        getByTestId('content-title-input'), 
        getByTestId('content-title-input').props.value.replace('[Product Name]', 'iPhone 15')
      );
      
      // Save customized version as new template
      fireEvent.press(getByTestId('save-as-template-button'));
      fireEvent.changeText(getByTestId('template-name-input'), 'iPhone Launch Template');
      fireEvent.press(getByText('Save Template'));
      
      await waitFor(() => {
        expect(getByText('Template saved')).toBeTruthy();
      });
    });
  });
  
  describe('SEO and Metadata', () => {
    it('should validate and optimize SEO metadata', async () => {
      const { getByText, getByTestId } = renderApp(
        <MarketingApp />,
        { queryClient: testContext.queryClient }
      );
      
      fireEvent.press(getByText('Create Content'));
      fireEvent.press(getByTestId('seo-settings-button'));
      
      // Fill SEO fields
      fireEvent.changeText(getByTestId('meta-title-input'), 'Product Launch - Best Deals 2024');
      fireEvent.changeText(getByTestId('meta-description-input'), 'Discover our latest product with amazing features and exclusive launch offers.');
      fireEvent.changeText(getByTestId('meta-keywords-input'), 'product, launch, deals, 2024');
      fireEvent.changeText(getByTestId('url-slug-input'), 'product-launch-2024');
      
      // Check SEO score
      fireEvent.press(getByTestId('analyze-seo-button'));
      
      await waitFor(() => {
        expect(getByTestId('seo-score')).toBeTruthy();
        expect(getByTestId('seo-suggestions')).toBeTruthy();
      });
      
      // Should show recommendations
      expect(getByText('Meta description length: Good (156 characters)')).toBeTruthy();
      expect(getByText('Keywords density: Optimal')).toBeTruthy();
      
      // Generate AI suggestions
      fireEvent.press(getByTestId('ai-seo-suggestions'));
      
      await waitFor(() => {
        expect(getByTestId('ai-suggestions-list')).toBeTruthy();
      });
    });
  });
  
  describe('Publishing Channels', () => {
    it('should publish content to multiple channels simultaneously', async () => {
      const { getByText, getByTestId } = renderApp(
        <MarketingApp />,
        { queryClient: testContext.queryClient }
      );
      
      // Create and approve content first
      fireEvent.press(getByText('Create Content'));
      fireEvent.changeText(getByTestId('content-title-input'), 'Multi-channel Content');
      fireEvent.changeText(getByTestId('content-description-input'), 'Description');
      fireEvent.changeText(getByTestId('content-body-input'), 'Body');
      fireEvent.press(getByTestId('save-draft-button'));
      
      // Mock approval
      const content = await testContext.mockServices.contentService.listContents({ status: 'draft' });
      await testContext.mockServices.contentService.approveContent(content[0].id);
      
      // Select publishing channels
      fireEvent.press(getByTestId('publish-settings-button'));
      
      fireEvent.press(getByTestId('channel-website'));
      fireEvent.press(getByTestId('channel-mobile-app'));
      fireEvent.press(getByTestId('channel-email'));
      fireEvent.press(getByTestId('channel-social-media'));
      
      // Configure channel-specific settings
      fireEvent.press(getByTestId('configure-social-media'));
      fireEvent.press(getByTestId('platform-facebook'));
      fireEvent.press(getByTestId('platform-twitter'));
      fireEvent.press(getByTestId('platform-instagram'));
      
      // Schedule different times for different channels
      fireEvent.press(getByTestId('schedule-per-channel'));
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      fireEvent(getByTestId('website-schedule'), 'onDateChange', tomorrow);
      fireEvent(getByTestId('social-schedule'), 'onDateChange', new Date());
      
      // Publish
      fireEvent.press(getByTestId('publish-all-channels-button'));
      
      await waitFor(() => {
        expect(getByText('Publishing to 4 channels...')).toBeTruthy();
      });
      
      await waitFor(() => {
        expect(getByText('Published to all channels successfully')).toBeTruthy();
        expect(getByTestId('channel-status-website')).toHaveTextContent('Scheduled');
        expect(getByTestId('channel-status-social-media')).toHaveTextContent('Published');
      }, { timeout: 5000 });
    });
  });
  
  describe('Content Localization', () => {
    it('should support multi-language content creation and translation', async () => {
      const { getByText, getByTestId } = renderApp(
        <MarketingApp />,
        { queryClient: testContext.queryClient }
      );
      
      fireEvent.press(getByText('Create Content'));
      
      // Create content in primary language
      fireEvent.changeText(getByTestId('content-title-input'), 'Product Launch');
      fireEvent.changeText(getByTestId('content-description-input'), 'New product description');
      
      // Add translations
      fireEvent.press(getByTestId('add-translation-button'));
      
      // Select Spanish
      fireEvent.press(getByTestId('language-selector'));
      fireEvent.press(getByText('Spanish (ES)'));
      
      // Auto-translate
      fireEvent.press(getByTestId('auto-translate-button'));
      
      await waitFor(() => {
        expect(getByTestId('translation-es-title')).toHaveTextContent('Lanzamiento de Producto');
        expect(getByTestId('translation-es-description')).toHaveTextContent('Nueva descripción del producto');
      });
      
      // Manual edit translation
      fireEvent.changeText(getByTestId('translation-es-title'), 'Lanzamiento del Producto Nuevo');
      
      // Add French translation
      fireEvent.press(getByTestId('add-another-translation'));
      fireEvent.press(getByTestId('language-selector'));
      fireEvent.press(getByText('French (FR)'));
      
      fireEvent.changeText(getByTestId('translation-fr-title'), 'Lancement de Produit');
      fireEvent.changeText(getByTestId('translation-fr-description'), 'Description du nouveau produit');
      
      // Save all translations
      fireEvent.press(getByTestId('save-all-translations'));
      
      await waitFor(() => {
        expect(getByText('Content saved in 3 languages')).toBeTruthy();
      });
      
      // Switch preview language
      fireEvent.press(getByTestId('preview-language-selector'));
      fireEvent.press(getByText('Spanish'));
      
      expect(getByTestId('preview-title')).toHaveTextContent('Lanzamiento del Producto Nuevo');
    });
  });
  
  describe('Content Performance Tracking', () => {
    it('should track and display content performance metrics after publishing', async () => {
      const { getByText, getByTestId } = renderApp(
        <MarketingApp />,
        { queryClient: testContext.queryClient }
      );
      
      // Create and publish content
      fireEvent.press(getByText('Create Content'));
      fireEvent.changeText(getByTestId('content-title-input'), 'Performance Test Content');
      fireEvent.changeText(getByTestId('content-description-input'), 'Description');
      fireEvent.changeText(getByTestId('content-body-input'), 'Body');
      fireEvent.press(getByTestId('save-draft-button'));
      
      // Mock approval and publish
      const content = await testContext.mockServices.contentService.listContents({ status: 'draft' });
      await testContext.mockServices.contentService.approveContent(content[0].id);
      await testContext.mockServices.contentService.publishContent(content[0].id);
      
      // Simulate some metrics
      await testContext.mockServices.analyticsService.trackEvent('content_view', { contentId: content[0].id });
      await testContext.mockServices.analyticsService.trackEvent('content_view', { contentId: content[0].id });
      await testContext.mockServices.analyticsService.trackEvent('content_engagement', { contentId: content[0].id, action: 'like' });
      
      // View performance dashboard
      fireEvent.press(getByText('My Content'));
      fireEvent.press(getByTestId('content-item-0'));
      fireEvent.press(getByTestId('view-performance-button'));
      
      await waitFor(() => {
        expect(getByTestId('performance-dashboard')).toBeTruthy();
      });
      
      // Check metrics
      expect(getByTestId('metric-views')).toHaveTextContent('2');
      expect(getByTestId('metric-engagement-rate')).toHaveTextContent('50%');
      expect(getByTestId('performance-chart')).toBeTruthy();
      
      // Export performance report
      fireEvent.press(getByTestId('export-performance-button'));
      fireEvent.press(getByText('PDF Report'));
      
      await waitFor(() => {
        expect(getByText('Performance report exported')).toBeTruthy();
      });
    });
  });
  
  describe('Error Handling and Recovery', () => {
    it('should handle network failures during content submission', async () => {
      const { getByText, getByTestId } = renderApp(
        <MarketingApp />,
        { queryClient: testContext.queryClient }
      );
      
      fireEvent.press(getByText('Create Content'));
      fireEvent.changeText(getByTestId('content-title-input'), 'Network Test');
      fireEvent.changeText(getByTestId('content-description-input'), 'Description');
      fireEvent.changeText(getByTestId('content-body-input'), 'Body');
      
      // Mock network failure
      jest.spyOn(testContext.mockServices.contentService, 'createDraft')
        .mockRejectedValueOnce(new Error('Network error'));
      
      fireEvent.press(getByTestId('save-draft-button'));
      
      await waitFor(() => {
        expect(getByTestId('error-message')).toHaveTextContent('Failed to save content. Please try again.');
        expect(getByTestId('retry-button')).toBeTruthy();
      });
      
      // Content should be saved locally
      expect(getByTestId('local-save-indicator')).toHaveTextContent('Saved locally');
      
      // Retry should work
      jest.spyOn(testContext.mockServices.contentService, 'createDraft')
        .mockRestore();
      
      fireEvent.press(getByTestId('retry-button'));
      
      await waitFor(() => {
        expect(getByText('Content saved as draft')).toBeTruthy();
        expect(queryByTestId('local-save-indicator')).toBeFalsy();
      });
    });
    
    it('should recover from browser crash with auto-saved content', async () => {
      const { getByText, getByTestId } = renderApp(
        <MarketingApp />,
        { queryClient: testContext.queryClient }
      );
      
      // Start creating content
      fireEvent.press(getByText('Create Content'));
      fireEvent.changeText(getByTestId('content-title-input'), 'Crash Recovery Test');
      fireEvent.changeText(getByTestId('content-description-input'), 'This should be recovered');
      
      // Simulate crash by unmounting and remounting
      const contentData = {
        title: 'Crash Recovery Test',
        description: 'This should be recovered'
      };
      
      // Store in mock local storage
      await AsyncStorage.setItem('unsaved_content', JSON.stringify(contentData));
      
      // Remount app
      const { getByText: getByText2, getByTestId: getByTestId2 } = renderApp(
        <MarketingApp />,
        { queryClient: testContext.queryClient }
      );
      
      // Should show recovery dialog
      await waitFor(() => {
        expect(getByTestId2('recovery-dialog')).toBeTruthy();
        expect(getByText2('Recover unsaved content?')).toBeTruthy();
      });
      
      // Recover content
      fireEvent.press(getByText2('Recover'));
      
      await waitFor(() => {
        expect(getByTestId2('content-title-input')).toHaveTextContent('Crash Recovery Test');
        expect(getByTestId2('content-description-input')).toHaveTextContent('This should be recovered');
      });
    });
  });
});