import React from 'react';
import { RoomListing, Language } from '../types';
import { getTranslation } from '../data/translations';
import { X, Heart, Trash2, ArrowRight } from 'lucide-react';

interface WishlistModalProps {
  wishlistRooms: RoomListing[];
  language: Language;
  onRemove: (roomId: string) => void;
  onSelectRoom: (room: RoomListing) => void;
  onClose: () => void;
}

export const WishlistModal: React.FC<WishlistModalProps> = ({
  wishlistRooms,
  language,
  onRemove,
  onSelectRoom,
  onClose,
}) => {
  const t = getTranslation(language);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-rose-500 fill-current" />
            <h2 className="font-bold text-sm">
              {t.savedWishlist}
            </h2>
            <span className="text-xs text-slate-400 font-mono">({wishlistRooms.length})</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List */}
        <div className="p-4 overflow-y-auto flex-1 divide-y divide-slate-100">
          {wishlistRooms.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-400 space-y-2">
              <Heart className="w-8 h-8 text-slate-300 mx-auto" />
              <p>You haven't saved any rooms yet.</p>
              <p className="text-[11px] text-slate-500">
                Click the heart icon on any room listing to save it for later inspection.
              </p>
            </div>
          ) : (
            wishlistRooms.map(room => (
              <div key={room.id} className="py-3 flex items-center justify-between gap-3">
                <div
                  className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                  onClick={() => {
                    onClose();
                    onSelectRoom(room);
                  }}
                >
                  <img
                    src={room.images[0]}
                    alt={room.title}
                    className="w-16 h-16 rounded-lg object-cover shrink-0"
                  />
                  <div className="min-w-0">
                    <span className="text-[11px] text-emerald-700 font-semibold block truncate">
                      {room.location.municipality} · Ward {room.location.ward}
                    </span>
                    <h3 className="font-bold text-xs text-slate-900 truncate">
                      {language === 'np' ? room.titleNp : room.title}
                    </h3>
                    <div className="text-xs font-mono font-bold text-slate-900 mt-0.5">
                      रु. {room.price.toLocaleString('en-IN')}/mo
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onSelectRoom(room);
                    }}
                    className="p-2 text-slate-700 hover:text-emerald-700 rounded-lg hover:bg-slate-100 transition"
                    title="View Room"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(room.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                    title="Remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
