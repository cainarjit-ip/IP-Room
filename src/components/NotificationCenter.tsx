import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  CheckCircle2,
  Home,
  MessageSquare,
  AlertCircle,
  X,
  ExternalLink,
  ShieldAlert,
  Volume2,
  Check,
} from 'lucide-react';
import {
  AppNotification,
  requestPushNotificationPermission,
  markNotificationAsRead,
  addNotificationListener,
  CURRENT_CLIENT_SESSION_ID,
} from '../services/supabase/notificationService';
import { UserProfile, UserRole, Language } from '../types';

interface NotificationCenterProps {
  currentUser: UserProfile | null;
  activeRole: UserRole;
  language: Language;
  notifications: AppNotification[];
  onOpenBookingContract?: (bookingId: string) => void;
  onOpenOwnerDashboard?: () => void;
  onOpenChatWithRoom?: (roomId: string, conversationId?: string) => void;
  onOpenAuthModal?: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  currentUser,
  activeRole,
  language,
  notifications,
  onOpenBookingContract,
  onOpenOwnerDashboard,
  onOpenChatWithRoom,
  onOpenAuthModal,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeToast, setActiveToast] = useState<AppNotification | null>(null);
  const [pushStatus, setPushStatus] = useState<NotificationPermission | 'unsupported'>('default');
  const [isRequestingPush, setIsRequestingPush] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Check initial browser notification permission
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPushStatus(Notification.permission);
    } else {
      setPushStatus('unsupported');
    }
  }, []);

  // Listen to in-app foreground notifications for floating toast banner (ONLY for recipient)
  useEffect(() => {
    const unsubscribe = addNotificationListener((notif) => {
      // 1. NEVER show a notification to the sender who triggered the action!
      if (notif.senderSessionId && notif.senderSessionId === CURRENT_CLIENT_SESSION_ID) {
        return;
      }
      if (currentUser?.id && notif.data?.senderId && notif.data.senderId === currentUser.id) {
        return;
      }
      if (
        currentUser?.name &&
        notif.data?.senderName &&
        notif.data.senderName.trim().toLowerCase() === currentUser.name.trim().toLowerCase()
      ) {
        return;
      }

      // 2. Notification must strictly match the recipient's active role
      if (notif.toRole !== 'all' && notif.toRole !== activeRole) {
        return;
      }

      // 3. If directed to a specific user ID, ensure it matches current user
      if (notif.toUserId && notif.toUserId !== 'all') {
        if (currentUser?.id && notif.toUserId !== currentUser.id) {
          return;
        }
        if (!currentUser?.id && notif.toRole === 'owner') {
          return;
        }
      }

      // Show floating toast to recipient
      setActiveToast(notif);

      // Play soft web audio beep chime
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
        gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
      } catch (e) {
        // AudioContext not allowed without gesture
      }

      // Auto dismiss toast after 6 seconds
      const timer = setTimeout(() => {
        setActiveToast(prev => (prev?.id === notif.id ? null : prev));
      }, 6000);

      return () => clearTimeout(timer);
    });

    return () => unsubscribe();
  }, [activeRole, currentUser?.id, currentUser?.name]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleEnablePush = async () => {
    setIsRequestingPush(true);
    try {
      const res = await requestPushNotificationPermission(currentUser);
      setPushStatus(res.status);
    } finally {
      setIsRequestingPush(false);
    }
  };

  const handleNotificationClick = (notif: AppNotification) => {
    markNotificationAsRead(notif.id);
    setIsOpen(false);

    if (notif.type === 'booking_confirmed' && notif.data?.bookingId && onOpenBookingContract) {
      onOpenBookingContract(notif.data.bookingId);
    } else if (notif.type === 'booking_inquiry' && onOpenOwnerDashboard) {
      onOpenOwnerDashboard();
    } else if (notif.type === 'chat_message' && onOpenChatWithRoom) {
      const targetRoomId =
        notif.data?.roomId ||
        (notif as any).roomId ||
        notif.data?.bookingId ||
        (notif as any).reference_id ||
        '';
      const targetConvId =
        notif.data?.conversationId ||
        (notif as any).conversationId ||
        undefined;
      onOpenChatWithRoom(targetRoomId, targetConvId);
    }
  };

  const getIconForType = (type: AppNotification['type']) => {
    switch (type) {
      case 'booking_confirmed':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'booking_inquiry':
        return <Home className="w-4 h-4 text-blue-600" />;
      case 'chat_message':
        return <MessageSquare className="w-4 h-4 text-emerald-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-amber-600" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Floating In-App Real-time Push Notification Toast */}
      {activeToast && (
        <div className="fixed top-20 right-4 z-50 max-w-sm w-full bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-700 animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700">
                {getIconForType(activeToast.type)}
              </div>
              <div className="text-xs space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-white text-[13px]">{activeToast.title}</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <p className="text-slate-300 leading-relaxed text-[11px]">{activeToast.body}</p>
                <div className="pt-1 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleNotificationClick(activeToast);
                      setActiveToast(null);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-[10px] transition cursor-pointer"
                  >
                    <span>{language === 'np' ? 'हेर्नुहोस् (Reply)' : 'View & Reply'}</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                  <span className="text-[10px] text-slate-500 font-mono">Just now</span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveToast(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Bell Button (matches user's inspected CSS selector) */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/70 active:scale-95 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 cursor-pointer"
        title={language === 'np' ? 'सूचना तथा सन्देशहरू' : 'Notifications & Messages'}
        aria-label="Open notifications"
      >
        <Bell className="w-5 h-5 transition-transform duration-200 hover:rotate-12" />
        {currentUser && unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-4 h-4 px-1 bg-emerald-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white animate-pulse shadow-xs">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in-50 duration-150">
          {/* Header */}
          <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-emerald-400" />
              <h3 className="font-bold text-xs text-white">
                {language === 'np' ? 'सूचना केन्द्र (Notifications)' : 'Notifications & Alerts'}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {currentUser && unreadCount > 0 && (
                <span className="text-[10px] bg-emerald-950 text-emerald-300 font-mono px-2 py-0.5 rounded-full border border-emerald-800">
                  {unreadCount} unread
                </span>
              )}
            </div>
          </div>

          {/* FCM Push Permission Banner (Only if logged in) */}
          {currentUser && pushStatus !== 'granted' && pushStatus !== 'unsupported' && (
            <div className="p-3 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-emerald-900">
                <Volume2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span className="text-[11px] font-medium leading-tight">
                  {language === 'np'
                    ? 'च्याट र बुकिङको तत्काल नोटिफिकेसन पाउन सक्रिय गर्नुहोस्'
                    : 'Enable device push notifications for live chat & booking updates'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleEnablePush}
                disabled={isRequestingPush}
                className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-bold rounded-lg transition whitespace-nowrap shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isRequestingPush ? 'Enabling...' : 'Enable Alert'}
              </button>
            </div>
          )}

          {currentUser && pushStatus === 'granted' && (
            <div className="px-4 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                <Check className="w-3.5 h-3.5" />
                <span>Live Alerts Active</span>
              </span>
              <span className="text-[10px] text-slate-400">Instant Chat Sync</span>
            </div>
          )}

          {/* Notification List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {!currentUser ? (
              /* CLEAN EMPTY STATE BEFORE SIGNING IN: No unnecessary SMS or mock messages! */
              <div className="py-8 px-6 text-center text-xs space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto border border-emerald-100 shadow-2xs">
                  <Bell className="w-6 h-6 text-emerald-600" />
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-slate-800 text-sm">
                    {language === 'np' ? 'कृपया लग-इन गर्नुहोस्' : 'Sign in to view notifications'}
                  </p>
                  <p className="text-[11px] text-slate-500 leading-relaxed max-w-xs mx-auto">
                    {language === 'np'
                      ? 'तपाईंको नयाँ कोठा सोधपुछ, च्याट सन्देश र बुकिङ अलर्टहरू हेर्न कृपया आफ्नो खातामा लग-इन गर्नुहोस्।'
                      : 'Sign in to see incoming student inquiries, landlord replies, and real-time chat messages.'}
                  </p>
                </div>
                {onOpenAuthModal && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onOpenAuthModal();
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs shadow-xs transition active:scale-95 cursor-pointer"
                  >
                    <span>{language === 'np' ? 'लग-इन / दर्ता' : 'Sign In / Register'}</span>
                  </button>
                )}
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400 space-y-1">
                <Bell className="w-8 h-8 text-slate-200 mx-auto" />
                <p className="font-semibold text-slate-600">
                  {language === 'np' ? 'कुनै नयाँ सूचना छैन' : 'No notifications yet'}
                </p>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  {language === 'np'
                    ? 'च्याट सन्देश, कोठा सोधपुछ र बुकिङ सूचनाहरू यहाँ देखा पर्नेछन्।'
                    : 'Chat messages, room inquiries, and booking updates will appear here.'}
                </p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleNotificationClick(notif);
                    }
                  }}
                  className={`p-3.5 flex items-start gap-3 hover:bg-slate-50 transition cursor-pointer active:scale-[0.99] select-none ${
                    !notif.read ? 'bg-emerald-50/40' : 'bg-white'
                  }`}
                >
                  <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                    {getIconForType(notif.type)}
                  </div>
                  <div className="flex-1 text-xs space-y-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900 truncate">{notif.title}</span>
                      {!notif.read && (
                        <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed line-clamp-2">
                      {notif.body}
                    </p>
                    <div className="flex items-center justify-between pt-0.5">
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(notif.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {notif.type === 'chat_message' && (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-full transition border border-emerald-200 shadow-2xs hover:underline cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNotificationClick(notif);
                          }}
                        >
                          {language === 'np' ? 'च्याट खोल्नुहोस् →' : 'Open Chat →'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
