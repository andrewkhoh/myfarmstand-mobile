import { render, fireEvent, screen } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, jest, afterEach } from '@jest/globals';
import {
  setupIntegrationTest,
  cleanupIntegrationTest,
  renderApp,
  createMockWorkflowData,
  validateWorkflowState,
  TestContext,
} from '@/test/integration-utils';
import ProductContentScreen from '@/screens/marketing/ProductContentScreen';

describe('Content Publishing Workflow', () => {
  let testContext: TestContext;
  let mockData: ReturnType<typeof createMockWorkflowData>;

  beforeEach(async () => {
    testContext = await setupIntegrationTest();
    mockData = createMockWorkflowData();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await cleanupIntegrationTest(testContext);
  });

  describe('Happy Path - Complete Publishing Workflow', () => {
    it('should create, review, approve, and publish content end-to-end', async () => {
      // Step 1: Navigate to content creation
      const { getByText, getByTestId, queryByText } = renderApp(
        <ProductContentScreen />,
        { queryClient: testContext.queryClient }
      );

      // Verify initial state
      expect(getByText('Create Content')).toBeTruthy();
      expect(queryByText('Draft saved')).toBeFalsy();

      // Step 2: Fill content form
      fireEvent.press(getByText('Create Content'));
      
      const titleInput = getByTestId('content-title-input');
      const descriptionInput = getByTestId('content-description-input');
      const categorySelect = getByTestId('content-category-select');
      
      fireEvent.changeText(titleInput, 'Summer Collection 2024');
      fireEvent.changeText(descriptionInput, 'Exclusive summer products with special discounts');
      fireEvent.press(categorySelect);
      fireEvent.press(getByText('Fashion'));

      // Add tags
      const tagInput = getByTestId('content-tags-input');
      fireEvent.changeText(tagInput, 'summer, sale, exclusive');
      fireEvent.press(getByText('Add Tags'));

      // Step 3: Upload images
      fireEvent.press(getByText('Add Images'));
      
      // Simulate image picker
      const imagePicker = getByTestId('image-picker');
      fireEvent.press(imagePicker);
      
      // Mock image selection
      await waitFor(() => {
        expect(getByTestId('image-preview-0')).toBeTruthy();
      });

      // Add multiple images
      fireEvent.press(getByText('Add More Images'));
      fireEvent.press(imagePicker);
      
      await waitFor(() => {
        expect(getByTestId('image-preview-1')).toBeTruthy();
      });

      // Set featured image
      fireEvent.press(getByTestId('set-featured-image-0'));
      expect(getByTestId('featured-badge-0')).toBeTruthy();

      // Step 4: Save as draft
      fireEvent.press(getByText('Save Draft'));
      
      await waitFor(() => {
        expect(getByText('Draft saved successfully')).toBeTruthy();
        expect(testContext.mockServices.contentService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Summer Collection 2024',
            description: 'Exclusive summer products with special discounts',
            category: 'Fashion',
            tags: ['summer', 'sale', 'exclusive'],
            status: 'draft',
          })
        );
      });

      // Verify draft state
      expect(getByText('Status: Draft')).toBeTruthy();
      expect(getByTestId('content-id')).toBeTruthy();

      // Step 5: Preview content
      fireEvent.press(getByText('Preview'));
      
      await waitFor(() => {
        expect(getByTestId('preview-modal')).toBeTruthy();
        expect(getByText('Summer Collection 2024')).toBeTruthy();
      });
      
      fireEvent.press(getByText('Close Preview'));

      // Step 6: Submit for review
      fireEvent.press(getByText('Submit for Review'));
      
      // Add review notes
      const reviewNotesInput = getByTestId('review-notes-input');
      fireEvent.changeText(reviewNotesInput, 'Ready for summer campaign launch');
      
      fireEvent.press(getByText('Confirm Submission'));
      
      await waitFor(() => {
        expect(getByText('Status: In Review')).toBeTruthy();
        expect(testContext.mockServices.contentService.submitForReview).toHaveBeenCalled();
        expect(getByText('Submitted for review successfully')).toBeTruthy();
      });

      // Step 7: Reviewer actions (simulate reviewer role)
      // Switch to reviewer view
      fireEvent.press(getByText('Switch to Reviewer'));
      
      expect(getByText('Content Review Queue')).toBeTruthy();
      expect(getByText('Summer Collection 2024')).toBeTruthy();
      
      fireEvent.press(getByText('Review'));
      
      // Review checklist
      fireEvent.press(getByTestId('check-content-quality'));
      fireEvent.press(getByTestId('check-images-appropriate'));
      fireEvent.press(getByTestId('check-metadata-complete'));
      fireEvent.press(getByTestId('check-seo-optimized'));
      
      // Add review comment
      const reviewCommentInput = getByTestId('review-comment-input');
      fireEvent.changeText(reviewCommentInput, 'Content looks great, approved for publishing');
      
      // Step 8: Approve content
      fireEvent.press(getByText('Approve Content'));
      
      await waitFor(() => {
        expect(getByText('Status: Approved')).toBeTruthy();
        expect(testContext.mockServices.contentService.approve).toHaveBeenCalled();
        expect(getByText('Content approved successfully')).toBeTruthy();
      });

      // Step 9: Schedule publishing
      fireEvent.press(getByText('Schedule Publishing'));
      
      const publishDatePicker = getByTestId('publish-date-picker');
      const publishTimePicker = getByTestId('publish-time-picker');
      
      // Set future date
      fireEvent.press(publishDatePicker);
      fireEvent.press(getByText('Tomorrow'));
      
      fireEvent.press(publishTimePicker);
      fireEvent.press(getByText('10:00 AM'));
      
      fireEvent.press(getByText('Confirm Schedule'));
      
      expect(getByText('Scheduled for publishing')).toBeTruthy();

      // Step 10: Immediate publish (override schedule)
      fireEvent.press(getByText('Publish Now'));
      
      // Confirm dialog
      expect(getByText('Are you sure you want to publish now?')).toBeTruthy();
      fireEvent.press(getByText('Yes, Publish'));
      
      await waitFor(() => {
        expect(getByText('Status: Published')).toBeTruthy();
        expect(testContext.mockServices.contentService.publish).toHaveBeenCalled();
        expect(getByText('Content published successfully')).toBeTruthy();
      });

      // Step 11: Verify in public view
      fireEvent.press(getByText('View Published Content'));
      
      await waitFor(() => {
        expect(getByTestId('public-content-view')).toBeTruthy();
        expect(getByText('Summer Collection 2024')).toBeTruthy();
        expect(getByText('Exclusive summer products with special discounts')).toBeTruthy();
        expect(getByTestId('published-badge')).toBeTruthy();
      });

      // Step 12: Verify analytics tracking
      expect(testContext.mockServices.analyticsService.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'content_published',
          contentId: expect.any(String),
          title: 'Summer Collection 2024',
        })
      );
    });

    it('should handle auto-save during content creation', async () => {
      const { getByTestId, getByText } = renderApp(
        <ProductContentScreen />,
        { queryClient: testContext.queryClient }
      );

      fireEvent.press(getByText('Create Content'));
      
      const titleInput = getByTestId('content-title-input');
      fireEvent.changeText(titleInput, 'Auto-save Test Content');

      // Wait for auto-save (typically after 3 seconds of inactivity)
      await waitFor(() => {
        expect(getByText('Auto-saving...')).toBeTruthy();
      }, { timeout: 4000 });

      await waitFor(() => {
        expect(getByText('Auto-saved')).toBeTruthy();
        expect(testContext.mockServices.contentService.update).toHaveBeenCalled();
      });
    });

    it('should validate required fields before submission', async () => {
      const { getByText, getByTestId } = renderApp(
        <ProductContentScreen />,
        { queryClient: testContext.queryClient }
      );

      fireEvent.press(getByText('Create Content'));
      
      // Try to submit without required fields
      fireEvent.press(getByText('Submit for Review'));
      
      // Should show validation errors
      expect(getByText('Title is required')).toBeTruthy();
      expect(getByText('Description is required')).toBeTruthy();
      expect(getByText('At least one image is required')).toBeTruthy();
      expect(getByText('Category must be selected')).toBeTruthy();
      
      // Submission should not proceed
      expect(testContext.mockServices.contentService.submitForReview).not.toHaveBeenCalled();
    });
  });

  describe('Review Rejection and Revision Flow', () => {
    it('should handle content rejection with feedback and allow revision', async () => {
      const { getByText, getByTestId } = renderApp(
        <ProductContentScreen />,
        { queryClient: testContext.queryClient }
      );

      // Create and submit content
      fireEvent.press(getByText('Create Content'));
      fireEvent.changeText(getByTestId('content-title-input'), 'Content for Rejection');
      fireEvent.changeText(getByTestId('content-description-input'), 'Initial description');
      fireEvent.press(getByText('Submit for Review'));
      
      await waitFor(() => {
        expect(getByText('Status: In Review')).toBeTruthy();
      });

      // Reviewer rejects content
      fireEvent.press(getByText('Switch to Reviewer'));
      fireEvent.press(getByText('Review'));
      
      const rejectionReasonInput = getByTestId('rejection-reason-input');
      fireEvent.changeText(rejectionReasonInput, 'Images need higher resolution. Description too brief.');
      
      fireEvent.press(getByText('Reject Content'));
      
      await waitFor(() => {
        expect(getByText('Status: Rejected')).toBeTruthy();
        expect(testContext.mockServices.contentService.reject).toHaveBeenCalled();
      });

      // Author views rejection feedback
      fireEvent.press(getByText('Switch to Author'));
      
      expect(getByText('Content Rejected')).toBeTruthy();
      expect(getByText('Images need higher resolution. Description too brief.')).toBeTruthy();

      // Revise content based on feedback
      fireEvent.press(getByText('Revise Content'));
      
      // Update description
      const descriptionInput = getByTestId('content-description-input');
      fireEvent.changeText(descriptionInput, 'Detailed description with comprehensive product information');
      
      // Replace images
      fireEvent.press(getByTestId('remove-image-0'));
      fireEvent.press(getByText('Add Images'));
      fireEvent.press(getByTestId('image-picker'));
      
      await waitFor(() => {
        expect(getByTestId('image-preview-0')).toBeTruthy();
      });

      // Resubmit for review
      fireEvent.press(getByText('Resubmit for Review'));
      
      const resubmitNotesInput = getByTestId('resubmit-notes-input');
      fireEvent.changeText(resubmitNotesInput, 'Updated images and enhanced description as requested');
      
      fireEvent.press(getByText('Confirm Resubmission'));
      
      await waitFor(() => {
        expect(getByText('Status: In Review')).toBeTruthy();
        expect(getByText('Resubmitted for review')).toBeTruthy();
      });

      // Verify revision history
      fireEvent.press(getByText('View History'));
      
      expect(getByText('Revision 2')).toBeTruthy();
      expect(getByText('Revision 1')).toBeTruthy();
      expect(getByText('Rejected: Images need higher resolution')).toBeTruthy();
    });

    it('should track rejection metrics and patterns', async () => {
      const { getByText, getByTestId } = renderApp(
        <ProductContentScreen />,
        { queryClient: testContext.queryClient }
      );

      // Simulate multiple rejections
      for (let i = 0; i < 3; i++) {
        fireEvent.press(getByText('Create Content'));
        fireEvent.changeText(getByTestId('content-title-input'), `Content ${i}`);
        fireEvent.press(getByText('Submit for Review'));
        
        await waitFor(() => {
          expect(getByText('Status: In Review')).toBeTruthy();
        });

        fireEvent.press(getByText('Switch to Reviewer'));
        fireEvent.press(getByText('Reject Content'));
        
        await waitFor(() => {
          expect(getByText('Status: Rejected')).toBeTruthy();
        });
      }

      // Check analytics
      expect(testContext.mockServices.analyticsService.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'content_rejection_pattern',
          count: 3,
        })
      );
    });
  });

  describe('Concurrent Editing and Conflict Resolution', () => {
    it('should detect and handle concurrent edits by multiple users', async () => {
      const { getByText, getByTestId } = renderApp(
        <ProductContentScreen />,
        { queryClient: testContext.queryClient }
      );

      // User 1 starts editing
      fireEvent.press(getByText('Edit Content'));
      const titleInput = getByTestId('content-title-input');
      fireEvent.changeText(titleInput, 'User 1 Edit');

      // Simulate User 2 editing same content
      testContext.mockServices.contentService.getById.mockResolvedValueOnce({
        ...mockData.content,
        title: 'User 2 Edit',
        metadata: {
          ...mockData.content.metadata,
          version: 2,
          updatedBy: 'user2',
        },
      });

      // User 1 tries to save
      fireEvent.press(getByText('Save'));
      
      await waitFor(() => {
        expect(getByText('Conflict Detected')).toBeTruthy();
        expect(getByText('This content has been modified by another user')).toBeTruthy();
      });

      // Show conflict resolution options
      expect(getByText('Your Version: User 1 Edit')).toBeTruthy();
      expect(getByText('Their Version: User 2 Edit')).toBeTruthy();
      
      // Options
      expect(getByText('Keep Your Changes')).toBeTruthy();
      expect(getByText('Keep Their Changes')).toBeTruthy();
      expect(getByText('Merge Changes')).toBeTruthy();

      // Choose merge
      fireEvent.press(getByText('Merge Changes'));
      
      // Merge editor
      expect(getByTestId('merge-editor')).toBeTruthy();
      fireEvent.changeText(getByTestId('merged-title-input'), 'Merged Edit - Combined');
      
      fireEvent.press(getByText('Save Merged Version'));
      
      await waitFor(() => {
        expect(getByText('Changes merged successfully')).toBeTruthy();
        expect(testContext.mockServices.contentService.update).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Merged Edit - Combined',
            metadata: expect.objectContaining({
              version: 3,
              mergedFrom: ['user1', 'user2'],
            }),
          })
        );
      });
    });

    it('should implement optimistic locking for content edits', async () => {
      const { getByText, getByTestId } = renderApp(
        <ProductContentScreen />,
        { queryClient: testContext.queryClient }
      );

      // Load content with version
      fireEvent.press(getByText('Edit Content'));
      
      await waitFor(() => {
        expect(getByTestId('version-indicator')).toBeTruthy();
        expect(getByText('Version: 1')).toBeTruthy();
      });

      // Edit content
      fireEvent.changeText(getByTestId('content-title-input'), 'Updated Title');
      
      // Mock version conflict
      testContext.mockServices.contentService.update.mockRejectedValueOnce({
        error: 'VERSION_CONFLICT',
        currentVersion: 2,
      });

      fireEvent.press(getByText('Save'));
      
      await waitFor(() => {
        expect(getByText('Version Conflict')).toBeTruthy();
        expect(getByText('Content has been updated by another user')).toBeTruthy();
        expect(getByText('Reload and Try Again')).toBeTruthy();
      });

      // Reload latest version
      fireEvent.press(getByText('Reload and Try Again'));
      
      await waitFor(() => {
        expect(getByText('Version: 2')).toBeTruthy();
        expect(testContext.mockServices.contentService.getById).toHaveBeenCalled();
      });
    });

    it('should show real-time collaboration indicators', async () => {
      const { getByText, getByTestId } = renderApp(
        <ProductContentScreen />,
        { queryClient: testContext.queryClient }
      );

      fireEvent.press(getByText('Edit Content'));
      
      // Simulate other users joining
      await waitFor(() => {
        expect(getByTestId('collaboration-indicator')).toBeTruthy();
        expect(getByText('2 users editing')).toBeTruthy();
      });

      // Show user avatars
      expect(getByTestId('user-avatar-user2')).toBeTruthy();
      expect(getByTestId('user-avatar-user3')).toBeTruthy();

      // Show field-level locks
      fireEvent.focus(getByTestId('content-title-input'));
      expect(getByText('You are editing title')).toBeTruthy();
      
      // Simulate another user editing description
      expect(getByTestId('field-lock-description')).toBeTruthy();
      expect(getByText('User2 is editing description')).toBeTruthy();
    });
  });

  describe('Media Management in Publishing Workflow', () => {
    it('should handle image upload with optimization and CDN integration', async () => {
      const { getByText, getByTestId } = renderApp(
        <ProductContentScreen />,
        { queryClient: testContext.queryClient }
      );

      fireEvent.press(getByText('Add Images'));
      fireEvent.press(getByTestId('image-picker'));
      
      // Show upload progress
      await waitFor(() => {
        expect(getByTestId('upload-progress')).toBeTruthy();
        expect(getByText('Uploading... 0%')).toBeTruthy();
      });

      // Progress updates
      await waitFor(() => {
        expect(getByText('Uploading... 50%')).toBeTruthy();
      });

      await waitFor(() => {
        expect(getByText('Processing image...')).toBeTruthy();
      });

      // Optimization complete
      await waitFor(() => {
        expect(getByText('Upload complete')).toBeTruthy();
        expect(getByTestId('image-preview-0')).toBeTruthy();
        expect(getByTestId('image-size-0')).toBeTruthy();
        expect(getByText('Optimized: 2.1MB → 450KB')).toBeTruthy();
      });

      // Verify CDN URL
      expect(testContext.mockServices.contentService.uploadImage).toHaveBeenCalledWith(
        expect.objectContaining({
          optimize: true,
          generateThumbnails: true,
          cdnUpload: true,
        })
      );
    });

    it('should support bulk image operations', async () => {
      const { getByText, getByTestId } = renderApp(
        <ProductContentScreen />,
        { queryClient: testContext.queryClient }
      );

      // Select multiple images
      fireEvent.press(getByText('Add Images'));
      fireEvent.press(getByTestId('bulk-select'));
      
      // Select 5 images
      for (let i = 0; i < 5; i++) {
        fireEvent.press(getByTestId(`image-select-${i}`));
      }
      
      fireEvent.press(getByText('Upload Selected (5)'));
      
      // Show bulk upload progress
      await waitFor(() => {
        expect(getByText('Uploading 5 images...')).toBeTruthy();
        expect(getByTestId('bulk-progress-bar')).toBeTruthy();
      });

      // Individual progress indicators
      for (let i = 0; i < 5; i++) {
        expect(getByTestId(`upload-status-${i}`)).toBeTruthy();
      }

      await waitFor(() => {
        expect(getByText('All images uploaded successfully')).toBeTruthy();
      });

      // Bulk operations on uploaded images
      fireEvent.press(getByText('Select All'));
      fireEvent.press(getByText('Bulk Actions'));
      
      expect(getByText('Resize All')).toBeTruthy();
      expect(getByText('Add Watermark')).toBeTruthy();
      expect(getByText('Set Alt Text')).toBeTruthy();
      expect(getByText('Delete Selected')).toBeTruthy();
    });

    it('should handle video content with transcoding', async () => {
      const { getByText, getByTestId } = renderApp(
        <ProductContentScreen />,
        { queryClient: testContext.queryClient }
      );

      fireEvent.press(getByText('Add Video'));
      fireEvent.press(getByTestId('video-picker'));
      
      // Show transcoding progress
      await waitFor(() => {
        expect(getByText('Uploading video...')).toBeTruthy();
      });

      await waitFor(() => {
        expect(getByText('Transcoding video...')).toBeTruthy();
        expect(getByText('Generating preview...')).toBeTruthy();
      });

      await waitFor(() => {
        expect(getByText('Video ready')).toBeTruthy();
        expect(getByTestId('video-preview')).toBeTruthy();
        expect(getByTestId('video-duration')).toBeTruthy();
        expect(getByText('Duration: 2:45')).toBeTruthy();
      });

      // Video settings
      fireEvent.press(getByTestId('video-settings'));
      expect(getByText('Autoplay')).toBeTruthy();
      expect(getByText('Loop')).toBeTruthy();
      expect(getByText('Muted')).toBeTruthy();
      expect(getByText('Thumbnail Time')).toBeTruthy();
    });
  });

  describe('SEO and Metadata Management', () => {
    it('should optimize content for SEO during publishing', async () => {
      const { getByText, getByTestId } = renderApp(
        <ProductContentScreen />,
        { queryClient: testContext.queryClient }
      );

      fireEvent.press(getByText('Create Content'));
      fireEvent.changeText(getByTestId('content-title-input'), 'SEO Optimized Content');
      
      // SEO section
      fireEvent.press(getByText('SEO Settings'));
      
      expect(getByTestId('seo-score')).toBeTruthy();
      expect(getByText('SEO Score: 45/100')).toBeTruthy();
      
      // SEO recommendations
      expect(getByText('Add meta description')).toBeTruthy();
      expect(getByText('Include focus keywords')).toBeTruthy();
      expect(getByText('Optimize title length')).toBeTruthy();
      
      // Fill SEO fields
      fireEvent.changeText(getByTestId('meta-title-input'), 'SEO Optimized Content | Best Deals 2024');
      fireEvent.changeText(getByTestId('meta-description-input'), 'Discover our SEO optimized content with exclusive deals and offers for 2024');
      fireEvent.changeText(getByTestId('focus-keywords-input'), 'deals, offers, 2024, exclusive');
      
      // URL slug
      fireEvent.changeText(getByTestId('url-slug-input'), 'seo-optimized-content-2024');
      
      // Open Graph
      fireEvent.press(getByText('Social Media Preview'));
      fireEvent.changeText(getByTestId('og-title-input'), 'Amazing Deals for 2024');
      fireEvent.changeText(getByTestId('og-description-input'), 'Check out our exclusive offers');
      fireEvent.press(getByTestId('og-image-picker'));
      
      await waitFor(() => {
        expect(getByText('SEO Score: 92/100')).toBeTruthy();
        expect(getByText('Excellent SEO')).toBeTruthy();
      });

      // Schema markup
      fireEvent.press(getByText('Structured Data'));
      fireEvent.press(getByTestId('schema-type-select'));
      fireEvent.press(getByText('Product'));
      
      expect(getByTestId('schema-preview')).toBeTruthy();
    });

    it('should generate and validate structured data', async () => {
      const { getByText, getByTestId } = renderApp(
        <ProductContentScreen />,
        { queryClient: testContext.queryClient }
      );

      fireEvent.press(getByText('Create Content'));
      fireEvent.press(getByText('Structured Data'));
      
      // Select schema type
      fireEvent.press(getByTestId('schema-type-select'));
      fireEvent.press(getByText('Article'));
      
      // Auto-populate from content
      fireEvent.press(getByText('Auto-generate from content'));
      
      await waitFor(() => {
        expect(getByTestId('schema-json-preview')).toBeTruthy();
      });

      // Validate schema
      fireEvent.press(getByText('Validate Schema'));
      
      await waitFor(() => {
        expect(getByText('Schema Valid')).toBeTruthy();
        expect(getByText('Passes Google Rich Results Test')).toBeTruthy();
      });
    });
  });

  describe('Performance and Error Handling', () => {
    it('should complete publishing workflow within performance targets', async () => {
      const startTime = Date.now();
      
      const { getByText, getByTestId } = renderApp(
        <ProductContentScreen />,
        { queryClient: testContext.queryClient }
      );

      // Quick publish flow
      fireEvent.press(getByText('Quick Publish'));
      fireEvent.changeText(getByTestId('content-title-input'), 'Performance Test');
      fireEvent.changeText(getByTestId('content-description-input'), 'Test');
      fireEvent.press(getByText('Publish Now'));
      
      await waitFor(() => {
        expect(getByText('Status: Published')).toBeTruthy();
      });

      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within 3 seconds
      expect(duration).toBeLessThan(3000);
      
      // Verify performance metrics tracked
      expect(testContext.mockServices.analyticsService.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'publishing_performance',
          duration: expect.any(Number),
        })
      );
    });

    it('should handle network failures gracefully during publishing', async () => {
      const { getByText, getByTestId } = renderApp(
        <ProductContentScreen />,
        { queryClient: testContext.queryClient }
      );

      // Setup network failure
      testContext.mockServices.contentService.publish.mockRejectedValueOnce({
        error: 'NETWORK_ERROR',
        message: 'Connection timeout',
      });

      fireEvent.press(getByText('Create Content'));
      fireEvent.changeText(getByTestId('content-title-input'), 'Network Test');
      fireEvent.press(getByText('Publish'));
      
      await waitFor(() => {
        expect(getByText('Publishing failed')).toBeTruthy();
        expect(getByText('Connection timeout')).toBeTruthy();
      });

      // Retry options
      expect(getByText('Retry')).toBeTruthy();
      expect(getByText('Save as Draft')).toBeTruthy();
      expect(getByText('Cancel')).toBeTruthy();
      
      // Retry with success
      testContext.mockServices.contentService.publish.mockResolvedValueOnce({
        id: '1',
        status: 'published',
      });
      
      fireEvent.press(getByText('Retry'));
      
      await waitFor(() => {
        expect(getByText('Status: Published')).toBeTruthy();
        expect(getByText('Published after retry')).toBeTruthy();
      });
    });

    it('should recover from partial failures in multi-step workflow', async () => {
      const { getByText, getByTestId } = renderApp(
        <ProductContentScreen />,
        { queryClient: testContext.queryClient }
      );

      // Setup partial failure scenario
      testContext.mockServices.contentService.uploadImage.mockRejectedValueOnce({
        error: 'UPLOAD_FAILED',
      });

      fireEvent.press(getByText('Create Content'));
      fireEvent.changeText(getByTestId('content-title-input'), 'Partial Failure Test');
      
      // Upload multiple images
      fireEvent.press(getByText('Add Images'));
      fireEvent.press(getByTestId('bulk-select'));
      fireEvent.press(getByTestId('image-select-0'));
      fireEvent.press(getByTestId('image-select-1'));
      fireEvent.press(getByText('Upload Selected (2)'));
      
      await waitFor(() => {
        expect(getByText('1 of 2 uploads failed')).toBeTruthy();
      });

      // Show partial success state
      expect(getByTestId('upload-success-1')).toBeTruthy();
      expect(getByTestId('upload-failed-0')).toBeTruthy();
      
      // Retry failed upload
      fireEvent.press(getByTestId('retry-upload-0'));
      
      await waitFor(() => {
        expect(getByText('All uploads completed')).toBeTruthy();
      });
    });

    it('should implement circuit breaker for repeated failures', async () => {
      const { getByText, getByTestId } = renderApp(
        <ProductContentScreen />,
        { queryClient: testContext.queryClient }
      );

      // Simulate repeated failures
      for (let i = 0; i < 5; i++) {
        testContext.mockServices.contentService.publish.mockRejectedValueOnce({
          error: 'SERVICE_UNAVAILABLE',
        });
      }

      fireEvent.press(getByText('Create Content'));
      fireEvent.changeText(getByTestId('content-title-input'), `Circuit Test ${i}`);
      
      // Multiple publish attempts
      for (let i = 0; i < 3; i++) {
        fireEvent.press(getByText('Publish'));
        await waitFor(() => {
          expect(getByText('Publishing failed')).toBeTruthy();
        });
        fireEvent.press(getByText('Retry'));
      }

      // Circuit breaker triggered
      await waitFor(() => {
        expect(getByText('Service temporarily unavailable')).toBeTruthy();
        expect(getByText('Please try again in 5 minutes')).toBeTruthy();
      });

      // Publish button disabled
      expect(getByTestId('publish-button')).toBeDisabled();
    });
  });

  describe('Workflow State Persistence and Recovery', () => {
    it('should persist workflow state across sessions', async () => {
      const { getByText, getByTestId } = renderApp(
        <ProductContentScreen />,
        { queryClient: testContext.queryClient }
      );

      // Start creating content
      fireEvent.press(getByText('Create Content'));
      fireEvent.changeText(getByTestId('content-title-input'), 'Persistent Content');
      fireEvent.changeText(getByTestId('content-description-input'), 'Will be saved');
      
      // Simulate session end
      fireEvent.press(getByTestId('app-background'));
      
      // Verify state saved
      expect(testContext.mockServices.contentService.update).toHaveBeenCalledWith(
        expect.objectContaining({
          draft: true,
          sessionData: expect.any(Object),
        })
      );

      // Simulate new session
      const { getByText: getByText2 } = renderApp(
        <ProductContentScreen />,
        { queryClient: testContext.queryClient }
      );

      // Should restore draft
      await waitFor(() => {
        expect(getByText2('Resume editing "Persistent Content"?')).toBeTruthy();
      });

      fireEvent.press(getByText2('Resume'));
      
      expect(getByTestId('content-title-input').props.value).toBe('Persistent Content');
      expect(getByTestId('content-description-input').props.value).toBe('Will be saved');
    });

    it('should handle workflow interruption and recovery', async () => {
      const { getByText, getByTestId } = renderApp(
        <ProductContentScreen />,
        { queryClient: testContext.queryClient }
      );

      // Start multi-step workflow
      fireEvent.press(getByText('Create Content'));
      fireEvent.changeText(getByTestId('content-title-input'), 'Interrupted Content');
      fireEvent.press(getByText('Next Step'));
      
      // In middle of workflow
      fireEvent.press(getByText('Add Images'));
      
      // Simulate crash/interruption
      testContext.mockServices.contentService.create.mockRejectedValueOnce({
        error: 'CONNECTION_LOST',
      });
      
      await waitFor(() => {
        expect(getByText('Connection lost')).toBeTruthy();
      });

      // Recovery options
      expect(getByText('Save progress locally')).toBeTruthy();
      expect(getByText('Retry when connected')).toBeTruthy();
      
      fireEvent.press(getByText('Save progress locally'));
      
      // Simulate reconnection
      fireEvent.press(getByText('Retry'));
      
      await waitFor(() => {
        expect(getByText('Resuming from last checkpoint')).toBeTruthy();
        expect(getByText('Step 2 of 4')).toBeTruthy();
      });
    });
  });
});