
import { NewsExcerpt, FeedDiagnostic } from '../types';
import { RSS_FEEDS, RSS_GATEWAY } from '../constants';

const articleCache: Record<string, { editorialExcerpt: string; method: string }> = {};

/**
 * Validates if a string is a real editorial paragraph.
 */
function isEditorial(text: string): boolean {
  const cleanText = text.trim();
  if (cleanText.length < 60) return false;

  const lowercase = cleanText.toLowerCase();
  const blacklistedPrefixes = ['photo:', 'image:', 'courtesy of', 'by ', 'credit:', 'source:', 'updated', 'published'];
  const blacklistedKeywords = ['getty images', 'photo by', 'caption:', 'staff writer', 'associated press', 'advertisement', 'appeared first on',];

  if (blacklistedPrefixes.some(p => lowercase.startsWith(p))) return false;
  if (blacklistedKeywords.some(k => lowercase.includes(k))) return false;

  return true;
}

export function extractEditorialContent(html: string, targetMin = 250, targetMax = 1100): { text: string, count: number } {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  
  const selectorsToRemove = ['script', 'style', 'nav', 'footer', 'header', 'aside', '.ad', '.caption', 'figcaption', '.credits', '.advertisement'];
  selectorsToRemove.forEach(s => doc.querySelectorAll(s).forEach(el => el.remove()));

  const container = doc.querySelector('article') || doc.querySelector('.article-content') || doc.querySelector('main') || doc.body;
  const paragraphs = Array.from(container.querySelectorAll('p'))
    .map(p => p.textContent?.trim() || "")
    .filter(p => {
      const ok = isEditorial(p);
      if (!ok && p.length > 20) console.debug(`[Extractor] Discarding non-editorial: "${p.substring(0, 30)}..."`);
      return ok;
    });

  let accumulated = "";
  let pCount = 0;

  for (const p of paragraphs) {
    if (accumulated.length >= targetMax) break;
    const separator = accumulated ? "\n\n" : "";
    accumulated += separator + p;
    pCount++;
    if (accumulated.length >= targetMin) break;
  }

  return { text: accumulated.trim(), count: pCount };
}

export async function enrichOneStory(item: NewsExcerpt): Promise<NewsExcerpt> {
  if (articleCache[item.link]) {
    const cached = articleCache[item.link];
    return { ...item, editorialExcerpt: cached.editorialExcerpt, extractionMethod: cached.method, isFromCache: true };
  }

  try {
    let response = await fetch(`${RSS_GATEWAY}${encodeURIComponent(item.link)}`);
    if (response.ok) {
      const data = await response.json();
      const html = data.content || data.description || '';
      const { text, count } = extractEditorialContent(html);
      
      if (text.length >= 200) { // Lowered threshold slightly for more hits
        articleCache[item.link] = { editorialExcerpt: text, method: 'gateway-html' };
        return { ...item, editorialExcerpt: text, extractionMethod: 'gateway-html', paragraphCount: count };
      }
    }
  } catch (e) {
    console.warn(`[Enrichment] Gateway fetch failed for ${item.link}`, e);
  }

  const { text: rssText, count: rssCount } = extractEditorialContent(item.excerpt);
  if (rssText.length >= 100) {
    return { ...item, editorialExcerpt: rssText, extractionMethod: 'rss-embedded', paragraphCount: rssCount };
  }

  console.debug(`[Enrichment] Failed to extract meaningful content for: ${item.title}`);
  return { ...item, editorialExcerpt: '', extractionMethod: 'failed' };
}

export async function fetchAllLiveFeeds(): Promise<{ items: NewsExcerpt[], diagnostics: FeedDiagnostic[] }> {
  const diagnostics: FeedDiagnostic[] = [];
  const allItems: NewsExcerpt[] = [];

  const promises = RSS_FEEDS.map(async (feed) => {
    try {
      const response = await fetch(`${RSS_GATEWAY}${encodeURIComponent(feed.url)}`);
      if (!response.ok) throw new Error(`Status ${response.status}`);
      const data = await response.json();
      const items = data.items.map((item: any) => ({
        id: item.guid || item.link,
        source: feed.name,
        sourceKey: feed.key,
        title: item.title,
        excerpt: item.content || item.description || "",
        editorialExcerpt: "",
        link: item.link,
        pubDate: item.pubDate || new Date().toISOString()
      }));
      allItems.push(...items);
      diagnostics.push({ name: feed.name, status: 'gateway', itemCount: items.length });
    } catch (e: any) {
      console.error(`[RSS] Failed to fetch ${feed.name}:`, e.message);
      diagnostics.push({ name: feed.name, status: 'failed', itemCount: 0 });
    }
  });

  await Promise.allSettled(promises);
  return { 
    items: Array.from(new Map(allItems.map(i => [i.link, i])).values())
      .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()),
    diagnostics 
  };
}

/**
 * Shuffles an array for better rotation
 */
function shuffle<T>(array: T[]): T[] {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

export function pickSelection(pool: NewsExcerpt[], lastLinks: Set<string>, count: number = 3): NewsExcerpt[] {
  const now = new Date().getTime();
  const msIn48Hours = 48 * 60 * 60 * 1000;
  
  // 1. Try for Fresh + Unseen
  let candidates = pool.filter(item => {
    const pubTime = new Date(item.pubDate).getTime();
    return (now - pubTime) < msIn48Hours && !lastLinks.has(item.link);
  });

  if (candidates.length >= count) return candidates.slice(0, count);

  // 2. Try for Any + Unseen
  let unseen = pool.filter(item => !lastLinks.has(item.link));
  if (unseen.length >= count) return unseen.slice(0, count);

  // 3. Fallback: Full Randomized Rotation
  if (pool.length > 0) {
    return shuffle(pool).slice(0, count);
  }
  
  return [];
}
