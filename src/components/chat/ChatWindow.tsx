import React, { useState, useEffect, useRef } from 'react';
import {
  Language,
  UserProfile,
  RoomListing,
  ChatReportReason,
} from '../../types';
import {
  DbConversation,
  DbMessage,
  getConversationMessages,
  sendChatMessage,
  uploadChatAttachment,
  markConversationAsRead,
  deleteMessageSoft,
  subscribeToConversation,
  sendTypingIndicator,
  archiveConversation,
} from '../../services/supabase/chatService';
import { isValidUUID, stringToUUID } from '../../lib/supabase';
import { ReportModal } from './ReportModal';
import { BlockConfirmModal } from './BlockConfirmModal';
import {
  Send,
  Image as ImageIcon,
  Paperclip,
  Check,
  CheckCheck,
  Clock,
  ArrowLeft,
  MoreVertical,
  Archive,
  Ban,
  ShieldAlert,
  Copy,
  Trash2,
  ExternalLink,
  MapPin,
  Building,
  Loader2,
  X,
  AlertCircle,
  Home,
} from 'lucide-react';

interface ChatWindowProps {
  conversation: DbConversation;
  currentUser: UserProfile;
  language: Language;
  onBackMobile?: () => void;
  onViewRoom?: (room: RoomListing) => void;
  onConversationUpdated?: () => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  conversation,
  currentUser,
  language,
  onBackMobile,
  onViewRoom,
  onConversationUpdated,
}) => {
  const [messages, setMessages] = useState<DbMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [activePreviewImage, setActivePreviewImage] = useState<string | null>(null);

  // Real-time states
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [toastNotice, setToastNotice] = useState<string | null>(null);

  // Modals
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isBlockOpen, setIsBlockOpen] = useState(false);
  const [reportingMessageId, setReportingMessageId] = useState<string | undefined>(undefined);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<any>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Identify partner (counter-party in conversation)
  const isCurrentUserOwner = conversation.owner_id === currentUser.id;
  const partnerProfile: {
    id: string;
    name: string;
    role?: string;
    avatar?: string;
    email?: string;
    phone?: string;
  } = isCurrentUserOwner
    ? conversation.renter_profile || {
        id: conversation.renter_id,
        name: 'Renter / Student',
        role: 'renter',
        avatar: undefined,
      }
    : conversation.owner_profile || {
        id: conversation.owner_id,
        name: 'Room Landlord',
        role: 'owner',
        avatar: undefined,
      };

  const partnerId = isCurrentUserOwner ? conversation.renter_id : conversation.owner_id;
  const isPartnerOnline = onlineUsers.includes(partnerId);

  // Close more menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  // Show transient toast notification
  const showToast = (text: string) => {
    setToastNotice(text);
    setTimeout(() => setToastNotice(null), 3500);
  };

  // 1. Initial messages fetch & mark as read
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    getConversationMessages(conversation.id).then(({ messages: fetchedMsgs }) => {
      if (!isMounted) return;
      setMessages(fetchedMsgs);
      setIsLoading(false);
      markConversationAsRead(conversation.id, currentUser.id).then(() => {
        if (onConversationUpdated) {
          onConversationUpdated();
        }
      });
    });

    return () => {
      isMounted = false;
    };
  }, [conversation.id, currentUser.id]);

  // 2. Real-time subscription (PostgreSQL INSERT / UPDATE, Broadcast typing, Presence)
  useEffect(() => {
    const unsubscribe = subscribeToConversation(
      conversation.id,
      currentUser.id,
      currentUser.name,
      {
        onMessage: (newMsg) => {
          setMessages((prev) => {
            const exists = prev.some((m) => m.id === newMsg.id);
            if (exists) {
              return prev.map((m) => (m.id === newMsg.id ? { ...m, ...newMsg } : m));
            }
            return [...prev, newMsg];
          });

          // Mark incoming message as read if we are currently looking at this conversation
          const safeMyId = isValidUUID(currentUser.id) ? currentUser.id : stringToUUID(currentUser.id);
          const isSenderMe =
            newMsg.sender_id === currentUser.id ||
            newMsg.sender_id === safeMyId ||
            (newMsg as any).raw_sender_id === currentUser.id;

          if (!isSenderMe) {
            markConversationAsRead(conversation.id, currentUser.id);
          }

          if (onConversationUpdated) {
            onConversationUpdated();
          }
        },
        onTyping: ({ userId, userName, isTyping }) => {
          if (userId === partnerId) {
            if (isTyping) {
              setTypingUser(userName);
            } else {
              setTypingUser(null);
            }
          }
        },
        onPresenceChange: (activeUserIds) => {
          setOnlineUsers(activeUserIds);
        },
      }
    );

    return () => {
      unsubscribe();
    };
  }, [conversation.id, currentUser.id, currentUser.name, partnerId]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUser]);

  // Handle typing debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);

    sendTypingIndicator(conversation.id, currentUser.id, currentUser.name, true);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingIndicator(conversation.id, currentUser.id, currentUser.name, false);
    }, 2000);
  };

  // Handle image attachment selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(file.type)) {
      showToast(language === 'np' ? 'कृपया JPG, PNG वा WebP तस्बिर मात्र छान्नुहोस्।' : 'Please choose a JPG, PNG, or WebP image.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast(language === 'np' ? 'तस्बिर ५MB भन्दा सानो हुनुपर्छ।' : 'Image must be smaller than 5MB.');
      return;
    }

    setSelectedImageFile(file);
    const objectUrl = URL.createObjectURL(file);
    setImagePreviewUrl(objectUrl);
  };

  const cancelImagePreview = () => {
    setSelectedImageFile(null);
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImagePreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Send message
  const handleSendMessage = async () => {
    const trimmed = inputText.trim();
    if (!trimmed && !selectedImageFile) return;

    setIsSending(true);
    let attachmentUrl: string | null = null;

    if (selectedImageFile) {
      setIsUploadingImage(true);
      const uploadRes = await uploadChatAttachment(selectedImageFile, currentUser.id);
      setIsUploadingImage(false);
      attachmentUrl = uploadRes.url;
      cancelImagePreview();
    }

    const optimisticId = `temp_${Date.now()}`;
    const optimisticMessage: DbMessage = {
      id: optimisticId,
      conversation_id: conversation.id,
      sender_id: currentUser.id,
      receiver_id: partnerId,
      content: trimmed,
      message_text: trimmed,
      message_type: attachmentUrl ? 'image' : 'text',
      attachment_url: attachmentUrl,
      is_read: false,
      created_at: new Date().toISOString(),
      status: 'sending',
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setInputText('');
    sendTypingIndicator(conversation.id, currentUser.id, currentUser.name, false);

    const { message: sentMsg } = await sendChatMessage(
      conversation.id,
      currentUser.id,
      trimmed || '📷 Photo attachment',
      {
        messageType: attachmentUrl ? 'image' : 'text',
        attachmentUrl,
        receiverId: partnerId,
      }
    );

    setIsSending(false);

    if (sentMsg) {
      setMessages((prev) =>
        prev.map((m) => (m.id === optimisticId ? { ...sentMsg, status: 'sent' } : m))
      );
    } else {
      setMessages((prev) =>
        prev.map((m) => (m.id === optimisticId ? { ...m, status: 'sent' } : m))
      );
    }

    if (onConversationUpdated) {
      onConversationUpdated();
    }
  };

  // Keyboard shortcut: Enter to send, Shift+Enter for newline
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Copy text to clipboard
  const handleCopyMessage = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast(language === 'np' ? 'सन्देश प्रतिलिपि भयो' : 'Message copied to clipboard');
  };

  // Soft-delete message
  const handleDeleteMessage = async (msgId: string) => {
    await deleteMessageSoft(msgId, currentUser.id);
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId
          ? {
              ...m,
              deleted_at: new Date().toISOString(),
              content: 'This message was deleted',
              message_text: 'This message was deleted',
            }
          : m
      )
    );
    showToast(language === 'np' ? 'सन्देश हटाइयो' : 'Message deleted');
  };

  // Archive conversation
  const handleArchive = async () => {
    await archiveConversation(conversation.id, currentUser.id);
    setIsMenuOpen(false);
    showToast(language === 'np' ? 'कुराकानी सुरक्षित गरियो (Archived)' : 'Conversation archived');
    if (onConversationUpdated) onConversationUpdated();
  };

  // Format date headers & message timestamps
  const formatMessageTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const getMessageDateHeader = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      if (date.toDateString() === today.toDateString()) {
        return language === 'np' ? 'आज' : 'Today';
      }
      if (date.toDateString() === yesterday.toDateString()) {
        return language === 'np' ? 'हिजो' : 'Yesterday';
      }
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return '';
    }
  };

  // Group messages by date
  const groupedMessages: { date: string; items: DbMessage[] }[] = [];
  messages.forEach((msg) => {
    const dateLabel = getMessageDateHeader(msg.created_at);
    const lastGroup = groupedMessages[groupedMessages.length - 1];
    if (lastGroup && lastGroup.date === dateLabel) {
      lastGroup.items.push(msg);
    } else {
      groupedMessages.push({ date: dateLabel, items: [msg] });
    }
  });

  return (
    <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden">
      {/* Toast Notice */}
      {toastNotice && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 bg-slate-900/90 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg backdrop-blur-xs animate-in fade-in duration-150">
          {toastNotice}
        </div>
      )}

      {/* 1. CHAT HEADER */}
      <div className="bg-white px-4 py-3 border-b border-slate-200 flex items-center justify-between shrink-0 shadow-xs z-20">
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile Back Button */}
          {onBackMobile && (
            <button
              type="button"
              onClick={onBackMobile}
              className="lg:hidden p-1.5 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
              aria-label="Back to conversations list"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          {/* Partner Avatar with Online Indicator */}
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-600 to-teal-800 text-white font-bold flex items-center justify-center text-sm shadow-xs border border-white">
              {partnerProfile.avatar ? (
                <img
                  src={partnerProfile.avatar}
                  alt={partnerProfile.name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span>{partnerProfile.name.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <span
              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                isPartnerOnline ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
              title={isPartnerOnline ? 'Online' : 'Offline'}
            />
          </div>

          {/* Partner Name & Online Status */}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="font-bold text-sm text-slate-900 truncate">
                {partnerProfile.name}
              </h2>
              <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded font-medium shrink-0">
                {partnerProfile.role === 'owner' ? (language === 'np' ? 'घरधनी' : 'Landlord') : (language === 'np' ? 'भाडावाल' : 'Renter')}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-[11px]">
              {isPartnerOnline ? (
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{language === 'np' ? 'अनलाइन' : 'Online'}</span>
                </span>
              ) : (
                <span className="text-slate-400">
                  {language === 'np' ? 'अफलाइन' : 'Offline'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Options Menu & Actions */}
        <div className="flex items-center gap-1 relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
            title="Options"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-30 text-xs animate-in fade-in duration-100">
              <button
                type="button"
                onClick={handleArchive}
                className="w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition"
              >
                <Archive className="w-4 h-4 text-slate-500" />
                <span>{language === 'np' ? 'कुराकानी आर्काइभ गर्नुहोस्' : 'Archive Conversation'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsBlockOpen(true);
                }}
                className="w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition"
              >
                <Ban className="w-4 h-4 text-rose-500" />
                <span>{language === 'np' ? 'प्रयोगकर्ता ब्लक गर्नुहोस्' : 'Block User'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  setReportingMessageId(undefined);
                  setIsReportOpen(true);
                }}
                className="w-full px-3 py-2 text-left text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition font-medium"
              >
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span>{language === 'np' ? 'एडमिनलाई रिपोर्ट गर्नुहोस्' : 'Report Conversation'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. ROOM CONTEXT CARD (Section 19: Retains listing context) */}
      {conversation.room && (
        <div className="bg-white/95 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0 backdrop-blur-xs">
          <div className="flex items-center gap-3 min-w-0">
            {conversation.room.images && conversation.room.images[0] ? (
              <img
                src={conversation.room.images[0]}
                alt={conversation.room.title}
                className="w-12 h-12 rounded-lg object-cover shrink-0 border border-slate-200"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
                <Home className="w-6 h-6" />
              </div>
            )}
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 block">
                {language === 'np' ? 'सम्बन्धित कोठा' : 'Regarding Room Listing'}
              </span>
              <h3 className="font-bold text-xs text-slate-900 truncate">
                {language === 'np' ? conversation.room.title_np || conversation.room.title : conversation.room.title}
              </h3>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500 mt-0.5">
                <span className="font-mono font-bold text-emerald-800">
                  रु. {conversation.room.price?.toLocaleString('en-IN')}/month
                </span>
                {conversation.room.location && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-0.5 truncate max-w-[150px] sm:max-w-[200px]">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">
                        {typeof conversation.room.location === 'string'
                          ? conversation.room.location
                          : conversation.room.location.areaLandmark ||
                            conversation.room.location.district ||
                            conversation.room.location.fullAddress ||
                            ''}
                      </span>
                    </span>
                  </>
                )}
                {partnerProfile.role === 'owner' ? (
                  <>
                    <span>•</span>
                    <span className="truncate text-slate-600">Owner: {partnerProfile.name}</span>
                  </>
                ) : conversation.owner_profile?.name ? (
                  <>
                    <span>•</span>
                    <span className="truncate text-slate-600">Owner: {conversation.owner_profile.name}</span>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          {onViewRoom && (
            <button
              type="button"
              onClick={() => onViewRoom(conversation.room as unknown as RoomListing)}
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shrink-0 border border-emerald-200 shadow-xs cursor-pointer active:scale-95"
            >
              <span>{language === 'np' ? 'कोठा हेर्नुहोस्' : 'View Room'}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* 3. MESSAGE LIST CONTAINER */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-2">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            <p className="text-xs">{language === 'np' ? 'कुराकानी लोड हुँदैछ...' : 'Loading conversation history...'}</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <Send className="w-7 h-7" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-900">
                {language === 'np' ? 'कुराकानी सुरु गर्नुहोस्' : 'Start the Conversation'}
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mt-1 leading-relaxed">
                {language === 'np'
                  ? 'भाडा, पानीको तालिका, कोठा हेर्ने समय वा बुकिङबारे सिधै कुराकानी गर्नुहोस्।'
                  : 'Ask about availability, water schedule, rent discounts, visiting hours, or room facilities.'}
              </p>
            </div>
          </div>
        ) : (
          groupedMessages.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-3">
              {/* Date Separator (Section 5) */}
              <div className="flex items-center justify-center my-3">
                <span className="text-[11px] font-semibold text-slate-400 bg-slate-200/80 px-3 py-0.5 rounded-full">
                  {group.date}
                </span>
              </div>

              {group.items.map((msg) => {
                const isSelf = msg.sender_id === currentUser.id;
                const isDeleted = Boolean(msg.deleted_at);

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col group ${isSelf ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-end gap-1.5 max-w-[85%] sm:max-w-[70%]">
                      {/* Message Bubble */}
                      <div
                        className={`rounded-2xl p-3 shadow-xs relative text-xs leading-relaxed transition ${
                          isDeleted
                            ? 'bg-slate-100 text-slate-400 italic border border-slate-200'
                            : isSelf
                            ? 'bg-emerald-700 text-white rounded-br-xs'
                            : 'bg-white text-slate-900 rounded-bl-xs border border-slate-200'
                        }`}
                      >
                        {/* Image Attachment (Section 12) */}
                        {msg.attachment_url && !isDeleted && (
                          <div className="mb-2 rounded-lg overflow-hidden cursor-pointer">
                            <img
                              src={msg.attachment_url}
                              alt="Attachment"
                              onClick={() => setActivePreviewImage(msg.attachment_url || null)}
                              className="max-h-60 w-auto rounded-lg object-cover hover:opacity-95 transition"
                            />
                          </div>
                        )}

                        {/* Text Message */}
                        <p className="whitespace-pre-wrap break-words">{msg.content || msg.message_text}</p>

                        {/* Timestamp & Delivery Status */}
                        <div
                          className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                            isSelf ? 'text-emerald-100' : 'text-slate-400'
                          }`}
                        >
                          <span>{formatMessageTime(msg.created_at)}</span>
                          {isSelf && !isDeleted && (
                            <span>
                              {msg.status === 'sending' ? (
                                <Clock className="w-3 h-3 text-emerald-200" />
                              ) : msg.is_read || msg.status === 'read' ? (
                                <CheckCheck className="w-3.5 h-3.5 text-emerald-300 font-bold" />
                              ) : (
                                <Check className="w-3 h-3 text-emerald-200" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Message Action Trigger on hover */}
                      {!isDeleted && (
                        <div className="opacity-0 group-hover:opacity-100 transition flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleCopyMessage(msg.content || msg.message_text || '')}
                            className="p-1 text-slate-400 hover:text-slate-600 rounded bg-white border border-slate-200 shadow-xs"
                            title="Copy message"
                          >
                            <Copy className="w-3 h-3" />
                          </button>

                          {isSelf ? (
                            <button
                              type="button"
                              onClick={() => handleDeleteMessage(msg.id)}
                              className="p-1 text-rose-400 hover:text-rose-600 rounded bg-white border border-slate-200 shadow-xs"
                              title="Delete message"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setReportingMessageId(msg.id);
                                setIsReportOpen(true);
                              }}
                              className="p-1 text-rose-400 hover:text-rose-600 rounded bg-white border border-slate-200 shadow-xs"
                              title="Report message"
                            >
                              <ShieldAlert className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}

        {/* Real-time Typing Indicator (Section 13) */}
        {typingUser && (
          <div className="flex items-center gap-2 text-xs text-slate-500 italic bg-white/80 w-fit px-3 py-1.5 rounded-full border border-slate-200 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>{typingUser} is typing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 4. IMAGE PREVIEW DRAWER (Before Sending) */}
      {imagePreviewUrl && (
        <div className="bg-slate-100 p-3 border-t border-slate-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src={imagePreviewUrl}
              alt="Upload preview"
              className="w-16 h-16 rounded-lg object-cover border border-slate-300 shadow-xs"
            />
            <div className="text-xs">
              <span className="font-semibold text-slate-800 block truncate max-w-xs">
                {selectedImageFile?.name}
              </span>
              <span className="text-slate-500 text-[11px]">
                {((selectedImageFile?.size || 0) / 1024).toFixed(1)} KB
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={cancelImagePreview}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition"
            title="Remove attachment"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* 5. STICKY MESSAGE INPUT AREA (Section 5 & 12) */}
      <div className="bg-white p-3 sm:p-4 border-t border-slate-200 shrink-0">
        <div className="flex items-end gap-2">
          {/* Attachment button */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/jpeg,image/jpg,image/png,image/webp"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSending || isUploadingImage}
            className="p-2.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition cursor-pointer shrink-0 disabled:opacity-50"
            title="Attach image (JPG, PNG, WebP)"
          >
            <ImageIcon className="w-5 h-5" />
          </button>

          {/* Text input */}
          <div className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-2xl focus-within:bg-white focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-500/20 transition">
            <textarea
              ref={inputRef}
              rows={1}
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={
                language === 'np'
                  ? 'सन्देश लेख्नुहोस् (Enter = पठाउने, Shift+Enter = नयाँ लाइन)...'
                  : 'Type a message (Enter to send, Shift+Enter for new line)...'
              }
              className="w-full px-3.5 py-2.5 text-xs text-slate-900 bg-transparent outline-none resize-none max-h-32 leading-relaxed"
            />
          </div>

          {/* Send Button */}
          <button
            type="button"
            onClick={handleSendMessage}
            disabled={(!inputText.trim() && !selectedImageFile) || isSending || isUploadingImage}
            className="p-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 disabled:hover:bg-emerald-700 text-white rounded-xl transition shadow-xs flex items-center justify-center shrink-0 active:scale-95 cursor-pointer"
            title="Send Message"
          >
            {isSending || isUploadingImage ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Full Image Preview Modal */}
      {activePreviewImage && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <button
            type="button"
            onClick={() => setActivePreviewImage(null)}
            className="absolute top-4 right-4 p-2 text-white bg-slate-800/80 hover:bg-slate-700 rounded-full transition"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={activePreviewImage}
            alt="Full size attachment"
            className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
          />
        </div>
      )}

      {/* Report Modal */}
      {isReportOpen && (
        <ReportModal
          conversationId={conversation.id}
          reporterId={currentUser.id}
          reportedUserId={partnerId}
          reportedUserName={partnerProfile.name}
          messageId={reportingMessageId}
          language={language}
          onClose={() => setIsReportOpen(false)}
          onSuccess={() => {
            setIsReportOpen(false);
            showToast(language === 'np' ? 'रिपोर्ट पठाइयो। एडमिनले अनुगमन गर्नेछ।' : 'Report submitted successfully.');
          }}
        />
      )}

      {/* Block Confirm Modal */}
      {isBlockOpen && (
        <BlockConfirmModal
          blockerId={currentUser.id}
          blockedId={partnerId}
          blockedName={partnerProfile.name}
          conversationId={conversation.id}
          language={language}
          onClose={() => setIsBlockOpen(false)}
          onSuccess={() => {
            setIsBlockOpen(false);
            showToast(language === 'np' ? 'प्रयोगकर्ता ब्लक गरियो।' : 'User blocked.');
            if (onConversationUpdated) onConversationUpdated();
          }}
        />
      )}
    </div>
  );
};
