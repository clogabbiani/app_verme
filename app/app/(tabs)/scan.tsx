import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Modal,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { scanCard, addCard } from '../../services/collection';
import { Button } from '../../components/ui/Button';
import { TCGBadge } from '../../components/cards/TCGBadge';
import { ConditionBadge } from '../../components/cards/ConditionBadge';
import { ScanResult } from '../../types';
import { CONDITIONS, CONDITION_LABELS } from '../../constants/tcg';
import { Condition } from '../../types';
import { colors } from '../../constants/colors';

type TCGHint = 'magic' | 'pokemon' | undefined;

export default function ScanScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [tcgHint, setTcgHint] = useState<TCGHint>(undefined);
  const [condition, setCondition] = useState<Condition>('NM');
  const [quantity, setQuantity] = useState(1);
  const [forTrade, setForTrade] = useState(false);
  const [adding, setAdding] = useState(false);

  if (!permission) return <View className="flex-1 bg-dark-bg" />;

  if (!permission.granted) {
    return (
      <View className="flex-1 bg-dark-bg items-center justify-center px-8 gap-6">
        <Text className="text-5xl">📷</Text>
        <Text className="text-dark-text text-xl font-bold text-center">
          Permesso fotocamera necessario
        </Text>
        <Text className="text-dark-muted text-center">
          TCG Collector usa la fotocamera per riconoscere le tue carte
        </Text>
        <Button title="Concedi permesso" onPress={requestPermission} size="lg" />
      </View>
    );
  }

  const handleCapture = async () => {
    if (!cameraRef.current || scanning) return;
    setScanning(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        base64: false,
      });
      if (!photo) throw new Error('Foto non scattata');
      const result = await scanCard(photo.uri, tcgHint);
      setScanResult(result);
    } catch (err: unknown) {
      Alert.alert('Errore scan', err instanceof Error ? err.message : 'Riprovare');
    } finally {
      setScanning(false);
    }
  };

  const handleAddCard = async () => {
    if (!scanResult?.card) return;
    setAdding(true);
    try {
      await addCard({
        card_id: scanResult.card.id,
        quantity,
        condition,
        for_trade: forTrade,
      });
      await qc.invalidateQueries({ queryKey: ['collection'] });
      Alert.alert('Carta aggiunta!', `${scanResult.card.name} è ora nella tua collezione.`, [
        { text: 'OK', onPress: () => { setScanResult(null); router.push('/(tabs)/collection'); } },
        { text: 'Scansiona altra', onPress: () => setScanResult(null) },
      ]);
    } catch (err: unknown) {
      Alert.alert('Errore', err instanceof Error ? err.message : 'Aggiunta fallita');
    } finally {
      setAdding(false);
    }
  };

  return (
    <View className="flex-1 bg-dark-bg">
      {/* Camera */}
      <View className="flex-1 relative">
        <CameraView
          ref={cameraRef}
          style={{ flex: 1 }}
          facing="back"
          autofocus="on"
        >
          {/* Guide overlay */}
          <View className="flex-1 items-center justify-center">
            {/* Dark overlay with card cutout */}
            <View className="absolute inset-0 bg-black/40" />
            <View
              style={{
                width: 220,
                height: 308, // ~card aspect ratio 2.5:3.5
                borderRadius: 12,
                borderWidth: 2,
                borderColor: colors.primary,
                backgroundColor: 'transparent',
              }}
            >
              {/* Corner accents */}
              {[
                { top: -2, left: -2 },
                { top: -2, right: -2 },
                { bottom: -2, left: -2 },
                { bottom: -2, right: -2 },
              ].map((pos, i) => (
                <View
                  key={i}
                  style={{
                    position: 'absolute',
                    width: 20,
                    height: 20,
                    borderColor: colors.primary,
                    ...pos,
                    borderTopWidth: pos.top !== undefined ? 3 : 0,
                    borderBottomWidth: pos.bottom !== undefined ? 3 : 0,
                    borderLeftWidth: pos.left !== undefined ? 3 : 0,
                    borderRightWidth: pos.right !== undefined ? 3 : 0,
                    borderTopLeftRadius: pos.top !== undefined && pos.left !== undefined ? 4 : 0,
                    borderTopRightRadius: pos.top !== undefined && pos.right !== undefined ? 4 : 0,
                    borderBottomLeftRadius: pos.bottom !== undefined && pos.left !== undefined ? 4 : 0,
                    borderBottomRightRadius: pos.bottom !== undefined && pos.right !== undefined ? 4 : 0,
                  }}
                />
              ))}
            </View>
            <Text className="text-white/80 text-sm mt-4 font-medium">
              Inquadra la carta nel riquadro
            </Text>
          </View>
        </CameraView>
      </View>

      {/* Controls */}
      <View className="bg-dark-card border-t border-dark-border px-5 py-4 gap-4">
        {/* TCG hint */}
        <View className="flex-row gap-2 items-center">
          <Text className="text-dark-muted text-sm">Tipo:</Text>
          {(['magic', 'pokemon', undefined] as TCGHint[]).map((hint) => (
            <TouchableOpacity
              key={String(hint)}
              onPress={() => setTcgHint(hint)}
              className={`px-3 py-1.5 rounded-full ${tcgHint === hint ? 'bg-primary' : 'bg-dark-border'}`}
            >
              <Text className={`text-sm ${tcgHint === hint ? 'text-white' : 'text-dark-muted'}`}>
                {hint === 'magic' ? '⚡ MTG' : hint === 'pokemon' ? '🔴 Pokémon' : 'Auto'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Capture button */}
        <TouchableOpacity
          className="bg-primary rounded-full h-16 w-16 items-center justify-center self-center"
          onPress={handleCapture}
          disabled={scanning}
          activeOpacity={0.8}
        >
          {scanning ? (
            <ActivityIndicator color="white" />
          ) : (
            <View className="w-12 h-12 rounded-full border-4 border-white/60 bg-white/20" />
          )}
        </TouchableOpacity>
      </View>

      {/* Result modal */}
      <Modal
        visible={scanResult !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setScanResult(null)}
      >
        <View className="flex-1 bg-dark-bg">
          {scanResult?.recognized && scanResult.card ? (
            <ScrollView contentContainerStyle={{ padding: 24, gap: 20 }}>
              {/* Card preview */}
              <View className="items-center gap-3">
                <Text className="text-dark-text text-xl font-bold">Carta riconosciuta ✅</Text>
                {scanResult.card.image_url ? (
                  <Image
                    source={{ uri: scanResult.card.image_url }}
                    style={{ width: 180, height: 252, borderRadius: 8 }}
                    resizeMode="contain"
                  />
                ) : (
                  <View className="w-44 h-64 bg-dark-card rounded-xl items-center justify-center">
                    <Text className="text-5xl">🃏</Text>
                  </View>
                )}
              </View>

              {/* Card info */}
              <View className="bg-dark-card rounded-xl p-4 gap-3">
                <View className="flex-row items-start justify-between">
                  <Text className="text-dark-text text-lg font-bold flex-1 mr-2">
                    {scanResult.card.name}
                  </Text>
                  <TCGBadge tcg={scanResult.card.tcg} size="md" />
                </View>
                <View className="gap-1.5">
                  <Row label="Set" value={scanResult.card.set_name} />
                  <Row label="Rarità" value={scanResult.card.rarity} />
                  <Row label="N°" value={scanResult.card.collector_number} />
                  {scanResult.card.market_price_eur != null && (
                    <Row label="Prezzo mercato" value={`€${scanResult.card.market_price_eur.toFixed(2)}`} highlight />
                  )}
                </View>
              </View>

              {/* Condition picker */}
              <View className="gap-2">
                <Text className="text-dark-text font-semibold">Condizione</Text>
                <View className="flex-row flex-wrap gap-2">
                  {CONDITIONS.map((c) => (
                    <TouchableOpacity
                      key={c}
                      onPress={() => setCondition(c)}
                      className={`px-3 py-2 rounded-xl border ${condition === c ? 'border-primary bg-primary/20' : 'border-dark-border'}`}
                    >
                      <Text className={`text-sm font-medium ${condition === c ? 'text-primary' : 'text-dark-muted'}`}>
                        {c} — {CONDITION_LABELS[c]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Quantity */}
              <View className="flex-row items-center gap-4">
                <Text className="text-dark-text font-semibold">Quantità</Text>
                <View className="flex-row items-center gap-3 bg-dark-card rounded-xl px-3 py-2">
                  <TouchableOpacity onPress={() => setQuantity(Math.max(1, quantity - 1))}>
                    <Text className="text-dark-text text-xl font-bold w-6 text-center">−</Text>
                  </TouchableOpacity>
                  <Text className="text-dark-text text-lg font-bold w-8 text-center">{quantity}</Text>
                  <TouchableOpacity onPress={() => setQuantity(quantity + 1)}>
                    <Text className="text-dark-text text-xl font-bold w-6 text-center">+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* For trade toggle */}
              <TouchableOpacity
                className={`flex-row items-center gap-3 p-4 rounded-xl border ${forTrade ? 'border-green-500 bg-green-500/10' : 'border-dark-border bg-dark-card'}`}
                onPress={() => setForTrade(!forTrade)}
              >
                <Text className="text-2xl">{forTrade ? '✅' : '⬜'}</Text>
                <View>
                  <Text className={`font-semibold ${forTrade ? 'text-green-400' : 'text-dark-text'}`}>
                    Disponibile per scambio
                  </Text>
                  <Text className="text-dark-muted text-sm">
                    Visibile agli altri trader nella mappa
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Actions */}
              <View className="gap-3 pb-8">
                <Button title="Aggiungi alla collezione" onPress={handleAddCard} loading={adding} size="lg" />
                <Button title="Riprova scan" onPress={() => setScanResult(null)} variant="outline" />
              </View>
            </ScrollView>
          ) : (
            /* Not recognized */
            <View className="flex-1 items-center justify-center px-8 gap-6">
              <Text className="text-5xl">❓</Text>
              <Text className="text-dark-text text-xl font-bold text-center">
                Carta non riconosciuta
              </Text>
              <Text className="text-dark-muted text-center">
                {scanResult?.message ?? 'Non siamo riusciti a identificare questa carta. Prova a migliorare l\'illuminazione o specifica il tipo di TCG.'}
              </Text>
              <Button title="Riprova" onPress={() => setScanResult(null)} size="lg" />
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View className="flex-row justify-between">
      <Text className="text-dark-muted text-sm">{label}</Text>
      <Text className={`text-sm font-medium ${highlight ? 'text-primary' : 'text-dark-text'}`}>
        {value}
      </Text>
    </View>
  );
}
