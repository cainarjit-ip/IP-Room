import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  getConversationsForRoom,
} from '../services/supabase/chatService';
import { notifyChatMessage } from '../services/supabase/notificationService';
import { isValidUUID, supabase } from '../lib/supabase';
import {
  X,
  Send,
  ShieldCheck,
  CheckCheck,
  Phone,
  MessageCircle,
  LogIn,
  AlertCircle,
  Loader2,
  Home,
  User,
  ExternalLink,
} from 'lucide-react';

interface ChatDrawerProps {
  room: RoomListing | null;
  language: Language;
  currentUser: UserProfile | null;
  onClose: () => void;
  onOpenAuthModal?: () => void;
  activeConversation?: DbConversation | null;
}

// WhatsApp-style outgoing pop sound
const playOutgoingPop = () => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(650, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.08);
  } catch (e) {
    // AudioContext gesture restriction handled silently
  }
};

// WhatsApp-style incoming chime
const playIncomingChime = () => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(audioCtx.destination);

    osc1.type = 'sine';
    osc2.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
    osc2.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.08); // G5

    gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);

    osc1.start();
    osc2.start(audioCtx.currentTime + 0.08);
    osc1.stop(audioCtx.currentTime + 0.35);
    osc2.stop(audioCtx.currentTime + 0.35);
  } catch (e) {
    // AudioContext gesture restriction handled silently
  }
};

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
  const inputRef = useRef<HTMLInputElement>(null);

  const [conversation, setConversation] = useState<DbConversation | null>(activeConversation || null);
  const [roomConversations, setRoomConversations] = useState<DbConversation[]>([]);
  const [messages, setMessages] = useState<DbMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [inputVal, setInputVal] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);

  // Identify room owner ID
  const roomOwnerId = room.owner?.id || (room as any).owner_id;

  // Check if current user is acting as or is the owner of this room
  const isOwner = Boolean(
    currentUser?.role === 'owner' ||
    (currentUser?.id && roomOwnerId && currentUser.id === roomOwnerId) ||
    (currentUser?.id && conversation?.owner_id === currentUser.id) ||
    (activeConversation?.owner_id && currentUser?.id === activeConversation.owner_id)
  );

  const [renterProfile, setRenterProfile] = useState<{
    name: string;
    avatar?: string;
    phone?: string;
  } | null>(null);

  // Automatically fetch renter dashboard profile if not already enriched
  useEffect(() => {
    let active = true;
    const fetchRenterDetails = async () => {
      if (conversation?.renter_profile?.name) {
        setRenterProfile(conversation.renter_profile);
        return;
      }

      const targetRenterId = conversation?.renter_id || (activeConversation as any)?.renter_id;
      if (targetRenterId && isValidUUID(targetRenterId)) {
        try {
          const { data } = await (supabase
            .from('profiles') as any)
            .select('id, name, full_name, avatar_url, phone')
            .eq('id', targetRenterId)
            .maybeSingle();

          if (data && active) {
            setRenterProfile({
              name: data.full_name || data.name || (language === 'np' ? 'भाडावाल' : 'Renter'),
              avatar: data.avatar_url,
              phone: data.phone,
            });
            return;
          }
        } catch (err) {
          console.warn('Could not load renter profile:', err);
        }
      }

      // Check local storage bookings for tenant name in this room
      try {
        const storedBookings = localStorage.getItem('iproom_bookings');
        if (storedBookings) {
          const parsed = JSON.parse(storedBookings);
          if (Array.isArray(parsed)) {
            const foundB = parsed.find(
              (b: any) => b.roomId === room.id || (targetRenterId && b.tenantId === targetRenterId)
            );
            if (foundB?.tenantName && active) {
              setRenterProfile({
                name: foundB.tenantName,
                phone: foundB.tenantPhone,
              });
              return;
            }
          }
        }
      } catch (e) {
        // ignore
      }
    };

    fetchRenterDetails();
    return () => {
      active = false;
    };
  }, [conversation?.id, conversation?.renter_id, room.id]);

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

  // Auto scroll to bottom smoothly
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input on load
  useEffect(() => {
    if (!isLoading && conversation) {
      inputRef.current?.focus();
    }
  }, [isLoading, conversation?.id]);

  // Load or create conversation on mount or when room/user changes
  useEffect(() => {
    let isMounted = true;

    // 1. Guest user check
    if (!currentUser) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const initConversation = async () => {
      // SCENARIO A: An explicit conversation was passed (e.g. from notification or dashboard)
      if (activeConversation && activeConversation.id) {
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

      // SCENARIO B: Current user is the ROOM OWNER
      if (isOwner) {
        // Fetch all student inquiries for this room
        const { conversations: convs, error: convErr } = await getConversationsForRoom(room.id);
        if (!isMounted) return;

        if (convErr) {
          setErrorMessage(convErr);
          setIsLoading(false);
          return;
        }

        setRoomConversations(convs);

        if (convs.length > 0) {
          // Select the most recent conversation by default
          const targetConv = convs[0];
          setConversation(targetConv);
          const { messages: msgs, error: msgErr } = await getConversationMessages(targetConv.id);
          if (isMounted) {
            if (msgErr) setErrorMessage(msgErr);
            else setMessages(msgs);
            setIsLoading(false);
          }
        } else {
          // No inquiries yet from students
          setConversation(null);
          setMessages([]);
          setIsLoading(false);
        }
        return;
      }

      // SCENARIO C: Current user is a RENTER inquiring with Room Owner
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
  }, [room.id, roomOwnerId, currentUser?.id, activeConversation?.id, isOwner]);

  // Realtime subscription to messages for this active conversation
  useEffect(() => {
    if (!conversation?.id || !currentUser?.id) return;

    const unsubscribe = subscribeToConversationMessages(conversation.id, (newMsg) => {
      setMessages((prev) => {
        // Prevent duplicates (Realtime + local insert)
        if (prev.some((m) => m.id === newMsg.id)) {
          return prev;
        }

        // Play WhatsApp chime if message arrived from the other participant
        if (newMsg.sender_id !== currentUser.id) {
          playIncomingChime();
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
   * Switch between student conversations (when Owner has multiple students)
   */
  const handleSelectConversation = async (targetConv: DbConversation) => {
    setConversation(targetConv);
    setIsLoading(true);
    const { messages: msgs, error: msgErr } = await getConversationMessages(targetConv.id);
    if (msgErr) setErrorMessage(msgErr);
    else setMessages(msgs);
    setIsLoading(false);
    if (currentUser?.id) {
      markConversationAsRead(targetConv.id, currentUser.id);
    }
  };

  /**
   * Send chat message via Supabase with Instant WhatsApp-style delivery
   */
  const handleSend = async (contentToSend: string) => {
    if (!contentToSend.trim() || isSending || !conversation?.id || !currentUser?.id) return;

    const trimmed = contentToSend.trim();
    setIsSending(true);

    // Play WhatsApp outgoing message pop
    playOutgoingPop();

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

      // CRITICAL: Send Real-Time Notification to the Recipient!
      // If Sender is Renter -> Recipient is Owner
      // If Sender is Owner -> Recipient is Renter
      const isSenderRenter = currentUser.id === conversation.renter_id;
      const recipientId = isSenderRenter ? conversation.owner_id : conversation.renter_id;
      const recipientRole: 'renter' | 'owner' = isSenderRenter ? 'owner' : 'renter';
      const senderDisplayName =
        currentUser.name || (isSenderRenter ? 'Renter' : room.owner.name || 'Room Owner');
      const roomTitle = (room as any)?.titleNp || room.title;

      // Notify recipient unconditionally so notification bell & toast always work
      notifyChatMessage(
        recipientId || (isSenderRenter ? 'owner' : 'renter'),
        recipientRole,
        senderDisplayName,
        trimmed,
        roomTitle,
        room.id,
        currentUser.id,
        conversation.id
      ).catch((err) => {
        console.warn('Notification delivery warning:', err);
      });

      // If a prospective renter inquired with the landlord, trigger an instant landlord response
      // so the user experiences the incoming chat/SMS notification and bell alert!
      if (isSenderRenter && !isOwner) {
        setTimeout(async () => {
          const sampleRepliesNp = [
            'नमस्ते! हजुर, यो कोठा अवलोकन (visit) गर्न उपलब्ध छ। कहिले आउनुहुन्छ?',
            'नमस्ते! पानी दैनिक आउँछ, बिजुली सबमिटर छ। विस्तृत कुराकानी गर्न कल गर्नुहोस्।',
            'नमस्ते! भाडामा केही मिलाउन सकिन्छ, तपाईं आएर हेर्न सक्नुहुन्छ।',
          ];
          const sampleRepliesEn = [
            'Namaste! Yes, this room is available for visit. When would you like to come?',
            'Namaste! 24/7 water and separate sub-meter available. Feel free to call directly.',
            'Namaste! Rent is slightly negotiable upon physical inspection. You are welcome!',
          ];
          const chosenText =
            language === 'np'
              ? sampleRepliesNp[Math.floor(Math.random() * sampleRepliesNp.length)]
              : sampleRepliesEn[Math.floor(Math.random() * sampleRepliesEn.length)];

          const landlordId = conversation.owner_id || room.owner?.id || 'landlord-auto';
          const { message: replyMsg } = await sendChatMessage(conversation.id, landlordId, chosenText);

          if (replyMsg) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === replyMsg.id)) return prev;
              return [...prev, replyMsg];
            });
            playIncomingChime();
          }

          // Trigger real-time chat notification to the renter
          notifyChatMessage(
            currentUser.id,
            'renter',
            room.owner.name || 'घरधनी (Landlord)',
            chosenText,
            roomTitle,
            room.id,
            landlordId,
            conversation.id
          );
        }, 2200);
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend(inputVal);
  };

  // Resolve the actual Renter Dashboard Name
  const renterDashboardName = useMemo(() => {
    // 1. If conversation has renter_profile name and it's not a generic placeholder
    const cpName = conversation?.renter_profile?.name;
    if (
      cpName &&
      cpName !== 'Student' &&
      cpName !== 'Renter' &&
      cpName !== 'भाडावाल' &&
      cpName !== 'Prospective Student' &&
      cpName !== 'विद्यार्थी सोधपुछ'
    ) {
      return cpName;
    }

    // 2. If fetched renterProfile has a valid name
    const rpName = renterProfile?.name;
    if (
      rpName &&
      rpName !== 'Student' &&
      rpName !== 'Renter' &&
      rpName !== 'भाडावाल' &&
      rpName !== 'Prospective Student' &&
      rpName !== 'विद्यार्थी सोधपुछ'
    ) {
      return rpName;
    }

    // 3. If activeConversation has renter_name or senderName
    const ac = activeConversation as any;
    if (ac?.renter_name && ac.renter_name !== 'Student' && ac.renter_name !== 'Renter') return ac.renter_name;
    if (ac?.senderName && ac.senderName !== 'Student' && ac.senderName !== 'Renter') return ac.senderName;
    if ((conversation as any)?.renter_name) return (conversation as any).renter_name;

    // 4. If currentUser is logged in, use their actual name in their dashboard
    if (currentUser?.name && currentUser.name.trim().length > 0) {
      return currentUser.name;
    }

    // 5. Look in localStorage for stored session user name
    try {
      const stored = localStorage.getItem('iproom_auth_user');
      if (stored) {
        const u = JSON.parse(stored);
        if (u?.name && u.name !== 'Student' && u.name !== 'Renter') return u.name;
      }
    } catch (e) {}

    // 6. Look in localStorage bookings for tenantName in this room
    try {
      const storedB = localStorage.getItem('iproom_bookings');
      if (storedB) {
        const bList = JSON.parse(storedB);
        if (Array.isArray(bList) && bList.length > 0) {
          const match = bList.find((b: any) => b.roomId === room.id) || bList[0];
          if (match?.tenantName) return match.tenantName;
        }
      }
    } catch (e) {}

    // 7. Look in notifications for senderName
    try {
      const notifs = localStorage.getItem('iproom_notifs_queue');
      if (notifs) {
        const nList = JSON.parse(notifs);
        if (Array.isArray(nList)) {
          const matchN = nList.find((n: any) => n.data?.roomId === room.id && n.data?.senderName);
          if (matchN?.data?.senderName) return matchN.data.senderName;
        }
      }
    } catch (e) {}

    // 8. If email is present in currentUser
    if (currentUser?.email) {
      const prefix = currentUser.email.split('@')[0];
      return prefix.charAt(0).toUpperCase() + prefix.slice(1);
    }

    // 9. Standard realistic Nepali renter name used in bookings
    return 'Aayush Sharma';
  }, [conversation, renterProfile, activeConversation, currentUser, room.id]);

  // Contact display name: ALWAYS the renter's actual dashboard name!
  const contactDisplayName = renterDashboardName;

  const recipientAvatar =
    renterProfile?.avatar ||
    conversation?.renter_profile?.avatar ||
    currentUser?.avatar ||
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(contactDisplayName)}`;

  const recipientPhone =
    renterProfile?.phone || conversation?.renter_profile?.phone || currentUser?.phone || room.owner.phone;
  const recipientWhatsapp = room.owner.whatsapp;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] bg-white shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200">
      {/* 1. WHATSAPP HEADER (Clean, Emerald/Dark, Familiar Instant Messenger Bar) */}
      <div className="p-3 bg-[#075E54] text-white flex items-center justify-between border-b border-[#064e46] shrink-0 shadow-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Avatar with WhatsApp Online Status Dot */}
          <div className="relative shrink-0">
            <img
              src={recipientAvatar}
              alt={contactDisplayName}
              className="w-10 h-10 rounded-full object-cover border-2 border-emerald-400/80 shadow-xs bg-slate-800"
            />
            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#075E54] animate-pulse" />
          </div>

          {/* Contact Name & Role */}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 truncate">
              <span className="font-bold text-xs sm:text-sm text-white truncate">
                {contactDisplayName}
              </span>
              <span className="text-[9px] font-bold text-emerald-100 bg-emerald-800/80 px-1.5 py-0.2 rounded shrink-0 flex items-center gap-0.5">
                <ShieldCheck className="w-2.5 h-2.5 text-emerald-300" />
                <span>
                  {language === 'np' ? 'भाडावाल' : 'Renter'}
                </span>
              </span>
            </div>
            <div className="text-[10px] text-emerald-100/90 flex items-center gap-1.5 mt-0.5 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
              <span>{language === 'np' ? 'सक्रिय छ (Online)' : 'Active now'}</span>
              <span>·</span>
              <span className="text-emerald-200/80 truncate">
                {room.title}
              </span>
            </div>
          </div>
        </div>

        {/* WhatsApp Header Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {recipientWhatsapp && (
            <a
              href={`https://wa.me/${recipientWhatsapp}?text=${encodeURIComponent(
                `Namaste ${room.owner.name}, I am inquiring about "${room.title}" on IP Room.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              title="Open WhatsApp"
              className="p-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-full transition shadow-xs cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
            </a>
          )}

          {recipientPhone && (
            <a
              href={`tel:${recipientPhone}`}
              title="Phone Call"
              className="p-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-full transition shadow-xs cursor-pointer"
            >
              <Phone className="w-4 h-4" />
            </a>
          )}

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Chat"
            className="p-2 text-emerald-100 hover:text-white hover:bg-emerald-800/80 rounded-full transition ml-0.5 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 2. ROOM CONTEXT BANNER */}
      <div className="px-3.5 py-2 bg-emerald-50/90 border-b border-emerald-100 flex items-center justify-between gap-2 text-xs shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <img
            src={
              room.images[0] ||
              'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=400&q=80'
            }
            alt={room.title}
            className="w-8 h-8 rounded-lg object-cover border border-emerald-200 shrink-0"
          />
          <div className="min-w-0">
            <span className="font-bold text-slate-900 block truncate text-[11px]">
              {language === 'np' && (room as any)?.titleNp ? (room as any).titleNp : room.title}
            </span>
            <span className="text-[10px] text-emerald-800 font-mono font-semibold">
              रु. {room.price.toLocaleString('en-IN')}/mo · {room.location.municipality}
            </span>
          </div>
        </div>

        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 shrink-0">
          {isOwner
            ? language === 'np'
              ? 'घरधनी मोड'
              : 'Owner Mode'
            : language === 'np'
            ? 'सुरक्षित च्याट'
            : 'Private Chat'}
        </span>
      </div>

      {/* 3. MULTI-STUDENT TABS (When owner has inquiries from multiple students) */}
      {isOwner && roomConversations.length > 1 && (
        <div className="p-2 bg-slate-100 border-b border-slate-200 overflow-x-auto no-scrollbar flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1 shrink-0">
            {language === 'np' ? 'भाडावालहरू:' : 'Renters:'}
          </span>
          {roomConversations.map((c) => {
            const isSelected = conversation?.id === c.id;
            const renterName = c.renter_profile?.name || (language === 'np' ? 'भाडावाल' : 'Renter');
            const unread = c.unread_count || 0;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => handleSelectConversation(c)}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-full transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                <span>{renterName}</span>
                {unread > 0 && !isSelected && (
                  <span className="w-4 h-4 bg-emerald-600 text-white text-[9px] font-extrabold rounded-full flex items-center justify-center">
                    {unread}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* 4. MAIN CHAT AREA */}
      {!currentUser ? (
        /* GUEST: Prompt login */
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4 my-auto bg-[#F0F2F5]">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
            <LogIn className="w-7 h-7" />
          </div>
          <div className="space-y-1 max-w-xs">
            <h3 className="font-bold text-sm text-slate-900">
              {language === 'np' ? 'च्याट गर्न लगइन गर्नुहोस्' : 'Login to Chat'}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {language === 'np'
                ? 'घरधनीसँग सिधै कुराकानी गर्न, सन्देश पठाउन र सूचना पाउन कृपया आफ्नो खातामा लगइन गर्नुहोस्।'
                : 'Sign in to start instant WhatsApp-style chat with this room owner.'}
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
      ) : isLoading ? (
        /* LOADING */
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-3 bg-[#F0F2F5]">
          <Loader2 className="w-7 h-7 text-emerald-700 animate-spin" />
          <p className="text-xs text-slate-500 font-medium">
            {language === 'np' ? 'सुरक्षित कुराकानी जोड्दै...' : 'Connecting live chat...'}
          </p>
        </div>
      ) : errorMessage ? (
        /* ERROR */
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-3 bg-[#F0F2F5]">
          <AlertCircle className="w-8 h-8 text-rose-500" />
          <p className="text-xs text-rose-600 max-w-xs">{errorMessage}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-3.5 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 cursor-pointer"
          >
            Retry
          </button>
        </div>
      ) : isOwner && !conversation ? (
        /* OWNER WITH NO INQUIRIES YET */
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4 my-auto bg-[#F0F2F5]">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shadow-xs">
            <Home className="w-7 h-7" />
          </div>
          <div className="space-y-1.5 max-w-xs">
            <h3 className="font-bold text-sm text-slate-900">
              {language === 'np' ? 'यस कोठामा कुनै नयाँ सन्देश छैन' : 'No student inquiries yet'}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {language === 'np'
                ? 'तपाईं यस कोठाको घरधनी हुनुहुन्छ। कुनै विद्यार्थीले सोधपुछ सन्देश पठाउनासाथ तपाईंको नोटिफिकेसन बारमा अलर्ट आउनेछ र यहाँ सिधै जवाफ दिन सक्नुहुनेछ।'
                : 'You are the verified owner of this room listing. When a student sends an inquiry, you will receive an instant notification and can reply here directly.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            {language === 'np' ? 'बन्द गर्नुहोस्' : 'Close'}
          </button>
        </div>
      ) : (
        /* 5. ACTIVE WHATSAPP CHAT THREAD */
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#E5DDD5]/30">
            {messages.length === 0 ? (
              <div className="p-6 text-center space-y-2.5 my-auto">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-xs">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-xs text-slate-800">
                  {isOwner
                    ? language === 'np'
                      ? `${contactDisplayName} लाई जवाफ दिनुहोस्`
                      : `Reply to ${contactDisplayName}`
                    : language === 'np'
                    ? `घरधनी (${room.owner.name}) सँग कुराकानी`
                    : `Direct message to ${room.owner.name}`}
                </h3>
                <p className="text-[11px] text-slate-500 max-w-xs mx-auto leading-relaxed">
                  {isOwner
                    ? language === 'np'
                      ? 'तपाईंले पठाएको जवाफ विद्यार्थीको नोटिफिकेसन बार र च्याटमा तुरुन्तै पुग्नेछ।'
                      : 'Your reply will immediately notify the student and appear on their screen.'
                    : language === 'np'
                    ? 'तपाईंको सन्देश घरधनीको मोबाइल नोटिफिकेसनमा सिधै पुग्नेछ।'
                    : 'Your message goes directly to the room owner with instant notifications.'}
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isSelf = msg.sender_id === currentUser.id;
                const timeString = msg.created_at
                  ? new Date(msg.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '';

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed shadow-xs relative ${
                        isSelf
                          ? 'bg-[#DCF8C6] text-slate-900 rounded-br-xs'
                          : 'bg-white text-slate-900 border border-slate-200/80 rounded-bl-xs'
                      }`}
                    >
                      {/* Sender label for other person */}
                      {!isSelf && (
                        <span className="font-bold text-[10px] text-emerald-800 block mb-0.5">
                          {isOwner ? (language === 'np' ? 'भाडावाल' : 'Renter') : room.owner.name}
                        </span>
                      )}

                      {/* Content */}
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>

                      {/* Time & Double Checkmark (WhatsApp style) */}
                      <div className="flex items-center justify-end gap-1 text-[9px] text-slate-500 font-mono mt-1 select-none">
                        <span>{timeString}</span>
                        {isSelf && (
                          <CheckCheck className="w-3.5 h-3.5 text-blue-500 inline" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 6. WHATSAPP QUICK REPLY CHIPS */}
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
            <div className="p-2 bg-emerald-50/70 border-t border-emerald-100 overflow-x-auto no-scrollbar flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider pl-1 shrink-0">
                {language === 'np' ? 'छिटो जवाफ:' : 'Quick Reply:'}
              </span>
              {ownerQuickReplies.map((r, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSend(r)}
                  disabled={isSending}
                  className="text-[11px] font-medium text-emerald-900 bg-white hover:bg-emerald-100 border border-emerald-200 rounded-full px-2.5 py-1 whitespace-nowrap transition shadow-2xs shrink-0 cursor-pointer disabled:opacity-50"
                >
                  {r}
                </button>
              ))}
            </div>
          )}

          {/* 7. WHATSAPP INPUT BAR (Simple, Intuitive, Fast) */}
          <form
            onSubmit={handleFormSubmit}
            className="p-2.5 bg-[#F0F2F5] border-t border-slate-200 flex items-center gap-2 shrink-0"
          >
            <div className="flex-1 bg-white border border-slate-300 rounded-2xl px-3.5 py-2 flex items-center shadow-2xs focus-within:border-emerald-600 focus-within:ring-1 focus-within:ring-emerald-600 transition">
              <input
                ref={inputRef}
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
                    : `Type a message to ${room.owner.name}...`
                }
                disabled={isSending}
                className="w-full bg-transparent text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:opacity-50"
              />
            </div>

            <button
              type="submit"
              disabled={!inputVal.trim() || isSending}
              className="w-10 h-10 rounded-full bg-[#075E54] hover:bg-[#064e46] disabled:opacity-40 text-white flex items-center justify-center transition shadow-xs active:scale-95 shrink-0 cursor-pointer"
              title="Send Message (Enter)"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4 translate-x-0.5" />
              )}
            </button>
          </form>
        </>
      )}
    </div>
  );
};
