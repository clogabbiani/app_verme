import React, { useState } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../services/supabase';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (password.length < 6) {
      Alert.alert('Errore', 'La password deve essere di almeno 6 caratteri');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Errore', 'Le password non coincidono');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      Alert.alert('Fatto!', 'Password aggiornata con successo.', [
        { text: 'OK', onPress: () => router.replace('/(tabs)') },
      ]);
    } catch (err: unknown) {
      Alert.alert('Errore', err instanceof Error ? err.message : 'Riprova');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-dark-bg"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View className="flex-1 justify-center px-6 gap-8">
        <View className="gap-2">
          <Text className="text-dark-text text-3xl font-bold">Nuova password</Text>
          <Text className="text-dark-muted text-base">Scegli una nuova password sicura.</Text>
        </View>

        <View className="gap-4">
          <Input
            label="Nuova password"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <Input
            label="Conferma password"
            placeholder="••••••••"
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
          />
          <Button title="Aggiorna password" onPress={handleReset} loading={loading} size="lg" />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
