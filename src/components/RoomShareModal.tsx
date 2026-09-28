import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { RoomListing, Language } from '../types';
import {
  X,
  QrCode,
  Download,
  Copy,
  Check,
  Printer,
  Share2,
  ExternalLink,
  MessageCircle,
  MapPin,
  ShieldCheck,
  Droplets,
  Zap,
  Wifi,
  Phone,
  Building,
  School,
  FileText,
  Sparkles,
} from 'lucide-react';

interface RoomShareModalProps {
  room: RoomListing;
  language: Language;
  onClose: () => void;
}

export const RoomShareModal: React.FC<RoomShareModalProps> = ({
  room,
  language,
  onClose,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'quick_qr' | 'print_poster'>('quick_qr');
  const posterRef = useRef<HTMLDivElement>(null);

  // Generate shareable URL with room query parameter
  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/?room=${encodeURIComponent(room.id)}`
    : `https://iproom.com.np/?room=${room.id}`;

  // Generate QR Code data URL using qrcode library
  useEffect(() => {
    QRCode.toDataURL(shareUrl, {
      width: 360,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then(url => {
        setQrDataUrl(url);
      })
      .catch(err => {
        console.error('Failed to generate QR Code:', err);
      });
  }, [shareUrl]);

  // Handle Copy to Clipboard
  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const input = document.createElement('input');
        input.value = shareUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.warn('Copy link error:', err);
    }
  };

  // Handle Download QR Code as PNG image
  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `IPRoom-${room.id}-QR.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle Print Poster / Flyer
  const handlePrintPoster = () => {
    window.print();
  };

  // WhatsApp share link
  const whatsappText = encodeURIComponent(
    `🏠 Check out this room on IP Room Nepal!\n\n${room.title}\n📍 ${room.location.fullAddress}\n💰 Rent: रु. ${room.price.toLocaleString('en-IN')}/mo\n💧 Water: ${room.waterSchedule}\n\nScan QR or view details: ${shareUrl}`
  );
  const whatsappUrl = `https://wa.me/?text=${whatsappText}`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div
        className="relative bg-white rounded-3xl max-w-xl w-full max-h-[94vh] overflow-y-auto shadow-2xl border border-slate-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-qr-title"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md px-6 py-4 border-b border-slate-100 flex items-center justify-between z-20">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 id="share-qr-title" className="font-bold text-sm text-slate-900">
                {language === 'np' ? 'QR कोड मार्फत सेयर गर्नुहोस्' : 'Share via QR Code'}
              </h2>
              <p className="text-[11px] text-slate-500">
                Scan with any smartphone camera to open room listing directly
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher: Quick QR vs Printable Room Notice Poster */}
        <div className="px-6 pt-4">
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode('quick_qr')}
              className={`flex-1 py-2 px-3 rounded-lg transition flex items-center justify-center gap-2 ${
                viewMode === 'quick_qr'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <QrCode className="w-4 h-4 text-emerald-600" />
              <span>Mobile QR Code</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('print_poster')}
              className={`flex-1 py-2 px-3 rounded-lg transition flex items-center justify-center gap-2 ${
                viewMode === 'print_poster'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-4 h-4 text-emerald-600" />
              <span>Physical Notice Poster (कोठा खाली छ)</span>
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6">
          {viewMode === 'quick_qr' ? (
            <div className="space-y-6">
              {/* QR Code Presentation Box */}
              <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-4">
                <div className="relative p-4 bg-white rounded-2xl shadow-md border border-slate-200">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt={`QR code for ${room.title}`}
                      className="w-56 h-56 object-contain rounded-lg"
                    />
                  ) : (
                    <div className="w-56 h-56 flex items-center justify-center text-slate-400 text-xs">
                      Generating QR Code...
                    </div>
                  )}
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[10px] font-bold px-3 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-emerald-200" />
                    <span>Scan on Mobile</span>
                  </div>
                </div>

                <div className="space-y-1 max-w-sm">
                  <h3 className="font-bold text-sm text-slate-900 line-clamp-1">
                    {language === 'np' ? room.titleNp : room.title}
                  </h3>
                  <p className="text-xs text-slate-500 flex items-center justify-center gap-1">
                    <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span className="truncate">{room.location.municipality}, Ward {room.location.ward}</span>
                  </p>
                  <p className="text-sm font-extrabold text-emerald-700 font-mono">
                    रु. {room.price.toLocaleString('en-IN')}/mo
                  </p>
                </div>
              </div>

              {/* Direct Link Share & Copy */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Direct Room Link
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    className="flex-1 bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2.5 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-xl transition ${
                      copied
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-900 hover:bg-slate-800 text-white'
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Quick Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleDownloadQr}
                  className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition border border-slate-200"
                >
                  <Download className="w-4 h-4 text-slate-600" />
                  <span>Download QR PNG</span>
                </button>

                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-xs"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Share on WhatsApp</span>
                </a>
              </div>
            </div>
          ) : (
            /* Printable Physical Notice Poster / Flyer (कोठा खाली छ) */
            <div className="space-y-6">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Designed for physical university gates & notice boards</span>
                <button
                  type="button"
                  onClick={handlePrintPoster}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Notice Flyer</span>
                </button>
              </div>

              {/* Printable Poster Canvas */}
              <div
                ref={posterRef}
                className="bg-white border-2 border-slate-900 rounded-2xl p-6 sm:p-8 space-y-5 shadow-lg relative print:m-0 print:border-none print:shadow-none"
              >
                {/* Notice Header Banner */}
                <div className="text-center pb-4 border-b-2 border-slate-900 space-y-1">
                  <div className="inline-block bg-slate-900 text-white font-extrabold text-sm sm:text-base px-4 py-1 rounded-md uppercase tracking-wider">
                    🇳🇵 कोठा खाली छ · ROOM TO LET
                  </div>
                  <h3 className="font-display font-extrabold text-lg sm:text-xl text-slate-900 pt-1">
                    {language === 'np' ? room.titleNp : room.title}
                  </h3>
                  <p className="text-xs text-slate-600 flex items-center justify-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                    <span>{room.location.fullAddress}</span>
                    {room.location.nearbyCampus && (
                      <span className="font-semibold text-emerald-800">
                        (Near {room.location.nearbyCampus})
                      </span>
                    )}
                  </p>
                </div>

                {/* Poster Body: Rent & Features Grid */}
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[11px] text-slate-500 block">मासिक भाडा (Monthly Rent)</span>
                    <span className="text-lg font-bold font-mono text-emerald-700">
                      रु. {room.price.toLocaleString('en-IN')}/mo
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[11px] text-slate-500 block">कोठाको प्रकार (Room Type)</span>
                    <span className="text-sm font-bold text-slate-900 capitalize">
                      {room.roomType.replace('_', ' ')} ({room.floor})
                    </span>
                  </div>
                </div>

                {/* Key Amenities Highlights */}
                <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 text-xs space-y-1.5">
                  <span className="font-bold text-emerald-900 block text-[11px] uppercase tracking-wide">
                    सुविधाहरू (Amenities & Water Guarantee):
                  </span>
                  <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-700">
                    <div className="flex items-center gap-1.5">
                      <Droplets className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="truncate">{room.waterSchedule}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>{room.amenities.electricityBackup ? 'Inverter Solar Backup' : 'Standard Grid'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Wifi className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                      <span>{room.amenities.wifi ? 'High-Speed WiFi' : 'No WiFi'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{room.floor} Floor · {room.occupancyPreference.replace('_', ' ')}</span>
                    </div>
                  </div>
                </div>

                {/* Centered QR Code with Scan Instructions */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-5 pt-2 border-t border-slate-200">
                  <div className="space-y-1 text-center sm:text-left">
                    <span className="text-xs font-bold text-slate-900 block uppercase tracking-wide">
                      Scan with Phone Camera
                    </span>
                    <p className="text-[11px] text-slate-600 max-w-[200px] leading-relaxed">
                      Instant 360° virtual tour, HD photos, student reviews, and direct digital booking.
                    </p>
                    <div className="pt-2 flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="font-mono font-bold text-xs text-slate-800">
                        {room.owner.phone}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-white border-2 border-slate-900 rounded-2xl shadow-xs shrink-0 text-center">
                    {qrDataUrl && (
                      <img
                        src={qrDataUrl}
                        alt="Scan QR"
                        className="w-32 h-32 object-contain"
                      />
                    )}
                    <span className="text-[9px] font-mono font-semibold text-slate-500 block mt-1">
                      IP ROOM NEPAL
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons for Poster */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handlePrintPoster}
                  className="flex-1 py-3 px-4 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition shadow-md flex items-center justify-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Notice Flyer / Save PDF</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadQr}
                  className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition border border-slate-200 flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4 text-slate-600" />
                  <span>Save QR</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
