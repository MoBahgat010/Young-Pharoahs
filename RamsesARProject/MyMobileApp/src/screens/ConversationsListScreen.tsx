import React, {useEffect, useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {MessageSquare, Plus, Trash2} from 'lucide-react-native';
import type {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import type {CompositeScreenProps} from '@react-navigation/native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {TabParamList, RootStackParamList} from '../../App';
import {Colors, FontSizes, Spacing, BorderRadius} from '../constants/DesignTokens';
import {fetchConversations, deleteConversation} from '../services/apiService';
import type {ConversationPreview} from '../types/conversation';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'ChatsTab'>,
  NativeStackScreenProps<RootStackParamList>
>;

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) { return 'Just now'; }
  if (diffMin < 60) { return `${diffMin}m ago`; }
  if (diffHr < 24) { return `${diffHr}h ago`; }
  if (diffDay < 7) { return `${diffDay}d ago`; }
  return date.toLocaleDateString();
}

export function ConversationsListScreen({navigation}: Props) {
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConversations = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const data = await fetchConversations(20);
      console.log('[ConversationsList] Loaded conversations:', JSON.stringify(data.conversations, null, 2));
      setConversations(data.conversations ?? []);
    } catch (err: unknown) {
      console.error('[ConversationsList] Load failed:', err);
      const msg = err instanceof Error ? err.message : 'Could not load conversations';
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Reload when tab is focused (coming back from Chat)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadConversations();
    });
    return unsubscribe;
  }, [navigation, loadConversations]);

  const handleDelete = useCallback((convId: string) => {
    Alert.alert(
      'Delete Conversation',
      'This conversation will be permanently deleted.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteConversation(convId);
              setConversations(prev => prev.filter(c => c.conversation_id !== convId));
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : 'Delete failed';
              Alert.alert('Error', msg);
            }
          },
        },
      ],
    );
  }, []);

  const handleOpenChat = useCallback((convId: string) => {
    const conv = conversations.find(c => c.conversation_id === convId);
    console.log('[ConversationsList] Opening conversation:', JSON.stringify(conv, null, 2));
    navigation.navigate('Chat', {conversationId: convId});
  }, [navigation, conversations]);

  const handleNewChat = useCallback(() => {
    navigation.navigate('Chat', {});
  }, [navigation]);

  const renderConversation = useCallback(({item}: {item: ConversationPreview}) => {
    const preview = item.last_message?.content ?? '';
    const role = item.last_message?.role === 'user' ? 'You: ' : '';
    const truncated = preview.length > 100 ? preview.slice(0, 100) + '...' : preview;
    const time = formatRelativeTime(item.updated_at);

    return (
      <TouchableOpacity
        style={styles.conversationCard}
        onPress={() => handleOpenChat(item.conversation_id)}
        activeOpacity={0.7}>
        <View style={styles.cardIcon}>
          <MessageSquare size={20} color={Colors.primary} />
        </View>
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTime}>{time}</Text>
          </View>
          <Text style={styles.cardPreview} numberOfLines={2}>
            {role}{truncated || 'Empty conversation'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDelete(item.conversation_id)}
          activeOpacity={0.7}
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <Trash2 size={16} color={Colors.textWhite40} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }, [handleOpenChat, handleDelete]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <SafeAreaView style={styles.inner} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Conversations</Text>
          <TouchableOpacity
            style={styles.newChatButton}
            onPress={handleNewChat}
            activeOpacity={0.7}>
            <Plus size={20} color={Colors.backgroundDark} />
          </TouchableOpacity>
        </View>

        {/* Loading state */}
        {loading && !refreshing && (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        )}

        {/* Error state */}
        {error && !loading && (
          <View style={styles.centerState}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => loadConversations()}
              activeOpacity={0.7}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Empty state */}
        {!loading && !error && conversations.length === 0 && (
          <View style={styles.centerState}>
            <Text style={styles.emptyIcon}>𓁟</Text>
            <Text style={styles.emptyTitle}>No scrolls yet</Text>
            <Text style={styles.emptySubtitle}>
              Start a conversation to unlock the wisdom of the pharaohs
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={handleNewChat}
              activeOpacity={0.7}>
              <Text style={styles.emptyButtonText}>New Conversation</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Conversations list */}
        {!loading && !error && conversations.length > 0 && (
          <FlatList
            data={conversations}
            keyExtractor={item => item.conversation_id}
            renderItem={renderConversation}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => loadConversations(true)}
                tintColor={Colors.primary}
                colors={[Colors.primary]}
              />
            }
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundDark,
  },
  inner: {
    flex: 1,
  },

  // ── Header ────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.textWhite10,
  },
  title: {
    color: Colors.primary,
    fontSize: FontSizes.xl,
    fontWeight: '700',
  },
  newChatButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── List ──────────────────────────────────────────────────
  listContent: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  conversationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: Colors.cardDark,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.textWhite10,
    gap: Spacing.md,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.textWhite05,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 2,
  },
  cardTime: {
    color: Colors.textWhite40,
    fontSize: FontSizes.xs,
  },
  cardPreview: {
    color: Colors.textWhite70,
    fontSize: FontSizes.sm,
    lineHeight: 20,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Center states ─────────────────────────────────────────
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  emptyIcon: {
    fontSize: 48,
    color: Colors.primary,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.textWhite,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.textWhite50,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  emptyButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
  },
  emptyButtonText: {
    color: Colors.backgroundDark,
    fontSize: FontSizes.sm,
    fontWeight: '700',
  },
  errorText: {
    color: Colors.terracotta,
    fontSize: FontSizes.sm,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  retryButton: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.terracotta,
  },
  retryText: {
    color: Colors.textWhite,
    fontSize: FontSizes.xs,
    fontWeight: '700',
  },
});
