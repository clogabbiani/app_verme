import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { fetchTrades } from '../../services/trades';
import { useAuthStore } from '../../store/authStore';
import { EmptyState } from '../../components/ui/EmptyState';
import { TradeOffer } from '../../types';

const STATUS_CONFIG = {
  pending: { emoji: '⏳', color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  accepted: { emoji: '✅', color: 'text-green-400', bg: 'bg-green-400/10' },
  rejected: { emoji: '❌', color: 'text-red-400', bg: 'bg-red-400/10' },
  cancelled: { emoji: '🚫', color: 'text-dark-muted', bg: 'bg-dark-border' },
};

export default function TradeListScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const { data: trades, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['trades'],
    queryFn: fetchTrades,
  });

  if (isLoading) {
    return (
      <View className="flex-1 bg-dark-bg items-center justify-center">
        <Text className="text-dark-muted">Caricamento scambi...</Text>
      </View>
    );
  }

  if (!trades || trades.length === 0) {
    return (
      <EmptyState
        icon="↔️"
        title="Nessuno scambio"
        description="Le tue proposte di scambio appariranno qui"
        actionLabel="Trova trader"
        onAction={() => router.push('/(tabs)/map')}
      />
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-dark-bg"
      contentContainerStyle={{ padding: 16, gap: 12 }}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#6C63FF" />
      }
    >
      {trades.map((trade) => (
        <TradeRow key={trade.id} trade={trade} myId={user?.id ?? ''} />
      ))}
    </ScrollView>
  );
}

function TradeRow({ trade, myId }: { trade: TradeOffer; myId: string }) {
  const router = useRouter();
  const isSender = trade.sender_id === myId;
  const config = STATUS_CONFIG[trade.status];

  return (
    <TouchableOpacity
      className="bg-dark-card rounded-xl p-4 border border-dark-border gap-3"
      onPress={() => router.push(`/trade/${trade.id}`)}
      activeOpacity={0.8}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Text className="text-lg">{config.emoji}</Text>
          <Text className="text-dark-text font-semibold">
            {isSender ? 'Offerta inviata' : 'Offerta ricevuta'}
          </Text>
        </View>
        <View className={`px-2 py-1 rounded-full ${config.bg}`}>
          <Text className={`text-xs font-medium ${config.color}`}>
            {trade.status === 'pending' ? 'In attesa' :
             trade.status === 'accepted' ? 'Accettata' :
             trade.status === 'rejected' ? 'Rifiutata' : 'Annullata'}
          </Text>
        </View>
      </View>
      <View className="flex-row justify-between">
        <Text className="text-dark-muted text-sm">
          {trade.sender_cards.length} → {trade.receiver_cards.length} carte
        </Text>
        <Text className="text-dark-muted text-xs">
          {new Date(trade.created_at).toLocaleDateString('it-IT')}
        </Text>
      </View>
      {trade.message && (
        <Text className="text-dark-muted text-sm italic" numberOfLines={1}>
          "{trade.message}"
        </Text>
      )}
    </TouchableOpacity>
  );
}
