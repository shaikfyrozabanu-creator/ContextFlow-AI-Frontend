import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Square } from 'lucide-react';
import { toast } from './Toast';

interface VoiceAssistantControllerProps {
  onTranscript: (text: string) => void;
  latestBotMessage?: string;
  isBotTyping: boolean;
}

export const VoiceAssistantController: React.FC<VoiceAssistantControllerProps> = ({
  onTranscript,
  latestBotMessage,
  isBotTyping,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoTtsEnabled, setAutoTtsEnabled] = useState(true);
  const [recognition, setRecognition] = useState<any>(null);

  // Initialize Speech-to-Text Recognition API
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          onTranscript(transcript);
        }
      };

      rec.onerror = (err: any) => {
        console.warn('Speech recognition error:', err);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      setRecognition(rec);
    }
  }, [onTranscript]);

  // Handle Text-to-Speech (TTS) for incoming bot messages
  useEffect(() => {
    if (latestBotMessage && autoTtsEnabled && !isBotTyping && 'speechSynthesis' in window) {
      // Cancel previous speech if speaking (Interrupt Logic)
      window.speechSynthesis.cancel();

      const cleanText = latestBotMessage
        .replace(/<[^>]*>/g, '') // strip HTML
        .replace(/[*#`]/g, '')   // strip markdown formatting
        .slice(0, 300);          // cap speech length

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    }
  }, [latestBotMessage, isBotTyping, autoTtsEnabled]);

  // Toggle Microphone Dictation
  const toggleListening = () => {
    // Interrupt TTS if speaking
    if (isSpeaking) {
      stopSpeaking();
    }

    if (!recognition) {
      toast.error('Speech Recognition Unavailable', 'Browser does not support Web Speech API.');
      return;
    }

    if (isListening) {
      recognition.stop();
      setIsListening(false);
      toast.info('Voice Recording Stopped', 'Dictation ended.');
    } else {
      try {
        recognition.start();
        setIsListening(true);
        toast.success('Listening...', 'Speak now into microphone.');
      } catch (err) {
        console.error(err);
        setIsListening(false);
      }
    }
  };

  // Interrupt Speech Playback Immediately
  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      toast.info('Speech Interrupted', 'Stopped voice response.');
    }
  };

  return (
    <div className="flex items-center space-x-2 font-mono text-xs">
      
      {/* Animated Audio Equalizer Wave (Active when Listening or Speaking) */}
      {(isListening || isSpeaking) && (
        <div className="flex items-center space-x-1 px-3 py-1.5 rounded-2xl bg-gray-950/90 border border-cyan-500/40 backdrop-blur-md shadow-lg animate-fadeIn">
          <div className="flex items-end space-x-1 h-3.5">
            {[0, 1, 2, 3, 4].map(i => (
              <div
                key={i}
                className={`w-1 rounded-full ${isListening ? 'bg-rose-400' : 'bg-cyan-400'} animate-pulse`}
                style={{
                  height: `${Math.floor(Math.random() * 12) + 4}px`,
                  animationDelay: `${i * 120}ms`,
                  animationDuration: '0.6s'
                }}
              />
            ))}
          </div>
          <span className={`text-[10px] font-bold ${isListening ? 'text-rose-300' : 'text-cyan-300'}`}>
            {isListening ? 'Listening...' : 'Speaking...'}
          </span>

          {/* Interrupt Stop Button */}
          {isSpeaking && (
            <button
              onClick={stopSpeaking}
              className="ml-1 p-1 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-300 border border-red-500/30 transition-all cursor-pointer"
              title="Interrupt speech response"
            >
              <Square className="w-3 h-3 fill-current" />
            </button>
          )}
        </div>
      )}

      {/* Auto TTS Toggle */}
      <button
        onClick={() => setAutoTtsEnabled(prev => !prev)}
        className={`p-2.5 rounded-2xl border transition-all cursor-pointer ${autoTtsEnabled ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300' : 'bg-gray-950/80 border-white/10 text-gray-500'}`}
        title={autoTtsEnabled ? 'Voice response enabled (click to mute)' : 'Voice response muted'}
      >
        {autoTtsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
      </button>

      {/* Main Microphone Button */}
      <button
        type="button"
        onClick={toggleListening}
        className={`
          p-3 rounded-2xl border transition-all duration-300 flex items-center justify-center cursor-pointer shadow-lg
          ${isListening 
            ? 'bg-rose-500 text-white border-rose-400 animate-pulse shadow-rose-500/40' 
            : 'bg-gray-950/90 border-white/10 hover:border-cyan-400 text-cyan-400 hover:bg-cyan-500/10'
          }
        `}
        title={isListening ? 'Click to stop listening' : 'Click to speak question'}
      >
        {isListening ? <MicOff className="w-4.5 h-4.5" /> : <Mic className="w-4.5 h-4.5" />}
      </button>

    </div>
  );
};
export default VoiceAssistantController;
