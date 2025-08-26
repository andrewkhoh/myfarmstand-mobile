import React from 'react';

export const Text = ({ children, ...props }: any) => React.createElement('Text', props, children);
export const Card = ({ children, ...props }: any) => React.createElement('View', props, children);
export const Button = ({ children, onPress, ...props }: any) => 
  React.createElement('TouchableOpacity', { onPress, ...props }, children);
export const Screen = ({ children, ...props }: any) => React.createElement('View', props, children);
export const Loading = () => React.createElement('View', { testID: 'loading' });
export const Input = ({ ...props }: any) => React.createElement('TextInput', props);
export const Toast = ({ ...props }: any) => React.createElement('View', props);