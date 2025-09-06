# TDD Phase 3B: Marketing Screens Agent

## 1. Agent Identification
**Agent ID**: marketing-screens  
**Layer**: UI/Presentation Layer
**Phase**: TDD Phase 3B - Combined RED/GREEN/REFACTOR
**Target**: 85% test pass rate

## 2. Feedback Check
**Before every action**, check for:
- `/communication/feedback/marketing-screens-feedback.md`
- Adjust approach based on feedback before proceeding

## 3. Historical Context
**Previous Phase 3 Attempts**:
- Screens layer: 0/80 tests (0% - completely missing)
- No screen implementations exist
- Components also missing (dependency)
- Phase 3B combines test writing and implementation
- This is the largest implementation gap

## 4. Requirements & Scope
**From PHASE3-TDD-IMPLEMENTATION-PLAN.md**:
- Screens layer: 0/120 tests exist
- Need to write ALL screen tests:
  - MarketingDashboard (25 tests)
  - ProductContentScreen (30 tests)
  - CampaignPlannerScreen (25 tests)
  - BundleManagementScreen (20 tests)
  - MarketingAnalyticsScreen (20 tests)
- Need to implement ALL 5 screens

**Success Metric**: 85% test pass rate (102/120 tests passing)

## 5. Technical Patterns

### React Native Screen Pattern
```typescript
// ✅ CORRECT: Screen with proper structure
export function MarketingDashboard() {
  const navigation = useNavigation<MarketingStackNavigationProp>();
  const { stats, isLoading, refetchAll } = useMarketingDashboard();
  const { campaigns } = useActiveCampaigns();
  const { content } = usePendingContent();
  
  const [refreshing, setRefreshing] = useState(false);
  
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetchAll();
    setRefreshing(false);
  }, [refetchAll]);
  
  if (isLoading) {
    return <LoadingScreen />;
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        }
      >
        {/* Stats Overview */}
        <View style={styles.statsContainer}>
          <StatCard
            title="Active Campaigns"
            value={stats.activeCampaigns}
            icon="campaign"
            onPress={() => navigation.navigate('CampaignPlanner')}
          />
          <StatCard
            title="Pending Content"
            value={stats.pendingContent}
            icon="content"
            onPress={() => navigation.navigate('ProductContent')}
          />
          <StatCard
            title="Revenue"
            value={`$${stats.totalRevenue.toFixed(2)}`}
            icon="revenue"
            onPress={() => navigation.navigate('MarketingAnalytics')}
          />
        </View>
        
        {/* Active Campaigns List */}
        <Section title="Active Campaigns">
          {campaigns.map(campaign => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onPress={() => navigation.navigate('CampaignDetail', { 
                campaignId: campaign.id 
              })}
            />
          ))}
        </Section>
        
        {/* Content Workflow */}
        <Section title="Content Awaiting Review">
          {content.map(item => (
            <ContentItem
              key={item.id}
              content={item}
              onPress={() => navigation.navigate('ProductContent', { 
                contentId: item.id 
              })}
            />
          ))}
        </Section>
      </ScrollView>
      
      {/* Quick Actions FAB */}
      <FloatingActionButton
        actions={[
          {
            icon: 'add-campaign',
            label: 'New Campaign',
            onPress: () => navigation.navigate('CampaignPlanner', { 
              mode: 'create' 
            }),
          },
          {
            icon: 'add-content',
            label: 'Create Content',
            onPress: () => navigation.navigate('ProductContent', { 
              mode: 'create' 
            }),
          },
        ]}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
  },
});
```

### Component Testing Pattern
```typescript
// ✅ CORRECT: Comprehensive screen testing
describe('MarketingDashboard', () => {
  const mockNavigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue(mockNavigation);
  });
  
  it('should render loading state initially', () => {
    (useMarketingDashboard as jest.Mock).mockReturnValue({
      isLoading: true,
      stats: null,
    });
    
    const { getByTestId } = render(<MarketingDashboard />);
    
    expect(getByTestId('loading-screen')).toBeTruthy();
  });
  
  it('should display stats cards when loaded', async () => {
    (useMarketingDashboard as jest.Mock).mockReturnValue({
      isLoading: false,
      stats: {
        activeCampaigns: 5,
        pendingContent: 3,
        totalRevenue: 1234.56,
      },
    });
    
    const { getByText } = render(<MarketingDashboard />);
    
    await waitFor(() => {
      expect(getByText('5')).toBeTruthy();
      expect(getByText('3')).toBeTruthy();
      expect(getByText('$1234.56')).toBeTruthy();
    });
  });
  
  it('should navigate to campaign planner on FAB press', async () => {
    const { getByLabelText } = render(<MarketingDashboard />);
    
    const fab = getByLabelText('New Campaign');
    fireEvent.press(fab);
    
    await waitFor(() => {
      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        'CampaignPlanner',
        { mode: 'create' }
      );
    });
  });
  
  it('should handle pull-to-refresh', async () => {
    const mockRefetch = jest.fn();
    (useMarketingDashboard as jest.Mock).mockReturnValue({
      isLoading: false,
      stats: {},
      refetchAll: mockRefetch,
    });
    
    const { getByTestId } = render(<MarketingDashboard />);
    const scrollView = getByTestId('dashboard-scroll');
    
    const { refreshControl } = scrollView.props;
    await act(async () => {
      refreshControl.props.onRefresh();
    });
    
    expect(mockRefetch).toHaveBeenCalled();
  });
});
```

## 6. Communication Templates

### Progress Update (Every 30 mins)
```markdown
## 🔄 Marketing Screens Progress Update

**Current Cycle**: [1/2]
**Test Status**: [75/120] tests passing (62.5%)
**Active Task**: Implementing ProductContentScreen

### ✅ Completed This Cycle
- MarketingDashboard fully implemented (25/25 tests)
- CampaignPlannerScreen basic structure (18/25 tests)
- Created reusable components (StatCard, CampaignCard)
- Navigation integration working

### 🚧 In Progress
- ProductContentScreen rich text editor
- Image upload gallery component
- Workflow state visualization

### ⏭️ Next Steps
- Complete ProductContentScreen
- Implement BundleManagementScreen
- Add MarketingAnalyticsScreen charts

**Blockers**: Waiting for ContentEditor component
**ETA to 85% target**: 2 hours
```

### Commit Message Format
```bash
# Screen implementation commit
git commit -m "feat(marketing-screens): Implement dashboard and campaign screens

- Add MarketingDashboard with stats and navigation
- Implement CampaignPlannerScreen with form validation
- Create reusable UI components
- Add pull-to-refresh and FAB actions

Test Status: 75/120 passing (62.5%)
Components: 8 created
Target Progress: 73% of goal"
```

## 7. Test Implementation Checklist

### Phase 1: AUDIT & SETUP (First hour)
```bash
# 1. Check for any existing screen files
find src/screens/marketing -name "*.tsx" -o -name "*.ts" | \
  grep -v test > existing-screens.txt

# 2. Set up test infrastructure
mkdir -p src/screens/marketing/__tests__
mkdir -p src/components/marketing

# 3. Create test utilities
cat > src/screens/marketing/__tests__/test-utils.tsx << 'EOF'
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export const createTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        {children}
      </NavigationContainer>
    </QueryClientProvider>
  );
};
EOF

# 4. Document initial state
echo "## Screens Audit
- Existing screens: $(wc -l < existing-screens.txt)
- Tests needed: 120
- Components needed: ~10-15
- Current coverage: 0%
" > /communication/progress/marketing-screens.md
```

### Phase 2: RED (Write all screen tests)
```typescript
// src/screens/marketing/__tests__/ProductContentScreen.test.tsx

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ProductContentScreen } from '../ProductContentScreen';
import { useContentWorkflow } from '@/hooks/marketing';

jest.mock('@/hooks/marketing');

describe('ProductContentScreen', () => {
  const mockRoute = {
    params: { contentId: 'content-1', mode: 'edit' },
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('content editor', () => {
    it('should render rich text editor', () => {
      (useContentWorkflow as jest.Mock).mockReturnValue({
        content: {
          id: 'content-1',
          title: 'Test Product',
          description: '<p>Description</p>',
          workflowState: 'draft',
        },
        isLoading: false,
      });
      
      const { getByTestId } = render(
        <ProductContentScreen route={mockRoute} />
      );
      
      expect(getByTestId('rich-text-editor')).toBeTruthy();
    });
    
    it('should handle text formatting', async () => {
      const { getByTestId, getByText } = render(
        <ProductContentScreen route={mockRoute} />
      );
      
      const editor = getByTestId('rich-text-editor');
      const boldButton = getByTestId('format-bold');
      
      // Select text and apply bold
      fireEvent.changeText(editor, 'Test text');
      fireEvent.press(boldButton);
      
      await waitFor(() => {
        expect(editor.props.value).toContain('<strong>');
      });
    });
    
    it('should save content on blur', async () => {
      const mockSave = jest.fn();
      (useContentWorkflow as jest.Mock).mockReturnValue({
        content: { description: '' },
        saveContent: mockSave,
      });
      
      const { getByTestId } = render(
        <ProductContentScreen route={mockRoute} />
      );
      
      const editor = getByTestId('rich-text-editor');
      fireEvent.changeText(editor, 'New content');
      fireEvent(editor, 'blur');
      
      await waitFor(() => {
        expect(mockSave).toHaveBeenCalledWith({
          description: 'New content',
        });
      });
    });
  });
  
  describe('image management', () => {
    it('should display image gallery', () => {
      (useContentWorkflow as jest.Mock).mockReturnValue({
        content: {
          imageUrls: [
            'https://example.com/image1.jpg',
            'https://example.com/image2.jpg',
          ],
        },
      });
      
      const { getAllByTestId } = render(
        <ProductContentScreen route={mockRoute} />
      );
      
      const images = getAllByTestId(/^image-/);
      expect(images).toHaveLength(2);
    });
    
    it('should handle image upload', async () => {
      const mockUpload = jest.fn();
      (useContentUpload as jest.Mock).mockReturnValue({
        upload: mockUpload,
        uploadProgress: 0,
      });
      
      const { getByTestId } = render(
        <ProductContentScreen route={mockRoute} />
      );
      
      const uploadButton = getByTestId('upload-image');
      fireEvent.press(uploadButton);
      
      // Simulate image picker
      const mockImage = { uri: 'file://test.jpg', type: 'image/jpeg' };
      fireEvent(uploadButton, 'imageSelected', mockImage);
      
      await waitFor(() => {
        expect(mockUpload).toHaveBeenCalledWith({
          file: expect.any(File),
          type: 'image',
        });
      });
    });
    
    it('should show upload progress', () => {
      (useContentUpload as jest.Mock).mockReturnValue({
        isUploading: true,
        uploadProgress: 45,
      });
      
      const { getByText, getByTestId } = render(
        <ProductContentScreen route={mockRoute} />
      );
      
      expect(getByText('45%')).toBeTruthy();
      expect(getByTestId('progress-bar').props.progress).toBe(0.45);
    });
  });
  
  describe('workflow transitions', () => {
    it('should display workflow state badge', () => {
      (useContentWorkflow as jest.Mock).mockReturnValue({
        content: { workflowState: 'review' },
      });
      
      const { getByText } = render(
        <ProductContentScreen route={mockRoute} />
      );
      
      expect(getByText('IN REVIEW')).toBeTruthy();
    });
    
    it('should show available transitions', () => {
      (useContentWorkflow as jest.Mock).mockReturnValue({
        content: { workflowState: 'draft' },
        availableTransitions: ['review'],
        canTransitionTo: jest.fn(() => true),
      });
      
      const { getByText } = render(
        <ProductContentScreen route={mockRoute} />
      );
      
      expect(getByText('Send for Review')).toBeTruthy();
    });
    
    it('should handle state transition', async () => {
      const mockTransition = jest.fn();
      (useContentWorkflow as jest.Mock).mockReturnValue({
        content: { workflowState: 'draft' },
        transitionTo: mockTransition,
        availableTransitions: ['review'],
      });
      
      const { getByText } = render(
        <ProductContentScreen route={mockRoute} />
      );
      
      const button = getByText('Send for Review');
      fireEvent.press(button);
      
      await waitFor(() => {
        expect(mockTransition).toHaveBeenCalledWith({
          targetState: 'review',
        });
      });
    });
  });
});
```

### Phase 3: GREEN (Implement screens)
```typescript
// src/screens/marketing/ProductContentScreen.tsx

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  useContentWorkflow,
  useContentUpload,
} from '@/hooks/marketing';
import {
  RichTextEditor,
  ImageGallery,
  WorkflowBadge,
  LoadingOverlay,
  HeaderActions,
} from '@/components/marketing';

interface ProductContentScreenProps {
  route: {
    params: {
      contentId?: string;
      mode: 'create' | 'edit';
    };
  };
  navigation: any;
}

export function ProductContentScreen({ 
  route, 
  navigation 
}: ProductContentScreenProps) {
  const { contentId, mode } = route.params;
  const isCreateMode = mode === 'create';
  
  const {
    content,
    isLoading,
    saveContent,
    transitionTo,
    availableTransitions,
    canTransitionTo,
  } = useContentWorkflow(contentId || 'new');
  
  const {
    upload,
    isUploading,
    uploadProgress,
  } = useContentUpload(contentId || 'new');
  
  const [localContent, setLocalContent] = useState({
    title: '',
    description: '',
    seoKeywords: [],
    ...content,
  });
  
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Sync with remote content
  useEffect(() => {
    if (content && !isCreateMode) {
      setLocalContent(content);
    }
  }, [content, isCreateMode]);
  
  // Auto-save on blur
  const handleSave = useCallback(async () => {
    if (!hasUnsavedChanges) return;
    
    try {
      await saveContent(localContent);
      setHasUnsavedChanges(false);
    } catch (error) {
      Alert.alert('Save Error', 'Failed to save content');
    }
  }, [localContent, hasUnsavedChanges, saveContent]);
  
  const handleTextChange = useCallback((field: string, value: string) => {
    setLocalContent(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  }, []);
  
  const handleImageUpload = useCallback(async () => {
    // Launch image picker
    const image = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    
    if (!image.cancelled) {
      const file = new File([image.uri], 'image.jpg', { 
        type: 'image/jpeg' 
      });
      upload({ file, type: 'image' });
    }
  }, [upload]);
  
  const handleTransition = useCallback(async (targetState: WorkflowState) => {
    Alert.alert(
      'Confirm Transition',
      `Move content to ${targetState}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => transitionTo({ targetState }),
        },
      ]
    );
  }, [transitionTo]);
  
  // Setup header actions
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <HeaderActions
          onSave={handleSave}
          hasUnsavedChanges={hasUnsavedChanges}
          workflowState={localContent.workflowState}
        />
      ),
    });
  }, [navigation, handleSave, hasUnsavedChanges, localContent.workflowState]);
  
  if (isLoading) {
    return <LoadingOverlay />;
  }
  
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView}>
        {/* Workflow State */}
        {localContent.workflowState && (
          <View style={styles.workflowContainer}>
            <WorkflowBadge state={localContent.workflowState} />
            <View style={styles.transitionButtons}>
              {availableTransitions.map(state => (
                <Button
                  key={state}
                  title={`Send to ${state}`}
                  onPress={() => handleTransition(state)}
                  disabled={!canTransitionTo(state)}
                />
              ))}
            </View>
          </View>
        )}
        
        {/* Title Input */}
        <TextInput
          style={styles.titleInput}
          placeholder="Product Title"
          value={localContent.title}
          onChangeText={text => handleTextChange('title', text)}
          onBlur={handleSave}
        />
        
        {/* Rich Text Editor */}
        <View style={styles.editorContainer}>
          <RichTextEditor
            testID="rich-text-editor"
            value={localContent.description}
            onChange={html => handleTextChange('description', html)}
            onBlur={handleSave}
            placeholder="Enter product description..."
          />
        </View>
        
        {/* Image Gallery */}
        <View style={styles.galleryContainer}>
          <Text style={styles.sectionTitle}>Product Images</Text>
          <ImageGallery
            images={localContent.imageUrls || []}
            onAddImage={handleImageUpload}
            onRemoveImage={(index) => {
              const updated = [...localContent.imageUrls];
              updated.splice(index, 1);
              handleTextChange('imageUrls', updated);
            }}
          />
          {isUploading && (
            <ProgressBar
              testID="progress-bar"
              progress={uploadProgress / 100}
              text={`${uploadProgress}%`}
            />
          )}
        </View>
        
        {/* SEO Keywords */}
        <View style={styles.keywordsContainer}>
          <Text style={styles.sectionTitle}>SEO Keywords</Text>
          <TagInput
            tags={localContent.seoKeywords}
            onTagsChange={tags => handleTextChange('seoKeywords', tags)}
            placeholder="Add keywords..."
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  workflowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  transitionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  titleInput: {
    fontSize: 24,
    fontWeight: 'bold',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  editorContainer: {
    minHeight: 200,
    padding: 16,
  },
  galleryContainer: {
    padding: 16,
  },
  keywordsContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
});
```

## 8. Workspace Management
```bash
# Your dedicated workspace
WORKSPACE="/workspace"
BRANCH="tdd_phase_3b-marketing-screens"

# Initial setup
cd $WORKSPACE
git checkout -b $BRANCH

# Create screen structure
mkdir -p src/screens/marketing/{__tests__,components}
mkdir -p src/components/marketing

# Regular commits
git add -A
git commit -m "wip: marketing-screens - $(date +%H:%M)"
```

## 9. Error Recovery Procedures

### Component Missing Errors
```bash
# Create stub components quickly
for component in RichTextEditor ImageGallery WorkflowBadge; do
  cat > "src/components/marketing/${component}.tsx" << EOF
import React from 'react';
import { View, Text } from 'react-native';

export function ${component}(props: any) {
  return (
    <View testID="${component,,}-component">
      <Text>${component} Placeholder</Text>
    </View>
  );
}
EOF
done
```

### Test Timeout Issues
```bash
# Increase timeout for complex screens
jest.setTimeout(20000);

# Debug specific screen test
npm run test:screens:marketing -- \
  --testNamePattern="ProductContentScreen" \
  --detectOpenHandles
```

## 10. Dependencies & Integration Points

### Required Dependencies
- Hooks from marketing-hooks agent
- Services from marketing-services agent
- Components (may need to create inline)
- Navigation setup

### Screen Navigation Graph
```typescript
// src/navigation/MarketingNavigator.tsx
const MarketingStack = createStackNavigator();

export function MarketingNavigator() {
  return (
    <MarketingStack.Navigator>
      <MarketingStack.Screen 
        name="MarketingDashboard" 
        component={MarketingDashboard}
      />
      <MarketingStack.Screen 
        name="ProductContent" 
        component={ProductContentScreen}
      />
      <MarketingStack.Screen 
        name="CampaignPlanner" 
        component={CampaignPlannerScreen}
      />
      <MarketingStack.Screen 
        name="BundleManagement" 
        component={BundleManagementScreen}
      />
      <MarketingStack.Screen 
        name="MarketingAnalytics" 
        component={MarketingAnalyticsScreen}
      />
    </MarketingStack.Navigator>
  );
}
```

## 11. File Organization

### Screen Structure
```bash
src/screens/marketing/
  ├── __tests__/
  │   ├── MarketingDashboard.test.tsx
  │   ├── ProductContentScreen.test.tsx
  │   ├── CampaignPlannerScreen.test.tsx
  │   ├── BundleManagementScreen.test.tsx
  │   ├── MarketingAnalyticsScreen.test.tsx
  │   └── test-utils.tsx
  ├── MarketingDashboard.tsx
  ├── ProductContentScreen.tsx
  ├── CampaignPlannerScreen.tsx
  ├── BundleManagementScreen.tsx
  ├── MarketingAnalyticsScreen.tsx
  └── index.ts

src/components/marketing/
  ├── RichTextEditor.tsx
  ├── ImageGallery.tsx
  ├── WorkflowBadge.tsx
  ├── CampaignCard.tsx
  ├── StatCard.tsx
  └── index.ts
```

## 12. Screen Implementation Patterns

### Form Handling
```typescript
// ✅ CORRECT: Form with validation
export function CampaignPlannerScreen() {
  const { control, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(campaignSchema),
  });
  
  const { createCampaign, isCreating } = useCampaignMutation();
  
  const onSubmit = async (data: CampaignFormData) => {
    try {
      await createCampaign(data);
      navigation.goBack();
      Alert.alert('Success', 'Campaign created');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };
  
  return (
    <ScrollView>
      <Controller
        control={control}
        name="name"
        render={({ field }) => (
          <TextInput
            {...field}
            placeholder="Campaign Name"
            error={errors.name?.message}
          />
        )}
      />
      
      <Controller
        control={control}
        name="startDate"
        render={({ field }) => (
          <DatePicker
            {...field}
            minimumDate={new Date()}
          />
        )}
      />
      
      <Button
        title="Create Campaign"
        onPress={handleSubmit(onSubmit)}
        loading={isCreating}
      />
    </ScrollView>
  );
}
```

### Analytics Charts
```typescript
// ✅ CORRECT: Analytics with charts
export function MarketingAnalyticsScreen() {
  const { analytics, dateRange, setDateRange } = useMarketingAnalytics();
  
  return (
    <ScrollView>
      <DateRangePicker
        value={dateRange}
        onChange={setDateRange}
      />
      
      <LineChart
        data={{
          labels: analytics.labels,
          datasets: [{
            data: analytics.revenue,
            color: () => '#4CAF50',
          }],
        }}
        width={Dimensions.get('window').width - 32}
        height={220}
        chartConfig={chartConfig}
      />
      
      <PieChart
        data={analytics.productBreakdown}
        width={Dimensions.get('window').width - 32}
        height={220}
        chartConfig={chartConfig}
        accessor="value"
        backgroundColor="transparent"
      />
    </ScrollView>
  );
}
```

## 13. Performance Optimization

### Screen Optimization
```typescript
// ✅ CORRECT: Optimized list rendering
export function BundleManagementScreen() {
  const { bundles } = useProductBundles();
  
  const renderBundle = useCallback(({ item }) => (
    <BundleCard
      bundle={item}
      onPress={() => handleBundlePress(item.id)}
    />
  ), []);
  
  const keyExtractor = useCallback((item) => item.id, []);
  
  return (
    <FlatList
      data={bundles}
      renderItem={renderBundle}
      keyExtractor={keyExtractor}
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      windowSize={10}
      initialNumToRender={10}
      getItemLayout={(data, index) => ({
        length: ITEM_HEIGHT,
        offset: ITEM_HEIGHT * index,
        index,
      })}
    />
  );
}
```

## 14. Accessibility Implementation

### Screen Accessibility
```typescript
// ✅ CORRECT: Accessible components
export function MarketingDashboard() {
  return (
    <View accessible={true} accessibilityRole="main">
      <Text
        accessibilityRole="header"
        accessibilityLevel={1}
        style={styles.title}
      >
        Marketing Dashboard
      </Text>
      
      <TouchableOpacity
        accessibilityLabel="Create new campaign"
        accessibilityHint="Opens campaign creation form"
        accessibilityRole="button"
        onPress={handleCreateCampaign}
      >
        <Text>New Campaign</Text>
      </TouchableOpacity>
      
      <View
        accessibilityLiveRegion="polite"
        accessibilityLabel={`${stats.activeCampaigns} active campaigns`}
      >
        <StatCard value={stats.activeCampaigns} />
      </View>
    </View>
  );
}
```

## 15. Testing Execution Commands
```bash
# Full screen test suite
npm run test:screens:marketing

# With coverage
npm run test:screens:marketing -- --coverage

# Watch mode
npm run test:screens:marketing -- --watch

# Specific screen
npm run test:screens:marketing -- MarketingDashboard.test.tsx

# Debug mode
node --inspect-brk ./node_modules/.bin/jest \
  --runInBand \
  --config jest.config.screens.js \
  ProductContentScreen.test.tsx
```

## 16. Rollback Procedures
```bash
# If screens break everything
git stash
git checkout origin/main -- src/screens/marketing/

# Create minimal working screens
for screen in MarketingDashboard ProductContentScreen CampaignPlannerScreen; do
  cat > "src/screens/marketing/${screen}.tsx" << EOF
import React from 'react';
import { View, Text } from 'react-native';

export function ${screen}() {
  return (
    <View testID="${screen}">
      <Text>${screen}</Text>
    </View>
  );
}
EOF
done

# Test minimal implementation
npm run test:screens:marketing
```

## 17. Success Criteria

### Completion Checklist
- [ ] 85% test pass rate achieved (102/120 tests)
- [ ] All 5 screens implemented
- [ ] Navigation working correctly
- [ ] Forms with validation
- [ ] Pull-to-refresh implemented
- [ ] Loading states handled
- [ ] Error states displayed
- [ ] Accessibility labels added

### Final Handoff Document
```markdown
# Marketing Screens Layer - Handoff

## Final Status
- **Test Pass Rate**: 85% (102/120 tests passing)
- **Screens Implemented**: 5/5
- **Components Created**: 12
- **Coverage**: 83%

## Completed Work
1. MarketingDashboard with stats and navigation
2. ProductContentScreen with rich editor
3. CampaignPlannerScreen with form validation
4. BundleManagementScreen with list optimization
5. MarketingAnalyticsScreen with charts

## Screen Routes
\`\`\`typescript
// Available navigation
navigation.navigate('MarketingDashboard');
navigation.navigate('ProductContent', { contentId, mode });
navigation.navigate('CampaignPlanner', { campaignId?, mode });
navigation.navigate('BundleManagement');
navigation.navigate('MarketingAnalytics', { dateRange });
\`\`\`

## Known Issues
- 18 tests skipped pending image picker mock
- Chart library needs performance optimization
- Rich text editor needs accessibility improvements

## Next Agent Dependencies
- marketing-integration can orchestrate screens
- All screens export proper TypeScript types
- Navigation graph complete
```

## 18. Communication Protocols

### Status Updates (Every 15 mins)
```bash
echo "{
  \"agent\": \"marketing-screens\",
  \"cycle\": $CYCLE,
  \"testsPass\": $PASS,
  \"testsFail\": $FAIL,
  \"testPassRate\": $RATE,
  \"screensComplete\": $SCREENS_DONE,
  \"status\": \"active\",
  \"lastUpdate\": \"$(date -Iseconds)\"
}" > /communication/status/marketing-screens.json
```

### Component Request
```bash
# When needing shared components
cat > /communication/requests/marketing-screens-needs.md << EOF
# Component Request from Marketing Screens

**Requesting Agent**: marketing-screens
**Priority**: BLOCKING

## Required Components
1. RichTextEditor - For ProductContentScreen
2. ImageGallery - For product images
3. DateRangePicker - For analytics

## Specifications
- Must support testID props
- Need TypeScript definitions
- Should handle loading states

**Blocking**: ProductContentScreen tests (30 tests)
EOF
```

## 19. Final Notes

### Screen Priority Order
1. **MarketingDashboard** - Entry point, must work first
2. **ProductContentScreen** - Most complex, highest test count
3. **CampaignPlannerScreen** - Form handling critical
4. **BundleManagementScreen** - List optimization important
5. **MarketingAnalyticsScreen** - Can use mock data initially

### Testing Strategy
- Start with basic render tests
- Add interaction tests incrementally
- Mock complex components initially
- Use real hooks where possible
- Accessibility tests can be deferred

### Common Screen Issues
- Navigation prop typing
- Form validation errors
- Image picker permissions
- Chart rendering performance
- Keyboard avoiding view bugs

Remember: 85% test pass rate is the goal. Implement screens incrementally, ensuring navigation works before complex features.