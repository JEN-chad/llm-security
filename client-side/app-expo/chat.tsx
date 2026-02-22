import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import AnimatedBackground from '@/components/AnimatedBackground';
import NavHeader from '@/components/NavHeader';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Send, Skull, Terminal, Sparkles, Wallet, Play } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import type { ThemeType } from '@/constants/themes';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

const DEADPOOL_RESPONSES = [
  "Maximum effort! 💪 What else you got?",
  "Chimichangas! Now that's what I call a question!",
  "You're making the voices in my head very happy right now.",
  "Fourth wall? What fourth wall? I'm just talking to my buddy here!",
  "I'd tell you a joke but my therapist says I need to work on my delivery.",
  "Francis! Oh wait, wrong person. What were we talking about?",
  "This is exactly what I'd expect from someone with excellent taste!",
];

const HACKER_RESPONSES = [
  "Processing query... Access granted. 🖥️",
  "Analyzing data streams... Interesting pattern detected.",
  "Firewall bypassed. Information retrieved successfully.",
  "Running decryption algorithm... Message decoded.",
  "Scanning network nodes... Connection established.",
  "Executing subroutine... Task completed efficiently.",
  "Data packet received. Initiating response protocol.",
];

export default function ChatScreen() {
  const { theme, themeName } = useTheme();
  const { user, isAuthenticated } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const typingAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/');
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const welcomeMessage: Message = {
      id: '1',
      text:
        themeName === 'deadpool'
          ? `Hey there, ${user?.username || 'friend'}! Ready for some maximum effort conversations? 🎭`
          : `Welcome, ${user?.username || 'user'}. Terminal initialized. Ready to process your queries. 💻`,
      isUser: false,
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
  }, [themeName, user?.username]);

  useEffect(() => {
    if (isTyping) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(typingAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(typingAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      typingAnim.setValue(0);
    }
  }, [isTyping, typingAnim]);

  const sendMessage = () => {
    if (!inputText.trim()) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    setTimeout(() => {
      const responses =
        themeName === 'deadpool' ? DEADPOOL_RESPONSES : HACKER_RESPONSES;
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: randomResponse,
        isUser: false,
        timestamp: new Date(),
      };

      setIsTyping(false);
      setMessages((prev) => [...prev, botMessage]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }, 1500);
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isUser = item.isUser;
    return (
      <MessageBubble message={item} isUser={isUser} theme={theme} index={index} />
    );
  };

  return (
    <AnimatedBackground>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <NavHeader showAuthButtons={false} />

        <View style={styles.heroContainer}>
          <View
            style={[
              styles.heroGlowCircle,
              { backgroundColor: theme.glow },
            ]}
          />

          <View style={styles.heroTopRow}>
            <View
              style={[
                styles.heroWalletCard,
                { backgroundColor: theme.surface, borderColor: theme.surfaceLight },
              ]}
            >
              <View style={styles.heroWalletIcon}>
                <Wallet color={theme.primary} size={18} />
              </View>
              <View>
                <Text style={[styles.heroWalletLabel, { color: theme.textSecondary }]}>
                  {themeName === 'deadpool' ? 'MAXIMUM BALANCE' : 'CREDITS'}
                </Text>
                <Text style={[styles.heroWalletValue, { color: theme.primary }]}>
                  $1,250,500
                </Text>
              </View>
            </View>

            <View style={styles.heroActionButtons}>
              <View
                style={[
                  styles.heroIconButton,
                  { backgroundColor: theme.surface, borderColor: theme.surfaceLight },
                ]}
              >
                <Play color={theme.primary} size={16} />
              </View>
              <View
                style={[
                  styles.heroIconButton,
                  { backgroundColor: theme.surface, borderColor: theme.surfaceLight },
                ]}
              >
                <Terminal color={theme.primary} size={16} />
              </View>
            </View>
          </View>

          <View
            style={[
              styles.heroMessageCard,
              { backgroundColor: theme.surface, borderColor: theme.surfaceLight },
            ]}
          >
            <View style={styles.heroBotRow}>
              <Text style={[styles.heroBotName, { color: theme.text }]}>
                {themeName === 'deadpool' ? 'Deadpool AI' : 'Hacker Bot'}
              </Text>
              <Text style={[styles.heroBotStatus, { color: theme.primary }]}>
                {isTyping ? 'Typing…' : 'Online'}
              </Text>
            </View>
            <Text style={[styles.heroMessageText, { color: theme.text }]}>
              {themeName === 'deadpool'
                ? `Welcome, ${user?.username || 'friend'}. Time for maximum effort.`
                : `Welcome, ${user?.username || 'user'}. Terminal initialized. Ready to process your queries. 🖥️`}
            </Text>
          </View>
        </View>

        <View style={styles.chatHeader}>
          <View style={styles.botInfo}>
            {themeName === 'deadpool' ? (
              <Skull color={theme.primary} size={24} />
            ) : (
              <Terminal color={theme.primary} size={24} />
            )}
            <View>
              <Text style={[styles.botName, { color: theme.text }]}>
                {themeName === 'deadpool' ? 'Deadpool AI' : 'Hacker Bot'}
              </Text>
              <Text style={[styles.botStatus, { color: theme.primary }]}>
                {isTyping ? 'Typing...' : 'Online'}
              </Text>
            </View>
          </View>
          <Sparkles color={theme.primary} size={20} />
        </View>

        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messageList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: true })
            }
          />

          {isTyping && (
            <Animated.View
              style={[
                styles.typingIndicator,
                { backgroundColor: theme.surface, opacity: typingAnim },
              ]}
            >
              <Text style={[styles.typingText, { color: theme.textSecondary }]}>
                {themeName === 'deadpool' ? '🎭 Deadpool is typing...' : '💻 Processing...'}
              </Text>
            </Animated.View>
          )}

          <View
            style={[
              styles.inputContainer,
              { backgroundColor: theme.surface, borderTopColor: theme.surfaceLight },
            ]}
          >
            <TextInput
              style={[
                styles.input,
                { backgroundColor: theme.inputBg, color: theme.text },
              ]}
              placeholder={
                themeName === 'deadpool'
                  ? 'Say something witty...'
                  : 'Enter command...'
              }
              placeholderTextColor={theme.textSecondary}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              onPress={sendMessage}
              style={[
                styles.sendButton,
                {
                  backgroundColor: inputText.trim() ? theme.primary : theme.surfaceLight,
                },
              ]}
              disabled={!inputText.trim()}
            >
              <Send
                color={inputText.trim() ? theme.buttonText : theme.textSecondary}
                size={20}
              />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </AnimatedBackground>
  );
}

function MessageBubble({
  message,
  isUser,
  theme,
  index,
}: {
  message: Message;
  isUser: boolean;
  theme: ThemeType;
  index: number;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(isUser ? 20 : -20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  return (
    <Animated.View
      style={[
        styles.messageBubble,
        isUser ? styles.userBubble : styles.botBubble,
        {
          backgroundColor: isUser ? theme.chatBubbleUser : theme.chatBubbleBot,
          opacity: fadeAnim,
          transform: [{ translateX: slideAnim }],
        },
      ]}
    >
      <Text
        style={[
          styles.messageText,
          { color: isUser ? theme.buttonText : theme.text },
        ]}
      >
        {message.text}
      </Text>
      <Text
        style={[
          styles.timestamp,
          { color: isUser ? 'rgba(255,255,255,0.7)' : theme.textSecondary },
        ]}
      >
        {message.timestamp.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  heroContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    overflow: 'hidden',
  },
  heroGlowCircle: {
    position: 'absolute',
    top: -80,
    left: -40,
    width: 260,
    height: 260,
    borderRadius: 130,
    opacity: 0.25,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroWalletCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  heroWalletIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  heroWalletLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    letterSpacing: 1,
  },
  heroWalletValue: {
    fontSize: 18,
    fontWeight: '800' as const,
  },
  heroActionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  heroIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroMessageCard: {
    marginTop: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  heroBotRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  heroBotName: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  heroBotStatus: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  heroMessageText: {
    fontSize: 13,
    lineHeight: 18,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  botInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  botName: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  botStatus: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  messageList: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    marginVertical: 4,
  },
  userBubble: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  botBubble: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  typingIndicator: {
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  typingText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 12,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 22,
    fontSize: 15,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
