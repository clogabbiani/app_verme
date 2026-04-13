import React from 'react';
import { View, Text } from 'react-native';
import { Condition } from '../../types';
import { CONDITION_COLORS, CONDITION_LABELS } from '../../constants/tcg';

interface ConditionBadgeProps {
  condition: Condition;
  showLabel?: boolean;
}

export function ConditionBadge({ condition, showLabel = false }: ConditionBadgeProps) {
  const color = CONDITION_COLORS[condition];
  return (
    <View
      style={{ backgroundColor: color + '33', borderColor: color, borderWidth: 1 }}
      className="px-1.5 py-0.5 rounded-md"
    >
      <Text style={{ color }} className="text-xs font-bold">
        {showLabel ? CONDITION_LABELS[condition] : condition}
      </Text>
    </View>
  );
}
