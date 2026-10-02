import React, { useState, useMemo } from 'react';
import { RoomListing, DisputeTicket, Language, UserProfile, ModerationLogEntry, ListingStatus } from '../types';
import { getTranslation } from '../data/translations';
import { ListingInspectionModal } from './ListingInspectionModal';
import { RejectionReasonModal } from './RejectionReasonModal';
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
  CheckCheck
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
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected' | 'all' | 'disputes' | 'history'>('pending');

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

  // Dispute resolution state
  const [resolutionText, setResolutionText] = useState('');
  const [activeDisputeId, setActiveDisputeId] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

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
          <button type="button" onClick={() => setNotification(null)} className="text-emerald-700 hover:text-emerald-950">
            ✕
          </button>
        </div>
      )}

      {/* Real-time Dashboard Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <button
          type="button"
          onClick={() => setActiveTab('pending')}
          className={`p-4 rounded-xl border text-left transition ${
            activeTab === 'pending'
              ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Pending</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
            {pendingCount}
          </div>
          <span className="text-[11px] text-amber-700 font-medium">Needs Verification</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('approved')}
          className={`p-4 rounded-xl border text-left transition ${
            activeTab === 'approved'
              ? 'bg-emerald-500/10 border-emerald-600 ring-2 ring-emerald-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Approved</span>
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
            {approvedCount}
          </div>
          <span className="text-[11px] text-emerald-700 font-medium">Publicly Live</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('rejected')}
          className={`p-4 rounded-xl border text-left transition ${
            activeTab === 'rejected'
              ? 'bg-rose-500/10 border-rose-500 ring-2 ring-rose-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Rejected</span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
            {rejectedCount}
          </div>
          <span className="text-[11px] text-rose-700 font-medium">Non-compliant</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`p-4 rounded-xl border text-left transition ${
            activeTab === 'all'
              ? 'bg-purple-500/10 border-purple-500 ring-2 ring-purple-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Suspended</span>
            <Ban className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
            {suspendedCount}
          </div>
          <span className="text-[11px] text-purple-700 font-medium">On Hold</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`p-4 rounded-xl border text-left transition ${
            activeTab === 'all' && filterStatus === 'all'
              ? 'bg-slate-100 border-slate-400'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Total Listings</span>
            <BarChart3 className="w-4 h-4 text-slate-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
            {totalCount}
          </div>
          <span className="text-[11px] text-slate-500 font-medium">Database Total</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'pending'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Pending Listings ({pendingCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('approved')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'approved'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Approved Listings ({approvedCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rejected')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'rejected'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Rejected Listings ({rejectedCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>All Listings ({totalCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Moderation Audit Log</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('disputes')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'disputes'
                ? 'bg-indigo-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Disputes ({disputes.filter(d => d.status !== 'resolved').length})</span>
          </button>
        </div>
      </div>

      {/* Main Moderation Listing Section (For pending, approved, rejected, all tabs) */}
      {activeTab !== 'disputes' && activeTab !== 'history' && (
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
