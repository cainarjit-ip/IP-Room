-- =========================================================================
-- IP Room Nepal: Rules 1, 2, 3 Migration Script
-- 1. Private Chat (conversations & messages with RLS & Realtime)
-- 2. Web Push Notifications for Room Owners (push_subscriptions & RLS)
-- 3. Strict Room Ownership (Only owner can delete/update rooms, trigger lock)
-- =========================================================================

-- -------------------------------------------------------------------------
-- RULE 1: PRIVATE CHAT TABLES & RLS
-- -------------------------------------------------------------------------

-- Create conversations table (One conversation per room_id + renter_id)
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  renter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_room_renter UNIQUE (room_id, renter_id),
  CONSTRAINT check_renter_not_owner CHECK (renter_id <> owner_id)
);

-- Ensure columns exist if table already existed with generic schema
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS renter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_conversations_room_renter ON public.conversations(room_id, renter_id);
CREATE INDEX IF NOT EXISTS idx_conversations_owner ON public.conversations(owner_id);
CREATE INDEX IF NOT EXISTS idx_conversations_renter ON public.conversations(renter_id);

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (length(content) BETWEEN 1 AND 2000),
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure columns exist if table already existed
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON public.messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);

-- Enable RLS on conversations and messages
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Conversations RLS
DROP POLICY IF EXISTS "Participants and admin can view conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can view own conversations" ON public.conversations;
CREATE POLICY "Participants and admin can view conversations"
ON public.conversations FOR SELECT
TO authenticated
USING (
  (select auth.uid()) IN (renter_id, owner_id)
  OR public.is_admin()
);

DROP POLICY IF EXISTS "Renters can start conversation with room owner" ON public.conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
CREATE POLICY "Renters can start conversation with room owner"
ON public.conversations FOR INSERT
TO authenticated
WITH CHECK (
  (select auth.uid()) = renter_id
  AND owner_id = (SELECT owner_id FROM public.rooms WHERE id = room_id)
);

-- Messages RLS
DROP POLICY IF EXISTS "Conversation participants and admin can select messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view own messages" ON public.messages;
CREATE POLICY "Conversation participants and admin can select messages"
ON public.messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
    AND (c.renter_id = (select auth.uid()) OR c.owner_id = (select auth.uid()) OR public.is_admin())
  )
);

DROP POLICY IF EXISTS "Conversation participants can insert messages" ON public.messages;
DROP POLICY IF EXISTS "Users can insert messages" ON public.messages;
CREATE POLICY "Conversation participants can insert messages"
ON public.messages FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = (select auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
    AND (c.renter_id = (select auth.uid()) OR c.owner_id = (select auth.uid()))
  )
);

DROP POLICY IF EXISTS "Recipients can mark messages as read" ON public.messages;
DROP POLICY IF EXISTS "Users can update own messages" ON public.messages;
CREATE POLICY "Recipients can mark messages as read"
ON public.messages FOR UPDATE
TO authenticated
USING (
  sender_id <> (select auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
    AND (c.renter_id = (select auth.uid()) OR c.owner_id = (select auth.uid()))
  )
)
WITH CHECK (
  sender_id <> (select auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
    AND (c.renter_id = (select auth.uid()) OR c.owner_id = (select auth.uid()))
  )
);

-- Realtime Publication for messages and conversations
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;

-- -------------------------------------------------------------------------
-- RULE 2: PUSH NOTIFICATIONS TABLE & RLS
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can view own push subscriptions"
ON public.push_subscriptions FOR SELECT
TO authenticated
USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can insert own push subscriptions"
ON public.push_subscriptions FOR INSERT
TO authenticated
WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can delete own push subscriptions"
ON public.push_subscriptions FOR DELETE
TO authenticated
USING (user_id = (select auth.uid()));

-- -------------------------------------------------------------------------
-- RULE 3: STRICT ROOM OWNERSHIP & REMOVAL PROTECTION
-- -------------------------------------------------------------------------

-- 1. Prevent changing rooms.owner_id after creation
CREATE OR REPLACE FUNCTION public.protect_room_owner()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.owner_id IS NOT NULL AND NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
      RAISE EXCEPTION 'Changing room owner_id is strictly prohibited';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_protect_room_owner ON public.rooms;
CREATE TRIGGER trigger_protect_room_owner
  BEFORE UPDATE ON public.rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_room_owner();

-- 2. Prevent non-admins from changing user roles
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      IF NOT public.is_admin() AND COALESCE(auth.jwt() ->> 'role', '') <> 'service_role' THEN
        NEW.role := OLD.role;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_protect_profile_role ON public.profiles;
CREATE TRIGGER trigger_protect_profile_role
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_role();

-- 3. Strict Room RLS: Only owner can remove or edit their own room
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view approved rooms" ON public.rooms;
DROP POLICY IF EXISTS "Anyone can view rooms" ON public.rooms;
CREATE POLICY "Anyone can view rooms"
ON public.rooms FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Owners can insert their own rooms" ON public.rooms;
DROP POLICY IF EXISTS "Anyone can insert rooms" ON public.rooms;
CREATE POLICY "Owners can insert their own rooms"
ON public.rooms FOR INSERT
TO authenticated
WITH CHECK (
  owner_id = (select auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (select auth.uid()) AND role = 'owner'
  )
);

DROP POLICY IF EXISTS "Owners and admins can update rooms" ON public.rooms;
DROP POLICY IF EXISTS "Anyone can update rooms" ON public.rooms;
DROP POLICY IF EXISTS "Only the owner can update their own room" ON public.rooms;
CREATE POLICY "Only the owner can update their own room"
ON public.rooms FOR UPDATE
TO authenticated
USING (owner_id = (select auth.uid()))
WITH CHECK (owner_id = (select auth.uid()));

DROP POLICY IF EXISTS "Owners and admins can delete rooms" ON public.rooms;
DROP POLICY IF EXISTS "Anyone can delete rooms" ON public.rooms;
DROP POLICY IF EXISTS "Only the owner can delete their own room" ON public.rooms;
CREATE POLICY "Only the owner can delete their own room"
ON public.rooms FOR DELETE
TO authenticated
USING (owner_id = (select auth.uid()));

-- Grant standard permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;
