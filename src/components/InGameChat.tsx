import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, ChevronDown, Sparkles } from 'lucide-react';
import { AvatarBadge } from './AvatarBadge';
import { sound } from '../core/audio/soundEngine';

export interface ChatMessage {
  id: string;
  senderName: string;
  senderAvatarId?: string;
  senderAvatarEmoji?: string;
  text: string;
  timestamp: number;
  isMe: boolean;
  isSystem?: boolean;
}

export interface InGameChatProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isMultiplayer?: boolean;
}

export const InGameChat: React.FC<InGameChatProps> = ({
  messages,
  onSendMessage,
  isMultiplayer = false
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [inputText, setInputText] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [spamWarning, setSpamWarning] = useState<string | null>(null);
  const [isCooldown, setIsCooldown] = useState(false);
  const lastSendTimeRef = useRef<number>(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef(messages.length);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current) {
      if (isOpen) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      } else {
        setUnreadCount(c => c + 1);
      }
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages.length, isOpen]);

  const handleToggle = () => {
    sound.playClick();
    setIsOpen(open => {
      if (!open) setUnreadCount(0);
      return !open;
    });
  };

  const handleSend = () => {
    const trimmed = inputText.trim();
    if (!trimmed) return;

    const now = Date.now();
    if (now - lastSendTimeRef.current < 1500) {
      setSpamWarning('⚠️ Lütfen biraz bekleyin...');
      window.setTimeout(() => setSpamWarning(null), 1600);
      return;
    }

    lastSendTimeRef.current = now;
    setIsCooldown(true);
    window.setTimeout(() => setIsCooldown(false), 1500);

    sound.playClick();
    onSendMessage(trimmed);
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <aside
      aria-label="Oyun İçi Sohbet"
      className="fixed bottom-3 right-3 sm:bottom-4 sm:right-4 z-40 flex flex-col items-end font-sans select-none"
    >
      {/* Minimized Toggle Pill (only if collapsed) */}
      {!isOpen && (
        <button
          onClick={handleToggle}
          className="relative px-3 py-1.5 rounded-2xl bg-slate-950/60 hover:bg-slate-900/90 backdrop-blur-md border border-white/15 text-slate-200 hover:text-white shadow-[0_8px_25px_rgba(0,0,0,0.5)] transition-all active:scale-95 flex items-center gap-2 cursor-pointer group"
          title="Sohbeti Aç"
        >
          <MessageSquare className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-bold tracking-wide">Sohbet</span>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white font-black text-[10px] animate-pulse shadow-md">
              {unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Expanded Floating Chat Box: YUKARI UZATILMIŞ, SPAM KORUMALI */}
      {isOpen && (
        <div className="w-64 sm:w-76 h-[340px] sm:h-[400px] rounded-2xl bg-slate-950/50 hover:bg-slate-950/90 opacity-75 hover:opacity-100 backdrop-blur-md border border-white/15 hover:border-white/30 shadow-[0_12px_40px_rgba(0,0,0,0.7)] flex flex-col overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-bottom-2">
          {/* Chat Header */}
          <div className="px-3.5 py-2.5 bg-black/50 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[11px] font-black text-white font-cyber tracking-wider">
                SOHBET
              </span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/10 text-slate-300 font-mono">
                {isMultiplayer ? 'Online' : 'Botlar'}
              </span>
            </div>
            <button
              onClick={handleToggle}
              title="Gizle"
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Spam Warning Toast */}
          {spamWarning && (
            <div className="mx-2 mt-1 px-2.5 py-1 rounded-lg bg-rose-500/20 border border-rose-400/40 text-rose-300 text-[10px] font-bold text-center animate-in fade-in">
              {spamWarning}
            </div>
          )}

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-2 text-xs">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400/60 p-2">
                <Sparkles className="w-4 h-4 mb-1 text-amber-400/40" />
                <p className="text-[10px] font-medium">Sohbet hazır.</p>
                <p className="text-[9px] text-slate-500">
                  Masadakilere mesaj yaz!
                </p>
              </div>
            ) : (
              messages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex items-start gap-1.5 ${
                    msg.isMe ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  <AvatarBadge
                    avatarId={msg.senderAvatarId || 'wolf'}
                    fallbackEmoji={msg.senderAvatarEmoji}
                    size="xs"
                  />
                  <div
                    className={`max-w-[78%] flex flex-col ${
                      msg.isMe ? 'items-end' : 'items-start'
                    }`}
                  >
                    <span className="text-[9px] font-bold text-slate-400 px-1 mb-0.5">
                      {msg.senderName}
                    </span>
                    <div
                      className={`px-3 py-1.5 rounded-2xl text-[11px] leading-tight break-words shadow-sm ${
                        msg.isMe
                          ? 'bg-amber-500/90 text-slate-950 font-semibold rounded-tr-xs'
                          : 'bg-slate-800/90 text-slate-100 border border-white/10 rounded-tl-xs'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Box with Cooldown Spam Prevention */}
          <div className="p-2 bg-black/50 border-t border-white/10 flex items-center gap-1.5">
            <input
              type="text"
              value={inputText}
              maxLength={80}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isCooldown ? "Bekleyin..." : "Mesaj yazın..."}
              disabled={isCooldown}
              className="flex-1 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/80 transition-colors disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={!inputText.trim() || isCooldown}
              className="p-2 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-30 disabled:hover:bg-amber-400 text-slate-950 transition-all cursor-pointer active:scale-95 shadow-md"
              title="Gönder"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};
