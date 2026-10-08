import React, { useState } from 'react';
import { Language } from '../../types';
import { blockUserInChat } from '../../services/supabase/chatService';
import { Ban, X, Loader2 } from 'lucide-react';

interface BlockConfirmModalProps {
  blockerId: string;
  blockedId: string;
  blockedName: string;
  conversationId: string;
  language: Language;
  onClose: () => void;
  onSuccess: () => void;
}

export const BlockConfirmModal: React.FC<BlockConfirmModalProps> = ({
  blockerId,
  blockedId,
  blockedName,
  conversationId,
  language,
  onClose,
  onSuccess,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleBlock = async () => {
    setIsSubmitting(true);
    await blockUserInChat(blockerId, blockedId, conversationId);
    setIsSubmitting(false);
    onSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden">
        <div className="p-5 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
              <Ban className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                {language === 'np' ? 'प्रयोगकर्ता ब्लक गर्नुहोस्' : 'Block User?'}
              </h3>
              <p className="text-[11px] text-slate-500">{blockedName}</p>
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

        <div className="p-5 space-y-4 text-xs">
          <p className="text-slate-600 leading-relaxed">
            {language === 'np'
              ? `के तपाईं साँच्चै ${blockedName} लाई ब्लक गर्न चाहनुहुन्छ? ब्लक गरेपछि उहाँले तपाईंलाई नयाँ सन्देश पठाउन सक्नुहुने छैन।`
              : `Are you sure you want to block ${blockedName}? Once blocked, they will not be able to send you new messages or inquiries.`}
          </p>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold transition"
            >
              {language === 'np' ? 'रद्द गर्नुहोस्' : 'Cancel'}
            </button>
            <button
              type="button"
              onClick={handleBlock}
              disabled={isSubmitting}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold transition flex items-center gap-1.5 shadow-xs disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{language === 'np' ? 'ब्लक गरिँदै...' : 'Blocking...'}</span>
                </>
              ) : (
                <>
                  <Ban className="w-3.5 h-3.5" />
                  <span>{language === 'np' ? 'ब्लक गर्नुहोस्' : 'Block'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
