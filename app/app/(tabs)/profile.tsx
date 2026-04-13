import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { fetchCollection } from '../../services/collection';
import { fetchTrades } from '../../services/trades';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useAuthStore();
  const username = user?.user_metadata?.username ?? user?.email?.split('@')[0] ?? 'Utente';

  const { data: collection } = useQuery({
    queryKey: ['collection'],
    queryFn: fetchCollection,
  });

  const { data: trades } = useQuery({
    queryKey: ['trades'],
    queryFn: fetchTrades,
  });

  const handleSignOut = () => {
    Alert.alert('Esci', 'Vuoi uscire dall\'account?', [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Esci', style: 'destructive', onPress: signOut },
    ]);
  };

  const totalCards = collection?.reduce((s, uc) => s + uc.quantity, 0) ?? 0;
  const pendingTrades = trades?.filter((t) => t.status === 'pending').length ?? 0;
  const magicCards = collection?.filter((uc) => uc.card.tcg === 'magic').length ?? 0;
  const pokemonCards = collection?.filter((uc) => uc.card.tcg === 'pokemon').length ?? 0;

  return (
    <ScrollView className="flex-1 bg-dark-bg">
      {/* Avatar + name */}
      <View className="items-center pt-8 pb-6 gap-3">
        <View className="w-20 h-20 rounded-full bg-primary/30 items-center justify-center border-2 border-primary">
          <Text className="text-3xl font-bold text-primary">
            {username[0].toUpperCase()}
          </Text>
        </View>
        <View className="items-center gap-1">
          <Text className="text-dark-text text-2xl font-bold">{username}</Text>
          <Text className="text-dark-muted text-sm">{user?.email}</Text>
        </View>
      </View>

      {/* Stats grid */}
      <View className="flex-row flex-wrap px-5 gap-3 mb-6">
        {[
          { label: 'Carte totali', value: totalCards, emoji: '🃏' },
          { label: 'Scambi attivi', value: pendingTrades, emoji: '↔️' },
          { label: 'Magic', value: magicCards, emoji: '⚡' },
          { label: 'Pokémon', value: pokemonCards, emoji: '🔴' },
        ].map((s) => (
          <View key={s.label} className="bg-dark-card rounded-xl p-4 items-center gap-1" style={{ width: '47%' }}>
            <Text className="text-2xl">{s.emoji}</Text>
            <Text className="text-dark-text text-2xl font-bold">{s.value}</Text>
            <Text className="text-dark-muted text-xs">{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Actions */}
      <View className="px-5 gap-3 pb-10">
        <Text className="text-dark-muted text-xs uppercase font-semibold tracking-wider mb-1">
          Gestione
        </Text>
        <MenuItem emoji="↔️" label="I miei scambi" onPress={() => router.push('/trade/list')} />
        <MenuItem emoji="📚" label="La mia collezione" onPress={() => router.push('/(tabs)/collection')} />
        <MenuItem emoji="🗺️" label="Trova trader vicini" onPress={() => router.push('/(tabs)/map')} />

        <View className="h-px bg-dark-border my-2" />

        <MenuItem
          emoji="🚪"
          label="Esci dall'account"
          onPress={handleSignOut}
          danger
        />
      </View>
    </ScrollView>
  );
}

function MenuItem({
  emoji,
  label,
  onPress,
  danger,
}: {
  emoji: string;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <TouchableOpacity
      className="flex-row items-center gap-4 bg-dark-card p-4 rounded-xl border border-dark-border"
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text className="text-xl">{emoji}</Text>
      <Text className={`flex-1 font-medium text-base ${danger ? 'text-red-400' : 'text-dark-text'}`}>
        {label}
      </Text>
      <Text className="text-dark-muted">›</Text>
    </TouchableOpacity>
  );
}
