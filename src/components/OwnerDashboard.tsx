import React, { useState, useEffect, useMemo } from 'react';
import { RoomListing, BookingRequest, Language, UserProfile } from '../types';
import { getTranslation } from '../data/translations';
import { OwnerAnalytics } from './OwnerAnalytics';
import {
  DbConversation,
  getOwnerConversations,
} from '../services/supabase/chatService';
import {
  subscribeOwnerToPush,
  unsubscribeOwnerFromPush,
  checkCurrentPushSubscription,
  isPushSupported,
} from '../services/supabase/pushService';
import {
  PlusCircle,
  Building,
  Users,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  Check,
  X,
  FileText,
  Clock,
  BarChart3,
  Layers,
  Home,
  MessageSquare,
  Trash2,
  AlertTriangle,
  Smartphone,
  Bell,
  Loader2,
  ExternalLink,
} from 'lucide-react';

interface OwnerDashboardProps {
  rooms: RoomListing[];
  bookings: BookingRequest[];
  language: Language;
  currentUser?: UserProfile | null;
  onOpenAddListing: () => void;
  onAcceptBooking: (bookingId: string) => void;
  onRejectBooking: (bookingId: string) => void;
  onViewContract: (booking: BookingRequest) => void;
  onSelectRoom: (room: RoomListing) => void;
  onOpenChatWithRoom?: (room: RoomListing) => void;
  onOpenChatWithConversation?: (room: RoomListing, conversation: DbConversation) => void;
  onDeleteRoom?: (roomId: string) => void;
}

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({
  rooms,
  bookings,
  language,
  currentUser,
  onOpenAddListing,
  onAcceptBooking,
  onRejectBooking,
  onViewContract,
  onSelectRoom,
  onOpenChatWithRoom,
  onOpenChatWithConversation,
  onDeleteRoom,
}) => {
  const t = getTranslation(language);

  const [activeOwnerTab, setActiveOwnerTab] = useState<
    'listings' | 'messages' | 'analytics'
  >('listings');
  const [roomToDelete, setRoomToDelete] = useState<RoomListing | null>(null);

  // Private conversation threads (RULE 1)
  const [conversations, setConversations] = useState<DbConversation[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState<boolean>(false);

  // Mobile Web Push Notification state (RULE 2)
  const [isPushActive, setIsPushActive] = useState<boolean>(false);
  const [isSubscribingPush, setIsSubscribingPush] = useState<boolean>(false);
  const [pushStatusMessage, setPushStatusMessage] = useState<string | null>(null);

  // Landlord's own listings strictly filtered by owner_id (RULE 3)
  const myRooms = useMemo(() => {
    if (!currentUser?.id) return [];
    return rooms.filter(
      (r) => r.owner?.id === currentUser.id || (r as any).owner_id === currentUser.id
    );
  }, [rooms, currentUser?.id]);

  // Load conversations and push status
  useEffect(() => {
    if (!currentUser?.id) return;

    setIsLoadingConversations(true);
    getOwnerConversations(currentUser.id).then(({ conversations: list, error }) => {
      if (error) {
        console.error('Error loading conversations for owner:', error);
      } else {
        setConversations(list);
      }
      setIsLoadingConversations(false);
    });

    checkCurrentPushSubscription().then((active) => {
      setIsPushActive(active);
    });
  }, [currentUser?.id]);

  const handleEnablePush = async () => {
    if (!currentUser?.id) return;
    setIsSubscribingPush(true);
    setPushStatusMessage(null);
    try {
      const { success, error } = await subscribeOwnerToPush(currentUser.id);
      if (success) {
        setIsPushActive(true);
        setPushStatusMessage(
          language === 'np'
            ? 'मोबाइल नोटिफिकेसन सफलतापूर्वक सक्रिय भयो! विद्यार्थीले सन्देश पठाउँदा अलर्ट आउनेछ।'
            : 'Push notifications enabled successfully! You will get alerts even when this tab is closed.'
        );
      } else {
        setPushStatusMessage(error || 'Failed to enable notifications.');
      }
    } finally {
      setIsSubscribingPush(false);
    }
  };

  const handleDisablePush = async () => {
    if (!currentUser?.id) return;
    setIsSubscribingPush(true);
    try {
      await unsubscribeOwnerFromPush(currentUser.id);
      setIsPushActive(false);
      setPushStatusMessage(
        language === 'np' ? 'मोबाइल नोटिफिकेसन बन्द गरियो।' : 'Push notifications disabled.'
      );
    } finally {
      setIsSubscribingPush(false);
    }
  };

  const totalUnreadMessages = conversations.reduce(
    (sum, item) => sum + (item.unread_count || 0),
    0
  );

  // Real calculations based on actual user data
  const totalRentCollected = bookings.reduce(
    (sum, b) => sum + (b.totalPaid || 0),
    0
  );

  const totalInquiries = bookings.length;

  const confirmedCount = bookings.filter(
    (b) => b.status === 'confirmed'
  ).length;

  const occupancyRate =
    myRooms.length > 0
      ? `${Math.round((confirmedCount / myRooms.length) * 100)}%`
      : '0%';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

      {/* Top Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="font-bold text-sm text-emerald-400">
              Owner Portal · घरधनी ड्यासबोर्ड
            </span>

            <span className="text-slate-500">·</span>

            <span className="inline-flex items-center gap-1 text-xs bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Citizenship Verified</span>
            </span>
          </div>

          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-white">
            {currentUser
              ? `Welcome back, ${currentUser.name}`
              : language === 'np'
              ? 'घरधनी ड्यासबोर्डमा स्वागत छ'
              : 'Welcome to Owner Portal'}
          </h1>

          <p className="mt-1 text-xs sm:text-sm text-slate-300">
            Manage your rental flats, inspect student booking requests, and
            track rent settlements across Nepal.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenAddListing}
          className="inline-flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-md whitespace-nowrap self-start md:self-auto cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{t.addNewListing}</span>
        </button>
      </div>

      {/* Owner Dashboard Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto no-scrollbar">
        <div className="flex gap-2 min-w-max pb-0.5">

          {/* Listings Tab */}
          <button
            type="button"
            onClick={() => setActiveOwnerTab('listings')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition ${
              activeOwnerTab === 'listings'
                ? 'border-emerald-600 text-emerald-800 bg-emerald-50/60 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <Layers className="w-4 h-4" />

            <span>
              {language === 'np'
                ? 'सम्पत्ति र बुकिङहरू'
                : 'Properties & Bookings'}
            </span>

            <span className="text-[10px] bg-slate-200 text-slate-700 font-mono px-1.5 py-0.5 rounded-full font-semibold">
              {myRooms.length}
            </span>
          </button>

          {/* Inquiries & Live Chat Tab */}
          <button
            type="button"
            onClick={() => setActiveOwnerTab('messages')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition ${
              activeOwnerTab === 'messages'
                ? 'border-emerald-600 text-emerald-800 bg-emerald-50/60 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-emerald-600" />

            <span>
              {language === 'np'
                ? 'विद्यार्थी च्याट तथा सोधपुछ'
                : 'Student Inquiries & Chats'}
            </span>

            {conversations.length > 0 ? (
              <span className="text-[10px] bg-emerald-600 text-white font-mono px-1.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                <span>{conversations.length}</span>
              </span>
            ) : (
              <span className="text-[10px] bg-slate-200 text-slate-700 font-mono px-1.5 py-0.5 rounded-full font-semibold">
                0
              </span>
            )}
          </button>

          {/* Analytics Tab */}
          <button
            type="button"
            onClick={() => setActiveOwnerTab('analytics')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition ${
              activeOwnerTab === 'analytics'
                ? 'border-emerald-600 text-emerald-800 bg-emerald-50/60 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <BarChart3 className="w-4 h-4" />

            <span>
              {language === 'np'
                ? 'कोठा विश्लेषक (Analytics)'
                : 'Room Analytics & Performance'}
            </span>

            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-mono px-1.5 py-0.5 rounded-full font-bold">
              Recharts
            </span>
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      {activeOwnerTab === 'messages' ? (
        <div className="space-y-6">
          <div className="bg-emerald-900 text-white rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl border border-emerald-800">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="font-bold text-xs text-emerald-300 uppercase tracking-wider">
                  {language === 'np' ? 'प्रत्यक्ष कुराकानी ड्यासबोर्ड' : 'Live Real-time Inquiries'}
                </span>
                <span className="text-emerald-500">·</span>
                <span className="text-xs text-emerald-200">
                  {language === 'np' ? 'आधिकारिक घरधनी खाता' : 'Official Room Lister Portal'}
                </span>
              </div>
              <h2 className="font-display font-extrabold text-2xl text-white">
                {language === 'np' ? 'विद्यार्थी सोधपुछ तथा लाइभ च्याट' : 'Student Chats & Live Inquiries'}
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-emerald-100 max-w-2xl leading-relaxed">
                {language === 'np'
                  ? 'विद्यार्थीहरूले तपाईंका कोठाबारे सोधेका सबै प्रत्यक्ष प्रश्नहरू यहाँ तत्काल हेर्नुहोस्। कुनै पनि कोठाको च्याट खोलेर आफ्नै आधिकारिक आइडीबाट सिधै जवाफ दिनुहोस्।'
                  : 'Monitor live inquiries from students across all your room listings in real-time. Open any room chat to reply directly as the verified room lister.'}
              </p>
            </div>

            <div className="bg-emerald-950/80 border border-emerald-700/80 rounded-2xl p-4 text-center shrink-0 min-w-[160px]">
              <span className="block text-3xl font-extrabold font-mono text-emerald-400">
                {conversations.length}
              </span>
              <span className="text-xs font-semibold text-emerald-200 mt-0.5 block">
                {language === 'np' ? 'सक्रिय विद्यार्थी च्याट' : 'Active Student Threads'}
              </span>
            </div>
          </div>

          {/* Real Mobile Web Push Notification Section (RULE 2) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                  isPushActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                }`}
              >
                <Smartphone className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-sm text-slate-900">
                    {language === 'np' ? 'मोबाइल पुश नोटिफिकेसन' : 'Mobile Push Notifications'}
                  </h3>
                  {isPushActive ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>{language === 'np' ? 'सक्रिय छ' : 'Active'}</span>
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                      {language === 'np' ? 'निष्क्रिय' : 'Disabled'}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 max-w-xl leading-relaxed">
                  {language === 'np'
                    ? 'विद्यार्थीहरूले कोठाबारे सन्देश पठाउँदा तपाईंको मोबाइलको नोटिफिकेसन बारमा सिधै अलर्ट आउँछ (वेबसाइट बन्द भएको बेलामा पनि)।'
                    : 'Get real-time push alerts on your phone lock screen even when this tab or browser is closed.'}
                </p>
                {pushStatusMessage && (
                  <p className="text-xs font-semibold text-emerald-700 pt-0.5 animate-in fade-in">
                    ✓ {pushStatusMessage}
                  </p>
                )}
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-2">
              {isPushActive ? (
                <button
                  type="button"
                  onClick={handleDisablePush}
                  disabled={isSubscribingPush}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer disabled:opacity-50"
                >
                  {language === 'np' ? 'नोटिफिकेसन बन्द गर्नुहोस्' : 'Disable notifications'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleEnablePush}
                  disabled={isSubscribingPush}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {isSubscribingPush ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Bell className="w-4 h-4" />
                  )}
                  <span>
                    {language === 'np'
                      ? 'मोबाइल नोटिफिकेसन सक्रिय गर्नुहोस्'
                      : 'Enable message notifications'}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Individual Renter Inquiries (RULE 1: one conversation per room_id + renter_id) */}
          {isLoadingConversations ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
              <p className="text-xs text-slate-500">
                {language === 'np'
                  ? 'विद्यार्थी च्याटहरू लोड हुँदै...'
                  : 'Loading student conversation threads...'}
              </p>
            </div>
          ) : conversations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {conversations.map((conv) => {
                const targetRoom = rooms.find((r) => r.id === conv.room_id) || conv.room;
                const renterName =
                  conv.renter_profile?.name ||
                  (language === 'np' ? 'भाडावाल' : 'Renter');
                const lastMsg = conv.last_message;
                const unreadCount = conv.unread_count || 0;

                return (
                  <div
                    key={conv.id}
                    className={`bg-white rounded-2xl border p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between ${
                      unreadCount > 0
                        ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                        : 'border-slate-200/90'
                    }`}
                  >
                    <div>
                      {/* Renter Header */}
                      <div className="flex items-center gap-3 mb-3.5">
                        <img
                          src={
                            conv.renter_profile?.avatar ||
                            `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(renterName)}`
                          }
                          alt={renterName}
                          className="w-12 h-12 rounded-full object-cover border-2 border-emerald-400 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                              {renterName}
                            </h4>
                            {unreadCount > 0 && (
                              <span className="text-[10px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-full shrink-0 animate-pulse">
                                {unreadCount} New
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 truncate">
                            {conv.renter_profile?.phone ||
                              conv.renter_profile?.email ||
                              (language === 'np' ? 'प्रमाणित भाडावाल' : 'Verified Renter')}
                          </p>
                        </div>
                      </div>

                      {/* Room Target Banner */}
                      {targetRoom && (
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 mb-3.5 flex items-center gap-2.5">
                          <img
                            src={
                              targetRoom.images?.[0] ||
                              'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=400&q=80'
                            }
                            alt={targetRoom.title}
                            className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <span className="text-[11px] font-bold text-slate-800 truncate block">
                              {language === 'np' && (targetRoom as any)?.titleNp
                                ? (targetRoom as any).titleNp
                                : targetRoom?.title}
                            </span>
                            <span className="text-[10px] text-emerald-700 font-mono font-semibold">
                              रु. {targetRoom.price?.toLocaleString('en-IN')}/mo
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Last Message Snippet */}
                      {lastMsg ? (
                        <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 mb-4 text-xs space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-slate-400">
                            <span className="font-bold text-slate-700">
                              {lastMsg.sender_id === currentUser?.id
                                ? language === 'np'
                                  ? 'तपाईं (You)'
                                  : 'You'
                                : renterName}
                            </span>
                            <span className="font-mono">
                              {new Date(lastMsg.created_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <p className="text-slate-800 line-clamp-2 text-xs italic">
                            "{lastMsg.content}"
                          </p>
                        </div>
                      ) : (
                        <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 mb-4 text-xs text-slate-400 text-center">
                          {language === 'np'
                            ? 'सोधपुछ सुरु भयो। च्याट खोलेर जवाफ दिनुहोस्।'
                            : 'Thread started. Click below to reply.'}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const roomListing =
                          rooms.find((r) => r.id === conv.room_id) || (targetRoom as RoomListing);
                        if (roomListing) {
                          if (onOpenChatWithConversation) {
                            onOpenChatWithConversation(roomListing, conv);
                          } else if (onOpenChatWithRoom) {
                            onOpenChatWithRoom(roomListing);
                          }
                        }
                      }}
                      className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-98"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>
                        {language === 'np'
                          ? 'निजी च्याट खोल्नुहोस् र जवाफ दिनुहोस्'
                          : 'Open Private Thread & Reply'}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Fallback when no active conversation rows in DB yet */
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-4">
              <MessageSquare className="w-12 h-12 text-slate-300 mx-auto" />
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="font-bold text-sm text-slate-900">
                  {language === 'np'
                    ? 'अहिलेसम्म कुनै विद्यार्थी सोधपुछ छैन'
                    : 'No Student Inquiries Yet'}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {language === 'np'
                    ? 'विद्यार्थीहरूले तपाईंका कोठा हेरेर निजी च्याट सुरु गरेपछि प्रत्येक विद्यार्थीको छुट्टाछुट्टै सन्देश थ्रेड यहाँ देखिनेछ।'
                    : 'When prospective students view your listings and send inquiries, their private individual chat threads will appear here.'}
                </p>
              </div>
            </div>
          )}
        </div>
      ) : activeOwnerTab === 'analytics' ? (
        <OwnerAnalytics
          rooms={rooms}
          bookings={bookings}
          language={language}
          onSelectRoom={onSelectRoom}
        />
      ) : (
        <div className="space-y-8">

          {/* Metrics Row (2 columns on mobile instead of 1 vertical column) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">

            {/* Monthly Earnings */}
            <div className="bg-white p-3.5 sm:p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-1.5 sm:mb-2">
                <span className="text-[11px] sm:text-xs font-semibold line-clamp-1">
                  {t.monthlyEarnings}
                </span>
                <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 shrink-0" />
              </div>

              <div className="text-lg sm:text-2xl font-bold font-mono text-slate-900 tabular-nums">
                रु. {totalRentCollected.toLocaleString('en-IN')}
              </div>

              <span className="text-[10px] sm:text-[11px] text-emerald-700 font-medium mt-1 truncate">
                ↑ +18% vs prev
              </span>
            </div>

            {/* Listings */}
            <div className="bg-white p-3.5 sm:p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-1.5 sm:mb-2">
                <span className="text-[11px] sm:text-xs font-semibold line-clamp-1">
                  {t.myListings}
                </span>
                <Building className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 shrink-0" />
              </div>

              <div className="text-lg sm:text-2xl font-bold font-mono text-slate-900 tabular-nums">
                {myRooms.length} Active
              </div>

              <span className="text-[10px] sm:text-[11px] text-slate-500 mt-1 truncate">
                Across municipalities
              </span>
            </div>

            {/* Occupancy */}
            <div className="bg-white p-3.5 sm:p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-1.5 sm:mb-2">
                <span className="text-[11px] sm:text-xs font-semibold line-clamp-1">
                  {t.occupancyRate}
                </span>
                <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 shrink-0" />
              </div>

              <div className="text-lg sm:text-2xl font-bold font-mono text-slate-900 tabular-nums">
                {occupancyRate}
              </div>

              <span className="text-[10px] sm:text-[11px] text-emerald-700 font-medium mt-1 truncate">
                Near TU peak
              </span>
            </div>

            {/* Inquiries */}
            <div className="bg-white p-3.5 sm:p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-1.5 sm:mb-2">
                <span className="text-[11px] sm:text-xs font-semibold line-clamp-1">
                  {t.totalInquiries}
                </span>
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600 shrink-0" />
              </div>

              <div className="text-lg sm:text-2xl font-bold font-mono text-slate-900 tabular-nums">
                {totalInquiries}
              </div>

              <span className="text-[10px] sm:text-[11px] text-purple-700 font-medium mt-1 truncate">
                Avg: 15 mins
              </span>
            </div>
          </div>

          {/* Booking Requests Queue */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-700" />
                <h2 className="font-bold text-sm text-slate-900">
                  {t.bookingRequests}
                </h2>
              </div>

              <span className="text-xs text-slate-500 font-mono">
                ({bookings.length} Requests)
              </span>
            </div>

            {bookings.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                No pending booking requests right now. New student bookings
                will appear here.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">

                {bookings.map((req) => (
                  <div
                    key={req.id}
                    className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3">

                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700 text-sm shrink-0">
                        {req.tenantName.charAt(0)}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs text-slate-900">
                            {req.tenantName}
                          </span>

                          <span className="text-[11px] text-slate-500 font-mono">
                            ({req.tenantPhone})
                          </span>

                          <span className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-1.5 py-0.5 rounded">
                            Escrow Paid: रु.{' '}
                            {req.totalPaid.toLocaleString('en-IN')}
                          </span>
                        </div>

                        <div className="text-xs text-slate-600 mt-0.5">
                          Target Room:{' '}
                          <span className="font-medium text-slate-800">
                            {req.roomTitle}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Move-in: <strong>{req.moveInDate}</strong> · Duration:{' '}
                          <strong>{req.durationMonths} Months</strong> ·
                          College: {req.tenantUniversity || 'Student'}
                        </div>
                      </div>
                    </div>

                    {/* Booking Actions */}
                    <div className="flex items-center gap-2 self-end sm:self-center">

                      <button
                        type="button"
                        onClick={() => onViewContract(req)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>View Contract</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onAcceptBooking(req.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg transition shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Accept</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onRejectBooking(req.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                        title="Decline"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}

              </div>
            )}
          </div>

          {/* Landlord's Current Listings */}
          <div className="space-y-4">

            <div className="flex items-center justify-between">
              <h2 className="font-bold text-sm text-slate-900">
                {t.myListings}
              </h2>

              <span className="text-xs text-slate-500">
                {myRooms.length} Properties
              </span>
            </div>

            {/* No Listings */}
            {myRooms.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-10 text-center space-y-3">

                <Home className="w-12 h-12 text-slate-300 mx-auto" />

                <h3 className="font-bold text-sm text-slate-800">
                  {language === 'np'
                    ? 'कुनै कोठा थपिएको छैन'
                    : 'No Properties Listed Yet'}
                </h3>

                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {language === 'np'
                    ? 'विद्यार्थीहरूलाई भाडामा दिन आफ्नो पहिलो कोठा वा फ्ल्याट थप्नुहोस्।'
                    : 'Publish your first student rental room or flat to start receiving booking requests and inquiries.'}
                </p>

                <button
                  type="button"
                  onClick={onOpenAddListing}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>{t.addNewListing}</span>
                </button>
              </div>
            ) : (

              /* Listings Grid */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">

                {myRooms.map((room) => (
                  <div
                    key={room.id}
                    className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between"
                  >

                    {/* Room Image */}
                    <div className="relative">
                      <img
                        src={room.images[0]}
                        alt={room.title}
                        className="w-full h-36 object-cover"
                      />

                      {/* Quick Delete Listing Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRoomToDelete(room);
                        }}
                        className="absolute top-2 left-2 p-1.5 rounded-lg bg-slate-900/75 hover:bg-rose-600 text-white backdrop-blur-xs transition shadow-xs cursor-pointer"
                        title={language === 'np' ? 'यो कोठा लिस्टिङ हटाउनुहोस्' : 'Delete / Remove Room Listing'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Status Badge */}
                      <div className="absolute top-2 right-2">

                        {room.status === 'pending' && (
                          <span className="bg-amber-500/90 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                            Pending Verification
                          </span>
                        )}

                        {(room.status === 'active' ||
                          room.status === 'approved') && (
                          <span className="bg-emerald-600/90 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                            Approved / Active
                          </span>
                        )}

                        {room.status === 'rejected' && (
                          <span className="bg-rose-600/90 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                            Rejected
                          </span>
                        )}

                        {room.status === 'suspended' && (
                          <span className="bg-purple-600/90 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                            Suspended
                          </span>
                        )}

                      </div>
                    </div>

                    {/* Room Information */}
                    <div className="p-4 space-y-2">

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-emerald-700 font-semibold">
                          {room.location.municipality}
                        </span>

                        <span className="text-slate-500">
                          Ward {room.location.ward}
                        </span>
                      </div>

                      <h3 className="font-bold text-xs text-slate-900 line-clamp-1">
                        {room.title}
                      </h3>

                      <div className="text-xs text-slate-600 font-mono tabular-nums">
                        Rent: रु.{' '}
                        {room.price.toLocaleString('en-IN')}
                        /mo · Deposit: रु.{' '}
                        {room.deposit.toLocaleString('en-IN')}
                      </div>

                      <div className="text-[11px] text-slate-500">
                        Water: {room.waterSchedule}
                      </div>

                    </div>

                    {/* Public Listing, Chat & Remove Listing Buttons */}
                    <div className="p-4 pt-0 space-y-2">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => onSelectRoom(room)}
                          className="flex-1 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition"
                        >
                          {language === 'np' ? 'कोठा हेर्नुहोस्' : 'View Listing'}
                        </button>
                        {(() => {
                          const roomInquiriesCount = conversations.filter(
                            (c) => c.room_id === room.id
                          ).length;
                          return (
                            <button
                              type="button"
                              onClick={() => onOpenChatWithRoom && onOpenChatWithRoom(room)}
                              className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                                roomInquiriesCount > 0
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                              }`}
                              title="Open student inquiries and reply to chat as Room Lister"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>
                                {language === 'np' ? 'विद्यार्थी च्याट' : 'Student Chat'}
                                {roomInquiriesCount > 0 ? ` (${roomInquiriesCount})` : ''}
                              </span>
                            </button>
                          );
                        })()}
                      </div>

                      <button
                        type="button"
                        onClick={() => setRoomToDelete(room)}
                        className="w-full py-1.5 bg-rose-50/60 hover:bg-rose-100/80 text-rose-700 hover:text-rose-800 border border-rose-200 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
                        title={language === 'np' ? 'यो कोठा लिस्टिङ हटाउनुहोस्' : 'Remove this room listing'}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>{language === 'np' ? 'कोठा हटाउनुहोस् (Delete Listing)' : 'Remove Room Listing'}</span>
                      </button>
                    </div>

                  </div>
                ))}

              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Room Confirmation Modal */}
      {roomToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 bg-rose-50 border-b border-rose-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  {language === 'np' ? 'कोठा लिस्टिङ हटाउने निश्चित हुनुहुन्छ?' : 'Delete Room Listing?'}
                </h3>
                <p className="text-xs text-slate-500">
                  {language === 'np' ? 'यो कार्य फिर्ता गर्न सकिँदैन।' : 'This action cannot be undone.'}
                </p>
              </div>
            </div>

            {/* Room Info Preview */}
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <img
                  src={roomToDelete.images[0]}
                  alt={roomToDelete.title}
                  className="w-14 h-14 rounded-lg object-cover shrink-0 border border-slate-200"
                />
                <div className="min-w-0">
                  <h4 className="font-bold text-xs text-slate-900 truncate">
                    {language === 'np' ? roomToDelete.titleNp : roomToDelete.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 truncate">
                    {roomToDelete.location.municipality}, Ward {roomToDelete.location.ward}
                  </p>
                  <p className="text-[11px] font-mono text-emerald-700 font-semibold">
                    रु. {roomToDelete.price.toLocaleString('en-IN')}/mo
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                {language === 'np'
                  ? 'यो कोठा वेबसाइट तथा विद्यार्थीहरूको खोजी नतिजाबाट तुरुन्तै हट्नेछ। यस कोठाका लागि नयाँ बुकिङ तथा सोधपुछहरू बन्द हुनेछन्।'
                  : 'This room will be immediately removed from the platform and student search results. New booking requests and inquiries will stop.'}
              </p>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setRoomToDelete(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                >
                  {language === 'np' ? 'रद्द गर्नुहोस् (Cancel)' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onDeleteRoom) {
                      onDeleteRoom(roomToDelete.id);
                    }
                    setRoomToDelete(null);
                  }}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{language === 'np' ? 'हो, कोठा हटाउनुहोस्' : 'Yes, Delete Listing'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};