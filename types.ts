
export type MessageRole = 'user' | 'assistant';

export interface Message {
  id: string;
  role: MessageRole;
  text: string;
  timestamp: number;
  sources?: Array<{ title: string; uri: string }>;
}

export interface VoiceConfig {
  enabled: boolean;
  isListening: boolean;
  isSpeaking: boolean;
}
