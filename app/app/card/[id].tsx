import React, { useState } from 'react';
import { View, Text, ScrollView, Image, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchCollection, updateCard, removeCard } from '../../services/collection';
import { TCGBadge } from '../../components/cards/TCGBadge';
import { ConditionBadge } from '../../components/cards/ConditionBadge';
import { Button } from '../../components/ui/Button';
import { CONDITIONS, CONDITION_LABELS } from '../../constants/tcg';
import { Condition } from '../../types';
import { TouchableOpacity } from 'react-native';

export default function CardDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: collection } = useQuery({
    queryKey: ['collection'],
    queryFn: fetchCollection,
  });

  const userCard = collection?.find((uc) => uc.card.id === id);

  const updateMutation = useMutation({
    mutationFn: ({ field, value }: { field: string; value: unknown }) =>
      updateCard(userCard!.id, { [field]: value }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['collection'] }),
  });

  const removeMutation = useMutation({
    mutationFn: () => removeCard(userCard!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collection'] });
      router.back();
    },
  });

  if (!userCard) {
    return (
      <View className="flex-1 bg-dark-bg items-center justify-center">
        <Text className="text-dark-muted">Carta non trovata</Text>
      </View>
    );
  }

  const { card } = userCard;

  const handleRemove = () => {
    Alert.alert('Elimina carta', 'Rimuovere questa carta dalla tua collezione?', [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Elimina',
        style: 'destructive',
        onPress: () => removeMutation.mutate(),
      },
    ]);
  };

  return (
    <ScrollView className="flex-1 bg-dark-bg" contentContainerStyle={{ padding: 20, gap: 20 }}>
      {/* Card image */}
      <View className="items-center">
        {card.image_url ? (
          <Image
            source={{ uri: card.image_url }}
            style={{ width: 220, height: 308, borderRadius: 12 }}
            resizeMode="contain"
          />
        ) : (
          <View className="w-56 h-80 bg-dark-card rounded-xl items-center justify-center">
            <Text className="text-6xl">🃏</Text>
          </View>
        )}
      </View>

      {/* Card details */}
      <View className="bg-dark-card rounded-xl p-4 gap-3">
        <View className="flex-row items-start justify-between gap-2">
          <Text className="text-dark-text text-xl font-bold flex-1">{card.name}</Text>
          <TCGBadge tcg={card.tcg} size="md" />
        </View>
        <InfoRow label="Set" value={card.set_name} />
        <InfoRow label="Rarità" value={card.rarity} />
        <InfoRow label="Numero" value={`${card.collector_number} · ${card.set_code}`} />
        {card.market_price_eur != null && (
          <InfoRow label="Prezzo mercato" value={`€${card.market_price_eur.toFixed(2)}`} highlight />
        )}
        {userCard.personal_price_eur != null && (
          <InfoRow label="Il mio prezzo" value={`€${userCard.personal_price_eur.toFixed(2)}`} />
        )}
      </View>

      {/* My ownership info */}
      <View className="bg-dark-card rounded-xl p-4 gap-4">
        <Text className="text-dark-text font-bold">La mia copia</Text>

        {/* Quantity */}
        <View className="flex-row items-center justify-between">
          <Text className="text-dark-muted">Quantità</Text>
          <View className="flex-row items-center gap-3">
            <TouchableOpacity
              onPress={() =>
                updateMutation.mutate({ field: 'quantity', value: Math.max(1, userCard.quantity - 1) })
              }
              className="w-8 h-8 bg-dark-border rounded-full items-center justify-center"
            >
              <Text className="text-dark-text font-bold">−</Text>
            </TouchableOpacity>
            <Text className="text-dark-text font-bold text-lg w-8 text-center">
              {userCard.quantity}
            </Text>
            <TouchableOpacity
              onPress={() =>
                updateMutation.mutate({ field: 'quantity', value: userCard.quantity + 1 })
              }
              className="w-8 h-8 bg-dark-border rounded-full items-center justify-center"
            >
              <Text className="text-dark-text font-bold">+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Condition */}
        <View className="gap-2">
          <Text className="text-dark-muted">Condizione</Text>
          <View className="flex-row flex-wrap gap-2">
            {CONDITIONS.map((c: Condition) => (
              <TouchableOpacity
                key={c}
                onPress={() => updateMutation.mutate({ field: 'condition', value: c })}
                className={`px-3 py-1.5 rounded-xl border ${userCard.condition === c ? 'border-primary bg-primary/20' : 'border-dark-border'}`}
              >
                <Text className={`text-xs font-medium ${userCard.condition === c ? 'text-primary' : 'text-dark-muted'}`}>
                  {c} — {CONDITION_LABELS[c]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Foil toggle */}
        <TouchableOpacity
          className={`flex-row items-center gap-3 p-3 rounded-xl border ${userCard.foil ? 'border-yellow-500 bg-yellow-500/10' : 'border-dark-border'}`}
          onPress={() => updateMutation.mutate({ field: 'foil', value: !userCard.foil })}
        >
          <Text className="text-xl">{userCard.foil ? '✨' : '⬜'}</Text>
          <Text className={`font-medium ${userCard.foil ? 'text-yellow-400' : 'text-dark-muted'}`}>
            Versione foil
          </Text>
        </TouchableOpacity>

        {/* For trade toggle */}
        <TouchableOpacity
          className={`flex-row items-center gap-3 p-3 rounded-xl border ${userCard.for_trade ? 'border-green-500 bg-green-500/10' : 'border-dark-border'}`}
          onPress={() => updateMutation.mutate({ field: 'for_trade', value: !userCard.for_trade })}
        >
          <Text className="text-xl">{userCard.for_trade ? '✅' : '⬜'}</Text>
          <Text className={`font-medium ${userCard.for_trade ? 'text-green-400' : 'text-dark-muted'}`}>
            Disponibile per scambio
          </Text>
        </TouchableOpacity>
      </View>

      {/* Delete */}
      <Button
        title="Rimuovi dalla collezione"
        variant="outline"
        onPress={handleRemove}
        loading={removeMutation.isPending}
      />
    </ScrollView>
  );
}

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View className="flex-row justify-between items-center">
      <Text className="text-dark-muted text-sm">{label}</Text>
      <Text className={`text-sm font-medium ${highlight ? 'text-primary' : 'text-dark-text'}`}>
        {value}
      </Text>
    </View>
  );
}
