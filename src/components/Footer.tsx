import React, { useState } from 'react';
import { Language } from '../types';
import { getTranslation } from '../data/translations';
import { ShieldCheck, MapPin, Heart, Lock, FileText } from 'lucide-react';
import { LegalModal } from './LegalModal';
import ipRoomLogo from '../assets/images/ip_room_logo_1791190756404.jpg';

interface FooterProps {
  language: Language;
  onNavigateTab: (tab: 'browse' | 'map' | 'guide') => void;
}

export const Footer: React.FC<FooterProps> = ({ language, onNavigateTab }) => {
  const t = getTranslation(language);
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState<'privacy' | 'terms'>('privacy');

  const openLegal = (tab: 'privacy' | 'terms') => {
    setLegalModalTab(tab);
    setIsLegalModalOpen(true);
  };

  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Info */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full p-0.5 bg-gradient-to-tr from-amber-600/40 via-emerald-600/30 to-amber-500/50 shadow-md shrink-0 flex items-center justify-center">
                <img
                  src={ipRoomLogo}
                  alt="IP Room Rent Nepal"
                  className="w-full h-full object-cover rounded-full"
                />
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
              <li>
                <button
                  type="button"
                  onClick={() => openLegal('privacy')}
                  className="hover:text-emerald-400 transition flex items-center gap-1.5 text-left"
                >
                  <Lock className="w-3 h-3 text-emerald-500" />
                  Privacy Policy (गोपनीयता नीति)
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => openLegal('terms')}
                  className="hover:text-emerald-400 transition flex items-center gap-1.5 text-left"
                >
                  <FileText className="w-3 h-3 text-emerald-500" />
                  Terms of Service (नियम तथा सर्तहरू)
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
          <div className="flex flex-wrap items-center gap-3">
            <span>© 2026 IP Room (नेपाल). All rights reserved.</span>
            <span>·</span>
            <button
              type="button"
              onClick={() => openLegal('privacy')}
              className="hover:text-slate-300 transition underline"
            >
              Privacy Policy
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => openLegal('terms')}
              className="hover:text-slate-300 transition underline"
            >
              Terms of Service
            </button>
          </div>
          <div className="flex items-center gap-1">
            <span>Built for students across Nepal with</span>
            <Heart className="w-3 h-3 text-rose-500 fill-current" />
          </div>
        </div>
      </div>

      <LegalModal
        isOpen={isLegalModalOpen}
        onClose={() => setIsLegalModalOpen(false)}
        defaultTab={legalModalTab}
      />
    </footer>
  );
};
