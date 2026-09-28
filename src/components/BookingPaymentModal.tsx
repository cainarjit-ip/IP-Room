import React, { useState } from 'react';
import { RoomListing, Language, BookingRequest, UserProfile } from '../types';
import { getTranslation } from '../data/translations';
import { X, ShieldCheck, CheckCircle2, Lock, ArrowRight, Wallet, CreditCard, Banknote, Calendar } from 'lucide-react';
import { recordPayment, generateUUID, isValidUUID } from '../services/supabase';

interface BookingPaymentModalProps {
  room: RoomListing | null;
  language: Language;
  currentUser?: UserProfile | null;
  onClose: () => void;
  onBookingComplete: (booking: BookingRequest) => void;
}

export const BookingPaymentModal: React.FC<BookingPaymentModalProps> = ({
  room,
  language,
  currentUser,
  onClose,
  onBookingComplete,
}) => {
  if (!room) return null;

  const t = getTranslation(language);

  // Form states
  const [moveInDate, setMoveInDate] = useState('2026-10-01');
  const [durationMonths, setDurationMonths] = useState(3);
  const [tenantName, setTenantName] = useState(currentUser?.name || 'Aayush Sharma');
  const [tenantPhone, setTenantPhone] = useState(currentUser?.phone || '+977 9841998877');
  const [tenantEmail, setTenantEmail] = useState(currentUser?.email || 'aayush.sharma@gmail.com');
  const [tenantUniversity, setTenantUniversity] = useState(currentUser?.university || 'Tribhuvan University (TU)');
  
  // Payment gateway selection
  const [paymentMethod, setPaymentMethod] = useState<'khalti' | 'esewa' | 'card' | 'bank_transfer'>('khalti');
  const [walletPhone, setWalletPhone] = useState('9841998877');
  const [walletPin, setWalletPin] = useState('1234');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedBooking, setCompletedBooking] = useState<BookingRequest | null>(null);

  // Discount calculation
  const discountMultiplier = durationMonths === 12 ? 0.90 : durationMonths === 6 ? 0.95 : 1.0;
  const effectiveMonthlyRent = Math.round(room.price * discountMultiplier);
  const securityDeposit = room.deposit;
  const platformFee = 0; // Free student promotion
  const totalDueNow = effectiveMonthlyRent + securityDeposit + platformFee;

  const handleProcessPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    setTimeout(() => {
      setIsProcessing(false);
      const bookingId = generateUUID();
      const tenantUUID = (currentUser?.id && isValidUUID(currentUser.id)) ? currentUser.id : generateUUID();
      const ownerUUID = (room.owner?.id && isValidUUID(room.owner.id)) ? room.owner.id : generateUUID();
      const roomUUID = (room.id && isValidUUID(room.id)) ? room.id : generateUUID();

      const newBooking: BookingRequest = {
        id: bookingId,
        roomId: roomUUID,
        roomTitle: room.title,
        roomAddress: room.location.fullAddress,
        roomPrice: effectiveMonthlyRent,
        roomImage: room.images[0] || '',
        tenantId: tenantUUID,
        tenantName,
        tenantPhone,
        tenantEmail,
        tenantUniversity,
        ownerId: ownerUUID,
        moveInDate,
        durationMonths,
        totalMonthlyRent: effectiveMonthlyRent,
        securityDeposit,
        totalPaid: totalDueNow,
        paymentMethod,
        paymentRefId: `TXN-${paymentMethod.toUpperCase()}-${Date.now().toString().slice(-6)}`,
        status: 'confirmed',
        contractGenerated: true,
        createdAt: new Date().toISOString().split('T')[0]
      };

      setCompletedBooking(newBooking);
      onBookingComplete(newBooking);
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="relative bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="font-bold text-base">
                {t.bookingModalTitle}
              </h2>
              <p className="text-xs text-slate-300">
                Escrow Protected Tenancy Deposit · Nepal Legal Guarantee
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        {!completedBooking ? (
          <form onSubmit={handleProcessPayment} className="p-5 sm:p-6 space-y-6">
            {/* Selected Room Summary */}
            <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
              <img
                src={room.images[0]}
                alt={room.title}
                className="w-16 h-16 rounded-lg object-cover shrink-0"
              />
              <div className="min-w-0">
                <span className="text-[11px] font-semibold text-emerald-700 uppercase">
                  {room.location.municipality} · Ward {room.location.ward}
                </span>
                <h3 className="font-bold text-xs text-slate-900 truncate">
                  {language === 'np' ? room.titleNp : room.title}
                </h3>
                <span className="text-xs text-slate-500 font-mono tabular-nums">
                  Base rent: रु. {room.price.toLocaleString('en-IN')}/mo · Deposit: रु. {room.deposit.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Move-in and duration selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{t.moveInDate}</span>
                </label>
                <input
                  type="date"
                  required
                  value={moveInDate}
                  onChange={e => setMoveInDate(e.target.value)}
                  className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.durationLabel}
                </label>
                <select
                  value={durationMonths}
                  onChange={e => setDurationMonths(Number(e.target.value))}
                  className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value={3}>{t.duration3Months}</option>
                  <option value={6}>{t.duration6Months}</option>
                  <option value={12}>{t.duration12Months}</option>
                </select>
              </div>
            </div>

            {/* Tenant Information */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Tenant Information (for Digital Tenancy Contract)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-slate-600 block mb-1">Full Legal Name</label>
                  <input
                    type="text"
                    required
                    value={tenantName}
                    onChange={e => setTenantName(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-slate-600 block mb-1">Nepali Phone (OTP Verified)</label>
                  <input
                    type="text"
                    required
                    value={tenantPhone}
                    onChange={e => setTenantPhone(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-600 block mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={tenantEmail}
                    onChange={e => setTenantEmail(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-slate-600 block mb-1">University / College / Workplace</label>
                  <input
                    type="text"
                    value={tenantUniversity}
                    onChange={e => setTenantUniversity(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Payment Breakdown */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-2 text-xs">
              <div className="font-bold text-slate-900 mb-1">{t.paymentBreakdown}</div>
              <div className="flex justify-between text-slate-600">
                <span>{t.firstMonthRent} ({durationMonths >= 6 ? `${durationMonths === 12 ? '10%' : '5%'} Discount Applied` : 'Standard'}):</span>
                <span className="font-mono tabular-nums font-semibold">रु. {effectiveMonthlyRent.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>{t.securityDepositRefundable}:</span>
                <span className="font-mono tabular-nums font-semibold">रु. {securityDeposit.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>{t.platformEscrowFee}:</span>
                <span className="text-emerald-700 font-semibold font-mono">रु. 0 (Free Student Tier)</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-sm text-slate-900">
                <span>{t.totalPayable}:</span>
                <span className="font-mono tabular-nums text-emerald-800 text-base">
                  रु. {totalDueNow.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Nepal Payment Gateways Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-2.5 uppercase tracking-wider">
                {t.selectPaymentMethod}
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {/* Khalti */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('khalti')}
                  className={`p-3 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1.5 ${
                    paymentMethod === 'khalti'
                      ? 'border-purple-600 bg-purple-50 text-purple-900 font-bold ring-2 ring-purple-500'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="w-7 h-7 rounded-full bg-purple-700 text-white font-bold flex items-center justify-center text-xs">
                    K
                  </div>
                  <span>खल्ती (Khalti)</span>
                </button>

                {/* eSewa */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('esewa')}
                  className={`p-3 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1.5 ${
                    paymentMethod === 'esewa'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold ring-2 ring-emerald-500'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">
                    e
                  </div>
                  <span>ईसेवा (eSewa)</span>
                </button>

                {/* Stripe / Card */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`p-3 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1.5 ${
                    paymentMethod === 'card'
                      ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold ring-2 ring-blue-500'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <CreditCard className="w-6 h-6 text-blue-600" />
                  <span>Debit / Card</span>
                </button>

                {/* Cash on Handover */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('bank_transfer')}
                  className={`p-3 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1.5 ${
                    paymentMethod === 'bank_transfer'
                      ? 'border-amber-600 bg-amber-50 text-amber-900 font-bold ring-2 ring-amber-500'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <Banknote className="w-6 h-6 text-amber-600" />
                  <span>On Move-in</span>
                </button>
              </div>

              {/* Dynamic Simulated Gateway Input */}
              {(paymentMethod === 'khalti' || paymentMethod === 'esewa') && (
                <div className={`mt-3 p-3.5 rounded-xl border text-xs space-y-2.5 ${paymentMethod === 'khalti' ? 'bg-purple-50/60 border-purple-200' : 'bg-emerald-50/60 border-emerald-200'}`}>
                  <div className="font-semibold text-slate-900 flex items-center justify-between">
                    <span>
                      {paymentMethod === 'khalti' ? 'Khalti Wallet Verification' : 'eSewa Mobile ID Login'}
                    </span>
                    <span className="text-[10px] text-slate-500">Test mode sandbox</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-slate-600 block mb-0.5">Mobile / Wallet ID</label>
                      <input
                        type="text"
                        value={walletPhone}
                        onChange={e => setWalletPhone(e.target.value)}
                        className="w-full p-2 bg-white border border-slate-200 rounded font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-slate-600 block mb-0.5">MPIN / Secret Code</label>
                      <input
                        type="password"
                        value={walletPin}
                        onChange={e => setWalletPin(e.target.value)}
                        className="w-full p-2 bg-white border border-slate-200 rounded font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Escrow Guarantee Disclaimer */}
            <div className="text-xs text-slate-500 flex items-start gap-2 bg-emerald-50/50 p-3 rounded-lg border border-emerald-100">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                {t.escrowNote}
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isProcessing}
              className="w-full py-3.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm rounded-xl transition shadow-md flex items-center justify-center gap-2 active:scale-95 disabled:opacity-75"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{t.processingPayment}</span>
                </>
              ) : (
                <>
                  <span>Pay रु. {totalDueNow.toLocaleString('en-IN')} & Generate Tenancy Lease</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          /* Booking Confirmation & Contract Ready */
          <div className="p-6 sm:p-8 text-center space-y-5">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h3 className="font-display font-bold text-2xl text-slate-900">
                {t.bookingSuccessTitle}
              </h3>
              <p className="mt-1 text-sm text-slate-600 max-w-md mx-auto">
                {t.bookingSuccessMsg}
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 max-w-md mx-auto text-left text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Booking Reference:</span>
                <span className="font-mono font-bold text-slate-900">{completedBooking.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Gateway Ref:</span>
                <span className="font-mono text-emerald-700 font-semibold">{completedBooking.paymentRefId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Scheduled Move-in:</span>
                <span className="font-semibold text-slate-900">{completedBooking.moveInDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Escrow Deposited:</span>
                <span className="font-mono font-bold text-slate-900">रु. {completedBooking.totalPaid.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-6 py-2.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition shadow-xs"
              >
                {t.viewContractBtn}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
