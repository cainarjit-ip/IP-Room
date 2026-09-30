-- =========================================================================
-- IP Room Nepal - Single Idempotent Migration Script for Supabase SQL Editor
-- Project: IP Room (Nepal's Premier Student & Renter Room Finder)
-- Backend: Supabase (Auth, Postgres, Storage, Realtime)
-- Admin User: cainarjit@gmail.com
-- =========================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================================================================
-- 2. HELPER FUNCTIONS & TRIGGER HANDLERS
-- =========================================================================

-- Helper to check if current user is admin (checks JWT superadmin email and profiles.role)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  -- 1. Fast check: superadmin email directly from auth JWT
  IF LOWER(COALESCE(auth.jwt() ->> 'email', '')) = 'cainarjit@gmail.com' THEN
    RETURN true;
  END IF;

  -- 2. Check profiles table for admin role
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger: auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: synchronize name & full_name, avatar & avatar_url, verified & is_verified on profiles
CREATE OR REPLACE FUNCTION public.handle_profile_sync()
RETURNS TRIGGER AS $$
BEGIN
  -- Sync name <-> full_name
  IF NEW.name IS NULL AND NEW.full_name IS NOT NULL THEN
    NEW.name := NEW.full_name;
  ELSIF NEW.full_name IS NULL AND NEW.name IS NOT NULL THEN
    NEW.full_name := NEW.name;
  ELSIF NEW.name IS NULL AND NEW.full_name IS NULL THEN
    NEW.name := split_part(COALESCE(NEW.email, 'User'), '@', 1);
    NEW.full_name := NEW.name;
  END IF;

  -- Sync avatar <-> avatar_url
  IF NEW.avatar IS NULL AND NEW.avatar_url IS NOT NULL THEN
    NEW.avatar := NEW.avatar_url;
  ELSIF NEW.avatar_url IS NULL AND NEW.avatar IS NOT NULL THEN
    NEW.avatar_url := NEW.avatar;
  END IF;

  -- Sync verified <-> is_verified
  IF NEW.verified IS NOT NULL AND NEW.is_verified IS NULL THEN
    NEW.is_verified := NEW.verified;
  ELSIF NEW.is_verified IS NOT NULL AND NEW.verified IS NULL THEN
    NEW.verified := NEW.is_verified;
  END IF;

  -- Always ensure cainarjit@gmail.com retains admin role
  IF LOWER(NEW.email) = 'cainarjit@gmail.com' THEN
    NEW.role := 'admin';
  END IF;

  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: protect role modification from non-admin clients
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      -- If the user updating is NOT admin and NOT service_role, preserve OLD role
      IF NOT public.is_admin() AND COALESCE(auth.jwt() ->> 'role', '') <> 'service_role' THEN
        NEW.role := OLD.role;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: sync renter_id and tenant_id on bookings
CREATE OR REPLACE FUNCTION public.handle_booking_sync()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tenant_id IS NULL AND NEW.renter_id IS NOT NULL THEN
    NEW.tenant_id = NEW.renter_id;
  ELSIF NEW.renter_id IS NULL AND NEW.tenant_id IS NOT NULL THEN
    NEW.renter_id = NEW.tenant_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: sync admin_id and moderator_id, timestamp and created_at on moderation_logs
CREATE OR REPLACE FUNCTION public.handle_mod_log_sync()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.admin_id IS NULL AND NEW.moderator_id IS NOT NULL THEN
    NEW.admin_id = NEW.moderator_id;
  ELSIF NEW.moderator_id IS NULL AND NEW.admin_id IS NOT NULL THEN
    NEW.moderator_id = NEW.admin_id;
  END IF;

  IF NEW.timestamp IS NULL AND NEW.created_at IS NOT NULL THEN
    NEW.timestamp = NEW.created_at;
  ELSIF NEW.created_at IS NULL AND NEW.timestamp IS NOT NULL THEN
    NEW.created_at = NEW.timestamp;
  ELSIF NEW.timestamp IS NULL AND NEW.created_at IS NULL THEN
    NEW.timestamp = now();
    NEW.created_at = now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: auto-create public.profiles row when auth.users row is inserted
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_name TEXT;
  v_role TEXT;
  v_avatar TEXT;
BEGIN
  v_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );
  
  -- Role logic: cainarjit@gmail.com is promoted to admin; otherwise default to renter
  IF LOWER(NEW.email) = 'cainarjit@gmail.com' THEN
    v_role := 'admin';
  ELSE
    v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'renter');
    IF v_role NOT IN ('renter', 'owner', 'admin') THEN
      v_role := 'renter';
    END IF;
  END IF;

  v_avatar := COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'picture',
    'https://api.dicebear.com/7.x/initials/svg?seed=' || encode(v_name::bytea, 'escape')
  );

  INSERT INTO public.profiles (
    id,
    full_name,
    name,
    email,
    phone,
    role,
    avatar_url,
    avatar,
    is_verified,
    verified,
    university,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    v_name,
    v_name,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', '+977 98XXXXXXXX'),
    v_role,
    v_avatar,
    v_avatar,
    LOWER(NEW.email) = 'cainarjit@gmail.com',
    LOWER(NEW.email) = 'cainarjit@gmail.com',
    NEW.raw_user_meta_data->>'university',
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================================
-- 3. TABLES (Idempotent: CREATE TABLE IF NOT EXISTS + ADD COLUMN IF NOT EXISTS)
-- =========================================================================

-- -------------------------------------------------------------------------
-- TABLE 1: PROFILES
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'renter' CHECK (role IN ('renter', 'owner', 'admin')),
  gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say', NULL)),
  date_of_birth DATE,
  address TEXT,
  province TEXT,
  district TEXT,
  municipality TEXT,
  bio TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  citizenship_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idempotent column additions for profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS university TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS student_id_verified BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS personal_details JSONB;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS identity_verification JSONB;

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);

-- Triggers for profiles
DROP TRIGGER IF EXISTS trigger_profile_sync ON public.profiles;
CREATE TRIGGER trigger_profile_sync
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_profile_sync();

DROP TRIGGER IF EXISTS trigger_protect_profile_role ON public.profiles;
CREATE TRIGGER trigger_protect_profile_role
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_role();

-- Hook on auth.users for automatic profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Promote cainarjit@gmail.com immediately if already registered
UPDATE public.profiles
SET role = 'admin', is_verified = true, verified = true
WHERE LOWER(email) = 'cainarjit@gmail.com';

-- -------------------------------------------------------------------------
-- TABLE 2: ROOMS
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  title_np TEXT,
  description TEXT,
  description_np TEXT,
  price NUMERIC NOT NULL DEFAULT 0 CHECK (price >= 0),
  deposit NUMERIC NOT NULL DEFAULT 0 CHECK (deposit >= 0),
  security_deposit NUMERIC NOT NULL DEFAULT 0 CHECK (security_deposit >= 0),
  room_type TEXT NOT NULL DEFAULT 'single',
  property_type TEXT NOT NULL DEFAULT 'Single Room',
  occupancy_preference TEXT NOT NULL DEFAULT 'any',
  gender_preference TEXT NOT NULL DEFAULT 'any',
  province TEXT,
  district TEXT,
  municipality TEXT,
  ward TEXT,
  area TEXT,
  address TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  location JSONB NOT NULL DEFAULT '{}'::jsonb,
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  virtual_tour JSONB,
  amenities JSONB NOT NULL DEFAULT '{}'::jsonb,
  water_schedule TEXT DEFAULT '24/7 Supply',
  contract_type TEXT DEFAULT 'monthly',
  house_rules JSONB DEFAULT '[]'::jsonb,
  house_rules_np JSONB DEFAULT '[]'::jsonb,
  electricity_rate_per_unit NUMERIC DEFAULT 15,
  owner JSONB DEFAULT '{}'::jsonb,
  ratings JSONB DEFAULT '{"average": 5.0, "count": 0}'::jsonb,
  reviews JSONB DEFAULT '[]'::jsonb,
  available_from DATE DEFAULT CURRENT_DATE,
  floor TEXT,
  floor_number INTEGER DEFAULT 1,
  bedrooms INTEGER DEFAULT 1,
  bathrooms INTEGER DEFAULT 1,
  furnished BOOLEAN DEFAULT false,
  parking BOOLEAN DEFAULT true,
  wifi BOOLEAN DEFAULT true,
  water_available BOOLEAN DEFAULT true,
  electricity_available BOOLEAN DEFAULT true,
  kitchen_available BOOLEAN DEFAULT true,
  attached_bathroom BOOLEAN DEFAULT false,
  balcony BOOLEAN DEFAULT false,
  featured BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  views_count INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  moderated_at TIMESTAMPTZ,
  moderated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idempotent column additions for rooms
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS title_np TEXT;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS description_np TEXT;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS security_deposit NUMERIC DEFAULT 0;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS property_type TEXT DEFAULT 'Single Room';
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS gender_preference TEXT DEFAULT 'any';
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS province TEXT;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS district TEXT;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS municipality TEXT;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS ward TEXT;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS area TEXT;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS location JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS virtual_tour JSONB;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS amenities JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS house_rules JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS house_rules_np JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS water_schedule TEXT DEFAULT '24/7 Supply';
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS contract_type TEXT DEFAULT 'monthly';
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS electricity_rate_per_unit NUMERIC DEFAULT 15;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS owner JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS ratings JSONB DEFAULT '{"average": 5.0, "count": 0}'::jsonb;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS reviews JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS available_from DATE DEFAULT CURRENT_DATE;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS floor TEXT;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS floor_number INTEGER DEFAULT 1;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS bedrooms INTEGER DEFAULT 1;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS bathrooms INTEGER DEFAULT 1;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS furnished BOOLEAN DEFAULT false;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS parking BOOLEAN DEFAULT true;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS wifi BOOLEAN DEFAULT true;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS water_available BOOLEAN DEFAULT true;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS electricity_available BOOLEAN DEFAULT true;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS kitchen_available BOOLEAN DEFAULT true;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS attached_bathroom BOOLEAN DEFAULT false;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS balcony BOOLEAN DEFAULT false;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS moderated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_rooms_owner_id ON public.rooms(owner_id);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON public.rooms(status);
CREATE INDEX IF NOT EXISTS idx_rooms_price ON public.rooms(price);
CREATE INDEX IF NOT EXISTS idx_rooms_room_type ON public.rooms(room_type);
CREATE INDEX IF NOT EXISTS idx_rooms_district ON public.rooms(district);
CREATE INDEX IF NOT EXISTS idx_rooms_created_at ON public.rooms(created_at DESC);

DROP TRIGGER IF EXISTS trigger_set_rooms_updated_at ON public.rooms;
CREATE TRIGGER trigger_set_rooms_updated_at
  BEFORE UPDATE ON public.rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- -------------------------------------------------------------------------
-- TABLE 3: ROOM IMAGES
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.room_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  storage_path TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_room_images_room_id ON public.room_images(room_id);

-- -------------------------------------------------------------------------
-- TABLE 4: BOOKINGS
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  renter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  booking_date TIMESTAMPTZ DEFAULT now(),
  move_in_date DATE,
  duration_months INTEGER DEFAULT 1 CHECK (duration_months >= 1),
  monthly_rent NUMERIC DEFAULT 0,
  total_monthly_rent NUMERIC DEFAULT 0,
  security_deposit NUMERIC DEFAULT 0,
  total_paid NUMERIC DEFAULT 0,
  payment_status TEXT DEFAULT 'pending',
  payment_method TEXT DEFAULT 'khalti',
  payment_ref_id TEXT,
  contract_details JSONB DEFAULT '{}'::jsonb,
  contract_generated BOOLEAN DEFAULT false,
  message TEXT,
  room_title TEXT,
  room_address TEXT,
  room_price NUMERIC DEFAULT 0,
  room_image TEXT,
  tenant_name TEXT,
  tenant_phone TEXT,
  tenant_email TEXT,
  tenant_university TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idempotent column additions for bookings
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS renter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS total_monthly_rent NUMERIC DEFAULT 0;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS monthly_rent NUMERIC DEFAULT 0;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS security_deposit NUMERIC DEFAULT 0;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS total_paid NUMERIC DEFAULT 0;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'khalti';
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_ref_id TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS contract_details JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS contract_generated BOOLEAN DEFAULT false;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS room_title TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS room_address TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS room_price NUMERIC DEFAULT 0;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS room_image TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS tenant_name TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS tenant_phone TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS tenant_email TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS tenant_university TEXT;

CREATE INDEX IF NOT EXISTS idx_bookings_room_id ON public.bookings(room_id);
CREATE INDEX IF NOT EXISTS idx_bookings_renter_id ON public.bookings(renter_id);
CREATE INDEX IF NOT EXISTS idx_bookings_tenant_id ON public.bookings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bookings_owner_id ON public.bookings(owner_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON public.bookings(created_at DESC);

DROP TRIGGER IF EXISTS trigger_set_bookings_updated_at ON public.bookings;
CREATE TRIGGER trigger_set_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_sync_booking_renter_id ON public.bookings;
CREATE TRIGGER trigger_sync_booking_renter_id
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_booking_sync();

-- -------------------------------------------------------------------------
-- TABLE 5: WISHLISTS
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_room_wishlist UNIQUE (user_id, room_id)
);

-- Idempotent column additions for wishlists
ALTER TABLE public.wishlists ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.wishlists ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_wishlists_user_id ON public.wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_room_id ON public.wishlists(room_id);

-- -------------------------------------------------------------------------
-- TABLE 6: COMPARISON LISTS
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.comparison_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_room_comparison UNIQUE (user_id, room_id)
);

-- Idempotent column additions for comparison_lists (Fixes: column comparison_lists.room_id does not exist)
ALTER TABLE public.comparison_lists ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.comparison_lists ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_comparisons_user_id ON public.comparison_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_comparisons_room_id ON public.comparison_lists(room_id);

-- -------------------------------------------------------------------------
-- TABLE 7: MODERATION LOGS
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.moderation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  moderator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  target_type TEXT NOT NULL DEFAULT 'room',
  target_id UUID,
  action TEXT NOT NULL,
  reason TEXT,
  listing_id TEXT,
  listing_title TEXT,
  previous_status TEXT,
  new_status TEXT,
  moderator_name TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idempotent column additions (Fixes: column moderation_logs.timestamp does not exist)
ALTER TABLE public.moderation_logs ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.moderation_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.moderation_logs ADD COLUMN IF NOT EXISTS admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.moderation_logs ADD COLUMN IF NOT EXISTS moderator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.moderation_logs ADD COLUMN IF NOT EXISTS listing_id TEXT;
ALTER TABLE public.moderation_logs ADD COLUMN IF NOT EXISTS listing_title TEXT;
ALTER TABLE public.moderation_logs ADD COLUMN IF NOT EXISTS previous_status TEXT;
ALTER TABLE public.moderation_logs ADD COLUMN IF NOT EXISTS new_status TEXT;
ALTER TABLE public.moderation_logs ADD COLUMN IF NOT EXISTS moderator_name TEXT;

CREATE INDEX IF NOT EXISTS idx_mod_logs_admin_id ON public.moderation_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_mod_logs_target ON public.moderation_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_mod_logs_action ON public.moderation_logs(action);
CREATE INDEX IF NOT EXISTS idx_mod_logs_timestamp ON public.moderation_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_mod_logs_created_at ON public.moderation_logs(created_at DESC);

DROP TRIGGER IF EXISTS trigger_sync_mod_log_admin_id ON public.moderation_logs;
CREATE TRIGGER trigger_sync_mod_log_admin_id
  BEFORE INSERT OR UPDATE ON public.moderation_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_mod_log_sync();

-- -------------------------------------------------------------------------
-- TABLE 8: NOTIFICATIONS
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'system',
  read BOOLEAN NOT NULL DEFAULT false,
  is_read BOOLEAN NOT NULL DEFAULT false,
  reference_id TEXT,
  link TEXT,
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS read BOOLEAN DEFAULT false;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS reference_id TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS link TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- -------------------------------------------------------------------------
-- TABLE 9: CHAT MESSAGES & CONVERSATIONS
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.conversation_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_conv_member UNIQUE (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  content TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS receiver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS read BOOLEAN DEFAULT false;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;

-- Synonym/view for messages if needed
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON public.chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_receiver ON public.chat_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at DESC);

-- -------------------------------------------------------------------------
-- TABLE 10: DISPUTES
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  room_title TEXT,
  initiator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  initiator_name TEXT,
  initiator_role TEXT,
  respondent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  respondent_name TEXT,
  reason TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.disputes ADD COLUMN IF NOT EXISTS ticket_number TEXT;
ALTER TABLE public.disputes ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL;
ALTER TABLE public.disputes ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL;
ALTER TABLE public.disputes ADD COLUMN IF NOT EXISTS room_title TEXT;
ALTER TABLE public.disputes ADD COLUMN IF NOT EXISTS initiator_name TEXT;
ALTER TABLE public.disputes ADD COLUMN IF NOT EXISTS initiator_role TEXT;
ALTER TABLE public.disputes ADD COLUMN IF NOT EXISTS respondent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.disputes ADD COLUMN IF NOT EXISTS respondent_name TEXT;
ALTER TABLE public.disputes ADD COLUMN IF NOT EXISTS resolution_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_disputes_initiator ON public.disputes(initiator_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON public.disputes(status);
CREATE INDEX IF NOT EXISTS idx_disputes_created_at ON public.disputes(created_at DESC);

DROP TRIGGER IF EXISTS trigger_set_disputes_updated_at ON public.disputes;
CREATE TRIGGER trigger_set_disputes_updated_at
  BEFORE UPDATE ON public.disputes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- -------------------------------------------------------------------------
-- TABLE 11: ANALYTICS EVENTS
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_name ON public.analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON public.analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON public.analytics_events(created_at DESC);

-- -------------------------------------------------------------------------
-- TABLE 12: PAYMENTS
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  payer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'NPR',
  payment_method TEXT NOT NULL,
  provider TEXT NOT NULL,
  transaction_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON public.payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_payer_id ON public.payments(payer_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

-- -------------------------------------------------------------------------
-- TABLE 13: NEPAL LOCATION REFERENCE TABLES
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.nepal_provinces (
  id INTEGER PRIMARY KEY,
  name_en TEXT NOT NULL,
  name_np TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.nepal_districts (
  id SERIAL PRIMARY KEY,
  province_id INTEGER NOT NULL REFERENCES public.nepal_provinces(id) ON DELETE CASCADE,
  name_en TEXT NOT NULL,
  name_np TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.nepal_municipalities (
  id SERIAL PRIMARY KEY,
  district_id INTEGER NOT NULL REFERENCES public.nepal_districts(id) ON DELETE CASCADE,
  name_en TEXT NOT NULL,
  name_np TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'Municipality'
);

-- =========================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================

-- Enable RLS across all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comparison_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nepal_provinces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nepal_districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nepal_municipalities ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------------------------
-- RLS: PROFILES
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view profiles" ON public.profiles;
CREATE POLICY "Public can view profiles"
ON public.profiles FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile except role" ON public.profiles;
CREATE POLICY "Users can update their own profile except role"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id OR public.is_admin())
WITH CHECK (auth.uid() = id OR public.is_admin());

-- -------------------------------------------------------------------------
-- RLS: ROOMS (Public visibility for all listed rooms)
-- -------------------------------------------------------------------------
ALTER TABLE public.rooms ALTER COLUMN owner_id DROP NOT NULL;
ALTER TABLE public.rooms ALTER COLUMN status SET DEFAULT 'approved';

DROP POLICY IF EXISTS "Anyone can view approved rooms" ON public.rooms;
DROP POLICY IF EXISTS "Anyone can view rooms" ON public.rooms;
CREATE POLICY "Anyone can view rooms"
ON public.rooms FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Owners can insert their own rooms" ON public.rooms;
DROP POLICY IF EXISTS "Anyone can insert rooms" ON public.rooms;
CREATE POLICY "Anyone can insert rooms"
ON public.rooms FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Owners and admins can update rooms" ON public.rooms;
DROP POLICY IF EXISTS "Anyone can update rooms" ON public.rooms;
CREATE POLICY "Anyone can update rooms"
ON public.rooms FOR UPDATE
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Owners and admins can delete rooms" ON public.rooms;
DROP POLICY IF EXISTS "Anyone can delete rooms" ON public.rooms;
CREATE POLICY "Anyone can delete rooms"
ON public.rooms FOR DELETE
USING (auth.uid() = owner_id OR public.is_admin() OR true);

-- Provide view for room_listings synonym
CREATE OR REPLACE VIEW public.room_listings AS SELECT * FROM public.rooms;

-- -------------------------------------------------------------------------
-- RLS: ROOM IMAGES
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view room images" ON public.room_images;
CREATE POLICY "Public can view room images"
ON public.room_images FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Owners can manage room images" ON public.room_images;
CREATE POLICY "Owners can manage room images"
ON public.room_images FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.rooms
    WHERE rooms.id = room_images.room_id AND (rooms.owner_id = auth.uid() OR public.is_admin())
  )
);

-- -------------------------------------------------------------------------
-- RLS: BOOKINGS
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "Renter, owner, or admin can view bookings" ON public.bookings;
CREATE POLICY "Renter, owner, or admin can view bookings"
ON public.bookings FOR SELECT
TO authenticated
USING (
  auth.uid() = renter_id
  OR auth.uid() = tenant_id
  OR auth.uid() = owner_id
  OR EXISTS (
    SELECT 1 FROM public.rooms
    WHERE rooms.id = bookings.room_id AND rooms.owner_id = auth.uid()
  )
  OR public.is_admin()
);

DROP POLICY IF EXISTS "Renters can create bookings" ON public.bookings;
CREATE POLICY "Renters can create bookings"
ON public.bookings FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = renter_id OR auth.uid() = tenant_id);

DROP POLICY IF EXISTS "Parties and admin can update bookings" ON public.bookings;
CREATE POLICY "Parties and admin can update bookings"
ON public.bookings FOR UPDATE
TO authenticated
USING (
  auth.uid() = renter_id
  OR auth.uid() = tenant_id
  OR auth.uid() = owner_id
  OR EXISTS (
    SELECT 1 FROM public.rooms
    WHERE rooms.id = bookings.room_id AND rooms.owner_id = auth.uid()
  )
  OR public.is_admin()
);

DROP POLICY IF EXISTS "Renter or admin can delete bookings" ON public.bookings;
CREATE POLICY "Renter or admin can delete bookings"
ON public.bookings FOR DELETE
TO authenticated
USING (auth.uid() = renter_id OR auth.uid() = tenant_id OR public.is_admin());

-- -------------------------------------------------------------------------
-- RLS: WISHLISTS
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own wishlists" ON public.wishlists;
CREATE POLICY "Users can view own wishlists"
ON public.wishlists FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users can insert own wishlists" ON public.wishlists;
CREATE POLICY "Users can insert own wishlists"
ON public.wishlists FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own wishlists" ON public.wishlists;
CREATE POLICY "Users can delete own wishlists"
ON public.wishlists FOR DELETE
TO authenticated
USING (auth.uid() = user_id OR public.is_admin());

-- -------------------------------------------------------------------------
-- RLS: COMPARISON LISTS
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own comparison lists" ON public.comparison_lists;
CREATE POLICY "Users can view own comparison lists"
ON public.comparison_lists FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users can insert own comparison lists" ON public.comparison_lists;
CREATE POLICY "Users can insert own comparison lists"
ON public.comparison_lists FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own comparison lists" ON public.comparison_lists;
CREATE POLICY "Users can delete own comparison lists"
ON public.comparison_lists FOR DELETE
TO authenticated
USING (auth.uid() = user_id OR public.is_admin());

-- -------------------------------------------------------------------------
-- RLS: MODERATION LOGS
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can view moderation logs" ON public.moderation_logs;
CREATE POLICY "Admins can view moderation logs"
ON public.moderation_logs FOR SELECT
TO authenticated
USING (public.is_admin() OR auth.jwt() ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "Admins can insert moderation logs" ON public.moderation_logs;
CREATE POLICY "Admins can insert moderation logs"
ON public.moderation_logs FOR INSERT
TO authenticated
WITH CHECK (public.is_admin() OR auth.uid() = admin_id OR auth.uid() = moderator_id OR auth.jwt() ->> 'role' = 'service_role');

-- -------------------------------------------------------------------------
-- RLS: NOTIFICATIONS
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Authenticated users or service can insert notifications" ON public.notifications;
CREATE POLICY "Authenticated users or service can insert notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (true);

-- -------------------------------------------------------------------------
-- RLS: CHAT MESSAGES
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own chat messages" ON public.chat_messages;
CREATE POLICY "Users can view own chat messages"
ON public.chat_messages FOR SELECT
TO authenticated
USING (auth.uid() = sender_id OR auth.uid() = receiver_id OR public.is_admin());

DROP POLICY IF EXISTS "Users can insert chat messages" ON public.chat_messages;
CREATE POLICY "Users can insert chat messages"
ON public.chat_messages FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Users can update own chat messages" ON public.chat_messages;
CREATE POLICY "Users can update own chat messages"
ON public.chat_messages FOR UPDATE
TO authenticated
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- -------------------------------------------------------------------------
-- RLS: DISPUTES
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "Involved parties and admins can view disputes" ON public.disputes;
CREATE POLICY "Involved parties and admins can view disputes"
ON public.disputes FOR SELECT
TO authenticated
USING (auth.uid() = initiator_id OR auth.uid() = respondent_id OR public.is_admin());

DROP POLICY IF EXISTS "Users can file disputes" ON public.disputes;
CREATE POLICY "Users can file disputes"
ON public.disputes FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = initiator_id);

DROP POLICY IF EXISTS "Admins and initiators can update disputes" ON public.disputes;
CREATE POLICY "Admins and initiators can update disputes"
ON public.disputes FOR UPDATE
TO authenticated
USING (auth.uid() = initiator_id OR public.is_admin());

-- -------------------------------------------------------------------------
-- RLS: ANALYTICS EVENTS
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can insert analytics events" ON public.analytics_events;
CREATE POLICY "Anyone can insert analytics events"
ON public.analytics_events FOR INSERT
TO authenticated, anon
WITH CHECK (true);

DROP POLICY IF EXISTS "Only admins can view analytics events" ON public.analytics_events;
CREATE POLICY "Only admins can view analytics events"
ON public.analytics_events FOR SELECT
TO authenticated
USING (public.is_admin());

-- -------------------------------------------------------------------------
-- RLS: NEPAL LOCATION TABLES
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view provinces" ON public.nepal_provinces;
CREATE POLICY "Public can view provinces" ON public.nepal_provinces FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can view districts" ON public.nepal_districts;
CREATE POLICY "Public can view districts" ON public.nepal_districts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can view municipalities" ON public.nepal_municipalities;
CREATE POLICY "Public can view municipalities" ON public.nepal_municipalities FOR SELECT USING (true);

-- =========================================================================
-- 5. PERMISSIONS GRANT (Fixes schema cache errors for anon & authenticated)
-- =========================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- =========================================================================
-- 6. RELOAD SCHEMA CACHE
-- =========================================================================
NOTIFY pgrst, 'reload schema';
