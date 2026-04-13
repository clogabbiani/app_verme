import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { UserCard } from '../../types';
import { TCGBadge } from './TCGBadge';
import { ConditionBadge } from './ConditionBadge';
import { useRouter } from 'expo-router';

interface CardThumbnailProps {
  userCard: UserCard;
  onPress?: () => void;
}

export function CardThumbnail({ userCard, onPress }: CardThumbnailProps) {
  const router = useRouter();
  const { card } = userCard;

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push(`/card/${card.id}`);
    }
  };

  return (
    <TouchableOpacity
      className="bg-dark-card rounded-xl overflow-hidden"
      onPress={handlePress}
      activeOpacity={0.85}
    >
      {card.image_thumbnail_url ? (
        <Image
          source={{ uri: card.image_thumbnail_url }}
          className="aspect-[2/3] w-full"
          resizeMode="cover"
        />
      ) : (
        <View className="aspect-[2/3] w-full bg-dark-border items-center justify-center">
          <Text className="text-3xl">🃏</Text>
        </View>
      )}

      {/* Overlay badges */}
      <View className="absolute top-1.5 left-1.5 gap-1">
        <TCGBadge tcg={card.tcg} />
        {userCard.foil && (
          <View className="bg-yellow-500/30 border border-yellow-500 px-1.5 py-0.5 rounded-md">
            <Text className="text-yellow-400 text-xs font-bold">✨</Text>
          </View>
        )}
      </View>

      {userCard.for_trade && (
        <View className="absolute top-1.5 right-1.5 bg-green-500/30 border border-green-500 px-1.5 py-0.5 rounded-md">
          <Text className="text-green-400 text-xs font-bold">↔</Text>
        </View>
      )}

      <View className="p-2 gap-1">
        <Text className="text-dark-text text-xs font-semibold" numberOfLines={1}>
          {card.name}
        </Text>
        <View className="flex-row items-center justify-between">
          <ConditionBadge condition={userCard.condition} />
          {userCard.quantity > 1 && (
            <Text className="text-dark-muted text-xs">×{userCard.quantity}</Text>
          )}
        </View>
        {card.market_price_eur != null && (
          <Text className="text-primary text-xs font-medium">
            €{card.market_price_eur.toFixed(2)}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}
