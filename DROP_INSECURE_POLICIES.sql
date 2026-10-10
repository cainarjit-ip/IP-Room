-- =========================================================================
-- IP Room Nepal: Drop 5 Insecure / Overly Permissive Policies
-- Run this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/stygqxxldbegjilpzlco/sql
-- =========================================================================

-- 1. DROP the 5 requested insecure public policies:
DROP POLICY IF EXISTS "Public can read conversations" ON public.conversations;
DROP POLICY IF EXISTS "Public can read messages" ON public.messages;
DROP POLICY IF EXISTS "Public can insert conversations" ON public.conversations;
DROP POLICY IF EXISTS "Public can insert messages" ON public.messages;
DROP POLICY IF EXISTS "Anyone can insert rooms" ON public.rooms;

-- 2. Also drop any permissive/public fallback aliases:
DROP POLICY IF EXISTS "Allow all users to view messages" ON public.messages;
DROP POLICY IF EXISTS "Allow all users to insert messages" ON public.messages;
DROP POLICY IF EXISTS "Allow authenticated users to view own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Allow authenticated users to create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Allow participants to update conversations" ON public.conversations;
DROP POLICY IF EXISTS "Allow participants to update message read status" ON public.messages;
DROP POLICY IF EXISTS "Public can insert rooms" ON public.rooms;
DROP POLICY IF EXISTS "Anyone can update rooms" ON public.rooms;
DROP POLICY IF EXISTS "Anyone can delete rooms" ON public.rooms;

-- 3. Ensure Row Level Security (RLS) is strictly enabled
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- 4. Apply Secure, Production-Grade RLS Policies:

-- CONVERSATIONS: Only involved participants (renter/owner) or admin can read
DROP POLICY IF EXISTS "Participants and admin can view conversations" ON public.conversations;
CREATE POLICY "Participants and admin can view conversations"
ON public.conversations FOR SELECT
TO authenticated
USING (
  auth.uid() = renter_id
  OR auth.uid() = owner_id
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- CONVERSATIONS: Only authenticated participants can create conversations
DROP POLICY IF EXISTS "Users can start conversations" ON public.conversations;
CREATE POLICY "Users can start conversations"
ON public.conversations FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = renter_id
  OR auth.uid() = owner_id
);

-- CONVERSATIONS: Only participants or admin can update conversations
DROP POLICY IF EXISTS "Participants can update conversations" ON public.conversations;
CREATE POLICY "Participants can update conversations"
ON public.conversations FOR UPDATE
TO authenticated
USING (
  auth.uid() = renter_id
  OR auth.uid() = owner_id
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- MESSAGES: Only conversation participants or admin can view messages
DROP POLICY IF EXISTS "Conversation participants can select messages" ON public.messages;
CREATE POLICY "Conversation participants can select messages"
ON public.messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
    AND (c.renter_id = auth.uid() OR c.owner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  )
);

-- MESSAGES: Only conversation participants can insert messages
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
);

-- MESSAGES: Recipients can mark as read / sender update
DROP POLICY IF EXISTS "Participants can update messages" ON public.messages;
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

-- ROOMS: Public can view approved room listings (marketplace browse)
DROP POLICY IF EXISTS "Anyone can view rooms" ON public.rooms;
CREATE POLICY "Anyone can view rooms"
ON public.rooms FOR SELECT
USING (true);

-- ROOMS: Only authenticated users with owner role can create room listings
DROP POLICY IF EXISTS "Owners can insert their own rooms" ON public.rooms;
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

-- ROOMS: Only the owner or admin can update room listings
DROP POLICY IF EXISTS "Only the owner can update their own room" ON public.rooms;
CREATE POLICY "Only the owner can update their own room"
ON public.rooms FOR UPDATE
TO authenticated
USING (
  owner_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
)
WITH CHECK (
  owner_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ROOMS: Only the owner or admin can delete room listings
DROP POLICY IF EXISTS "Only the owner can delete their own room" ON public.rooms;
CREATE POLICY "Only the owner can delete their own room"
ON public.rooms FOR DELETE
TO authenticated
USING (
  owner_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 5. REFRESH PostgREST SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
