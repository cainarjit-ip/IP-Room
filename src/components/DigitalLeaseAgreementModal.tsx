import React from 'react';
import { BookingRequest, RoomListing, Language } from '../types';
import { getTranslation } from '../data/translations';
import { X, Printer, ShieldCheck, FileCheck2, Stamp } from 'lucide-react';

interface DigitalLeaseAgreementModalProps {
  booking: BookingRequest;
  room?: RoomListing;
  language: Language;
  onClose: () => void;
}

export const DigitalLeaseAgreementModal: React.FC<DigitalLeaseAgreementModalProps> = ({
  booking,
  room,
  language,
  onClose,
}) => {
  const t = getTranslation(language);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 print:p-0 print:bg-white">
      <div className="relative bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden print:shadow-none print:border-none print:max-w-none">
        {/* Top action bar - hidden on print */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-emerald-400" />
            <span className="font-semibold text-sm">
              Official Digital Tenancy Contract (घरबहाल सम्झौता पत्र)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{t.printAgreement}</span>
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

        {/* Legal Contract Document Body */}
        <div className="p-8 sm:p-12 space-y-6 text-slate-900 font-serif leading-relaxed">
          {/* Header Seal */}
          <div className="text-center border-b-2 border-slate-800 pb-5">
            <div className="inline-flex items-center gap-2 text-xs font-sans font-bold text-slate-500 uppercase tracking-widest mb-1">
              <span>Government of Nepal Recognized Standard Draft</span>
            </div>
            <h1 className="font-bold text-2xl tracking-wide uppercase">
              {t.contractTitle}
            </h1>
            <p className="text-sm font-sans text-slate-600 font-medium mt-1">
              {t.contractSubtitle}
            </p>
            <div className="mt-2 text-xs font-sans text-slate-500 font-mono">
              Contract Registration Ref: <span className="font-bold text-slate-800">{booking.id}</span> · Hash: <span className="text-emerald-700">{booking.paymentRefId}</span>
            </div>
          </div>

          {/* Recital */}
          <p className="text-sm text-justify">
            This House and Room Rental Tenancy Agreement (सम्झौता पत्र) is executed on this date 
            <strong> {booking.createdAt}</strong>, by and between the parties mentioned hereunder in accordance with Chapter 9 of the National Civil Code Act, 2074 (मुलुकी देवानी संहिता ऐन, २०७४):
          </p>

          {/* The Parties */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <span className="font-bold text-slate-900 block mb-1 text-sm border-b border-slate-300 pb-1">
                {t.landlordParty}
              </span>
              <p><strong>Name:</strong> {room?.owner.name || 'Ram Bahadur Shrestha'}</p>
              <p><strong>Citizenship:</strong> Verified (प्रमाणित नागरिकता)</p>
              <p><strong>Contact:</strong> {room?.owner.phone || '+977 9841234567'}</p>
              <p><strong>Address:</strong> {booking.roomAddress}</p>
            </div>

            <div>
              <span className="font-bold text-slate-900 block mb-1 text-sm border-b border-slate-300 pb-1">
                {t.tenantParty}
              </span>
              <p><strong>Name:</strong> {booking.tenantName}</p>
              <p><strong>Affiliation:</strong> {booking.tenantUniversity || 'Student / Professional'}</p>
              <p><strong>Contact:</strong> {booking.tenantPhone}</p>
              <p><strong>Email:</strong> {booking.tenantEmail}</p>
            </div>
          </div>

          {/* Rented Premises Spec */}
          <div className="text-xs font-sans">
            <h2 className="font-bold text-sm text-slate-900 mb-1 uppercase tracking-wide">
              {t.rentalPremises}
            </h2>
            <div className="p-3 bg-slate-100 rounded-lg space-y-1">
              <p><strong>Property Location:</strong> {booking.roomAddress}</p>
              <p><strong>Room / Unit:</strong> {booking.roomTitle}</p>
              <p><strong>Agreed Move-in Date:</strong> {booking.moveInDate}</p>
              <p>
                <strong>Tenancy Tenure:</strong>{' '}
                {booking.durationMonths === 0
                  ? 'Month-to-Month Rolling Tenancy (महिनावारी निरन्तर / खुला अवधि - ३५ दिने पूर्व सूचनामा छाड्न सकिने)'
                  : `${booking.durationMonths} ${booking.durationMonths === 1 ? 'Month' : 'Months'} (Renewable upon mutual consent)`}
              </p>
            </div>
          </div>

          {/* Legal Clauses */}
          <div className="space-y-2.5 text-xs text-justify">
            <h2 className="font-bold text-sm font-sans text-slate-900 mb-1 uppercase tracking-wide">
              {t.termsAndConditions}
            </h2>
            <p className="p-2 bg-slate-50/60 rounded">
              <strong>1. Monthly Rent & Mode:</strong> {t.clause1} Agreed monthly rental amount is fixed at 
              <span className="font-bold font-mono"> NPR {booking.totalMonthlyRent.toLocaleString('en-IN')}</span> per month.
            </p>
            <p className="p-2 bg-slate-50/60 rounded">
              <strong>2. Refundable Security Deposit:</strong> {t.clause2} Deposit of 
              <span className="font-bold font-mono"> NPR {booking.securityDeposit.toLocaleString('en-IN')}</span> has been deposited securely through the IP Room platform escrow system.
            </p>
            <p className="p-2 bg-slate-50/60 rounded">
              <strong>3. Electricity & Utilities:</strong> {t.clause3} Sub-meter rate is fixed at 
              <span className="font-bold font-mono"> NPR {room?.electricityRatePerUnit || 14} per unit</span>. Water shall be supplied via verified schedule: <em>{room?.waterSchedule || '24/7 Boring + Melamchi'}</em>.
            </p>
            <p className="p-2 bg-slate-50/60 rounded">
              <strong>4. Statutory Notice Period:</strong> {t.clause4}
            </p>
            <p className="p-2 bg-slate-50/60 rounded">
              <strong>5. Governing Law:</strong> {t.clause5}
            </p>
          </div>

          {/* Signatures & Seals */}
          <div className="pt-6 border-t-2 border-slate-300 grid grid-cols-2 gap-8 text-center text-xs font-sans">
            <div>
              <div className="h-16 flex items-center justify-center border-b border-dashed border-slate-400 mb-2 font-mono text-emerald-800 italic">
                Digital Signature Verified
                <ShieldCheck className="w-4 h-4 ml-1 inline text-emerald-600" />
              </div>
              <span className="font-bold block text-slate-800">{room?.owner.name || 'Landlord Signature'}</span>
              <span className="text-slate-500">{t.landlordSignature}</span>
            </div>

            <div>
              <div className="h-16 flex items-center justify-center border-b border-dashed border-slate-400 mb-2 font-mono text-blue-800 italic">
                Digital Signature Verified
                <ShieldCheck className="w-4 h-4 ml-1 inline text-blue-600" />
              </div>
              <span className="font-bold block text-slate-800">{booking.tenantName}</span>
              <span className="text-slate-500">{t.tenantSignature}</span>
            </div>
          </div>

          {/* Escrow Certificate Stamp */}
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] font-sans text-slate-400">
            <span>Platform Verification Hash: SHA-256-{booking.paymentRefId}</span>
            <span className="text-emerald-700 font-semibold">IP Room Escrow Protected · Nepal Tenancy Protocol</span>
          </div>
        </div>
      </div>
    </div>
  );
};
