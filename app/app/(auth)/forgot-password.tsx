import React, { useState } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../services/supabase';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async () => {
    if (!email.includes('@')) {
      Alert.alert('Errore', 'Inserisci un indirizzo email valido');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: 'tcgcollector://reset-password',
      });
      if (error) throw error;
      setSent(true);
    } catch (err: unknown) {
      Alert.alert('Errore', err instanceof Error ? err.message : 'Riprova');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <View className="flex-1 bg-dark-bg items-center justify-center px-8 gap-6">
        <Text className="text-5xl">📧</Text>
        <Text className="text-dark-text text-2xl font-bold text-center">
          Email inviata!
        </Text>
        <Text className="text-dark-muted text-base text-center">
          Controlla la tua casella di posta e clicca il link per reimpostare la password.
        </Text>
        <Button title="Torna al login" onPress={() => router.replace('/(auth)/login')} size="lg" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-dark-bg"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View className="flex-1 justify-center px-6 gap-8">
        <View className="gap-2">
          <Text className="text-dark-text text-3xl font-bold">Password dimenticata?</Text>
          <Text className="text-dark-muted text-base">
            Inserisci la tua email e ti mandiamo un link per reimpostarla.
          </Text>
        </View>

        <View className="gap-4">
          <Input
            label="Email"
            placeholder="tu@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          <Button title="Invia link di reset" onPress={handleReset} loading={loading} size="lg" />
        </View>

        <TouchableOpacity onPress={() => router.back()} className="items-center">
          <Text className="text-primary font-semibold">← Torna al login</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
