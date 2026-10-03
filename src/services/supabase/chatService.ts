import { supabase, isValidUUID, stringToUUID, getAuthenticatedSessionUser } from '../../lib/supabase';
import { ChatMessage, ChatConversation, UserRole, UserProfile } from '../../types';
import { RealtimeChannel } from '@supabase/supabase-js';
import { CURRENT_CLIENT_SESSION_ID } from './notificationService';

// ============================================================================
// GLOBAL REALTIME CHAT ENGINE (MULTI-TENANT, VERCEL & CROSS-DEVICE READY)
// ============================================================================

type LiveChatListener = (data: {
  conversationId: string;
  roomId: string;
  renterId: string;
  message: ChatMessage;
}) => void;
const liveChatListeners: Set<LiveChatListener> = new Set();

// Active Supabase Realtime Channels per room/conversation
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
      if (event.data && event.data.message) {
        const { conversationId, roomId, renterId, message } = event.data;
        dispatchMessageLocally(conversationId || `conv_${roomId}_${renterId || 'guest'}`, roomId, renterId || 'guest', message);
      }
    };
  } catch (e) {
    // BroadcastChannel unsupported or blocked
  }
}

/**
 * Get or create a stable client renter identity for guest / student users
 */
export const getClientRenterIdentity = (
  currentUser?: UserProfile | null
): { id: string; name: string } => {
  if (currentUser && currentUser.id) {
    return {
      id: currentUser.id,
      name: currentUser.name || 'Student',
    };
  }
  if (typeof window !== 'undefined') {
    let guestId = localStorage.getItem('iproom_guest_renter_id');
    let guestName = localStorage.getItem('iproom_guest_renter_name');
    if (!guestId) {
      guestId = `renter_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem('iproom_guest_renter_id', guestId);
    }
    if (!guestName) {
      guestName = 'विद्यार्थी (Student)';
      localStorage.setItem('iproom_guest_renter_name', guestName);
    }
    return { id: guestId, name: guestName };
  }
  return { id: 'guest_renter', name: 'Student' };
};

/**
 * Unique conversation key between a specific renter and room listing
 */
export const getConversationKey = (roomId: string, renterId: string): string => {
  return `conv_${roomId}_${renterId}`;
};

/**
 * Dispatch message to in-memory listeners and update local cache
 */
const dispatchMessageLocally = (
  conversationId: string,
  roomId: string,
  renterId: string,
  message: ChatMessage
) => {
  saveConversationMessageLocally(conversationId, roomId, renterId, message);
  liveChatListeners.forEach((listener) => {
    try {
      listener({ conversationId, roomId, renterId, message });
    } catch (err) {
      console.warn('Error in liveChatListener callback:', err);
    }
  });
};

/**
 * Initialize or get the Global Realtime Stream channel.
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
      if (payload && payload.message) {
        // NEVER alert the sender who sent it from this session
        if (payload.senderSessionId && payload.senderSessionId === CURRENT_CLIENT_SESSION_ID) {
          return;
        }
        const msg = payload.message as ChatMessage;
        const convId = payload.conversationId || getConversationKey(payload.roomId, payload.renterId || 'guest');
        dispatchMessageLocally(convId, payload.roomId, payload.renterId || 'guest', msg);
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
          if (payload.senderSessionId && payload.senderSessionId === CURRENT_CLIENT_SESSION_ID) {
            return;
          }
          const msg = payload.message as ChatMessage;
          const convId = payload.conversationId || getConversationKey(roomId, payload.renterId || 'guest');
          dispatchMessageLocally(convId, roomId, payload.renterId || 'guest', msg);
        }
      })
      .subscribe();

    activeSupabaseChannels.set(channelKey, channel);
  }

  return channel;
};

/**
 * Helper to save message into local storage cache for a specific conversation
 */
export const saveConversationMessageLocally = (
  conversationId: string,
  roomId: string,
  renterId: string,
  message: ChatMessage,
  roomMeta?: {
    roomTitle?: string;
    roomTitleNp?: string;
    roomImage?: string;
    ownerId?: string;
    ownerName?: string;
    ownerPhone?: string;
    renterName?: string;
  }
): ChatMessage[] => {
  if (typeof window === 'undefined' || !conversationId) return [message];

  const convKey = `iproom_chat_${conversationId}`;
  const existing = getConversationMessages(roomId, renterId);

  let updated = existing;
  if (!existing.some((m) => m.id === message.id)) {
    updated = [...existing, message];
    try {
      localStorage.setItem(convKey, JSON.stringify(updated));
    } catch (e) {}
  }

  // Also maintain backward-compatible room-level key for simple view
  try {
    const roomKey = `iproom_chat_${roomId}`;
    const roomExisting: ChatMessage[] = JSON.parse(localStorage.getItem(roomKey) || '[]');
    if (!roomExisting.some((m) => m.id === message.id)) {
      const roomUpdated = [...roomExisting, message];
      localStorage.setItem(roomKey, JSON.stringify(roomUpdated));
    }
  } catch (e) {}

  // Update conversations index for Owner Dashboard and Admin Dashboard
  try {
    const indexKey = 'iproom_conversations_index';
    const index: Record<string, ChatConversation> = JSON.parse(localStorage.getItem(indexKey) || '{}');

    const prevConv = index[conversationId];
    const renterName = roomMeta?.renterName || message.renterName || prevConv?.renterName || (message.senderRole === 'renter' ? message.senderName : 'Student');
    const ownerName = roomMeta?.ownerName || prevConv?.ownerName || (message.senderRole === 'owner' ? message.senderName : 'Room Lister');
    const ownerId = roomMeta?.ownerId || prevConv?.ownerId || (message.senderRole === 'owner' ? message.senderId : message.recipientId || 'owner');

    index[conversationId] = {
      id: conversationId,
      roomId,
      roomTitle: roomMeta?.roomTitle || prevConv?.roomTitle || 'Room Listing',
      roomTitleNp: roomMeta?.roomTitleNp || prevConv?.roomTitleNp,
      roomImage: roomMeta?.roomImage || prevConv?.roomImage,
      ownerId,
      ownerName,
      ownerPhone: roomMeta?.ownerPhone || prevConv?.ownerPhone,
      renterId,
      renterName,
      lastMessage: message,
      unreadCount: message.senderRole === 'renter' ? (prevConv?.unreadCount || 0) + 1 : 0,
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(indexKey, JSON.stringify(index));
  } catch (e) {}

  return updated;
};

/**
 * Legacy wrapper to save message locally
 */
export const saveRoomChatMessageLocally = (
  roomId: string,
  message: ChatMessage
): ChatMessage[] => {
  const renterId = message.renterId || (message.senderRole === 'renter' ? message.senderId : message.recipientId || 'guest');
  const convId = message.conversationId || getConversationKey(roomId, renterId);
  return saveConversationMessageLocally(convId, roomId, renterId, message);
};

/**
 * Broadcast live chat message over WebSockets to cross-device users
 */
export const broadcastLiveChatMessage = async (
  roomId: string,
  message: ChatMessage,
  conversationId?: string,
  renterId?: string
): Promise<void> => {
  const resolvedRenterId = renterId || message.renterId || (message.senderRole === 'renter' ? message.senderId : message.recipientId || 'guest');
  const resolvedConvId = conversationId || message.conversationId || getConversationKey(roomId, resolvedRenterId);

  const payload = {
    conversationId: resolvedConvId,
    roomId,
    renterId: resolvedRenterId,
    message: {
      ...message,
      conversationId: resolvedConvId,
      renterId: resolvedRenterId,
      senderSessionId: CURRENT_CLIENT_SESSION_ID,
    },
    senderSessionId: CURRENT_CLIENT_SESSION_ID,
  };

  // 1. Notify local in-memory listeners
  liveChatListeners.forEach((listener) => {
    try {
      listener({
        conversationId: resolvedConvId,
        roomId,
        renterId: resolvedRenterId,
        message: payload.message,
      });
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
};

/**
 * Get messages for a specific conversation (scoped to specific renter & room)
 */
export const getConversationMessages = (
  roomId: string,
  renterId?: string
): ChatMessage[] => {
  if (typeof window === 'undefined' || !roomId) return [];

  // If renterId provided, get that exact thread
  if (renterId) {
    const convKey = `iproom_chat_${getConversationKey(roomId, renterId)}`;
    const stored = localStorage.getItem(convKey);
    if (stored) {
      try {
        const msgs = JSON.parse(stored);
        if (Array.isArray(msgs) && msgs.length > 0) return msgs;
      } catch (e) {}
    }
  }

  // Fallback to room-level cache
  const roomKey = `iproom_chat_${roomId}`;
  const storedRoom = localStorage.getItem(roomKey);
  if (storedRoom) {
    try {
      const msgs = JSON.parse(storedRoom);
      if (Array.isArray(msgs)) return msgs;
    } catch (e) {}
  }

  return [];
};

/**
 * Legacy wrapper
 */
export const getRoomChatMessages = (roomId: string): ChatMessage[] => {
  return getConversationMessages(roomId);
};

/**
 * Fetch remote messages from Supabase PostgreSQL database
 */
export const fetchRemoteChatMessages = async (
  roomId: string,
  renterId?: string
): Promise<ChatMessage[]> => {
  const localList = getConversationMessages(roomId, renterId);
  if (!roomId) return localList;

  try {
    const safeRoomUUID = isValidUUID(roomId) ? roomId : stringToUUID(roomId);

    // 1. Query conversations table
    const { data: convData } = await (supabase
      .from('conversations')
      .select('id, owner_id, renter_id')
      .eq('room_id', safeRoomUUID)
      .limit(5) as any);

    if (Array.isArray(convData) && convData.length > 0) {
      const convIds = convData.map((c) => c.id);
      const { data: msgRows, error: msgError } = await (supabase
        .from('messages')
        .select('id, conversation_id, sender_id, content, created_at')
        .in('conversation_id', convIds)
        .order('created_at', { ascending: true }) as any);

      if (!msgError && Array.isArray(msgRows) && msgRows.length > 0) {
        const mappedRemote: ChatMessage[] = msgRows.map((row) => ({
          id: row.id,
          senderId: row.sender_id,
          senderName: 'User',
          senderRole: 'renter',
          text: row.content || '',
          timestamp: row.created_at
            ? new Date(row.created_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })
            : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isSelf: false,
          roomId,
        }));

        // Merge with local list
        const combined = [...localList];
        mappedRemote.forEach((m) => {
          if (!combined.some((item) => item.id === m.id)) {
            combined.push(m);
          }
        });
        return combined;
      }
    }

    return localList;
  } catch (err) {
    return localList;
  }
};

/**
 * Save chat message and broadcast
 */
export const saveRoomChatMessage = (
  roomId: string,
  message: ChatMessage,
  roomMeta?: {
    roomTitle?: string;
    roomTitleNp?: string;
    roomImage?: string;
    ownerId?: string;
    ownerName?: string;
    ownerPhone?: string;
    renterId?: string;
    renterName?: string;
  }
): ChatMessage[] => {
  if (typeof window === 'undefined' || !roomId) return [message];

  const resolvedRenterId =
    roomMeta?.renterId ||
    message.renterId ||
    (message.senderRole === 'renter' ? message.senderId : message.recipientId || 'guest');

  const resolvedConvId =
    message.conversationId || getConversationKey(roomId, resolvedRenterId);

  const enrichedMsg: ChatMessage = {
    ...message,
    roomId,
    conversationId: resolvedConvId,
    renterId: resolvedRenterId,
    senderSessionId: CURRENT_CLIENT_SESSION_ID,
  };

  // 1. Save to local storage & conversations index
  const updated = saveConversationMessageLocally(
    resolvedConvId,
    roomId,
    resolvedRenterId,
    enrichedMsg,
    roomMeta
  );

  // 2. Broadcast live across devices and Vercel deployments
  broadcastLiveChatMessage(roomId, enrichedMsg, resolvedConvId, resolvedRenterId).catch(() => {});

  // 3. Persist to Supabase PostgreSQL database in background
  persistMessageToSupabase(roomId, resolvedConvId, resolvedRenterId, enrichedMsg).catch(() => {});

  return updated;
};

/**
 * Persist message to Supabase database (`conversations` and `messages`)
 */
const persistMessageToSupabase = async (
  roomId: string,
  conversationId: string,
  renterId: string,
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
    const safeConvUUID = isValidUUID(conversationId) ? conversationId : stringToUUID(conversationId);
    const safeMsgUUID = isValidUUID(message.id) ? message.id : stringToUUID(message.id);
    const safeRenterUUID = isValidUUID(renterId) ? renterId : stringToUUID(renterId);

    // 1. Find or create conversation for this room + renter
    let convId: string = safeConvUUID;
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
          id: safeConvUUID,
          room_id: safeRoomUUID,
          owner_id: safeSenderUUID,
          renter_id: safeRenterUUID,
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
  } catch (e) {
    // Non-fatal if database RLS blocks unauthenticated guests
  }
};

/**
 * Subscribe to live chat messages
 */
export const subscribeToLiveRoomChat = (
  roomId: string,
  onNewMessage: (msg: ChatMessage) => void,
  targetRenterId?: string
): (() => void) => {
  // 1. Local listener
  const listener: LiveChatListener = (data) => {
    if (roomId === '*' || data.roomId === roomId) {
      if (!targetRenterId || targetRenterId === '*' || data.renterId === targetRenterId) {
        onNewMessage(data.message);
      }
    }
  };
  liveChatListeners.add(listener);

  // 2. Ensure global channel is connected
  getGlobalRealtimeChannel();

  // 3. Connect room channel
  let roomChannel: RealtimeChannel | null = null;
  if (roomId !== '*') {
    roomChannel = getSupabaseRoomChannel(roomId);
  }

  return () => {
    liveChatListeners.delete(listener);
  };
};

/**
 * Play gentle web audio chime on incoming live chat message
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
  } catch (e) {}
};

/**
 * Get all conversations across the entire platform (For Admin Dashboard)
 */
export const getAllConversations = (): ChatConversation[] => {
  if (typeof window === 'undefined') return [];
  try {
    const indexKey = 'iproom_conversations_index';
    const index: Record<string, ChatConversation> = JSON.parse(localStorage.getItem(indexKey) || '{}');
    const list = Object.values(index);
    return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  } catch (e) {
    return [];
  }
};

/**
 * Get all conversations for a specific room (For Room Owner)
 */
export const getRoomConversations = (roomId: string): ChatConversation[] => {
  const all = getAllConversations();
  return all.filter((c) => c.roomId === roomId);
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
    const allConvs = getAllConversations();
    allConvs.forEach((conv) => {
      const msgs = getConversationMessages(conv.roomId, conv.renterId);
      if (msgs.length > 0) {
        const lastMsg = msgs[msgs.length - 1];
        const unreadForOwner = msgs.filter((m) => m.senderRole !== 'owner').length;

        if (!result[conv.roomId]) {
          result[conv.roomId] = {
            total: msgs.length,
            lastMessage: lastMsg,
            unreadForOwner,
          };
        } else {
          result[conv.roomId].total += msgs.length;
          result[conv.roomId].unreadForOwner += unreadForOwner;
          if (
            new Date(lastMsg.timestamp).getTime() >=
            new Date(result[conv.roomId].lastMessage?.timestamp || 0).getTime()
          ) {
            result[conv.roomId].lastMessage = lastMsg;
          }
        }
      }
    });

    // Also check direct room keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('iproom_chat_') && !key.startsWith('iproom_chat_conv_') && key !== 'iproom_chat_last_event') {
        const roomId = key.replace('iproom_chat_', '');
        if (!result[roomId]) {
          const msgs = getRoomChatMessages(roomId);
          if (msgs.length > 0) {
            result[roomId] = {
              total: msgs.length,
              lastMessage: msgs[msgs.length - 1],
              unreadForOwner: msgs.filter((m) => m.senderRole !== 'owner').length,
            };
          }
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
    let query = supabase.from('conversations').select('id, room_id, owner_id, renter_id');
    if (roomId && isValidUUID(roomId)) {
      query = query.eq('room_id', roomId);
    }

    const { data: existingConvs } = await (query.limit(5) as any);

    if (Array.isArray(existingConvs) && existingConvs.length > 0) {
      return existingConvs[0].id;
    }

    const newId = isValidUUID(roomId || '') ? roomId! : stringToUUID(`conv_${Date.now()}`);
    const { data: created } = await (supabase
      .from('conversations')
      .insert({
        id: newId,
        room_id: roomId && isValidUUID(roomId) ? roomId : null,
        owner_id: otherUserId,
        renter_id: currentUserId,
      } as any)
      .select('id')
      .single() as any);

    return created?.id || newId;
  } catch (err) {
    return null;
  }
};

export const getDirectConversationMessages = async (
  conversationId: string,
  currentUserId: string
): Promise<ChatMessage[]> => {
  if (!isValidUUID(conversationId)) return [];

  try {
    const { data, error } = await (supabase
      .from('messages')
      .select('id, conversation_id, sender_id, content, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true }) as any);

    if (error || !data) return [];

    return data.map((row: any) => ({
      id: row.id,
      senderId: row.sender_id,
      senderName: row.sender_id === currentUserId ? 'You' : 'Participant',
      senderRole: (row.sender_id === currentUserId ? 'renter' : 'owner') as UserRole,
      text: row.content,
      timestamp: row.created_at
        ? new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '',
      isSelf: row.sender_id === currentUserId,
    }));
  } catch (err) {
    return [];
  }
};

export const sendMessage = async (
  conversationId: string,
  senderId: string,
  content: string
): Promise<ChatMessage | null> => {
  if (!isValidUUID(conversationId) || !isValidUUID(senderId)) return null;

  try {
    const safeMsgUUID = stringToUUID(`msg_${Date.now()}_${Math.random()}`);
    const { data, error } = await (supabase
      .from('messages')
      .insert({
        id: safeMsgUUID,
        conversation_id: conversationId,
        sender_id: senderId,
        content,
        is_read: false,
        created_at: new Date().toISOString(),
      } as any)
      .select()
      .single() as any);

    if (error || !data) return null;

    return {
      id: data.id,
      senderId: data.sender_id,
      senderName: 'You',
      senderRole: 'renter',
      text: data.content,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSelf: true,
    };
  } catch (err) {
    return null;
  }
};

export const subscribeToMessages = (
  conversationId: string,
  currentUserId: string,
  onMessageReceived: (message: ChatMessage) => void
): (() => void) => {
  if (!isValidUUID(conversationId)) return () => {};

  const channel = supabase
    .channel(`conv_channel_${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        const row = payload.new as any;
        if (row && row.content) {
          onMessageReceived({
            id: row.id,
            senderId: row.sender_id,
            senderName: row.sender_id === currentUserId ? 'You' : 'Participant',
            senderRole: row.sender_id === currentUserId ? 'renter' : 'owner',
            text: row.content,
            timestamp: new Date(row.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            }),
            isSelf: row.sender_id === currentUserId,
          });
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};
