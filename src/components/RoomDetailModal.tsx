import React, { useState } from 'react';
import { RoomListing, Language, VirtualTourScene } from '../types';
import { getTranslation } from '../data/translations';
import { VirtualTourViewer } from './VirtualTourViewer';
import {
  X,
  MapPin,
  ShieldCheck,
  Droplets,
  Zap,
  Phone,
  MessageSquare,
  MessageCircle,
  Wifi,
  Car,
  Home,
  Sun,
  Shield,
  Star,
  CheckCircle,
  Maximize2,
  Calendar,
  Layers,
  Users,
  Compass,
  Sparkles,
  QrCode
} from 'lucide-react';
import { RoomShareModal } from './RoomShareModal';

interface RoomDetailModalProps {
  room: RoomListing | null;
  language: Language;
  onClose: () => void;
  onStartBooking: (room: RoomListing) => void;
  onOpenChat: (room: RoomListing) => void;
}

export const RoomDetailModal: React.FC<RoomDetailModalProps> = ({
  room,
  language,
  onClose,
  onStartBooking,
  onOpenChat,
}) => {
  if (!room) return null;

  const t = getTranslation(language);
  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const [is360Mode, setIs360Mode] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const images = room.images && room.images.length > 0
    ? room.images
    : ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1000&q=80'];

  // Default virtual tour scenes if none specified
  const tourScenes: VirtualTourScene[] = room.virtualTour && room.virtualTour.length > 0
    ? room.virtualTour
    : [
        {
          id: 'scene-def-1',
          title: 'Main Living & Bedroom',
          titleNp: 'मुख्य कोठा',
          panoramaUrl: images[0],
          hotspots: images.length > 1 ? [
            {
              id: 'hs-def-1',
              pitch: 0,
              yaw: 45,
              targetSceneId: 'scene-def-2',
              title: 'View Balcony Area',
              titleNp: 'बाल्कोनी हेर्नुहोस्'
            }
          ] : []
        },
        ...(images.length > 1 ? [{
          id: 'scene-def-2',
          title: 'Balcony & Exterior',
          titleNp: 'बाल्कोनी र बाहिरी दृश्य',
          panoramaUrl: images[1],
          hotspots: [
            {
              id: 'hs-def-2',
              pitch: 0,
              yaw: -135,
              targetSceneId: 'scene-def-1',
              title: 'Back to Bedroom',
              titleNp: 'कोठामा फर्किनुहोस्'
            }
          ]
        }] : [])
      ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div
        className="relative bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Top Control Bar: Share QR Code & Close */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsShareModalOpen(true)}
            className="px-3 py-1.5 rounded-full bg-black/60 text-white hover:bg-black transition-colors flex items-center gap-1.5 text-xs font-semibold backdrop-blur-md cursor-pointer border border-white/20"
            title="Share via QR Code"
          >
            <QrCode className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Share QR</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-black/60 text-white hover:bg-black transition-colors cursor-pointer"
            aria-label="Close details"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Gallery / 360 Section */}
        <div className="relative aspect-[16/9] w-full bg-slate-900 overflow-hidden">
          {!is360Mode ? (
            <img
              src={images[activeImgIndex]}
              alt={room.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-center"
            />
          ) : (
            <VirtualTourViewer
              scenes={tourScenes}
              language={language}
            />
          )}

          {/* Toggle 360 Simulation */}
          <div className="absolute top-4 left-4 z-30 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIs360Mode(!is360Mode)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg backdrop-blur-md transition flex items-center gap-1.5 shadow-md ${
                is360Mode
                  ? 'bg-emerald-600 text-white'
                  : 'bg-black/70 text-white hover:bg-black/90 border border-white/20'
              }`}
            >
              <Compass className="w-3.5 h-3.5 text-emerald-400" />
              <span>{is360Mode ? 'Switch to Photo Gallery' : 'Interactive 360° Virtual Tour'}</span>
            </button>
          </div>

          {/* Gallery Thumbnail Strip */}
          {images.length > 1 && !is360Mode && (
            <div className="absolute bottom-3 left-4 right-4 flex items-center gap-2 overflow-x-auto pb-1 z-10">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImgIndex(idx)}
                  className={`w-16 h-11 rounded-lg overflow-hidden shrink-0 border-2 transition ${
                    activeImgIndex === idx ? 'border-emerald-500 scale-105' : 'border-white/50 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="thumbnail" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-7 space-y-6">
          {/* Header Row: Title & Price */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{room.location.fullAddress}</span>
              </div>
              <h1 className="font-display font-bold text-xl sm:text-2xl text-slate-900 leading-snug">
                {language === 'np' ? room.titleNp : room.title}
              </h1>
              {room.location.nearbyCampus && (
                <div className="mt-1 text-xs font-semibold text-emerald-700">
                  🎓 {room.location.distanceToCampusMeters}m from {room.location.nearbyCampus}
                </div>
              )}
            </div>

            <div className="shrink-0 sm:text-right bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-xl">
              <div className="flex sm:justify-end items-baseline gap-1">
                <span className="font-display font-extrabold text-2xl text-slate-900 font-mono tabular-nums">
                  रु. {room.price.toLocaleString('en-IN')}
                </span>
                <span className="text-xs text-slate-500">{t.perMonth}</span>
              </div>
              <div className="text-xs text-slate-500">
                {t.securityDeposit}: रु. {room.deposit.toLocaleString('en-IN')} (Refundable)
              </div>
            </div>
          </div>

          {/* Quick Specs Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl text-xs">
            <div>
              <span className="text-slate-500 block mb-0.5">{t.specFloor}</span>
              <span className="font-semibold text-slate-900">{room.floor}</span>
            </div>
            <div>
              <span className="text-slate-500 block mb-0.5">{t.specOccupancy}</span>
              <span className="font-semibold text-slate-900 capitalize">
                {room.occupancyPreference.replace('_', ' ')}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block mb-0.5">{t.specAvailableFrom}</span>
              <span className="font-semibold text-slate-900">{room.availableFrom}</span>
            </div>
            <div>
              <span className="text-slate-500 block mb-0.5">{t.specSubmeter}</span>
              <span className="font-semibold text-slate-900 font-mono tabular-nums">
                रु. {room.electricityRatePerUnit} {t.nprPerUnit}
              </span>
            </div>
          </div>

          {/* Description */}
          <div>
            <h2 className="font-semibold text-sm text-slate-900 mb-2">{t.roomOverview}</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              {language === 'np' ? room.descriptionNp : room.description}
            </p>
          </div>

          {/* Transparent Water Facility Callout (Critical for Nepal) */}
          <div className="bg-sky-50 border border-sky-100 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-sky-100 text-sky-700 shrink-0">
                <Droplets className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-xs text-sky-950 uppercase tracking-wide">
                  {t.waterFacilityDetails}
                </h3>
                <p className="text-xs text-sky-900 font-medium mt-1">
                  {room.waterSchedule}
                </p>
                <span className="text-[11px] text-sky-700 block mt-0.5">
                  Verified by IP Room inspector during premises audit.
                </span>
              </div>
            </div>
          </div>

          {/* Amenities Grid */}
          <div>
            <h2 className="font-semibold text-sm text-slate-900 mb-3">{t.amenities}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs text-slate-700">
              <div className={`flex items-center gap-2 p-2 rounded-lg ${room.amenities.water24x7 ? 'bg-emerald-50 text-emerald-900 font-medium' : 'text-slate-400 line-through'}`}>
                <Droplets className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>24/7 Water Supply</span>
              </div>
              <div className={`flex items-center gap-2 p-2 rounded-lg ${room.amenities.hotWaterSolar ? 'bg-emerald-50 text-emerald-900 font-medium' : 'text-slate-400 line-through'}`}>
                <Sun className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Solar Hot Water</span>
              </div>
              <div className={`flex items-center gap-2 p-2 rounded-lg ${room.amenities.wifi ? 'bg-emerald-50 text-emerald-900 font-medium' : 'text-slate-400 line-through'}`}>
                <Wifi className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>High-Speed WiFi</span>
              </div>
              <div className={`flex items-center gap-2 p-2 rounded-lg ${room.amenities.attachedBathroom ? 'bg-emerald-50 text-emerald-900 font-medium' : 'text-slate-400 line-through'}`}>
                <Home className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Attached Bathroom</span>
              </div>
              <div className={`flex items-center gap-2 p-2 rounded-lg ${room.amenities.kitchenFacility ? 'bg-emerald-50 text-emerald-900 font-medium' : 'text-slate-400 line-through'}`}>
                <Home className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Kitchen Space</span>
              </div>
              <div className={`flex items-center gap-2 p-2 rounded-lg ${room.amenities.bikeParking ? 'bg-emerald-50 text-emerald-900 font-medium' : 'text-slate-400 line-through'}`}>
                <Car className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Bike / Scooter Parking</span>
              </div>
              <div className={`flex items-center gap-2 p-2 rounded-lg ${room.amenities.electricityBackup ? 'bg-emerald-50 text-emerald-900 font-medium' : 'text-slate-400 line-through'}`}>
                <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Inverter / Solar Backup</span>
              </div>
              <div className={`flex items-center gap-2 p-2 rounded-lg ${room.amenities.cctvSecurity ? 'bg-emerald-50 text-emerald-900 font-medium' : 'text-slate-400 line-through'}`}>
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>CCTV Security Gate</span>
              </div>
            </div>
          </div>

          {/* House Rules */}
          <div>
            <h2 className="font-semibold text-sm text-slate-900 mb-2">{t.houseRulesTitle}</h2>
            <ul className="space-y-1.5 text-xs text-slate-600 list-disc list-inside">
              {(language === 'np' ? room.houseRulesNp : room.houseRules).map((rule, idx) => (
                <li key={idx}>{rule}</li>
              ))}
            </ul>
          </div>

          {/* Landlord Contact & Profile */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <img
                  src={room.owner.avatar}
                  alt={room.owner.name}
                  className="w-12 h-12 rounded-full object-cover border border-slate-200"
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-sm text-slate-900">{room.owner.name}</span>
                    {room.owner.citizenshipVerified && (
                      <span className="inline-flex items-center gap-0.5 text-blue-600 text-xs font-semibold">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Verified</span>
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                    <span>Response: {room.owner.responseRate}</span>
                    <span>·</span>
                    <span>{room.owner.responseTime}</span>
                  </div>
                </div>
              </div>

              {/* Direct channels */}
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={`https://wa.me/${room.owner.whatsapp}?text=${encodeURIComponent(`Hello, I saw your room "${room.title}" on IP Room and would like to inquire.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>

                <button
                  type="button"
                  onClick={() => onOpenChat(room)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-slate-600" />
                  <span>In-App Chat</span>
                </button>

                <a
                  href={`tel:${room.owner.phone}`}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition"
                >
                  <Phone className="w-3.5 h-3.5 text-slate-600" />
                  <span>Call</span>
                </a>
              </div>
            </div>
          </div>

          {/* Student Reviews */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-sm text-slate-900 flex items-center gap-1.5">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span>{room.ratings.average} ({room.ratings.count} Student Reviews)</span>
              </h2>
            </div>

            <div className="space-y-3">
              {room.reviews.map(rev => (
                <div key={rev.id} className="p-3 bg-slate-50/70 rounded-lg border border-slate-100 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-900">{rev.authorName}</span>
                    <span className="text-slate-400">{rev.date}</span>
                  </div>
                  {rev.authorUniversity && (
                    <div className="text-[11px] text-slate-500 mb-1">{rev.authorUniversity}</div>
                  )}
                  <p className="text-slate-600">{rev.comment}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Sticky purchase bottom trigger */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Escrow Protected: Money held until key handover</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Generates instant legal Digital Tenancy Contract (नेपाल घरबहाल सम्झौता)
              </div>
            </div>

            <button
              type="button"
              onClick={() => onStartBooking(room)}
              className="w-full sm:w-auto px-6 py-3 text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition shadow-md active:scale-95 text-center"
            >
              {t.instantBookingBtn}
            </button>
          </div>
        </div>
      </div>

      {/* QR Code Share Modal */}
      {isShareModalOpen && (
        <RoomShareModal
          room={room}
          language={language}
          onClose={() => setIsShareModalOpen(false)}
        />
      )}
    </div>
  );
};
