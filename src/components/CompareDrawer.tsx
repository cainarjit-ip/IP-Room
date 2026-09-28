import React from 'react';
import { RoomListing, Language } from '../types';
import { getTranslation } from '../data/translations';
import { X, Scale, Check, Minus, Droplets, Zap, School } from 'lucide-react';

interface CompareDrawerProps {
  comparedRooms: RoomListing[];
  language: Language;
  onRemoveRoom: (roomId: string) => void;
  onClearAll: () => void;
  onSelectRoom: (room: RoomListing) => void;
  onClose: () => void;
}

export const CompareDrawer: React.FC<CompareDrawerProps> = ({
  comparedRooms,
  language,
  onRemoveRoom,
  onClearAll,
  onSelectRoom,
  onClose,
}) => {
  const t = getTranslation(language);

  if (comparedRooms.length === 0) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-md w-full p-6 text-center space-y-4 shadow-xl">
          <Scale className="w-12 h-12 text-slate-300 mx-auto" />
          <h2 className="font-bold text-base text-slate-800">
            {language === 'np' ? 'तुलना गर्न कुनै कोठा छानिएको छैन' : 'No Rooms Selected for Comparison'}
          </h2>
          <p className="text-xs text-slate-500">
            Click the "Compare" icon on any room card to compare up to 3 listings side-by-side.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-emerald-700 text-white rounded-lg text-xs font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white rounded-2xl max-w-5xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-emerald-400" />
            <h2 className="font-bold text-sm">
              {language === 'np' ? 'कोठाहरूको तुलना (Side-by-Side)' : 'Room Comparison (Side-by-Side)'}
            </h2>
            <span className="text-xs text-slate-400 font-mono">({comparedRooms.length}/3 Rooms)</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClearAll}
              className="text-xs text-slate-400 hover:text-white transition"
            >
              Clear All
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="p-5 overflow-x-auto flex-1">
          <table className="w-full text-xs text-left border-collapse min-w-[650px]">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="py-3 px-3 w-44 font-semibold text-slate-500">Feature</th>
                {comparedRooms.map(room => (
                  <th key={room.id} className="py-3 px-3 font-semibold text-slate-900 w-1/3">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => onRemoveRoom(room.id)}
                        className="absolute -top-1 -right-1 p-1 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full"
                        title="Remove"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <img
                        src={room.images[0]}
                        alt={room.title}
                        className="w-full h-28 object-cover rounded-lg mb-2"
                      />
                      <div className="font-bold text-xs truncate">{room.title}</div>
                      <div className="text-[11px] text-slate-500">{room.location.municipality}</div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="py-2.5 px-3 font-semibold text-slate-600">Monthly Rent</td>
                {comparedRooms.map(r => (
                  <td key={r.id} className="py-2.5 px-3 font-bold font-mono text-emerald-800 text-sm">
                    रु. {r.price.toLocaleString('en-IN')}/mo
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-slate-600">Advance Deposit</td>
                {comparedRooms.map(r => (
                  <td key={r.id} className="py-2.5 px-3 font-mono text-slate-700">
                    रु. {r.deposit.toLocaleString('en-IN')}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-slate-600">Campus Distance</td>
                {comparedRooms.map(r => (
                  <td key={r.id} className="py-2.5 px-3 text-slate-800 font-medium">
                    {r.location.distanceToCampusMeters ? `${r.location.distanceToCampusMeters}m walk` : 'Near transit'}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-slate-600">Water Facility</td>
                {comparedRooms.map(r => (
                  <td key={r.id} className="py-2.5 px-3 text-slate-700">
                    <span className="flex items-center gap-1">
                      <Droplets className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                      <span>{r.waterSchedule}</span>
                    </span>
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-slate-600">Electricity Sub-meter</td>
                {comparedRooms.map(r => (
                  <td key={r.id} className="py-2.5 px-3 font-mono text-slate-700">
                    रु. {r.electricityRatePerUnit} per unit
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-slate-600">Bathroom</td>
                {comparedRooms.map(r => (
                  <td key={r.id} className="py-2.5 px-3">
                    {r.amenities.attachedBathroom ? (
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Attached
                      </span>
                    ) : (
                      <span className="text-slate-500">Shared</span>
                    )}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-slate-600">Kitchen Space</td>
                {comparedRooms.map(r => (
                  <td key={r.id} className="py-2.5 px-3">
                    {r.amenities.kitchenFacility ? (
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Included
                      </span>
                    ) : (
                      <span className="text-slate-400 flex items-center gap-1">
                        <Minus className="w-3.5 h-3.5" /> No kitchen
                      </span>
                    )}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-slate-600">Solar Hot Water</td>
                {comparedRooms.map(r => (
                  <td key={r.id} className="py-2.5 px-3">
                    {r.amenities.hotWaterSolar ? (
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Available
                      </span>
                    ) : (
                      <span className="text-slate-400 flex items-center gap-1">
                        <Minus className="w-3.5 h-3.5" /> Not available
                      </span>
                    )}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-slate-600">Action</td>
                {comparedRooms.map(r => (
                  <td key={r.id} className="py-2.5 px-3">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onSelectRoom(r);
                      }}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold transition"
                    >
                      View Full Details
                    </button>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
