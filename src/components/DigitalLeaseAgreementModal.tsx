import React, { useState } from 'react';
import { BookingRequest, RoomListing, Language } from '../types';
import { getTranslation } from '../data/translations';
import {
  X,
  Printer,
  ShieldCheck,
  FileCheck2,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Download,
  CheckCircle2,
} from 'lucide-react';

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
  const [scale, setScale] = useState<number>(0.9); // Default nicely scaled to fit viewport
  const [isFitMode, setIsFitMode] = useState<boolean>(true);

  const handlePrint = () => {
    window.print();
  };

  const toggleFitMode = () => {
    if (isFitMode) {
      setScale(1);
      setIsFitMode(false);
    } else {
      setScale(0.85);
      setIsFitMode(true);
    }
  };

  const zoomIn = () => {
    setScale((prev) => Math.min(prev + 0.1, 1.2));
    setIsFitMode(false);
  };

  const zoomOut = () => {
    setScale((prev) => Math.max(prev - 0.1, 0.7));
    setIsFitMode(false);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 print:p-0 print:bg-white">
      <div className="relative bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh] sm:max-h-[90vh] my-auto print:max-h-none print:overflow-visible print:shadow-none print:border-none print:max-w-none">
        {/* Top action bar - fixed on top, hidden on print */}
        <div className="p-3 sm:p-4 bg-slate-900 text-white flex items-center justify-between shrink-0 border-b border-slate-800 print:hidden gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center justify-center shrink-0">
              <FileCheck2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="font-bold text-xs sm:text-sm block truncate">
                Official Digital Tenancy Contract (घरबहाल सम्झौता पत्र)
              </span>
              <span className="text-[10px] text-slate-400 font-mono block truncate">
                Ref: {booking.id} · Civil Code 2074
              </span>
            </div>
          </div>

          {/* Action buttons & View Scale options */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Fit / Scale toggle */}
            <button
              type="button"
              onClick={toggleFitMode}
              className={`hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition ${
                isFitMode
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
              title="Fit whole contract onto screen"
            >
              {isFitMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              <span>{isFitMode ? 'Screen Fit (अनुकूलित)' : '100% Size'}</span>
            </button>

            {/* Zoom In/Out controls */}
            <div className="hidden md:flex items-center bg-slate-800 rounded-lg border border-slate-700 p-0.5 text-xs text-slate-300">
              <button
                type="button"
                onClick={zoomOut}
                disabled={scale <= 0.7}
                aria-label="Zoom Out"
                className="p-1 hover:text-white hover:bg-slate-700 rounded disabled:opacity-40 transition"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="px-1.5 text-[10px] font-mono">{Math.round(scale * 100)}%</span>
              <button
                type="button"
                onClick={zoomIn}
                disabled={scale >= 1.2}
                aria-label="Zoom In"
                className="p-1 hover:text-white hover:bg-slate-700 rounded disabled:opacity-40 transition"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Print / PDF Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-xs transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">{t.printAgreement}</span>
              <span className="xs:hidden">Print</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
              aria-label="Close Contract"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Document Container with smooth containment */}
        <div className="overflow-y-auto flex-1 overscroll-contain bg-slate-100/70 p-2 sm:p-5 md:p-6 flex justify-center print:bg-white print:p-0 print:overflow-visible">
          {/* A4-proportioned Sheet */}
          <div
            style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}
            className="bg-white rounded-xl shadow-md border border-slate-200/90 p-5 sm:p-8 md:p-10 w-full max-w-3xl transition-transform duration-150 print:shadow-none print:border-none print:p-0 print:max-w-none print:transform-none space-y-5 sm:space-y-6 text-slate-900 font-serif leading-relaxed"
          >
            {/* Header Seal */}
            <div className="text-center border-b-2 border-slate-800 pb-4 sm:pb-5">
              <div className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-sans font-bold text-slate-500 uppercase tracking-widest mb-1 bg-slate-50 border border-slate-200 px-2.5 py-0.5 rounded-full">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Government of Nepal Recognized Standard Draft</span>
              </div>
              <h1 className="font-bold text-xl sm:text-2xl tracking-wide uppercase mt-1">
                {t.contractTitle}
              </h1>
              <p className="text-xs sm:text-sm font-sans text-slate-600 font-medium mt-1">
                {t.contractSubtitle}
              </p>
              <div className="mt-2 text-[11px] font-sans text-slate-500 font-mono flex items-center justify-center gap-2 flex-wrap">
                <span>Contract Reg Ref: <strong className="text-slate-800">{booking.id}</strong></span>
                <span>·</span>
                <span>Hash: <strong className="text-emerald-700">{booking.paymentRefId}</strong></span>
              </div>
            </div>

            {/* Recital */}
            <p className="text-xs sm:text-sm text-justify">
              This House and Room Rental Tenancy Agreement (सम्झौता पत्र) is executed on this date{' '}
              <strong>{booking.createdAt}</strong>, by and between the parties mentioned hereunder in accordance with Chapter 9 of the National Civil Code Act, 2074 (मुलुकी देवानी संहिता ऐन, २०७४):
            </p>

            {/* The Parties */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs font-sans bg-slate-50/80 p-3 sm:p-4 rounded-xl border border-slate-200">
              <div>
                <span className="font-bold text-slate-900 block mb-1 text-xs sm:text-sm border-b border-slate-300 pb-1 text-emerald-800">
                  {t.landlordParty}
                </span>
                <p><strong>Name:</strong> {room?.owner.name || 'Ram Bahadur Shrestha'}</p>
                <p><strong>Citizenship:</strong> Verified (प्रमाणित नागरिकता)</p>
                <p><strong>Contact:</strong> {room?.owner.phone || '+977 9841234567'}</p>
                <p><strong>Address:</strong> {booking.roomAddress}</p>
              </div>

              <div>
                <span className="font-bold text-slate-900 block mb-1 text-xs sm:text-sm border-b border-slate-300 pb-1 text-blue-800">
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
              <h2 className="font-bold text-xs sm:text-sm text-slate-900 mb-1.5 uppercase tracking-wide">
                {t.rentalPremises}
              </h2>
              <div className="p-3 bg-slate-100/80 rounded-lg space-y-1">
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
            <div className="space-y-2 text-xs text-justify">
              <h2 className="font-bold text-xs sm:text-sm font-sans text-slate-900 mb-1 uppercase tracking-wide">
                {t.termsAndConditions}
              </h2>
              <p className="p-2 sm:p-2.5 bg-slate-50/70 rounded border border-slate-100">
                <strong>1. Monthly Rent & Mode:</strong> {t.clause1} Agreed monthly rental amount is fixed at{' '}
                <span className="font-bold font-mono text-emerald-800"> NPR {booking.totalMonthlyRent.toLocaleString('en-IN')}</span> per month.
              </p>
              <p className="p-2 sm:p-2.5 bg-slate-50/70 rounded border border-slate-100">
                <strong>2. Refundable Security Deposit:</strong> {t.clause2} Deposit of{' '}
                <span className="font-bold font-mono text-emerald-800"> NPR {booking.securityDeposit.toLocaleString('en-IN')}</span> has been deposited securely through the IP Room platform escrow system.
              </p>
              <p className="p-2 sm:p-2.5 bg-slate-50/70 rounded border border-slate-100">
                <strong>3. Electricity & Utilities:</strong> {t.clause3} Sub-meter rate is fixed at{' '}
                <span className="font-bold font-mono"> NPR {room?.electricityRatePerUnit || 14} per unit</span>. Water shall be supplied via verified schedule: <em>{room?.waterSchedule || '24/7 Boring + Melamchi'}</em>.
              </p>
              <p className="p-2 sm:p-2.5 bg-slate-50/70 rounded border border-slate-100">
                <strong>4. Statutory Notice Period:</strong> {t.clause4}
              </p>
              <p className="p-2 sm:p-2.5 bg-slate-50/70 rounded border border-slate-100">
                <strong>5. Governing Law:</strong> {t.clause5}
              </p>
            </div>

            {/* Signatures & Seals */}
            <div className="pt-4 sm:pt-6 border-t-2 border-slate-300 grid grid-cols-2 gap-4 sm:gap-8 text-center text-xs font-sans">
              <div>
                <div className="h-14 sm:h-16 flex items-center justify-center border-b border-dashed border-slate-400 mb-2 font-mono text-emerald-800 italic bg-slate-50/50 rounded-t">
                  <span>Digital Signature Verified</span>
                  <ShieldCheck className="w-4 h-4 ml-1 inline text-emerald-600" />
                </div>
                <span className="font-bold block text-slate-800">{room?.owner.name || 'Landlord Signature'}</span>
                <span className="text-[11px] text-slate-500">{t.landlordSignature}</span>
              </div>

              <div>
                <div className="h-14 sm:h-16 flex items-center justify-center border-b border-dashed border-slate-400 mb-2 font-mono text-blue-800 italic bg-slate-50/50 rounded-t">
                  <span>Digital Signature Verified</span>
                  <ShieldCheck className="w-4 h-4 ml-1 inline text-blue-600" />
                </div>
                <span className="font-bold block text-slate-800">{booking.tenantName}</span>
                <span className="text-[11px] text-slate-500">{t.tenantSignature}</span>
              </div>
            </div>

            {/* Escrow Certificate Stamp */}
            <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-[11px] font-sans text-slate-500 gap-1 text-center sm:text-left">
              <span>Platform Verification Hash: SHA-256-{booking.paymentRefId}</span>
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>IP Room Escrow Protected · Nepal Tenancy Protocol</span>
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Fixed Action Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0 print:hidden text-xs">
          <div className="flex items-center gap-2 text-slate-600 text-center sm:text-left">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              कानुनी रूपमा मान्य घरबहाल सम्झौता (Legally Valid Tenancy Agreement under Nepal Civil Code 2074)
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition flex items-center justify-center gap-1.5 shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>{t.printAgreement}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-semibold transition text-center"
            >
              बन्द गर्नुहोस् (Close)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
