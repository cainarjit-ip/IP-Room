export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'renter' | 'owner' | 'admin';
export type ListingStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'rented' | 'inactive';
export type BookingStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'completed';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';
export type ReportStatus = 'pending' | 'investigating' | 'resolved' | 'dismissed';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name?: string | null;
          full_name: string;
          email: string;
          phone: string | null;
          avatar_url: string | null;
          avatar?: string | null;
          role: UserRole;
          gender: string | null;
          date_of_birth: string | null;
          address: string | null;
          province: string | null;
          district: string | null;
          municipality: string | null;
          bio: string | null;
          is_verified: boolean;
          verified?: boolean;
          citizenship_verified: boolean;
          university?: string | null;
          student_id_verified?: boolean;
          personal_details?: Json | null;
          identity_verification?: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name?: string | null;
          full_name?: string | null;
          email: string;
          phone?: string | null;
          avatar_url?: string | null;
          avatar?: string | null;
          role?: UserRole;
          gender?: string | null;
          date_of_birth?: string | null;
          address?: string | null;
          province?: string | null;
          district?: string | null;
          municipality?: string | null;
          bio?: string | null;
          is_verified?: boolean;
          verified?: boolean;
          citizenship_verified?: boolean;
          university?: string | null;
          student_id_verified?: boolean;
          personal_details?: Json | null;
          identity_verification?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string | null;
          full_name?: string | null;
          email?: string;
          phone?: string | null;
          avatar_url?: string | null;
          avatar?: string | null;
          role?: UserRole;
          gender?: string | null;
          date_of_birth?: string | null;
          address?: string | null;
          province?: string | null;
          district?: string | null;
          municipality?: string | null;
          bio?: string | null;
          is_verified?: boolean;
          verified?: boolean;
          citizenship_verified?: boolean;
          university?: string | null;
          student_id_verified?: boolean;
          personal_details?: Json | null;
          identity_verification?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      rooms: {
        Row: {
          id: string;
          owner_id: string;
          title: string;
          title_np?: string | null;
          description?: string | null;
          description_np?: string | null;
          price: number;
          deposit: number;
          security_deposit?: number;
          room_type: string;
          property_type?: string;
          occupancy_preference: string;
          gender_preference?: string;
          province?: string | null;
          district?: string | null;
          municipality?: string | null;
          ward?: string | null;
          area?: string | null;
          address?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          location?: Json;
          images: Json;
          virtual_tour?: Json | null;
          amenities?: Json;
          house_rules?: Json;
          house_rules_np?: Json;
          water_schedule?: string | null;
          contract_type?: string | null;
          electricity_rate_per_unit?: number | null;
          owner?: Json;
          ratings?: Json;
          reviews?: Json;
          available_from?: string | null;
          floor?: string | null;
          floor_number?: number | null;
          bedrooms?: number | null;
          bathrooms?: number | null;
          furnished?: boolean;
          parking?: boolean;
          wifi?: boolean;
          water_available?: boolean;
          electricity_available?: boolean;
          kitchen_available?: boolean;
          attached_bathroom?: boolean;
          balcony?: boolean;
          featured: boolean;
          is_featured?: boolean;
          is_verified?: boolean;
          views_count?: number;
          status: ListingStatus;
          rejection_reason?: string | null;
          moderated_at?: string | null;
          moderated_by?: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          title: string;
          title_np?: string | null;
          description?: string | null;
          description_np?: string | null;
          price: number;
          deposit?: number;
          security_deposit?: number;
          room_type?: string;
          property_type?: string;
          occupancy_preference?: string;
          gender_preference?: string;
          province?: string | null;
          district?: string | null;
          municipality?: string | null;
          ward?: string | null;
          area?: string | null;
          address?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          location?: Json;
          images?: Json;
          virtual_tour?: Json | null;
          amenities?: Json;
          house_rules?: Json;
          house_rules_np?: Json;
          water_schedule?: string | null;
          contract_type?: string | null;
          electricity_rate_per_unit?: number | null;
          owner?: Json;
          ratings?: Json;
          reviews?: Json;
          available_from?: string | null;
          floor?: string | null;
          floor_number?: number | null;
          bedrooms?: number | null;
          bathrooms?: number | null;
          furnished?: boolean;
          parking?: boolean;
          wifi?: boolean;
          water_available?: boolean;
          electricity_available?: boolean;
          kitchen_available?: boolean;
          attached_bathroom?: boolean;
          balcony?: boolean;
          featured?: boolean;
          is_featured?: boolean;
          is_verified?: boolean;
          views_count?: number;
          status?: ListingStatus;
          rejection_reason?: string | null;
          moderated_at?: string | null;
          moderated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          title?: string;
          title_np?: string | null;
          description?: string | null;
          description_np?: string | null;
          price?: number;
          deposit?: number;
          security_deposit?: number;
          room_type?: string;
          property_type?: string;
          occupancy_preference?: string;
          gender_preference?: string;
          province?: string | null;
          district?: string | null;
          municipality?: string | null;
          ward?: string | null;
          area?: string | null;
          address?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          location?: Json;
          images?: Json;
          virtual_tour?: Json | null;
          amenities?: Json;
          house_rules?: Json;
          house_rules_np?: Json;
          water_schedule?: string | null;
          contract_type?: string | null;
          electricity_rate_per_unit?: number | null;
          owner?: Json;
          ratings?: Json;
          reviews?: Json;
          available_from?: string | null;
          floor?: string | null;
          floor_number?: number | null;
          bedrooms?: number | null;
          bathrooms?: number | null;
          furnished?: boolean;
          parking?: boolean;
          wifi?: boolean;
          water_available?: boolean;
          electricity_available?: boolean;
          kitchen_available?: boolean;
          attached_bathroom?: boolean;
          balcony?: boolean;
          featured?: boolean;
          is_featured?: boolean;
          is_verified?: boolean;
          views_count?: number;
          status?: ListingStatus;
          rejection_reason?: string | null;
          moderated_at?: string | null;
          moderated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      room_listings: {
        Row: {
          id: string;
          owner_id: string;
          title: string;
          description: string | null;
          property_type: string;
          room_type: string;
          price: number;
          security_deposit: number;
          province: string;
          district: string;
          municipality: string;
          ward: string | null;
          area: string | null;
          address: string;
          latitude: number | null;
          longitude: number | null;
          bedrooms: number;
          bathrooms: number;
          floor_number: number;
          furnished: boolean;
          parking: boolean;
          wifi: boolean;
          water_available: boolean;
          electricity_available: boolean;
          kitchen_available: boolean;
          attached_bathroom: boolean;
          balcony: boolean;
          gender_preference: string;
          available_from: string | null;
          status: ListingStatus;
          is_verified: boolean;
          is_featured: boolean;
          views_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          title: string;
          description?: string | null;
          property_type?: string;
          room_type?: string;
          price: number;
          security_deposit?: number;
          province: string;
          district: string;
          municipality: string;
          ward?: string | null;
          area?: string | null;
          address: string;
          latitude?: number | null;
          longitude?: number | null;
          bedrooms?: number;
          bathrooms?: number;
          floor_number?: number;
          furnished?: boolean;
          parking?: boolean;
          wifi?: boolean;
          water_available?: boolean;
          electricity_available?: boolean;
          kitchen_available?: boolean;
          attached_bathroom?: boolean;
          balcony?: boolean;
          gender_preference?: string;
          available_from?: string | null;
          status?: ListingStatus;
          is_verified?: boolean;
          is_featured?: boolean;
          views_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          title?: string;
          description?: string | null;
          property_type?: string;
          room_type?: string;
          price?: number;
          security_deposit?: number;
          province?: string;
          district?: string;
          municipality?: string;
          ward?: string | null;
          area?: string | null;
          address?: string;
          latitude?: number | null;
          longitude?: number | null;
          bedrooms?: number;
          bathrooms?: number;
          floor_number?: number;
          furnished?: boolean;
          parking?: boolean;
          wifi?: boolean;
          water_available?: boolean;
          electricity_available?: boolean;
          kitchen_available?: boolean;
          attached_bathroom?: boolean;
          balcony?: boolean;
          gender_preference?: string;
          available_from?: string | null;
          status?: ListingStatus;
          is_verified?: boolean;
          is_featured?: boolean;
          views_count?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      room_images: {
        Row: {
          id: string;
          room_id: string;
          image_url: string;
          storage_path: string | null;
          is_primary: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          image_url: string;
          storage_path?: string | null;
          is_primary?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          image_url?: string;
          storage_path?: string | null;
          is_primary?: boolean;
          sort_order?: number;
          created_at?: string;
        };
      };
      wishlists: {
        Row: {
          id: string;
          user_id: string;
          room_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          room_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          room_id?: string;
          created_at?: string;
        };
      };
      comparison_lists: {
        Row: {
          id: string;
          user_id: string;
          room_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          room_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          room_id?: string;
          created_at?: string;
        };
      };
      bookings: {
        Row: {
          id: string;
          room_id: string;
          renter_id: string;
          owner_id: string;
          move_in_date: string;
          duration_months: number;
          message: string | null;
          status: BookingStatus;
          monthly_rent: number;
          security_deposit: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          renter_id: string;
          owner_id: string;
          move_in_date: string;
          duration_months?: number;
          message?: string | null;
          status?: BookingStatus;
          monthly_rent: number;
          security_deposit?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          renter_id?: string;
          owner_id?: string;
          move_in_date?: string;
          duration_months?: number;
          message?: string | null;
          status?: BookingStatus;
          monthly_rent?: number;
          security_deposit?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      payments: {
        Row: {
          id: string;
          booking_id: string | null;
          payer_id: string;
          receiver_id: string;
          amount: number;
          currency: string;
          payment_method: string;
          provider: string;
          transaction_id: string | null;
          status: PaymentStatus;
          paid_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          booking_id?: string | null;
          payer_id: string;
          receiver_id: string;
          amount: number;
          currency?: string;
          payment_method: string;
          provider: string;
          transaction_id?: string | null;
          status?: PaymentStatus;
          paid_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          booking_id?: string | null;
          payer_id?: string;
          receiver_id?: string;
          amount?: number;
          currency?: string;
          payment_method?: string;
          provider?: string;
          transaction_id?: string | null;
          status?: PaymentStatus;
          paid_at?: string | null;
          created_at?: string;
        };
      };
      conversations: {
        Row: {
          id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          created_at?: string;
        };
      };
      conversation_members: {
        Row: {
          conversation_id: string;
          user_id: string;
        };
        Insert: {
          conversation_id: string;
          user_id: string;
        };
        Update: {
          conversation_id?: string;
          user_id?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          message: string;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          message: string;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          sender_id?: string;
          message?: string;
          is_read?: boolean;
          created_at?: string;
        };
      };
      moderation_logs: {
        Row: {
          id: string;
          admin_id?: string | null;
          moderator_id?: string | null;
          target_type?: string;
          target_id?: string | null;
          action: string;
          reason?: string | null;
          listing_id?: string | null;
          listing_title?: string | null;
          previous_status?: string | null;
          new_status?: string | null;
          moderator_name?: string | null;
          timestamp: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          admin_id?: string | null;
          moderator_id?: string | null;
          target_type?: string;
          target_id?: string | null;
          action: string;
          reason?: string | null;
          listing_id?: string | null;
          listing_title?: string | null;
          previous_status?: string | null;
          new_status?: string | null;
          moderator_name?: string | null;
          timestamp?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          admin_id?: string | null;
          moderator_id?: string | null;
          target_type?: string;
          target_id?: string | null;
          action?: string;
          reason?: string | null;
          listing_id?: string | null;
          listing_title?: string | null;
          previous_status?: string | null;
          new_status?: string | null;
          moderator_name?: string | null;
          timestamp?: string;
          created_at?: string;
        };
      };
      disputes: {
        Row: {
          id: string;
          ticket_number?: string | null;
          booking_id?: string | null;
          room_id?: string | null;
          room_title?: string | null;
          initiator_id: string;
          initiator_name?: string | null;
          initiator_role?: string | null;
          respondent_id?: string | null;
          respondent_name?: string | null;
          reason: string;
          description: string;
          status: string;
          resolution_notes?: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          ticket_number?: string | null;
          booking_id?: string | null;
          room_id?: string | null;
          room_title?: string | null;
          initiator_id: string;
          initiator_name?: string | null;
          initiator_role?: string | null;
          respondent_id?: string | null;
          respondent_name?: string | null;
          reason: string;
          description: string;
          status?: string;
          resolution_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          ticket_number?: string | null;
          booking_id?: string | null;
          room_id?: string | null;
          room_title?: string | null;
          initiator_id?: string;
          initiator_name?: string | null;
          initiator_role?: string | null;
          respondent_id?: string | null;
          respondent_name?: string | null;
          reason?: string;
          description?: string;
          status?: string;
          resolution_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      analytics_events: {
        Row: {
          id: string;
          event_name: string;
          user_id?: string | null;
          metadata?: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_name: string;
          user_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_name?: string;
          user_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
      };
      chat_messages: {
        Row: {
          id: string;
          conversation_id?: string | null;
          room_id?: string | null;
          sender_id: string;
          receiver_id?: string | null;
          message: string;
          content?: string | null;
          read: boolean;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id?: string | null;
          room_id?: string | null;
          sender_id: string;
          receiver_id?: string | null;
          message: string;
          content?: string | null;
          read?: boolean;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string | null;
          room_id?: string | null;
          sender_id?: string;
          receiver_id?: string | null;
          message?: string;
          content?: string | null;
          read?: boolean;
          is_read?: boolean;
          created_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          message: string;
          type: string;
          reference_id: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          message: string;
          type: string;
          reference_id?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          message?: string;
          type?: string;
          reference_id?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
      };
      reports: {
        Row: {
          id: string;
          reporter_id: string;
          reported_user_id: string | null;
          reported_room_id: string | null;
          reason: string;
          description: string | null;
          status: ReportStatus;
          created_at: string;
          resolved_at: string | null;
        };
        Insert: {
          id?: string;
          reporter_id: string;
          reported_user_id?: string | null;
          reported_room_id?: string | null;
          reason: string;
          description?: string | null;
          status?: ReportStatus;
          created_at?: string;
          resolved_at?: string | null;
        };
        Update: {
          id?: string;
          reporter_id?: string;
          reported_user_id?: string | null;
          reported_room_id?: string | null;
          reason?: string;
          description?: string | null;
          status?: ReportStatus;
          created_at?: string;
          resolved_at?: string | null;
        };
      };
      reviews: {
        Row: {
          id: string;
          reviewer_id: string;
          room_id: string;
          owner_id: string;
          rating: number;
          comment: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          reviewer_id: string;
          room_id: string;
          owner_id: string;
          rating: number;
          comment?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          reviewer_id?: string;
          room_id?: string;
          owner_id?: string;
          rating?: number;
          comment?: string | null;
          created_at?: string;
        };
      };
      room_views: {
        Row: {
          id: string;
          room_id: string;
          viewer_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          viewer_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          viewer_id?: string | null;
          created_at?: string;
        };
      };
      nepal_provinces: {
        Row: {
          id: number;
          name_en: string;
          name_np: string;
        };
        Insert: {
          id: number;
          name_en: string;
          name_np: string;
        };
        Update: {
          id?: number;
          name_en?: string;
          name_np?: string;
        };
      };
      nepal_districts: {
        Row: {
          id: number;
          province_id: number;
          name_en: string;
          name_np: string;
        };
        Insert: {
          id?: number;
          province_id: number;
          name_en: string;
          name_np: string;
        };
        Update: {
          id?: number;
          province_id?: number;
          name_en?: string;
          name_np?: string;
        };
      };
      nepal_municipalities: {
        Row: {
          id: number;
          district_id: number;
          name_en: string;
          name_np: string;
          type: string;
        };
        Insert: {
          id?: number;
          district_id: number;
          name_en: string;
          name_np: string;
          type?: string;
        };
        Update: {
          id?: number;
          district_id?: number;
          name_en?: string;
          name_np?: string;
          type?: string;
        };
      };
    };
  };
}
