import { Tabs } from 'expo-router';
import { View, Text } from 'react-native';
import { colors } from '../../constants/colors';

function TabIcon({ emoji, label, focused }: { emoji: string; label: string; focused: boolean }) {
  return (
    <View className="items-center gap-0.5 pt-1">
      <Text style={{ fontSize: focused ? 22 : 20 }}>{emoji}</Text>
      <Text
        style={{
          fontSize: 10,
          color: focused ? colors.primary : colors.muted,
          fontWeight: focused ? '600' : '400',
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: 'bold' },
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          height: 70,
          paddingBottom: 8,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🏠" label="Home" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="collection"
        options={{
          title: 'Collezione',
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="📚" label="Collezione" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scansiona',
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="📷" label="Scan" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Mappa',
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🗺️" label="Mappa" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profilo',
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="👤" label="Profilo" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
