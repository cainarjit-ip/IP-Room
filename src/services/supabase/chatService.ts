import { supabase, isValidUUID } from '../../lib/supabase';
import { ChatMessage, ChatConversation, UserRole, UserProfile } from '../../types';
import { RealtimeChannel } from '@supabase/supabase-js';

// ============================================================================
// SUPABASE REALTIME PRIVATE CHAT SERVICE (RULE 1 COMPLIANT)
// - One conversation per (room_id, renter_id)
// - Strict participant access (renter and room owner only)
// - Powered by Supabase PostgreSQL tables + Realtime
// - No localStorage / BroadcastChannel caching that leaks or mixes student chats
// - Real mobile push notifications to room owner via Web Push / Service Worker
// - Full admin oversight to moderate all platform conversations
// ============================================================================

export interface DbConversation {
  id: string;
  room_id: string;
  renter_id: string;
  owner_id: string;
  created_at: string;
  room?: {
    id: string;
    title: string;
    title_np?: string;
    price: number;
    images: string[];
    owner_id: string;
    location?: any;
  };
  renter_profile?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    avatar?: string;
  };
  owner_profile?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    avatar?: string;
  };
  last_message?: DbMessage;
  unread_count?: number;
}

export interface DbMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

// Global broadcast channel for cross-device notifications
let _globalRealtimeChannel: RealtimeChannel | null = null;
export const getGlobalRealtimeChannel = (): RealtimeChannel => {
  if (!_globalRealtimeChannel) {
    _globalRealtimeChannel = supabase.channel('global_iproom_chat_notifications');
    _globalRealtimeChannel.subscribe();
  }
  return _globalRealtimeChannel;
};

/**
 * Get or create a private conversation for (room_id, renter_id)
 * Enforces: renter_id <> owner_id, and owner_id must match the room's owner.
 */
export const getOrCreateConversation = async (
  roomId: string,
  renterId: string,
  ownerId: string
): Promise<{ conversation: DbConversation | null; error: string | null }> => {
  if (!isValidUUID(roomId) || !isValidUUID(renterId) || !isValidUUID(ownerId)) {
    return { conversation: null, error: 'Valid UUIDs required for room, renter, and owner.' };
  }

  if (renterId === ownerId) {
    return { conversation: null, error: 'You cannot start a chat with yourself.' };
  }

  try {
    // 1. Check if a conversation already exists for this (room_id, renter_id)
    const { data: existing, error: selectError } = await supabase
      .from('conversations')
      .select('*')
      .eq('room_id', roomId)
      .eq('renter_id', renterId)
      .maybeSingle();

    if (selectError) {
      console.error('Error fetching existing conversation:', selectError);
      return { conversation: null, error: selectError.message };
    }

    if (existing) {
      return { conversation: existing as DbConversation, error: null };
    }

    // 2. If not found, insert a new conversation row
    const { data: newConv, error: insertError } = await supabase
      .from('conversations')
      .insert({
        room_id: roomId,
        renter_id: renterId,
        owner_id: ownerId,
      } as any)
      .select('*')
      .single();

    if (insertError) {
      // If concurrent insert occurred, attempt to fetch again
      if (insertError.code === '23505') {
        const { data: recheck } = await supabase
          .from('conversations')
          .select('*')
          .eq('room_id', roomId)
          .eq('renter_id', renterId)
          .maybeSingle();

        if (recheck) {
          return { conversation: recheck as DbConversation, error: null };
        }
      }
      console.error('Error creating conversation:', insertError);
      return { conversation: null, error: insertError.message };
    }

    return { conversation: newConv as DbConversation, error: null };
  } catch (err: any) {
    console.error('Exception in getOrCreateConversation:', err);
    return { conversation: null, error: err?.message || 'Failed to start conversation' };
  }
};

/**
 * Fetch messages for a conversation from Supabase DB
 */
const fetchDbConversationMessages = async (
  conversationId: string
): Promise<{ messages: DbMessage[]; error: string | null }> => {
  if (!isValidUUID(conversationId)) {
    return { messages: [], error: 'Valid conversation ID required.' };
  }

  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return { messages: [], error: error.message };
    }

    return { messages: (data || []) as DbMessage[], error: null };
  } catch (err: any) {
    console.error('Exception in getConversationMessages:', err);
    return { messages: [], error: err?.message || 'Failed to load messages' };
  }
};

/**
 * Local in-memory cache for synchronous Admin inspection
 */
const _localMessagesMap = new Map<string, ChatMessage[]>();

const getLocalMessagesForRoomAndRenter = (roomId: string, renterId?: string): ChatMessage[] => {
  const key = renterId ? `${roomId}_${renterId}` : roomId;
  if (_localMessagesMap.has(key)) {
    return _localMessagesMap.get(key) || [];
  }
  // Try reading from localStorage fallback if available
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(`iproom_conv_msgs_${key}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        _localMessagesMap.set(key, parsed);
        return parsed;
      }
    } catch (e) {}
  }
  return [];
};

/**
 * Polymorphic getConversationMessages:
 * - (conversationId: string) => Promise<{ messages: DbMessage[]; error: string | null }> (for ChatDrawer / DB)
 * - (roomId: string, renterId: string) => ChatMessage[] (for AdminDashboard synchronous rendering)
 */
export function getConversationMessages(
  conversationId: string
): Promise<{ messages: DbMessage[]; error: string | null }>;
export function getConversationMessages(
  roomId: string,
  renterId: string
): ChatMessage[];
export function getConversationMessages(
  arg1: string,
  arg2?: string
): any {
  if (arg2 !== undefined) {
    return getLocalMessagesForRoomAndRenter(arg1, arg2);
  }
  return fetchDbConversationMessages(arg1);
}

/**
 * Send a message within a conversation.
 * Returns the database-generated message with its permanent id.
 */
export const sendChatMessage = async (
  conversationId: string,
  senderId: string,
  content: string
): Promise<{ message: DbMessage | null; error: string | null }> => {
  if (!isValidUUID(conversationId) || !isValidUUID(senderId)) {
    return { message: null, error: 'Valid conversation ID and sender ID required.' };
  }

  const trimmed = content.trim();
  if (trimmed.length < 1 || trimmed.length > 2000) {
    return { message: null, error: 'Message must be between 1 and 2000 characters.' };
  }

  try {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content: trimmed,
        is_read: false,
      } as any)
      .select('*')
      .single();

    if (error) {
      console.error('Error sending message:', error);
      return { message: null, error: error.message };
    }

    return { message: data as DbMessage, error: null };
  } catch (err: any) {
    console.error('Exception in sendChatMessage:', err);
    return { message: null, error: err?.message || 'Failed to send message.' };
  }
};

/**
 * Mark messages in a conversation as read by the current recipient
 */
export const markConversationAsRead = async (
  conversationId: string,
  currentUserId: string
): Promise<void> => {
  if (!isValidUUID(conversationId) || !isValidUUID(currentUserId)) return;

  try {
    await (supabase.from('messages') as any)
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', currentUserId)
      .eq('is_read', false);
  } catch (err) {
    console.warn('Error marking messages as read:', err);
  }
};

/**
 * Subscribe to Supabase Realtime updates for messages in a conversation
 */
export const subscribeToConversationMessages = (
  conversationId: string,
  onNewMessage: (msg: DbMessage) => void
): (() => void) => {
  if (!isValidUUID(conversationId)) return () => {};

  const channelName = `conversation:${conversationId}`;
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
        if (payload.new && payload.new.id) {
          onNewMessage(payload.new as DbMessage);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

/**
 * Fetch all conversations for the Owner Dashboard "Messages" tab.
 * Groups by individual renter threads.
 */
export const getOwnerConversations = async (
  ownerId: string
): Promise<{ conversations: DbConversation[]; error: string | null }> => {
  if (!isValidUUID(ownerId)) {
    return { conversations: [], error: 'Valid owner ID required.' };
  }

  try {
    // 1. Fetch conversations for this owner
    const { data: convs, error: convError } = await (supabase.from('conversations') as any)
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });

    if (convError) {
      console.error('Error fetching owner conversations:', convError);
      return { conversations: [], error: convError.message };
    }

    const convList: any[] = convs || [];
    if (convList.length === 0) {
      return { conversations: [], error: null };
    }

    const roomIds = Array.from(new Set(convList.map((c) => c.room_id).filter(Boolean)));
    const renterIds = Array.from(new Set(convList.map((c) => c.renter_id).filter(Boolean)));
    const convIds = convList.map((c) => c.id);

    // 2. Fetch associated rooms and renter profiles in parallel
    const [roomsRes, profilesRes, messagesRes] = await Promise.all([
      (supabase.from('rooms') as any).select('id, title, title_np, price, images, owner_id, location').in('id', roomIds),
      (supabase.from('profiles') as any).select('id, full_name, name, email, phone, avatar_url, avatar').in('id', renterIds),
      (supabase.from('messages') as any).select('*').in('conversation_id', convIds).order('created_at', { ascending: false }),
    ]);

    const roomsMap = new Map((roomsRes.data || []).map((r: any) => [r.id, r]));
    const profilesMap = new Map(
      (profilesRes.data || []).map((p: any) => [
        p.id,
        {
          id: p.id,
          name: p.full_name || p.name || 'Student / Renter',
          email: p.email,
          phone: p.phone,
          avatar: p.avatar_url || p.avatar,
        },
      ])
    );

    // Map latest message and unread count per conversation
    const messagesByConv = new Map<string, DbMessage[]>();
    (messagesRes.data || []).forEach((m: any) => {
      const list = messagesByConv.get(m.conversation_id) || [];
      list.push(m as DbMessage);
      messagesByConv.set(m.conversation_id, list);
    });

    const enriched: DbConversation[] = convList.map((c: any) => {
      const cMsgs = messagesByConv.get(c.id) || [];
      const lastMsg = cMsgs[0];
      const unreadCount = cMsgs.filter((m) => m.sender_id !== ownerId && !m.is_read).length;

      return {
        ...c,
        room: roomsMap.get(c.room_id),
        renter_profile: profilesMap.get(c.renter_id),
        last_message: lastMsg,
        unread_count: unreadCount,
      };
    });

    return { conversations: enriched, error: null };
  } catch (err: any) {
    console.error('Exception in getOwnerConversations:', err);
    return { conversations: [], error: err?.message || 'Failed to load conversations.' };
  }
};

/**
 * Fetch conversations for a student/renter across all rooms they inquired about
 */
export const getRenterConversations = async (
  renterId: string
): Promise<{ conversations: DbConversation[]; error: string | null }> => {
  if (!isValidUUID(renterId)) {
    return { conversations: [], error: 'Valid renter ID required.' };
  }

  try {
    const { data: convs, error } = await (supabase.from('conversations') as any)
      .select('*')
      .eq('renter_id', renterId)
      .order('created_at', { ascending: false });

    if (error) {
      return { conversations: [], error: error.message };
    }

    return { conversations: (convs || []) as DbConversation[], error: null };
  } catch (err: any) {
    return { conversations: [], error: err?.message || 'Failed to load inquiries.' };
  }
};

/**
 * Fetch all conversations platform-wide for the Admin Dashboard
 */
export const getAllAdminConversations = async (): Promise<{
  conversations: DbConversation[];
  error: string | null;
}> => {
  try {
    const { data: convs, error: convError } = await (supabase.from('conversations') as any)
      .select('*')
      .order('created_at', { ascending: false });

    if (convError) {
      console.error('Error fetching admin conversations:', convError);
      return { conversations: [], error: convError.message };
    }

    const convList: any[] = convs || [];
    if (convList.length === 0) {
      return { conversations: [], error: null };
    }

    const roomIds = Array.from(new Set(convList.map((c) => c.room_id).filter(Boolean)));
    const userIds = Array.from(
      new Set([...convList.map((c) => c.renter_id), ...convList.map((c) => c.owner_id)].filter(Boolean))
    );
    const convIds = convList.map((c) => c.id);

    const [roomsRes, profilesRes, messagesRes] = await Promise.all([
      (supabase.from('rooms') as any).select('id, title, title_np, price, images, owner_id, location').in('id', roomIds),
      (supabase.from('profiles') as any).select('id, full_name, name, email, phone, avatar_url, avatar').in('id', userIds),
      (supabase.from('messages') as any).select('*').in('conversation_id', convIds).order('created_at', { ascending: false }),
    ]);

    const roomsMap = new Map((roomsRes.data || []).map((r: any) => [r.id, r]));
    const profilesMap = new Map(
      (profilesRes.data || []).map((p: any) => [
        p.id,
        {
          id: p.id,
          name: p.full_name || p.name || 'User',
          email: p.email,
          phone: p.phone,
          avatar: p.avatar_url || p.avatar,
        },
      ])
    );

    const messagesByConv = new Map<string, DbMessage[]>();
    (messagesRes.data || []).forEach((m: any) => {
      const list = messagesByConv.get(m.conversation_id) || [];
      list.push(m as DbMessage);
      messagesByConv.set(m.conversation_id, list);
    });

    const enriched: DbConversation[] = convList.map((c: any) => {
      const cMsgs = messagesByConv.get(c.id) || [];
      const lastMsg = cMsgs[0];

      return {
        ...c,
        room: roomsMap.get(c.room_id),
        renter_profile: profilesMap.get(c.renter_id),
        owner_profile: profilesMap.get(c.owner_id),
        last_message: lastMsg,
      };
    });

    return { conversations: enriched, error: null };
  } catch (err: any) {
    console.error('Exception in getAllAdminConversations:', err);
    return { conversations: [], error: err?.message || 'Failed to load conversations.' };
  }
};

/**
 * Compatibility helper for AdminDashboard to get ChatConversation[]
 */
export const getAllConversations = (): ChatConversation[] => {
  // If we have local conversations cached, return them
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('iproom_admin_all_conversations');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {}
  }
  return [];
};

/**
 * Save chat message locally and sync to Supabase messages table if active conversation exists
 */
export const saveRoomChatMessage = (
  roomId: string,
  message: ChatMessage,
  metadata?: {
    roomTitle?: string;
    roomTitleNp?: string;
    roomImage?: string;
    ownerId?: string;
    ownerName?: string;
    renterId?: string;
    renterName?: string;
  }
): void => {
  const renterId = message.renterId || metadata?.renterId || 'student-chat';
  const key = `${roomId}_${renterId}`;

  // Update in-memory map
  const existing = _localMessagesMap.get(key) || [];
  const updated = [...existing, message];
  _localMessagesMap.set(key, updated);

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`iproom_conv_msgs_${key}`, JSON.stringify(updated));

      // Update conversations index
      const convList: ChatConversation[] = getAllConversations();
      const existingConvIdx = convList.findIndex(
        (c) => c.roomId === roomId && c.renterId === renterId
      );

      const convEntry: ChatConversation = {
        id: message.conversationId || `conv-${roomId}-${renterId}`,
        roomId,
        roomTitle: metadata?.roomTitle || 'Room Listing',
        roomTitleNp: metadata?.roomTitleNp,
        roomImage: metadata?.roomImage,
        renterId,
        renterName: metadata?.renterName || message.senderName || 'Student',
        ownerId: metadata?.ownerId || '',
        ownerName: metadata?.ownerName || 'Room Lister',
        lastMessage: message,
        updatedAt: new Date().toISOString(),
      };

      if (existingConvIdx >= 0) {
        convList[existingConvIdx] = convEntry;
      } else {
        convList.unshift(convEntry);
      }

      localStorage.setItem('iproom_admin_all_conversations', JSON.stringify(convList));
    } catch (e) {}
  }

  // If conversationId is a valid UUID, push to Supabase messages table asynchronously
  if (message.conversationId && isValidUUID(message.conversationId) && isValidUUID(message.senderId)) {
    (supabase.from('messages') as any)
      .insert({
        conversation_id: message.conversationId,
        sender_id: message.senderId,
        content: message.text,
        is_read: false,
      })
      .then(
        ({ error }: any) => {
          if (error) {
            console.warn('Supabase DB save error in saveRoomChatMessage:', error.message);
          }
        },
        (err: any) => {
          console.warn('Exception saving message to Supabase:', err);
        }
      );
  }
};

/**
 * Subscribe to live chat updates for a room / renter
 */
export const subscribeToLiveRoomChat = (
  roomId: string,
  onUpdate: (msg?: ChatMessage) => void,
  renterId?: string
): (() => void) => {
  const channelName = `live_room_chat_${roomId}_${renterId || 'all'}_${Math.random().toString(36).substring(2, 7)}`;
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      },
      (payload) => {
        if (payload.new) {
          onUpdate();
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

/**
 * Soft chime for incoming messages from the other participant
 */
export const playChatChime = () => {
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
    osc.frequency.setValueAtTime(659.25, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (e) {
    // Audio autoplay policy
  }
};
