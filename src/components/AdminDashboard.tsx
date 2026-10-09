import React, { useState, useMemo, useEffect } from 'react';
import { RoomListing, DisputeTicket, Language, UserProfile, ModerationLogEntry, ListingStatus, ChatReport } from '../types';
import { getTranslation } from '../data/translations';
import { ListingInspectionModal } from './ListingInspectionModal';
import { RejectionReasonModal } from './RejectionReasonModal';
import { isValidUUID, supabase } from '../lib/supabase';
import {
  getAdminChatReports,
  updateChatReportStatus,
  deleteMessageSoft,
  blockUserInChat,
} from '../services/supabase/chatService';
import {
  ShieldAlert,
  CheckCircle,
  XCircle,
  AlertTriangle,
  BarChart3,
  TrendingUp,
  MapPin,
  FileCheck,
  Check,
  Search,
  Filter,
  Eye,
  RotateCcw,
  Ban,
  Trash2,
  Clock,
  User,
  History,
  CheckCheck,
  MessageSquare,
  MessageCircle,
  ExternalLink,
  Send,
  Phone,
  Radio,
  Sparkles,
  Database,
  Copy,
} from 'lucide-react';

interface AdminDashboardProps {
  rooms: RoomListing[];
  disputes: DisputeTicket[];
  language: Language;
  currentUser?: UserProfile | null;
  moderationLogs?: ModerationLogEntry[];
  onApproveRoom: (roomId: string) => void;
  onRejectRoom: (roomId: string, reason: string) => void;
  onSuspendRoom?: (roomId: string) => void;
  onUnpublishRoom?: (roomId: string) => void;
  onRestoreRoom?: (roomId: string) => void;
  onDeleteRoom?: (roomId: string) => void;
  onResolveDispute: (disputeId: string, notes: string) => void;
  onSelectRoom: (room: RoomListing) => void;
}

const FIX_SQL_SCRIPT = `-- 1. CREATE room_views TABLE (Fixes 404 error)
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

-- 2. UPDATE conversations TABLE (Fixes last_message_at 400 error)
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

-- 3. UPDATE messages TABLE (Fixes &is_read=eq.false 400 error)
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

-- 4. UPDATE notifications TABLE (Fixes PATCH notifications 400 error)
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS read BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS reference_id TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS link TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb;

-- 5. REFRESH SCHEMA CACHE
NOTIFY pgrst, 'reload schema';`;

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  rooms,
  disputes,
  language,
  currentUser,
  moderationLogs = [],
  onApproveRoom,
  onRejectRoom,
  onSuspendRoom,
  onUnpublishRoom,
  onRestoreRoom,
  onDeleteRoom,
  onResolveDispute,
  onSelectRoom,
}) => {
  const t = getTranslation(language);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected' | 'all' | 'disputes' | 'history' | 'chat-reports' | 'database-fix'>('pending');
  const [copiedSql, setCopiedSql] = useState(false);

  // Chat Moderation & Reports State (Requirement 18)
  const [chatReports, setChatReports] = useState<ChatReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportFilterStatus, setReportFilterStatus] = useState<'all' | 'pending' | 'resolved' | 'dismissed'>('all');
  const [reportFilterReason, setReportFilterReason] = useState<string>('all');
  const [reportSearchQuery, setReportSearchQuery] = useState('');

  const loadChatReports = async () => {
    setReportsLoading(true);
    const { reports } = await getAdminChatReports();
    setChatReports(reports);
    setReportsLoading(false);
  };

  useEffect(() => {
    loadChatReports();
  }, []);

  const handleResolveReport = async (reportId: string) => {
    await updateChatReportStatus(reportId, 'resolved', currentUser?.id || 'admin');
    setChatReports(prev => prev.map(r => r.id === reportId ? { ...r, status: 'resolved', resolved_at: new Date().toISOString() } : r));
    showNotification('Chat report marked as resolved.');
  };

  const handleDismissReport = async (reportId: string) => {
    await updateChatReportStatus(reportId, 'dismissed', currentUser?.id || 'admin');
    setChatReports(prev => prev.map(r => r.id === reportId ? { ...r, status: 'dismissed', resolved_at: new Date().toISOString() } : r));
    showNotification('Chat report dismissed.');
  };

  const handleDeleteReportedMessage = async (messageId: string) => {
    await deleteMessageSoft(messageId, currentUser?.id);
    showNotification('Inappropriate message soft-deleted and removed from conversation.');
  };

  const handleSuspendUser = async (targetUserId: string, targetUserName: string, conversationId?: string) => {
    await blockUserInChat(currentUser?.id || 'admin', targetUserId, conversationId);
    showNotification(`User ${targetUserName} suspended & restricted from chat.`);
  };

  const filteredChatReports = useMemo(() => {
    return chatReports.filter(rep => {
      if (reportFilterStatus !== 'all' && rep.status !== reportFilterStatus) return false;
      if (reportFilterReason !== 'all' && rep.reason !== reportFilterReason) return false;
      if (reportSearchQuery.trim()) {
        const q = reportSearchQuery.toLowerCase();
        const rName = (rep.reporter_name || '').toLowerCase();
        const uName = (rep.reported_user_name || '').toLowerCase();
        const rTitle = (rep.room_title || '').toLowerCase();
        const desc = (rep.description || '').toLowerCase();
        if (!rName.includes(q) && !uName.includes(q) && !rTitle.includes(q) && !desc.includes(q)) return false;
      }
      return true;
    });
  }, [chatReports, reportFilterStatus, reportFilterReason, reportSearchQuery]);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProvince, setFilterProvince] = useState('');
  const [filterRoomType, setFilterRoomType] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Modal inspection & rejection states
  const [inspectingRoom, setInspectingRoom] = useState<RoomListing | null>(null);
  const [rejectingRoom, setRejectingRoom] = useState<RoomListing | null>(null);
  const [confirmDeleteRoom, setConfirmDeleteRoom] = useState<RoomListing | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  // Dispute resolution state
  const [resolutionText, setResolutionText] = useState('');
  const [activeDisputeId, setActiveDisputeId] = useState<string | null>(null);

  // Real-time Moderation Statistics
  const pendingCount = rooms.filter(r => r.status === 'pending').length;
  const approvedCount = rooms.filter(r => r.status === 'active' || r.status === 'approved').length;
  const rejectedCount = rooms.filter(r => r.status === 'rejected').length;
  const suspendedCount = rooms.filter(r => r.status === 'suspended').length;
  const totalCount = rooms.length;

  // Filtered rooms logic
  const filteredListings = useMemo(() => {
    return rooms.filter(room => {
      // Tab based status filtering
      if (activeTab === 'pending' && room.status !== 'pending') return false;
      if (activeTab === 'approved' && room.status !== 'active' && room.status !== 'approved') return false;
      if (activeTab === 'rejected' && room.status !== 'rejected') return false;

      // Status selector (if in 'all' tab)
      if (activeTab === 'all' && filterStatus !== 'all' && room.status !== filterStatus) return false;

      // Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = room.title.toLowerCase().includes(query);
        const matchesOwner = room.owner.name.toLowerCase().includes(query);
        const matchesId = room.id.toLowerCase().includes(query);
        const matchesLocation = room.location.fullAddress.toLowerCase().includes(query) || room.location.district.toLowerCase().includes(query);
        if (!matchesTitle && !matchesOwner && !matchesId && !matchesLocation) return false;
      }

      // Province filter
      if (filterProvince && room.location.province !== filterProvince) return false;

      // Room Type filter
      if (filterRoomType && room.roomType !== filterRoomType) return false;

      return true;
    });
  }, [rooms, activeTab, filterStatus, searchQuery, filterProvince, filterRoomType]);

  const handleApproveWithFeedback = (room: RoomListing) => {
    onApproveRoom(room.id);
    showNotification(`Listing "${room.title}" has been approved and published to public search!`);
  };

  const handleConfirmReject = (room: RoomListing, reason: string) => {
    onRejectRoom(room.id, reason);
    setRejectingRoom(null);
    showNotification(`Listing "${room.title}" has been rejected.`);
  };

  const handleConfirmDelete = () => {
    if (confirmDeleteRoom && onDeleteRoom) {
      onDeleteRoom(confirmDeleteRoom.id);
      showNotification(`Listing "${confirmDeleteRoom.title}" permanently deleted.`);
      setConfirmDeleteRoom(null);
    }
  };

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-xl space-y-5">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">
            {language === 'np' ? 'प्रशासक पहुँच आवश्यक छ' : 'Administrator Access Required'}
          </h2>
          <p className="text-slate-600 text-sm leading-relaxed">
            {language === 'np'
              ? 'यो पृष्ठ केवल अधिकृत प्रशासकहरूका लागि मात्र उपलब्ध छ। कोठा अनुमोदन, विवाद समाधान, र प्लेटफर्म अडिट गर्न कृपया प्रशासक खाताबाट लगइन गर्नुहोस्।'
              : 'This portal is restricted to authorized platform administrators. Please sign in with administrator credentials to moderate listings and manage disputes.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="font-bold text-xs bg-emerald-900/80 text-emerald-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-emerald-700">
              Admin Moderation Center · IP Room नेपाल
            </span>
          </div>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-white">
            Room Listing Moderation & Control System
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-300">
            Real-time control over pending submissions, quality inspections, approvals, rejections, and audit history.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 text-center">
            <span className="text-[10px] text-slate-400 block uppercase font-medium">Logged in Moderator</span>
            <span className="font-bold text-xs text-emerald-400">{currentUser?.name || 'Authorized Admin'}</span>
          </div>
        </div>
      </div>

      {/* Floating alert notification */}
      {notification && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-semibold flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{notification}</span>
          </div>
        </div>
      )}

      {/* Moderation Navigation Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto no-scrollbar">
        <div className="flex gap-2 min-w-max pb-0.5">
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition cursor-pointer ${
              activeTab === 'pending'
                ? 'border-emerald-600 text-emerald-800 bg-emerald-50/60 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <span>Pending Listings</span>
            {pendingCount > 0 && (
              <span className="text-[10px] bg-amber-500 text-white font-mono px-1.5 py-0.5 rounded-full font-bold">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('approved')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition cursor-pointer ${
              activeTab === 'approved'
                ? 'border-emerald-600 text-emerald-800 bg-emerald-50/60 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <span>Approved Listings</span>
            <span className="text-[10px] bg-slate-200 text-slate-700 font-mono px-1.5 py-0.5 rounded-full font-semibold">
              {approvedCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition cursor-pointer ${
              activeTab === 'all'
                ? 'border-emerald-600 text-emerald-800 bg-emerald-50/60 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <span>All Listings</span>
            <span className="text-[10px] bg-slate-200 text-slate-700 font-mono px-1.5 py-0.5 rounded-full font-semibold">
              {totalCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('disputes')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition cursor-pointer ${
              activeTab === 'disputes'
                ? 'border-emerald-600 text-emerald-800 bg-emerald-50/60 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-indigo-600" />
            <span>Escrow Disputes</span>
            {disputes.length > 0 && (
              <span className="text-[10px] bg-indigo-100 text-indigo-800 font-mono px-1.5 py-0.5 rounded-full font-bold">
                {disputes.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition cursor-pointer ${
              activeTab === 'history'
                ? 'border-emerald-600 text-emerald-800 bg-emerald-50/60 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Audit History</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('chat-reports')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition cursor-pointer ${
              activeTab === 'chat-reports'
                ? 'border-rose-600 text-rose-800 bg-rose-50/60 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-rose-600" />
            <span>Chat Moderation & Reports</span>
            {chatReports.filter(r => r.status === 'pending').length > 0 && (
              <span className="text-[10px] bg-rose-600 text-white font-mono px-1.5 py-0.5 rounded-full font-bold animate-pulse">
                {chatReports.filter(r => r.status === 'pending').length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('database-fix')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition cursor-pointer ${
              activeTab === 'database-fix'
                ? 'border-indigo-600 text-indigo-800 bg-indigo-50/60 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <Database className="w-4 h-4 text-indigo-600" />
            <span>Database & SQL Fix</span>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-mono px-1.5 py-0.5 rounded-full font-bold">
              Fix Schema
            </span>
          </button>
        </div>
      </div>

      {/* Main Moderation Listing Section (For pending, approved, rejected, all tabs) */}
      {activeTab !== 'disputes' && activeTab !== 'history' && activeTab !== 'chat-reports' && activeTab !== 'database-fix' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6">
          {/* Search & Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by title, owner, ID, address..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
            </div>

            <select
              value={filterProvince}
              onChange={e => setFilterProvince(e.target.value)}
              className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700"
            >
              <option value="">All Provinces (नेपालका प्रदेशहरू)</option>
              <option value="Koshi Province">Koshi Province</option>
              <option value="Madhesh Province">Madhesh Province</option>
              <option value="Bagmati Province">Bagmati Province</option>
              <option value="Gandaki Province">Gandaki Province</option>
              <option value="Lumbini Province">Lumbini Province</option>
              <option value="Karnali Province">Karnali Province</option>
              <option value="Sudurpashchim Province">Sudurpashchim Province</option>
            </select>

            <select
              value={filterRoomType}
              onChange={e => setFilterRoomType(e.target.value)}
              className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700"
            >
              <option value="">All Room Types</option>
              <option value="single">Single Room</option>
              <option value="shared">Shared Room</option>
              <option value="1bhk">1 BHK</option>
              <option value="2bhk">2 BHK</option>
              <option value="studio">Studio Flat</option>
              <option value="full_flat">Full House</option>
            </select>

            {activeTab === 'all' && (
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700"
              >
                <option value="all">All Moderation Statuses</option>
                <option value="pending">Pending</option>
                <option value="active">Active / Approved</option>
                <option value="rejected">Rejected</option>
                <option value="suspended">Suspended</option>
                <option value="unpublished">Unpublished</option>
              </select>
            )}
          </div>

          {/* Listings Table / Cards */}
          {filteredListings.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
              No listings found matching the selected filters and status criteria.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredListings.map(room => (
                <div
                  key={room.id}
                  className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs bg-slate-50/50"
                >
                  {/* Left Column: Photo + Room & Owner Details */}
                  <div className="flex items-start gap-4 flex-1">
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-slate-200 shrink-0 border border-slate-300">
                      {room.images && room.images.length > 0 ? (
                        <img
                          src={room.images[0]}
                          alt={room.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          No Photo
                        </div>
                      )}
                      <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] px-1 rounded">
                        {room.images?.length || 0} pics
                      </span>
                    </div>

                    <div className="space-y-1 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[11px] font-bold text-slate-700">
                          {room.id}
                        </span>
                        <span className="text-slate-300">·</span>
                        <h3 className="font-bold text-slate-900 text-sm">{room.title}</h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-800">
                          {room.roomType}
                        </span>
                        {/* Status Badge */}
                        {room.status === 'pending' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            Pending Verification
                          </span>
                        )}
                        {(room.status === 'active' || room.status === 'approved') && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Approved
                          </span>
                        )}
                        {room.status === 'rejected' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                            Rejected
                          </span>
                        )}
                        {room.status === 'suspended' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300">
                            Suspended
                          </span>
                        )}
                      </div>

                      {/* Location & Financials */}
                      <div className="text-slate-600 flex flex-wrap items-center gap-3">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          <span>{room.location.municipality}, {room.location.district}</span>
                        </span>
                        <span>·</span>
                        <span><strong>Rent:</strong> रु. {room.price.toLocaleString('en-IN')}/mo</span>
                        <span>·</span>
                        <span><strong>Deposit:</strong> रु. {room.deposit.toLocaleString('en-IN')}</span>
                      </div>

                      {/* Owner & Submission info */}
                      <div className="text-slate-500 flex flex-wrap items-center gap-3 text-[11px]">
                        <span>Landlord: <strong>{room.owner.name}</strong> ({room.owner.phone})</span>
                        <span>·</span>
                        <span>Submitted: {room.createdAt}</span>
                        {room.rejectionReason && (
                          <>
                            <span>·</span>
                            <span className="text-rose-700 font-semibold">
                              Reason: {room.rejectionReason}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2 self-start md:self-center shrink-0">
                    {/* Inspect Button - Always available */}
                    <button
                      type="button"
                      onClick={() => setInspectingRoom(room)}
                      className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-semibold flex items-center gap-1 transition cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Inspect</span>
                    </button>

                    {/* Approve Button (for pending, rejected, or suspended) */}
                    {(room.status === 'pending' || room.status === 'rejected' || room.status === 'suspended' || room.status === 'unpublished') && (
                      <button
                        type="button"
                        onClick={() => handleApproveWithFeedback(room)}
                        className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold flex items-center gap-1 transition shadow-xs cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>
                    )}

                    {/* Reject Button (for pending or active) */}
                    {(room.status === 'pending' || room.status === 'active' || room.status === 'approved') && (
                      <button
                        type="button"
                        onClick={() => setRejectingRoom(room)}
                        className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold flex items-center gap-1 transition shadow-xs cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    )}

                    {/* Suspend Action (for approved/active) */}
                    {(room.status === 'active' || room.status === 'approved') && onSuspendRoom && (
                      <button
                        type="button"
                        onClick={() => {
                          onSuspendRoom(room.id);
                          showNotification(`Listing "${room.title}" has been suspended.`);
                        }}
                        className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg font-semibold flex items-center gap-1 transition"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>Suspend</span>
                      </button>
                    )}

                    {/* Restore Action (for rejected or suspended) */}
                    {(room.status === 'rejected' || room.status === 'suspended' || room.status === 'unpublished') && onRestoreRoom && (
                      <button
                        type="button"
                        onClick={() => {
                          onRestoreRoom(room.id);
                          showNotification(`Listing "${room.title}" restored to Pending verification.`);
                        }}
                        className="px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-900 rounded-lg font-semibold flex items-center gap-1 transition"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Restore</span>
                      </button>
                    )}

                    {/* Delete Permanently (with confirmation) */}
                    {onDeleteRoom && (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteRoom(room)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Delete permanently"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Moderation History / Audit Log Tab */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-purple-700" />
              <h2 className="font-bold text-sm text-slate-900">Moderation Audit Log & Activity Trail</h2>
            </div>
            <span className="text-xs text-slate-500">Persistent Firestore record</span>
          </div>

          {moderationLogs.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-400">
              No moderation events recorded yet. Approvals, rejections, and suspensions will appear here.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {moderationLogs.map(log => (
                <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <strong className="text-slate-900">{log.moderatorName}</strong>
                      <span className="text-slate-400">→</span>
                      <span
                        className={`font-bold uppercase px-2 py-0.5 rounded text-[10px] ${
                          log.action === 'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : log.action === 'rejected'
                            ? 'bg-rose-100 text-rose-800'
                            : log.action === 'suspended'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {log.action}
                      </span>
                      <span className="text-slate-400">→</span>
                      <span className="font-semibold text-slate-900">{log.listingTitle}</span>
                      <span className="font-mono text-slate-500 text-[11px]">({log.listingId})</span>
                    </div>

                    {log.reason && (
                      <div className="text-slate-600 text-[11px] pl-2 border-l-2 border-slate-300">
                        Reason: {log.reason}
                      </div>
                    )}
                  </div>

                  <div className="text-slate-400 text-[11px] font-mono whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Dispute Resolution Center */}
      {activeTab === 'disputes' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-indigo-700" />
              <h2 className="font-bold text-sm text-slate-900">{t.activeDisputes}</h2>
            </div>
            <span className="text-xs text-slate-500">Escrow Tenancy Protection</span>
          </div>

          {disputes.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-400">
              No dispute tickets filed. All student tenancy leases and escrow deposits are in good standing.
            </div>
          ) : (
            <div className="space-y-4">
              {disputes.map(ticket => (
                <div
                  key={ticket.id}
                  className={`p-4 rounded-xl border text-xs space-y-2 transition ${
                    ticket.status === 'resolved'
                      ? 'bg-emerald-50/40 border-emerald-200'
                      : 'bg-amber-50/40 border-amber-200'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-800">{ticket.id}</span>
                      <span className="text-slate-400">·</span>
                      <span className="font-semibold text-slate-900">{ticket.subject}</span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                        ticket.status === 'resolved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {ticket.status}
                    </span>
                  </div>

                  <div className="text-slate-600">
                    <strong>Complainant:</strong> {ticket.complainantName} ({ticket.complainantRole}) · <strong>Property:</strong> {ticket.roomTitle}
                  </div>

                  <p className="text-slate-700 bg-white/80 p-2.5 rounded-lg border border-slate-200/60 leading-relaxed">
                    "{ticket.description}"
                  </p>

                  {ticket.resolutionNotes && (
                    <div className="text-[11px] text-emerald-800 font-medium">
                      <strong>Resolution:</strong> {ticket.resolutionNotes}
                    </div>
                  )}

                  {ticket.status !== 'resolved' && (
                    <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
                      <input
                        type="text"
                        placeholder="Enter resolution verdict (e.g., Refund approved via Khalti or Landlord agreement)..."
                        value={activeDisputeId === ticket.id ? resolutionText : ''}
                        onChange={e => {
                          setActiveDisputeId(ticket.id);
                          setResolutionText(e.target.value);
                        }}
                        className="flex-1 bg-white border border-slate-200 rounded-lg p-2 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          onResolveDispute(ticket.id, resolutionText || 'Resolved mutually with deposit settlement.');
                          setResolutionText('');
                          setActiveDisputeId(null);
                        }}
                        className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-semibold text-xs whitespace-nowrap"
                      >
                        Resolve & Settle
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          CHAT MODERATION & REPORTS SECTION (Requirement 18)
      ========================================================================= */}
      {activeTab === 'chat-reports' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6">
          {/* Header & Overview Stats */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                <h2 className="font-bold text-base text-slate-900">
                  {language === 'np' ? 'च्याट रिपोर्ट तथा प्रयोगकर्ता समीक्षा' : 'Chat Moderation & Safety Reports'}
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Review flagged messages, investigate scam/harassment claims, suspend violators, and take moderation action.
              </p>
            </div>

            <button
              type="button"
              onClick={loadChatReports}
              disabled={reportsLoading}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${reportsLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Reports</span>
            </button>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
              <span className="text-[11px] text-slate-500 block font-medium">Total Reports</span>
              <span className="text-lg font-bold text-slate-900 font-mono">{chatReports.length}</span>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/80">
              <span className="text-[11px] text-amber-700 block font-medium">Pending Review</span>
              <span className="text-lg font-bold text-amber-900 font-mono">
                {chatReports.filter(r => r.status === 'pending').length}
              </span>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200/80">
              <span className="text-[11px] text-emerald-700 block font-medium">Resolved</span>
              <span className="text-lg font-bold text-emerald-900 font-mono">
                {chatReports.filter(r => r.status === 'resolved').length}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
              <span className="text-[11px] text-slate-500 block font-medium">Dismissed</span>
              <span className="text-lg font-bold text-slate-600 font-mono">
                {chatReports.filter(r => r.status === 'dismissed').length}
              </span>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={reportSearchQuery}
                onChange={e => setReportSearchQuery(e.target.value)}
                placeholder="Search by user, room, or report reason..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
            </div>

            <select
              value={reportFilterStatus}
              onChange={e => setReportFilterStatus(e.target.value as any)}
              className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700"
            >
              <option value="all">All Moderation Statuses</option>
              <option value="pending">Pending Attention</option>
              <option value="resolved">Resolved</option>
              <option value="dismissed">Dismissed</option>
            </select>

            <select
              value={reportFilterReason}
              onChange={e => setReportFilterReason(e.target.value)}
              className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700"
            >
              <option value="all">All Report Reasons</option>
              <option value="Spam">Spam</option>
              <option value="Fraud">Fraud / Scam</option>
              <option value="Harassment">Harassment</option>
              <option value="Fake listing">Fake Listing</option>
              <option value="Inappropriate content">Inappropriate Content</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Reports List */}
          {reportsLoading ? (
            <div className="text-center py-12 text-xs text-slate-400">
              Loading chat reports...
            </div>
          ) : filteredChatReports.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
              No chat reports found matching the selected filters.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredChatReports.map(rep => {
                const isPending = rep.status === 'pending';
                const reasonColors: Record<string, string> = {
                  Spam: 'bg-orange-100 text-orange-800 border-orange-200',
                  Fraud: 'bg-rose-100 text-rose-800 border-rose-200',
                  Harassment: 'bg-red-100 text-red-800 border-red-200',
                  'Fake listing': 'bg-amber-100 text-amber-800 border-amber-200',
                  'Inappropriate content': 'bg-purple-100 text-purple-800 border-purple-200',
                  Other: 'bg-slate-100 text-slate-800 border-slate-200',
                };
                const badgeClass = reasonColors[rep.reason] || reasonColors.Other;

                return (
                  <div
                    key={rep.id}
                    className={`p-4 rounded-xl border text-xs space-y-3 transition ${
                      rep.status === 'resolved'
                        ? 'bg-emerald-50/30 border-emerald-200'
                        : rep.status === 'dismissed'
                        ? 'bg-slate-50 border-slate-200 opacity-75'
                        : 'bg-rose-50/30 border-rose-200'
                    }`}
                  >
                    {/* Top Row: IDs, Reason & Status */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-bold text-slate-700">{rep.id}</span>
                        <span className="text-slate-300">·</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeClass}`}>
                          {rep.reason}
                        </span>
                        {rep.room_title && (
                          <span className="text-slate-500 font-medium">
                            Regarding: <strong className="text-slate-800">{rep.room_title}</strong>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(rep.created_at).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            rep.status === 'resolved'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : rep.status === 'dismissed'
                              ? 'bg-slate-200 text-slate-700'
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}
                        >
                          {rep.status}
                        </span>
                      </div>
                    </div>

                    {/* Parties involved */}
                    <div className="p-2.5 bg-white/90 rounded-lg border border-slate-200/80 flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-600">
                      <div>
                        <strong className="text-slate-800">Reporter:</strong> {rep.reporter_name || 'Concerned User'}
                      </div>
                      <span className="text-slate-300">→</span>
                      <div>
                        <strong className="text-slate-800">Reported User:</strong>{' '}
                        <span className="text-rose-700 font-bold">{rep.reported_user_name || 'Flagged User'}</span>
                      </div>
                      {rep.message_id && (
                        <>
                          <span className="text-slate-300">·</span>
                          <span className="font-mono text-[10px] text-slate-500">
                            Flagged Message ID: {rep.message_id}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Description */}
                    <div className="text-slate-800 bg-white/90 p-3 rounded-lg border border-slate-200/80 leading-relaxed font-sans">
                      <p className="italic text-slate-700">"{rep.description}"</p>
                    </div>

                    {/* Actions Toolbar */}
                    <div className="pt-1 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/60">
                      <div className="flex items-center gap-2">
                        {/* Suspend user button */}
                        <button
                          type="button"
                          onClick={() =>
                            handleSuspendUser(
                              rep.reported_user_id,
                              rep.reported_user_name || 'Reported User',
                              rep.conversation_id
                            )
                          }
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                          title="Block this abusive user from messaging"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          <span>Suspend / Block Abuser</span>
                        </button>

                        {/* Delete message button if message_id exists */}
                        {rep.message_id && (
                          <button
                            type="button"
                            onClick={() => handleDeleteReportedMessage(rep.message_id!)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                            title="Soft delete the inappropriate message"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                            <span>Delete Flagged Message</span>
                          </button>
                        )}
                      </div>

                      {/* Status resolution actions */}
                      <div className="flex items-center gap-2">
                        {isPending && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleDismissReport(rep.id)}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5 text-slate-500" />
                              <span>Dismiss</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleResolveReport(rep.id)}
                              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-xs cursor-pointer active:scale-95"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Mark as Resolved</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Database Schema Fix Section */}
      {activeTab === 'database-fix' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-base text-slate-900">
                  Supabase Database Schema & Column Fix Guide
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Run this SQL script in your Supabase SQL Editor to resolve all 400 & 404 missing column/table console warnings permanently.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <a
                href="https://supabase.com/dashboard/project/stygqxxldbegjilpzlco/sql"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Supabase SQL Editor</span>
              </a>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(FIX_SQL_SCRIPT);
                  setCopiedSql(true);
                  setTimeout(() => setCopiedSql(false), 3000);
                  showNotification('SQL Script copied to clipboard! Paste it into Supabase SQL Editor.');
                }}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
              >
                {copiedSql ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSql ? 'Copied to Clipboard!' : 'Copy SQL Script'}</span>
              </button>
            </div>
          </div>

          {/* Explanation cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50">
              <span className="font-bold text-xs text-emerald-900 block mb-1">1. Frontend Self-Healing</span>
              <p className="text-[11px] text-emerald-700 leading-relaxed">
                Frontend self-healing is <strong>ACTIVE</strong>. Fallback local caching prevents any page crashes or UI lockouts.
              </p>
            </div>
            <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/50">
              <span className="font-bold text-xs text-indigo-900 block mb-1">2. room_views (404)</span>
              <p className="text-[11px] text-indigo-700 leading-relaxed">
                Creates the missing <code>room_views</code> analytics table with public insert and select policies.
              </p>
            </div>
            <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/50">
              <span className="font-bold text-xs text-indigo-900 block mb-1">3. conversations (400)</span>
              <p className="text-[11px] text-indigo-700 leading-relaxed">
                Adds <code>last_message_at</code>, <code>renter_unread_count</code>, <code>owner_unread_count</code>, and participant IDs.
              </p>
            </div>
            <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/50">
              <span className="font-bold text-xs text-indigo-900 block mb-1">4. messages (400)</span>
              <p className="text-[11px] text-indigo-700 leading-relaxed">
                Adds <code>read_at</code>, <code>receiver_id</code>, and text column aliases for complete chat synchronization.
              </p>
            </div>
          </div>

          {/* Code block */}
          <div className="relative">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-900 text-slate-300 text-xs font-mono rounded-t-xl border-b border-slate-800">
              <span>FIX_DATABASE_ERRORS.sql</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(FIX_SQL_SCRIPT);
                  setCopiedSql(true);
                  setTimeout(() => setCopiedSql(false), 3000);
                  showNotification('SQL Script copied to clipboard!');
                }}
                className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer"
              >
                {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSql ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre className="p-4 bg-slate-950 text-slate-100 font-mono text-xs rounded-b-xl overflow-x-auto max-h-96 leading-relaxed border border-slate-800">
              {FIX_SQL_SCRIPT}
            </pre>
          </div>
        </div>
      )}

      {/* Inspect Modal */}
      {inspectingRoom && (
        <ListingInspectionModal
          room={inspectingRoom}
          language={language}
          onClose={() => setInspectingRoom(null)}
          onApprove={room => handleApproveWithFeedback(room)}
          onOpenReject={room => setRejectingRoom(room)}
          onSuspend={room => onSuspendRoom && onSuspendRoom(room.id)}
          onRestore={room => onRestoreRoom && onRestoreRoom(room.id)}
          onDelete={room => setConfirmDeleteRoom(room)}
        />
      )}

      {/* Rejection Modal */}
      {rejectingRoom && (
        <RejectionReasonModal
          room={rejectingRoom}
          onClose={() => setRejectingRoom(null)}
          onConfirmReject={handleConfirmReject}
        />
      )}

      {/* Permanent Delete Confirmation Dialog */}
      {confirmDeleteRoom && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2 bg-rose-100 rounded-full">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-slate-900">Permanently Delete Listing?</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete <strong>"{confirmDeleteRoom.title}"</strong> ({confirmDeleteRoom.id})? This action will remove the listing from both the database and public view. This cannot be undone.
            </p>
            <div className="pt-2 flex items-center justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setConfirmDeleteRoom(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg shadow-xs"
              >
                Yes, Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
