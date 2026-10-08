import React, { useState } from 'react';
import { Language, ChatReportReason } from '../../types';
import { reportChatMessage } from '../../services/supabase/chatService';
import { ShieldAlert, X, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';

interface ReportModalProps {
  conversationId: string;
  reporterId: string;
  reportedUserId: string;
  reportedUserName: string;
  messageId?: string;
  language: Language;
  onClose: () => void;
  onSuccess: () => void;
}

const REPORT_REASONS: { id: ChatReportReason; labelEn: string; labelNp: string }[] = [
  { id: 'Spam', labelEn: 'Spam or unsolicited advertising', labelNp: 'स्पाम वा अनावश्यक विज्ञापन' },
  { id: 'Fraud', labelEn: 'Fraud or financial scam', labelNp: 'ठगी वा वित्तीय घोटाला' },
  { id: 'Harassment', labelEn: 'Harassment or abusive behavior', labelNp: 'दुर्व्यवहार वा धम्की' },
  { id: 'Fake listing', labelEn: 'Fake or misleading room listing', labelNp: 'नक्कली वा भ्रामक कोठा' },
  { id: 'Inappropriate content', labelEn: 'Inappropriate or explicit content', labelNp: 'अनुचित वा अश्लील सामग्री' },
  { id: 'Other', labelEn: 'Other safety concern', labelNp: 'अन्य सुरक्षा सम्बन्धी समस्या' },
];

export const ReportModal: React.FC<ReportModalProps> = ({
  conversationId,
  reporterId,
  reportedUserId,
  reportedUserName,
  messageId,
  language,
  onClose,
  onSuccess,
}) => {
  const [selectedReason, setSelectedReason] = useState<ChatReportReason>('Spam');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError(language === 'np' ? 'कृपया विवरण लेख्नुहोस्।' : 'Please provide details about this report.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const { error: err } = await reportChatMessage({
      conversationId,
      reporterId,
      reportedUserId,
      reason: selectedReason,
      description: description.trim(),
      messageId,
    });

    setIsSubmitting(false);

    if (err) {
      setError(err);
    } else {
      onSuccess();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                {language === 'np' ? 'प्रयोगकर्ता रिपोर्ट गर्नुहोस्' : 'Report User / Conversation'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {language === 'np' ? `${reportedUserName} बारे एडमिनलाई जानकारी पठाउनुहोस्` : `Reporting ${reportedUserName}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-white/80 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-2">
              {language === 'np' ? 'समस्याको मुख्य कारण छान्नुहोस्:' : 'Select Reason:'}
            </label>
            <div className="space-y-1.5">
              {REPORT_REASONS.map((r) => (
                <label
                  key={r.id}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition ${
                    selectedReason === r.id
                      ? 'border-rose-500 bg-rose-50/50 text-slate-900 font-semibold'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="reportReason"
                    value={r.id}
                    checked={selectedReason === r.id}
                    onChange={() => setSelectedReason(r.id)}
                    className="accent-rose-600 w-3.5 h-3.5"
                  />
                  <span>{language === 'np' ? r.labelNp : r.labelEn}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              {language === 'np' ? 'विस्तृत विवरण (Details):' : 'Additional details:'}
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                language === 'np'
                  ? 'कृपया के भएको थियो स्पष्ट खुलाउनुहोस् ताकि एडमिनले तत्काल कारबाही गर्न सकोस्...'
                  : 'Describe what happened so our moderation team can review and take appropriate action...'
              }
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 transition resize-none"
            />
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-500 leading-relaxed">
            {language === 'np'
              ? 'तपाईंको रिपोर्ट गोप्य रहनेछ। हाम्रो सुरक्षा टिमले कुराकानीको अनुगमन गरी आवश्यक परे प्रयोगकर्तालाई निलम्बन गर्नेछ।'
              : 'Your report is completely confidential. IP Room moderators will inspect the transcript and take disciplinary action if guidelines were violated.'}
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold transition"
            >
              {language === 'np' ? 'रद्द गर्नुहोस्' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold transition flex items-center gap-1.5 shadow-xs disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{language === 'np' ? 'पठाउँदै...' : 'Submitting...'}</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>{language === 'np' ? 'रिपोर्ट पठाउनुहोस्' : 'Submit Report'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
