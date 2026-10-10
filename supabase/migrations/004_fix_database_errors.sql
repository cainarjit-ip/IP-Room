-- =========================================================================
-- IP Room Nepal: Migration 004 - Fix Missing Columns & Room Views
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

-- 2. UPDATE conversations TABLE
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

UPDATE public.conversations SET listing_id = room_id WHERE listing_id IS NULL AND room_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_renter ON public.conversations(renter_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_owner ON public.conversations(owner_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_room ON public.conversations(room_id);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Drop insecure public policies
DROP POLICY IF EXISTS "Public can read conversations" ON public.conversations;
DROP POLICY IF EXISTS "Public can insert conversations" ON public.conversations;
DROP POLICY IF EXISTS "Allow authenticated users to create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Allow authenticated users to view own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Allow participants to update conversations" ON public.conversations;

DO $$ BEGIN
  CREATE POLICY "Participants and admin can view conversations"
  ON public.conversations FOR SELECT
  TO authenticated
  USING (auth.uid() = renter_id OR auth.uid() = owner_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can start conversations"
  ON public.conversations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = renter_id OR auth.uid() = owner_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Participants can update conversations"
  ON public.conversations FOR UPDATE
  TO authenticated
  USING (auth.uid() = renter_id OR auth.uid() = owner_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. UPDATE messages TABLE
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

UPDATE public.messages SET message = content WHERE message IS NULL AND content IS NOT NULL;
UPDATE public.messages SET content = message WHERE content IS NULL AND message IS NOT NULL;
UPDATE public.messages SET message_text = message WHERE message_text IS NULL AND message IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON public.messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON public.messages(conversation_id, is_read) WHERE is_read = false;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Drop insecure public policies
DROP POLICY IF EXISTS "Public can read messages" ON public.messages;
DROP POLICY IF EXISTS "Public can insert messages" ON public.messages;
DROP POLICY IF EXISTS "Allow all users to view messages" ON public.messages;
DROP POLICY IF EXISTS "Allow all users to insert messages" ON public.messages;
DROP POLICY IF EXISTS "Allow participants to update message read status" ON public.messages;

DO $$ BEGIN
  CREATE POLICY "Conversation participants can select messages"
  ON public.messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
      AND (c.renter_id = auth.uid() OR c.owner_id = auth.uid())
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
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
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Participants can update messages"
  ON public.messages FOR UPDATE
  TO authenticated
  USING (
    sender_id = auth.uid()
    OR receiver_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
      AND (c.renter_id = auth.uid() OR c.owner_id = auth.uid())
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4. UPDATE notifications TABLE
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

-- 5. FIX ROOMS POLICIES (Drop Anyone can insert rooms)
DROP POLICY IF EXISTS "Anyone can insert rooms" ON public.rooms;
DROP POLICY IF EXISTS "Public can insert rooms" ON public.rooms;

DO $$ BEGIN
  CREATE POLICY "Owners can insert their own rooms"
  ON public.rooms FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'owner'
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 6. REFRESH SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
