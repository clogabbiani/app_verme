import React from 'react';
import { View, TextInput, Text, TextInputProps } from 'react-native';
import { colors } from '../../constants/colors';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function Input({ label, error, style, ...rest }: InputProps) {
  return (
    <View className="gap-1">
      {label && (
        <Text className="text-dark-muted text-sm font-medium">{label}</Text>
      )}
      <TextInput
        className={`bg-dark-card border ${error ? 'border-red-500' : 'border-dark-border'} rounded-xl px-4 py-3 text-dark-text text-base`}
        placeholderTextColor={colors.muted}
        selectionColor={colors.primary}
        {...rest}
      />
      {error && <Text className="text-red-500 text-xs">{error}</Text>}
    </View>
  );
}
