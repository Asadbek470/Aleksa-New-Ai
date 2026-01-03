
import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Volume2, VolumeX, ShieldCheck, LogOut, UserCircle, Search, Sparkles, LogIn } from 'lucide-react';
import { Message } from './types';
import { ChatMessage } from './components/ChatMessage';
import { chatWithAlexa, generateSpeech, playRawAudio } from './services/gemini';

const App: React.FC = () => {
  const [user, setUser] = useState<string | null>(localStorage.getItem('alexa_user'));
  const [loginInput, setLoginInput] = useState('');
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('alexa_chat_history');
    return saved ? JSON.parse(saved) : [
      {
        id: '1',
        role: 'assistant',
        text: 'Здравствуйте! Я Алекса, ваш персональный интеллектуальный ассистент. Чем я могу быть полезна сегодня?',
        timestamp: Date.now(),
      }
    ];
  });
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    localStorage.setItem('alexa_chat_history', JSON.stringify(messages));
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.lang = 'ru-RU';
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        handleSendMessage(transcript);
        setIsListening(false);
      };
      recognitionRef.current.onerror = () => setIsListening(false);
      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginInput.trim()) {
      setUser(loginInput);
      localStorage.setItem('alexa_user', loginInput);
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('alexa_user');
    setMessages([{
      id: Date.now().toString(),
      role: 'assistant',
      text: 'Сессия завершена. Жду вашего возвращения!',
      timestamp: Date.now(),
    }]);
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setIsListening(true);
      recognitionRef.current?.start();
    }
  };

  const handleSendMessage = async (textToSubmit?: string) => {
    const text = textToSubmit || inputText;
    if (!text.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: text,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const history = messages.slice(-10).map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }]
      }));

      const response = await chatWithAlexa(text, history);
      const assistantText = response.text || "Извините, возникла заминка. Попробуйте еще раз.";
      
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      const sources = groundingChunks?.map((chunk: any) => ({
        title: chunk.web?.title || 'Информация',
        uri: chunk.web?.uri || ''
      })).filter((s: any) => s.uri !== '');

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: assistantText,
        timestamp: Date.now(),
        sources: sources,
      };

      setMessages(prev => [...prev, assistantMsg]);

      if (ttsEnabled && assistantText) {
        setIsSpeaking(true);
        const audioData = await generateSpeech(assistantText);
        if (audioData) await playRawAudio(audioData);
        setIsSpeaking(false);
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        text: "Произошла системная ошибка. Проверьте подключение.",
        timestamp: Date.now(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen px-6">
        <div className="w-full max-w-md glass-panel p-8 rounded-[32px] shadow-2xl animate-in fade-in zoom-in duration-500">
          <div className="flex flex-col items-center text-center mb-10">
            <div className="w-20 h-20 alexa-gradient rounded-[24px] flex items-center justify-center shadow-2xl shadow-blue-500/20 mb-6 animate-float">
              <Sparkles size={40} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Алекса</h1>
            <p className="text-zinc-400 text-sm">Ваш интеллектуальный мир начинается здесь</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
              <input
                type="text"
                required
                value={loginInput}
                onChange={(e) => setLoginInput(e.target.value)}
                placeholder="Ваше имя"
                className="w-full bg-zinc-900/50 border border-zinc-800 text-white rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder-zinc-600"
              />
            </div>
            <button
              type="submit"
              className="w-full alexa-gradient hover:opacity-90 text-white font-bold py-4 rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 group"
            >
              Войти в систему
              <LogIn size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </form>
          
          <div className="mt-8 pt-8 border-t border-zinc-800 text-center">
            <p className="text-[11px] text-zinc-500 uppercase tracking-widest font-semibold flex items-center justify-center gap-2">
              <ShieldCheck size={14} className="text-blue-500" />
              Бесплатный доступ обеспечен Asadbek
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto bg-zinc-950/50 shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden">
      {/* Premium Header */}
      <header className="flex items-center justify-between px-8 py-5 glass-panel z-20">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className={`w-12 h-12 rounded-2xl alexa-gradient flex items-center justify-center shadow-lg transition-all ${isSpeaking ? 'scale-110 shadow-blue-500/50' : ''}`}>
              <Sparkles size={24} className="text-white" />
            </div>
            {isSpeaking && (
              <div className="absolute -bottom-1 -right-1 flex gap-1">
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-ping"></span>
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-xl text-white tracking-tight">Алекса</h1>
              <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-bold uppercase">Pro</span>
            </div>
            <p className="text-[11px] text-zinc-500 font-medium flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
              Активна для {user}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setTtsEnabled(!ttsEnabled)}
            className={`p-2.5 rounded-xl transition-all ${ttsEnabled ? 'text-blue-400 bg-blue-400/10 hover:bg-blue-400/20' : 'text-zinc-500 hover:bg-zinc-800'}`}
            title={ttsEnabled ? "Отключить голос" : "Включить голос"}
          >
            {ttsEnabled ? <Volume2 size={22} /> : <VolumeX size={22} />}
          </button>
          <div className="w-px h-6 bg-zinc-800 mx-1"></div>
          <button 
            onClick={handleLogout}
            className="p-2.5 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
            title="Выйти"
          >
            <LogOut size={22} />
          </button>
        </div>
      </header>

      {/* Main Chat Content */}
      <main 
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-8 py-10 space-y-2 scroll-smooth bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.05),transparent)]"
      >
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        {isLoading && (
          <div className="flex justify-start mb-6 animate-in fade-in duration-300">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full alexa-gradient flex items-center justify-center animate-pulse">
                <Sparkles size={16} className="text-white" />
              </div>
              <div className="glass-panel px-5 py-4 rounded-2xl rounded-tl-none border-zinc-700/50">
                <div className="flex gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '400ms' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Futuristic Input Area */}
      <footer className="p-8 glass-panel border-t-0 rounded-t-[40px] shadow-[0_-20px_50px_rgba(0,0,0,0.3)]">
        <div className="max-w-3xl mx-auto">
          <div className={`relative flex items-center gap-3 glass-panel p-2 pl-6 rounded-[24px] border-zinc-700/50 transition-all focus-within:ring-2 focus-within:ring-blue-500/30 focus-within:border-blue-500/30 ${isListening ? 'ring-2 ring-blue-500 border-blue-500 shadow-lg shadow-blue-500/20' : ''}`}>
            <Search size={20} className="text-zinc-500 flex-shrink-0" />
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder={isListening ? "Алекса слушает вас..." : "Спросите о чем угодно..."}
              className="flex-1 bg-transparent border-none text-white py-4 text-[16px] focus:outline-none placeholder-zinc-600"
            />
            
            <div className="flex items-center gap-1.5 pr-2">
              <button
                onClick={toggleListening}
                className={`p-3 rounded-2xl transition-all ${isListening ? 'bg-red-500 text-white shadow-lg shadow-red-500/20 animate-pulse' : 'text-zinc-400 hover:text-blue-400 hover:bg-blue-400/10'}`}
              >
                {isListening ? <MicOff size={22} /> : <Mic size={22} />}
              </button>
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputText.trim() || isLoading}
                className={`p-3 rounded-2xl transition-all ${inputText.trim() ? 'alexa-gradient text-white shadow-lg shadow-blue-500/30 active:scale-95' : 'text-zinc-700'}`}
              >
                <Send size={22} />
              </button>
            </div>
          </div>
          <div className="mt-4 flex justify-between items-center px-2">
            <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">Asadbek Intelligence Engine</span>
            <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">v2.5 Release</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
