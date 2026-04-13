import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from '../../hooks/useLocation';
import { fetchNearbyTraders } from '../../services/map';
import { TraderSheet } from '../../components/map/TraderSheet';
import { TraderNearby, TCG } from '../../types';
import { colors } from '../../constants/colors';

type TCGFilter = TCG | 'all';

const TCG_COLORS: Record<TCG, string> = {
  magic: colors.magic,
  pokemon: colors.pokemon,
};

export default function MapScreen() {
  const { coords, error: locationError, loading: locationLoading } = useLocation();
  const [tcgFilter, setTcgFilter] = useState<TCGFilter>('all');
  const [selectedTrader, setSelectedTrader] = useState<TraderNearby | null>(null);

  const { data: traders, isLoading } = useQuery({
    queryKey: ['traders', coords?.lat, coords?.lng, tcgFilter],
    queryFn: () =>
      fetchNearbyTraders(coords!.lat, coords!.lng, 20, tcgFilter !== 'all' ? tcgFilter : undefined),
    enabled: !!coords,
  });

  if (locationLoading) {
    return (
      <View className="flex-1 bg-dark-bg items-center justify-center gap-4">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="text-dark-muted">Rilevamento posizione...</Text>
      </View>
    );
  }

  if (locationError || !coords) {
    return (
      <View className="flex-1 bg-dark-bg items-center justify-center px-8 gap-4">
        <Text className="text-4xl">📍</Text>
        <Text className="text-dark-text text-lg font-bold text-center">
          Posizione non disponibile
        </Text>
        <Text className="text-dark-muted text-center">
          {locationError ?? 'Abilita i servizi di localizzazione nelle impostazioni'}
        </Text>
      </View>
    );
  }

  // Determine pin color per trader (majority TCG)
  const getPinColor = (trader: TraderNearby) => {
    const magicCount = trader.preview_cards.filter((c) => c.card.tcg === 'magic').length;
    const pokemonCount = trader.preview_cards.filter((c) => c.card.tcg === 'pokemon').length;
    if (magicCount > pokemonCount) return TCG_COLORS.magic;
    if (pokemonCount > magicCount) return TCG_COLORS.pokemon;
    return colors.primary; // mixed
  };

  return (
    <View className="flex-1">
      {/* TCG Filter bar */}
      <View className="absolute top-4 left-0 right-0 z-10 px-4">
        <View className="bg-dark-card/95 rounded-2xl p-2 flex-row gap-2">
          {(['all', 'magic', 'pokemon'] as TCGFilter[]).map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => setTcgFilter(f)}
              className={`flex-1 py-2 rounded-xl ${tcgFilter === f ? 'bg-primary' : ''}`}
            >
              <Text className={`text-xs font-semibold text-center ${tcgFilter === f ? 'text-white' : 'text-dark-muted'}`}>
                {f === 'all' ? 'Tutti' : f === 'magic' ? '⚡ MTG' : '🔴 Pokémon'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <MapView
        style={{ flex: 1 }}
        initialRegion={{
          latitude: coords.lat,
          longitude: coords.lng,
          latitudeDelta: 0.3,
          longitudeDelta: 0.3,
        }}
        mapType="standard"
        userInterfaceStyle="dark"
        showsUserLocation
        showsMyLocationButton
      >
        {/* Radius circle */}
        <Circle
          center={{ latitude: coords.lat, longitude: coords.lng }}
          radius={20000} // 20km
          strokeColor={colors.primary + '40'}
          fillColor={colors.primary + '08'}
          strokeWidth={1}
        />

        {/* Trader markers */}
        {(traders ?? []).map((trader) => (
          <Marker
            key={trader.user_id}
            coordinate={{
              latitude: coords.lat + (Math.random() - 0.5) * 0.01, // placeholder — real coords from backend
              longitude: coords.lng + (Math.random() - 0.5) * 0.01,
            }}
            onPress={() => setSelectedTrader(trader)}
          >
            <View
              style={{
                backgroundColor: getPinColor(trader),
                borderRadius: 20,
                padding: 8,
                borderWidth: 2,
                borderColor: 'white',
              }}
            >
              <Text style={{ fontSize: 14 }}>
                {trader.preview_cards[0]?.card.tcg === 'magic' ? '⚡' : '🔴'}
              </Text>
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Loading overlay */}
      {isLoading && (
        <View className="absolute bottom-20 left-0 right-0 items-center">
          <View className="bg-dark-card/90 rounded-full px-4 py-2 flex-row gap-2 items-center">
            <ActivityIndicator size="small" color={colors.primary} />
            <Text className="text-dark-muted text-sm">Ricerca trader...</Text>
          </View>
        </View>
      )}

      {/* Trader count badge */}
      {!isLoading && traders && traders.length > 0 && (
        <View className="absolute bottom-20 left-0 right-0 items-center">
          <View className="bg-dark-card/90 rounded-full px-4 py-2">
            <Text className="text-dark-text text-sm font-medium">
              {traders.length} trader{traders.length !== 1 ? 's' : ''} nel raggio di 20 km
            </Text>
          </View>
        </View>
      )}

      {/* Trader sheet */}
      <TraderSheet
        trader={selectedTrader}
        onClose={() => setSelectedTrader(null)}
      />
    </View>
  );
}
