import { supabase, isValidUUID, getAuthenticatedSessionUser } from '../../lib/supabase';
import { ChatMessage, UserRole } from '../../types';

// ============================================================================
// REAL-TIME BROADCAST & IN-MEMORY EVENT BUS FOR ZERO-LATENCY CROSS-TAB & IN-APP CHAT
// ============================================================================

type LiveChatListener = (data: { roomId: string; message: ChatMessage }) => void;
const liveChatListeners: Set<LiveChatListener> = new Set();

let broadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel('iproom_live_chat_channel');
    broadcastChannel.onmessage = (event) => {
      if (event.data && event.data.roomId && event.data.message) {
        liveChatListeners.forEach((listener) => {
          try {
            listener(event.data);
          } catch (err) {
            console.warn('Error in liveChatListener:', err);
          }
        });
      }
    };
  } catch (e) {
    console.warn('BroadcastChannel not available:', e);
  }
}

/**
 * Broadcast a live chat message to all open tabs, windows, and active components
 */
export const broadcastLiveChatMessage = (roomId: string, message: ChatMessage) => {
  const payload = { roomId, message };

  // 1. Notify in-memory listeners in current tab
  liveChatListeners.forEach((listener) => {
    try {
      listener(payload);
    } catch (err) {
      console.warn('Error notifying local listener:', err);
    }
  });

  // 2. Broadcast across tabs via BroadcastChannel
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage(payload);
    } catch (e) {
      console.warn('Error posting to BroadcastChannel:', e);
    }
  }

  // 3. Fallback: Trigger storage event for tabs where BroadcastChannel might fail
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(
        'iproom_chat_last_event',
        JSON.stringify({ roomId, messageId: message.id, ts: Date.now() })
      );
    }
  } catch (e) {
    // ignore local storage errors
  }
};

/**
 * Get all cached chat messages for a specific room
 */
export const getRoomChatMessages = (roomId: string): ChatMessage[] => {
  if (typeof window === 'undefined' || !roomId) return [];
  try {
    const key = `iproom_chat_${roomId}`;
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
};

/**
 * Save message to cache and broadcast live
 */
export const saveRoomChatMessage = (roomId: string, message: ChatMessage): ChatMessage[] => {
  if (typeof window === 'undefined' || !roomId) return [message];
  const key = `iproom_chat_${roomId}`;
  const existing = getRoomChatMessages(roomId);
  
  // Avoid duplicate message IDs
  if (existing.some((m) => m.id === message.id)) {
    return existing;
  }

  const updated = [...existing, message];
  try {
    localStorage.setItem(key, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to save chat message to localStorage:', e);
  }

  // Broadcast to other tabs & listeners
  broadcastLiveChatMessage(roomId, message);

  return updated;
};

/**
 * Subscribe to live chat messages for a specific room (or all rooms if roomId is '*')
 */
export const subscribeToLiveRoomChat = (
  roomId: string,
  onNewMessage: (msg: ChatMessage) => void
): (() => void) => {
  const listener: LiveChatListener = (data) => {
    if (roomId === '*' || data.roomId === roomId) {
      onNewMessage(data.message);
    }
  };

  liveChatListeners.add(listener);

  // Cross-tab storage fallback listener
  const storageHandler = (e: StorageEvent) => {
    if (e.key === `iproom_chat_${roomId}` && e.newValue) {
      try {
        const msgs: ChatMessage[] = JSON.parse(e.newValue);
        if (Array.isArray(msgs) && msgs.length > 0) {
          const latest = msgs[msgs.length - 1];
          onNewMessage(latest);
        }
      } catch (err) {}
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', storageHandler);
  }

  return () => {
    liveChatListeners.delete(listener);
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', storageHandler);
    }
  };
};

/**
 * Play a gentle web audio chime on incoming live chat message
 */
export const playChatNotificationSound = () => {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    // Friendly two-tone chime (F5 -> A5)
    osc.frequency.setValueAtTime(698.46, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (e) {
    // Audio context may require user interaction
  }
};

/**
 * Get summary of all conversations across all rooms (for Owner Dashboard)
 */
export const getAllRoomChatSummaries = (): Record<
  string,
  { total: number; lastMessage?: ChatMessage; unreadForOwner: number }
> => {
  if (typeof window === 'undefined') return {};
  const result: Record<
    string,
    { total: number; lastMessage?: ChatMessage; unreadForOwner: number }
  > = {};

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('iproom_chat_') && key !== 'iproom_chat_last_event') {
        const roomId = key.replace('iproom_chat_', '');
        const msgs = getRoomChatMessages(roomId);
        if (msgs.length > 0) {
          const lastMsg = msgs[msgs.length - 1];
          const unreadForOwner = msgs.filter((m) => m.senderRole !== 'owner').length;
          result[roomId] = {
            total: msgs.length,
            lastMessage: lastMsg,
            unreadForOwner,
          };
        }
      }
    }
  } catch (e) {}

  return result;
};

// ============================================================================
// SUPABASE POSTGRESQL CHAT INTEGRATION (WHEN CONNECTED TO REAL AUTH SESSION)
// ============================================================================

export const getOrCreateConversation = async (
  currentUserId: string,
  otherUserId: string
): Promise<string | null> => {
  if (!isValidUUID(currentUserId) || !isValidUUID(otherUserId)) return null;

  const authUser = await getAuthenticatedSessionUser();
  if (!authUser) return null;

  try {
    // Check if conversation already exists with both members
    const { data: memberConversations } = await (supabase
      .from('conversation_members')
      .select('conversation_id')
      .eq('user_id', currentUserId) as any);

    if (memberConversations && memberConversations.length > 0) {
      const convIds = memberConversations.map((m: any) => m.conversation_id);
      const { data: common } = await (supabase
        .from('conversation_members')
        .select('conversation_id')
        .eq('user_id', otherUserId)
        .in('conversation_id', convIds)
        .limit(1) as any);

      if (common && common.length > 0) {
        return common[0].conversation_id;
      }
    }

    // Create new conversation
    const { data: newConv, error: convError } = await (supabase
      .from('conversations')
      .insert({} as any)
      .select('id')
      .single() as any);

    if (convError || !newConv) return null;

    // Add members
    await (supabase.from('conversation_members').insert([
      { conversation_id: newConv.id, user_id: currentUserId },
      { conversation_id: newConv.id, user_id: otherUserId },
    ] as any) as any);

    return newConv.id;
  } catch (err) {
    console.warn('Exception in getOrCreateConversation:', err);
    return null;
  }
};

/**
 * Fetch messages in conversation
 */
export const getConversationMessages = async (
  conversationId: string,
  currentUserId: string
): Promise<ChatMessage[]> => {
  if (!isValidUUID(conversationId) || !isValidUUID(currentUserId)) return [];

  const authUser = await getAuthenticatedSessionUser();
  if (!authUser) return [];

  try {
    const { data, error } = await (supabase
      .from('messages')
      .select('*, profiles:sender_id(full_name, role)')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true }) as any);

    if (error || !data) return [];

    return data.map((msg: any) => ({
      id: msg.id,
      senderId: msg.sender_id,
      senderName: msg.profiles?.full_name || 'User',
      senderRole: (msg.profiles?.role as UserRole) || 'renter',
      text: msg.message,
      timestamp: msg.created_at,
      isSelf: msg.sender_id === currentUserId,
    }));
  } catch (err) {
    console.warn('Exception in getConversationMessages:', err);
    return [];
  }
};

/**
 * Send message
 */
export const sendMessage = async (
  conversationId: string,
  senderId: string,
  messageText: string
): Promise<boolean> => {
  if (!isValidUUID(conversationId) || !isValidUUID(senderId)) return false;

  const authUser = await getAuthenticatedSessionUser();
  if (!authUser) return false;

  try {
    const { error } = await (supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        message: messageText,
      } as any) as any);

    return !error;
  } catch (err) {
    return false;
  }
};

/**
 * Realtime subscription to messages via Supabase
 */
export const subscribeToMessages = (
  conversationId: string,
  currentUserId: string,
  onNewMessage: (msg: ChatMessage) => void
): (() => void) => {
  if (!isValidUUID(conversationId)) return () => {};

  const channelName = `messages-${conversationId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        const msg = payload.new as any;
        onNewMessage({
          id: msg.id,
          senderId: msg.sender_id,
          senderName: msg.sender_id === currentUserId ? 'You' : 'Sender',
          senderRole: 'renter',
          text: msg.message,
          timestamp: msg.created_at,
          isSelf: msg.sender_id === currentUserId,
        });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};
