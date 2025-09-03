export type WorkflowState = 'draft' | 'review' | 'approved' | 'published';

export interface ProductContent {
  title: string;
  description: string;
  keywords: string[];
  images: string[];
}

export interface ContentPermissions {
  canEdit: boolean;
  canApprove: boolean;
  canPublish: boolean;
}

export interface Campaign {
  id: string;
  name: string;
  status: 'planned' | 'active' | 'paused' | 'completed';
  startDate: Date;
  endDate: Date;
  budget: number;
  channels: string[];
}

export interface Bundle {
  id: string;
  name: string;
  products: string[];
  price: number;
  discount: number;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  image?: string;
  quantity?: number;
  maxQuantity?: number;
}

export interface ProductBundle {
  id: string;
  products: Product[];
  pricing: {
    basePrice: number;
    discountPercentage: number;
  };
}

export interface WorkflowTransition {
  from: WorkflowState;
  to: WorkflowState;
  label: string;
}

export interface WorkflowHistory {
  from: WorkflowState;
  to: WorkflowState;
  user: string;
  timestamp: Date;
}
