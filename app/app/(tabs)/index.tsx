import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { fetchCollection } from '../../services/collection';
import { CardThumbnail } from '../../components/cards/CardThumbnail';
import { SkeletonGrid } from '../../components/ui/SkeletonCard';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const username = user?.user_metadata?.username ?? user?.email?.split('@')[0] ?? 'Collezionista';

  const { data: collection, isLoading } = useQuery({
    queryKey: ['collection'],
    queryFn: fetchCollection,
  });

  const recent = collection?.slice(0, 6) ?? [];
  const totalCards = collection?.reduce((sum, uc) => sum + uc.quantity, 0) ?? 0;
  const forTradeCount = collection?.filter((uc) => uc.for_trade).length ?? 0;
  const magicCount = collection?.filter((uc) => uc.card.tcg === 'magic').length ?? 0;
  const pokemonCount = collection?.filter((uc) => uc.card.tcg === 'pokemon').length ?? 0;

  return (
    <ScrollView className="flex-1 bg-dark-bg">
      {/* Header */}
      <View className="px-5 pt-6 pb-4 gap-1">
        <Text className="text-dark-muted text-base">Ciao,</Text>
        <Text className="text-dark-text text-2xl font-bold">{username} 👋</Text>
      </View>

      {/* Stats */}
      <View className="flex-row px-5 gap-3 mb-6">
        {[
          { label: 'Carte totali', value: totalCards, emoji: '🃏' },
          { label: 'Per scambio', value: forTradeCount, emoji: '↔️' },
          { label: 'Magic', value: magicCount, emoji: '⚡' },
          { label: 'Pokémon', value: pokemonCount, emoji: '🔴' },
        ].map((stat) => (
          <View
            key={stat.label}
            className="flex-1 bg-dark-card rounded-xl p-3 items-center gap-1"
          >
            <Text className="text-xl">{stat.emoji}</Text>
            <Text className="text-dark-text text-lg font-bold">{stat.value}</Text>
            <Text className="text-dark-muted text-xs text-center">{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Quick actions */}
      <View className="px-5 mb-6 gap-3">
        <Text className="text-dark-text text-lg font-bold">Azioni rapide</Text>
        <View className="flex-row gap-3">
          <TouchableOpacity
            className="flex-1 bg-primary rounded-xl p-4 items-center gap-2"
            onPress={() => router.push('/(tabs)/scan')}
            activeOpacity={0.85}
          >
            <Text className="text-2xl">📷</Text>
            <Text className="text-white font-semibold text-sm">Scansiona carta</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 bg-dark-card rounded-xl p-4 items-center gap-2 border border-dark-border"
            onPress={() => router.push('/(tabs)/map')}
            activeOpacity={0.85}
          >
            <Text className="text-2xl">🗺️</Text>
            <Text className="text-dark-text font-semibold text-sm">Trova trader</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Recent cards */}
      <View className="px-5 mb-6 gap-3">
        <View className="flex-row justify-between items-center">
          <Text className="text-dark-text text-lg font-bold">Aggiunte di recente</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/collection')}>
            <Text className="text-primary text-sm">Vedi tutto</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <SkeletonGrid count={6} />
        ) : recent.length === 0 ? (
          <View className="bg-dark-card rounded-xl p-6 items-center gap-3">
            <Text className="text-4xl">📭</Text>
            <Text className="text-dark-muted text-center">
              La tua collezione è vuota.{'\n'}Scansiona la tua prima carta!
            </Text>
          </View>
        ) : (
          <View className="flex-row flex-wrap gap-3">
            {recent.map((uc) => (
              <View key={uc.id} style={{ width: '30%' }}>
                <CardThumbnail userCard={uc} />
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
