import React from 'react';
import { Language, OccupancyPreference, RoomType } from '../types';
import { getTranslation } from '../data/translations';
import { Filter, RotateCcw, ShieldCheck, Check } from 'lucide-react';

interface FiltersState {
  roomType: string;
  occupancy: OccupancyPreference | '';
  minPrice: number;
  maxPrice: number;
  water24x7: boolean;
  solarHotWater: boolean;
  attachedBathroom: boolean;
  kitchenFacility: boolean;
  bikeParking: boolean;
  wifi: boolean;
  electricityBackup: boolean;
  verifiedOnly: boolean;
}

interface RoomFiltersProps {
  language: Language;
  filters: FiltersState;
  onChange: (updated: Partial<FiltersState>) => void;
  onReset: () => void;
}

export const RoomFilters: React.FC<RoomFiltersProps> = ({
  language,
  filters,
  onChange,
  onReset,
}) => {
  const t = getTranslation(language);

  return (
    <div className="bg-white border border-slate-200/80 rounded-xl p-4 sm:p-5 shadow-xs space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-emerald-700" />
          <h2 className="font-semibold text-sm text-slate-900">{t.filterRooms}</h2>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="text-xs text-slate-500 hover:text-emerald-700 flex items-center gap-1 transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          <span>{t.clearFilters}</span>
        </button>
      </div>

      {/* Room Type */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-2">
          {t.roomType}
        </label>
        <div className="grid grid-cols-2 gap-1.5 text-xs">
          {[
            { id: '', label: language === 'np' ? 'सबै' : 'All' },
            { id: 'single', label: 'Single Room' },
            { id: 'shared', label: 'Shared Room' },
            { id: '1bhk', label: '1 BHK Flat' },
            { id: '2bhk', label: '2 BHK Flat' },
            { id: 'studio', label: 'Studio' },
          ].map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange({ roomType: item.id })}
              className={`py-1.5 px-2 rounded-lg text-left transition-colors border ${
                filters.roomType === item.id
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-semibold'
                  : 'bg-slate-50/60 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Occupancy Preference */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-2">
          {t.occupancyType}
        </label>
        <div className="space-y-1.5 text-xs">
          {[
            { id: '', label: t.anyOccupancy },
            { id: 'students_only', label: t.studentsOnly },
            { id: 'girls_only', label: t.girlsOnly },
            { id: 'boys_only', label: t.boysOnly },
            { id: 'family', label: t.familyFriendly },
          ].map(item => (
            <label
              key={item.id}
              className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-slate-900"
            >
              <input
                type="radio"
                name="occupancy"
                checked={filters.occupancy === item.id}
                onChange={() => onChange({ occupancy: item.id as OccupancyPreference | '' })}
                className="accent-emerald-600 w-3.5 h-3.5"
              />
              <span>{item.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-2">
          <span>{t.priceRange}</span>
          <span className="font-mono tabular-nums text-emerald-700">
            रु. {filters.maxPrice.toLocaleString('en-IN')}
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="300000"
          step="5000"
          value={filters.maxPrice}
          onChange={e => onChange({ maxPrice: Number(e.target.value) })}
          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
        />
        <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
          <span>रु. 0</span>
          <span>रु. 3,00,000</span>
        </div>
      </div>

      {/* Essential Amenities */}
      <div className="pt-2 border-t border-slate-100">
        <label className="block text-xs font-semibold text-slate-700 mb-2">
          {t.amenities}
        </label>
        <div className="space-y-2 text-xs text-slate-700">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.water24x7}
              onChange={e => onChange({ water24x7: e.target.checked })}
              className="rounded accent-emerald-600 w-3.5 h-3.5"
            />
            <span>{t.water24x7}</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.attachedBathroom}
              onChange={e => onChange({ attachedBathroom: e.target.checked })}
              className="rounded accent-emerald-600 w-3.5 h-3.5"
            />
            <span>{t.attachedBathroom}</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.kitchenFacility}
              onChange={e => onChange({ kitchenFacility: e.target.checked })}
              className="rounded accent-emerald-600 w-3.5 h-3.5"
            />
            <span>{t.kitchenFacility}</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.solarHotWater}
              onChange={e => onChange({ solarHotWater: e.target.checked })}
              className="rounded accent-emerald-600 w-3.5 h-3.5"
            />
            <span>{t.hotWaterSolar}</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.bikeParking}
              onChange={e => onChange({ bikeParking: e.target.checked })}
              className="rounded accent-emerald-600 w-3.5 h-3.5"
            />
            <span>{t.bikeParking}</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.wifi}
              onChange={e => onChange({ wifi: e.target.checked })}
              className="rounded accent-emerald-600 w-3.5 h-3.5"
            />
            <span>{t.wifiHighSpeed}</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.electricityBackup}
              onChange={e => onChange({ electricityBackup: e.target.checked })}
              className="rounded accent-emerald-600 w-3.5 h-3.5"
            />
            <span>{t.electricityBackup}</span>
          </label>
        </div>
      </div>

      {/* Verified Landlord Only */}
      <div className="pt-2 border-t border-slate-100">
        <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-800">
          <input
            type="checkbox"
            checked={filters.verifiedOnly}
            onChange={e => onChange({ verifiedOnly: e.target.checked })}
            className="rounded accent-emerald-600 w-3.5 h-3.5"
          />
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>{t.verifiedLandlordsOnly}</span>
          </span>
        </label>
      </div>
    </div>
  );
};
