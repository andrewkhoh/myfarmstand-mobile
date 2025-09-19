// Error boundary components for inventory workflow
export { InventoryErrorBoundary } from './InventoryErrorBoundary';
export { StockOperationErrorBoundary } from './StockOperationErrorBoundary';
export { InventoryWorkflowErrorBoundary } from './InventoryWorkflowErrorBoundary';

// Re-export types for convenience
export type { WorkflowError } from '../../services/cross-workflow/errorCoordinator';