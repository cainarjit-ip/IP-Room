-- =========================================================================
-- IP Room Nepal: Complete Renter <-> Room Owner Real-Time Chat & Messaging System
-- Migration 003: Tables, Constraints, RLS, Indexes, and Realtime Publications
-- =========================================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -------------------------------------------------------------------------
-- 1. CONVERSATIONS TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
  renter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at TIMESTAMPTZ DEFAULT now(),
  last_message_preview TEXT,
  renter_unread_count INT NOT NULL DEFAULT 0,
  owner_unread_count INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'blocked')),
  archived_at TIMESTAMPTZ,
  CONSTRAINT unique_room_renter UNIQUE (room_id, renter_id),
  CONSTRAINT check_renter_not_owner CHECK (renter_id <> owner_id)
);

-- Ensure all columns exist if table was previously created with minimal schema
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS listing_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS renter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS last_message_preview TEXT;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS renter_unread_count INT DEFAULT 0;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS owner_unread_count INT DEFAULT 0;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Sync listing_id with room_id for dual compatibility
UPDATE public.conversations SET listing_id = room_id WHERE listing_id IS NULL AND room_id IS NOT NULL;

-- Indexes for lightning fast conversation list lookups
CREATE INDEX IF NOT EXISTS idx_conversations_renter ON public.conversations(renter_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_owner ON public.conversations(owner_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_room ON public.conversations(room_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON public.conversations(status);

-- -------------------------------------------------------------------------
-- 2. MESSAGES TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image')),
  message_text TEXT,
  content TEXT, -- alias kept in sync with message_text
  attachment_url TEXT,
  attachment_type TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Ensure all columns exist if table was previously created
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text';
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS message_text TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS attachment_url TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS attachment_type TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Sync content & message_text
UPDATE public.messages SET message_text = content WHERE message_text IS NULL AND content IS NOT NULL;
UPDATE public.messages SET content = message_text WHERE content IS NULL AND message_text IS NOT NULL;

-- Indexes for rapid message timeline pagination
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON public.messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON public.messages(conversation_id, is_read) WHERE is_read = false;

-- -------------------------------------------------------------------------
-- 3. CHAT REPORTS TABLE (Moderation)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chat_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('Spam', 'Fraud', 'Harassment', 'Fake listing', 'Inappropriate content', 'Other')),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_reports_status ON public.chat_reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_reports_conversation ON public.chat_reports(conversation_id);

-- -------------------------------------------------------------------------
-- 4. CHAT BLOCKS TABLE (Safety & Security)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chat_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_blocker_blocked UNIQUE (blocker_id, blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_blocks_pair ON public.chat_blocks(blocker_id, blocked_id);

-- -------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- -------------------------------------------------------------------------
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_blocks ENABLE ROW LEVEL SECURITY;

-- Helper function: is_admin check
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
$$;

-- Conversations RLS Policies
DROP POLICY IF EXISTS "Participants and admin can view conversations" ON public.conversations;
CREATE POLICY "Participants and admin can view conversations"
ON public.conversations FOR SELECT
TO authenticated
USING (
  auth.uid() = renter_id
  OR auth.uid() = owner_id
  OR public.is_admin()
);

DROP POLICY IF EXISTS "Users can start conversations" ON public.conversations;
CREATE POLICY "Users can start conversations"
ON public.conversations FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = renter_id
  OR auth.uid() = owner_id
);

DROP POLICY IF EXISTS "Participants can update conversations" ON public.conversations;
CREATE POLICY "Participants can update conversations"
ON public.conversations FOR UPDATE
TO authenticated
USING (
  auth.uid() = renter_id
  OR auth.uid() = owner_id
  OR public.is_admin()
)
WITH CHECK (
  auth.uid() = renter_id
  OR auth.uid() = owner_id
  OR public.is_admin()
);

-- Messages RLS Policies
DROP POLICY IF EXISTS "Conversation participants can select messages" ON public.messages;
CREATE POLICY "Conversation participants can select messages"
ON public.messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
    AND (c.renter_id = auth.uid() OR c.owner_id = auth.uid() OR public.is_admin())
  )
);

DROP POLICY IF EXISTS "Conversation participants can insert messages" ON public.messages;
CREATE POLICY "Conversation participants can insert messages"
ON public.messages FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
    AND (c.renter_id = auth.uid() OR c.owner_id = auth.uid())
    AND c.status <> 'blocked'
  )
  -- Sender must not be blocked by recipient
  AND NOT EXISTS (
    SELECT 1 FROM public.chat_blocks b
    WHERE b.blocker_id = messages.receiver_id
    AND b.blocked_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Sender can soft-delete and recipient can mark read" ON public.messages;
CREATE POLICY "Sender can soft-delete and recipient can mark read"
ON public.messages FOR UPDATE
TO authenticated
USING (
  sender_id = auth.uid()
  OR receiver_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
    AND (c.renter_id = auth.uid() OR c.owner_id = auth.uid() OR public.is_admin())
  )
);

-- Chat Reports RLS Policies
DROP POLICY IF EXISTS "Users can create chat reports" ON public.chat_reports;
CREATE POLICY "Users can create chat reports"
ON public.chat_reports FOR INSERT
TO authenticated
WITH CHECK (
  reporter_id = auth.uid()
);

DROP POLICY IF EXISTS "Reporter and admin can view chat reports" ON public.chat_reports;
CREATE POLICY "Reporter and admin can view chat reports"
ON public.chat_reports FOR SELECT
TO authenticated
USING (
  reporter_id = auth.uid()
  OR public.is_admin()
);

DROP POLICY IF EXISTS "Admin can update chat reports" ON public.chat_reports;
CREATE POLICY "Admin can update chat reports"
ON public.chat_reports FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Chat Blocks RLS Policies
DROP POLICY IF EXISTS "Users can view own blocks" ON public.chat_blocks;
CREATE POLICY "Users can view own blocks"
ON public.chat_blocks FOR SELECT
TO authenticated
USING (blocker_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Users can create blocks" ON public.chat_blocks;
CREATE POLICY "Users can create blocks"
ON public.chat_blocks FOR INSERT
TO authenticated
WITH CHECK (blocker_id = auth.uid());

DROP POLICY IF EXISTS "Users can remove own blocks" ON public.chat_blocks;
CREATE POLICY "Users can remove own blocks"
ON public.chat_blocks FOR DELETE
TO authenticated
USING (blocker_id = auth.uid() OR public.is_admin());

-- -------------------------------------------------------------------------
-- 6. AUTOMATIC CONVERSATION STATS TRIGGER
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_chat_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Sync content / message_text if one is null
  IF NEW.content IS NULL AND NEW.message_text IS NOT NULL THEN
    NEW.content := NEW.message_text;
  ELSIF NEW.message_text IS NULL AND NEW.content IS NOT NULL THEN
    NEW.message_text := NEW.content;
  END IF;

  -- Update conversation last_message_at, last_message_preview, unread count
  UPDATE public.conversations
  SET
    last_message_at = NEW.created_at,
    last_message_preview = CASE
      WHEN NEW.message_type = 'image' THEN '📷 Photo attachment'
      ELSE substring(COALESCE(NEW.content, NEW.message_text, '') from 1 for 100)
    END,
    updated_at = now(),
    -- Increment unread count for recipient
    renter_unread_count = CASE
      WHEN NEW.sender_id = owner_id THEN renter_unread_count + 1
      ELSE renter_unread_count
    END,
    owner_unread_count = CASE
      WHEN NEW.sender_id = renter_id THEN owner_unread_count + 1
      ELSE owner_unread_count
    END
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_new_chat_message ON public.messages;
CREATE TRIGGER trg_new_chat_message
BEFORE INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_chat_message();

-- -------------------------------------------------------------------------
-- 7. REALTIME PUBLICATION
-- -------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_reports;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_blocks;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    -- Table already in publication, ignore
    NULL;
END;
$$;
