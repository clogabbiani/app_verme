import React from 'react';
import { View, Text } from 'react-native';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon = '📭',
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center px-8 gap-4">
      <Text className="text-5xl">{icon}</Text>
      <Text className="text-dark-text text-xl font-bold text-center">{title}</Text>
      {description && (
        <Text className="text-dark-muted text-base text-center">{description}</Text>
      )}
      {actionLabel && onAction && (
        <Button title={actionLabel} onPress={onAction} className="mt-2" />
      )}
    </View>
  );
}
