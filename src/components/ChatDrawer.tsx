import React, { useState } from 'react';
import { RoomListing, Language, ChatMessage, UserProfile } from '../types';
import { getTranslation } from '../data/translations';
import { notifyChatMessage } from '../services/fcmService';
import { generateUUID, isValidUUID } from '../services/supabase';
import { X, Send, ShieldCheck, CheckCheck } from 'lucide-react';

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

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: generateUUID(),
      senderId: isValidUUID(room.owner.id) ? room.owner.id : generateUUID(),
      senderName: room.owner.name,
      senderRole: 'owner',
      text: language === 'np'
        ? `नमस्ते! म ${room.owner.name} हुँ। यो कोठा "${room.titleNp}" को बारेमा केही सोध्नु छ कि?`
        : `Namaste! I am ${room.owner.name}. Feel free to ask anything about this room "${room.title}".`,
      timestamp: '10:04 AM',
      isSelf: false
    }
  ]);

  const [inputVal, setInputVal] = useState('');

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    const sentText = inputVal.trim();
    const myId = (currentUser?.id && isValidUUID(currentUser.id)) ? currentUser.id : generateUUID();

    const userMsg: ChatMessage = {
      id: generateUUID(),
      senderId: myId,
      senderName: currentUser?.name || 'You',
      senderRole: currentUser?.role || 'renter',
      text: sentText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSelf: true
    };

    setMessages(prev => [...prev, userMsg]);
    setInputVal('');

    // Trigger real-time FCM push notification to the room owner
    notifyChatMessage(
      isValidUUID(room.owner.id) ? room.owner.id : generateUUID(),
      'owner',
      currentUser?.name || 'Student Tenant',
      sentText,
      room.title,
      room.id
    );

    // Simulated quick landlord response with real-time push back to student
    setTimeout(() => {
      const ownerRepliesEn = [
        "Yes, absolutely! The water supply is continuous from our deep boring, and the WorldLink optical router is right outside the door.",
        "You can come tomorrow between 10:00 AM to 5:00 PM to inspect the room in person. Call me when you reach the main chowk!",
        "Yes, students are welcome! We just request quiet study hours after 10:00 PM for everyone's comfort."
      ];
      const ownerRepliesNp = [
        "हुन्छ हजुर, बोरिङको पानी २४ सै घण्टा आउँछ र इन्भर्टर भएकाले बत्ती जाँदा पनि पंखा र वाइफाइ चलिरहन्छ।",
        "भोलि बिहान १० देखि ५ बजेसम्म जुनसुकै समयमा कोठा हेर्न आउन सक्नुहुन्छ। मुख्य चोक पुगेर फोन गर्नुहोला!",
        "विद्यार्थीहरूका लागि यो ठाउँ एकदमै शान्त र सुरक्षित छ। टीयू क्याम्पस हिँडेरै ४ मिनेट लाग्छ।"
      ];

      const chosenReply = language === 'np'
        ? ownerRepliesNp[Math.floor(Math.random() * ownerRepliesNp.length)]
        : ownerRepliesEn[Math.floor(Math.random() * ownerRepliesEn.length)];

      const botReply: ChatMessage = {
        id: generateUUID(),
        senderId: isValidUUID(room.owner.id) ? room.owner.id : generateUUID(),
        senderName: room.owner.name,
        senderRole: 'owner',
        text: chosenReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isSelf: false
      };
      setMessages(prev => [...prev, botReply]);

      // Trigger push notification to student from the owner
      notifyChatMessage(
        myId,
        'renter',
        room.owner.name,
        chosenReply,
        room.title,
        room.id
      );
    }, 1200);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-white shadow-2xl border-l border-slate-200 flex flex-col">
      {/* Header */}
      <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <img
            src={room.owner.avatar}
            alt={room.owner.name}
            className="w-9 h-9 rounded-full object-cover border border-slate-700"
          />
          <div>
            <div className="flex items-center gap-1">
              <span className="font-semibold text-xs text-white">{room.owner.name}</span>
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <span className="text-[10px] text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Online (Typically replies in 10 mins)
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Rented room badge */}
      <div className="p-2.5 bg-slate-50 border-b border-slate-200 text-xs flex items-center gap-2 text-slate-600 truncate">
        <span className="font-semibold text-slate-900 shrink-0">Inquiring:</span>
        <span className="truncate">{room.title}</span>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F8FAFC]">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.isSelf ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                msg.isSelf
                  ? 'bg-emerald-700 text-white rounded-br-xs shadow-xs'
                  : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs shadow-xs'
              }`}
            >
              {msg.text}
            </div>
            <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-400 font-mono">
              <span>{msg.timestamp}</span>
              {msg.isSelf && <CheckCheck className="w-3 h-3 text-emerald-600" />}
            </div>
          </div>
        ))}
      </div>

      {/* Input box */}
      <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
        <input
          type="text"
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          placeholder={language === 'np' ? 'यहाँ सन्देश लेख्नुहोस्...' : 'Ask landlord about water, rent, visits...'}
          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <button
          type="submit"
          className="p-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl transition shadow-xs disabled:opacity-50"
          disabled={!inputVal.trim()}
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
