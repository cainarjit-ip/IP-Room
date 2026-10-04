import React, { useState, useEffect, useRef } from 'react';
import { RoomListing, Language, UserProfile } from '../types';
import { getTranslation } from '../data/translations';
import {
  DbConversation,
  DbMessage,
  getOrCreateConversation,
  getConversationMessages,
  sendChatMessage,
  subscribeToConversationMessages,
  markConversationAsRead,
  playChatChime,
} from '../services/supabase/chatService';
import {
  X,
  Send,
  ShieldCheck,
  CheckCheck,
  Phone,
  MessageCircle,
  Clock,
  LogIn,
  AlertCircle,
  Loader2,
  Home,
  Check,
} from 'lucide-react';

interface ChatDrawerProps {
  room: RoomListing | null;
  language: Language;
  currentUser: UserProfile | null;
  onClose: () => void;
  onOpenAuthModal?: () => void;
  activeConversation?: DbConversation | null;
}

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  room,
  language,
  currentUser,
  onClose,
  onOpenAuthModal,
  activeConversation,
}) => {
  if (!room) return null;

  const t = getTranslation(language);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [conversation, setConversation] = useState<DbConversation | null>(activeConversation || null);
  const [messages, setMessages] = useState<DbMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [inputVal, setInputVal] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);

  // Identify room owner ID
  const roomOwnerId = room.owner?.id || (room as any).owner_id;

  // Check if current user is the owner of this room
  const isOwner = Boolean(currentUser?.id && roomOwnerId && currentUser.id === roomOwnerId);

  // Check if self-chat attempt
  const isSelfChat = Boolean(isOwner && !activeConversation);

  // Quick inquiry chips for prospective renters
  const quickQuestions =
    language === 'np'
      ? [
          '💧 पानीको तालिका कस्तो छ?',
          '⚡ बत्ती र इन्टरनेटको दर के छ?',
          '🚪 कहिले कोठा हेर्न आउँदा हुन्छ?',
          '💰 भाडामा केही मिलाउन सकिन्छ?',
        ]
      : [
          '💧 How is the water schedule?',
          '⚡ Electricity & WiFi rates?',
          '🚪 When can I visit the room?',
          '💰 Any student discount on rent?',
        ];

  // Quick replies for Room Owner
  const ownerQuickReplies =
    language === 'np'
      ? [
          'हो, कोठा उपलब्ध छ। अवलोकन गर्न आउन सक्नुहुन्छ।',
          'पानी दैनिक आउँछ, सबमिटरको दर रु १२/युनिट छ।',
          'कृपया विस्तृत जानकारीको लागि सिधै कल गर्नुहोला।',
          'भाडामा केही विचार गर्न सकिन्छ, हेर्न आउनुहोस्।',
        ]
      : [
          'Yes, the room is available. You can visit anytime.',
          'Water is daily, electricity submeter is Rs 12/unit.',
          'Please call me directly for a quick visit.',
          'Rent is slightly negotiable upon physical visit.',
        ];

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load or create conversation on mount or when room/user changes
  useEffect(() => {
    let isMounted = true;

    // 1. Guest user check
    if (!currentUser) {
      setIsLoading(false);
      return;
    }

    // 2. Self-chat check
    if (isSelfChat) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const initConversation = async () => {
      // If an existing conversation was already passed from Owner Dashboard
      if (activeConversation) {
        if (!isMounted) return;
        setConversation(activeConversation);
        const { messages: msgs, error: msgErr } = await getConversationMessages(activeConversation.id);
        if (isMounted) {
          if (msgErr) setErrorMessage(msgErr);
          else setMessages(msgs);
          setIsLoading(false);
        }
        return;
      }

      // Renter initiating chat with Room Owner
      const renterId = currentUser.id;
      const ownerId = roomOwnerId;

      if (!ownerId) {
        if (isMounted) {
          setErrorMessage('Could not find owner details for this room listing.');
          setIsLoading(false);
        }
        return;
      }

      const { conversation: conv, error: convErr } = await getOrCreateConversation(
        room.id,
        renterId,
        ownerId
      );

      if (!isMounted) return;

      if (convErr || !conv) {
        setErrorMessage(convErr || 'Failed to start conversation with the room owner.');
        setIsLoading(false);
        return;
      }

      setConversation(conv);

      // Load initial messages
      const { messages: msgs, error: msgErr } = await getConversationMessages(conv.id);
      if (isMounted) {
        if (msgErr) setErrorMessage(msgErr);
        else setMessages(msgs);
        setIsLoading(false);
      }

      // Mark messages as read by recipient
      markConversationAsRead(conv.id, currentUser.id);
    };

    initConversation();

    return () => {
      isMounted = false;
    };
  }, [room.id, roomOwnerId, currentUser?.id, activeConversation?.id, isSelfChat]);

  // Realtime subscription to messages for this active conversation
  useEffect(() => {
    if (!conversation?.id || !currentUser?.id) return;

    const unsubscribe = subscribeToConversationMessages(conversation.id, (newMsg) => {
      setMessages((prev) => {
        // Prevent duplicates (Realtime + local insert)
        if (prev.some((m) => m.id === newMsg.id)) {
          return prev;
        }

        // Play chime if message arrived from the other participant
        if (newMsg.sender_id !== currentUser.id) {
          playChatChime();
          markConversationAsRead(conversation.id, currentUser.id);
        }

        return [...prev, newMsg];
      });
    });

    return () => {
      unsubscribe();
    };
  }, [conversation?.id, currentUser?.id]);

  /**
   * Send chat message via Supabase
   */
  const handleSend = async (contentToSend: string) => {
    if (!contentToSend.trim() || isSending || !conversation?.id || !currentUser?.id) return;

    const trimmed = contentToSend.trim();
    setIsSending(true);

    try {
      const { message: savedMsg, error: sendErr } = await sendChatMessage(
        conversation.id,
        currentUser.id,
        trimmed
      );

      if (sendErr || !savedMsg) {
        console.error('Failed to send message:', sendErr);
        alert(sendErr || 'Could not send message. Please try again.');
        return;
      }

      // Append with DB-generated ID if not already received via Realtime
      setMessages((prev) => {
        if (prev.some((m) => m.id === savedMsg.id)) return prev;
        return [...prev, savedMsg];
      });

      setInputVal('');
    } finally {
      setIsSending(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend(inputVal);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] bg-white shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header with Room Lister Info & Direct Contact Buttons */}
      <div className="p-3.5 sm:p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative shrink-0">
            <img
              src={
                activeConversation?.renter_profile?.avatar ||
                room.owner.avatar ||
                `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(room.owner.name)}`
              }
              alt={isOwner ? activeConversation?.renter_profile?.name || 'Renter' : room.owner.name}
              className="w-10 h-10 rounded-full object-cover border-2 border-emerald-500 shadow-xs"
            />
            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-900 animate-pulse" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 truncate">
              <span className="font-bold text-xs sm:text-sm text-white truncate">
                {isOwner
                  ? activeConversation?.renter_profile?.name || (language === 'np' ? 'विद्यार्थी सोधपुछ' : 'Prospective Student')
                  : room.owner.name}
              </span>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-800 px-1.5 py-0.2 rounded shrink-0 flex items-center gap-0.5">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>
                  {isOwner
                    ? language === 'np'
                      ? 'विद्यार्थी'
                      : 'Student'
                    : language === 'np'
                    ? 'कोठा घरधनी'
                    : 'Room Lister'}
                </span>
              </span>
            </div>
            <div className="text-[10px] text-slate-300 flex items-center gap-1.5 mt-0.5">
              <span className="text-emerald-400 font-semibold flex items-center gap-0.5">
                <Clock className="w-2.5 h-2.5" />
                {room.owner.responseTime || 'Direct Chat'}
              </span>
              <span>·</span>
              <span className="text-slate-400 truncate">
                {isOwner
                  ? activeConversation?.renter_profile?.phone || 'Verified Inquirer'
                  : room.owner.phone || 'Verified Lister'}
              </span>
            </div>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {!isOwner && room.owner.whatsapp && (
            <a
              href={`https://wa.me/${room.owner.whatsapp}?text=${encodeURIComponent(
                `Namaste ${room.owner.name}, I am inquiring about your room "${room.title}" on IP Room.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              title="Chat on WhatsApp"
              className="p-1.5 bg-emerald-600/80 hover:bg-emerald-600 text-white rounded-lg transition"
            >
              <MessageCircle className="w-4 h-4" />
            </a>
          )}

          {!isOwner && room.owner.phone && (
            <a
              href={`tel:${room.owner.phone}`}
              title="Direct Phone Call"
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg transition border border-slate-700"
            >
              <Phone className="w-4 h-4" />
            </a>
          )}

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Chat"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition ml-1 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Room Context Banner */}
      <div className="p-2.5 bg-emerald-50/70 border-b border-emerald-100 flex items-center justify-between gap-2 text-xs shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <img
            src={room.images[0] || 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=400&q=80'}
            alt={room.title}
            className="w-8 h-8 rounded-md object-cover border border-emerald-200 shrink-0"
          />
          <div className="min-w-0">
            <span className="font-bold text-slate-900 block truncate text-[11px]">
              {language === 'np' ? room.titleNp || room.title : room.title}
            </span>
            <span className="text-[10px] text-emerald-800 font-mono">
              रु. {room.price.toLocaleString('en-IN')}/mo · {room.location.municipality}
            </span>
          </div>
        </div>

        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-300 shrink-0">
          {isOwner
            ? language === 'np'
              ? 'घरधनी मोड'
              : 'Owner Mode'
            : language === 'np'
            ? 'निजी कुराकानी'
            : 'Private Chat'}
        </span>
      </div>

      {/* Main Content Area */}
      {!currentUser ? (
        /* 1. GUEST USER: Login required to chat */
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4 my-auto">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
            <LogIn className="w-7 h-7" />
          </div>
          <div className="space-y-1 max-w-xs">
            <h3 className="font-bold text-sm text-slate-900">
              {language === 'np' ? 'च्याट गर्न लगइन गर्नुहोस्' : 'Login to Chat'}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {language === 'np'
                ? 'कोठाधनीसँग प्रत्यक्ष, सुरक्षित र निजी रूपमा कुराकानी गर्न कृपया पहिले आफ्नो खातामा लगइन गर्नुहोस्।'
                : 'Please sign in to start a private, direct conversation with this room owner.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              onClose();
              if (onOpenAuthModal) onOpenAuthModal();
            }}
            className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer active:scale-95"
          >
            <LogIn className="w-4 h-4" />
            <span>{language === 'np' ? 'लगइन / दर्ता गर्नुहोस्' : 'Sign In / Register'}</span>
          </button>
        </div>
      ) : isSelfChat ? (
        /* 2. SELF CHAT ATTEMPT: User owns this room listing */
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4 my-auto">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shadow-xs">
            <Home className="w-7 h-7" />
          </div>
          <div className="space-y-1.5 max-w-xs">
            <h3 className="font-bold text-sm text-slate-900">
              {language === 'np' ? 'तपाईं आफ्नै कोठा हेर्दै हुनुहुन्छ' : 'This is your own room listing'}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {language === 'np'
                ? 'तपाईं यस कोठाको आधिकारिक घरधनी हुनुहुन्छ। विद्यार्थीहरूले सोधेका सन्देशहरू घरधनी ड्यासबोर्डको "Messages" ट्याबमा हेर्न सक्नुहुन्छ।'
                : 'You are the verified owner of this property. Inquiries from students will appear in your Owner Dashboard under the Messages tab.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            {language === 'np' ? 'बन्द गर्नुहोस्' : 'Close'}
          </button>
        </div>
      ) : isLoading ? (
        /* 3. LOADING STATE */
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-3">
          <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
          <p className="text-xs text-slate-500">
            {language === 'np' ? 'सुरक्षित च्याट जोड्दै...' : 'Connecting private chat...'}
          </p>
        </div>
      ) : errorMessage ? (
        /* 4. ERROR STATE */
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-500" />
          <p className="text-xs text-rose-600 max-w-xs">{errorMessage}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200"
          >
            Retry
          </button>
        </div>
      ) : (
        /* 5. ACTIVE CHAT MESSAGES */
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F8FAFC]">
            {messages.length === 0 ? (
              <div className="p-6 text-center space-y-2.5 my-auto">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-xs text-slate-800">
                  {isOwner
                    ? language === 'np'
                      ? 'विद्यार्थीसँग कुराकानी सुरु गर्नुहोस्'
                      : 'Reply to Student'
                    : language === 'np'
                    ? `घरधनी (${room.owner.name}) सँग सिधा कुराकानी`
                    : `Direct message to ${room.owner.name}`}
                </h3>
                <p className="text-[11px] text-slate-500 max-w-xs mx-auto leading-relaxed">
                  {isOwner
                    ? language === 'np'
                      ? 'तपाईंले पठाएको सन्देश विद्यार्थीको स्क्रिनमा तुरुन्तै देखापर्नेछ।'
                      : 'Your messages will appear instantly on the student\'s device.'
                    : language === 'np'
                    ? 'तपाईंको सन्देश घरधनीको मोबाइलमा सिधै सुरक्षित पुग्नेछ। उहाँले जवाफ दिनुभएपछि मात्र जवाफ देखिनेछ।'
                    : 'Your message will go directly to the room owner\'s mobile. Only when they reply will their answer appear.'}
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isSelf = msg.sender_id === currentUser.id;
                const timeString = msg.created_at
                  ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : '';

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px]">
                      <span className="font-bold text-slate-600">
                        {isSelf ? (language === 'np' ? 'तपाईं (You)' : 'You') : isOwner ? 'Student' : room.owner.name}
                      </span>
                      {!isSelf && !isOwner && (
                        <span className="bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded border border-emerald-300">
                          {language === 'np' ? 'घरधनी' : 'Room Lister'}
                        </span>
                      )}
                    </div>

                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                        isSelf
                          ? 'bg-emerald-700 text-white rounded-br-xs shadow-xs'
                          : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs shadow-xs'
                      }`}
                    >
                      {msg.content}
                    </div>

                    <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-400 font-mono px-1">
                      <span>{timeString}</span>
                      {isSelf && <CheckCheck className="w-3 h-3 text-emerald-600" />}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick chips */}
          {!isOwner ? (
            <div className="p-2 bg-slate-50 border-t border-slate-200/80 overflow-x-auto no-scrollbar flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1 shrink-0">
                {language === 'np' ? 'सोध्नुहोस्:' : 'Ask:'}
              </span>
              {quickQuestions.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSend(q)}
                  disabled={isSending}
                  className="text-[11px] font-medium text-slate-700 bg-white hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 border border-slate-200 rounded-full px-2.5 py-1 whitespace-nowrap transition shadow-2xs shrink-0 cursor-pointer disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          ) : (
            <div className="p-2 bg-purple-50/70 border-t border-purple-200/80 overflow-x-auto no-scrollbar flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider pl-1 shrink-0">
                {language === 'np' ? 'छिटो जवाफ:' : 'Quick Reply:'}
              </span>
              {ownerQuickReplies.map((r, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSend(r)}
                  disabled={isSending}
                  className="text-[11px] font-medium text-purple-900 bg-white hover:bg-purple-100 border border-purple-200 rounded-full px-2.5 py-1 whitespace-nowrap transition shadow-2xs shrink-0 cursor-pointer disabled:opacity-50"
                >
                  {r}
                </button>
              ))}
            </div>
          )}

          {/* Input Box */}
          <form
            onSubmit={handleFormSubmit}
            className="p-3 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder={
                isOwner
                  ? language === 'np'
                    ? 'विद्यार्थीलाई जवाफ लेख्नुहोस्...'
                    : 'Reply to the student...'
                  : language === 'np'
                  ? `घरधनी ${room.owner.name} लाई सन्देश लेख्नुहोस्...`
                  : `Message room lister ${room.owner.name}...`
              }
              disabled={isSending}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!inputVal.trim() || isSending}
              className="p-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white rounded-xl transition shadow-xs active:scale-95 shrink-0 cursor-pointer"
              title="Send Message"
            >
              {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </form>
        </>
      )}
    </div>
  );
};
