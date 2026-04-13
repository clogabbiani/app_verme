import React from 'react';
import { View, Text, ScrollView, Alert, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchTrade, acceptTrade, rejectTrade, cancelTrade } from '../../services/trades';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';
import { TCGBadge } from '../../components/cards/TCGBadge';
import { ConditionBadge } from '../../components/cards/ConditionBadge';
import { fetchCollection } from '../../services/collection';
import { UserCard } from '../../types';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'In attesa', color: 'text-yellow-400' },
  accepted: { label: 'Accettata', color: 'text-green-400' },
  rejected: { label: 'Rifiutata', color: 'text-red-400' },
  cancelled: { label: 'Annullata', color: 'text-dark-muted' },
};

export default function TradeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { user } = useAuthStore();

  const { data: trade, isLoading } = useQuery({
    queryKey: ['trade', id],
    queryFn: () => fetchTrade(id),
  });

  const { data: collection } = useQuery({
    queryKey: ['collection'],
    queryFn: fetchCollection,
  });

  const acceptMutation = useMutation({
    mutationFn: () => acceptTrade(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trade', id] });
      qc.invalidateQueries({ queryKey: ['trades'] });
      Alert.alert('Scambio accettato!', 'Contatta il trader per organizzare l\'incontro.');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () => rejectTrade(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trade', id] });
      qc.invalidateQueries({ queryKey: ['trades'] });
      router.back();
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelTrade(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trade', id] });
      qc.invalidateQueries({ queryKey: ['trades'] });
      router.back();
    },
  });

  if (isLoading || !trade) {
    return (
      <View className="flex-1 bg-dark-bg items-center justify-center">
        <Text className="text-dark-muted">Caricamento...</Text>
      </View>
    );
  }

  const isSender = trade.sender_id === user?.id;
  const statusInfo = STATUS_LABELS[trade.status];

  // Find cards from our collection
  const getCards = (ids: string[]): UserCard[] => {
    return (collection ?? []).filter((uc) => ids.includes(uc.id));
  };

  const senderCards = getCards(trade.sender_cards);
  const receiverCards = getCards(trade.receiver_cards);

  return (
    <ScrollView className="flex-1 bg-dark-bg" contentContainerStyle={{ padding: 20, gap: 20 }}>
      {/* Status header */}
      <View className="bg-dark-card rounded-xl p-4 gap-2">
        <View className="flex-row justify-between items-center">
          <Text className="text-dark-muted text-sm">Stato offerta</Text>
          <Text className={`font-bold ${statusInfo.color}`}>{statusInfo.label}</Text>
        </View>
        <View className="flex-row justify-between">
          <Text className="text-dark-muted text-sm">
            {isSender ? 'Inviata da te' : 'Ricevuta da ' + (trade.sender?.username ?? 'un trader')}
          </Text>
          <Text className="text-dark-muted text-sm">
            {new Date(trade.created_at).toLocaleDateString('it-IT')}
          </Text>
        </View>
        {trade.message && (
          <View className="bg-dark-border rounded-lg p-3 mt-1">
            <Text className="text-dark-muted text-xs mb-1">Messaggio</Text>
            <Text className="text-dark-text text-sm">"{trade.message}"</Text>
          </View>
        )}
      </View>

      {/* Sender cards */}
      {senderCards.length > 0 && (
        <CardSection
          title={isSender ? 'Le tue carte' : 'Carte offerte'}
          cards={senderCards}
        />
      )}

      {/* Receiver cards */}
      {receiverCards.length > 0 && (
        <CardSection
          title={isSender ? 'Carte richieste' : 'Le tue carte richieste'}
          cards={receiverCards}
        />
      )}

      {/* Actions */}
      {trade.status === 'pending' && (
        <View className="gap-3 pb-8">
          {!isSender && (
            <Button
              title="Accetta scambio"
              onPress={() => acceptMutation.mutate()}
              loading={acceptMutation.isPending}
              size="lg"
            />
          )}
          <Button
            title={isSender ? 'Annulla offerta' : 'Rifiuta offerta'}
            variant="outline"
            onPress={() => {
              const fn = isSender ? cancelMutation : rejectMutation;
              Alert.alert(
                isSender ? 'Annulla' : 'Rifiuta',
                'Sei sicuro?',
                [
                  { text: 'No', style: 'cancel' },
                  { text: 'Sì', style: 'destructive', onPress: () => fn.mutate() },
                ]
              );
            }}
            loading={cancelMutation.isPending || rejectMutation.isPending}
          />
        </View>
      )}
    </ScrollView>
  );
}

function CardSection({ title, cards }: { title: string; cards: UserCard[] }) {
  return (
    <View className="gap-3">
      <Text className="text-dark-text font-bold">{title}</Text>
      {cards.map((uc) => (
        <View key={uc.id} className="flex-row items-center gap-3 bg-dark-card p-3 rounded-xl border border-dark-border">
          {uc.card.image_thumbnail_url ? (
            <Image
              source={{ uri: uc.card.image_thumbnail_url }}
              style={{ width: 40, height: 56, borderRadius: 4 }}
              resizeMode="cover"
            />
          ) : (
            <View className="w-10 h-14 bg-dark-border rounded items-center justify-center">
              <Text className="text-xl">🃏</Text>
            </View>
          )}
          <View className="flex-1 gap-1">
            <Text className="text-dark-text font-semibold text-sm" numberOfLines={1}>
              {uc.card.name}
            </Text>
            <Text className="text-dark-muted text-xs">{uc.card.set_name}</Text>
            <View className="flex-row gap-1.5 items-center">
              <TCGBadge tcg={uc.card.tcg} />
              <ConditionBadge condition={uc.condition} />
              {uc.card.market_price_eur != null && (
                <Text className="text-primary text-xs font-medium">
                  €{uc.card.market_price_eur.toFixed(2)}
                </Text>
              )}
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}
