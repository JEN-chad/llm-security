import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import AnimatedBackground from '@/components/AnimatedBackground';
import NavHeader from '@/components/NavHeader';
import HeroSection from '@/components/HeroSection';
import AnimatedButton from '@/components/AnimatedButton';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LandingScreen() {
  const { theme } = useTheme();
  const { isAuthenticated, isLoading } = useAuth();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/chat');
    }
  }, [isAuthenticated, isLoading]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const handleLogin = () => {
    router.push('/login');
  };

  const handleSignup = () => {
    router.push('/signup');
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]} />
    );
  }

  return (
    <AnimatedBackground>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <NavHeader
          showAuthButtons={true}
          onLoginPress={handleLogin}
          onSignupPress={handleSignup}
        />
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <HeroSection />
          <View style={styles.buttonContainer}>
            <AnimatedButton
              title="Get Started"
              onPress={handleSignup}
              variant="primary"
            />
            <AnimatedButton
              title="I Have an Account"
              onPress={handleLogin}
              variant="outline"
              style={styles.secondaryButton}
            />
          </View>
        </Animated.View>
      </SafeAreaView>
    </AnimatedBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  buttonContainer: {
    marginTop: 40,
    gap: 16,
  },
  secondaryButton: {
    marginTop: 8,
  },
});
