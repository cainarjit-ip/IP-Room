import React from 'react';
import { Language, RoomType } from '../types';
import { getTranslation } from '../data/translations';
import { NEPAL_PROVINCES, NEPAL_CAMPUSES } from '../data/nepalGeo';
import { Search, MapPin, Building, DollarSign, School, CheckCircle2 } from 'lucide-react';
import heroImg from '../assets/images/hero_nepal_rental_1790335496477.jpg';

interface HeroSearchProps {
  language: Language;
  selectedProvince: string;
  onProvinceChange: (prov: string) => void;
  selectedDistrict: string;
  onDistrictChange: (dist: string) => void;
  selectedMunicipality: string;
  onMunicipalityChange: (muni: string) => void;
  selectedRoomType: string;
  onRoomTypeChange: (type: string) => void;
  selectedCampus: string;
  onCampusSelect: (campusName: string) => void;
  maxBudget: number;
  onMaxBudgetChange: (val: number) => void;
  onSearch: () => void;
  totalRoomsCount: number;
}

export const HeroSearch: React.FC<HeroSearchProps> = ({
  language,
  selectedProvince,
  onProvinceChange,
  selectedDistrict,
  onDistrictChange,
  selectedMunicipality,
  onMunicipalityChange,
  selectedRoomType,
  onRoomTypeChange,
  selectedCampus,
  onCampusSelect,
  maxBudget,
  onMaxBudgetChange,
  onSearch,
  totalRoomsCount,
}) => {
  const t = getTranslation(language);

  // Find districts for selected province
  const currentProvinceObj = NEPAL_PROVINCES.find(
    p => p.nameEn === selectedProvince || (selectedProvince === '' && p.id === 3)
  );

  const availableDistricts = selectedProvince
    ? NEPAL_PROVINCES.find(p => p.nameEn === selectedProvince)?.districts || []
    : NEPAL_PROVINCES.flatMap(p => p.districts);

  const currentDistrictObj = availableDistricts.find(d => d.nameEn === selectedDistrict);
  const availableMunicipalities = currentDistrictObj ? currentDistrictObj.municipalities : [];

  return (
    <section className="relative bg-slate-900 text-white overflow-hidden">
      {/* Background Image Scrim */}
      <div className="absolute inset-0 z-0">
        <img
          src={heroImg}
          alt="Nepali modern rental apartment"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center opacity-30 scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/80 to-slate-900/60" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        {/* Trust pill / editorial label */}
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-3 uppercase tracking-wider">
          <CheckCircle2 className="w-4 h-4" />
          <span>Nepal's 1st Escrow-Backed Student Housing Portal</span>
        </div>

        {/* Hero Title */}
        <h1 className="font-display font-extrabold text-3xl sm:text-4xl md:text-5xl text-white tracking-tight leading-tight max-w-3xl [text-wrap:balance]">
          {t.heroTitle}
        </h1>

        <p className="mt-3 text-slate-300 text-sm md:text-base max-w-2xl leading-relaxed">
          {t.heroSubtitle}
        </p>

        {/* Main Search Panel */}
        <div className="mt-8 bg-white text-slate-900 rounded-xl p-4 sm:p-5 shadow-xl border border-slate-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {/* Province selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                <span>{t.selectProvince}</span>
              </label>
              <select
                value={selectedProvince}
                onChange={e => {
                  onProvinceChange(e.target.value);
                  onDistrictChange('');
                  onMunicipalityChange('');
                }}
                className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
              >
                <option value="">{t.allProvinces}</option>
                {NEPAL_PROVINCES.map(p => (
                  <option key={p.id} value={p.nameEn}>
                    {language === 'np' ? p.nameNp : p.nameEn}
                  </option>
                ))}
              </select>
            </div>

            {/* District selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-emerald-600" />
                <span>{t.selectDistrict}</span>
              </label>
              <select
                value={selectedDistrict}
                onChange={e => {
                  onDistrictChange(e.target.value);
                  onMunicipalityChange('');
                }}
                className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
              >
                <option value="">{t.allDistricts}</option>
                {availableDistricts.map(d => (
                  <option key={d.nameEn} value={d.nameEn}>
                    {language === 'np' ? d.nameNp : d.nameEn}
                  </option>
                ))}
              </select>
            </div>

            {/* Municipality / Metro selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                <span>{t.selectMunicipality}</span>
              </label>
              <select
                value={selectedMunicipality}
                onChange={e => onMunicipalityChange(e.target.value)}
                disabled={!selectedDistrict}
                className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition disabled:opacity-60"
              >
                <option value="">{t.allMunicipalities}</option>
                {availableMunicipalities.map(m => (
                  <option key={m.nameEn} value={m.nameEn}>
                    {language === 'np' ? m.nameNp : m.nameEn} ({m.type})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Lower search row: Budget slider & Search CTA */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1 flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-600 shrink-0">
                {t.budgetMonthly}:
              </span>
              <div className="flex-1 flex flex-col gap-0.5">
                <input
                  type="range"
                  min="0"
                  max="300000"
                  step="5000"
                  value={maxBudget}
                  onChange={e => onMaxBudgetChange(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>रु. 0</span>
                  <span>रु. 3,00,000</span>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-700 font-mono tabular-nums shrink-0 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-100 min-w-[125px] text-center">
                Up to रु. {maxBudget.toLocaleString('en-IN')}
              </span>
            </div>

            <button
              type="button"
              onClick={onSearch}
              className="inline-flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm py-2.5 px-6 rounded-lg transition shadow-sm active:scale-95 whitespace-nowrap"
            >
              <Search className="w-4 h-4" />
              <span>{t.searchButton}</span>
              <span className="bg-emerald-800/80 text-[11px] px-2 py-0.5 rounded font-mono tabular-nums">
                {totalRoomsCount}
              </span>
            </button>
          </div>
        </div>

        {/* Quick University / Campus Selector Pills */}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-300 font-medium flex items-center gap-1">
            <School className="w-3.5 h-3.5 text-emerald-400" />
            {t.quickCampuses}
          </span>
          {NEPAL_CAMPUSES.map(campus => {
            const isSelected = selectedCampus === campus.nameEn;
            return (
              <button
                key={campus.nameEn}
                type="button"
                onClick={() => onCampusSelect(isSelected ? '' : campus.nameEn)}
                className={`text-xs px-2.5 py-1 rounded-md transition-colors whitespace-nowrap ${
                  isSelected
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                    : 'bg-slate-800/80 text-slate-200 hover:bg-slate-700 hover:text-white border border-slate-700/60'
                }`}
              >
                {language === 'np' ? campus.nameNp : campus.nameEn}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
