
import React, { useEffect, useState } from 'react';
import { AppSettings } from '../types';
import { audioService } from '../services/audioService';

interface SettingsProps {
  settings: AppSettings;
  onSettingsChange: (newSettings: AppSettings) => void;
}

const Settings: React.FC<SettingsProps> = ({ settings, onSettingsChange }) => {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    const updateVoices = () => {
      const naturalVoices = audioService.getNaturalVoices();
      setVoices(naturalVoices);
      
      if (!settings.voiceName && naturalVoices.length > 0) {
        const usVoices = naturalVoices.filter(v => v.lang === 'en-US');
        const defaultVoice = usVoices.find(v => v.name.includes('Google') || v.name.includes('Microsoft')) 
                          || usVoices[0] 
                          || naturalVoices[0];
        
        onSettingsChange({ ...settings, voiceName: defaultVoice.name });
      }
    };
    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;
  }, [onSettingsChange, settings.voiceName]);

  return (
    <div className="bg-stone-100 p-8 rounded-3xl border border-stone-200">
      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Narrator Voice</label>
        <select 
          value={settings.voiceName}
          onChange={(e) => onSettingsChange({ ...settings, voiceName: e.target.value })}
          className="block w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-stone-300 outline-none"
        >
          {voices.map((voice) => (
            <option key={voice.name} value={voice.name}>
              {voice.name.replace('Microsoft ', '').replace('Google ', '')} ({voice.lang})
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default Settings;
