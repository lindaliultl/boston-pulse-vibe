
import React from 'react';
import { NewsExcerpt } from '../types';

interface ExcerptItemProps {
  item: NewsExcerpt;
  isActive: boolean;
  index: number;
}

const ExcerptItem: React.FC<ExcerptItemProps> = ({ item, isActive, index }) => {
  return (
    <div 
      className={`p-6 md:p-8 rounded-2xl transition-all duration-500 border-2 ${
        isActive 
          ? 'bg-white border-stone-800 shadow-xl ring-8 ring-stone-100 scale-[1.01] z-10' 
          : 'bg-stone-50 border-transparent text-stone-500 opacity-60'
      }`}
    >
      <div className="flex justify-between items-start mb-4">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] px-2.5 py-1 bg-stone-200 text-stone-600 rounded">
          {item.source}
        </span>
        <span className="text-xs text-stone-400">0{index + 1}</span>
      </div>
      <h3 className="serif text-2xl font-semibold mb-5 leading-snug text-stone-900">
        {item.title}
      </h3>
      <div className="space-y-4 mb-6">
        {item.editorialExcerpt.split('\n\n').map((para, idx) => (
          <p key={idx} className="text-sm leading-relaxed text-stone-700">
            {para}
          </p>
        ))}
      </div>
      <div className="flex justify-between items-center">
        <a 
          href={item.link} 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center text-xs font-bold text-stone-900 hover:underline gap-1.5 group uppercase tracking-widest"
        >
          Source link
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 transition-transform group-hover:translate-x-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </a>
        <span className="text-[10px] text-stone-400 italic">
          {item.editorialExcerpt.length} characters
        </span>
      </div>
    </div>
  );
};

export default ExcerptItem;
