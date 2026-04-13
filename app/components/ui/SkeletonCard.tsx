import React, { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';

export function SkeletonCard() {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View style={{ opacity }} className="bg-dark-card rounded-xl overflow-hidden">
      <View className="bg-dark-border aspect-[2/3] w-full" />
      <View className="p-2 gap-2">
        <View className="bg-dark-border h-3 rounded w-3/4" />
        <View className="bg-dark-border h-3 rounded w-1/2" />
      </View>
    </Animated.View>
  );
}

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <View className="flex-row flex-wrap gap-3 p-4">
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={{ width: '30%' }}>
          <SkeletonCard />
        </View>
      ))}
    </View>
  );
}
