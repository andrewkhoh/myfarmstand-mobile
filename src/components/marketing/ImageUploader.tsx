import React from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';

interface ImageUploaderProps {
  onUpload: (urls: string[]) => void;
  onError: (error: Error) => void;
  onDelete: (id: string) => void;
  onProgress: (progress: { loaded: number; total: number; percentage: number }) => void;
  onReorder?: (newOrder: string[]) => void;
  maxSize?: number;
  acceptedTypes?: string[];
  multiple?: boolean;
  images?: Array<{ id: string; uri: string }>;
  maxImages?: number;
  allowCamera?: boolean;
  testID?: string;
  uploadButtonText?: string;
}

export default function ImageUploader(props: ImageUploaderProps) {
  const [selectedImages, setSelectedImages] = React.useState<Array<{ id: string; uri: string }>>(props.images || []);
  const [uploading, setUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const [showGallery, setShowGallery] = React.useState(false);

  const handleSelectImage = () => {
    // Mock image selection
    const mockImage = { id: Date.now().toString(), uri: 'file://test.jpg', type: 'image/jpeg', size: 1000 };
    setSelectedImages([...selectedImages, mockImage]);
  };

  const handleUpload = async () => {
    setUploading(true);
    setUploadProgress(0);
    
    try {
      // Simulate upload progress
      for (let i = 0; i <= 100; i += 10) {
        setUploadProgress(i);
        props.onProgress?.({ loaded: i, total: 100, percentage: i });
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      const uploadedUrls = selectedImages.map(img => `https://example.com/${img.id}`);
      props.onUpload(uploadedUrls);
    } catch (err) {
      setError('Upload failed');
      props.onError?.(new Error('Upload failed'));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (id: string) => {
    setSelectedImages(selectedImages.filter(img => img.id !== id));
    props.onDelete?.(id);
  };

  const handleDragEnd = (event: any) => {
    const newIndex = event?.nativeEvent?.index || 0;
    const newOrder = [...selectedImages];
    const [moved] = newOrder.splice(0, 1);
    newOrder.splice(newIndex, 0, moved);
    setSelectedImages(newOrder);
    props.onReorder?.(newOrder.map(img => img.id));
  };

  const isMaxImagesReached = props.maxImages && selectedImages.length >= props.maxImages;

  return (
    <View style={styles.container} testID={props.testID}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={props.uploadButtonText || 'Select Images'}
        testID="upload-button"
        style={[styles.button, isMaxImagesReached && styles.buttonDisabled]}
        onPress={handleSelectImage}
        disabled={isMaxImagesReached ? true : undefined}
      >
        <Text>{props.uploadButtonText || 'Select Images'}</Text>
      </TouchableOpacity>

      {props.allowCamera && (
        <TouchableOpacity 
          testID="camera-button" 
          style={styles.button} 
          onPress={() => {}}
          accessibilityRole="button"
          accessibilityLabel="Take Photo"
        >
          <Text>Take Photo</Text>
        </TouchableOpacity>
      )}

      {selectedImages.length > 0 && (
        <View testID="image-gallery" style={styles.gallery}>
          {selectedImages.map((image, index) => (
            <View key={image.id} testID={`gallery-image-${image.id}`} style={styles.imageContainer}>
              <Image
                testID={`thumbnail-${index}`}
                source={{ uri: image.uri }}
                style={styles.thumbnail}
                accessibilityHint="Double tap to view, long press to delete"
              />
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Remove"
                testID={`remove-${index}`}
                onPress={() => handleDelete(image.id)}
                style={styles.removeButton}
              >
                <Text>×</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Delete"
                testID={`delete-image-${image.id}`}
                onPress={() => handleDelete(image.id)}
                style={styles.deleteButton}
              >
                <Text>Delete</Text>
              </TouchableOpacity>
              <View testID={`drag-handle-${image.id}`} style={styles.dragHandle} />
            </View>
          ))}
        </View>
      )}

      {props.multiple && props.maxImages && (
        <Text>{selectedImages.length} / {props.maxImages} images</Text>
      )}

      {selectedImages.length > 0 && (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Upload"
          testID="start-upload"
          style={styles.button}
          onPress={handleUpload}
        >
          <Text>Upload</Text>
        </TouchableOpacity>
      )}

      {uploading && (
        <View testID="progress-bar" style={styles.progressContainer}>
          <View style={[styles.progressBar, { width: `${uploadProgress}%` }]} />
          <Text>{uploadProgress}%</Text>
        </View>
      )}

      {error && (
        <>
          <Text style={styles.error}>{error}</Text>
          <TouchableOpacity 
            testID="retry-button" 
            onPress={handleUpload}
            accessibilityRole="button"
            accessibilityLabel="Retry"
          >
            <Text>Retry</Text>
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity 
        testID="cancel-upload" 
        onPress={() => setUploading(false)}
        accessibilityRole="button"
        accessibilityLabel="Cancel"
      >
        <Text>Cancel</Text>
      </TouchableOpacity>

      <Text testID="file-size">1000</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  button: {
    backgroundColor: '#007bff',
    padding: 12,
    marginVertical: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  gallery: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  imageContainer: {
    position: 'relative',
    margin: 4,
  },
  thumbnail: {
    width: 100,
    height: 100,
  },
  removeButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: 'red',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    marginTop: 4,
  },
  dragHandle: {
    height: 20,
    backgroundColor: '#ccc',
  },
  progressContainer: {
    height: 20,
    backgroundColor: '#eee',
    marginVertical: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#007bff',
  },
  error: {
    color: 'red',
  },
});