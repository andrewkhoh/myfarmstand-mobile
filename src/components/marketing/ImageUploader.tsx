import React, { memo, useCallback, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  ProgressBarAndroid,
  ProgressViewIOS,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface ImageUploaderProps {
  onUpload: (urls: string[]) => void;
  maxImages?: number;
  aspectRatio?: number;
  compressionQuality?: number;
}

interface UploadingImage {
  id: string;
  uri: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
}

export const ImageUploader = memo<ImageUploaderProps>(({
  onUpload,
  maxImages = 10,
  aspectRatio = 1,
  compressionQuality = 0.8,
}) => {
  const theme = useTheme();
  const [images, setImages] = useState<UploadingImage[]>([]);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const draggedItemRef = useRef<string | null>(null);

  const simulateImagePicker = useCallback(() => {
    const mockImageUri = `https://picsum.photos/400/400?random=${Date.now()}`;
    return {
      assets: [{
        uri: mockImageUri,
        type: 'image/jpeg',
        fileName: `image_${Date.now()}.jpg`,
      }],
    };
  }, []);

  const handleSelectImages = useCallback(() => {
    if (images.length >= maxImages) {
      Alert.alert('Limit Reached', `You can only upload up to ${maxImages} images`);
      return;
    }

    const response = simulateImagePicker();
    
    if (response.assets && response.assets[0]) {
      const newImage: UploadingImage = {
        id: Date.now().toString(),
        uri: response.assets[0].uri,
        progress: 0,
        status: 'uploading',
      };

      setImages(prev => [...prev, newImage]);
      
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        
        setImages(prev => prev.map(img => 
          img.id === newImage.id 
            ? { ...img, progress: Math.min(progress, 100) }
            : img
        ));

        if (progress >= 100) {
          clearInterval(interval);
          setImages(prev => prev.map(img => 
            img.id === newImage.id 
              ? { ...img, status: 'completed' }
              : img
          ));
          
          setSelectedImages(prev => [...prev, response.assets![0].uri]);
          onUpload([...selectedImages, response.assets![0].uri]);
        }
      }, 200);
    }
  }, [images.length, maxImages, selectedImages, onUpload, simulateImagePicker]);

  const handleRemoveImage = useCallback((imageId: string) => {
    Alert.alert(
      'Remove Image',
      'Are you sure you want to remove this image?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setImages(prev => prev.filter(img => img.id !== imageId));
            const imageToRemove = images.find(img => img.id === imageId);
            if (imageToRemove) {
              setSelectedImages(prev => prev.filter(uri => uri !== imageToRemove.uri));
              onUpload(selectedImages.filter(uri => uri !== imageToRemove.uri));
            }
          },
        },
      ]
    );
  }, [images, selectedImages, onUpload]);

  const handleDragStart = useCallback((imageId: string) => {
    draggedItemRef.current = imageId;
    setIsDragging(true);
  }, []);

  const handleDragEnd = useCallback(() => {
    draggedItemRef.current = null;
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((targetId: string) => {
    if (!draggedItemRef.current || draggedItemRef.current === targetId) return;

    setImages(prev => {
      const draggedIndex = prev.findIndex(img => img.id === draggedItemRef.current);
      const targetIndex = prev.findIndex(img => img.id === targetId);
      
      if (draggedIndex === -1 || targetIndex === -1) return prev;

      const newImages = [...prev];
      const [draggedItem] = newImages.splice(draggedIndex, 1);
      newImages.splice(targetIndex, 0, draggedItem);
      
      return newImages;
    });

    handleDragEnd();
  }, [handleDragEnd]);

  const renderProgressBar = (progress: number) => {
    if (Platform.OS === 'android') {
      return (
        <ProgressBarAndroid
          styleAttr="Horizontal"
          indeterminate={false}
          progress={progress / 100}
          color={theme.colors.primary}
          style={styles.progressBar}
          testID="progress-bar"
        />
      );
    } else {
      return (
        <ProgressViewIOS
          progress={progress / 100}
          progressTintColor={theme.colors.primary}
          style={styles.progressBar}
          testID="progress-bar"
        />
      );
    }
  };

  return (
    <View style={styles.container} testID="image-uploader">
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Upload Images</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          {images.length} / {maxImages} images
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.imageList}
        contentContainerStyle={styles.imageListContent}
      >
        {images.map((image) => (
          <TouchableOpacity
            key={image.id}
            style={[
              styles.imageContainer,
              isDragging && styles.imageContainerDragging,
              { aspectRatio },
            ]}
            onLongPress={() => handleDragStart(image.id)}
            onPress={() => handleDrop(image.id)}
            activeOpacity={0.8}
            testID={`image-${image.id}`}
          >
            <Image
              source={{ uri: image.uri }}
              style={styles.image}
              resizeMode="cover"
              testID={`image-preview-${image.id}`}
            />
            
            {image.status === 'uploading' && (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator color="white" size="large" />
                {renderProgressBar(image.progress)}
                <Text style={styles.progressText}>{image.progress}%</Text>
              </View>
            )}

            {image.status === 'completed' && (
              <TouchableOpacity
                style={[styles.removeButton, { backgroundColor: theme.colors.error }]}
                onPress={() => handleRemoveImage(image.id)}
                accessibilityLabel="Remove image"
                testID={`remove-${image.id}`}
              >
                <Text style={styles.removeButtonText}>×</Text>
              </TouchableOpacity>
            )}

            {image.status === 'error' && (
              <View style={styles.errorOverlay}>
                <Text style={styles.errorText}>Upload Failed</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}

        {images.length < maxImages && (
          <TouchableOpacity
            style={[
              styles.addImageButton,
              { 
                borderColor: theme.colors.primary,
                aspectRatio,
              },
            ]}
            onPress={handleSelectImages}
            accessibilityLabel="Add image"
            testID="add-image-button"
          >
            <Text style={[styles.addImageIcon, { color: theme.colors.primary }]}>+</Text>
            <Text style={[styles.addImageText, { color: theme.colors.primary }]}>Add Image</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {images.length > 0 && (
        <View style={styles.footer}>
          <View style={styles.compressionInfo}>
            <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>
              Compression Quality:
            </Text>
            <Text style={[styles.infoValue, { color: theme.colors.text }]}>
              {Math.round(compressionQuality * 100)}%
            </Text>
          </View>
          
          <View style={styles.aspectInfo}>
            <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>
              Aspect Ratio:
            </Text>
            <Text style={[styles.infoValue, { color: theme.colors.text }]}>
              {aspectRatio === 1 ? 'Square' : aspectRatio > 1 ? 'Landscape' : 'Portrait'}
            </Text>
          </View>
        </View>
      )}

      {isDragging && (
        <View style={styles.dragHint}>
          <Text style={styles.dragHintText}>Drag to reorder</Text>
        </View>
      )}
    </View>
  );
});

ImageUploader.displayName = 'ImageUploader';

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 14,
  },
  imageList: {
    flexGrow: 0,
  },
  imageListContent: {
    paddingVertical: 8,
  },
  imageContainer: {
    width: 120,
    marginRight: 12,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F0F0F0',
  },
  imageContainerDragging: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
  image: {
    width: '100%',
    height: '100%',
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBar: {
    width: '80%',
    marginVertical: 8,
  },
  progressText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 20,
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 59, 48, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  addImageButton: {
    width: 120,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  addImageIcon: {
    fontSize: 32,
    fontWeight: '300',
  },
  addImageText: {
    fontSize: 12,
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  compressionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aspectInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12,
    marginRight: 4,
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  dragHint: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -60 }, { translateY: -15 }],
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  dragHintText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
});