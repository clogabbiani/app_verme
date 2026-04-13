import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  TextInput,
  Image,
} from 'react-native';
import { TraderNearby, UserCard } from '../../types';
import { TCGBadge } from '../cards/TCGBadge';
import { ConditionBadge } from '../cards/ConditionBadge';
import { Button } from '../ui/Button';
import { createTrade } from '../../services/trades';
import { fetchCollection } from '../../services/collection';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { colors } from '../../constants/colors';

interface TraderSheetProps {
  trader: TraderNearby | null;
  onClose: () => void;
}

export function TraderSheet({ trader, onClose }: TraderSheetProps) {
  const qc = useQueryClient();
  const [proposingTrade, setProposingTrade] = useState(false);
  const [selectedMyCards, setSelectedMyCards] = useState<string[]>([]);
  const [selectedTheirCards, setSelectedTheirCards] = useState<string[]>([]);
  const [message, setMessage] = useState('');

  const { data: myCollection } = useQuery({
    queryKey: ['collection'],
    queryFn: fetchCollection,
    enabled: proposingTrade,
  });

  const tradeMutation = useMutation({
    mutationFn: createTrade,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trades'] });
      Alert.alert('Offerta inviata!', 'Il trader riceverà la tua proposta di scambio.');
      setProposingTrade(false);
      onClose();
    },
    onError: (err: Error) => Alert.alert('Errore', err.message),
  });

  if (!trader) return null;

  const toggleMyCard = (id: string) => {
    setSelectedMyCards((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleTheirCard = (id: string) => {
    setSelectedTheirCards((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSendTrade = () => {
    if (selectedMyCards.length === 0 && selectedTheirCards.length === 0) {
      Alert.alert('Attenzione', 'Seleziona almeno una carta da scambiare');
      return;
    }
    tradeMutation.mutate({
      receiver_id: trader.user_id,
      sender_cards: selectedMyCards,
      receiver_cards: selectedTheirCards,
      message: message.trim() || undefined,
    });
  };

  return (
    <Modal
      visible={true}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-dark-bg">
        {/* Header */}
        <View className="bg-dark-card border-b border-dark-border px-5 py-4 flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <View className="w-10 h-10 bg-primary/30 rounded-full items-center justify-center">
              <Text className="text-primary font-bold text-lg">
                {trader.username[0].toUpperCase()}
              </Text>
            </View>
            <View>
              <Text className="text-dark-text font-bold text-base">{trader.username}</Text>
              <Text className="text-dark-muted text-sm">
                {trader.distance_km.toFixed(1)} km · {trader.card_count} carte
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose}>
            <Text className="text-dark-muted text-2xl">✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}>
          {/* Their cards for trade */}
          <View className="gap-3">
            <Text className="text-dark-text font-bold text-base">
              Carte disponibili per scambio
            </Text>
            {trader.preview_cards.length === 0 ? (
              <Text className="text-dark-muted text-sm">Nessuna carta disponibile</Text>
            ) : (
              trader.preview_cards.map((uc) => (
                <TradeCardRow
                  key={uc.id}
                  userCard={uc}
                  selected={selectedTheirCards.includes(uc.id)}
                  onToggle={() => toggleTheirCard(uc.id)}
                  showSelect={proposingTrade}
                />
              ))
            )}
          </View>

          {!proposingTrade ? (
            <Button
              title="Proponi scambio / incontro"
              onPress={() => setProposingTrade(true)}
              size="lg"
            />
          ) : (
            <>
              {/* My cards to offer */}
              <View className="gap-3">
                <Text className="text-dark-text font-bold text-base">
                  Le mie carte da offrire
                </Text>
                {(myCollection ?? [])
                  .filter((uc) => uc.for_trade)
                  .map((uc) => (
                    <TradeCardRow
                      key={uc.id}
                      userCard={uc}
                      selected={selectedMyCards.includes(uc.id)}
                      onToggle={() => toggleMyCard(uc.id)}
                      showSelect
                    />
                  ))}
                {(myCollection ?? []).filter((uc) => uc.for_trade).length === 0 && (
                  <Text className="text-dark-muted text-sm">
                    Nessuna carta segnata per scambio. Vai nella collezione e attiva "per scambio".
                  </Text>
                )}
              </View>

              {/* Message */}
              <View className="gap-2">
                <Text className="text-dark-text font-semibold">Messaggio (opzionale)</Text>
                <TextInput
                  value={message}
                  onChangeText={setMessage}
                  placeholder="Es: Possiamo incontrarci sabato?"
                  placeholderTextColor={colors.muted}
                  multiline
                  numberOfLines={3}
                  className="bg-dark-card border border-dark-border rounded-xl px-4 py-3 text-dark-text"
                  style={{ textAlignVertical: 'top' }}
                />
              </View>

              <View className="gap-3 pb-8">
                <Button
                  title="Invia proposta"
                  onPress={handleSendTrade}
                  loading={tradeMutation.isPending}
                  size="lg"
                />
                <Button
                  title="Annulla"
                  variant="ghost"
                  onPress={() => setProposingTrade(false)}
                />
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

function TradeCardRow({
  userCard,
  selected,
  onToggle,
  showSelect,
}: {
  userCard: UserCard;
  selected: boolean;
  onToggle: () => void;
  showSelect: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={showSelect ? onToggle : undefined}
      className={`flex-row items-center gap-3 p-3 rounded-xl border ${selected ? 'border-primary bg-primary/10' : 'border-dark-border bg-dark-card'}`}
      activeOpacity={showSelect ? 0.7 : 1}
    >
      {userCard.card.image_thumbnail_url ? (
        <Image
          source={{ uri: userCard.card.image_thumbnail_url }}
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
          {userCard.card.name}
        </Text>
        <Text className="text-dark-muted text-xs">{userCard.card.set_name}</Text>
        <View className="flex-row gap-1.5 items-center">
          <TCGBadge tcg={userCard.card.tcg} />
          <ConditionBadge condition={userCard.condition} />
          {userCard.card.market_price_eur != null && (
            <Text className="text-primary text-xs font-medium">
              €{userCard.card.market_price_eur.toFixed(2)}
            </Text>
          )}
        </View>
      </View>
      {showSelect && (
        <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${selected ? 'border-primary bg-primary' : 'border-dark-border'}`}>
          {selected && <Text className="text-white text-xs">✓</Text>}
        </View>
      )}
    </TouchableOpacity>
  );
}
