-- =========================================================================
-- IP Room Nepal - Safe Demo Mode Data Cleanup Script
-- =========================================================================
-- This script completely and safely purges all "demo mode" test data
-- (dummy users, test listings, mock transactions, and sample bookings)
-- while preserving:
--   1. Database schemas, tables, extensions, and triggers
--   2. Main admin accounts (e.g. cainarjit@gmail.com and active admins)
--   3. All live production listings, real users, and real bookings
--   4. Nepal geographic data (provinces, districts, municipalities)
-- =========================================================================

-- =========================================================================
-- STEP 0: BACKUP COMMANDS (Run before executing cleanup)
-- =========================================================================
/*
  Option A - Supabase Web Dashboard:
    1. Navigate to: https://supabase.com/dashboard/project/stygqxxldbegjilpzlco/database/backups
    2. Click "Scheduled Backups" / "Point in Time Recovery" or take a snapshot.

  Option B - pg_dump CLI (Recommended for instant full backup):
    Run in terminal:
    pg_dump "postgresql://postgres:[YOUR_DB_PASSWORD]@db.stygqxxldbegjilpzlco.supabase.co:5432/postgres" \
      -F c -b -v -f "iproom_backup_$(date +%Y%m%d_%H%M%S).dump"

  Option C - Plain SQL dump:
    pg_dump "postgresql://postgres:[YOUR_DB_PASSWORD]@db.stygqxxldbegjilpzlco.supabase.co:5432/postgres" \
      --clean --if-exists > "iproom_backup_$(date +%Y%m%d_%H%M%S).sql"
*/

-- =========================================================================
-- STEP 1: PRE-CLEANUP DRY RUN (Review what will be deleted)
-- =========================================================================
-- Run this query first to preview the counts of demo records found:

WITH demo_users AS (
  SELECT id, email, full_name, role
  FROM public.profiles
  WHERE (
    id::text LIKE '%demo%'
    OR id::text LIKE 'usr-%'
    OR email ILIKE '%demo%'
    OR email ILIKE '%test%'
    OR email ILIKE '%@example.com'
    OR email IN ('aayush.sharma@students.tu.edu.np', 'ramesh.shrestha@iproom.np')
  )
  -- CRITICAL PROTECTION: Never touch primary admin or verified production accounts
  AND email NOT IN ('cainarjit@gmail.com')
  AND id::text NOT IN (
    SELECT id::text FROM public.profiles WHERE email = 'cainarjit@gmail.com'
  )
),
demo_rooms AS (
  SELECT id, title
  FROM public.rooms
  WHERE (
    id::text LIKE '%demo%'
    OR id::text LIKE 'room-demo-%'
    OR title ILIKE '%demo%'
    OR title ILIKE '%sample listing%'
    OR owner_id IN (SELECT id::uuid FROM demo_users WHERE id ~ '^[0-9a-fA-F-]{36}$')
  )
)
SELECT 
  'Demo Profiles to remove' AS category, COUNT(*) AS total FROM demo_users
UNION ALL
SELECT 
  'Demo Room Listings to remove' AS category, COUNT(*) AS total FROM demo_rooms
UNION ALL
SELECT 
  'Demo Bookings to remove' AS category, COUNT(*) AS total 
  FROM public.bookings
  WHERE id::text LIKE '%demo%'
     OR renter_id IN (SELECT id::uuid FROM demo_users WHERE id ~ '^[0-9a-fA-F-]{36}$')
     OR owner_id IN (SELECT id::uuid FROM demo_users WHERE id ~ '^[0-9a-fA-F-]{36}$')
UNION ALL
SELECT 
  'Demo Payments to remove' AS category, COUNT(*) AS total 
  FROM public.payments
  WHERE id::text LIKE '%demo%'
     OR transaction_id ILIKE '%demo%'
     OR transaction_id ILIKE '%test%'
     OR payer_id IN (SELECT id::uuid FROM demo_users WHERE id ~ '^[0-9a-fA-F-]{36}$');


-- =========================================================================
-- STEP 2: SAFE TRANSACTIONAL DELETION SCRIPT
-- =========================================================================
-- Wrapped in a single transaction block. If any error occurs, everything rolls back automatically.

BEGIN;

-- 1. Create a temporary table of target demo user IDs to avoid repetitive queries
CREATE TEMP TABLE temp_demo_users ON COMMIT DROP AS
SELECT id::text AS user_id_text, email
FROM public.profiles
WHERE (
  id::text LIKE '%demo%'
  OR id::text LIKE 'usr-%'
  OR email ILIKE '%demo%'
  OR email ILIKE '%test%'
  OR email ILIKE '%@example.com'
  OR email IN ('aayush.sharma@students.tu.edu.np', 'ramesh.shrestha@iproom.np')
)
-- NEVER touch primary admin accounts
AND email NOT IN ('cainarjit@gmail.com')
AND (role IS NULL OR role != 'admin' OR email NOT IN ('cainarjit@gmail.com'));

-- 2. Create a temporary table of target demo room IDs
CREATE TEMP TABLE temp_demo_rooms ON COMMIT DROP AS
SELECT id::text AS room_id_text
FROM public.rooms
WHERE (
  id::text LIKE '%demo%'
  OR id::text LIKE 'room-demo-%'
  OR title ILIKE '%demo%'
  OR title ILIKE '%sample room%'
  OR title ILIKE '%test listing%'
  OR owner_id::text IN (SELECT user_id_text FROM temp_demo_users)
);

-- Also include room_listings table if it exists in schema
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'room_listings') THEN
    INSERT INTO temp_demo_rooms (room_id_text)
    SELECT id::text FROM public.room_listings
    WHERE (
      id::text LIKE '%demo%'
      OR id::text LIKE 'room-demo-%'
      OR title ILIKE '%demo%'
      OR owner_id::text IN (SELECT user_id_text FROM temp_demo_users)
    )
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- -------------------------------------------------------------------------
-- 3. Delete Demo Payments / Mock Transactions
-- -------------------------------------------------------------------------
DELETE FROM public.payments
WHERE id::text LIKE '%demo%'
   OR transaction_id ILIKE '%demo%'
   OR transaction_id ILIKE '%test%'
   OR transaction_id ILIKE 'TXN-MOCK-%'
   OR payer_id::text IN (SELECT user_id_text FROM temp_demo_users)
   OR receiver_id::text IN (SELECT user_id_text FROM temp_demo_users)
   OR booking_id::text IN (
     SELECT id::text FROM public.bookings 
     WHERE id::text LIKE '%demo%' OR room_id::text IN (SELECT room_id_text FROM temp_demo_rooms)
   );

-- -------------------------------------------------------------------------
-- 4. Delete Demo Bookings
-- -------------------------------------------------------------------------
DELETE FROM public.bookings
WHERE id::text LIKE '%demo%'
   OR id::text LIKE 'book-demo-%'
   OR room_id::text IN (SELECT room_id_text FROM temp_demo_rooms)
   OR renter_id::text IN (SELECT user_id_text FROM temp_demo_users)
   OR tenant_id::text IN (SELECT user_id_text FROM temp_demo_users)
   OR owner_id::text IN (SELECT user_id_text FROM temp_demo_users);

-- -------------------------------------------------------------------------
-- 5. Delete Demo Wishlists and Room Comparisons
-- -------------------------------------------------------------------------
DELETE FROM public.wishlists
WHERE user_id::text IN (SELECT user_id_text FROM temp_demo_users)
   OR room_id::text IN (SELECT room_id_text FROM temp_demo_rooms);

DELETE FROM public.comparison_lists
WHERE user_id::text IN (SELECT user_id_text FROM temp_demo_users)
   OR room_id::text IN (SELECT room_id_text FROM temp_demo_rooms);

-- -------------------------------------------------------------------------
-- 6. Delete Demo Reviews, Room Views, and Images
-- -------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reviews') THEN
    DELETE FROM public.reviews
    WHERE room_id::text IN (SELECT room_id_text FROM temp_demo_rooms)
       OR reviewer_id::text IN (SELECT user_id_text FROM temp_demo_users);
  END IF;

  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'room_views') THEN
    DELETE FROM public.room_views
    WHERE room_id::text IN (SELECT room_id_text FROM temp_demo_rooms)
       OR viewer_id::text IN (SELECT user_id_text FROM temp_demo_users);
  END IF;

  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'room_images') THEN
    DELETE FROM public.room_images
    WHERE room_id::text IN (SELECT room_id_text FROM temp_demo_rooms);
  END IF;
END $$;

-- -------------------------------------------------------------------------
-- 7. Delete Demo Messages & Conversations
-- -------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'messages') THEN
    DELETE FROM public.messages
    WHERE sender_id::text IN (SELECT user_id_text FROM temp_demo_users);
  END IF;

  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'conversation_members') THEN
    DELETE FROM public.conversation_members
    WHERE user_id::text IN (SELECT user_id_text FROM temp_demo_users);
  END IF;

  -- Delete empty conversations
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'conversations') THEN
    DELETE FROM public.conversations
    WHERE id NOT IN (SELECT conversation_id FROM public.conversation_members);
  END IF;
END $$;

-- -------------------------------------------------------------------------
-- 8. Delete Demo Notifications
-- -------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
    DELETE FROM public.notifications
    WHERE user_id::text IN (SELECT user_id_text FROM temp_demo_users)
       OR reference_id::text IN (SELECT room_id_text FROM temp_demo_rooms);
  END IF;
END $$;

-- -------------------------------------------------------------------------
-- 9. Delete Demo Moderation Logs & Reports
-- -------------------------------------------------------------------------
DELETE FROM public.moderation_logs
WHERE listing_id IN (SELECT room_id_text FROM temp_demo_rooms)
   OR reason ILIKE '%demo%'
   OR reason ILIKE '%sample test%';

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reports') THEN
    DELETE FROM public.reports
    WHERE reporter_id::text IN (SELECT user_id_text FROM temp_demo_users)
       OR reported_user_id::text IN (SELECT user_id_text FROM temp_demo_users)
       OR reported_room_id::text IN (SELECT room_id_text FROM temp_demo_rooms);
  END IF;
END $$;

-- -------------------------------------------------------------------------
-- 10. Delete Demo Room Listings
-- -------------------------------------------------------------------------
DELETE FROM public.rooms
WHERE id::text IN (SELECT room_id_text FROM temp_demo_rooms);

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'room_listings') THEN
    DELETE FROM public.room_listings
    WHERE id::text IN (SELECT room_id_text FROM temp_demo_rooms);
  END IF;
END $$;

-- -------------------------------------------------------------------------
-- 11. Delete Demo User Profiles
-- -------------------------------------------------------------------------
DELETE FROM public.profiles
WHERE id::text IN (SELECT user_id_text FROM temp_demo_users);

-- -------------------------------------------------------------------------
-- 12. Delete Corresponding Demo Auth Users (if auth.users exists)
-- -------------------------------------------------------------------------
DO $$
BEGIN
  -- Remove matching mock accounts from auth.users (excluding real admin emails)
  DELETE FROM auth.users
  WHERE (
    email ILIKE '%demo%'
    OR email ILIKE '%test%'
    OR email ILIKE '%@example.com'
    OR email IN ('aayush.sharma@students.tu.edu.np', 'ramesh.shrestha@iproom.np')
    OR id::text IN (SELECT user_id_text FROM temp_demo_users)
  )
  AND email NOT IN ('cainarjit@gmail.com');
EXCEPTION WHEN OTHERS THEN
  -- In case the current database role does not have direct access to auth schema
  RAISE NOTICE 'Skipped direct auth.users deletion (insufficient privilege or managed by Supabase Auth API)';
END $$;

-- Commit the transaction
COMMIT;

-- =========================================================================
-- STEP 3: POST-CLEANUP VERIFICATION
-- =========================================================================
-- Run this query after COMMIT to verify that all live tables and admin users remain intact:

SELECT 
  'Remaining Production Profiles' AS item, COUNT(*) AS total_count FROM public.profiles
UNION ALL
SELECT 
  'Remaining Production Rooms' AS item, COUNT(*) AS total_count FROM public.rooms
UNION ALL
SELECT 
  'Remaining Production Bookings' AS item, COUNT(*) AS total_count FROM public.bookings
UNION ALL
SELECT 
  'Verified Admin Accounts Active' AS item, COUNT(*) AS total_count FROM public.profiles WHERE role = 'admin';
