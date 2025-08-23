// Phase 4.3: Insight Generation Hook Implementation (GREEN Phase)
// Following established React Query patterns

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BusinessIntelligenceService } from '../../services/executive/businessIntelligenceService';
import { useUserRole } from '../role-based/useUserRole';
import { executiveAnalyticsKeys } from '../../utils/queryKeyFactory';
import { ValidationMonitor } from '../../utils/validationMonitor';

interface UseInsightGenerationOptions {
  dataSource?: string[];
  analysisType?: 'correlation' | 'trend' | 'anomaly';
  includeStatisticalValidation?: boolean;
  batchGeneration?: boolean;
  insightTypes?: string[];
}

export function useInsightGeneration(options: UseInsightGenerationOptions = {}) {
  const { role, hasPermission } = useUserRole();
  const queryClient = useQueryClient();
  const [generatedInsight, setGeneratedInsight] = useState<any>(null);
  const [batchResults, setBatchResults] = useState<any[]>([]);
  const [batchProgress, setBatchProgress] = useState(0);
  const [generationError, setGenerationError] = useState<Error | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Single insight generation
  const generateInsightMutation = useMutation({
    mutationFn: async () => {
      setIsGenerating(true);
      setGenerationError(null);
      
      const result = await BusinessIntelligenceService.generateInsights({
        data_sources: options.dataSource,
        insight_type: options.analysisType,
        include_statistical_validation: options.includeStatisticalValidation
      });

      if (result.insights && result.insights.length > 0) {
        const insight = result.insights[0];
        setGeneratedInsight(insight);
        return insight;
      }

      throw new Error('No insights generated');
    },
    onSuccess: (result) => {
      setIsGenerating(false);
      ValidationMonitor.recordPatternSuccess({
        pattern: 'insight_generation_single',
        context: 'useInsightGeneration.generateInsightMutation',
        description: `Successfully generated ${options.analysisType || 'general'} insight`
      });
      queryClient.invalidateQueries({ 
        queryKey: executiveAnalyticsKeys.businessInsights(role) 
      });
    },
    onError: (error: Error) => {
      setIsGenerating(false);
      setGenerationError(error);
      ValidationMonitor.recordValidationError({
        context: 'useInsightGeneration.generateInsightMutation',
        errorCode: 'INSIGHT_GENERATION_FAILED',
        validationPattern: 'insight_generation_mutation',
        errorMessage: error.message
      });
    }
  });

  // Batch insight generation
  const generateBatchMutation = useMutation({
    mutationFn: async () => {
      setBatchProgress(0);
      setBatchResults([]);
      
      const types = options.insightTypes || ['trend', 'anomaly', 'correlation'];
      const results = [];
      
      for (let i = 0; i < types.length; i++) {
        const result = await BusinessIntelligenceService.generateInsights({
          insight_type: types[i] as any
        });
        
        if (result.insights && result.insights.length > 0) {
          results.push({
            id: `batch-${i + 1}`,
            insightType: types[i]
          });
        }
        
        setBatchProgress(((i + 1) / types.length) * 100);
      }
      
      setBatchResults(results);
      return results;
    },
    onSuccess: (results) => {
      ValidationMonitor.recordPatternSuccess({
        pattern: 'insight_generation_batch',
        context: 'useInsightGeneration.generateBatchMutation',
        description: `Successfully generated ${results.length} batch insights`
      });
      queryClient.invalidateQueries({ 
        queryKey: executiveAnalyticsKeys.businessInsights(role) 
      });
    },
    onError: (error: Error) => {
      ValidationMonitor.recordValidationError({
        context: 'useInsightGeneration.generateBatchMutation',
        errorCode: 'BATCH_INSIGHT_GENERATION_FAILED',
        validationPattern: 'insight_generation_mutation',
        errorMessage: error.message
      });
    }
  });

  return {
    generateInsight: generateInsightMutation.mutateAsync,
    generateBatch: generateBatchMutation.mutateAsync,
    generatedInsight,
    batchResults,
    batchProgress,
    isGenerating,
    generationError,
    canRetry: !!generationError
  };
}