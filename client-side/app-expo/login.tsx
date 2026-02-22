import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { router, Stack } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import AnimatedBackground from '@/components/AnimatedBackground';
import AnimatedInput from '@/components/AnimatedInput';
import AnimatedButton from '@/components/AnimatedButton';
import ThemeToggle from '@/components/ThemeToggle';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Lock, ArrowLeft, Chrome } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

export default function LoginScreen() {
  const { theme, themeName } = useTheme();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const titleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(200, [
      Animated.timing(titleAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [fadeAnim, slideAnim, titleAnim]);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await login(email, password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/chat');
    } catch {
      setError('Login failed. Please try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleGooglePress = () => {
    // UI-only button as requested (no OAuth configured)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setError('Google login coming soon.');
  };

  return (
    <AnimatedBackground>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <ArrowLeft color={theme.text} size={24} />
            </TouchableOpacity>
            <ThemeToggle />
          </View>

          <View style={styles.content}>
            <Animated.View
              style={[
                styles.titleContainer,
                {
                  opacity: titleAnim,
                  transform: [
                    {
                      scale: titleAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Text style={[styles.title, { color: theme.text }]}>
                {themeName === 'deadpool' ? 'Welcome Back' : 'Access Terminal'}
              </Text>
              <Text style={[styles.subtitle, { color: theme.primary }]}>
                {themeName === 'deadpool'
                  ? 'Time for maximum effort!'
                  : 'Enter credentials...'}
              </Text>
            </Animated.View>

            <Animated.View
              style={[
                styles.form,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <AnimatedInput
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                icon={<Mail color={theme.textSecondary} size={20} />}
              />

              <AnimatedInput
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                icon={<Lock color={theme.textSecondary} size={20} />}
              />

              {error ? (
                <Animated.Text style={[styles.errorText, { color: theme.primary }]}>
                  {error}
                </Animated.Text>
              ) : null}

              <AnimatedButton
                title={themeName === 'deadpool' ? 'Lets Go!' : 'Login'}
                onPress={handleLogin}
                isLoading={isLoading}
                style={styles.loginButton}
              />

              <TouchableOpacity
                disabled={isLoading}
                onPress={handleGooglePress}
                activeOpacity={0.9}
                style={[
                  styles.googleButton,
                  {
                    borderColor: theme.primary,
                    backgroundColor:
                      themeName === 'deadpool' ? 'rgba(230, 36, 41, 0.08)' : 'rgba(0, 255, 65, 0.08)',
                    opacity: isLoading ? 0.6 : 1,
                  },
                ]}
              >
                <Chrome color={theme.primary} size={18} />
                <Text style={[styles.googleText, { color: theme.text }]}>
                  Continue with Google
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push('/signup')}
                style={styles.switchLink}
              >
                <Text style={[styles.switchText, { color: theme.textSecondary }]}>
                  Don&apos;t have an account?{' '}
                  <Text style={{ color: theme.primary }}>Sign Up</Text>
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </AnimatedBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  titleContainer: {
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '800' as const,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    letterSpacing: 1,
  },
  form: {
    gap: 16,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
  loginButton: {
    marginTop: 8,
  },
  googleButton: {
    marginTop: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  googleText: {
    fontSize: 14,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
  },
  switchLink: {
    alignItems: 'center',
    marginTop: 16,
  },
  switchText: {
    fontSize: 14,
  },
});
