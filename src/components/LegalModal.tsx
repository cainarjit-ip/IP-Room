import React, { useState } from 'react';
import { X, ShieldCheck, FileText, Lock, Building, Phone, Mail, CheckCircle2 } from 'lucide-react';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'privacy' | 'terms';
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'privacy',
}) => {
  const [activeTab, setActiveTab] = useState<'privacy' | 'terms'>(defaultTab);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                IP Room Nepal · Legal & Compliance
              </h2>
              <p className="text-xs text-slate-500">
                Nepal Individual Privacy Protection Act 2075 & Tenancy Norms
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 px-6 bg-white gap-6">
          <button
            type="button"
            onClick={() => setActiveTab('privacy')}
            className={`py-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'privacy'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            Privacy Policy (गोपनीयता नीति)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('terms')}
            className={`py-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'terms'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Terms of Service (नियम तथा सर्तहरू)
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-600 leading-relaxed font-normal">
          {activeTab === 'privacy' ? (
            <>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-xs text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Protection of Personal Data in Nepal
                </p>
                <p className="text-[11px] leading-relaxed text-emerald-800/90">
                  IP Room Nepal is committed to protecting your personal information in strict compliance with the 
                  <strong> Individual Privacy Act, 2075 (व्यक्तिगत गोपनीयता सम्बन्धी ऐन, २०७५)</strong> of the Government of Nepal.
                </p>
              </div>

              <section className="space-y-2">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  1. Information We Collect (संकलन गरिने विवरण)
                </h3>
                <p>
                  To provide verified tenancy connections and secure room bookings, we collect:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-600">
                  <li><strong>Full Name & Contact:</strong> Mobile number (e.g. +977 98/97XXXXXXXX) and email address for account authentication and SMS/WhatsApp notifications.</li>
                  <li><strong>Student Verification (Optional for Renters):</strong> College/university name and student ID card image (for verified student discounts and campus proximity).</li>
                  <li><strong>Landlord Identity & Property Proof:</strong> Citizenship number (नागरिकता), phone number, and physical property address in Nepal to prevent scam/fake listings.</li>
                  <li><strong>Digital Lease Agreement Records:</strong> Move-in dates, agreed monthly rental amount, and security deposit details.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  2. Purpose & Use of Your Data (तथ्याङ्क प्रयोगको उद्देश्य)
                </h3>
                <p>
                  Your information is strictly used for the following operational purposes:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-600">
                  <li>Connecting genuine students/renters with verified room landlords.</li>
                  <li>Generating legally recognized digital lease agreements under the Nepal Civil Code (मुलुकी देवानी संहिता २०७४).</li>
                  <li>Preventing fraud, fake listings, unauthorized broker charges, and duplicate accounts.</li>
                  <li>Providing transparent mediation during deposit refund or rental dispute tickets.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  3. Row Level Security & Encryption (डेटा सुरक्षा)
                </h3>
                <p>
                  All databases are protected with Supabase PostgreSQL Row Level Security (RLS). 
                  Your passwords are encrypted using one-way cryptographic hashing (bcrypt/argon2). 
                  We never sell, rent, or trade your phone number, email, or citizenship details to any third-party marketing companies.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  4. Your Rights & Data Deletion (तपाईंको अधिकार)
                </h3>
                <p>
                  Under Nepalese privacy laws, you have the right to inspect, update, or request the deletion of your account 
                  and associated personal details by contacting our official support desk at 
                  <a href="mailto:iproomrent@gmail.com" className="text-emerald-700 underline font-semibold ml-1">iproomrent@gmail.com</a>.
                </p>
              </section>
            </>
          ) : (
            <>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-xs text-amber-800">
                  <Building className="w-4 h-4 text-amber-600" />
                  Tenancy Norms & Muluki Civil Code 2074
                </p>
                <p className="text-[11px] leading-relaxed text-amber-800/90">
                  All listings, rental contracts, and tenancy interactions on IP Room Nepal are subject to the
                  <strong> Muluki Civil Code 2074 (मुलुकी देवानी संहिता, २०७४ - परिच्छेद ९: घर बहाल सम्बन्धी व्यवस्था)</strong>.
                </p>
              </div>

              <section className="space-y-2">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  1. Platform Role & Zero-Broker Guarantee
                </h3>
                <p>
                  IP Room Nepal is an online matchmaking technology platform designed to eliminate middleman/broker fees (दलाली शुल्क) 
                  for students and low-income renters. IP Room connects landlords directly with renters.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  2. Landlord Obligations & Honest Information
                </h3>
                <ul className="list-disc pl-5 space-y-1 text-slate-600">
                  <li>Property owners must accurately describe room condition, water availability, electricity rates, gate closing hours, and security deposit terms.</li>
                  <li>Listing nonexistent, occupied, or mispriced rooms will result in immediate suspension and blacklist.</li>
                  <li>Security deposits must be returned in full upon move-out after deducting legitimate utility dues as mutually agreed in the digital agreement.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  3. Renter & Student Responsibilities
                </h3>
                <ul className="list-disc pl-5 space-y-1 text-slate-600">
                  <li>Renters agree to maintain the property with care, adhere to peaceful neighborhood discipline, and pay rent on the agreed date of each Nepali month.</li>
                  <li>Providing false identity, fraudulent contact numbers, or non-payment of agreed rent is subject to legal action under local Nepalese jurisdiction.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  4. Dispute Resolution & Contact Office
                </h3>
                <p>
                  In the event of a disagreement regarding deposit refund or rental terms, users may lodge an official dispute 
                  ticket via our Admin Moderation portal or visit our support office:
                </p>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-700 text-xs space-y-1 mt-2">
                  <p className="font-bold text-slate-900">IP Room Nepal Support Desk</p>
                  <p className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-emerald-600" /> Helpline: +977 9815717737</p>
                  <p className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-emerald-600" /> Official Email: iproomrent@gmail.com</p>
                  <p>Address: Biratnagar Roadcess, Morang, Nepal</p>
                </div>
              </section>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
          <p className="text-[11px] text-slate-500">
            Last Updated: Ashoj 2083 (September 2026) · All Rights Reserved
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-sm transition active:scale-95"
          >
            I Understand & Agree
          </button>
        </div>
      </div>
    </div>
  );
};
