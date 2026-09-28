import React from 'react';
import { Language } from '../types';
import { getTranslation } from '../data/translations';
import { BookOpen, Droplets, Zap, FileCheck, ShieldAlert, PhoneCall, CheckCircle } from 'lucide-react';

interface TenantGuideSectionProps {
  language: Language;
}

export const TenantGuideSection: React.FC<TenantGuideSectionProps> = ({ language }) => {
  const t = getTranslation(language);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <span className="text-xs font-bold text-emerald-700 uppercase tracking-widest">
          {language === 'np' ? 'विद्यार्थी कोठा गाइड' : 'Nepal Student Renting Handbook'}
        </span>
        <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight">
          {t.guideTitle}
        </h1>
        <p className="text-xs sm:text-sm text-slate-600">
          Everything college students and young professionals need to know before moving into a flat in Kathmandu, Pokhara, or Chitwan.
        </p>
      </div>

      {/* Guide Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Water */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs hover:shadow-md transition space-y-3">
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
            <Droplets className="w-5 h-5" />
          </div>
          <h2 className="font-bold text-base text-slate-900">{t.guide1Title}</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            {t.guide1Desc}
          </p>
          <div className="pt-2 text-[11px] text-sky-800 bg-sky-50/70 p-2.5 rounded-lg">
            💡 <strong>Pro Tip:</strong> Always ask which days Melamchi supply runs in that ward, and confirm if solar hot water works in foggy winter months.
          </div>
        </div>

        {/* Card 2: Electricity Sub-meter */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs hover:shadow-md transition space-y-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Zap className="w-5 h-5" />
          </div>
          <h2 className="font-bold text-base text-slate-900">{t.guide2Title}</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            {t.guide2Desc}
          </p>
          <div className="pt-2 text-[11px] text-amber-900 bg-amber-50/70 p-2.5 rounded-lg">
            💡 <strong>Pro Tip:</strong> Take a photo of your sub-meter on the day you move in so you only pay for units you consume.
          </div>
        </div>

        {/* Card 3: Tenancy Contracts */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs hover:shadow-md transition space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <FileCheck className="w-5 h-5" />
          </div>
          <h2 className="font-bold text-base text-slate-900">{t.guide3Title}</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            {t.guide3Desc}
          </p>
          <div className="pt-2 text-[11px] text-emerald-900 bg-emerald-50/70 p-2.5 rounded-lg">
            💡 <strong>Pro Tip:</strong> IP Room generates automatic contracts under Nepal Civil Code 2074 with mandatory 35-day notice clause.
          </div>
        </div>
      </div>

      {/* Emergency & Helpline Directory */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 space-y-4">
        <div className="flex items-center gap-2">
          <PhoneCall className="w-5 h-5 text-emerald-400" />
          <h2 className="font-bold text-sm text-white uppercase tracking-wider">
            Important Helpline Numbers in Nepal
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
          <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
            <span className="text-slate-400 block text-[10px]">Nepal Police (Emergency)</span>
            <span className="font-bold text-base text-white">100</span>
          </div>
          <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
            <span className="text-slate-400 block text-[10px]">Ambulance Services</span>
            <span className="font-bold text-base text-white">102</span>
          </div>
          <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
            <span className="text-slate-400 block text-[10px]">NEA Electricity Complain</span>
            <span className="font-bold text-base text-white">1149</span>
          </div>
          <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
            <span className="text-slate-400 block text-[10px]">IP Room Escrow Support</span>
            <span className="font-bold text-base text-emerald-400">01-4422XXX</span>
          </div>
        </div>
      </div>
    </div>
  );
};
