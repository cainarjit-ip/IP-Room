import React, { useState } from 'react';
import { RoomListing } from '../types';
import { X, AlertTriangle, XCircle } from 'lucide-react';

interface RejectionReasonModalProps {
  room: RoomListing | null;
  onClose: () => void;
  onConfirmReject: (room: RoomListing, reason: string) => void;
}

const REJECTION_REASONS = [
  'Incorrect information',
  'Invalid location',
  'Poor/invalid photos',
  'Duplicate listing',
  'Incomplete information',
  'Suspicious listing',
  'Unrealistic pricing / Rent mismatch',
  'Other'
];

export const RejectionReasonModal: React.FC<RejectionReasonModalProps> = ({
  room,
  onClose,
  onConfirmReject,
}) => {
  if (!room) return null;

  const [selectedReason, setSelectedReason] = useState(REJECTION_REASONS[0]);
  const [customComment, setCustomComment] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalReason = selectedReason === 'Other'
      ? customComment.trim()
      : customComment.trim() ? `${selectedReason} - ${customComment.trim()}` : selectedReason;

    if (!finalReason) {
      setError('Please provide a rejection reason or explanation.');
      return;
    }

    onConfirmReject(room, finalReason);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="relative bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-rose-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-rose-300" />
            <h3 className="font-bold text-base">Reject Room Listing</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-rose-300 hover:text-white rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="font-bold text-slate-900">{room.title}</div>
            <div className="text-slate-500 mt-0.5">
              Landlord: {room.owner.name} · Location: {room.location.municipality}, {room.location.district}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-800 block">
              Select Primary Rejection Reason *
            </label>
            <select
              value={selectedReason}
              onChange={e => setSelectedReason(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:ring-2 focus:ring-rose-500"
            >
              {REJECTION_REASONS.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-800 block">
              Custom Rejection Note / Guidance for Owner
            </label>
            <textarea
              rows={3}
              value={customComment}
              onChange={e => setCustomComment(e.target.value)}
              placeholder="Explain to the room owner what needs to be corrected before re-submission..."
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:ring-2 focus:ring-rose-500"
            />
          </div>

          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition shadow-xs"
            >
              Confirm Rejection
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
