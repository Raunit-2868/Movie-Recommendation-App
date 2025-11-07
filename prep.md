# MovieFlix Interview Preparation Guide

## Table of Contents
1. [Project Architecture Overview](#project-architecture-overview)
2. [Common Interview Questions](#common-interview-questions)
3. [Deep Technical Questions](#deep-technical-questions)
4. [Areas for Improvement](#areas-for-improvement)

---

## Project Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                         │
│                                                                   │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐     │
│  │   App.jsx    │───▶│ Search.jsx   │    │ MovieCard    │     │
│  │  (Main Hub)  │    │ (User Input) │    │ (Display)    │     │
│  └──────┬───────┘    └──────────────┘    └──────────────┘     │
│         │                                                        │
│         │            ┌──────────────┐                           │
│         └───────────▶│ MovieModal   │                           │
│                      │  (Details)   │                           │
│                      └──────────────┘                           │
└─────────────────────────────────────────────────────────────────┘
         │                                    │
         │                                    │
         ▼                                    ▼
┌──────────────────┐              ┌─────────────────────┐
│   TMDB API       │              │   Appwrite Cloud    │
│ (Movie Data)     │              │   (Analytics DB)    │
│                  │              │                     │
│ • Search Movies  │              │ • Track Searches    │
│ • Movie Details  │              │ • Trending Movies   │
│ • Trailers       │              │ • Search Counts     │
└──────────────────┘              └─────────────────────┘
```

### Tech Stack
- **Frontend**: React 19 with Vite
- **Styling**: Tailwind CSS
- **APIs**: TMDB API (movie data), Appwrite (analytics)
- **Build Tool**: Vite
- **State Management**: React Hooks (useState, useEffect, useCallback)
- **Performance**: react-use (debouncing), IntersectionObserver (infinite scroll)

### Key Features
1. **Search with Debouncing** - 500ms delay to reduce API calls
2. **Infinite Scroll** - Auto-load movies as user scrolls
3. **Trending Movies** - Top 5 most searched movies from Appwrite
4. **Movie Modal** - Detailed view with trailers
5. **Keyboard Accessibility** - "/" shortcut to focus search

---

## Common Interview Questions

### Q1: "Explain your project architecture and how the frontend communicates with backend services"

**Answer** (45-60 seconds):

"Sure! MovieFlix is a React-based movie discovery app that integrates with two external services - TMDB API for movie data and Appwrite for analytics.

The architecture is straightforward. The **frontend** is built with React where App.jsx acts as the main hub managing all state - search terms, movie lists, and pagination.

For **TMDB communication**, I'm making direct REST API calls using the fetch API with Bearer token authentication. When users search for movies, there's a 500-millisecond debounce to prevent excessive API calls, then we hit TMDB's search endpoint. I also use their movie details and videos endpoints when users click on a card to show more information in a modal.

For **Appwrite**, I'm using their JavaScript SDK to track search analytics. Every time someone searches, I check if that search term already exists in the database. If it does, I increment the count; if not, I create a new document. This powers the 'trending movies' feature which queries Appwrite, orders by count descending, and displays the top 5 most-searched movies.

The data flow is unidirectional - user action triggers state change, state change triggers API calls, API responses update state, and React re-renders the UI. I've also implemented infinite scroll using IntersectionObserver for better UX, so new pages load automatically as users scroll down.

The whole thing is secured with environment variables for API keys, and I'm using Vite as the build tool for fast development."

**Key Points**:
- Tech stack and architecture
- API communication methods
- Unidirectional data flow
- Performance optimizations
- Security considerations

---

### Q2: "You said search triggers an Appwrite increment. What if the user types 10 characters? Do you record 10 increments?"

**Answer** (30-40 seconds):

"Great question! No, I don't record 10 increments - that would pollute the analytics data. I handle this in two ways.

First, I use **debouncing with a 500-millisecond delay**. So when a user types 'Inception', instead of making 9 API calls as they type each character, the system waits until they stop typing for half a second before making the actual search request.

Second, the Appwrite tracking only happens **after we get successful results from TMDB**. So the flow is: user types → debounce waits → TMDB search executes → if results exist → then and only then do I call `updateSearchCount` to increment in Appwrite.

This means if someone types 'Inception', we only record one search for 'Inception' in the database, not individual searches for 'I', 'In', 'Inc', etc. The debouncing ensures we're only tracking meaningful, complete search queries that actually returned movie results."

**Code Evidence**:
```javascript
// Debouncing prevents multiple calls
useDebounce(() => setDebouncedSearchTerm(searchTerm), 500, [searchTerm]);

// Only tracks after TMDB succeeds
if (data.results && data.results.length > 0) {
  updateSearchCount(searchTerm, data.results[0]);
}
```

---

## Deep Technical Questions

### Q3: "Why did you choose Vite over Create React App?"

**Answer** (30 seconds):

"I chose Vite over CRA for three main reasons:

1. **Development Speed** - Vite uses native ES modules and esbuild for pre-bundling, so the dev server starts in milliseconds versus CRA's 30+ seconds.

2. **Hot Module Replacement** - Instant in Vite because it only recompiles changed modules, not the entire bundle.

3. **Modern Defaults** - Vite supports React 19 out of the box, while CRA is essentially unmaintained now.

For this specific project, the benefits are noticeable when developing the search feature - every code change reflects instantly without full page reloads, making the iteration cycle much faster."

---

### Q4: "How do you avoid re-rendering the entire movie list when only the search term changes?"

**Answer** (40 seconds):

"Actually, looking at my current implementation, the entire movie list **does re-render** when search changes because I'm replacing the state completely:

```javascript
setMovieList(data.results); // Replaces entire array
```

To optimize this, I should use **React.memo** on the MovieCard component:

```javascript
const MovieCard = React.memo(({ movie, onMovieClick }) => {
  // Only re-renders if movie prop changes
});
```

And use **useCallback** for the click handler:

```javascript
const handleMovieClick = useCallback((movie) => {
  setSelectedMovie(movie);
}, []); // Stable reference
```

This way, existing MovieCard components won't re-render unnecessarily when search changes - only new ones will mount. The key is preventing prop reference changes through memoization."

**Current Issue**: Unnecessary re-renders
**Solution**: React.memo + useCallback for stable references

---

### Q5: "Your infinite scroll loads page 5, but user quickly scrolls back up. How does your app handle state for already loaded pages?"

**Answer** (45 seconds):

"Great catch! Currently, my implementation has a **flaw** - when users scroll back up, those pages are already loaded and won't trigger re-fetches, which is actually intentional for performance. But if they scroll to page 5 then start a new search, I reset everything:

```javascript
if (!isLoadMore) {
  setMovieList([]); // Clear previous results
  setPage(1);       // Reset pagination
}
```

However, there's **no caching mechanism**. If a user scrolls to page 5, goes to page 1, then back to page 5, we re-fetch page 5 again.

To improve this, I'd implement **page-based caching**:

```javascript
const [movieCache, setMovieCache] = useState({});

if (movieCache[page]) {
  return movieCache[page]; // Use cached data
} else {
  // Fetch and cache
  setMovieCache(prev => ({ ...prev, [page]: data.results }));
}
```

This would reduce API calls and improve perceived performance."

**Current Issue**: No caching, redundant API calls
**Solution**: Implement page-based state caching

---

### Q6: "When you open the movie modal and fetch trailers, how do you ensure the video is cleaned up after closing?"

**Answer** (35 seconds):

"Currently, I'm **not explicitly cleaning up** the YouTube iframe, which is a memory leak risk. The modal just unmounts when closed, but the video might still be playing in the background.

The proper way is to use a **cleanup function in useEffect**:

```javascript
useEffect(() => {
  // Fetch trailer
  
  return () => {
    // Stop video playback
    const iframe = document.querySelector('iframe');
    if (iframe) {
      iframe.src = ''; // Force unload
    }
  };
}, [selectedMovie]);
```

Or better yet, use the **YouTube IFrame API** to programmatically stop playback:

```javascript
playerRef.current?.stopVideo();
playerRef.current?.destroy();
```

This ensures no memory leaks and stops audio when the modal closes."

**Current Issue**: Memory leak - video continues playing
**Solution**: useEffect cleanup function or YouTube IFrame API

---

### Q7: "What happens if the Appwrite request fails but TMDB works? How do you maintain consistency?"

**Answer** (40 seconds):

"You're right - this is a **silent failure** scenario. If Appwrite fails but TMDB succeeds, users get their search results, but analytics aren't recorded. There's no retry logic:

```javascript
// Current: Fire and forget
updateSearchCount(searchTerm, movie); // No await, no error handling
```

To improve consistency, I should:

**Option 1: Fire-and-forget with retry**
```javascript
try {
  await updateSearchCount(searchTerm, movie);
} catch (error) {
  // Queue for retry
  retryQueue.push({ searchTerm, movie });
}
```

**Option 2: Queue-based approach**
Use a service worker or local queue to retry failed analytics calls in the background.

**Option 3: Accept eventual consistency**
Analytics aren't critical path - if one increment fails, it's acceptable. Add logging to monitor failure rates.

I'd choose Option 3 for this project since analytics shouldn't block the user experience."

**Current Issue**: Silent failures, no error handling
**Solution**: Retry queue or accept eventual consistency with monitoring

---

## Security & Architecture Questions

### Q8: "Your Appwrite analytics depend on client-side triggers. What stops a malicious user from inflating counts?"

**Answer** (50 seconds):

"You're absolutely right - this is a **major security flaw**. Anyone can open DevTools, see the Appwrite API calls, and write a script to spam increments:

```javascript
// Malicious script
for(let i = 0; i < 1000; i++) {
  updateSearchCount('MyMovie', fakeMovieData);
}
```

The Appwrite credentials are **exposed in the client bundle**, so anyone can directly call the database APIs.

**Current Risks:**
- Count inflation for SEO manipulation
- Database quota exhaustion
- Invalid data injection

**Proper Solutions:**

**1. Move to Backend (Best)**
```javascript
// Frontend → Backend API → Appwrite
POST /api/track-search
```
The backend validates requests, applies rate limiting, and has secure Appwrite credentials.

**2. Appwrite Functions with API Keys**
Create an Appwrite server function that only accepts authenticated requests with HMAC signatures.

**3. Rate Limiting**
Implement IP-based or session-based rate limiting in Appwrite rules.

For production, I'd **definitely move analytics to a backend API** with proper authentication and rate limiting."

**Current Issue**: Client-side credentials exposed, no rate limiting
**Solution**: Backend proxy with authentication and validation

---

### Q9: "You're calling TMDB directly from the frontend. What security risks does that introduce?"

**Answer** (55 seconds):

"Calling TMDB directly from the frontend exposes several security risks:

**Current Risks:**

1. **API Key Exposure**
```javascript
Authorization: `Bearer ${VITE_TMDB_API_KEY}`
```
Anyone can extract this from the network tab and use my API key, exhausting my quota.

2. **No Rate Limiting**
Users could spam searches and hit TMDB's rate limits (50 requests/second), causing the app to fail for everyone.

3. **Data Manipulation**
Users could modify requests to access endpoints I didn't intend to expose.

**Proper Architecture:**

**Create a Backend Proxy:**
```javascript
// Frontend
fetch('/api/movies/search?query=Avatar')

// Backend (Node.js/Express)
app.get('/api/movies/search', async (req, res) => {
  // 1. Validate & sanitize input
  // 2. Apply rate limiting (express-rate-limit)
  // 3. Call TMDB with server-side key
  // 4. Cache results (Redis)
  // 5. Return sanitized data
});
```

**Benefits:**
- API keys never exposed to client
- Server-side rate limiting
- Response caching (reduce API costs)
- Request validation & sanitization
- Usage analytics and monitoring

For production, I'd use **Vercel serverless functions** or **AWS Lambda** as the proxy layer with Redis caching."

**Current Issue**: Exposed API keys, no rate limiting
**Solution**: Backend proxy with caching and validation

---

## Areas for Improvement

### Critical Issues
1. ❌ **Security**: API keys exposed in client bundle
2. ❌ **Memory Leaks**: Video not cleaned up in modal
3. ❌ **Error Handling**: No retry logic for failed analytics
4. ❌ **Caching**: Redundant API calls on navigation

### Performance Optimizations
1. ⚡ **React.memo**: Prevent unnecessary re-renders
2. ⚡ **useCallback**: Stable function references
3. ⚡ **Page Caching**: Store fetched pages in state
4. ⚡ **Image Lazy Loading**: Use loading="lazy" attribute

### Production Readiness Checklist
- [ ] Move API calls to backend proxy
- [ ] Implement proper error boundaries
- [ ] Add loading skeletons instead of spinners
- [ ] Set up monitoring (Sentry, LogRocket)
- [ ] Add unit tests (Jest, React Testing Library)
- [ ] Implement CI/CD pipeline
- [ ] Add SEO meta tags
- [ ] Optimize bundle size (code splitting)
- [ ] Add accessibility features (ARIA labels)
- [ ] Implement proper authentication

---

## Code Snippets Reference

### Current Architecture

**App.jsx - Main State Management**
```javascript
const [searchTerm, setSearchTerm] = useState("");
const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
const [movieList, setMovieList] = useState([]);
const [page, setPage] = useState(1);
const [hasMore, setHasMore] = useState(true);

// Debouncing
useDebounce(() => setDebouncedSearchTerm(searchTerm), 500, [searchTerm]);

// Fetch movies on search change
useEffect(() => {
  fetchMovies(debouncedSearchTerm, 1);
}, [debouncedSearchTerm]);
```

**Appwrite Integration**
```javascript
// Track search
export const updateSearchCount = async (searchTerm, movie) => {
  const result = await database.listDocuments(
    DATABASE_ID, 
    COLLECTION_ID, 
    [Query.equal('searchTerm', searchTerm)]
  );
  
  if(result.documents.length > 0) {
    // Increment existing
    await database.updateDocument(
      DATABASE_ID, 
      COLLECTION_ID, 
      doc.$id, 
      { count: doc.count + 1 }
    );
  } else {
    // Create new
    await database.createDocument(
      DATABASE_ID, 
      COLLECTION_ID, 
      ID.unique(), 
      { searchTerm, count: 1, movie_id, poster_url }
    );
  }
};
```

**Infinite Scroll with IntersectionObserver**
```javascript
const lastMovieElementRef = useCallback((node) => {
  if (isLoadingMore) return;
  if (observer.current) observer.current.disconnect();
  
  observer.current = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting && hasMore) {
      setPage(prevPage => prevPage + 1);
    }
  });
  
  if (node) observer.current.observe(node);
}, [isLoadingMore, hasMore]);
```

---

## Interview Tips

### What to Emphasize
✅ **Problem-Solving**: Explain why you made certain decisions  
✅ **Trade-offs**: Discuss pros/cons of your approach  
✅ **Scalability**: Show awareness of production concerns  
✅ **Learning**: Be honest about what you'd improve  
✅ **User Experience**: Focus on performance and accessibility  

### What to Avoid
❌ **Overconfidence**: Don't claim it's production-ready if it's not  
❌ **Defensiveness**: Accept criticism and show how you'd improve  
❌ **Vagueness**: Give specific examples and code snippets  
❌ **Buzzwords**: Use technical terms you actually understand  

### Good Phrases to Use
- "In production, I would..."
- "The trade-off here is..."
- "Looking back, I should have..."
- "For this learning project, I chose X, but in production Y would be better"
- "That's a great point - let me explain how I'd handle that"

---

## Additional Questions You Might Face

### React Specific
- "Why did you use useState vs useReducer?"
- "How does useCallback improve performance here?"
- "What's the purpose of the dependency array in useEffect?"
- "How do you prevent prop drilling in larger apps?"

### Performance
- "How would you optimize the initial page load?"
- "What's the impact of debouncing on user experience?"
- "How do you measure and monitor performance?"

### Testing
- "How would you test the search functionality?"
- "What edge cases should be tested?"
- "How do you mock API calls in tests?"

### Deployment
- "How would you deploy this application?"
- "What environment variables need to be set?"
- "How do you handle different environments (dev, staging, prod)?"

---

## Conclusion

This project demonstrates:
✅ Modern React patterns and hooks  
✅ API integration with external services  
✅ Performance optimization techniques  
✅ User experience considerations  
✅ Keyboard accessibility  

However, it needs:
❌ Backend API layer for security  
❌ Proper error handling  
❌ Memory leak fixes  
❌ Production-grade monitoring  
❌ Comprehensive testing  

**Overall Assessment**: Great learning project showing strong React fundamentals, but requires significant refactoring for production use. Shows good understanding of modern web development but needs improvement in security and error handling.

---

**Last Updated**: November 8, 2025  
**Project**: MovieFlix - React Movie Discovery App  
**Technologies**: React 19, Vite, Tailwind CSS, TMDB API, Appwrite

---

## BONUS: Search Functionality - Complete Walkthrough (90 seconds)

**Interviewer**: "Explain the search functionality from UI to backend"

### My Answer (Detailed Technical Flow)

"Sure! Let me walk you through the complete search flow from when a user types in the search box to when results appear on screen.

### **Step 1: User Input (UI Layer)**

The user types in the Search component. Every keystroke updates the `searchTerm` state in the parent App component:

```javascript
// Search.jsx
<input
  value={searchTerm}
  onChange={(e) => setSearchTerm(e.target.value)}
  placeholder="Search for movies..."
/>
```

This immediately updates the App component's state via prop drilling.

### **Step 2: Debouncing Layer**

Here's where it gets interesting. Instead of hitting the API on every keystroke, I use a debouncing hook from `react-use`:

```javascript
// App.jsx
useDebounce(() => {
  setDebouncedSearchTerm(searchTerm);
}, 500, [searchTerm]);
```

This waits 500 milliseconds after the user stops typing before updating `debouncedSearchTerm`. So if someone types 'Inception', we don't make 9 API calls - just one after they pause.

### **Step 3: Trigger API Call**

Once `debouncedSearchTerm` updates, a useEffect hook detects the change and triggers the fetch:

```javascript
useEffect(() => {
  fetchMovies(debouncedSearchTerm, 1);
  setPage(1); // Reset to page 1
}, [debouncedSearchTerm]);
```

### **Step 4: TMDB API Request**

The `fetchMovies` function constructs the API URL based on whether there's a search term:

```javascript
const fetchMovies = async (searchTerm, page) => {
  setIsLoading(true);
  
  // If search exists, use search endpoint
  const endpoint = searchTerm
    ? `${API_BASE_URL}/search/movie?query=${searchTerm}&page=${page}`
    : `${API_BASE_URL}/discover/movie?sort_by=popularity.desc&page=${page}`;
  
  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${TMDB_API_KEY}`
    }
  });
  
  const data = await response.json();
}
```

This makes a direct REST API call to TMDB with Bearer token authentication.

### **Step 5: Response Handling**

TMDB returns a JSON response with this structure:

```javascript
{
  results: [
    {
      id: 27205,
      title: "Inception",
      poster_path: "/xyz.jpg",
      overview: "A thief who steals...",
      vote_average: 8.4
    },
    // ... more movies
  ],
  total_pages: 42,
  page: 1
}
```

### **Step 6: State Updates**

We update multiple states based on the response:

```javascript
setMovieList(data.results);          // Store movies
setTotalPages(data.total_pages);     // For pagination
setHasMore(page < data.total_pages); // For infinite scroll
setIsLoading(false);                 // Hide spinner
```

### **Step 7: Analytics Tracking (Appwrite)**

If we got results, we track this search in Appwrite for trending analytics:

```javascript
if (data.results && data.results.length > 0) {
  updateSearchCount(searchTerm, data.results[0]);
}
```

This is a **fire-and-forget** operation - it runs asynchronously without blocking the UI. Appwrite checks if this search term exists:
- If yes → increment the count
- If no → create new document with count = 1

### **Step 8: UI Re-render**

React detects the state changes and re-renders:

```javascript
{movieList.map((movie, index) => (
  <MovieCard 
    key={movie.id}
    movie={movie}
    onMovieClick={handleMovieClick}
  />
))}
```

Each movie appears as a card with poster, title, and rating.

### **Complete Flow Diagram:**

```
User Types "Inception"
    ↓
Search.jsx → setSearchTerm("Inception")
    ↓
App.jsx state updated
    ↓
500ms Debounce Wait ⏱️
    ↓
debouncedSearchTerm = "Inception"
    ↓
useEffect triggers
    ↓
fetchMovies("Inception", 1)
    ↓
┌─────────────────────────────────────┐
│  TMDB API Call                      │
│  GET /search/movie?query=Inception  │
│  Authorization: Bearer {token}      │
└─────────────────────────────────────┘
    ↓
Response: { results: [...], total_pages: 5 }
    ↓
State Updates:
├─ setMovieList([...movies])
├─ setTotalPages(5)
├─ setHasMore(true)
└─ setIsLoading(false)
    ↓
┌─────────────────────────────────────┐
│  Appwrite Analytics (Async)         │
│  updateSearchCount("Inception")     │
│  → Increment count or create new    │
└─────────────────────────────────────┘
    ↓
React Re-render
    ↓
MovieCard Components Display Results
```

### **Error Handling**

Currently, errors are handled with try-catch:

```javascript
try {
  const response = await fetch(endpoint, API_OPTIONS);
  const data = await response.json();
} catch (error) {
  console.error("Error fetching movies:", error);
  setError("Failed to fetch movies. Please try again.");
}
```

### **Key Technical Details:**

1. **Debouncing reduces API calls by ~80%** - Without it, typing "Inception" would make 9 calls
2. **Bearer token authentication** - More secure than API key in URL
3. **Separation of concerns** - Search term updates don't directly call APIs
4. **Asynchronous analytics** - Doesn't block the search results
5. **Loading states** - Spinner shows while fetching
6. **Pagination ready** - State tracks total pages for infinite scroll

### **What Happens with Edge Cases:**

**Empty Search:**
```javascript
if (!searchTerm) {
  // Fallback to popular movies
  endpoint = '/discover/movie?sort_by=popularity.desc';
}
```

**No Results:**
```javascript
if (data.results.length === 0) {
  setMovieList([]);
  // UI shows "No movies found" message
}
```

**Network Failure:**
```javascript
catch (error) {
  setError("Network error. Check your connection.");
}
```

So in summary, the flow is: **User Input → Debounce → API Call → State Update → UI Render → Analytics**, with each layer handling its specific concern independently."

---

### Visual Code Flow

```javascript
// 1. UI Layer (Search.jsx)
<input onChange={(e) => setSearchTerm(e.target.value)} />
         ↓
// 2. Parent State (App.jsx)
const [searchTerm, setSearchTerm] = useState("");
         ↓
// 3. Debouncing (App.jsx)
useDebounce(() => setDebouncedSearchTerm(searchTerm), 500);
         ↓
// 4. Effect Trigger (App.jsx)
useEffect(() => {
  fetchMovies(debouncedSearchTerm, 1);
}, [debouncedSearchTerm]);
         ↓
// 5. API Layer (App.jsx)
const fetchMovies = async (term, page) => {
  const endpoint = `${API_BASE}/search/movie?query=${term}`;
  const response = await fetch(endpoint, API_OPTIONS);
  const data = await response.json();
  
  // 6. State Updates
  setMovieList(data.results);
  
  // 7. Analytics (Async)
  updateSearchCount(term, data.results[0]);
};
         ↓
// 8. UI Re-render
{movieList.map(movie => <MovieCard movie={movie} />)}
```

---

### Key Interview Points to Emphasize

✅ **Performance Optimization** - Debouncing saves ~80% of API calls  
✅ **Unidirectional Data Flow** - Clear state management pattern  
✅ **Separation of Concerns** - UI, logic, and data layers are distinct  
✅ **Async Operations** - Analytics don't block user experience  
✅ **Error Handling** - Network failures are caught and displayed  
✅ **User Experience** - Loading states provide visual feedback  

---

### Common Follow-up Questions

**Q**: "Why 500ms for debouncing? Why not 1 second or 200ms?"

**A**: "500ms is a sweet spot - it's long enough to capture when users pause typing but short enough that it doesn't feel laggy. Studies show average typing speed has 300-400ms gaps between words, so 500ms catches the pause without making users wait. If it were 1 second, it would feel unresponsive; if 200ms, we'd still get multiple calls mid-word."

---

**Q**: "What if TMDB is down but Appwrite is up? Or vice versa?"

**A**: "Good question. Currently, TMDB failure shows an error to users since that's the primary functionality. Appwrite failures are silent since analytics aren't critical-path - users still get their search results. In production, I'd add retry logic for Appwrite and fallback caching for TMDB to improve resilience."

---

**Q**: "How do you prevent the same search from being executed twice quickly?"

**A**: "The debouncing handles that - if a user types 'Inception', deletes it, then types it again quickly, the debounce timer resets each time. Additionally, React's useEffect with dependency array prevents duplicate calls if the search term hasn't actually changed. For true deduplication, I could add request IDs and cancel in-flight requests using AbortController."




-------------------------------------------------------------------------------------


