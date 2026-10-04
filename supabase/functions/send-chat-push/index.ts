// Supabase Edge Function: send-chat-push
// Triggered by Database Webhook on INSERT into public.messages
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.7";

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  schema: string;
  record: {
    id: string;
    conversation_id: string;
    sender_id: string;
    content: string;
    is_read: boolean;
    created_at: string;
  };
}

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY') || 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY') || '';
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:support@iproomnepal.com';

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
    }

    const payload: WebhookPayload = await req.json();
    const message = payload.record;

    if (!message || !message.conversation_id || !message.sender_id || !message.content) {
      return new Response(JSON.stringify({ message: 'No valid message record found' }), { status: 200 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch parent conversation to identify participants
    const { data: conv, error: convError } = await supabase
      .from('conversations')
      .select('id, room_id, renter_id, owner_id')
      .eq('id', message.conversation_id)
      .single();

    if (convError || !conv) {
      console.error('Conversation not found for id:', message.conversation_id, convError);
      return new Response(JSON.stringify({ error: 'Conversation not found' }), { status: 404 });
    }

    // 2. Identify recipient: the other participant (NEVER the sender!)
    const recipientId = conv.owner_id === message.sender_id ? conv.renter_id : conv.owner_id;
    if (!recipientId || recipientId === message.sender_id) {
      return new Response(JSON.stringify({ message: 'Sender is recipient or self-message; skipped' }), { status: 200 });
    }

    // 3. Fetch sender's name and room info
    const [{ data: senderProfile }, { data: room }] = await Promise.all([
      supabase.from('profiles').select('id, name, full_name').eq('id', message.sender_id).maybeSingle(),
      supabase.from('rooms').select('id, title, title_np').eq('id', conv.room_id).maybeSingle(),
    ]);

    const senderName = senderProfile?.full_name || senderProfile?.name || 'Tenant/Owner';
    const roomTitle = room?.title || 'Room Listing';
    const shortBody = message.content.length > 80 ? message.content.substring(0, 77) + '...' : message.content;

    // 4. Create in-app notification record for the recipient
    await supabase.from('notifications').insert({
      user_id: recipientId,
      type: 'chat_message',
      title: `${senderName} 💬`,
      message: `"${shortBody}" — ${roomTitle}`,
      is_read: false,
      reference_id: conv.room_id,
      created_at: new Date().toISOString(),
    });

    // 5. Fetch Web Push subscriptions for recipient
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', recipientId);

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ message: 'In-app notification created; no web push subscriptions registered for recipient.' }), { status: 200 });
    }

    // 6. Send Web Push to all registered devices of the recipient
    if (vapidPublicKey && vapidPrivateKey) {
      webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

      const pushPayload = JSON.stringify({
        title: `${senderName} (${roomTitle})`,
        body: shortBody,
        url: `/?room=${conv.room_id}&chat=true`,
        conversationId: conv.id,
        roomId: conv.room_id,
      });

      const pushPromises = subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            pushPayload
          );
        } catch (pushErr: any) {
          // If status is 404 or 410, subscription has expired -> delete it
          if (pushErr.statusCode === 404 || pushErr.statusCode === 410) {
            console.warn(`Deleting expired push subscription ${sub.id}`);
            await supabase.from('push_subscriptions').delete().eq('id', sub.id);
          } else {
            console.error(`Push send error for sub ${sub.id}:`, pushErr);
          }
        }
      });

      await Promise.allSettled(pushPromises);
    }

    return new Response(JSON.stringify({ success: true, recipientId }), { status: 200 });
  } catch (err: any) {
    console.error('Unhandled error in send-chat-push:', err);
    return new Response(JSON.stringify({ error: err?.message || 'Internal server error' }), { status: 500 });
  }
});
