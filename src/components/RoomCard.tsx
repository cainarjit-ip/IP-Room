import React from 'react';
import { RoomListing, Language } from '../types';
import { getTranslation } from '../data/translations';
import { Heart, Scale, ShieldCheck, MapPin, Droplets, Zap, UserCheck, MessageSquare } from 'lucide-react';

interface RoomCardProps {
  room: RoomListing;
  language: Language;
  isWishlisted: boolean;
  onToggleWishlist: (roomId: string) => void;
  isCompared: boolean;
  onToggleCompare: (roomId: string) => void;
  onSelectRoom: (room: RoomListing) => void;
  onQuickBook: (room: RoomListing) => void;
  onStartChat?: (room: RoomListing) => void;
}

export const RoomCard: React.FC<RoomCardProps> = ({
  room,
  language,
  isWishlisted,
  onToggleWishlist,
  isCompared,
  onToggleCompare,
  onSelectRoom,
  onQuickBook,
  onStartChat,
}) => {
  const t = getTranslation(language);

  // Fallback image in case asset fails
  const mainImage = room.images[0] || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=600&q=80';

  const roomTypeLabel = {
    single: t.type_single,
    shared: t.type_shared,
    '1bhk': t.type_1bhk,
    '2bhk': t.type_2bhk,
    studio: t.type_studio,
    full_flat: t.type_full_flat,
  }[room.roomType];

  return (
    <div className="group relative bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 flex flex-col h-full">
      {/* Visual Slot: Leading with Image */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100 cursor-pointer" onClick={() => onSelectRoom(room)}>
        <img
          src={mainImage}
          alt={room.title}
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=600&q=80';
          }}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
        />

        {/* Top-right floating action triggers: Wishlist & Compare */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleCompare(room.id);
            }}
            title={isCompared ? t.removeFromCompare : t.addToCompare}
            className={`p-2 rounded-full backdrop-blur-md transition-all ${
              isCompared
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white/80 text-slate-700 hover:bg-white hover:text-emerald-700'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleWishlist(room.id);
            }}
            title="Save to Wishlist"
            className={`p-2 rounded-full backdrop-blur-md transition-all ${
              isWishlisted
                ? 'bg-rose-500 text-white shadow-xs'
                : 'bg-white/80 text-slate-700 hover:bg-white hover:text-rose-600'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${isWishlisted ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Quiet text kicker gradient banner at bottom of image */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 via-slate-950/40 to-transparent p-3 pt-6 flex items-center justify-between text-white text-xs">
          <span className="font-medium tracking-wide">
            {room.location.municipality} · Ward {room.location.ward}
          </span>
          {room.location.distanceToCampusMeters && (
            <span className="font-mono tabular-nums text-emerald-300 font-semibold">
              {room.location.distanceToCampusMeters}m to campus
            </span>
          )}
        </div>
      </div>

      {/* Card Content & Metadata */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Unboxed Metadata Line with typographic separators (anti-slop rule) */}
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1.5 flex-wrap">
            <span className="font-medium text-emerald-700">{roomTypeLabel}</span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span>{room.floor}</span>
            {room.owner.citizenshipVerified && (
              <>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <span className="inline-flex items-center gap-0.5 text-blue-600 font-medium">
                  <ShieldCheck className="w-3 h-3" />
                  <span>ID Verified</span>
                </span>
              </>
            )}
          </div>

          {/* Title */}
          <h2
            onClick={() => onSelectRoom(room)}
            className="font-semibold text-base text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-2 cursor-pointer leading-snug"
          >
            {language === 'np' ? room.titleNp : room.title}
          </h2>

          {/* Key Nepal Infrastructure Details: Water & Electricity */}
          <div className="mt-2.5 space-y-1 text-xs text-slate-600">
            <div className="flex items-center gap-1.5 truncate">
              <Droplets className="w-3.5 h-3.5 text-sky-600 shrink-0" />
              <span className="truncate">{room.waterSchedule}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>Electricity: NPR {room.electricityRatePerUnit}/unit (Sub-meter)</span>
            </div>
          </div>
        </div>

        {/* Card Footer: Price & Primary Action */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-base font-bold text-slate-900 font-mono tabular-nums">
                रु. {room.price.toLocaleString('en-IN')}
              </span>
              <span className="text-xs text-slate-500 font-normal">{t.perMonth}</span>
            </div>
            <div className="text-[11px] text-slate-400">
              {t.securityDeposit}: रु. {room.deposit.toLocaleString('en-IN')}
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => onSelectRoom(room)}
              className="px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              {t.viewDetails}
            </button>
            {onStartChat && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onStartChat(room);
                }}
                className="px-2 sm:px-2.5 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                title={language === 'np' ? 'घरधनीसँग च्याट गर्नुहोस्' : 'Chat with Owner'}
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-700" />
                <span className="hidden sm:inline">{language === 'np' ? 'च्याट' : 'Chat'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onQuickBook(room)}
              className="px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors shadow-xs active:scale-95"
            >
              {t.quickBook}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
