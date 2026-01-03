
import React from 'react';
import { Message } from '../types';
import { User, Cpu } from 'lucide-react';

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
      <div className={`flex items-start gap-3 max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        <div className={`mt-1 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border ${isUser ? 'bg-zinc-800 border-zinc-700' : 'alexa-gradient border-blue-400/50 shadow-lg shadow-blue-500/20'}`}>
          {isUser ? <User size={16} className="text-zinc-400" /> : <Cpu size={16} className="text-white" />}
        </div>
        
        <div className="flex flex-col gap-1">
          <div
            className={`px-4 py-3 rounded-2xl text-[15px] leading-relaxed shadow-sm transition-all
              ${isUser 
                ? 'bg-zinc-100 text-zinc-900 rounded-tr-none' 
                : 'glass-panel text-zinc-100 rounded-tl-none border-zinc-700/50'}
            `}
          >
            <p className="whitespace-pre-wrap">{message.text}</p>
            
            {message.sources && message.sources.length > 0 && (
              <div className="mt-4 pt-3 border-t border-zinc-700/30">
                <p className="text-[10px] font-bold uppercase tracking-wider text-blue-400/80 mb-2">Найдено в сети:</p>
                <div className="flex flex-wrap gap-2">
                  {message.sources.map((source, idx) => (
                    <a
                      key={idx}
                      href={source.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] glass-panel hover:bg-zinc-700/50 text-blue-300 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 truncate max-w-[200px]"
                    >
                      <span className="w-1 h-1 bg-blue-400 rounded-full"></span>
                      {source.title || 'Источник'}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
          <span className={`text-[10px] text-zinc-500 font-medium px-1 ${isUser ? 'text-right' : 'text-left'}`}>
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  );
};
