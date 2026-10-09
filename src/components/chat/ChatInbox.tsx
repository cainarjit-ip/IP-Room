import React, { useState, useEffect, useMemo } from 'react';
import { Language, UserProfile, RoomListing } from '../../types';
import {
  DbConversation,
  getUserConversations,
  markConversationAsRead,
} from '../../services/supabase/chatService';
import { ChatWindow } from './ChatWindow';
import {
  MessageSquare,
  Search,
  CheckCircle2,
  Home,
  ShieldCheck,
  Building,
  MapPin,
  Clock,
  Filter,
  Loader2,
  User,
  PlusCircle,
} from 'lucide-react';

interface ChatInboxProps {
  currentUser: UserProfile;
  language: Language;
  initialConversationId?: string;
  onViewRoom?: (room: RoomListing) => void;
  onBrowseRooms?: () => void;
  onUnreadChanged?: () => void;
}

export const ChatInbox: React.FC<ChatInboxProps> = ({
  currentUser,
  language,
  initialConversationId,
  onViewRoom,
  onBrowseRooms,
  onUnreadChanged,
}) => {
  const [conversations, setConversations] = useState<DbConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<DbConversation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const selectedConvRef = React.useRef<DbConversation | null>(null);
  selectedConvRef.current = selectedConversation;

  // Load conversations for the user
  const loadConversations = async () => {
    const { conversations: list } = await getUserConversations(currentUser.id);
    const activeId = selectedConvRef.current?.id || initialConversationId;

    const sanitized = list.map((c) =>
      c.id === activeId
        ? { ...c, unread_count: 0, renter_unread_count: 0, owner_unread_count: 0 }
        : c
    );

    setConversations(sanitized);
    setIsLoading(false);

    // Auto-select initial conversation if specified
    if (initialConversationId) {
      const match = sanitized.find((c) => c.id === initialConversationId);
      if (match) {
        setSelectedConversation(match);
        markConversationAsRead(match.id, currentUser.id);
        if (onUnreadChanged) onUnreadChanged();
      }
    } else if (!selectedConversation && sanitized.length > 0 && window.innerWidth >= 1024) {
      // On desktop, auto-select the first conversation if none selected
      setSelectedConversation(sanitized[0]);
    }
  };

  useEffect(() => {
    loadConversations();
  }, [currentUser.id, initialConversationId]);

  // Handle user selecting/reading a conversation
  const handleSelectConversation = (conv: DbConversation) => {
    const zeroed = {
      ...conv,
      unread_count: 0,
      renter_unread_count: 0,
      owner_unread_count: 0,
    };
    setSelectedConversation(zeroed);
    // 1. Optimistically clear unread badge from state immediately
    setConversations((prev) =>
      prev.map((c) => (c.id === conv.id ? zeroed : c))
    );
    // 2. Mark as read in storage and backend
    markConversationAsRead(conv.id, currentUser.id);
    if (onUnreadChanged) {
      onUnreadChanged();
    }
  };

  // Listen for real-time unread changes and new messages
  useEffect(() => {
    const handleSync = () => {
      getUserConversations(currentUser.id).then(({ conversations: list }) => {
        const activeId = selectedConvRef.current?.id;
        const sanitized = list.map((c) =>
          c.id === activeId
            ? { ...c, unread_count: 0, renter_unread_count: 0, owner_unread_count: 0 }
            : c
        );
        setConversations(sanitized);
      });
    };

    window.addEventListener('iproom_unread_chat_changed', handleSync);
    window.addEventListener('iproom_chat_read', handleSync);
    window.addEventListener('iproom_new_chat_message', handleSync);

    return () => {
      window.removeEventListener('iproom_unread_chat_changed', handleSync);
      window.removeEventListener('iproom_chat_read', handleSync);
      window.removeEventListener('iproom_new_chat_message', handleSync);
    };
  }, [currentUser.id]);

  // Filter conversations
  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      // Tab filter
      if (activeFilter === 'unread' && (!c.unread_count || c.unread_count === 0)) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const roomTitle = (c.room?.title || '').toLowerCase();
        const roomTitleNp = (c.room?.title_np || '').toLowerCase();
        const renterName = (c.renter_profile?.name || '').toLowerCase();
        const ownerName = (c.owner_profile?.name || '').toLowerCase();
        const lastMsg = (c.last_message_preview || '').toLowerCase();

        return (
          roomTitle.includes(q) ||
          roomTitleNp.includes(q) ||
          renterName.includes(q) ||
          ownerName.includes(q) ||
          lastMsg.includes(q)
        );
      }

      return true;
    });
  }, [conversations, activeFilter, searchQuery]);

  // Format timestamp for conversation list
  const formatListTime = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const today = new Date();
      if (date.toDateString() === today.toDateString()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 h-[calc(100vh-140px)] min-h-[550px]">
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md h-full flex overflow-hidden">
        {/* ========================================================================= */}
        {/* LEFT COLUMN: CONVERSATION LIST (Responsive: full width on mobile unless item selected) */}
        {/* ========================================================================= */}
        <div
          className={`w-full lg:w-96 border-r border-slate-200 flex flex-col shrink-0 bg-white ${
            selectedConversation ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {/* Header & Title */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                <MessageSquare className="w-4 h-4" />
              </div>
              <h2 className="font-bold text-base text-slate-900">
                {language === 'np' ? 'च्याट तथा सन्देशहरू' : 'Messages & Inquiries'}
              </h2>
            </div>
            <span className="text-xs text-slate-400 font-mono font-semibold">
              {conversations.length} {language === 'np' ? 'कुराकानी' : 'threads'}
            </span>
          </div>

          {/* Search Bar */}
          <div className="p-3 border-b border-slate-100">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  language === 'np'
                    ? 'कोठा, घरधनी वा सन्देश खोज्नुहोस्...'
                    : 'Search conversations or rooms...'
                }
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 mt-2">
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className={`flex-1 py-1 text-xs rounded-lg font-semibold transition ${
                  activeFilter === 'all'
                    ? 'bg-emerald-50 text-emerald-800 font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {language === 'np' ? 'सबै कुराकानी' : 'All'}
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('unread')}
                className={`flex-1 py-1 text-xs rounded-lg font-semibold transition ${
                  activeFilter === 'unread'
                    ? 'bg-emerald-50 text-emerald-800 font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {language === 'np' ? 'नपढेका (Unread)' : 'Unread'}
              </button>
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {isLoading ? (
              <div className="p-10 flex flex-col items-center justify-center text-slate-400 space-y-2">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                <p className="text-xs">{language === 'np' ? 'कुराकानी खुल्दैछ...' : 'Loading messages...'}</p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-800">
                    {language === 'np' ? 'कुनै सन्देश भेटिएन' : 'No conversations yet'}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed max-w-xs mx-auto">
                    {language === 'np'
                      ? 'कुनै पनि कोठा विवरणमा गई "घरधनीसँग च्याट" बटन क्लिक गरेर कुराकानी सुरु गर्नुहोस्।'
                      : 'Browse any room listing and click "Chat with Owner" to ask questions about rent and facilities.'}
                  </p>
                </div>
                {onBrowseRooms && (
                  <button
                    type="button"
                    onClick={onBrowseRooms}
                    className="mt-2 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs transition"
                  >
                    {language === 'np' ? 'कोठा खोज्नुहोस्' : 'Browse Rooms'}
                  </button>
                )}
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = selectedConversation?.id === conv.id;
                const isCurrentUserOwner = conv.owner_id === currentUser.id;
                const partnerProfile = isCurrentUserOwner
                  ? conv.renter_profile || { id: conv.renter_id, name: 'Renter / Student', role: 'renter', avatar: undefined as string | undefined }
                  : conv.owner_profile || { id: conv.owner_id, name: 'Room Landlord', role: 'owner', avatar: undefined as string | undefined };

                const partnerName = partnerProfile.name || (isCurrentUserOwner ? 'Renter' : 'Landlord');
                const roomTitle =
                  language === 'np'
                    ? conv.room?.title_np || conv.room?.title || 'कोठा विवरण'
                    : conv.room?.title || 'Room Listing';

                const unreadCount = conv.unread_count || 0;

                return (
                  <div
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv)}
                    className={`p-3.5 flex items-start gap-3 cursor-pointer transition ${
                      isSelected
                        ? 'bg-emerald-50/80 border-l-4 border-emerald-600'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    {/* Partner Avatar with Room Thumbnail badge */}
                    <div className="relative shrink-0">
                      <div className="w-11 h-11 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 text-xs overflow-hidden border border-slate-200">
                        {partnerProfile.avatar ? (
                          <img
                            src={partnerProfile.avatar}
                            alt={partnerName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span>{partnerName.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      {/* Room Thumbnail badge */}
                      {conv.room?.images && conv.room.images[0] && (
                        <img
                          src={conv.room.images[0]}
                          alt={roomTitle}
                          className="absolute -bottom-1 -right-1 w-5 h-5 rounded-md object-cover border-2 border-white shadow-xs"
                        />
                      )}
                    </div>

                    {/* Content details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="font-bold text-xs text-slate-900 truncate">
                          {partnerName}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono shrink-0">
                          {formatListTime(conv.last_message?.created_at || conv.last_message_at)}
                        </span>
                      </div>

                      {/* Room tag */}
                      <div className="flex items-center gap-1 text-[11px] text-emerald-800 font-semibold mb-1 truncate">
                        <Home className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span className="truncate">{roomTitle}</span>
                      </div>

                      {/* Last message preview */}
                      <p className="text-xs text-slate-500 truncate leading-snug">
                        {conv.last_message?.content || conv.last_message_preview || 'Start chatting...'}
                      </p>
                    </div>

                    {/* Unread badge */}
                    {!isSelected && unreadCount > 0 && (
                      <span className="shrink-0 bg-emerald-600 text-white font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-xs">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: ACTIVE CHAT WINDOW (Desktop: always visible; Mobile: visible when selected) */}
        {/* ========================================================================= */}
        <div
          className={`flex-1 h-full flex flex-col ${
            selectedConversation ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {selectedConversation ? (
            <ChatWindow
              conversation={selectedConversation}
              currentUser={currentUser}
              language={language}
              onBackMobile={() => setSelectedConversation(null)}
              onViewRoom={onViewRoom}
              onConversationUpdated={loadConversations}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-3 bg-slate-50/50">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-xs">
                <MessageSquare className="w-8 h-8" />
              </div>
              <div className="max-w-sm">
                <h3 className="font-bold text-sm text-slate-800">
                  {language === 'np' ? 'कुनै कुराकानी छान्नुहोस्' : 'Select a Conversation'}
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {language === 'np'
                    ? 'बायाँपट्टिको सूचीबाट कुनै कुराकानी छानेर घरधनी वा विद्यार्थीसँग सिधै कुराकानी गर्नुहोस्।'
                    : 'Choose a conversation from the left to view messages and discuss rental availability, facilities, and visiting times.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
