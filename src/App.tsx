/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  RoomListing,
  BookingRequest,
  DisputeTicket,
  Language,
  UserRole,
  OccupancyPreference,
  UserBehaviorProfile,
  UserProfile,
  ModerationLogEntry,
  ListingStatus,
} from './types';
import { INITIAL_ROOMS, INITIAL_DISPUTES } from './data/mockRooms';
import { getTranslation } from './data/translations';
import {
  getInitialBehaviorProfile,
  trackRoomView,
  trackWishlistAction,
  trackBookingAction,
  trackSearchAction,
  calculateRecommendations,
} from './services/recommendationEngine';
import {
  supabase,
  isValidUUID,
  logoutUser,
  getUserProfile,
  subscribeToUserProfile,
  getStoredUserSession,
  saveUserSession,
  fetchRoomsFromSupabase,
  saveRoomToSupabase,
  updateRoomStatusInSupabase,
  deleteRoomFromSupabase,
  recordModerationLogInSupabase,
  fetchModerationLogsFromSupabase,
  saveBookingToSupabase,
  fetchBookingsFromSupabase,
  updateBookingStatusInSupabase,
  ensureProfileAfterOAuthRedirect,
  getUserWishlistRoomIds,
  toggleWishlistItem,
  getUserComparisonRoomIds,
  toggleComparisonItem,
  recordRoomView,
  getCurrentUserProfile,
  onAuthStateChange,
  updateDisputeStatusInSupabase,
  fetchDisputesFromSupabase,
  DbConversation,
} from './services/supabase';
import {
  AppNotification,
  subscribeToRealtimeNotifications,
  setupForegroundFCMListener,
  notifyOwnerOfNewBookingInquiry,
  notifyStudentOfBookingConfirmed,
  CURRENT_CLIENT_SESSION_ID,
} from './services/supabase/notificationService';

// Components
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { HeroSearch } from './components/HeroSearch';
import { RoomCard } from './components/RoomCard';
import { RoomFilters } from './components/RoomFilters';
import { RoomDetailModal } from './components/RoomDetailModal';
import { InteractiveMapModal } from './components/InteractiveMapModal';
import { BookingPaymentModal } from './components/BookingPaymentModal';
import { DigitalLeaseAgreementModal } from './components/DigitalLeaseAgreementModal';
import { ChatDrawer } from './components/ChatDrawer';
import { CompareDrawer } from './components/CompareDrawer';
import { OwnerListingWizard } from './components/OwnerListingWizard';
import { OwnerDashboard } from './components/OwnerDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { TenantGuideSection } from './components/TenantGuideSection';
import { RoommateFinder } from './components/RoommateFinder';
import { AIRecommendationsSection } from './components/AIRecommendationsSection';
import { WishlistModal } from './components/WishlistModal';
import { Footer } from './components/Footer';

// Icons
import {
  Sparkles,
  MapPin,
  Building,
  RotateCcw,
  SlidersHorizontal,
  Home,
  CheckCircle2,
  Users,
  Lock,
} from 'lucide-react';

export default function App() {
  // Localization & Role states
  const [language, setLanguage] = useState<Language>('en');
  const [activeRole, setActiveRole] = useState<UserRole>('renter');
  const [activeTab, setActiveTab] = useState<
    'browse' | 'map' | 'roommates' | 'guide' | 'owner-dashboard' | 'admin-dashboard'
  >('browse');

  // Firebase User Authentication state (persisted across page reloads)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const cached = getStoredUserSession();
    // If cached session is a demo user, clear it out
    if (cached && (cached.id.includes('demo') || cached.email.includes('demo') || cached.email.includes('aayush.sharma'))) {
      saveUserSession(null);
      return null;
    }
    return cached || null;
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');
  const [authModalRole, setAuthModalRole] = useState<UserRole>('renter');

  // --- Password Recovery state ---
  // Triggered when the user arrives from a Supabase "reset password" email link.
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [resetPasswordMsg, setResetPasswordMsg] = useState('');
  const [resetPasswordError, setResetPasswordError] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Listen for Supabase's PASSWORD_RECOVERY event. This fires automatically
  // when the user lands on the app via the password reset link in their email.
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setShowResetPasswordModal(true);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Handle Google / Facebook OAuth redirect return.
  // When the user clicks "Continue with Google/Facebook" in AuthModal, the
  // whole tab navigates away to the provider and back. On return, Supabase
  // has a real session but no profile row may exist yet for a first-time
  // user — this creates/loads that profile using the real Supabase UUID.
  useEffect(() => {
    ensureProfileAfterOAuthRedirect().then(profile => {
      if (profile) {
        setCurrentUser(profile);
        setActiveRole(profile.role);
        if (profile.role === 'owner') {
          setActiveTab('owner-dashboard');
        } else if (profile.role === 'admin') {
          setActiveTab('admin-dashboard');
        }
      }
    });
  }, []);

  const handleUpdatePassword = async () => {
    setResetPasswordError('');
    setResetPasswordMsg('');

    if (!newPassword || newPassword.length < 6) {
      setResetPasswordError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setResetPasswordError('Passwords do not match.');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setResetPasswordError(error.message || 'Could not update password.');
      } else {
        setResetPasswordMsg('Password updated successfully! You can now sign in with your new password.');
        setNewPassword('');
        setConfirmNewPassword('');
        // Give the user a moment to read the success message, then close.
        setTimeout(() => {
          setShowResetPasswordModal(false);
          setResetPasswordMsg('');
        }, 2500);
      }
    } catch (err: any) {
      setResetPasswordError(err?.message || 'Something went wrong updating your password.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Synchronize Supabase authentication state & profile
  useEffect(() => {
    let profileUnsubscribe: (() => void) | null = null;

    // 1. Restore Supabase user profile session from database
    getCurrentUserProfile().then(sbProfile => {
      if (sbProfile && isValidUUID(sbProfile.id)) {
        saveUserSession(sbProfile);
        setCurrentUser(sbProfile);
        setActiveRole(sbProfile.role);

        // Attach real-time subscription for profile updates
        if (profileUnsubscribe) {
          profileUnsubscribe();
          profileUnsubscribe = null;
        }
        profileUnsubscribe = subscribeToUserProfile(sbProfile.id, syncedProfile => {
          if (syncedProfile && isValidUUID(syncedProfile.id)) {
            saveUserSession(syncedProfile);
            setCurrentUser(syncedProfile);
            setActiveRole(syncedProfile.role);
          }
        });
      } else {
        const cached = getStoredUserSession();
        if (cached && isValidUUID(cached.id)) {
          setCurrentUser(cached);
          setActiveRole(cached.role);
        } else {
          saveUserSession(null);
          setCurrentUser(null);
        }
      }
    });

    // 2. Real-time auth state changes from Supabase
    const unsubscribeSupabase = onAuthStateChange(sbProfile => {
      if (profileUnsubscribe) {
        profileUnsubscribe();
        profileUnsubscribe = null;
      }

      if (sbProfile && isValidUUID(sbProfile.id)) {
        saveUserSession(sbProfile);
        setCurrentUser(sbProfile);
        setActiveRole(sbProfile.role);

        profileUnsubscribe = subscribeToUserProfile(sbProfile.id, syncedProfile => {
          if (syncedProfile && isValidUUID(syncedProfile.id)) {
            saveUserSession(syncedProfile);
            setCurrentUser(syncedProfile);
            setActiveRole(syncedProfile.role);
          }
        });
      } else {
        saveUserSession(null);
        setCurrentUser(null);
      }
    });

    return () => {
      unsubscribeSupabase();
      if (profileUnsubscribe) {
        profileUnsubscribe();
      }
    };
  }, []);

  // Sync Wishlist and Comparison lists with Supabase whenever currentUser changes
  useEffect(() => {
    if (currentUser?.id && isValidUUID(currentUser.id)) {
      getUserWishlistRoomIds(currentUser.id).then(ids => {
        setWishlistRoomIds(ids || []);
      });
      getUserComparisonRoomIds(currentUser.id).then(ids => {
        setComparedRoomIds(ids || []);
      });
    } else {
      setWishlistRoomIds([]);
      setComparedRoomIds([]);
    }
  }, [currentUser?.id]);

  const handleOpenAuthModal = (mode: 'login' | 'signup' = 'login', role: UserRole = activeRole) => {
    setAuthModalMode(mode);
    setAuthModalRole(role);
    setIsAuthModalOpen(true);
  };

  const handleAuthSuccess = (profile: UserProfile) => {
    saveUserSession(profile);
    setCurrentUser(profile);
    setActiveRole(profile.role);
    if (profile.role === 'owner') {
      setActiveTab('owner-dashboard');
    } else if (profile.role === 'admin') {
      setActiveTab('admin-dashboard');
    }
  };

  const handleSignOut = async () => {
    saveUserSession(null);
    await logoutUser();
    setCurrentUser(null);
  };

  const t = getTranslation(language);

  // Data states - Supabase is single source of truth for rooms & moderation
  const [rooms, setRooms] = useState<RoomListing[]>(() => {
    try {
      const stored = localStorage.getItem('iproom_local_rooms');
      if (stored) {
        const local = JSON.parse(stored);
        if (Array.isArray(local) && local.length > 0) {
          const ids = new Set(local.map((r: any) => r.id));
          return [...local, ...INITIAL_ROOMS.filter(r => !ids.has(r.id))];
        }
      }
    } catch (e) {}
    return INITIAL_ROOMS;
  });
  const [moderationLogs, setModerationLogs] = useState<ModerationLogEntry[]>([]);
  const [bookings, setBookings] = useState<BookingRequest[]>([]);
  const [disputes, setDisputes] = useState<DisputeTicket[]>([]);

  // Load public rooms from Supabase on mount
  useEffect(() => {
    fetchRoomsFromSupabase().then(remoteRooms => {
      if (remoteRooms && remoteRooms.length > 0) {
        const remoteIds = new Set(remoteRooms.map(r => r.id));
        setRooms([...remoteRooms, ...INITIAL_ROOMS.filter(r => !remoteIds.has(r.id))]);
      } else {
        setRooms(prev => (prev.length > 0 ? prev : INITIAL_ROOMS));
      }
    });
  }, []);

  // Load session-scoped user data (bookings, moderation logs, disputes) only when valid session exists
  useEffect(() => {
    if (currentUser?.id && isValidUUID(currentUser.id)) {
      fetchBookingsFromSupabase(currentUser.id, currentUser.role).then(remoteBookings => {
        if (remoteBookings) {
          setBookings(remoteBookings);
        }
      });

      if (currentUser.role === 'admin') {
        fetchModerationLogsFromSupabase().then(logs => {
          if (logs) {
            setModerationLogs(logs);
          }
        });

        fetchDisputesFromSupabase().then(remoteDisputes => {
          if (remoteDisputes) {
            setDisputes(remoteDisputes);
          }
        });
      } else {
        setModerationLogs([]);
        setDisputes([]);
      }
    } else {
      setBookings([]);
      setModerationLogs([]);
      setDisputes([]);
    }
  }, [currentUser?.id, currentUser?.role]);

  // Real-time Push Notifications (Supabase Realtime)
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // Subscribe to real-time notifications filtered strictly for the active role & recipient
  useEffect(() => {
    // 1. Initial load from role-specific local queue
    try {
      const queueKey = `iproom_notifs_${activeRole}`;
      const cached = JSON.parse(localStorage.getItem(queueKey) || '[]');
      if (Array.isArray(cached)) {
        setNotifications(cached);
      }
    } catch (e) {
      setNotifications([]);
    }

    // 2. Real-time Supabase push notifications if authenticated
    let unsubscribeNotifications: (() => void) | null = null;
    if (currentUser?.id && isValidUUID(currentUser.id)) {
      unsubscribeNotifications = subscribeToRealtimeNotifications(
        activeRole,
        currentUser.id,
        incomingNotifs => {
          if (incomingNotifs.length > 0) {
            // Filter by active role
            const filtered = incomingNotifs.filter(
              n => n.toRole === 'all' || n.toRole === activeRole
            );
            setNotifications(filtered);
          }
        }
      );
    }

    // 3. Foreground listener for real-time in-app broadcasts (strictly filtered for recipient)
    let unsubscribeForeground: (() => void) | null = null;
    setupForegroundFCMListener(incomingNotif => {
      // 1. Never notify the sender who triggered the action from this device/session!
      if (
        incomingNotif.senderSessionId &&
        incomingNotif.senderSessionId === CURRENT_CLIENT_SESSION_ID
      ) {
        return;
      }
      if (
        currentUser?.id &&
        incomingNotif.data?.senderId &&
        incomingNotif.data.senderId === currentUser.id
      ) {
        return;
      }
      if (
        currentUser?.name &&
        incomingNotif.data?.senderName &&
        incomingNotif.data.senderName.trim().toLowerCase() === currentUser.name.trim().toLowerCase()
      ) {
        return;
      }

      // 2. Notification must strictly match the recipient's active role
      if (incomingNotif.toRole !== 'all' && incomingNotif.toRole !== activeRole) {
        return;
      }

      // 3. If directed to a specific user ID, ensure it matches current user
      if (incomingNotif.toUserId && incomingNotif.toUserId !== 'all') {
        if (currentUser?.id && incomingNotif.toUserId !== currentUser.id) {
          return;
        }
        if (!currentUser?.id && incomingNotif.toRole === 'owner') {
          return;
        }
      }

      setNotifications(prev => [
        incomingNotif,
        ...prev.filter(n => n.id !== incomingNotif.id),
      ]);
    }).then(unsub => {
      if (unsub) unsubscribeForeground = unsub;
    });

    return () => {
      if (unsubscribeNotifications) unsubscribeNotifications();
      if (unsubscribeForeground) unsubscribeForeground();
    };
  }, [activeRole, currentUser?.id, currentUser?.name]);

  // Student user behavior & AI recommendation tracking
  const [userProfile, setUserProfile] = useState<UserBehaviorProfile>(getInitialBehaviorProfile());

  // Wishlist and Compare selections
  const [wishlistRoomIds, setWishlistRoomIds] = useState<string[]>([]);
  const [comparedRoomIds, setComparedRoomIds] = useState<string[]>([]);

  // Search & Filter state
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedMunicipality, setSelectedMunicipality] = useState('');
  const [selectedRoomType, setSelectedRoomType] = useState('');
  const [selectedCampus, setSelectedCampus] = useState('Tribhuvan University (Central Campus)');
  const [maxBudget, setMaxBudget] = useState(25000);

  // Detailed Filter sidebar state
  const [filters, setFilters] = useState({
    roomType: '',
    occupancy: '' as OccupancyPreference | '',
    minPrice: 0,
    maxPrice: 25000,
    water24x7: false,
    solarHotWater: false,
    attachedBathroom: false,
    kitchenFacility: false,
    bikeParking: false,
    wifi: false,
    electricityBackup: false,
    verifiedOnly: false,
  });

  // Modals & Drawers state
  const [selectedRoomDetail, setSelectedRoomDetail] = useState<RoomListing | null>(null);
  const [bookingRoom, setBookingRoom] = useState<RoomListing | null>(null);
  const [viewingContractBooking, setViewingContractBooking] = useState<BookingRequest | null>(null);
  const [activeChatRoom, setActiveChatRoom] = useState<RoomListing | null>(null);
  const [activeChatConversation, setActiveChatConversation] = useState<DbConversation | null>(null);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [isAddListingOpen, setIsAddListingOpen] = useState(false);

  // Track room view
  const handleSelectRoom = (room: RoomListing) => {
    setSelectedRoomDetail(room);
    const updated = trackRoomView(room.id, userProfile);
    setUserProfile(updated);
    // Record view in Supabase analytics
    recordRoomView(room.id, currentUser?.id);
  };

  // Toggle wishlist
  const handleToggleWishlist = (roomId: string) => {
    const isCurrentlySaved = wishlistRoomIds.includes(roomId);
    const updatedWishlist = isCurrentlySaved
      ? wishlistRoomIds.filter(id => id !== roomId)
      : [...wishlistRoomIds, roomId];

    setWishlistRoomIds(updatedWishlist);
    const updatedProfile = trackWishlistAction(roomId, !isCurrentlySaved, userProfile);
    setUserProfile(updatedProfile);

    // Persist to Supabase if authenticated with valid UUID
    if (currentUser?.id && isValidUUID(currentUser.id) && isValidUUID(roomId)) {
      toggleWishlistItem(currentUser.id, roomId, isCurrentlySaved);
    }
  };

  // Toggle compare
  const handleToggleCompare = (roomId: string) => {
    if (comparedRoomIds.includes(roomId)) {
      setComparedRoomIds(prev => prev.filter(id => id !== roomId));
      if (currentUser?.id && isValidUUID(currentUser.id) && isValidUUID(roomId)) {
        toggleComparisonItem(currentUser.id, roomId, true);
      }
    } else {
      if (comparedRoomIds.length >= 3) {
        return;
      }
      setComparedRoomIds(prev => [...prev, roomId]);
      setIsCompareOpen(true);
      if (currentUser?.id && isValidUUID(currentUser.id) && isValidUUID(roomId)) {
        toggleComparisonItem(currentUser.id, roomId, false);
      }
    }
  };

  // Quick book action
  const handleQuickBook = (room: RoomListing) => {
    setBookingRoom(room);
  };

  // Booking completion
  const handleBookingComplete = (newBooking: BookingRequest) => {
    setBookings(prev => [newBooking, ...prev]);
    const updatedProfile = trackBookingAction(newBooking.roomId, userProfile);
    setUserProfile(updatedProfile);
    setViewingContractBooking(newBooking);

    // Save booking to Supabase
    saveBookingToSupabase(newBooking);

    // Real-time FCM push notification to owner for new booking inquiry
    const targetRoom = rooms.find(r => r.id === newBooking.roomId);
    notifyOwnerOfNewBookingInquiry(
      targetRoom?.owner.id || newBooking.ownerId,
      newBooking
    );
  };

  // Search execution
  const handleSearchSubmit = () => {
    const updated = trackSearchAction(
      {
        campus: selectedCampus,
        location: selectedMunicipality || selectedDistrict || selectedProvince,
        maxBudget,
        roomType: selectedRoomType,
      },
      userProfile
    );
    setUserProfile(updated);
  };

  // Reset filters
  const handleResetFilters = () => {
    setSelectedProvince('');
    setSelectedDistrict('');
    setSelectedMunicipality('');
    setSelectedRoomType('');
    setSelectedCampus('');
    setMaxBudget(25000);
    setFilters({
      roomType: '',
      occupancy: '',
      minPrice: 0,
      maxPrice: 25000,
      water24x7: false,
      solarHotWater: false,
      attachedBathroom: false,
      kitchenFacility: false,
      bikeParking: false,
      wifi: false,
      electricityBackup: false,
      verifiedOnly: false,
    });
  };

  // Filtered rooms logic
  const filteredRooms = useMemo(() => {
    return rooms.filter(room => {
      // Hide listings that are rejected, suspended, or unpublished; all approved/active/new listings are publicly visible
      if (room.status === 'rejected' || room.status === 'suspended' || room.status === 'unpublished') return false;

      // Province filter
      if (selectedProvince && room.location.province !== selectedProvince) return false;
      // District filter
      if (selectedDistrict && room.location.district !== selectedDistrict) return false;
      // Municipality filter
      if (selectedMunicipality && room.location.municipality !== selectedMunicipality) return false;
      // Campus filter
      if (selectedCampus && room.location.nearbyCampus !== selectedCampus) return false;
      // Room Type from hero
      if (selectedRoomType && room.roomType !== selectedRoomType) return false;
      // Budget from hero
      if (room.price > maxBudget) return false;

      // Sidebar Filter: Room type
      if (filters.roomType && room.roomType !== filters.roomType) return false;
      // Sidebar Filter: Occupancy
      if (filters.occupancy && room.occupancyPreference !== filters.occupancy) return false;
      // Sidebar Filter: Price
      if (room.price > filters.maxPrice) return false;
      // Amenities
      if (filters.water24x7 && !room.amenities.water24x7) return false;
      if (filters.solarHotWater && !room.amenities.hotWaterSolar) return false;
      if (filters.attachedBathroom && !room.amenities.attachedBathroom) return false;
      if (filters.kitchenFacility && !room.amenities.kitchenFacility) return false;
      if (filters.bikeParking && !room.amenities.bikeParking) return false;
      if (filters.wifi && !room.amenities.wifi) return false;
      if (filters.electricityBackup && !room.amenities.electricityBackup) return false;
      // Verified only
      if (filters.verifiedOnly && !room.owner.citizenshipVerified) return false;

      return true;
    });
  }, [
    rooms,
    selectedProvince,
    selectedDistrict,
    selectedMunicipality,
    selectedCampus,
    selectedRoomType,
    maxBudget,
    filters,
  ]);

  // AI Recommendations calculation
  const aiRecommendedRooms = useMemo(() => {
    return calculateRecommendations(rooms, userProfile);
  }, [rooms, userProfile]);

  // Wishlisted rooms objects
  const wishlistedRooms = useMemo(() => {
    return rooms.filter(r => wishlistRoomIds.includes(r.id));
  }, [rooms, wishlistRoomIds]);

  // Compared rooms objects
  const comparedRooms = useMemo(() => {
    return rooms.filter(r => comparedRoomIds.includes(r.id));
  }, [rooms, comparedRoomIds]);

  // Landlord: Add new listing
  const handleAddNewListing = (newRoom: RoomListing) => {
    // New room is published as approved and immediately public for all students & renters
    const roomWithStatus: RoomListing = {
      ...newRoom,
      status: 'approved',
      featured: newRoom.featured ?? false,
      createdAt: newRoom.createdAt || new Date().toISOString(),
    };

    setRooms(prev => [roomWithStatus, ...prev.filter(r => r.id !== roomWithStatus.id)]);

    // Save to Supabase Postgres database
    saveRoomToSupabase(roomWithStatus);

    setIsAddListingOpen(false);
    setActiveTab('browse');
    setSelectedRoomDetail(roomWithStatus);
  };

  // Landlord: Accept booking request
  const handleAcceptBooking = (bookingId: string) => {
    setBookings(prev =>
      prev.map(b => (b.id === bookingId ? { ...b, status: 'confirmed' } : b))
    );
    // Update status in Supabase
    updateBookingStatusInSupabase(bookingId, 'confirmed');

    const targetBooking = bookings.find(b => b.id === bookingId);
    if (targetBooking) {
      setViewingContractBooking(targetBooking);

      // Real-time FCM push notification to student that booking was confirmed
      notifyStudentOfBookingConfirmed(
        targetBooking.tenantId,
        targetBooking,
        currentUser?.name || 'Property Owner'
      );
    }
  };

  // Landlord: Reject booking request
  const handleRejectBooking = (bookingId: string) => {
    setBookings(prev => prev.filter(b => b.id !== bookingId));
    // Update status in Supabase
    updateBookingStatusInSupabase(bookingId, 'cancelled');
  };

  // Helper to update rooms state without localStorage caching
  const persistRooms = (updatedRooms: RoomListing[]) => {
    setRooms(updatedRooms);
  };

  // Admin Moderator: Approve listing
  const handleApproveRoom = (roomId: string) => {
    const target = rooms.find(r => r.id === roomId);
    if (!target) return;

    const previousStatus = target.status;
    const now = new Date().toISOString();
    const modBy = currentUser?.name || 'Admin Moderator';

    const updated = rooms.map(r =>
      r.id === roomId
        ? {
            ...r,
            status: 'approved' as ListingStatus,
            rejectionReason: undefined,
            moderatedAt: now,
            moderatedBy: modBy,
          }
        : r
    );
    persistRooms(updated);

    // Update in Supabase
    updateRoomStatusInSupabase(roomId, 'approved', {
      moderatedAt: now,
      moderatedBy: (currentUser?.id && isValidUUID(currentUser.id)) ? currentUser.id : null,
      rejectionReason: null,
    });

    // Audit log
    recordModerationLogInSupabase({
      listingId: roomId,
      listingTitle: target.title,
      action: 'approved',
      previousStatus,
      newStatus: 'approved',
      moderatorId: (currentUser?.id && isValidUUID(currentUser.id)) ? currentUser.id : undefined,
      moderatorName: modBy,
      reason: 'Passed moderation audit and verified for public browse',
    }).then(newLog => {
      setModerationLogs(prev => [newLog, ...prev]);
    });
  };

  // Admin Moderator: Reject listing with reason
  const handleRejectRoom = (roomId: string, reason: string) => {
    const target = rooms.find(r => r.id === roomId);
    if (!target) return;

    const previousStatus = target.status;
    const now = new Date().toISOString();
    const modBy = currentUser?.name || 'Admin Moderator';

    const updated = rooms.map(r =>
      r.id === roomId
        ? {
            ...r,
            status: 'rejected' as ListingStatus,
            rejectionReason: reason,
            moderatedAt: now,
            moderatedBy: modBy,
          }
        : r
    );
    persistRooms(updated);

    // Update in Supabase
    updateRoomStatusInSupabase(roomId, 'rejected', {
      rejectionReason: reason,
      moderatedAt: now,
      moderatedBy: (currentUser?.id && isValidUUID(currentUser.id)) ? currentUser.id : null,
    });

    // Audit log
    recordModerationLogInSupabase({
      listingId: roomId,
      listingTitle: target.title,
      action: 'rejected',
      previousStatus,
      newStatus: 'rejected',
      moderatorId: (currentUser?.id && isValidUUID(currentUser.id)) ? currentUser.id : undefined,
      moderatorName: modBy,
      reason,
    }).then(newLog => {
      setModerationLogs(prev => [newLog, ...prev]);
    });
  };

  // Admin Moderator: Suspend listing
  const handleSuspendRoom = (roomId: string) => {
    const target = rooms.find(r => r.id === roomId);
    if (!target) return;

    const previousStatus = target.status;
    const now = new Date().toISOString();
    const modBy = currentUser?.name || 'Admin Moderator';

    const updated = rooms.map(r =>
      r.id === roomId
        ? {
            ...r,
            status: 'suspended' as ListingStatus,
            moderatedAt: now,
            moderatedBy: modBy,
          }
        : r
    );
    persistRooms(updated);

    updateRoomStatusInSupabase(roomId, 'suspended', {
      moderatedAt: now,
      moderatedBy: (currentUser?.id && isValidUUID(currentUser.id)) ? currentUser.id : null,
    });

    recordModerationLogInSupabase({
      listingId: roomId,
      listingTitle: target.title,
      action: 'suspended',
      previousStatus,
      newStatus: 'suspended',
      moderatorId: (currentUser?.id && isValidUUID(currentUser.id)) ? currentUser.id : undefined,
      moderatorName: modBy,
      reason: 'Temporarily suspended by Admin Moderator',
    }).then(newLog => {
      setModerationLogs(prev => [newLog, ...prev]);
    });
  };

  // Admin Moderator: Unpublish listing
  const handleUnpublishRoom = (roomId: string) => {
    const target = rooms.find(r => r.id === roomId);
    if (!target) return;

    const previousStatus = target.status;
    const now = new Date().toISOString();
    const modBy = currentUser?.name || 'Admin Moderator';

    const updated = rooms.map(r =>
      r.id === roomId
        ? {
            ...r,
            status: 'unpublished' as ListingStatus,
            moderatedAt: now,
            moderatedBy: modBy,
          }
        : r
    );
    persistRooms(updated);

    updateRoomStatusInSupabase(roomId, 'unpublished', {
      moderatedAt: now,
      moderatedBy: (currentUser?.id && isValidUUID(currentUser.id)) ? currentUser.id : null,
    });

    recordModerationLogInSupabase({
      listingId: roomId,
      listingTitle: target.title,
      action: 'unpublished',
      previousStatus,
      newStatus: 'unpublished',
      moderatorId: (currentUser?.id && isValidUUID(currentUser.id)) ? currentUser.id : undefined,
      moderatorName: modBy,
      reason: 'Unpublished by moderator',
    }).then(newLog => {
      setModerationLogs(prev => [newLog, ...prev]);
    });
  };

  // Admin Moderator: Restore listing to pending
  const handleRestoreRoom = (roomId: string) => {
    const target = rooms.find(r => r.id === roomId);
    if (!target) return;

    const previousStatus = target.status;
    const now = new Date().toISOString();
    const modBy = currentUser?.name || 'Admin Moderator';

    const updated = rooms.map(r =>
      r.id === roomId
        ? {
            ...r,
            status: 'pending' as ListingStatus,
            rejectionReason: undefined,
            moderatedAt: now,
            moderatedBy: modBy,
          }
        : r
    );
    persistRooms(updated);

    updateRoomStatusInSupabase(roomId, 'pending', {
      moderatedAt: now,
      moderatedBy: (currentUser?.id && isValidUUID(currentUser.id)) ? currentUser.id : null,
      rejectionReason: null,
    });

    recordModerationLogInSupabase({
      listingId: roomId,
      listingTitle: target.title,
      action: 'restored',
      previousStatus,
      newStatus: 'pending',
      moderatorId: (currentUser?.id && isValidUUID(currentUser.id)) ? currentUser.id : undefined,
      moderatorName: modBy,
      reason: 'Restored back to Pending verification queue',
    }).then(newLog => {
      setModerationLogs(prev => [newLog, ...prev]);
    });
  };

  // Admin Moderator: Delete listing permanently
  const handleDeleteRoom = (roomId: string) => {
    const target = rooms.find(r => r.id === roomId);
    if (!target) return;

    const previousStatus = target.status;
    const modBy = currentUser?.name || 'Admin Moderator';

    const updated = rooms.filter(r => r.id !== roomId);
    persistRooms(updated);

    deleteRoomFromSupabase(roomId);

    recordModerationLogInSupabase({
      listingId: roomId,
      listingTitle: target.title,
      action: 'deleted',
      previousStatus,
      newStatus: 'unpublished',
      moderatorId: (currentUser?.id && isValidUUID(currentUser.id)) ? currentUser.id : undefined,
      moderatorName: modBy,
      reason: 'Permanently deleted by Admin Moderator',
    }).then(newLog => {
      setModerationLogs(prev => [newLog, ...prev]);
    });
  };

  // Room Lister: Delete own room listing
  const handleOwnerDeleteRoom = (roomId: string) => {
    const target = rooms.find(r => r.id === roomId);
    if (!target) return;

    const updated = rooms.filter(r => r.id !== roomId);
    persistRooms(updated);

    deleteRoomFromSupabase(roomId);

    if (selectedRoomDetail?.id === roomId) {
      setSelectedRoomDetail(null);
    }
    if (activeChatRoom?.id === roomId) {
      setActiveChatRoom(null);
    }
    if (bookingRoom?.id === roomId) {
      setBookingRoom(null);
    }
  };

  // Admin: Resolve dispute
  const handleResolveDispute = (disputeId: string, notes: string) => {
    if (!isValidUUID(disputeId)) return;
    setDisputes(prev =>
      prev.map(d =>
        d.id === disputeId
          ? { ...d, status: 'resolved', resolutionNotes: notes }
          : d
      )
    );
    updateDisputeStatusInSupabase(disputeId, 'resolved', notes);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA] text-slate-800 antialiased font-sans">
      {/* Top Bar Navigation */}
      <Navbar
        language={language}
        onLanguageChange={setLanguage}
        activeRole={activeRole}
        onRoleChange={setActiveRole}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        wishlistCount={wishlistRoomIds.length}
        onOpenWishlist={() => setIsWishlistOpen(true)}
        compareCount={comparedRoomIds.length}
        onOpenCompare={() => setIsCompareOpen(true)}
        onOpenAddListing={() => setIsAddListingOpen(true)}
        currentUser={currentUser}
        onOpenAuthModal={handleOpenAuthModal}
        onSignOut={handleSignOut}
        notifications={notifications}
        onOpenBookingContract={bookingId => {
          const found = bookings.find(b => b.id === bookingId);
          if (found) {
            setViewingContractBooking(found);
          }
        }}
        onOpenChatWithRoom={roomId => {
          const found = rooms.find(r => r.id === roomId);
          if (found) {
            setActiveChatRoom(found);
          }
        }}
      />

      {/* Main View Router */}
      <main className="flex-1">
        {activeTab === 'browse' && (
          <div className="space-y-8 pb-12">
            {/* Hero Search Section */}
            <HeroSearch
              language={language}
              selectedProvince={selectedProvince}
              onProvinceChange={setSelectedProvince}
              selectedDistrict={selectedDistrict}
              onDistrictChange={setSelectedDistrict}
              selectedMunicipality={selectedMunicipality}
              onMunicipalityChange={setSelectedMunicipality}
              selectedRoomType={selectedRoomType}
              onRoomTypeChange={setSelectedRoomType}
              selectedCampus={selectedCampus}
              onCampusSelect={camp => {
                setSelectedCampus(camp);
                if (camp) {
                  setUserProfile(prev => ({ ...prev, targetCampus: camp }));
                }
              }}
              maxBudget={maxBudget}
              onMaxBudgetChange={setMaxBudget}
              onSearch={handleSearchSubmit}
              totalRoomsCount={filteredRooms.length}
            />

            {/* AI Recommendation Engine Smart Strip (Top Matches for Student Profile) */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <AIRecommendationsSection
                recommendedRooms={aiRecommendedRooms}
                userProfile={userProfile}
                language={language}
                onSelectRoom={handleSelectRoom}
                onQuickBook={handleQuickBook}
                onAdjustPreferences={() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            </div>

            {/* Main Marketplace Grid: Filters Sidebar + Room Cards */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col lg:flex-row items-start gap-8">
                {/* Left: Filter Sidebar */}
                <div className="w-full lg:w-72 shrink-0">
                  <div className="sticky top-20">
                    <RoomFilters
                      language={language}
                      filters={filters}
                      onChange={updated => setFilters(prev => ({ ...prev, ...updated }))}
                      onReset={handleResetFilters}
                    />
                  </div>
                </div>

                {/* Right: Listings Stream */}
                <div className="flex-1 min-w-0 space-y-5 w-full">
                  {/* Result Header & Controls */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
                    <div>
                      <h2 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                        <span>Available Verified Rooms</span>
                        <span className="font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-xs">
                          {filteredRooms.length} Listings
                        </span>
                      </h2>
                      <span className="text-xs text-slate-500">
                        {selectedCampus ? `Filtered near ${selectedCampus}` : 'Across all Nepal municipalities'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveTab('map')}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                      >
                        <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                        <span>View on Map</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab('roommates')}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border border-emerald-200"
                      >
                        <Users className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Find Roommates</span>
                      </button>
                    </div>
                  </div>

                  {/* Listings Grid */}
                  {filteredRooms.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
                      <Home className="w-12 h-12 text-slate-300 mx-auto" />
                      <h3 className="font-bold text-base text-slate-800">{t.noRoomsFound}</h3>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">{t.resetFilters}</p>
                      <button
                        type="button"
                        onClick={handleResetFilters}
                        className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold transition"
                      >
                        {t.clearFilters}
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {filteredRooms.map(room => (
                        <RoomCard
                          key={room.id}
                          room={room}
                          language={language}
                          isWishlisted={wishlistRoomIds.includes(room.id)}
                          onToggleWishlist={handleToggleWishlist}
                          isCompared={comparedRoomIds.includes(room.id)}
                          onToggleCompare={handleToggleCompare}
                          onSelectRoom={handleSelectRoom}
                          onQuickBook={handleQuickBook}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Interactive Map View Tab */}
        {activeTab === 'map' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <InteractiveMapModal
              rooms={rooms}
              language={language}
              onSelectRoom={handleSelectRoom}
              isEmbedded={true}
            />
          </div>
        )}

        {/* Roommate Finder Tab */}
        {activeTab === 'roommates' && (
          <RoommateFinder
            language={language}
            onOpenDirectChat={(name, role) => {
              // Open direct chat drawer
              const dummyRoom: RoomListing = {
                ...rooms[0],
                owner: {
                  ...rooms[0].owner,
                  name,
                }
              };
              setActiveChatRoom(dummyRoom);
            }}
          />
        )}

        {/* Student Guide Tab */}
        {activeTab === 'guide' && (
          <TenantGuideSection language={language} />
        )}

        {/* Owner Dashboard Tab */}
        {activeTab === 'owner-dashboard' && (
          <OwnerDashboard
            rooms={rooms}
            bookings={bookings}
            language={language}
            currentUser={currentUser}
            onOpenAddListing={() => setIsAddListingOpen(true)}
            onAcceptBooking={handleAcceptBooking}
            onRejectBooking={handleRejectBooking}
            onViewContract={b => setViewingContractBooking(b)}
            onSelectRoom={handleSelectRoom}
            onOpenChatWithRoom={(r) => {
              setActiveChatRoom(r);
              setActiveChatConversation(null);
            }}
            onOpenChatWithConversation={(r, conv) => {
              setActiveChatRoom(r);
              setActiveChatConversation(conv);
            }}
            onDeleteRoom={handleOwnerDeleteRoom}
          />
        )}

        {/* Admin Dashboard Tab */}
        {activeTab === 'admin-dashboard' && (
          <AdminDashboard
            rooms={rooms}
            disputes={disputes}
            language={language}
            currentUser={currentUser}
            moderationLogs={moderationLogs}
            onApproveRoom={handleApproveRoom}
            onRejectRoom={handleRejectRoom}
            onSuspendRoom={handleSuspendRoom}
            onUnpublishRoom={handleUnpublishRoom}
            onRestoreRoom={handleRestoreRoom}
            onDeleteRoom={handleDeleteRoom}
            onResolveDispute={handleResolveDispute}
            onSelectRoom={handleSelectRoom}
          />
        )}
      </main>

      {/* Footer */}
      <Footer
        language={language}
        onNavigateTab={tab => setActiveTab(tab)}
      />

      {/* Modals & Overlays */}
      {/* 1. Room Detail Modal (Includes 360-Degree Interactive Virtual Tour) */}
      {selectedRoomDetail && (
        <RoomDetailModal
          room={selectedRoomDetail}
          language={language}
          onClose={() => setSelectedRoomDetail(null)}
          onStartBooking={room => {
            setSelectedRoomDetail(null);
            setBookingRoom(room);
          }}
          onOpenChat={room => {
            setActiveChatRoom(room);
          }}
        />
      )}

      {/* 2. Booking & Payment Modal (Khalti / eSewa / Card / Escrow) */}
      {bookingRoom && (
        <BookingPaymentModal
          room={bookingRoom}
          language={language}
          currentUser={currentUser}
          onClose={() => setBookingRoom(null)}
          onBookingComplete={handleBookingComplete}
        />
      )}

      {/* 3. Digital Tenancy Lease Agreement Modal (Nepal Muluki Civil Code 2074) */}
      {viewingContractBooking && (
        <DigitalLeaseAgreementModal
          booking={viewingContractBooking}
          room={rooms.find(r => r.id === viewingContractBooking.roomId)}
          language={language}
          onClose={() => setViewingContractBooking(null)}
        />
      )}

      {/* 4. Real-time In-App Chat Drawer */}
      {activeChatRoom && (
        <ChatDrawer
          room={activeChatRoom}
          activeConversation={activeChatConversation}
          language={language}
          currentUser={currentUser}
          onClose={() => {
            setActiveChatRoom(null);
            setActiveChatConversation(null);
          }}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
        />
      )}

      {/* 5. Compare Drawer */}
      {isCompareOpen && (
        <CompareDrawer
          comparedRooms={comparedRooms}
          language={language}
          onRemoveRoom={id => setComparedRoomIds(prev => prev.filter(item => item !== id))}
          onClearAll={() => setComparedRoomIds([])}
          onSelectRoom={handleSelectRoom}
          onClose={() => setIsCompareOpen(false)}
        />
      )}

      {/* 6. Wishlist Modal */}
      {isWishlistOpen && (
        <WishlistModal
          wishlistRooms={wishlistedRooms}
          language={language}
          onRemove={handleToggleWishlist}
          onSelectRoom={handleSelectRoom}
          onClose={() => setIsWishlistOpen(false)}
        />
      )}

      {/* 7. Room Owner Listing Wizard */}
      {isAddListingOpen && (
        <OwnerListingWizard
          language={language}
          currentUser={currentUser}
          onClose={() => setIsAddListingOpen(false)}
          onSubmitNewRoom={handleAddNewListing}
        />
      )}

      {/* 8. Firebase Login & Sign Up Modal */}
      {isAuthModalOpen && (
        <AuthModal
          language={language}
          initialMode={authModalMode}
          initialRole={authModalRole}
          onClose={() => setIsAuthModalOpen(false)}
          onSuccess={handleAuthSuccess}
        />
      )}

      {/* 9. Password Recovery Modal (opens automatically from the reset-password email link) */}
      {showResetPasswordModal && (
        <div className="fixed inset-0 z-[60] bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                <Lock className="w-4 h-4" />
              </div>
              <h2 className="font-bold text-base text-slate-900">Set a New Password</h2>
            </div>

            {resetPasswordError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {resetPasswordError}
              </div>
            )}
            {resetPasswordMsg && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs">
                {resetPasswordMsg}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1 text-xs">
                  New Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1 text-xs">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={confirmNewPassword}
                  onChange={e => setConfirmNewPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleUpdatePassword}
              disabled={isUpdatingPassword}
              className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-60"
            >
              {isUpdatingPassword ? 'Updating...' : 'Update Password'}
            </button>

            <button
              type="button"
              onClick={() => setShowResetPasswordModal(false)}
              className="w-full text-center text-xs text-slate-400 hover:text-slate-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
