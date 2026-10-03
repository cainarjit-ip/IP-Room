import React, { useState, useEffect, useRef } from 'react';
import { RoomListing, Language, ChatMessage, UserProfile } from '../types';
import { getTranslation } from '../data/translations';
import { notifyChatMessage } from '../services/supabase/notificationService';
import {
  getRoomChatMessages,
  fetchRemoteChatMessages,
  saveRoomChatMessage,
  subscribeToLiveRoomChat,
  playChatNotificationSound,
  getOrCreateConversation,
  getConversationMessages,
  sendMessage,
  subscribeToMessages,
} from '../services/supabase/chatService';
import { generateUUID, isValidUUID } from '../services/supabase';
import {
  X,
  Send,
  ShieldCheck,
  CheckCheck,
  Phone,
  MessageCircle,
  Clock,
  UserCheck,
  ArrowRightLeft,
  Info,
  Radio,
  Sparkles,
} from 'lucide-react';

interface ChatDrawerProps {
  room: RoomListing | null;
  language: Language;
  currentUser?: UserProfile | null;
  onClose: () => void;
}

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  room,
  language,
  currentUser,
  onClose,
}) => {
  if (!room) return null;

  const t = getTranslation(language);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);

  // Stable IDs
  const stableOwnerId = room.owner.id || 'owner-lister';
  const stableStudentId = currentUser?.id || 'student-guest';

  // Determine if the current authenticated user is the actual Room Lister
  const isActualOwner = Boolean(
    currentUser &&
      (currentUser.role === 'owner' ||
        (isValidUUID(currentUser.id) &&
          isValidUUID(room.owner.id) &&
          currentUser.id === room.owner.id) ||
        (currentUser.name &&
          room.owner.name &&
          currentUser.name.toLowerCase() === room.owner.name.toLowerCase()) ||
        (currentUser.phone &&
          room.owner.phone &&
          currentUser.phone.replace(/\s+/g, '') === room.owner.phone.replace(/\s+/g, '')))
  );

  // Active chat role view (defaults to real role, with demo switch capability)
  const [actingAsOwner, setActingAsOwner] = useState<boolean>(isActualOwner);

  // Update actingAsOwner whenever currentUser changes
  useEffect(() => {
    setActingAsOwner(isActualOwner);
  }, [isActualOwner]);

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    return getRoomChatMessages(room.id);
  });
  const [inputVal, setInputVal] = useState('');

  // Quick inquiry chips for students
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

  // Quick responses for room lister (घरधनी)
  const ownerQuickReplies =
    language === 'np'
      ? [
          'हो, कोठा उपलब्ध छ। अवलोकन गर्न आउन सक्नुहुन्छ।',
          'पानी दैनिक आउँछ, सबमिटरको दर रु १२/युनिट छ।',
          'कृपया विस्तृत जानकारीको लागि कल गर्नुहोला।',
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

  // Real-time live synchronization via BroadcastChannel & Local Storage
  useEffect(() => {
    // 1. Initial messages from cache and Supabase cloud
    const initial = getRoomChatMessages(room.id);
    if (initial.length > 0) {
      setMessages(initial);
    }
    fetchRemoteChatMessages(room.id).then((remoteList) => {
      if (remoteList && remoteList.length > 0) {
        setMessages((prev) => {
          const map = new Map<string, ChatMessage>();
          prev.forEach((m) => map.set(m.id, m));
          remoteList.forEach((m) => map.set(m.id, m));
          return Array.from(map.values());
        });
      }
    });

    // 2. Real-time Live Subscription (cross-tab, in-memory, immediate)
    const unsubscribeLive = subscribeToLiveRoomChat(room.id, (incomingMsg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === incomingMsg.id)) {
          return prev;
        }

        // Play audio chime if incoming message is from the other party
        const isFromOwner = incomingMsg.senderRole === 'owner';
        const isViewerMessage = actingAsOwner ? isFromOwner : !isFromOwner;
        if (!isViewerMessage) {
          playChatNotificationSound();
        }

        return [...prev, incomingMsg];
      });
    });

    // 3. Connect via Supabase PostgreSQL if valid UUIDs exist
    const ownerUUID = isValidUUID(room.owner.id) ? room.owner.id : null;
    const userUUID = currentUser?.id && isValidUUID(currentUser.id) ? currentUser.id : null;
    let unsubscribeSupabase: (() => void) | null = null;

    if (ownerUUID && userUUID && ownerUUID !== userUUID) {
      getOrCreateConversation(userUUID, ownerUUID, room.id)
        .then((convId) => {
          if (convId) {
            setConversationId(convId);
            getConversationMessages(convId, userUUID).then((remoteMsgs) => {
              if (remoteMsgs && remoteMsgs.length > 0) {
                setMessages((prev) => {
                  const combined = [...prev];
                  remoteMsgs.forEach((rm) => {
                    if (!combined.some((m) => m.id === rm.id)) {
                      combined.push(rm);
                    }
                  });
                  return combined.sort(
                    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                  );
                });
              }
            });

            unsubscribeSupabase = subscribeToMessages(convId, userUUID, (newMsg) => {
              setMessages((prev) => {
                if (prev.some((m) => m.id === newMsg.id)) return prev;
                return [...prev, newMsg];
              });
            });
          }
        })
        .catch(() => {});
    }

    return () => {
      unsubscribeLive();
      if (unsubscribeSupabase) unsubscribeSupabase();
    };
  }, [room.id, room.owner.id, currentUser?.id, actingAsOwner]);

  /**
   * Send a live message:
   * - If actingAsOwner is true: Sent by Room Lister (घरधनी) from their own ID.
   * - If actingAsOwner is false: Sent by Student/Tenant inquiring about the room.
   * Instantly broadcasts live to other tabs and plays audio chime.
   */
  const sendChatMessage = (textToSend: string) => {
    if (!textToSend.trim()) return;
    const trimmed = textToSend.trim();

    let newMsg: ChatMessage;

    if (actingAsOwner) {
      // Room Lister is sending reply from their own ID
      newMsg = {
        id: generateUUID(),
        senderId: stableOwnerId,
        senderName: room.owner.name,
        senderRole: 'owner',
        text: trimmed,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isSelf: true,
      };

      // Notify the inquiring student (recipient: renter)
      notifyChatMessage(
        stableStudentId,
        'renter',
        room.owner.name,
        trimmed,
        language === 'np' ? room.titleNp : room.title,
        room.id,
        stableOwnerId
      );
    } else {
      // Student is sending an inquiry to the Room Lister
      const studentName =
        currentUser?.name || (language === 'np' ? 'विद्यार्थी (Student)' : 'Prospective Student');

      newMsg = {
        id: generateUUID(),
        senderId: stableStudentId,
        senderName: studentName,
        senderRole: 'renter',
        text: trimmed,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isSelf: true,
      };

      // Notify the Room Lister in real time (recipient: owner)
      notifyChatMessage(
        stableOwnerId,
        'owner',
        newMsg.senderName,
        trimmed,
        language === 'np' ? room.titleNp : room.title,
        room.id,
        stableStudentId
      );
    }

    // Save locally and broadcast live to all tabs
    const updatedMessages = saveRoomChatMessage(room.id, newMsg);
    setMessages(updatedMessages);
    setInputVal('');

    // Persist to Supabase if conversationId is active
    if (conversationId) {
      const senderUUID = actingAsOwner
        ? isValidUUID(stableOwnerId) ? stableOwnerId : null
        : isValidUUID(stableStudentId) ? stableStudentId : null;

      if (senderUUID) {
        sendMessage(conversationId, senderUUID, trimmed).catch(() => {});
      }
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendChatMessage(inputVal);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] bg-white shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header with Room Lister Info & Direct Call/WhatsApp Buttons */}
      <div className="p-3.5 sm:p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative shrink-0">
            <img
              src={room.owner.avatar}
              alt={room.owner.name}
              className="w-10 h-10 rounded-full object-cover border-2 border-emerald-500 shadow-xs"
            />
            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-900 animate-pulse" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 truncate">
              <span className="font-bold text-xs sm:text-sm text-white truncate">
                {room.owner.name}
              </span>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-800 px-1.5 py-0.2 rounded shrink-0 flex items-center gap-0.5">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>{language === 'np' ? 'कोठा घरधनी' : 'Room Lister'}</span>
              </span>
            </div>
            <div className="text-[10px] text-slate-300 flex items-center gap-1.5 mt-0.5">
              <span className="text-emerald-400 font-semibold flex items-center gap-0.5">
                <Clock className="w-2.5 h-2.5" />
                {room.owner.responseTime || 'Direct Account'}
              </span>
              <span>·</span>
              <span className="text-slate-400 truncate">
                {room.owner.phone ? room.owner.phone : 'Verified Lister'}
              </span>
            </div>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
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

          <a
            href={`tel:${room.owner.phone}`}
            title="Direct Phone Call"
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg transition border border-slate-700"
          >
            <Phone className="w-4 h-4" />
          </a>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Chat"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition ml-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Rented room context banner */}
      <div className="p-2.5 bg-emerald-50/70 border-b border-emerald-100 flex items-center justify-between gap-2 text-xs shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <img
            src={room.images[0]}
            alt={room.title}
            className="w-8 h-8 rounded-md object-cover border border-emerald-200 shrink-0"
          />
          <div className="min-w-0">
            <span className="font-bold text-slate-900 block truncate text-[11px]">
              {language === 'np' ? room.titleNp : room.title}
            </span>
            <span className="text-[10px] text-emerald-800 font-mono">
              रु. {room.price.toLocaleString('en-IN')}/mo · {room.location.municipality}
            </span>
          </div>
        </div>

        {/* Direct Owner/Lister Role Switcher for testing/replying */}
        <button
          type="button"
          onClick={() => setActingAsOwner(!actingAsOwner)}
          className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition flex items-center gap-1 shrink-0 ${
            actingAsOwner
              ? 'bg-purple-100 text-purple-900 border-purple-300'
              : 'bg-emerald-100 text-emerald-900 border-emerald-300 hover:bg-emerald-200'
          }`}
          title="Switch view to test replying as the Room Lister or Student"
        >
          <ArrowRightLeft className="w-3 h-3" />
          <span>
            {actingAsOwner
              ? language === 'np'
                ? 'घरधनी मोड (Lister ID)'
                : 'Lister Mode'
              : language === 'np'
              ? 'विद्यार्थी मोड (Student)'
              : 'Student Mode'}
          </span>
        </button>
      </div>

      {/* Live Status & Current Active Responder Banner */}
      <div
        className={`px-3 py-1.5 text-[11px] font-medium border-b flex items-center justify-between ${
          actingAsOwner
            ? 'bg-purple-50 text-purple-900 border-purple-200'
            : 'bg-slate-100 text-slate-700 border-slate-200'
        }`}
      >
        <span className="flex items-center gap-1.5 truncate">
          {actingAsOwner ? (
            <>
              <UserCheck className="w-3.5 h-3.5 text-purple-700 shrink-0" />
              <span className="truncate">
                {language === 'np'
                  ? `तपाईं घरधनी (${room.owner.name}) को आइडीबाट जवाफ दिँदै हुनुहुन्छ`
                  : `Replying from Room Lister account (${room.owner.name})`}
              </span>
            </>
          ) : (
            <>
              <Info className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="truncate">
                {language === 'np'
                  ? `घरधनी (${room.owner.name}) सँग सिधा कुराकानी`
                  : `Direct inquiry to Room Lister (${room.owner.name})`}
              </span>
            </>
          )}
        </span>

        {/* Live sync pulsing badge */}
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
          <span>Live</span>
        </span>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F8FAFC]">
        {messages.length === 0 ? (
          <div className="p-6 text-center space-y-2.5 my-auto">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <MessageCircle className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-xs text-slate-800">
              {language === 'np'
                ? `घरधनी (${room.owner.name}) सँग सिधै च्याट गर्नुहोस्`
                : `Direct chat with ${room.owner.name}`}
            </h3>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto leading-relaxed">
              {language === 'np'
                ? 'तपाईंले पठाएको सन्देश घरधनीको खातामा सिधै तत्काल पुग्नेछ र उहाँले आफ्नो आधिकारिक आइडीबाट सिधै जवाफ दिनुहुनेछ।'
                : 'Send your questions directly to the room lister. They will receive an immediate notification and reply live from their verified account.'}
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            // Determine alignment and styling based on whether the message is from the lister or student
            const isFromLister = msg.senderRole === 'owner';
            const isViewerMessage = actingAsOwner ? isFromLister : !isFromLister;

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isViewerMessage ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  <span className="text-[10px] font-bold text-slate-600">
                    {isFromLister ? `${room.owner.name}` : msg.senderName}
                  </span>
                  {isFromLister && (
                    <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded border border-emerald-300">
                      {language === 'np' ? 'घरधनी (Lister)' : 'Room Lister'}
                    </span>
                  )}
                  {!isFromLister && (
                    <span className="text-[9px] bg-slate-200 text-slate-700 font-medium px-1 rounded">
                      {language === 'np' ? 'विद्यार्थी' : 'Student'}
                    </span>
                  )}
                </div>

                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                    isViewerMessage
                      ? 'bg-emerald-700 text-white rounded-br-xs shadow-xs'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs shadow-xs'
                  }`}
                >
                  {msg.text}
                </div>

                <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-400 font-mono px-1">
                  <span>{msg.timestamp}</span>
                  {isViewerMessage && <CheckCheck className="w-3 h-3 text-emerald-600" />}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Inquiry Prompts for student mode OR Quick Replies for owner mode */}
      {!actingAsOwner ? (
        <div className="p-2 bg-slate-50 border-t border-slate-200/80 overflow-x-auto no-scrollbar flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1 shrink-0">
            {language === 'np' ? 'सोध्नुहोस्:' : 'Ask:'}
          </span>
          {quickQuestions.map((q, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => sendChatMessage(q)}
              className="text-[11px] font-medium text-slate-700 bg-white hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 border border-slate-200 rounded-full px-2.5 py-1 whitespace-nowrap transition shadow-2xs shrink-0 cursor-pointer"
            >
              {q}
            </button>
          ))}
        </div>
      ) : (
        <div className="p-2 bg-purple-50/70 border-t border-purple-200/80 overflow-x-auto no-scrollbar flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider pl-1 shrink-0 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-purple-600" />
            <span>{language === 'np' ? 'छिटो जवाफ:' : 'Quick Reply:'}</span>
          </span>
          {ownerQuickReplies.map((r, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => sendChatMessage(r)}
              className="text-[11px] font-medium text-purple-900 bg-white hover:bg-purple-100 border border-purple-200 rounded-full px-2.5 py-1 whitespace-nowrap transition shadow-2xs shrink-0 cursor-pointer"
            >
              {r}
            </button>
          ))}
        </div>
      )}

      {/* Input box */}
      <form
        onSubmit={handleFormSubmit}
        className="p-3 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0"
      >
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder={
            actingAsOwner
              ? language === 'np'
                ? `विद्यार्थीलाई घरधनी (${room.owner.name}) को रूपमा जवाफ लेख्नुहोस्...`
                : `Reply to student as the Room Lister (${room.owner.name})...`
              : language === 'np'
              ? `घरधनी ${room.owner.name} लाई सन्देश लेख्नुहोस्...`
              : `Message room lister ${room.owner.name}...`
          }
          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
        />
        <button
          type="submit"
          className="p-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl transition shadow-xs disabled:opacity-40 active:scale-95 shrink-0 cursor-pointer"
          disabled={!inputVal.trim()}
          title={actingAsOwner ? 'Send reply as Room Lister' : 'Send message to Room Lister'}
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
