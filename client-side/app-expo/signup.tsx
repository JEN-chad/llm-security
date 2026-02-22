import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { router, Stack } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import AnimatedBackground from '@/components/AnimatedBackground';
import AnimatedInput from '@/components/AnimatedInput';
import AnimatedButton from '@/components/AnimatedButton';
import ThemeToggle from '@/components/ThemeToggle';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Lock, User, ArrowLeft } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

export default function SignupScreen() {
  const { theme, themeName } = useTheme();
  const { signup } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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

  const handleSignup = async () => {
    if (!username || !email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await signup(email, password, username);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/chat');
    } catch {
      setError('Signup failed. Please try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
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

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
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
                  {themeName === 'deadpool' ? 'Join the Team' : 'Create Account'}
                </Text>
                <Text style={[styles.subtitle, { color: theme.primary }]}>
                  {themeName === 'deadpool'
                    ? 'Become a merc with a mouth!'
                    : 'Initialize new user...'}
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
                  placeholder="Username"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  icon={<User color={theme.textSecondary} size={20} />}
                />

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

                <AnimatedInput
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  icon={<Lock color={theme.textSecondary} size={20} />}
                />

                {error ? (
                  <Animated.Text style={[styles.errorText, { color: theme.primary }]}>
                    {error}
                  </Animated.Text>
                ) : null}

                <AnimatedButton
                  title={themeName === 'deadpool' ? 'Sign Me Up!' : 'Create Account'}
                  onPress={handleSignup}
                  isLoading={isLoading}
                  style={styles.signupButton}
                />

                <TouchableOpacity
                  onPress={() => router.push('/login')}
                  style={styles.switchLink}
                >
                  <Text style={[styles.switchText, { color: theme.textSecondary }]}>
                    Already have an account?{' '}
                    <Text style={{ color: theme.primary }}>Login</Text>
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            </View>
          </ScrollView>
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
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  titleContainer: {
    marginBottom: 32,
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
  signupButton: {
    marginTop: 8,
  },
  switchLink: {
    alignItems: 'center',
    marginTop: 16,
  },
  switchText: {
    fontSize: 14,
  },
});
