import React, { useState, useEffect, useRef } from 'react';
import { RoomListing, Language, ChatMessage, UserProfile, ChatConversation } from '../types';
import { getTranslation } from '../data/translations';
import { notifyChatMessage } from '../services/supabase/notificationService';
import {
  getConversationMessages,
  fetchRemoteChatMessages,
  saveRoomChatMessage,
  subscribeToLiveRoomChat,
  playChatNotificationSound,
  getClientRenterIdentity,
  getRoomConversations,
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
  User,
  Users,
  Check,
} from 'lucide-react';

interface ChatDrawerProps {
  room: RoomListing | null;
  language: Language;
  currentUser?: UserProfile | null;
  onClose: () => void;
  initialRenterId?: string;
}

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  room,
  language,
  currentUser,
  onClose,
  initialRenterId,
}) => {
  if (!room) return null;

  const t = getTranslation(language);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Determine if the current authenticated user is the ACTUAL owner of this room
  const isActualOwner = Boolean(
    currentUser && (
      (isValidUUID(currentUser.id) &&
        isValidUUID(room.owner.id) &&
        currentUser.id === room.owner.id) ||
      (currentUser.name &&
        room.owner.name &&
        currentUser.name.trim().toLowerCase() === room.owner.name.trim().toLowerCase()) ||
      (currentUser.phone &&
        room.owner.phone &&
        currentUser.phone.replace(/\s+/g, '') === room.owner.phone.replace(/\s+/g, ''))
    )
  );

  const isAdmin = Boolean(currentUser && currentUser.role === 'admin');

  // 2. Identify the active renter for this chat thread
  // If user is a student/renter, they are chatting as themselves
  const myRenterIdentity = getClientRenterIdentity(currentUser);

  // If user is the owner or admin, they might be viewing a specific renter's inquiry
  const [roomConversations, setRoomConversations] = useState<ChatConversation[]>(() => {
    return getRoomConversations(room.id);
  });

  const [selectedRenterId, setSelectedRenterId] = useState<string>(() => {
    if (initialRenterId) return initialRenterId;
    if (isActualOwner || isAdmin) {
      const convs = getRoomConversations(room.id);
      if (convs.length > 0) return convs[0].renterId;
      return 'prospective-student';
    }
    return myRenterIdentity.id;
  });

  const [selectedRenterName, setSelectedRenterName] = useState<string>(() => {
    if (isActualOwner || isAdmin) {
      const conv = roomConversations.find(c => c.renterId === selectedRenterId);
      return conv?.renterName || (language === 'np' ? 'विद्यार्थी (Student)' : 'Student Inquirer');
    }
    return myRenterIdentity.name;
  });

  // Effective conversation renter ID
  const activeRenterId = isActualOwner || isAdmin ? selectedRenterId : myRenterIdentity.id;

  // 3. Load messages strictly for this room & active renter
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    return getConversationMessages(room.id, activeRenterId);
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

  // Quick replies for Room Lister (owner)
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

  // Refresh room conversations list for owner
  useEffect(() => {
    if (isActualOwner || isAdmin) {
      const convs = getRoomConversations(room.id);
      setRoomConversations(convs);
      if (!selectedRenterId && convs.length > 0) {
        setSelectedRenterId(convs[0].renterId);
        setSelectedRenterName(convs[0].renterName);
      }
    }
  }, [room.id, isActualOwner, isAdmin]);

  // Load and subscribe to messages when activeRenterId or room.id changes
  useEffect(() => {
    // 1. Initial local load
    const local = getConversationMessages(room.id, activeRenterId);
    setMessages(local);

    // 2. Fetch remote from Supabase
    fetchRemoteChatMessages(room.id, activeRenterId).then((remoteList) => {
      if (remoteList && remoteList.length > 0) {
        setMessages((prev) => {
          const map = new Map<string, ChatMessage>();
          prev.forEach((m) => map.set(m.id, m));
          remoteList.forEach((m) => map.set(m.id, m));
          return Array.from(map.values()).sort(
            (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
        });
      }
    });

    // 3. Subscribe to live chat messages for this room and renter
    const unsubscribe = subscribeToLiveRoomChat(
      room.id,
      (incomingMsg) => {
        // If owner/admin, also update conversations list
        if (isActualOwner || isAdmin) {
          setRoomConversations(getRoomConversations(room.id));
        }

        // Only append if it belongs to this conversation
        if (incomingMsg.renterId && incomingMsg.renterId !== activeRenterId) {
          return;
        }

        setMessages((prev) => {
          if (prev.some((m) => m.id === incomingMsg.id)) {
            return prev;
          }

          // Play audio chime ONLY if incoming message is from the other party
          const isFromOwner = incomingMsg.senderRole === 'owner';
          const isMyRole = isActualOwner ? isFromOwner : !isFromOwner;
          if (!isMyRole) {
            playChatNotificationSound();
          }

          return [...prev, incomingMsg];
        });
      },
      activeRenterId
    );

    return () => {
      unsubscribe();
    };
  }, [room.id, activeRenterId, isActualOwner, isAdmin]);

  /**
   * Send a chat message:
   * - If user is Room Owner: sends as Room Owner to the selected renter.
   * - If user is Renter: sends inquiry to the Room Owner.
   * Notifications are sent ONLY to the recipient; NEVER to the sender!
   */
  const handleSendMessage = (textToSend: string) => {
    if (!textToSend.trim()) return;
    const trimmed = textToSend.trim();

    let newMsg: ChatMessage;

    if (isActualOwner) {
      // Room Lister is replying to the student
      newMsg = {
        id: generateUUID(),
        senderId: room.owner.id || currentUser?.id || 'room-owner',
        senderName: room.owner.name,
        senderRole: 'owner',
        text: trimmed,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isSelf: true,
        roomId: room.id,
        renterId: activeRenterId,
        renterName: selectedRenterName,
        recipientId: activeRenterId,
        recipientRole: 'renter',
      };

      // Notify the inquiring student (recipient: renter)
      notifyChatMessage(
        activeRenterId,
        'renter',
        room.owner.name,
        trimmed,
        language === 'np' ? room.titleNp : room.title,
        room.id,
        room.owner.id
      );
    } else {
      // Student is sending inquiry to the Room Lister
      const studentName = myRenterIdentity.name;

      newMsg = {
        id: generateUUID(),
        senderId: activeRenterId,
        senderName: studentName,
        senderRole: 'renter',
        text: trimmed,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isSelf: true,
        roomId: room.id,
        renterId: activeRenterId,
        renterName: studentName,
        recipientId: room.owner.id,
        recipientRole: 'owner',
      };

      // Notify the Room Lister in real time (recipient: owner)
      notifyChatMessage(
        room.owner.id,
        'owner',
        studentName,
        trimmed,
        language === 'np' ? room.titleNp : room.title,
        room.id,
        activeRenterId
      );
    }

    // Save and broadcast live
    const updated = saveRoomChatMessage(room.id, newMsg, {
      roomTitle: room.title,
      roomTitleNp: room.titleNp,
      roomImage: room.images[0],
      ownerId: room.owner.id,
      ownerName: room.owner.name,
      ownerPhone: room.owner.phone,
      renterId: activeRenterId,
      renterName: isActualOwner ? selectedRenterName : myRenterIdentity.name,
    });

    setMessages(updated);
    setInputVal('');

    if (isActualOwner || isAdmin) {
      setRoomConversations(getRoomConversations(room.id));
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(inputVal);
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
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition ml-1 cursor-pointer"
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

        {/* Identity Badge */}
        <div className="shrink-0">
          {isActualOwner ? (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 border border-purple-300">
              {language === 'np' ? 'घरधनी ड्यासबोर्ड' : 'Owner Portal'}
            </span>
          ) : isAdmin ? (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-900 border border-rose-300">
              Admin Inspection
            </span>
          ) : (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-300">
              {language === 'np' ? 'विद्यार्थी सोधपुछ' : 'Student Inquiry'}
            </span>
          )}
        </div>
      </div>

      {/* If Room Lister is viewing and there are multiple inquiries for this room, show Inquirer Tabs */}
      {(isActualOwner || isAdmin) && roomConversations.length > 1 && (
        <div className="p-2 bg-slate-100/90 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-1.5 mb-1 text-[10px] font-bold text-slate-600">
            <Users className="w-3 h-3 text-slate-500" />
            <span>{language === 'np' ? 'सोधपुछ गर्ने विद्यार्थीहरू:' : 'Student Inquirers:'}</span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {roomConversations.map((conv) => {
              const isSelected = conv.renterId === activeRenterId;
              return (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => {
                    setSelectedRenterId(conv.renterId);
                    setSelectedRenterName(conv.renterName);
                  }}
                  className={`text-[10px] font-medium px-2.5 py-1 rounded-lg border whitespace-nowrap transition cursor-pointer flex items-center gap-1 ${
                    isSelected
                      ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <User className="w-3 h-3" />
                  <span>{conv.renterName}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Live Status Banner */}
      <div
        className={`px-3 py-1.5 text-[11px] font-medium border-b flex items-center justify-between ${
          isActualOwner
            ? 'bg-purple-50 text-purple-900 border-purple-200'
            : 'bg-slate-100 text-slate-700 border-slate-200'
        }`}
      >
        <span className="flex items-center gap-1.5 truncate">
          {isActualOwner ? (
            <>
              <ShieldCheck className="w-3.5 h-3.5 text-purple-700 shrink-0" />
              <span className="truncate">
                {language === 'np'
                  ? `विद्यार्थी (${selectedRenterName}) लाई जवाफ दिँदै`
                  : `Replying to student (${selectedRenterName})`}
              </span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="truncate">
                {language === 'np'
                  ? `घरधनी (${room.owner.name}) सँग सिधा कुराकानी`
                  : `Direct chat with room lister (${room.owner.name})`}
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
              {isActualOwner
                ? language === 'np'
                  ? 'अहिलेसम्म कुनै सन्देश छैन'
                  : 'No messages yet'
                : language === 'np'
                ? `घरधनी (${room.owner.name}) लाई पहिलो सन्देश पठाउनुहोस्`
                : `Send inquiry to ${room.owner.name}`}
            </h3>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto leading-relaxed">
              {isActualOwner
                ? language === 'np'
                  ? 'यस विद्यार्थीको सोधपुछ सन्देश यहाँ देखा पर्नेछ।'
                  : 'Student questions will appear here in real time.'
                : language === 'np'
                ? 'तपाईंले पठाएको सन्देश कोठाधनीको आधिकारिक खातामा तुरुन्तै पुग्नेछ र उहाँले जवाफ दिएपछि मात्र यहाँ जवाफ देखिनेछ।'
                : 'Your message will be sent directly to the room lister. Only when they reply will their answer appear here.'}
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isFromLister = msg.senderRole === 'owner';
            const isViewerMessage = isActualOwner ? isFromLister : !isFromLister;

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isViewerMessage ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  <span className="text-[10px] font-bold text-slate-600">
                    {isFromLister ? room.owner.name : msg.senderName}
                  </span>
                  {isFromLister && (
                    <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded border border-emerald-300">
                      {language === 'np' ? 'घरधनी' : 'Room Lister'}
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

      {/* Waiting notice for renter if last message was sent by renter */}
      {!isActualOwner && messages.length > 0 && messages[messages.length - 1].senderRole === 'renter' && (
        <div className="px-3 py-1.5 bg-amber-50 border-t border-amber-200 text-[10px] text-amber-800 flex items-center justify-between shrink-0">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-600" />
            <span>
              {language === 'np'
                ? 'सन्देश पठाइयो। घरधनीको जवाफको प्रतीक्षा गर्दै...'
                : 'Message sent. Waiting for room lister to reply...'}
            </span>
          </span>
          <span className="font-semibold text-amber-900">
            {language === 'np' ? 'उहाँले जवाफ दिएपछि देखिनेछ' : 'Reply arrives when sent'}
          </span>
        </div>
      )}

      {/* Quick Inquiry Prompts for student OR Quick Replies for owner */}
      {!isActualOwner ? (
        <div className="p-2 bg-slate-50 border-t border-slate-200/80 overflow-x-auto no-scrollbar flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1 shrink-0">
            {language === 'np' ? 'सोध्नुहोस्:' : 'Ask:'}
          </span>
          {quickQuestions.map((q, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendMessage(q)}
              className="text-[11px] font-medium text-slate-700 bg-white hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 border border-slate-200 rounded-full px-2.5 py-1 whitespace-nowrap transition shadow-2xs shrink-0 cursor-pointer"
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
              onClick={() => handleSendMessage(r)}
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
            isActualOwner
              ? language === 'np'
                ? `विद्यार्थी (${selectedRenterName}) लाई जवाफ लेख्नुहोस्...`
                : `Reply to student (${selectedRenterName})...`
              : language === 'np'
              ? `घरधनी ${room.owner.name} लाई सन्देश पठाउनुहोस्...`
              : `Message room lister ${room.owner.name}...`
          }
          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
        />
        <button
          type="submit"
          className="p-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl transition shadow-xs disabled:opacity-40 active:scale-95 shrink-0 cursor-pointer"
          disabled={!inputVal.trim()}
          title={isActualOwner ? 'Send reply as Room Lister' : 'Send message to Room Lister'}
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
