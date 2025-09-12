import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface TagInputProps {
  tags: string[];
  onAddTag: (tag: string) => void;
  onRemoveTag: (index: number) => void;
  placeholder?: string;
  maxTags?: number;
}

export const TagInput: React.FC<TagInputProps> = ({
  tags,
  onAddTag,
  onRemoveTag,
  placeholder = 'Add a tag...',
  maxTags = 10
}) => {
  const [inputValue, setInputValue] = useState('');

  const handleAddTag = () => {
    const trimmedValue = inputValue.trim();
    if (trimmedValue && tags.length < maxTags && !tags.includes(trimmedValue)) {
      onAddTag(trimmedValue);
      setInputValue('');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagsContainer}>
        {tags.map((tag, index) => (
          <View key={index} style={styles.tag}>
            <Text style={styles.tagText}>{tag}</Text>
            <TouchableOpacity onPress={() => onRemoveTag(index)}>
              <MaterialCommunityIcons name="close" size={16} color="#666" />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
      {tags.length < maxTags && (
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputValue}
            onChangeText={setInputValue}
            placeholder={placeholder}
            onSubmitEditing={handleAddTag}
            returnKeyType="done"
          />
          <TouchableOpacity onPress={handleAddTag} style={styles.addButton}>
            <MaterialCommunityIcons name="plus" size={20} color="#2196F3" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
  },
  tagsContainer: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  tagText: {
    fontSize: 14,
    color: '#2196F3',
    marginRight: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginTop: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 14,
  },
  addButton: {
    padding: 4,
  },
});