import React from 'react';
import { Language } from '../types';
import { getTranslation } from '../data/translations';
import { ShieldCheck, MapPin, Heart } from 'lucide-react';

interface FooterProps {
  language: Language;
  onNavigateTab: (tab: 'browse' | 'map' | 'guide') => void;
}

export const Footer: React.FC<FooterProps> = ({ language, onNavigateTab }) => {
  const t = getTranslation(language);

  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Info */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-black text-base shadow-sm">
                IP
              </div>
              <span className="font-display font-extrabold text-lg text-white">
                IP Room
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Nepal's verified rental marketplace connecting students and professionals with trusted room owners across all 77 districts.
            </p>
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>Escrow Tenancy Protection Active</span>
            </div>
          </div>

          {/* Major University Cities */}
          <div>
            <h2 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
              Top Student Cities
            </h2>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>Kathmandu (Kirtipur, Baneshwor, Putalisadak)</li>
              <li>Lalitpur (Pulchowk, Patan, Sanepa)</li>
              <li>Bhaktapur (Sano Thimi, Dudhpati)</li>
              <li>Pokhara (Bagar, Lakeside, Lamachaur)</li>
              <li>Chitwan (Bharatpur Medical City)</li>
              <li>Dharan (BPKIHS Campus Area)</li>
              <li>Biratnagar (Main Road, Traffic Chowk, Tintolia)</li>
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h2 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
              Platform & Legal
            </h2>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigateTab('browse')}
                  className="hover:text-white transition"
                >
                  Browse All Rooms
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigateTab('map')}
                  className="hover:text-white transition"
                >
                  Interactive Map View
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigateTab('guide')}
                  className="hover:text-white transition"
                >
                  Student Renting Handbook
                </button>
              </li>
              <li>Nepal Civil Code 2074 Tenancy Norms</li>
              <li>Khalti & eSewa Escrow Terms</li>
            </ul>
          </div>

          {/* Verified Support Contact */}
          <div>
            <h2 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
              Biratnagar Support Office
            </h2>
            <div className="space-y-2 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Biratnagar Roadcess, Morang, Nepal</span>
              </div>
              <p>
                Email:{' '}
                <a
                  href="mailto:iproomrent@gmail.com"
                  className="hover:text-emerald-400 underline transition"
                >
                  iproomrent@gmail.com
                </a>
              </p>
              <p>
                Helpline:{' '}
                <a
                  href="tel:+9779815717737"
                  className="hover:text-emerald-400 underline transition"
                >
                  +977 9815717737
                </a>
              </p>
              <p className="text-[11px] text-slate-500 pt-1">
                Operating hours: Sun – Fri, 9:00 AM – 6:00 PM NPT
              </p>
            </div>
          </div>
        </div>

        {/* Quiet Copyright Row */}
        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            © 2026 IP Room (नेपाल). All rights reserved.
          </div>
          <div className="flex items-center gap-1">
            <span>Built for students across Nepal with</span>
            <Heart className="w-3 h-3 text-rose-500 fill-current" />
          </div>
        </div>
      </div>
    </footer>
  );
};
