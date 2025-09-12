import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface RichTextEditorProps {
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
  minHeight?: number;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Enter text...',
  minHeight = 200
}) => {
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);

  const formatButtons = [
    { icon: 'format-bold', active: isBold, onPress: () => setIsBold(!isBold) },
    { icon: 'format-italic', active: isItalic, onPress: () => setIsItalic(!isItalic) },
    { icon: 'format-list-bulleted', active: false, onPress: () => {} },
    { icon: 'format-list-numbered', active: false, onPress: () => {} },
    { icon: 'link', active: false, onPress: () => {} },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {formatButtons.map((button, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.toolbarButton, button.active && styles.toolbarButtonActive]}
              onPress={button.onPress}
            >
              <MaterialCommunityIcons
                name={button.icon as any}
                size={20}
                color={button.active ? '#2196F3' : '#666'}
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      <TextInput
        style={[styles.editor, { minHeight }]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        multiline
        textAlignVertical="top"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  toolbar: {
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  toolbarButton: {
    padding: 8,
    marginHorizontal: 2,
    borderRadius: 4,
  },
  toolbarButtonActive: {
    backgroundColor: '#E3F2FD',
  },
  editor: {
    padding: 12,
    fontSize: 14,
    color: '#333',
  },
});