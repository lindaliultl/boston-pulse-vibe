
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { NewsExcerpt, PlaybackState, AppSettings } from './types';
import { fetchAllLiveFeeds, pickSelection, enrichOneStory } from './services/rssService';
import { generateOutro } from './services/geminiService';
import { audioService, SpeechSegment } from './services/audioService';
import { FALLBACK_OUTRO } from './constants';
import ExcerptItem from './components/ExcerptItem';
import Settings from './components/Settings';

const CACHE_KEY = 'bp_pool_cache';
const CACHE_TTL = 30 * 60 * 1000;

const App: React.FC = () => {
  const [feedPool, setFeedPool] = useState<NewsExcerpt[]>([]);
  const [currentEpisode, setCurrentEpisode] = useState<NewsExcerpt[]>([]);
  const [lastSelectionLinks, setLastSelectionLinks] = useState<Set<string>>(new Set());
  const [outroText, setOutroText] = useState<string>('');
  const [playbackState, setPlaybackState] = useState<PlaybackState>('IDLE');
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'CARD' | 'LIST'>('CARD');
  const [error, setError] = useState<string | null>(null);
  
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('bp_settings');
    return saved ? JSON.parse(saved) : {
      voiceName: '',
      useGemini: !!process.env.API_KEY,
      playbackRate: 1.0
    };
  });

  useEffect(() => {
    localStorage.setItem('bp_settings', JSON.stringify(settings));
  }, [settings]);

  const loadContent = useCallback(async (forceRefetch = false) => {
    console.group('Pulse Assembly Pipeline');
    setIsLoading(true);
    setError(null);
    audioService.stop(); 

    let pool: NewsExcerpt[] = [];
    
    try {
      // 1. Data Retrieval
      const cached = sessionStorage.getItem(CACHE_KEY);
      const now = Date.now();
      
      if (forceRefetch || !cached || (now - JSON.parse(cached).ts > CACHE_TTL)) {
        console.log('Fetching live feeds...');
        const result = await fetchAllLiveFeeds();
        pool = result.items;
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: now, items: pool }));
      } else {
        console.log('Loading from cache...');
        pool = JSON.parse(cached).items;
      }
      setFeedPool(pool);
      console.log(`Raw Pool: ${pool.length} items`);

      if (pool.length === 0) {
        throw new Error("RSS pool is empty. No local news found.");
      }

      // 2. Selection
      const candidates = pickSelection(pool, lastSelectionLinks, 15);
      console.log(`Candidates Selected: ${candidates.length}`);

      // 3. Enrichment
      console.log('Enriching stories...');
      const enrichedResults = await Promise.all(candidates.map(enrichOneStory));
      const successfullyEnriched = enrichedResults.filter(e => e.editorialExcerpt && e.editorialExcerpt.length >= 100);
      
      console.log(`Enrichment Results: ${successfullyEnriched.length} successful, ${enrichedResults.length - successfullyEnriched.length} failed`);

      // 4. Assembly Logic
      let finalSelection: NewsExcerpt[] = [];
      
      // Sort to prioritize longer, better editorial content if available
      const sorted = [...successfullyEnriched].sort((a, b) => b.editorialExcerpt.length - a.editorialExcerpt.length);
      
      if (sorted.length > 0) {
        finalSelection = sorted.slice(0, 3);
      }

      console.log(`Validated Final Selection: ${finalSelection.length} items`);

      if (finalSelection.length > 0) {
        setCurrentEpisode(finalSelection);
        
        // Track seen links
        setLastSelectionLinks(prev => {
          const next = new Set(prev);
          finalSelection.forEach(s => next.add(s.link));
          return next;
        });

        // 5. Outro Generation (Non-blocking)
        const outro = await generateOutro(finalSelection);
        setOutroText(outro);
      } else {
        setError("Could not extract enough editorial content from current news. Please try again or refresh.");
      }
    } catch (e: any) {
      console.error("Pipeline Failure:", e);
      setError(e.message || "An unexpected error occurred during briefing assembly.");
    } finally {
      setIsLoading(false);
      console.groupEnd();
    }
  }, [lastSelectionLinks]);

  useEffect(() => {
    loadContent();
  }, []); // Only on mount

  const handlePlay = useCallback((startIndex: number = -1) => {
    if (currentEpisode.length === 0) return;

    const countText = currentEpisode.length === 1 ? 'One story' : `${currentEpisode.length} stories`;
    
    const intro: SpeechSegment = {
      text: `Boston Pulse. ${countText} for today.`,
      onStart: () => { setPlaybackState('PLAYING'); setActiveIndex(-1); }
    };

    const stories: SpeechSegment[] = currentEpisode.flatMap((item, index) => {
      const paragraphs = item.editorialExcerpt.split('\n\n');
      return paragraphs.map((p, pIdx) => ({
        text: pIdx === 0 ? `From ${item.source}. ${item.title}. ${p}` : p,
        onStart: () => setActiveIndex(index)
      }));
    });

    const outro: SpeechSegment = {
      text: outroText,
      onStart: () => setActiveIndex(currentEpisode.length),
      onEnd: () => { setPlaybackState('FINISHED'); setActiveIndex(-1); }
    };

    const segments = [intro, ...stories, outro];
    let startAt = 0;
    
    if (startIndex !== -1) {
      // Find the segment that corresponds to the activeIndex
      const targetTitle = currentEpisode[startIndex]?.title;
      if (targetTitle) {
        const idx = segments.findIndex(s => s.text.includes(targetTitle));
        if (idx !== -1) startAt = idx;
      }
    }

    audioService.playSequence(segments, settings.voiceName, settings.playbackRate, startAt);
  }, [currentEpisode, outroText, settings.voiceName, settings.playbackRate]);

  const handleStop = () => {
    audioService.stop();
    setPlaybackState('IDLE');
    setActiveIndex(-1);
  };

  const formattedDate = useMemo(() => {
    return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  }, []);

  return (
    <div className="min-h-screen max-w-2xl mx-auto px-4 py-12 md:py-20 space-y-8 text-stone-900">
      <header className="text-center space-y-2">
        <h1 className="serif text-4xl md:text-5xl font-semibold tracking-tight">Boston Pulse</h1>
        <p className="text-xs font-medium text-stone-500 uppercase tracking-widest">{formattedDate}</p>
      </header>

      <section className="bg-white rounded-3xl p-8 md:p-12 shadow-xl shadow-stone-200 border border-stone-100 flex flex-col items-center text-center space-y-8 transition-all hover:shadow-2xl">
        <div className="space-y-4">
          <div className="serif text-2xl italic text-stone-600">
            {isLoading ? "Assembling Pulse..." : error ? "Briefing Unavailable" : `${currentEpisode.length}-Story Pulse Ready`}
          </div>
        </div>

        {error && (
          <div className="w-full bg-red-50 p-6 rounded-2xl border border-red-100 text-sm text-red-700 font-medium">
            {error}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
          {playbackState !== 'PLAYING' ? (
            <button 
              onClick={() => handlePlay(activeIndex)}
              disabled={isLoading || !!error || currentEpisode.length === 0}
              className="flex items-center justify-center gap-3 bg-stone-900 text-white px-8 py-4 rounded-full font-semibold transition-all hover:scale-105 active:scale-95 disabled:opacity-50 shadow-lg"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
              {activeIndex === -1 ? 'Listen to Pulse' : 'Resume Pulse'}
            </button>
          ) : (
            <button onClick={handleStop} className="flex items-center justify-center gap-3 bg-stone-200 text-stone-900 px-8 py-4 rounded-full font-semibold shadow-md">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" /></svg>
              Stop Audio
            </button>
          )}

          <button 
            disabled={currentEpisode.length === 0}
            onClick={() => setViewMode(v => v === 'CARD' ? 'LIST' : 'CARD')} 
            className="text-stone-700 bg-stone-50 border border-stone-200 px-8 py-4 rounded-full font-semibold hover:bg-white active:scale-95 disabled:opacity-30"
          >
            {viewMode === 'CARD' ? 'Read Transcript' : 'Hide Transcript'}
          </button>
        </div>

        <div className="flex gap-6 items-center pt-4">
          <button onClick={() => loadContent(true)} className="text-stone-400 hover:text-stone-900 transition-colors inline-flex items-center gap-2 text-xs font-medium uppercase tracking-widest">
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            Refresh Pulse
          </button>
        </div>
      </section>

      <main className="space-y-8">
        {(viewMode === 'LIST' || playbackState === 'PLAYING') && currentEpisode.length > 0 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-stone-400 px-2">Editorial Deep Dive</h2>
            <div className="space-y-4">
              {currentEpisode.map((item, index) => (
                <ExcerptItem key={item.id} item={item} index={index} isActive={activeIndex === index} />
              ))}
              <div className={`p-8 rounded-2xl border-2 transition-all duration-700 ${activeIndex === currentEpisode.length ? 'bg-stone-900 text-white shadow-2xl scale-[1.02]' : 'bg-stone-50 border-transparent opacity-40'}`}>
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Daily Outro</span>
                <p className="serif italic mt-4 text-xl leading-relaxed">"{outroText}"</p>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="pt-12 border-t border-stone-200 space-y-8">
        <Settings settings={settings} onSettingsChange={setSettings} />
      </footer>
    </div>
  );
};

export default App;
