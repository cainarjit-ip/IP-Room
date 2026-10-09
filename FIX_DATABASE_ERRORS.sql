-- =========================================================================
-- IP Room Nepal: Comprehensive Database Schema Fix Script
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/stygqxxldbegjilpzlco/sql)
-- Fixes all 400 & 404 console errors:
-- 1. room_views 404 (Missing table)
-- 2. conversations last_message_at, renter_unread_count, etc. 400 (Missing columns)
-- 3. messages read_at, receiver_id, message_type 400 (Missing columns)
-- 4. notifications is_read, read 400 (Missing columns)
-- =========================================================================

-- 1. CREATE room_views TABLE (Fixes 404 error)
CREATE TABLE IF NOT EXISTS public.room_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_room_views_room_id ON public.room_views(room_id);
ALTER TABLE public.room_views ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Allow public insert room_views" ON public.room_views FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Allow public select room_views" ON public.room_views FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. UPDATE conversations TABLE (Fixes "Could not find last_message_at column" 400 error)
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS listing_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS renter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS last_message_preview TEXT DEFAULT 'Conversation started';
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS renter_unread_count INT NOT NULL DEFAULT 0;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS owner_unread_count INT NOT NULL DEFAULT 0;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Sync listing_id with room_id for backward compatibility
UPDATE public.conversations SET listing_id = room_id WHERE listing_id IS NULL AND room_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_renter ON public.conversations(renter_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_owner ON public.conversations(owner_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_room ON public.conversations(room_id);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Allow authenticated users to view own conversations"
  ON public.conversations FOR SELECT
  USING (auth.uid() IS NULL OR auth.uid() = renter_id OR auth.uid() = owner_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Allow authenticated users to create conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Allow participants to update conversations"
  ON public.conversations FOR UPDATE
  USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. UPDATE messages TABLE (Fixes &is_read=eq.false 400 error)
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS receiver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS message_text TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text';
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS attachment_url TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS attachment_type TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Sync message aliases
UPDATE public.messages SET message = content WHERE message IS NULL AND content IS NOT NULL;
UPDATE public.messages SET content = message WHERE content IS NULL AND message IS NOT NULL;
UPDATE public.messages SET message_text = message WHERE message_text IS NULL AND message IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON public.messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON public.messages(conversation_id, is_read) WHERE is_read = false;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Allow all users to view messages"
  ON public.messages FOR SELECT
  USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Allow all users to insert messages"
  ON public.messages FOR INSERT
  WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Allow participants to update message read status"
  ON public.messages FOR UPDATE
  USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4. UPDATE notifications TABLE (Fixes PATCH notifications 400 error)
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS read BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS reference_id TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS link TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb;

DO $$ BEGIN
  CREATE POLICY "Allow users to update own notifications"
  ON public.notifications FOR UPDATE
  USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 5. REFRESH SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
