import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

interface Campaign {
  id: string;
  name: string;
  status: 'active' | 'draft' | 'paused';
  budget: number;
}

interface Content {
  id: string;
  title: string;
  description?: string;
  stage: 'draft' | 'review' | 'approved' | 'published';
  type: 'blog' | 'video' | 'social';
  deadline?: string;
}

interface Analytics {
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
}

interface MarketingState {
  campaigns: Campaign[];
  content: Content[];
  analytics: Analytics;
  workflows: {
    draft: number;
    review: number;
    approved: number;
    published: number;
  };
  performanceData: Array<{
    date: string;
    impressions: number;
    clicks: number;
  }>;
  loading: boolean;
  error: string | null;
}

const initialState: MarketingState = {
  campaigns: [],
  content: [],
  analytics: {
    impressions: 0,
    clicks: 0,
    conversions: 0,
    revenue: 0
  },
  workflows: {
    draft: 0,
    review: 0,
    approved: 0,
    published: 0
  },
  performanceData: [],
  loading: false,
  error: null
};

export const fetchAnalytics = createAsyncThunk(
  'marketing/fetchAnalytics',
  async () => {
    // Simulate API call
    return new Promise<Analytics>((resolve) => {
      setTimeout(() => {
        resolve({
          impressions: 10000,
          clicks: 500,
          conversions: 50,
          revenue: 5000
        });
      }, 1000);
    });
  }
);

const marketingSlice = createSlice({
  name: 'marketing',
  initialState,
  reducers: {
    setCampaigns: (state, action: PayloadAction<Campaign[]>) => {
      state.campaigns = action.payload;
    },
    setContent: (state, action: PayloadAction<Content[]>) => {
      state.content = action.payload;
      // Update workflow counts
      state.workflows = {
        draft: state.content.filter(c => c.stage === 'draft').length,
        review: state.content.filter(c => c.stage === 'review').length,
        approved: state.content.filter(c => c.stage === 'approved').length,
        published: state.content.filter(c => c.stage === 'published').length
      };
    },
    updateContentStage: (state, action: PayloadAction<{ id: string; stage: Content['stage'] }>) => {
      const content = state.content.find(c => c.id === action.payload.id);
      if (content) {
        content.stage = action.payload.stage;
        // Update workflow counts
        state.workflows = {
          draft: state.content.filter(c => c.stage === 'draft').length,
          review: state.content.filter(c => c.stage === 'review').length,
          approved: state.content.filter(c => c.stage === 'approved').length,
          published: state.content.filter(c => c.stage === 'published').length
        };
      }
    },
    bulkUpdateContentStage: (state, action: PayloadAction<{ ids: string[]; stage: Content['stage'] }>) => {
      action.payload.ids.forEach(id => {
        const content = state.content.find(c => c.id === id);
        if (content) {
          content.stage = action.payload.stage;
        }
      });
      // Update workflow counts
      state.workflows = {
        draft: state.content.filter(c => c.stage === 'draft').length,
        review: state.content.filter(c => c.stage === 'review').length,
        approved: state.content.filter(c => c.stage === 'approved').length,
        published: state.content.filter(c => c.stage === 'published').length
      };
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAnalytics.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAnalytics.fulfilled, (state, action) => {
        state.loading = false;
        state.analytics = action.payload;
      })
      .addCase(fetchAnalytics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch analytics';
      });
  }
});

export const {
  setCampaigns,
  setContent,
  updateContentStage,
  bulkUpdateContentStage,
  setError,
  setLoading
} = marketingSlice.actions;

export default marketingSlice.reducer;