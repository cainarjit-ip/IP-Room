import React, { useState } from 'react';
import { RoomListing, Language } from '../types';
import { getTranslation } from '../data/translations';
import { X, MapPin, Navigation, School, Droplets, ArrowRight } from 'lucide-react';
import { NEPAL_CAMPUSES } from '../data/nepalGeo';

interface InteractiveMapModalProps {
  rooms: RoomListing[];
  language: Language;
  onSelectRoom: (room: RoomListing) => void;
  onClose?: () => void;
  isEmbedded?: boolean;
}

export const InteractiveMapModal: React.FC<InteractiveMapModalProps> = ({
  rooms,
  language,
  onSelectRoom,
  onClose,
  isEmbedded = false,
}) => {
  const t = getTranslation(language);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(rooms[0]?.id || null);
  const [selectedCityZone, setSelectedCityZone] = useState<'ktm' | 'pokhara' | 'chitwan'>('ktm');

  const activeRoom = rooms.find(r => r.id === activeRoomId);

  // Map coordinates normalization for stylized visual vector grid
  const cityCoordinates = {
    ktm: { minLat: 27.66, maxLat: 27.73, minLng: 85.27, maxLng: 85.36, name: 'Kathmandu Valley (Kirtipur, Patan, Baneshwor)' },
    pokhara: { minLat: 28.20, maxLat: 28.26, minLng: 83.95, maxLng: 84.02, name: 'Pokhara Valley (Lakeside, Bagar, Lamachaur)' },
    chitwan: { minLat: 27.65, maxLat: 27.72, minLng: 84.40, maxLng: 84.47, name: 'Chitwan (Bharatpur & Narayangarh)' }
  };

  const currentZone = cityCoordinates[selectedCityZone];

  // Filter rooms in current selected geographic zone
  const zoneRooms = rooms.filter(r => {
    if (selectedCityZone === 'ktm') return r.location.district === 'Kathmandu' || r.location.district === 'Lalitpur';
    if (selectedCityZone === 'pokhara') return r.location.district === 'Kaski';
    if (selectedCityZone === 'chitwan') return r.location.district === 'Chitwan';
    return true;
  });

  const content = (
    <div className="bg-white rounded-2xl overflow-hidden flex flex-col h-[750px] max-h-[85vh] border border-slate-200 shadow-xl">
      {/* Top Map Header & Controls */}
      <div className="p-4 border-b border-slate-200 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Navigation className="w-5 h-5 text-emerald-400" />
          <div>
            <h2 className="font-bold text-sm leading-tight">
              {language === 'np' ? 'अन्तरक्रियात्मक नक्सा दृश्य' : 'Interactive Campus & Room Map'}
            </h2>
            <span className="text-xs text-slate-400">
              Showing {zoneRooms.length} verified listings in {currentZone.name}
            </span>
          </div>
        </div>

        {/* Zone switcher tabs */}
        <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg text-xs">
          <button
            type="button"
            onClick={() => setSelectedCityZone('ktm')}
            className={`px-3 py-1.5 rounded-md transition font-medium ${
              selectedCityZone === 'ktm' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:text-white'
            }`}
          >
            Kathmandu Valley
          </button>
          <button
            type="button"
            onClick={() => setSelectedCityZone('pokhara')}
            className={`px-3 py-1.5 rounded-md transition font-medium ${
              selectedCityZone === 'pokhara' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:text-white'
            }`}
          >
            Pokhara
          </button>
          <button
            type="button"
            onClick={() => setSelectedCityZone('chitwan')}
            className={`px-3 py-1.5 rounded-md transition font-medium ${
              selectedCityZone === 'chitwan' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:text-white'
            }`}
          >
            Chitwan
          </button>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Main Map Visual Canvas */}
      <div className="relative flex-1 bg-slate-100 overflow-hidden select-none">
        {/* Styled Vector Map Grid with Topographical Lines & Roads */}
        <svg className="absolute inset-0 w-full h-full text-slate-200 stroke-current opacity-60" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" strokeWidth="0.8" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          {/* Simulated Bagmati / Seti River Curve */}
          <path
            d="M 50 150 Q 200 280 400 320 T 700 480 T 950 600"
            fill="none"
            stroke="#93c5fd"
            strokeWidth="8"
            strokeLinecap="round"
            className="opacity-70"
          />
          {/* Major Ring Road / Arterial Roads */}
          <path
            d="M 120 180 C 250 80 650 100 800 280 C 900 420 700 620 400 580 C 200 550 80 350 120 180 Z"
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="12"
            strokeDasharray="4 4"
          />
        </svg>

        {/* Campus Markers on Map */}
        {NEPAL_CAMPUSES.map((campus, idx) => (
          <div
            key={idx}
            className="absolute z-10 -translate-x-1/2 -translate-y-1/2 group pointer-events-auto"
            style={{
              left: `${18 + (idx * 16) % 75}%`,
              top: `${22 + (idx * 14) % 65}%`
            }}
          >
            <div className="flex items-center gap-1.5 bg-blue-900 text-white text-[11px] font-semibold px-2.5 py-1 rounded-md shadow-md border border-blue-700/80 backdrop-blur-xs whitespace-nowrap">
              <School className="w-3.5 h-3.5 text-blue-300" />
              <span>{campus.nameEn.split('(')[0]}</span>
            </div>
          </div>
        ))}

        {/* Room Price Pins on Map */}
        {zoneRooms.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div className="bg-white/90 backdrop-blur-md p-6 rounded-2xl border border-slate-200 shadow-xl text-center max-w-sm pointer-events-auto space-y-2">
              <MapPin className="w-8 h-8 text-emerald-600 mx-auto" />
              <h3 className="font-bold text-sm text-slate-800">
                {language === 'np' ? 'यस क्षेत्रमा हाल कुनै कोठा छैन' : 'No Listings in this Zone Yet'}
              </h3>
              <p className="text-xs text-slate-500">
                {language === 'np'
                  ? 'यस क्षेत्रमा पहिलो कोठा थप्न "Add Listing" प्रयोग गर्नुहोस्।'
                  : 'New verified rooms added by landlords in this area will be mapped here.'}
              </p>
            </div>
          </div>
        )}

        {zoneRooms.map((room, idx) => {
          const isSelected = room.id === activeRoomId;
          // Distribute pins across map canvas
          const leftPos = 20 + ((idx * 27 + 13) % 68);
          const topPos = 25 + ((idx * 23 + 9) % 60);

          return (
            <div
              key={room.id}
              className="absolute z-20 -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform duration-200"
              style={{
                left: `${leftPos}%`,
                top: `${topPos}%`,
                transform: isSelected ? 'scale(1.15) translateY(-6px)' : 'scale(1)'
              }}
              onClick={() => setActiveRoomId(room.id)}
            >
              <div
                className={`relative px-3 py-1.5 rounded-full font-bold text-xs font-mono tabular-nums shadow-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  isSelected
                    ? 'bg-emerald-700 text-white ring-4 ring-emerald-300 ring-opacity-60 scale-105 z-30'
                    : 'bg-white text-slate-900 border border-slate-300 hover:border-emerald-600 hover:text-emerald-700'
                }`}
              >
                <MapPin className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-emerald-600'}`} />
                <span>रु. {room.price.toLocaleString('en-IN')}</span>
              </div>
            </div>
          );
        })}

        {/* Floating Active Room Preview Card on Bottom of Map */}
        {activeRoom && (
          <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-30 bg-white/95 backdrop-blur-md rounded-xl p-3.5 shadow-2xl border border-slate-200 transition-all animate-in fade-in slide-in-from-bottom-2">
            <div className="flex gap-3">
              <img
                src={activeRoom.images[0] || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=300&q=80'}
                alt={activeRoom.title}
                className="w-24 h-24 rounded-lg object-cover shrink-0"
              />
              <div className="flex-1 min-w-0">
                <span className="text-[11px] font-medium text-emerald-700 block truncate">
                  {activeRoom.location.municipality} · Ward {activeRoom.location.ward}
                </span>
                <h3 className="font-semibold text-xs text-slate-900 line-clamp-1 leading-snug">
                  {language === 'np' ? activeRoom.titleNp : activeRoom.title}
                </h3>

                <div className="mt-1 flex items-center gap-1 text-[11px] text-sky-700 font-medium truncate">
                  <Droplets className="w-3 h-3 text-sky-600 shrink-0" />
                  <span className="truncate">{activeRoom.waterSchedule}</span>
                </div>

                <div className="mt-2 flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900 font-mono tabular-nums">
                    रु. {activeRoom.price.toLocaleString('en-IN')}/mo
                  </span>

                  <button
                    type="button"
                    onClick={() => onSelectRoom(activeRoom)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 px-3 py-1.5 rounded-lg transition active:scale-95"
                  >
                    <span>View Room</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (isEmbedded) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="max-w-6xl w-full">
        {content}
      </div>
    </div>
  );
};
