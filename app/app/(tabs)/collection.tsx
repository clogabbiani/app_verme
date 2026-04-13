import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { fetchCollection, removeCard, updateCard } from '../../services/collection';
import { CardThumbnail } from '../../components/cards/CardThumbnail';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonGrid } from '../../components/ui/SkeletonCard';
import { TCG } from '../../types';

type TCGFilter = TCG | 'all';
type TradeFilter = 'all' | 'for_trade';

export default function CollectionScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [tcgFilter, setTcgFilter] = useState<TCGFilter>('all');
  const [tradeFilter, setTradeFilter] = useState<TradeFilter>('all');

  const { data: collection, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['collection'],
    queryFn: fetchCollection,
  });

  const removeMutation = useMutation({
    mutationFn: removeCard,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['collection'] }),
  });

  const tradeMutation = useMutation({
    mutationFn: ({ id, for_trade }: { id: string; for_trade: boolean }) =>
      updateCard(id, { for_trade }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['collection'] }),
  });

  const filtered = (collection ?? []).filter((uc) => {
    if (tcgFilter !== 'all' && uc.card.tcg !== tcgFilter) return false;
    if (tradeFilter === 'for_trade' && !uc.for_trade) return false;
    return true;
  });

  const handleLongPress = (id: string, forTrade: boolean) => {
    Alert.alert('Carta', undefined, [
      {
        text: forTrade ? 'Rimuovi da scambio' : 'Metti in scambio',
        onPress: () => tradeMutation.mutate({ id, for_trade: !forTrade }),
      },
      {
        text: 'Elimina',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Conferma', 'Rimuovere questa carta dalla collezione?', [
            { text: 'Annulla', style: 'cancel' },
            { text: 'Elimina', style: 'destructive', onPress: () => removeMutation.mutate(id) },
          ]),
      },
      { text: 'Annulla', style: 'cancel' },
    ]);
  };

  return (
    <View className="flex-1 bg-dark-bg">
      {/* Filter bar */}
      <View className="bg-dark-card border-b border-dark-border px-4 py-3 gap-3">
        {/* TCG filter */}
        <View className="flex-row gap-2">
          {(['all', 'magic', 'pokemon'] as TCGFilter[]).map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => setTcgFilter(f)}
              className={`px-3 py-1.5 rounded-full ${tcgFilter === f ? 'bg-primary' : 'bg-dark-border'}`}
            >
              <Text className={`text-sm font-medium ${tcgFilter === f ? 'text-white' : 'text-dark-muted'}`}>
                {f === 'all' ? 'Tutti' : f === 'magic' ? '⚡ MTG' : '🔴 Pokémon'}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            onPress={() => setTradeFilter(tradeFilter === 'all' ? 'for_trade' : 'all')}
            className={`px-3 py-1.5 rounded-full ml-auto ${tradeFilter === 'for_trade' ? 'bg-green-600' : 'bg-dark-border'}`}
          >
            <Text className={`text-sm font-medium ${tradeFilter === 'for_trade' ? 'text-white' : 'text-dark-muted'}`}>
              ↔ Scambio
            </Text>
          </TouchableOpacity>
        </View>

        <Text className="text-dark-muted text-xs">
          {filtered.length} carta{filtered.length !== 1 ? 'e' : ''} trovate
        </Text>
      </View>

      {isLoading ? (
        <SkeletonGrid count={9} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="📭"
          title="Nessuna carta"
          description="Scansiona o aggiungi la tua prima carta"
          actionLabel="Scansiona carta"
          onAction={() => router.push('/(tabs)/scan')}
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 12 }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#6C63FF" />
          }
        >
          <View className="flex-row flex-wrap gap-3">
            {filtered.map((uc) => (
              <View key={uc.id} style={{ width: '30%' }}>
                <CardThumbnail
                  userCard={uc}
                  onPress={() => router.push(`/card/${uc.card.id}`)}
                />
                {/* Long press via TouchableOpacity overlay is handled inside CardThumbnail */}
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {/* FAB */}
      <TouchableOpacity
        className="absolute bottom-6 right-6 bg-primary w-14 h-14 rounded-full items-center justify-center shadow-lg"
        onPress={() => router.push('/(tabs)/scan')}
        activeOpacity={0.85}
      >
        <Text className="text-2xl">📷</Text>
      </TouchableOpacity>
    </View>
  );
}
