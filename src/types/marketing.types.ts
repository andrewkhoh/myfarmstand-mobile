export interface Campaign {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
  startDate: Date;
  endDate?: Date;
  budget?: number;
  metrics?: CampaignMetrics;
  createdAt: Date;
  updatedAt: Date;
}

export interface CampaignMetrics {
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  conversionRate: number;
  spend: number;
  roi: number;
}

export interface Content {
  id: string;
  title: string;
  type: 'blog' | 'video' | 'social' | 'email' | 'landing';
  status: 'draft' | 'review' | 'approved' | 'published';
  body: string;
  metadata?: ContentMetadata;
  campaignId?: string;
  authorId: string;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContentMetadata {
  tags: string[];
  category: string;
  seoTitle?: string;
  seoDescription?: string;
  keywords?: string[];
  targetAudience?: string[];
}

export interface MarketingAnalytics {
  totalCampaigns: number;
  activeCampaigns: number;
  totalContent: number;
  publishedContent: number;
  overallMetrics: {
    impressions: number;
    clicks: number;
    conversions: number;
    spend: number;
    roi: number;
  };
  performance: PerformanceData[];
}

export interface PerformanceData {
  date: string;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
}

export interface ContentWorkflow {
  id: string;
  contentId: string;
  steps: WorkflowStep[];
  currentStep: number;
  status: 'in_progress' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: 'create' | 'review' | 'approve' | 'publish';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  assigneeId?: string;
  comments?: string;
  completedAt?: Date;
}

export interface ProductContent {
  id: string;
  type: string;
  target?: string;
  payload?: Record<string, any>;
  title?: string;
  description?: string;
  data?: any;
  timestamp?: number;
}

export interface MarketingStore {
  campaigns: Campaign[];
  content: Content[];
  analytics: MarketingAnalytics | null;
  workflows: ContentWorkflow[];
  loading: boolean;
  error: string | null;
  
  actions: {
    loadCampaigns: () => Promise<void>;
    createCampaign: (campaign: Omit<Campaign, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Campaign>;
    updateCampaign: (id: string, updates: Partial<Campaign>) => Promise<void>;
    deleteCampaign: (id: string) => Promise<void>;
    
    loadContent: () => Promise<void>;
    createContent: (content: Omit<Content, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Content>;
    updateContent: (id: string, updates: Partial<Content>) => Promise<void>;
    deleteContent: (id: string) => Promise<void>;
    
    loadAnalytics: () => Promise<void>;
    refreshAnalytics: () => Promise<void>;
    
    startWorkflow: (contentId: string) => Promise<ContentWorkflow>;
    updateWorkflowStep: (workflowId: string, stepId: string, updates: Partial<WorkflowStep>) => Promise<void>;
    completeWorkflow: (workflowId: string) => Promise<void>;
  };
}
