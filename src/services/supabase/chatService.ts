import { supabase, isValidUUID, getAuthenticatedSessionUser } from '../../lib/supabase';
import { ChatMessage, UserRole } from '../../types';

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
 * Realtime subscription to messages
 */
export const subscribeToMessages = (
  conversationId: string,
  currentUserId: string,
  onNewMessage: (msg: ChatMessage) => void
): (() => void) => {
  if (!isValidUUID(conversationId)) return () => {};

  const channel = supabase
    .channel(`messages-${conversationId}`)
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
