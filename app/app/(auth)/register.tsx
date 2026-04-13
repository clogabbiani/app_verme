import React, { useState } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { signUp } from '../../services/auth';

export default function RegisterScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    username?: string;
    email?: string;
    password?: string;
  }>({});

  const validate = () => {
    const e: typeof errors = {};
    if (username.length < 3) e.username = 'Minimo 3 caratteri';
    if (!email.includes('@')) e.email = 'Email non valida';
    if (password.length < 6) e.password = 'Minimo 6 caratteri';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await signUp(email.trim(), password, username.trim());
      Alert.alert(
        'Registrazione completata',
        'Controlla la tua email per confermare il tuo account.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (err: unknown) {
      Alert.alert('Errore', err instanceof Error ? err.message : 'Registrazione fallita');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-dark-bg"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 justify-center px-6 gap-8">
          <View className="gap-2">
            <Text className="text-dark-text text-3xl font-bold">Crea account</Text>
            <Text className="text-dark-muted text-base">
              Inizia a costruire la tua collezione
            </Text>
          </View>

          <View className="gap-4">
            <Input
              label="Username"
              placeholder="il_tuo_nickname"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              error={errors.username}
            />
            <Input
              label="Email"
              placeholder="tu@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              error={errors.email}
            />
            <Input
              label="Password"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              error={errors.password}
            />
            <Button
              title="Crea account"
              onPress={handleRegister}
              loading={loading}
              size="lg"
            />
          </View>

          <View className="flex-row justify-center gap-1">
            <Text className="text-dark-muted">Hai già un account?</Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text className="text-primary font-semibold">Accedi</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
