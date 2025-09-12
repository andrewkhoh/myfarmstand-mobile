import React from 'react';
import { View, Image, TouchableOpacity, ScrollView, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface ImageGalleryProps {
  images: string[];
  onAddImage?: () => void;
  onRemoveImage?: (index: number) => void;
  editable?: boolean;
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({
  images,
  onAddImage,
  onRemoveImage,
  editable = true
}) => {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.container}>
      {images.map((image, index) => (
        <View key={index} style={styles.imageContainer}>
          <Image source={{ uri: image }} style={styles.image} />
          {editable && onRemoveImage && (
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => onRemoveImage(index)}
            >
              <MaterialCommunityIcons name="close-circle" size={24} color="#F44336" />
            </TouchableOpacity>
          )}
        </View>
      ))}
      {editable && onAddImage && (
        <TouchableOpacity style={styles.addButton} onPress={onAddImage}>
          <MaterialCommunityIcons name="plus" size={32} color="#666" />
          <Text style={styles.addText}>Add Image</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  imageContainer: {
    marginRight: 12,
    position: 'relative',
  },
  image: {
    width: 120,
    height: 120,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  addButton: {
    width: 120,
    height: 120,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fafafa',
  },
  addText: {
    marginTop: 4,
    fontSize: 12,
    color: '#666',
  },
});