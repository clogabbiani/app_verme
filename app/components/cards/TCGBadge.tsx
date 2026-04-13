import React from 'react';
import { View, Text } from 'react-native';
import { TCG } from '../../types';
import { TCG_SHORT } from '../../constants/tcg';

interface TCGBadgeProps {
  tcg: TCG;
  size?: 'sm' | 'md';
}

export function TCGBadge({ tcg, size = 'sm' }: TCGBadgeProps) {
  const bgColor = tcg === 'magic' ? 'bg-magic' : 'bg-pokemon';
  const padding = size === 'sm' ? 'px-1.5 py-0.5' : 'px-2 py-1';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <View className={`${bgColor} ${padding} rounded-md`}>
      <Text className={`text-white font-bold ${textSize}`}>
        {TCG_SHORT[tcg]}
      </Text>
    </View>
  );
}
