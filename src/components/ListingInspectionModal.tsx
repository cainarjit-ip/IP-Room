import React, { useState } from 'react';
import { RoomListing, Language, ListingStatus } from '../types';
import {
  X,
  MapPin,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Building,
  User,
  Phone,
  Calendar,
  Image as ImageIcon,
  DollarSign,
  Droplets,
  Zap,
  ShieldCheck,
  Ban,
  RotateCcw,
  Trash2
} from 'lucide-react';

interface ListingInspectionModalProps {
  room: RoomListing | null;
  language: Language;
  onClose: () => void;
  onApprove: (room: RoomListing) => void;
  onOpenReject: (room: RoomListing) => void;
  onSuspend?: (room: RoomListing) => void;
  onUnpublish?: (room: RoomListing) => void;
  onRestore?: (room: RoomListing) => void;
  onDelete?: (room: RoomListing) => void;
}

export const ListingInspectionModal: React.FC<ListingInspectionModalProps> = ({
  room,
  language,
  onClose,
  onApprove,
  onOpenReject,
  onSuspend,
  onUnpublish,
  onRestore,
  onDelete,
}) => {
  if (!room) return null;

  const [selectedImg, setSelectedImg] = useState<number>(0);
  const images = room.images && room.images.length > 0 ? room.images : [];

  const getStatusBadge = (status: ListingStatus) => {
    switch (status) {
      case 'active':
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle className="w-3.5 h-3.5" />
            Approved / Active
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <XCircle className="w-3.5 h-3.5" />
            Rejected
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <AlertTriangle className="w-3.5 h-3.5" />
            Suspended
          </span>
        );
      case 'unpublished':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-800 border border-slate-300">
            <Ban className="w-3.5 h-3.5" />
            Unpublished
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-300">
            <AlertTriangle className="w-3.5 h-3.5" />
            Pending Verification
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="relative bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-900/60 rounded-xl text-purple-300 border border-purple-800">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-purple-300">ID: {room.id}</span>
                {getStatusBadge(room.status)}
              </div>
              <h2 className="font-bold text-base text-white mt-0.5 line-clamp-1">
                {room.title}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700">
          {/* Rejection notice if present */}
          {room.rejectionReason && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-900">
              <XCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
              <div>
                <h4 className="font-bold">Rejection Reason on Record:</h4>
                <p className="mt-0.5">{room.rejectionReason}</p>
                {room.moderatedBy && (
                  <p className="text-[11px] text-rose-700 mt-1">
                    Moderated by: <strong>{room.moderatedBy}</strong> {room.moderatedAt ? `on ${new Date(room.moderatedAt).toLocaleString()}` : ''}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Photo Gallery */}
          <div>
            <h3 className="font-bold text-slate-900 text-sm mb-2 flex items-center gap-1.5">
              <ImageIcon className="w-4 h-4 text-emerald-700" />
              <span>Uploaded Room Photos ({images.length})</span>
            </h3>

            {images.length > 0 ? (
              <div className="space-y-2">
                <div className="aspect-video w-full rounded-xl overflow-hidden bg-slate-900 border border-slate-200 relative">
                  <img
                    src={images[selectedImg] || images[0]}
                    alt="Inspection view"
                    className="w-full h-full object-contain"
                  />
                  <span className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded">
                    Photo {selectedImg + 1} of {images.length}
                  </span>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedImg(idx)}
                      className={`relative w-16 h-12 rounded-lg overflow-hidden shrink-0 border-2 transition ${
                        selectedImg === idx ? 'border-emerald-600 ring-2 ring-emerald-500/20' : 'border-slate-200 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-center">
                No photos provided for this listing.
              </div>
            )}
          </div>

          {/* Location & Financials Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Location info */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-rose-600" />
                <span>Nepal Location Details</span>
              </h4>
              <div className="space-y-1 text-slate-600">
                <div><strong>Province:</strong> {room.location.province}</div>
                <div><strong>District:</strong> {room.location.district}</div>
                <div><strong>Municipality / Metro:</strong> {room.location.municipality}</div>
                <div><strong>Ward:</strong> {room.location.ward}</div>
                <div><strong>Street / Landmark:</strong> {room.location.areaLandmark || 'N/A'}</div>
                <div><strong>Full Address:</strong> {room.location.fullAddress}</div>
              </div>
            </div>

            {/* Financial & Room Setup */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <span>Financials & Specifications</span>
              </h4>
              <div className="space-y-1 text-slate-600">
                <div><strong>Monthly Rent:</strong> रु. {room.price.toLocaleString('en-IN')}</div>
                <div><strong>Security Deposit:</strong> रु. {room.deposit.toLocaleString('en-IN')}</div>
                <div><strong>Room Type:</strong> {room.roomType.toUpperCase()}</div>
                <div><strong>Floor Level:</strong> {room.floor}</div>
                <div><strong>Occupancy Preference:</strong> {room.occupancyPreference}</div>
                <div><strong>Water Schedule:</strong> {room.waterSchedule}</div>
                <div><strong>Electricity Rate:</strong> रु. {room.electricityRatePerUnit}/unit</div>
              </div>
            </div>
          </div>

          {/* Owner details */}
          <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-200 space-y-2">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
              <User className="w-4 h-4 text-blue-600" />
              <span>Property Owner Information</span>
            </h4>
            <div className="flex items-center gap-3">
              <img
                src={room.owner.avatar}
                alt={room.owner.name}
                className="w-10 h-10 rounded-full object-cover border border-blue-300"
              />
              <div className="space-y-0.5">
                <div className="font-bold text-slate-900">{room.owner.name}</div>
                <div className="text-slate-600 flex items-center gap-3">
                  <span>Phone: {room.owner.phone}</span>
                  {room.owner.citizenshipVerified ? (
                    <span className="text-emerald-700 font-semibold inline-flex items-center gap-0.5">
                      <ShieldCheck className="w-3.5 h-3.5" /> Citizenship Verified
                    </span>
                  ) : (
                    <span className="text-amber-700">Citizenship Pending</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Description & Rules */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900">Description</h4>
            <p className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 leading-relaxed">
              {room.description}
            </p>
          </div>

          {/* Submission info */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
            <span>Submitted on: {room.createdAt}</span>
            <span>Current Status: <strong className="uppercase">{room.status}</strong></span>
          </div>
        </div>

        {/* Action Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-100 transition"
          >
            Close
          </button>

          <div className="flex items-center gap-2">
            {/* If pending or rejected: Approve */}
            {(room.status === 'pending' || room.status === 'rejected' || room.status === 'suspended' || room.status === 'unpublished') && (
              <button
                type="button"
                onClick={() => {
                  onApprove(room);
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition shadow-xs"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Approve Listing</span>
              </button>
            )}

            {/* If pending or active: Reject */}
            {(room.status === 'pending' || room.status === 'active' || room.status === 'approved') && (
              <button
                type="button"
                onClick={() => {
                  onOpenReject(room);
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Reject Listing</span>
              </button>
            )}

            {/* Suspend action for approved listings */}
            {(room.status === 'active' || room.status === 'approved') && onSuspend && (
              <button
                type="button"
                onClick={() => {
                  onSuspend(room);
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Suspend</span>
              </button>
            )}

            {/* Restore action */}
            {(room.status === 'rejected' || room.status === 'suspended' || room.status === 'unpublished') && onRestore && (
              <button
                type="button"
                onClick={() => {
                  onRestore(room);
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restore to Pending</span>
              </button>
            )}

            {/* Delete permanently */}
            {onDelete && (
              <button
                type="button"
                onClick={() => {
                  onDelete(room);
                  onClose();
                }}
                className="inline-flex items-center gap-1 px-3 py-2 bg-slate-200 hover:bg-rose-600 hover:text-white text-slate-700 rounded-lg text-xs font-medium transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
