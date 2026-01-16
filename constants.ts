
import { NewsExcerpt } from './types';

export const RSS_GATEWAY = 'https://api.rss2json.com/v1/api.json?rss_url=';

/**
 * Curated Boston Feeds
 * Priority 1: High editorial depth, highly relevant to BU/Students
 * Priority 2: High frequency city-wide updates
 * Priority 3: Hyper-local or official updates
 */
export const RSS_FEEDS = [
  { key: 'dfp', name: 'Daily Free Press', url: 'https://dailyfreepress.com/feed/', priority: 1 },
  { key: 'wbur', name: 'WBUR', url: 'https://www.wbur.org/rss', priority: 1 },
  { key: 'bcom', name: 'Boston.com', url: 'https://www.boston.com/tag/local-news/feed/', priority: 2 },
  { key: 'uhub', name: 'Universal Hub', url: 'https://www.universalhub.com/feed', priority: 3 },
  { key: 'bgov', name: 'Boston.gov', url: 'https://www.boston.gov/news/rss', priority: 3 }
];

export const FALLBACK_OUTRO = "How might the stories you heard today change your path through the city tomorrow?";
