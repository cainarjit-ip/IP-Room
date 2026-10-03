import { supabase, isValidUUID, stringToUUID, getAuthenticatedSessionUser } from '../../lib/supabase';
import { ChatMessage, UserRole } from '../../types';
import { RealtimeChannel } from '@supabase/supabase-js';

// ============================================================================
// GLOBAL REALTIME CHAT ENGINE (VERCEL & CROSS-DEVICE PRODUCTION READY)
// ============================================================================

type LiveChatListener = (data: { roomId: string; message: ChatMessage }) => void;
const liveChatListeners: Set<LiveChatListener> = new Set();

// Active Supabase Realtime Channels per room
const activeSupabaseChannels = new Map<string, RealtimeChannel>();

// Global Broadcast channel for cross-device alerts and dashboard sync
let globalRealtimeChannel: RealtimeChannel | null = null;
let isGlobalChannelSubscribed = false;

// Native browser BroadcastChannel for same-device cross-tab communication
let browserBroadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    browserBroadcastChannel = new BroadcastChannel('iproom_live_chat_channel');
    browserBroadcastChannel.onmessage = (event) => {
      if (event.data && event.data.roomId && event.data.message) {
        dispatchMessageLocally(event.data.roomId, event.data.message);
      }
    };
  } catch (e) {
    // BroadcastChannel unsupported or blocked
  }
}

/**
 * Dispatch message to in-memory listeners and update local cache
 */
const dispatchMessageLocally = (roomId: string, message: ChatMessage) => {
  saveRoomChatMessageLocally(roomId, message);
  liveChatListeners.forEach((listener) => {
    try {
      listener({ roomId, message });
    } catch (err) {
      console.warn('Error in liveChatListener callback:', err);
    }
  });
};

/**
 * Initialize or get the Global Realtime Stream channel.
 * This connects to Supabase's global WebSocket server and works across all devices,
 * mobile phones, laptops, and Vercel deployments in real time with <50ms latency.
 */
export const getGlobalRealtimeChannel = (): RealtimeChannel => {
  if (globalRealtimeChannel) {
    return globalRealtimeChannel;
  }

  globalRealtimeChannel = supabase.channel('iproom_global_realtime_stream', {
    config: {
      broadcast: {
        self: false,
        ack: false,
      },
    },
  });

  globalRealtimeChannel
    .on('broadcast', { event: 'new_chat_message' }, ({ payload }) => {
      if (payload && payload.message && payload.roomId) {
        const msg = payload.message as ChatMessage;
        dispatchMessageLocally(payload.roomId, msg);
        playChatNotificationSound();
      }
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        isGlobalChannelSubscribed = true;
      }
    });

  return globalRealtimeChannel;
};

// Initialize global channel immediately
if (typeof window !== 'undefined') {
  try {
    getGlobalRealtimeChannel();
  } catch (e) {}
}

/**
 * Get or create a Supabase Realtime WebSocket channel for a specific room.
 */
export const getSupabaseRoomChannel = (roomId: string): RealtimeChannel => {
  const channelKey = `live_room_chat_${roomId}`;
  let channel = activeSupabaseChannels.get(channelKey);

  if (!channel) {
    channel = supabase.channel(channelKey, {
      config: {
        broadcast: {
          self: false,
          ack: false,
        },
      },
    });

    channel
      .on('broadcast', { event: 'new_chat_message' }, ({ payload }) => {
        if (payload && payload.message && payload.roomId === roomId) {
          const msg = payload.message as ChatMessage;
          dispatchMessageLocally(roomId, msg);
          playChatNotificationSound();
        }
      })
      .subscribe();

    activeSupabaseChannels.set(channelKey, channel);
  }

  return channel;
};

/**
 * Helper to save message into local storage cache
 */
export const saveRoomChatMessageLocally = (
  roomId: string,
  message: ChatMessage
): ChatMessage[] => {
  if (typeof window === 'undefined' || !roomId) return [message];
  const key = `iproom_chat_${roomId}`;
  const existing = getRoomChatMessages(roomId);

  if (existing.some((m) => m.id === message.id)) {
    return existing;
  }

  const updated = [...existing, message];
  try {
    localStorage.setItem(key, JSON.stringify(updated));
  } catch (e) {
    // Storage quota or disabled
  }

  return updated;
};

/**
 * Broadcast a live chat message over:
 * 1. Global Supabase Realtime WebSockets (Sends to other users/devices on Vercel globally)
 * 2. Room-specific Supabase Realtime WebSockets
 * 3. Native Browser BroadcastChannel (Same-device tabs)
 * 4. In-memory local listeners
 */
export const broadcastLiveChatMessage = async (
  roomId: string,
  message: ChatMessage
): Promise<void> => {
  const payload = { roomId, message };

  // 1. Notify local in-memory listeners
  liveChatListeners.forEach((listener) => {
    try {
      listener(payload);
    } catch (err) {
      console.warn('Error notifying local listener:', err);
    }
  });

  // 2. Broadcast to same-device tabs via Browser BroadcastChannel
  if (browserBroadcastChannel) {
    try {
      browserBroadcastChannel.postMessage(payload);
    } catch (e) {}
  }

  // 3. BROADCAST GLOBALLY OVER SUPABASE REALTIME WEBSOCKETS (FOR VERCEL DEPLOYMENTS)
  try {
    const globalChannel = getGlobalRealtimeChannel();
    await globalChannel.send({
      type: 'broadcast',
      event: 'new_chat_message',
      payload,
    });
  } catch (err) {
    // Non-fatal fallback
  }

  // 4. Also broadcast to room channel if active
  try {
    const roomChannel = getSupabaseRoomChannel(roomId);
    await roomChannel.send({
      type: 'broadcast',
      event: 'new_chat_message',
      payload,
    });
  } catch (err) {}

  // 5. Trigger storage event for legacy cross-tab fallback
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(
        'iproom_chat_last_event',
        JSON.stringify({ roomId, messageId: message.id, ts: Date.now() })
      );
    }
  } catch (e) {}
};

/**
 * Fetch cached chat messages for a specific room
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
 * Fetch remote messages from Supabase PostgreSQL database tables:
 * Searches `conversations` + `messages` (and `chat_messages` fallback)
 */
export const fetchRemoteChatMessages = async (
  roomId: string
): Promise<ChatMessage[]> => {
  if (!roomId) return [];
  const localList = getRoomChatMessages(roomId);

  try {
    const safeRoomUUID = isValidUUID(roomId) ? roomId : stringToUUID(roomId);

    // 1. Check conversations table for this room
    const { data: convData } = await (supabase
      .from('conversations')
      .select('id, room_id, owner_id, renter_id')
      .eq('room_id', safeRoomUUID) as any);

    let dbMessages: any[] = [];

    if (Array.isArray(convData) && convData.length > 0) {
      const convIds = convData.map((c: any) => c.id);
      const { data: mData } = await (supabase
        .from('messages')
        .select('id, conversation_id, sender_id, content, is_read, created_at')
        .in('conversation_id', convIds)
        .order('created_at', { ascending: true }) as any);

      if (Array.isArray(mData)) {
        dbMessages = mData;
      }
    }

    // 2. If conversations had no messages, check chat_messages table if exists
    if (dbMessages.length === 0) {
      try {
        const { data: chatData } = await (supabase
          .from('chat_messages')
          .select('id, room_id, sender_id, message, content, created_at')
          .eq('room_id', safeRoomUUID)
          .order('created_at', { ascending: true }) as any);

        if (Array.isArray(chatData) && chatData.length > 0) {
          dbMessages = chatData;
        }
      } catch (e) {
        // chat_messages does not exist
      }
    }

    if (dbMessages.length === 0) {
      return localList;
    }

    // Map rows to ChatMessage models
    const mapped: ChatMessage[] = dbMessages.map((row: any) => ({
      id: row.id,
      senderId: row.sender_id,
      senderName: 'User',
      senderRole: 'renter',
      text: row.content || row.message || '',
      timestamp: new Date(row.created_at).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      isSelf: false,
    }));

    // Merge with local cache
    const combined = [...localList];
    mapped.forEach((m) => {
      if (!combined.some((c) => c.id === m.id)) {
        combined.push(m);
      }
    });

    try {
      localStorage.setItem(`iproom_chat_${roomId}`, JSON.stringify(combined));
    } catch (e) {}

    return combined;
  } catch (err) {
    return localList;
  }
};

/**
 * Save chat message:
 * 1. Saves locally (localStorage + in-memory)
 * 2. Broadcasts in real-time over Supabase WebSockets (Vercel cross-device)
 * 3. Persists to Supabase PostgreSQL database
 */
export const saveRoomChatMessage = (
  roomId: string,
  message: ChatMessage
): ChatMessage[] => {
  if (typeof window === 'undefined' || !roomId) return [message];

  // 1. Save to local storage
  const updated = saveRoomChatMessageLocally(roomId, message);

  // 2. Broadcast live across devices and Vercel deployments
  broadcastLiveChatMessage(roomId, message).catch(() => {});

  // 3. Persist to Supabase PostgreSQL database in background
  persistMessageToSupabase(roomId, message).catch(() => {});

  return updated;
};

/**
 * Persist message to Supabase database (`conversations` and `messages`)
 */
const persistMessageToSupabase = async (
  roomId: string,
  message: ChatMessage
): Promise<void> => {
  try {
    const authUser = await getAuthenticatedSessionUser();
    const safeSenderUUID =
      authUser?.id && isValidUUID(authUser.id)
        ? authUser.id
        : isValidUUID(message.senderId)
        ? message.senderId
        : stringToUUID(message.senderId || 'guest-user');

    const safeRoomUUID = isValidUUID(roomId) ? roomId : stringToUUID(roomId);
    const safeMsgUUID = isValidUUID(message.id) ? message.id : stringToUUID(message.id);

    // 1. Find or create conversation for this room
    let convId: string | null = null;
    const { data: convData } = await (supabase
      .from('conversations')
      .select('id')
      .eq('room_id', safeRoomUUID)
      .limit(1) as any);

    if (Array.isArray(convData) && convData.length > 0) {
      convId = convData[0].id;
    } else {
      const { data: newConv } = await (supabase
        .from('conversations')
        .insert({
          id: safeRoomUUID,
          room_id: safeRoomUUID,
          owner_id: safeSenderUUID,
          renter_id: safeSenderUUID,
        } as any)
        .select('id')
        .single() as any);

      if (newConv?.id) {
        convId = newConv.id;
      }
    }

    // 2. Insert into messages table
    if (convId) {
      await (supabase.from('messages') as any).upsert({
        id: safeMsgUUID,
        conversation_id: convId,
        sender_id: safeSenderUUID,
        content: message.text,
        is_read: false,
        created_at: new Date().toISOString(),
      });
    }

    // 3. If chat_messages table exists in their project, also save there
    try {
      await (supabase.from('chat_messages') as any).upsert({
        id: safeMsgUUID,
        room_id: safeRoomUUID,
        sender_id: safeSenderUUID,
        message: message.text,
        content: message.text,
        is_read: false,
        read: false,
        created_at: new Date().toISOString(),
      });
    } catch (e) {
      // Table chat_messages does not exist; non-fatal
    }
  } catch (e) {
    // Non-fatal if database RLS blocks unauthenticated guests
  }
};

/**
 * Subscribe to live chat messages for a specific room (or all rooms with '*')
 * Connects both Supabase WebSockets and local channels.
 */
export const subscribeToLiveRoomChat = (
  roomId: string,
  onNewMessage: (msg: ChatMessage) => void
): (() => void) => {
  // 1. Local listener
  const listener: LiveChatListener = (data) => {
    if (roomId === '*' || data.roomId === roomId) {
      onNewMessage(data.message);
    }
  };
  liveChatListeners.add(listener);

  // 2. Ensure global channel is connected (receives all messages across Vercel)
  getGlobalRealtimeChannel();

  // 3. Connect Supabase Realtime WebSocket Channel for this room
  let roomChannel: RealtimeChannel | null = null;
  if (roomId !== '*') {
    roomChannel = getSupabaseRoomChannel(roomId);
  }

  // 4. Storage event handler for cross-tab fallback
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
// CONVERSATIONS / DIRECT THREADS (LEGACY SUPABASE COMPATIBILITY)
// ============================================================================

export const getOrCreateConversation = async (
  currentUserId: string,
  otherUserId: string,
  roomId?: string
): Promise<string | null> => {
  if (!isValidUUID(currentUserId) || !isValidUUID(otherUserId)) return null;

  try {
    // 1. Try to find existing conversation by room_id or user IDs
    let query = supabase.from('conversations').select('id, room_id, owner_id, renter_id');
    if (roomId && isValidUUID(roomId)) {
      query = query.eq('room_id', roomId);
    }

    const { data: existingConvs } = await (query.limit(5) as any);

    if (Array.isArray(existingConvs) && existingConvs.length > 0) {
      const matched = existingConvs.find(
        (c: any) =>
          (c.owner_id === otherUserId && c.renter_id === currentUserId) ||
          (c.owner_id === currentUserId && c.renter_id === otherUserId) ||
          (roomId && c.room_id === roomId)
      );
      if (matched?.id) {
        return matched.id;
      }
    }

    // 2. Create new conversation
    const safeRoomId = roomId && isValidUUID(roomId) ? roomId : stringToUUID(roomId || 'room-default');
    const { data: newConv, error: convError } = await (supabase
      .from('conversations')
      .insert({
        room_id: safeRoomId,
        owner_id: otherUserId,
        renter_id: currentUserId,
      } as any)
      .select('id')
      .single() as any);

    if (convError || !newConv) return null;
    return newConv.id;
  } catch (err) {
    return null;
  }
};

export const getConversationMessages = async (
  conversationId: string,
  currentUserId: string
): Promise<ChatMessage[]> => {
  if (!isValidUUID(conversationId)) return [];

  try {
    const { data, error } = await (supabase
      .from('messages')
      .select('id, conversation_id, sender_id, content, is_read, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true }) as any);

    if (error || !Array.isArray(data)) return [];

    return data.map((msg: any) => ({
      id: msg.id,
      senderId: msg.sender_id,
      senderName: msg.sender_id === currentUserId ? 'You' : 'User',
      senderRole: (msg.sender_id === currentUserId ? 'renter' : 'owner') as UserRole,
      text: msg.content || '',
      timestamp: msg.created_at,
      isSelf: msg.sender_id === currentUserId,
    }));
  } catch (err) {
    return [];
  }
};

export const sendMessage = async (
  conversationId: string,
  senderId: string,
  messageText: string
): Promise<boolean> => {
  if (!isValidUUID(conversationId) || !isValidUUID(senderId)) return false;

  try {
    const { error } = await (supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content: messageText,
        is_read: false,
      } as any) as any);

    return !error;
  } catch (err) {
    return false;
  }
};

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
          text: msg.content || '',
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
