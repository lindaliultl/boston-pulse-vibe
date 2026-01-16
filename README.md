
# Boston Pulse - BU Community Edition

An audio-first news experience that provides longer editorial context entirely in the browser.

## 🎙 Curated Listening Experience
For the final submission, the "Pulse" logic has been refined to prioritize high-signal, relevant local news:
- **Primary Sources**: The **Daily Free Press** (BU Student Journalism) and **WBUR** (NPR Local) are prioritized.
- **Selective Pool**: We only maintain 5 high-quality feeds to ensure the pool isn't diluted by national noise or generic headlines.
- **Deep Context**: Unlike social media headlines, each story is enriched to ~1,000 characters of real editorial writing, providing roughly 3.5 minutes of deep listening.
- **Freshness First**: We enforce a 48-hour freshness window. If the world is quiet, we tell you, rather than feeding you stale data.

## 📡 Extraction Philosophy
- **Editorial Integrity**: We discard snippets that are primarily photo credits, bylines, or ad-copy. 
- **Privacy-Preserving**: No accounts, no trackers, no cookies. Just the news, spoken to you.

## 🔄 Refresh Logic
- **Refresh Pulse**: Re-samples a new diverse selection from the current 48-hour news pool.
- **Deep Refresh**: Bypasses browser cache to fetch the absolute latest from all RSS endpoints.
