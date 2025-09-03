import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Campaign, Content, MarketingAnalytics, ContentWorkflow, WorkflowStep, MarketingStore } from '../types/marketing.types';
import { marketingService } from '../services/marketing/marketingService';

export const useMarketingStore = create<MarketingStore>()(
  devtools(
    (set, get) => ({
      campaigns: [],
      content: [],
      analytics: null,
      workflows: [],
      loading: false,
      error: null,

      actions: {
        loadCampaigns: async () => {
          set({ loading: true, error: null });
          try {
            const campaigns = await marketingService.getCampaigns();
            set({ campaigns, loading: false });
          } catch (error) {
            set({ error: (error as Error).message, loading: false });
          }
        },

        createCampaign: async (campaignData) => {
          set({ loading: true, error: null });
          try {
            const campaign = await marketingService.createCampaign(campaignData);
            set((state) => ({
              campaigns: [...state.campaigns, campaign],
              loading: false
            }));
            return campaign;
          } catch (error) {
            set({ error: (error as Error).message, loading: false });
            throw error;
          }
        },

        updateCampaign: async (id, updates) => {
          set({ loading: true, error: null });
          try {
            await marketingService.updateCampaign(id, updates);
            set((state) => ({
              campaigns: state.campaigns.map((c) =>
                c.id === id ? { ...c, ...updates, updatedAt: new Date() } : c
              ),
              loading: false
            }));
          } catch (error) {
            set({ error: (error as Error).message, loading: false });
          }
        },

        deleteCampaign: async (id) => {
          set({ loading: true, error: null });
          try {
            await marketingService.deleteCampaign(id);
            set((state) => ({
              campaigns: state.campaigns.filter((c) => c.id !== id),
              loading: false
            }));
          } catch (error) {
            set({ error: (error as Error).message, loading: false });
          }
        },

        loadContent: async () => {
          set({ loading: true, error: null });
          try {
            const content = await marketingService.getContent();
            set({ content, loading: false });
          } catch (error) {
            set({ error: (error as Error).message, loading: false });
          }
        },

        createContent: async (contentData) => {
          set({ loading: true, error: null });
          try {
            const content = await marketingService.createContent(contentData);
            set((state) => ({
              content: [...state.content, content],
              loading: false
            }));
            return content;
          } catch (error) {
            set({ error: (error as Error).message, loading: false });
            throw error;
          }
        },

        updateContent: async (id, updates) => {
          set({ loading: true, error: null });
          try {
            await marketingService.updateContent(id, updates);
            set((state) => ({
              content: state.content.map((c) =>
                c.id === id ? { ...c, ...updates, updatedAt: new Date() } : c
              ),
              loading: false
            }));
          } catch (error) {
            set({ error: (error as Error).message, loading: false });
          }
        },

        deleteContent: async (id) => {
          set({ loading: true, error: null });
          try {
            await marketingService.deleteContent(id);
            set((state) => ({
              content: state.content.filter((c) => c.id !== id),
              loading: false
            }));
          } catch (error) {
            set({ error: (error as Error).message, loading: false });
          }
        },

        loadAnalytics: async () => {
          set({ loading: true, error: null });
          try {
            const analytics = await marketingService.getAnalytics();
            set({ analytics, loading: false });
          } catch (error) {
            set({ error: (error as Error).message, loading: false });
          }
        },

        refreshAnalytics: async () => {
          const { actions } = get();
          await actions.loadAnalytics();
        },

        startWorkflow: async (contentId) => {
          set({ loading: true, error: null });
          try {
            const workflow = await marketingService.startWorkflow(contentId);
            set((state) => ({
              workflows: [...state.workflows, workflow],
              loading: false
            }));
            return workflow;
          } catch (error) {
            set({ error: (error as Error).message, loading: false });
            throw error;
          }
        },

        updateWorkflowStep: async (workflowId, stepId, updates) => {
          set({ loading: true, error: null });
          try {
            await marketingService.updateWorkflowStep(workflowId, stepId, updates);
            set((state) => ({
              workflows: state.workflows.map((w) =>
                w.id === workflowId
                  ? {
                      ...w,
                      steps: w.steps.map((s) =>
                        s.id === stepId ? { ...s, ...updates } : s
                      )
                    }
                  : w
              ),
              loading: false
            }));
          } catch (error) {
            set({ error: (error as Error).message, loading: false });
          }
        },

        completeWorkflow: async (workflowId) => {
          set({ loading: true, error: null });
          try {
            await marketingService.completeWorkflow(workflowId);
            set((state) => ({
              workflows: state.workflows.map((w) =>
                w.id === workflowId
                  ? { ...w, status: 'completed' as const, completedAt: new Date() }
                  : w
              ),
              loading: false
            }));
          } catch (error) {
            set({ error: (error as Error).message, loading: false });
          }
        }
      }
    }),
    {
      name: 'marketing-store'
    }
  )
);
