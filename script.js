// ===== CONFIGURATION & GLOBAL VARIABLES =====
const CONFIG = {
    JIKAN_API: 'https://api.jikan.moe/v4',
    KITSU_API: 'https://kitsu.io/api/edge',
    SEARCH_DELAY: 500,
    ITEMS_PER_PAGE: 12,
    MAX_RETRIES: 3,
    CACHE_DURATION: 10 * 60 * 1000, // 10 minutes
    AGE_VERIFICATION_KEY: 'animeverse_age_verified',
    THEME_KEY: 'animeverse_theme',
    USER_PREFERENCES_KEY: 'animeverse_user_preferences',
    RECENT_VIEWED_KEY: 'animeverse_recent_viewed',
    USER_RATINGS_KEY: 'animeverse_user_ratings',
    MATURE_GENRES: ['Hentai', 'Ecchi', 'Yaoi', 'Yuri', 'Erotica'],
    MATURE_RATINGS: ['R+', 'Rx'],
    SUPPORTED_REGIONS: ['US', 'JP', 'GB', 'CA', 'AU', 'DE', 'FR'],
    ANIME_GENRES: [
        'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror',
        'Mystery', 'Romance', 'Sci-Fi', 'Slice of Life', 'Sports', 'Supernatural',
        'Thriller', 'Historical', 'Military', 'Psychological', 'School', 'Shounen',
        'Shoujo', 'Seinen', 'Josei', 'Kids', 'Music', 'Parody'
    ]
};

let currentPage = 1;
let currentQuery = '';
let searchTimeout = null;
let isLoading = false;
let hasMoreResults = true;
let currentAnimeList = [];
let ageVerified = localStorage.getItem(CONFIG.AGE_VERIFICATION_KEY) === 'true';
let pendingMatureContent = null;
let watchlist = JSON.parse(localStorage.getItem('animeverse_watchlist') || '[]');
let currentSection = 'home';
let globalAnimeTracker = new Set(); // Track all displayed anime IDs to prevent duplicates

// ===== NEW ENHANCED FEATURES =====
let apiCache = new Map(); // Cache for API responses
let userPreferences = JSON.parse(localStorage.getItem(CONFIG.USER_PREFERENCES_KEY) || '{}');
let recentlyViewed = JSON.parse(localStorage.getItem(CONFIG.RECENT_VIEWED_KEY) || '[]');
let userRatings = JSON.parse(localStorage.getItem(CONFIG.USER_RATINGS_KEY) || '{}');
let currentTheme = localStorage.getItem(CONFIG.THEME_KEY) || 'dark';
let currentRegion = userPreferences.region || 'US';
let favoriteGenres = userPreferences.favoriteGenres || [];
let isInfiniteScrollEnabled = false;
let intersectionObserver = null;
let streamingPlatforms = {
    crunchyroll: { name: 'Crunchyroll', icon: 'fas fa-play-circle', color: '#ff6500', description: 'Premium anime streaming' },
    funimation: { name: 'Funimation', icon: 'fas fa-tv', color: '#5b4e75', description: 'Dubbed anime specialist' },
    netflix: { name: 'Netflix', icon: 'fab fa-netflix', color: '#e50914', description: 'Global streaming giant' },
    hulu: { name: 'Hulu', icon: 'fab fa-hulu', color: '#1ce783', description: 'US streaming service' },
    youtube: { name: 'YouTube', icon: 'fab fa-youtube', color: '#ff0000', description: 'Free content & trailers' },
    animixplay: { name: 'AniMixPlay', icon: 'fas fa-play', color: '#4a90e2', description: 'Free anime streaming' },
    gogoanime: { name: 'GogoAnime', icon: 'fas fa-film', color: '#ff4757', description: 'Extensive anime library' },
    nineanime: { name: '9Anime', icon: 'fas fa-video', color: '#2f3542', description: 'High quality streams' },
    animepahe: { name: 'AnimePahe', icon: 'fas fa-download', color: '#00d2d3', description: 'Compressed anime files' },
    kissanime: { name: 'KissAnime', icon: 'fas fa-kiss', color: '#e74c3c', description: 'Classic anime site' },
    aniwatch: { name: 'AniWatch', icon: 'fas fa-eye', color: '#9b59b6', description: 'Ad-free experience' },
    animedao: { name: 'AnimeDao', icon: 'fas fa-dragon', color: '#f39c12', description: 'Reliable anime source' }
};

// ===== DOM ELEMENTS =====
const elements = {
    heroSearch: null,
    searchBtn: null,
    loadingOverlay: null,
    searchResults: null,
    searchGrid: null,
    featuredSection: null,
    featuredGrid: null,
    resultsCount: null,
    clearSearch: null,
    loadMoreBtn: null,
    loadMoreContainer: null,
    refreshFeatured: null,
    categoryFilter: null,
    ageModal: null,
    ageInput: null,
    ageConfirm: null,
    ageCancel: null,
    detailModal: null,
    detailContent: null,
    closeDetail: null,
    toastContainer: null
};

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    setupEventListeners();
    loadFeaturedAnime();
    initializeAnimations();
});

function initializeElements() {
    elements.heroSearch = document.getElementById('hero-search');
    elements.searchBtn = document.getElementById('search-btn');
    elements.loadingOverlay = document.getElementById('loading-overlay');
    elements.searchResults = document.getElementById('search-results');
    elements.searchGrid = document.getElementById('search-grid');
    elements.featuredSection = document.getElementById('featured-section');
    elements.featuredGrid = document.getElementById('featured-grid');
    elements.resultsCount = document.getElementById('results-count');
    elements.clearSearch = document.getElementById('clear-search');
    elements.loadMoreBtn = document.getElementById('load-more-btn');
    elements.loadMoreContainer = document.getElementById('load-more-container');
    elements.refreshFeatured = document.getElementById('refresh-featured');
    elements.categoryFilter = document.getElementById('category-filter');
    elements.ageModal = document.getElementById('age-modal');
    elements.ageInput = document.getElementById('age-input');
    elements.ageConfirm = document.getElementById('age-confirm');
    elements.ageCancel = document.getElementById('age-cancel');
    elements.detailModal = document.getElementById('detail-modal');
    elements.detailContent = document.getElementById('detail-content');
    elements.closeDetail = document.getElementById('close-detail');
    elements.toastContainer = document.getElementById('toast-container');
}

function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.dataset.section;
            
            // Handle hentai section age verification
            if (section === 'hentai' && !ageVerified) {
                showAgeVerification({ section: 'hentai' });
                return;
            }
            
            switchSection(section);
        });
    });
    
    // Search functionality
    elements.heroSearch?.addEventListener('input', handleSearchInput);
    elements.searchBtn?.addEventListener('click', performSearch);
    elements.heroSearch?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') performSearch();
    });
    
    // Control buttons
    elements.clearSearch?.addEventListener('click', clearSearchResults);
    elements.loadMoreBtn?.addEventListener('click', loadMoreResults);
    elements.refreshFeatured?.addEventListener('click', loadFeaturedAnime);
    elements.categoryFilter?.addEventListener('change', loadFeaturedAnime);
    
    // New section controls
    document.getElementById('refresh-trending')?.addEventListener('click', loadTrendingAnime);
    document.getElementById('trending-filter')?.addEventListener('change', loadTrendingAnime);
    document.getElementById('clear-watchlist')?.addEventListener('click', clearWatchlist);
    document.getElementById('refresh-hentai')?.addEventListener('click', loadHentaiContent);
    
    // Age verification modal
    elements.ageConfirm?.addEventListener('click', confirmAge);
    elements.ageCancel?.addEventListener('click', cancelAgeVerification);
    elements.ageInput?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') confirmAge();
    });
    
    // Detail modal
    elements.closeDetail?.addEventListener('click', closeDetailModal);
    elements.detailModal?.addEventListener('click', function(e) {
        if (e.target === elements.detailModal) closeDetailModal();
    });
    
    // Close modals on escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeDetailModal();
            cancelAgeVerification();
        }
    });
    
    // Click delegation for anime cards and buttons
    document.addEventListener('click', function(e) {
        // Bookmark button
        if (e.target.closest('.bookmark-btn')) {
            e.stopPropagation();
            const card = e.target.closest('.anime-card');
            const animeData = JSON.parse(card.dataset.animeData);
            toggleWatchlist(animeData);
            return;
        }
        
        // Watch button
        if (e.target.closest('.watch-btn')) {
            e.stopPropagation();
            const card = e.target.closest('.anime-card');
            const animeData = JSON.parse(card.dataset.animeData);
            openStreamingLinks(animeData);
            return;
        }
        
        // Anime card click
        const animeCard = e.target.closest('.anime-card');
        if (animeCard) {
            const animeData = JSON.parse(animeCard.dataset.animeData);
            
            // Check if it's mature content and user isn't verified
            if (animeData.mature && !ageVerified) {
                showAgeVerification(animeData);
                return;
            }
            
            showAnimeDetails(animeData);
        }
    });
}

// ===== SEARCH FUNCTIONALITY =====
function handleSearchInput() {
    const query = elements.heroSearch.value.trim();
    
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }
    
    if (query.length >= 2) {
        searchTimeout = setTimeout(() => {
            performSearch();
        }, CONFIG.SEARCH_DELAY);
    } else if (query.length === 0) {
        clearSearchResults();
    }
}

async function performSearch() {
    const query = elements.heroSearch.value.trim();
    
    if (query.length < 2) {
        showToast('Please enter at least 2 characters to search', 'warning');
        return;
    }
    
    currentQuery = query;
    currentPage = 1;
    hasMoreResults = true;
    
    showLoading('Searching the anime universe...');
    
    try {
        const results = await searchAnime(query, currentPage);
        displaySearchResults(results, true);
        showSearchSection();
        
        if (results.length === 0) {
            showToast('No results found. Try a different search term.', 'error');
        } else {
            showToast(`Found ${results.length} results for "${query}"`, 'success');
        }
    } catch (error) {
        console.error('Search error:', error);
        showToast('Search failed. Please try again.', 'error');
        hideLoading();
    }
}

async function searchAnime(query, page = 1) {
    const results = [];
    
    try {
        // Search Jikan API (MyAnimeList)
        const jikanResults = await searchJikanAPI(query, page);
        results.push(...jikanResults);
        
        // Search Kitsu API for additional results
        const kitsuResults = await searchKitsuAPI(query, page);
        results.push(...kitsuResults);
        
        // Remove duplicates and limit results
        const uniqueResults = removeDuplicates(results);
        return uniqueResults.slice(0, CONFIG.ITEMS_PER_PAGE);
        
    } catch (error) {
        console.error('API search failed:', error);
        return [];
    }
}

async function searchJikanAPI(query, page) {
    try {
        const response = await fetch(
            `${CONFIG.JIKAN_API}/anime?q=${encodeURIComponent(query)}&page=${page}&limit=${CONFIG.ITEMS_PER_PAGE}&order_by=score&sort=desc`
        );
        
        if (!response.ok) {
            throw new Error(`Jikan API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        return data.data.map(anime => ({
            id: anime.mal_id,
            title: anime.title || anime.title_english || 'Unknown Title',
            englishTitle: anime.title_english,
            japaneseTitle: anime.title_japanese,
            type: anime.type || 'Unknown',
            episodes: anime.episodes,
            status: anime.status,
            year: anime.aired?.from ? new Date(anime.aired.from).getFullYear() : 'Unknown',
            season: anime.season,
            rating: anime.rating,
            score: anime.score || 'N/A',
            scoredBy: anime.scored_by,
            rank: anime.rank,
            popularity: anime.popularity,
            synopsis: anime.synopsis || 'No synopsis available.',
            genres: anime.genres?.map(genre => genre.name) || [],
            themes: anime.themes?.map(theme => theme.name) || [],
            demographics: anime.demographics?.map(demo => demo.name) || [],
            studios: anime.studios?.map(studio => studio.name) || [],
            producers: anime.producers?.map(producer => producer.name) || [],
            licensors: anime.licensors?.map(licensor => licensor.name) || [],
            image: anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url || generateFallbackImage(anime.title),
            trailer: anime.trailer?.url,
            url: anime.url,
            source: 'jikan',
            mature: isMatureContent(anime)
        }));
        
    } catch (error) {
        console.error('Jikan API search failed:', error);
        return [];
    }
}

async function searchKitsuAPI(query, page) {
    try {
        const offset = (page - 1) * CONFIG.ITEMS_PER_PAGE;
        const response = await fetch(
            `${CONFIG.KITSU_API}/anime?filter[text]=${encodeURIComponent(query)}&page[limit]=${CONFIG.ITEMS_PER_PAGE}&page[offset]=${offset}&sort=-averageRating`
        );
        
        if (!response.ok) {
            throw new Error(`Kitsu API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        return data.data.map(anime => ({
            id: `kitsu-${anime.id}`,
            title: anime.attributes.canonicalTitle || anime.attributes.titles?.en || 'Unknown Title',
            englishTitle: anime.attributes.titles?.en,
            japaneseTitle: anime.attributes.titles?.ja_jp,
            type: anime.attributes.subtype || 'Unknown',
            episodes: anime.attributes.episodeCount,
            status: anime.attributes.status,
            year: anime.attributes.startDate ? new Date(anime.attributes.startDate).getFullYear() : 'Unknown',
            rating: anime.attributes.ageRating,
            score: anime.attributes.averageRating ? (anime.attributes.averageRating / 10).toFixed(1) : 'N/A',
            rank: anime.attributes.ratingRank,
            popularity: anime.attributes.popularityRank,
            synopsis: anime.attributes.synopsis || 'No synopsis available.',
            genres: [], // Kitsu requires separate API call for genres
            image: anime.attributes.posterImage?.large || anime.attributes.posterImage?.medium || generateFallbackImage(anime.attributes.canonicalTitle),
            url: `https://kitsu.io/anime/${anime.attributes.slug}`,
            source: 'kitsu',
            mature: isMatureContentKitsu(anime)
        }));
        
    } catch (error) {
        console.error('Kitsu API search failed:', error);
        return [];
    }
}

function isMatureContent(anime) {
    // Check rating
    if (CONFIG.MATURE_RATINGS.includes(anime.rating)) {
        return true;
    }
    
    // Check genres
    const allCategories = [
        ...(anime.genres || []),
        ...(anime.themes || []),
        ...(anime.demographics || [])
    ];
    
    return allCategories.some(category => 
        CONFIG.MATURE_GENRES.some(mature => 
            category.toLowerCase().includes(mature.toLowerCase())
        )
    );
}

function isMatureContentKitsu(anime) {
    return anime.attributes.ageRating && 
           (anime.attributes.ageRating.includes('R') || anime.attributes.ageRating.includes('X'));
}

function removeDuplicates(animeList) {
    const seen = new Set();
    return animeList.filter(anime => {
        const normalizedTitle = anime.title.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (seen.has(normalizedTitle)) {
            return false;
        }
        seen.add(normalizedTitle);
        return true;
    });
}

// Enhanced duplicate prevention across all sections
function filterGlobalDuplicates(animeList, sectionName = '') {
    return animeList.filter(anime => {
        const uniqueKey = `${anime.id}-${anime.title.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
        
        // Skip if already displayed globally
        if (globalAnimeTracker.has(uniqueKey)) {
            return false;
        }
        
        // Add to global tracker
        globalAnimeTracker.add(uniqueKey);
        return true;
    });
}

// Reset global tracker when switching sections or refreshing
function resetGlobalTracker() {
    globalAnimeTracker.clear();
}

// ===== DISPLAY FUNCTIONS =====
function displaySearchResults(results, clearPrevious = false) {
    if (clearPrevious) {
        elements.searchGrid.innerHTML = '';
        currentAnimeList = [];
    }
    
    currentAnimeList.push(...results);
    
    results.forEach((anime, index) => {
        const card = createAnimeCard(anime, currentAnimeList.length - results.length + index);
        elements.searchGrid.appendChild(card);
    });
    
    elements.resultsCount.textContent = `${currentAnimeList.length} results`;
    
    // Show/hide load more button
    if (results.length < CONFIG.ITEMS_PER_PAGE) {
        hasMoreResults = false;
        elements.loadMoreContainer.classList.add('hidden');
    } else {
        elements.loadMoreContainer.classList.remove('hidden');
    }
    
    hideLoading();
}

function createAnimeCard(anime, index) {
    const card = document.createElement('div');
    card.className = 'anime-card';
    card.dataset.animeId = anime.id;
    card.dataset.animeData = JSON.stringify(anime);
    card.style.animationDelay = `${index * 0.1}s`;
    
    const genres = anime.genres.slice(0, 3).map(genre => 
        `<span class="genre-tag">${genre}</span>`
    ).join('');
    
    const matureIndicator = anime.mature ? 
        '<div class="mature-indicator">18+</div>' : '';
    
    card.innerHTML = `
        ${matureIndicator}
        <img src="${anime.image}" alt="${anime.title}" class="anime-poster" 
             onerror="this.src='${generateFallbackImage(anime.title)}'">
        <div class="anime-info">
            <h3 class="anime-title">${anime.title}</h3>
            <div class="anime-meta">
                <span class="anime-year">${anime.year}</span>
                <span class="anime-type">${anime.type}</span>
                ${anime.score !== 'N/A' ? `<div class="anime-rating"><i class="fas fa-star"></i>${anime.score}</div>` : ''}
            </div>
            <p class="anime-description">${anime.synopsis}</p>
            <div class="anime-genres">${genres}</div>
        </div>
    `;
    
    // Add click handler with age verification check
    card.addEventListener('click', () => {
        if (anime.mature && !ageVerified) {
            showAgeVerification(anime);
        } else {
            showAnimeDetails(anime);
        }
    });
    
    return card;
}

async function loadFeaturedAnime() {
    const category = elements.categoryFilter.value;
    showLoading('Loading featured anime...');
    
    // Reset global tracker when refreshing featured content
    resetGlobalTracker();
    
    try {
        let featured = [];
        
        if (category === 'all') {
            // Get top anime from current season
            featured = await getTopAnime();
        } else {
            // Get anime by specific type
            featured = await getAnimeByType(category);
        }
        
        displayFeaturedAnime(featured);
        
    } catch (error) {
        console.error('Failed to load featured anime:', error);
        showToast('Failed to load featured anime', 'error');
    } finally {
        hideLoading();
    }
}

async function getTopAnime() {
    try {
        const response = await fetch(`${CONFIG.JIKAN_API}/top/anime?limit=${CONFIG.ITEMS_PER_PAGE}`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch top anime');
        }
        
        const data = await response.json();
        return data.data.map(anime => ({
            id: anime.mal_id,
            title: anime.title,
            type: anime.type,
            year: anime.aired?.from ? new Date(anime.aired.from).getFullYear() : 'Unknown',
            score: anime.score,
            synopsis: anime.synopsis,
            genres: anime.genres?.map(genre => genre.name) || [],
            image: anime.images?.jpg?.large_image_url || generateFallbackImage(anime.title),
            mature: isMatureContent(anime),
            source: 'jikan'
        }));
    } catch (error) {
        console.error('Failed to get top anime:', error);
        return [];
    }
}

async function getAnimeByType(type) {
    try {
        const response = await fetch(
            `${CONFIG.JIKAN_API}/anime?type=${type}&order_by=score&sort=desc&limit=${CONFIG.ITEMS_PER_PAGE}`
        );
        
        if (!response.ok) {
            throw new Error(`Failed to fetch ${type} anime`);
        }
        
        const data = await response.json();
        return data.data.map(anime => ({
            id: anime.mal_id,
            title: anime.title,
            type: anime.type,
            year: anime.aired?.from ? new Date(anime.aired.from).getFullYear() : 'Unknown',
            score: anime.score,
            synopsis: anime.synopsis,
            genres: anime.genres?.map(genre => genre.name) || [],
            image: anime.images?.jpg?.large_image_url || generateFallbackImage(anime.title),
            mature: isMatureContent(anime),
            source: 'jikan'
        }));
    } catch (error) {
        console.error(`Failed to get ${type} anime:`, error);
        return [];
    }
}

function displayFeaturedAnime(animeList) {
    elements.featuredGrid.innerHTML = '';
    
    // Apply global duplicate filtering
    const uniqueAnime = filterGlobalDuplicates(animeList, 'featured');
    
    uniqueAnime.forEach((anime, index) => {
        const card = createAnimeCard(anime, index);
        elements.featuredGrid.appendChild(card);
    });
}

// ===== AGE VERIFICATION =====
function showAgeVerification(animeData) {
    pendingMatureContent = animeData;
    elements.ageInput.value = '';
    elements.ageModal.classList.remove('hidden');
    elements.ageInput.focus();
}

function confirmAge() {
    const age = parseInt(elements.ageInput.value);
    
    if (isNaN(age) || age < 1 || age > 120) {
        showToast('Please enter a valid age between 1 and 120', 'warning');
        return;
    }
    
    if (age >= 18) {
        ageVerified = true;
        localStorage.setItem(CONFIG.AGE_VERIFICATION_KEY, 'true');
        elements.ageModal.classList.add('hidden');
        
        if (pendingMatureContent) {
            showAnimeDetails(pendingMatureContent);
            pendingMatureContent = null;
        }
        
        showToast('Age verified successfully', 'success');
    } else {
        showToast('You must be 18 or older to view mature content', 'error');
        elements.ageModal.classList.add('hidden');
        pendingMatureContent = null;
    }
}

function cancelAgeVerification() {
    elements.ageModal.classList.add('hidden');
    pendingMatureContent = null;
}

// ===== ANIME DETAILS MODAL =====
function showAnimeDetails(anime) {
    const genres = anime.genres.map(genre => `<span class="genre-tag">${genre}</span>`).join('');
    const themes = anime.themes?.map(theme => `<span class="genre-tag">${theme}</span>`).join('') || '';
    const studios = anime.studios?.join(', ') || 'Unknown';
    const status = anime.status || 'Unknown';
    const episodes = anime.episodes || 'Unknown';
    
    elements.detailContent.innerHTML = `
        <div style="display: flex; gap: 2rem; margin-bottom: 2rem; flex-wrap: wrap;">
            <img src="${anime.image}" alt="${anime.title}" 
                 style="width: 300px; height: 400px; object-fit: cover; border-radius: 15px; flex-shrink: 0;"
                 onerror="this.src='${generateFallbackImage(anime.title)}'">
            <div style="flex: 1; min-width: 300px;">
                <h2 style="font-size: 2rem; margin-bottom: 1rem; color: var(--text-primary);">${anime.title}</h2>
                ${anime.englishTitle && anime.englishTitle !== anime.title ? 
                    `<h3 style="font-size: 1.2rem; margin-bottom: 0.5rem; color: var(--text-secondary);">${anime.englishTitle}</h3>` : ''}
                ${anime.japaneseTitle && anime.japaneseTitle !== anime.title ? 
                    `<p style="font-size: 1rem; margin-bottom: 1rem; color: var(--text-secondary);">${anime.japaneseTitle}</p>` : ''}
                
                <div style="display: flex; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap;">
                    <span class="anime-year">${anime.year}</span>
                    <span class="anime-type">${anime.type}</span>
                    <span class="anime-type">${episodes} episodes</span>
                    <span class="anime-type">${status}</span>
                    ${anime.score !== 'N/A' ? `<div class="anime-rating"><i class="fas fa-star"></i> ${anime.score}</div>` : ''}
                </div>
                
                <div style="margin-bottom: 1rem;">
                    <strong style="color: var(--text-primary);">Studio:</strong> <span style="color: var(--text-secondary);">${studios}</span>
                </div>
                
                ${anime.rank ? `<div style="margin-bottom: 1rem;"><strong style="color: var(--text-primary);">Rank:</strong> <span style="color: var(--text-secondary);">#${anime.rank}</span></div>` : ''}
                
                <div style="margin-bottom: 1rem;">
                    <strong style="color: var(--text-primary);">Genres:</strong>
                    <div style="margin-top: 0.5rem;">${genres}</div>
                </div>
                
                ${themes ? `<div style="margin-bottom: 1rem;"><strong style="color: var(--text-primary);">Themes:</strong><div style="margin-top: 0.5rem;">${themes}</div></div>` : ''}
            </div>
        </div>
        
        <div>
            <h3 style="color: var(--text-primary); margin-bottom: 1rem;">Synopsis</h3>
            <p style="color: var(--text-secondary); line-height: 1.8;">${anime.synopsis}</p>
        </div>
        
        ${anime.trailer ? `
            <div style="margin-top: 2rem;">
                <h3 style="color: var(--text-primary); margin-bottom: 1rem;">Trailer</h3>
                <a href="${anime.trailer}" target="_blank" class="btn-primary" style="text-decoration: none; display: inline-flex;">
                    <i class="fas fa-play"></i> Watch Trailer
                </a>
            </div>
        ` : ''}
        
        <div style="margin-top: 2rem; text-align: center;">
            <a href="${anime.url}" target="_blank" class="btn-primary" style="text-decoration: none; display: inline-flex;">
                <i class="fas fa-external-link-alt"></i> View on ${anime.source === 'jikan' ? 'MyAnimeList' : 'Kitsu'}
            </a>
        </div>
    `;
    
    elements.detailModal.classList.remove('hidden');
}

// ===== NEWS AND UPDATES FUNCTIONALITY =====
let animeNews = [];

async function loadAnimeNews() {
    // Simulate anime news - in a real app, this would fetch from an anime news API
    const mockNews = [
        {
            id: 1,
            title: 'Studio Ghibli Announces New Miyazaki Film',
            summary: 'Hayao Miyazaki returns with another masterpiece set to release in 2024.',
            image: generateFallbackImage('Miyazaki News'),
            date: new Date().toISOString(),
            source: 'Anime News Network',
            url: '#'
        },
        {
            id: 2,
            title: 'Attack on Titan Final Season Gets Extended',
            summary: 'The final season will include additional episodes to properly conclude the series.',
            image: generateFallbackImage('Attack on Titan'),
            date: new Date(Date.now() - 86400000).toISOString(), // Yesterday
            source: 'Crunchyroll News',
            url: '#'
        },
        {
            id: 3,
            title: 'One Piece Live Action Series Renewed',
            summary: 'Netflix announces second season of the popular live-action adaptation.',
            image: generateFallbackImage('One Piece Live Action'),
            date: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
            source: 'Netflix',
            url: '#'
        }
    ];
    
    animeNews = mockNews;
    return mockNews;
}

function displayAnimeNews(newsItems) {
    const newsContainer = document.getElementById('anime-news-container');
    if (!newsContainer) return;
    
    newsContainer.innerHTML = newsItems.map(item => `
        <div class="news-item" onclick="openNewsItem(${JSON.stringify(item).replace(/"/g, '&quot;')})">
            <img src="${item.image}" alt="${item.title}" class="news-image" onerror="this.src='${generateFallbackImage(item.title)}'">
            <div class="news-content">
                <h3 class="news-title">${item.title}</h3>
                <p class="news-summary">${item.summary}</p>
                <div class="news-meta">
                    <span class="news-source">${item.source}</span>
                    <span class="news-date">${formatDate(item.date)}</span>
                </div>
            </div>
        </div>
    `).join('');
}

function openNewsItem(newsItem) {
    // Create a modal for the news item
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-container">
            <div class="modal-header">
                <h3><i class="fas fa-newspaper"></i> ${newsItem.title}</h3>
                <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-content">
                <img src="${newsItem.image}" alt="${newsItem.title}" style="width: 100%; max-height: 300px; object-fit: cover; border-radius: 8px; margin-bottom: 1rem;">
                <div class="news-meta" style="margin-bottom: 1rem;">
                    <span><i class="fas fa-source"></i> ${newsItem.source}</span>
                    <span><i class="fas fa-calendar"></i> ${formatDate(newsItem.date)}</span>
                </div>
                <p style="color: var(--text-secondary); line-height: 1.6;">${newsItem.summary}</p>
                <p style="color: var(--text-secondary); line-height: 1.6; margin-top: 1rem;">This is a preview of the news article. Click the link below to read the full story on the original source.</p>
            </div>
            <div class="modal-actions">
                <a href="${newsItem.url}" target="_blank" class="btn-primary">
                    <i class="fas fa-external-link-alt"></i> Read Full Article
                </a>
                <button class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                    Close
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
}

// ===== SEARCH SUGGESTIONS FUNCTIONALITY =====
let searchSuggestions = [];
let suggestionTimeout = null;

function setupSearchSuggestions() {
    const searchInput = elements.heroSearch;
    if (!searchInput) return;
    
    // Create suggestions container
    if (!document.getElementById('search-suggestions')) {
        const suggestionsContainer = document.createElement('div');
        suggestionsContainer.id = 'search-suggestions';
        suggestionsContainer.className = 'search-suggestions hidden';
        searchInput.parentNode.appendChild(suggestionsContainer);
    }
    
    searchInput.addEventListener('input', handleSearchSuggestions);
    searchInput.addEventListener('focus', showSearchSuggestions);
    searchInput.addEventListener('blur', hideSearchSuggestions);
}

function handleSearchSuggestions() {
    const query = elements.heroSearch.value.trim();
    
    if (suggestionTimeout) {
        clearTimeout(suggestionTimeout);
    }
    
    if (query.length >= 2) {
        suggestionTimeout = setTimeout(() => {
            fetchSearchSuggestions(query);
        }, 300);
    } else {
        hideSearchSuggestions();
    }
}

async function fetchSearchSuggestions(query) {
    try {
        // Use cached suggestions if available
        const cacheKey = getCacheKey('suggestions', { query });
        const cachedSuggestions = getCachedData(cacheKey);
        
        if (cachedSuggestions) {
            displaySearchSuggestions(cachedSuggestions);
            return;
        }
        
        // Fetch limited results for suggestions
        const response = await fetch(
            `${CONFIG.JIKAN_API}/anime?q=${encodeURIComponent(query)}&limit=5&order_by=popularity&sort=desc`
        );
        
        if (!response.ok) return;
        
        const data = await response.json();
        const suggestions = data.data.map(anime => ({
            id: anime.mal_id,
            title: anime.title,
            type: anime.type,
            year: anime.aired?.from ? new Date(anime.aired.from).getFullYear() : 'Unknown',
            image: anime.images?.jpg?.image_url || generateFallbackImage(anime.title)
        }));
        
        setCachedData(cacheKey, suggestions);
        displaySearchSuggestions(suggestions);
        
    } catch (error) {
        console.error('Failed to fetch search suggestions:', error);
    }
}

function displaySearchSuggestions(suggestions) {
    const container = document.getElementById('search-suggestions');
    if (!container) return;
    
    if (suggestions.length === 0) {
        container.classList.add('hidden');
        return;
    }
    
    container.innerHTML = suggestions.map(suggestion => `
        <div class="suggestion-item" data-suggestion='${JSON.stringify(suggestion)}'>
            <div class="suggestion-title">${suggestion.title}</div>
            <div class="suggestion-meta">${suggestion.type} • ${suggestion.year}</div>
        </div>
    `).join('');
    
    container.classList.remove('hidden');
    
    // Add click handlers
    container.querySelectorAll('.suggestion-item').forEach(item => {
        item.addEventListener('mousedown', (e) => {
            e.preventDefault(); // Prevent blur event
            const suggestion = JSON.parse(item.dataset.suggestion);
            elements.heroSearch.value = suggestion.title;
            hideSearchSuggestions();
            performSearch();
        });
    });
}

function showSearchSuggestions() {
    const container = document.getElementById('search-suggestions');
    const query = elements.heroSearch.value.trim();
    
    if (container && query.length >= 2 && container.children.length > 0) {
        container.classList.remove('hidden');
    }
}

function hideSearchSuggestions() {
    setTimeout(() => {
        const container = document.getElementById('search-suggestions');
        if (container) {
            container.classList.add('hidden');
        }
    }, 200); // Delay to allow click events
}

// ===== MOBILE OPTIMIZATION =====
function initializeMobileOptimizations() {
    // Add mobile-specific event listeners
    if ('ontouchstart' in window) {
        document.body.classList.add('touch-device');
        
        // Optimize touch interactions
        document.addEventListener('touchstart', function() {}, {passive: true});
        
        // Improve mobile scrolling
        document.addEventListener('touchmove', function(e) {
            if (e.target.closest('.modal-overlay')) {
                e.preventDefault();
            }
        }, {passive: false});
    }
    
    // Add orientation change handler
    window.addEventListener('orientationchange', function() {
        setTimeout(() => {
            // Refresh layout after orientation change
            window.dispatchEvent(new Event('resize'));
        }, 100);
    });
    
    // Optimize image loading for mobile
    if (navigator.connection && navigator.connection.effectiveType) {
        const connectionType = navigator.connection.effectiveType;
        if (connectionType === 'slow-2g' || connectionType === '2g') {
            document.body.classList.add('slow-connection');
            CONFIG.ITEMS_PER_PAGE = 6; // Reduce items for slow connections
        }
    }
}

// ===== PERFORMANCE OPTIMIZATIONS =====
function initializePerformanceOptimizations() {
    // Lazy loading for images
    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                if (img.dataset.src) {
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    imageObserver.unobserve(img);
                }
            }
        });
    });
    
    // Observe all images with data-src attribute
    document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
    });
    
    // Debounced resize handler
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            // Handle responsive adjustments
            adjustLayoutForScreen();
        }, 250);
    });
}

function adjustLayoutForScreen() {
    const screenWidth = window.innerWidth;
    
    // Adjust grid columns based on screen size
    const grids = document.querySelectorAll('.anime-grid');
    grids.forEach(grid => {
        if (screenWidth <= 480) {
            grid.style.gridTemplateColumns = '1fr';
        } else if (screenWidth <= 768) {
            grid.style.gridTemplateColumns = 'repeat(2, 1fr)';
        } else if (screenWidth <= 1200) {
            grid.style.gridTemplateColumns = 'repeat(3, 1fr)';
        } else {
            grid.style.gridTemplateColumns = 'repeat(4, 1fr)';
        }
    });
}

// ===== SERVICE WORKER FOR OFFLINE FUNCTIONALITY =====
function initializeServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/service-worker.js')
                .then(registration => {
                    console.log('SW registered: ', registration);
                })
                .catch(registrationError => {
                    console.log('SW registration failed: ', registrationError);
                });
        });
    }
}

// ===== KEYBOARD SHORTCUTS =====
function initializeKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Don't trigger shortcuts when typing in inputs
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }
        
        switch (e.key) {
            case '/':
                e.preventDefault();
                elements.heroSearch?.focus();
                break;
            case 'Escape':
                closeAllModals();
                break;
            case 'h':
                if (e.ctrlKey) {
                    e.preventDefault();
                    switchSection('home');
                }
                break;
            case 't':
                if (e.ctrlKey) {
                    e.preventDefault();
                    switchSection('trending');
                }
                break;
            case 'w':
                if (e.ctrlKey) {
                    e.preventDefault();
                    switchSection('watchlist');
                }
                break;
            case 'f':
                if (e.ctrlKey && e.shiftKey) {
                    e.preventDefault();
                    createAdvancedSearchModal();
                }
                break;
        }
    });
}

function closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.remove();
    });
    
    if (elements.ageModal) {
        elements.ageModal.classList.add('hidden');
    }
    
    if (elements.detailModal) {
        elements.detailModal.classList.add('hidden');
    }
}

// ===== ANALYTICS AND TRACKING =====
function trackUserAction(action, category, label = '') {
    // Simple analytics tracking - in a real app, integrate with Google Analytics or similar
    if (typeof gtag === 'function') {
        gtag('event', action, {
            event_category: category,
            event_label: label
        });
    }
    
    // Store in localStorage for local analytics
    const analyticsData = JSON.parse(localStorage.getItem('animeverse_analytics') || '[]');
    analyticsData.push({
        action,
        category,
        label,
        timestamp: Date.now(),
        userAgent: navigator.userAgent
    });
    
    // Keep only last 100 events
    if (analyticsData.length > 100) {
        analyticsData.splice(0, analyticsData.length - 100);
    }
    
    localStorage.setItem('animeverse_analytics', JSON.stringify(analyticsData));
}

// ===== ERROR HANDLING AND REPORTING =====
function initializeErrorHandling() {
    window.addEventListener('error', (e) => {
        console.error('Global error:', e.error);
        showToast('An unexpected error occurred. Please refresh the page.', 'error');
        
        // Track error
        trackUserAction('error', 'javascript', e.error?.message || 'Unknown error');
    });
    
    window.addEventListener('unhandledrejection', (e) => {
        console.error('Unhandled promise rejection:', e.reason);
        showToast('Network request failed. Please check your connection.', 'warning');
        
        // Track error
        trackUserAction('error', 'promise_rejection', e.reason?.message || 'Unknown rejection');
    });
}

// ===== INITIALIZE ALL ENHANCEMENTS =====
function initializeEnhancements() {
    initializeMobileOptimizations();
    initializePerformanceOptimizations();
    initializeServiceWorker();
    initializeKeyboardShortcuts();
    initializeErrorHandling();
    setupSearchSuggestions();
    
    // Load initial news
    loadAnimeNews().then(displayAnimeNews);
    
    // Track page load
    trackUserAction('page_load', 'navigation', window.location.pathname);
    
    showToast('AnimeVerse enhanced features loaded!', 'success');
}

// Update the main initialization to include enhancements
document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    setupEventListeners();
    loadFeaturedAnime();
    initializeAnimations();
    initializeEnhancements(); // Add this line
});

// Override the showAnimeDetails function to use the enhanced version
function showAnimeDetails(anime) {
    // Track anime view
    trackUserAction('anime_view', 'content', anime.title);
    
    // Use the enhanced version with ratings and sharing
    showEnhancedAnimeDetails(anime);
}

// Add advanced search button to the interface
function addAdvancedSearchButton() {
    const searchContainer = elements.heroSearch?.parentNode;
    if (searchContainer && !document.getElementById('advanced-search-btn')) {
        const advancedBtn = document.createElement('button');
        advancedBtn.id = 'advanced-search-btn';
        advancedBtn.className = 'advanced-search-btn';
        advancedBtn.innerHTML = '<i class="fas fa-filter"></i> Advanced';
        advancedBtn.title = 'Advanced Search (Ctrl+Shift+F)';
        advancedBtn.addEventListener('click', createAdvancedSearchModal);
        
        searchContainer.appendChild(advancedBtn);
    }
}

// Call this after elements are initialized
setTimeout(addAdvancedSearchButton, 1000);

    elements.detailModal.classList.remove('hidden');
}

function closeDetailModal() {
    elements.detailModal.classList.add('hidden');
    elements.detailContent.innerHTML = '';
}

// ===== UTILITY FUNCTIONS =====
function showLoading(message = 'Loading...') {
    if (isLoading) return;
    
    isLoading = true;
    elements.loadingOverlay.classList.remove('hidden');
    elements.loadingOverlay.querySelector('.loading-text').textContent = message;
}

function hideLoading() {
    isLoading = false;
    elements.loadingOverlay.classList.add('hidden');
}

function showSearchSection() {
    elements.searchResults.classList.remove('hidden');
    elements.featuredSection.style.display = 'none';
}

function clearSearchResults() {
    elements.heroSearch.value = '';
    currentQuery = '';
    currentPage = 1;
    hasMoreResults = true;
    currentAnimeList = [];
    
    elements.searchResults.classList.add('hidden');
    elements.featuredSection.style.display = 'block';
    elements.searchGrid.innerHTML = '';
    elements.loadMoreContainer.classList.add('hidden');
}

async function loadMoreResults() {
    if (!hasMoreResults || isLoading || !currentQuery) return;
    
    currentPage++;
    showLoading('Loading more results...');
    
    try {
        const results = await searchAnime(currentQuery, currentPage);
        displaySearchResults(results, false);
        
        if (results.length > 0) {
            showToast(`Loaded ${results.length} more results`, 'success');
        }
    } catch (error) {
        console.error('Load more error:', error);
        showToast('Failed to load more results', 'error');
        currentPage--; // Revert page increment
        hideLoading();
    }
}

function generateFallbackImage(title) {
    const colors = [
        'FF6B6B', '4ECDC4', '45B7D1', '96CEB4', 'FFEAA7',
        'DDA0DD', 'FFB347', '87CEEB', 'F0E68C', 'FFB6C1'
    ];
    
    const hash = title.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
    }, 0);
    
    const colorIndex = Math.abs(hash) % colors.length;
    const color = colors[colorIndex];
    
    return `https://via.placeholder.com/400x600/${color}/FFFFFF?text=${encodeURIComponent(title.slice(0, 20))}`;
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas ${
            type === 'success' ? 'fa-check-circle' :
            type === 'error' ? 'fa-exclamation-circle' :
            type === 'warning' ? 'fa-exclamation-triangle' :
            'fa-info-circle'
        }"></i>
        <span>${message}</span>
    `;
    
    elements.toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100px)';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 4000);
}

// ===== NAVIGATION SYSTEM =====
function switchSection(section) {
    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.section === section) {
            link.classList.add('active');
        }
    });
    
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.add('hidden');
    });
    
    // Show hero section only for home
    const heroSection = document.querySelector('.hero-section');
    if (section === 'home') {
        heroSection.style.display = 'flex';
        document.getElementById('featured-section').classList.remove('hidden');
    } else {
        heroSection.style.display = 'none';
    }
    
    // Show specific section
    switch (section) {
        case 'home':
            currentSection = 'home';
            break;
        case 'search':
            switchToSearch();
            break;
        case 'trending':
            switchToTrending();
            break;
        case 'watchlist':
            switchToWatchlist();
            break;
        case 'hentai':
            switchToHentai();
            break;
    }
    
    currentSection = section;
}

function switchToSearch() {
    document.getElementById('search-results').classList.remove('hidden');
    elements.heroSearch?.focus();
}

function switchToTrending() {
    document.getElementById('trending-section').classList.remove('hidden');
    loadTrendingAnime();
}

function switchToWatchlist() {
    document.getElementById('watchlist-section').classList.remove('hidden');
    displayWatchlist();
}

function switchToHentai() {
    document.getElementById('hentai-section').classList.remove('hidden');
    loadHentaiContent();
}

// ===== TRENDING FUNCTIONALITY =====
async function loadTrendingAnime() {
    const filter = document.getElementById('trending-filter')?.value || 'airing';
    showLoading('Loading trending anime...');
    
    // Reset global tracker when refreshing trending content
    resetGlobalTracker();
    
    try {
        let endpoint;
        switch (filter) {
            case 'airing':
                endpoint = `${CONFIG.JIKAN_API}/seasons/now?limit=${CONFIG.ITEMS_PER_PAGE}`;
                break;
            case 'upcoming':
                endpoint = `${CONFIG.JIKAN_API}/seasons/upcoming?limit=${CONFIG.ITEMS_PER_PAGE}`;
                break;
            case 'bypopularity':
                endpoint = `${CONFIG.JIKAN_API}/top/anime?filter=bypopularity&limit=${CONFIG.ITEMS_PER_PAGE}`;
                break;
            default:
                endpoint = `${CONFIG.JIKAN_API}/seasons/now?limit=${CONFIG.ITEMS_PER_PAGE}`;
        }
        
        const response = await fetch(endpoint);
        if (!response.ok) throw new Error('Failed to fetch trending anime');
        
        const data = await response.json();
        const trending = data.data.map(anime => ({
            id: anime.mal_id,
            title: anime.title,
            type: anime.type,
            year: anime.year || (anime.aired?.from ? new Date(anime.aired.from).getFullYear() : 'Unknown'),
            score: anime.score,
            synopsis: anime.synopsis,
            genres: anime.genres?.map(genre => genre.name) || [],
            image: anime.images?.jpg?.large_image_url || generateFallbackImage(anime.title),
            url: anime.url,
            mature: isMatureContent(anime),
            source: 'jikan'
        }));
        
        displayTrendingAnime(trending);
        
    } catch (error) {
        console.error('Failed to load trending anime:', error);
        showToast('Failed to load trending anime', 'error');
    } finally {
        hideLoading();
    }
}

function displayTrendingAnime(animeList) {
    const trendingGrid = document.getElementById('trending-grid');
    trendingGrid.innerHTML = '';
    
    // Apply global duplicate filtering
    const uniqueAnime = filterGlobalDuplicates(animeList, 'trending');
    
    uniqueAnime.forEach((anime, index) => {
        const card = createEnhancedAnimeCard(anime, index);
        trendingGrid.appendChild(card);
    });
}

// ===== WATCHLIST FUNCTIONALITY =====
function toggleWatchlist(anime) {
    const index = watchlist.findIndex(item => item.id === anime.id);
    
    if (index > -1) {
        // Remove from watchlist
        watchlist.splice(index, 1);
        showToast('Removed from watchlist', 'info');
    } else {
        // Add to watchlist
        watchlist.push(anime);
        showToast('Added to watchlist', 'success');
    }
    
    // Save to localStorage
    localStorage.setItem('animeverse_watchlist', JSON.stringify(watchlist));
    
    // Update UI
    updateWatchlistUI();
    
    // Refresh watchlist section if currently viewing
    if (currentSection === 'watchlist') {
        displayWatchlist();
    }
}

function displayWatchlist() {
    const watchlistGrid = document.getElementById('watchlist-grid');
    const watchlistEmpty = document.getElementById('watchlist-empty');
    const watchlistCount = document.querySelector('.watchlist-count');
    
    if (watchlist.length === 0) {
        watchlistEmpty.style.display = 'block';
        watchlistGrid.style.display = 'none';
    } else {
        watchlistEmpty.style.display = 'none';
        watchlistGrid.style.display = 'grid';
        
        watchlistGrid.innerHTML = '';
        watchlist.forEach((anime, index) => {
            const card = createEnhancedAnimeCard(anime, index);
            watchlistGrid.appendChild(card);
        });
    }
    
    if (watchlistCount) {
        watchlistCount.textContent = `${watchlist.length} items`;
    }
}

function clearWatchlist() {
    if (watchlist.length === 0) {
        showToast('Watchlist is already empty', 'info');
        return;
    }
    
    if (confirm('Are you sure you want to clear your entire watchlist?')) {
        watchlist = [];
        localStorage.setItem('animeverse_watchlist', JSON.stringify(watchlist));
        displayWatchlist();
        updateWatchlistUI();
        showToast('Watchlist cleared', 'success');
    }
}

function updateWatchlistUI() {
    // Update bookmark buttons
    document.querySelectorAll('.anime-card').forEach(card => {
        const animeData = JSON.parse(card.dataset.animeData);
        const bookmarkBtn = card.querySelector('.bookmark-btn');
        if (bookmarkBtn) {
            const isBookmarked = watchlist.some(item => item.id === animeData.id);
            bookmarkBtn.classList.toggle('bookmarked', isBookmarked);
            bookmarkBtn.innerHTML = `<i class="fas fa-bookmark"></i>`;
        }
    });
}

// ===== HENTAI/ADULT CONTENT FUNCTIONALITY =====
async function loadHentaiContent() {
    if (!ageVerified) {
        showToast('Age verification required for adult content', 'warning');
        return;
    }
    
    showLoading('Loading adult content...');
    
    // Reset global tracker when refreshing hentai content
    resetGlobalTracker();
    
    try {
        // Search for mature content using specific tags
        const matureQuery = 'ecchi OR hentai OR mature';
        const response = await fetch(
            `${CONFIG.JIKAN_API}/anime?q=${encodeURIComponent('ecchi')}&genres=9,12&limit=${CONFIG.ITEMS_PER_PAGE}&order_by=score&sort=desc`
        );
        
        if (!response.ok) throw new Error('Failed to fetch adult content');
        
        const data = await response.json();
        const matureAnime = data.data
            .filter(anime => isMatureContent(anime))
            .map(anime => ({
                id: anime.mal_id,
                title: anime.title,
                type: anime.type,
                year: anime.aired?.from ? new Date(anime.aired.from).getFullYear() : 'Unknown',
                score: anime.score,
                synopsis: anime.synopsis,
                genres: anime.genres?.map(genre => genre.name) || [],
                image: anime.images?.jpg?.large_image_url || generateFallbackImage(anime.title),
                url: anime.url,
                mature: true,
                source: 'jikan'
            }));
        
        displayHentaiContent(matureAnime);
        
    } catch (error) {
        console.error('Failed to load adult content:', error);
        showToast('Failed to load adult content', 'error');
    } finally {
        hideLoading();
    }
}

function displayHentaiContent(animeList) {
    const hentaiGrid = document.getElementById('hentai-grid');
    hentaiGrid.innerHTML = '';
    
    // Apply global duplicate filtering
    const uniqueAnime = filterGlobalDuplicates(animeList, 'hentai');
    
    uniqueAnime.forEach((anime, index) => {
        const card = createEnhancedAnimeCard(anime, index);
        hentaiGrid.appendChild(card);
    });
}

// ===== ENHANCED ANIME CARD CREATION =====
function createEnhancedAnimeCard(anime, index) {
    const card = document.createElement('div');
    card.className = 'anime-card';
    card.dataset.animeId = anime.id;
    card.dataset.animeData = JSON.stringify(anime);
    card.style.animationDelay = `${index * 0.1}s`;
    
    const genres = anime.genres.slice(0, 3).map(genre => 
        `<span class="genre-tag">${genre}</span>`
    ).join('');
    
    const matureIndicator = anime.mature ? 
        '<div class="mature-indicator">18+</div>' : '';
    
    const isBookmarked = watchlist.some(item => item.id === anime.id);
    
    card.innerHTML = `
        ${matureIndicator}
        <img src="${anime.image}" alt="${anime.title}" class="anime-poster" 
             onerror="this.src='${generateFallbackImage(anime.title)}'">
        <div class="anime-info">
            <h3 class="anime-title">${anime.title}</h3>
            <div class="anime-meta">
                <span class="anime-year">${anime.year}</span>
                <span class="anime-type">${anime.type}</span>
                ${anime.score !== 'N/A' ? `<div class="anime-rating"><i class="fas fa-star"></i>${anime.score}</div>` : ''}
            </div>
            <p class="anime-description">${anime.synopsis}</p>
            <div class="anime-genres">${genres}</div>
            <div class="card-actions">
                <button class="bookmark-btn ${isBookmarked ? 'bookmarked' : ''}" title="${isBookmarked ? 'Remove from' : 'Add to'} watchlist">
                    <i class="fas fa-bookmark"></i>
                </button>
                <button class="watch-btn" title="Find streaming sources">
                    <i class="fas fa-play"></i>
                </button>
            </div>
        </div>
    `;
    
    return card;
}
}

// ===== STREAMING LINKS FUNCTIONALITY =====
function openStreamingLinks(anime) {
    const streamingLinks = generateStreamingLinks(anime.title);
    
    // Create a simple modal with streaming links
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-container">
            <div class="modal-header">
                <i class="fas fa-tv" style="font-size: 2rem; color: var(--accent-color); margin-bottom: 1rem;"></i>
                <h3>Find "${anime.title}" on streaming platforms</h3>
            </div>
            <div class="modal-content">
                <p>Click on a platform to search for this anime:</p>
                <div class="streaming-links">
                    ${streamingLinks.map(link => `
                        <a href="${link.url}" target="_blank" class="streaming-link ${link.platform}">
                            <i class="${streamingPlatforms[link.platform]?.icon || 'fas fa-play'}"></i>
                            ${link.name}
                        </a>
                    `).join('')}
                </div>
                <p style="margin-top: 1rem; font-size: 0.9rem; opacity: 0.7;">
                    <i class="fas fa-info-circle"></i>
                    Links open official platform search pages. Availability may vary by region.
                </p>
            </div>
            <div class="modal-actions">
                <button class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                    <i class="fas fa-times"></i>
                    Close
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close modal when clicking outside
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

function generateStreamingLinks(animeTitle) {
    const encodedTitle = encodeURIComponent(animeTitle);
    const searchQuery = encodeURIComponent(`${animeTitle} anime`);
    
    return [
        // Premium Official Platforms
        {
            platform: 'crunchyroll',
            name: 'Crunchyroll',
            url: `https://www.crunchyroll.com/search?q=${encodedTitle}`,
            description: 'Premium anime streaming'
        },
        {
            platform: 'funimation',
            name: 'Funimation',
            url: `https://www.funimation.com/search/?q=${encodedTitle}`,
            description: 'Dubbed anime specialist'
        },
        {
            platform: 'netflix',
            name: 'Netflix',
            url: `https://www.netflix.com/search?q=${encodedTitle}`,
            description: 'Global streaming giant'
        },
        {
            platform: 'hulu',
            name: 'Hulu',
            url: `https://www.hulu.com/search?q=${encodedTitle}`,
            description: 'US streaming service'
        },
        
        // Free Platforms
        {
            platform: 'animixplay',
            name: 'AniMixPlay',
            url: `https://animixplay.to/?q=${encodedTitle}`,
            description: 'Free anime streaming'
        },
        {
            platform: 'gogoanime',
            name: 'GogoAnime',
            url: `https://gogoanime.pe//search.html?keyword=${encodedTitle}`,
            description: 'Extensive anime library'
        },
        {
            platform: 'nineanime',
            name: '9Anime',
            url: `https://9anime.pe/search?keyword=${encodedTitle}`,
            description: 'High quality streams'
        },
        {
            platform: 'animepahe',
            name: 'AnimePahe',
            url: `https://animepahe.ru/anime/${encodedTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`,
            description: 'Compressed anime files'
        },
        {
            platform: 'aniwatch',
            name: 'AniWatch',
            url: `https://aniwatch.to/search?keyword=${encodedTitle}`,
            description: 'Ad-free experience'
        },
        
        // Additional Options
        {
            platform: 'youtube',
            name: 'YouTube',
            url: `https://www.youtube.com/results?search_query=${searchQuery}`,
            description: 'Free content & trailers'
        },
        {
            platform: 'animedao',
            name: 'AnimeDao',
            url: `https://animedao.to/search/?search_text=${encodedTitle}`,
            description: 'Reliable anime source'
        },
        {
            platform: 'kissanime',
            name: 'KissAnime',
            url: `https://kissanime.ru/Search/Anime?keyword=${encodedTitle}`,
            description: 'Classic anime site'
        }
    ];
}

// ===== ENHANCED AGE VERIFICATION =====
function confirmAge() {
    const age = parseInt(elements.ageInput.value);
    
    if (isNaN(age) || age < 1 || age > 120) {
        showToast('Please enter a valid age between 1 and 120', 'warning');
        return;
    }
    
    if (age >= 18) {
        ageVerified = true;
        localStorage.setItem(CONFIG.AGE_VERIFICATION_KEY, 'true');
        elements.ageModal.classList.add('hidden');
        
        if (pendingMatureContent) {
            if (pendingMatureContent.section === 'hentai') {
                switchSection('hentai');
            } else {
                showAnimeDetails(pendingMatureContent);
            }
            pendingMatureContent = null;
        }
        
        showToast('Age verified successfully', 'success');
    } else {
        showToast('You must be 18 or older to view mature content', 'error');
        elements.ageModal.classList.add('hidden');
        pendingMatureContent = null;
    }
}

// ===== ENHANCED ANIME DETAILS WITH STREAMING =====
function showAnimeDetails(anime) {
    const genres = anime.genres.map(genre => `<span class="genre-tag">${genre}</span>`).join('');
    const themes = anime.themes?.map(theme => `<span class="genre-tag">${theme}</span>`).join('') || '';
    const studios = anime.studios?.join(', ') || 'Unknown';
    const status = anime.status || 'Unknown';
    const episodes = anime.episodes || 'Unknown';
    const streamingLinks = generateStreamingLinks(anime.title);
    
    elements.detailContent.innerHTML = `
        <div style="display: flex; gap: 2rem; margin-bottom: 2rem; flex-wrap: wrap;">
            <img src="${anime.image}" alt="${anime.title}" 
                 style="width: 300px; height: 400px; object-fit: cover; border-radius: 15px; flex-shrink: 0;"
                 onerror="this.src='${generateFallbackImage(anime.title)}'">
            <div style="flex: 1; min-width: 300px;">
                <h2 style="font-size: 2rem; margin-bottom: 1rem; color: var(--text-primary);">${anime.title}</h2>
                ${anime.englishTitle && anime.englishTitle !== anime.title ? 
                    `<h3 style="font-size: 1.2rem; margin-bottom: 0.5rem; color: var(--text-secondary);">${anime.englishTitle}</h3>` : ''}
                ${anime.japaneseTitle && anime.japaneseTitle !== anime.title ? 
                    `<p style="font-size: 1rem; margin-bottom: 1rem; color: var(--text-secondary);">${anime.japaneseTitle}</p>` : ''}
                
                <div style="display: flex; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap;">
                    <span class="anime-year">${anime.year}</span>
                    <span class="anime-type">${anime.type}</span>
                    <span class="anime-type">${episodes} episodes</span>
                    <span class="anime-type">${status}</span>
                    ${anime.score !== 'N/A' && anime.score ? `<div class="anime-rating"><i class="fas fa-star"></i> ${anime.score}</div>` : ''}
                </div>
                
                <div style="margin-bottom: 1rem;">
                    <strong style="color: var(--text-primary);">Studio:</strong> <span style="color: var(--text-secondary);">${studios}</span>
                </div>
                
                ${anime.rank ? `<div style="margin-bottom: 1rem;"><strong style="color: var(--text-primary);">Rank:</strong> <span style="color: var(--text-secondary);">#${anime.rank}</span></div>` : ''}
                
                <div style="margin-bottom: 1rem;">
                    <strong style="color: var(--text-primary);">Genres:</strong>
                    <div style="margin-top: 0.5rem;">${genres}</div>
                </div>
                
                ${themes ? `<div style="margin-bottom: 1rem;"><strong style="color: var(--text-primary);">Themes:</strong><div style="margin-top: 0.5rem;">${themes}</div></div>` : ''}
            </div>
        </div>
        
        <div>
            <h3 style="color: var(--text-primary); margin-bottom: 1rem;">Synopsis</h3>
            <p style="color: var(--text-secondary); line-height: 1.8;">${anime.synopsis}</p>
        </div>
        
        <div style="margin-top: 2rem;">
            <h3 style="color: var(--text-primary); margin-bottom: 1rem;">Watch on Streaming Platforms</h3>
            <div class="streaming-links">
                ${streamingLinks.map(link => `
                    <a href="${link.url}" target="_blank" class="streaming-link ${link.platform}">
                        <i class="${streamingPlatforms[link.platform]?.icon || 'fas fa-play'}"></i>
                        ${link.name}
                    </a>
                `).join('')}
            </div>
        </div>
        
        ${anime.trailer ? `
            <div style="margin-top: 2rem;">
                <h3 style="color: var(--text-primary); margin-bottom: 1rem;">Trailer</h3>
                <a href="${anime.trailer}" target="_blank" class="btn-primary" style="text-decoration: none; display: inline-flex;">
                    <i class="fas fa-play"></i> Watch Trailer
                </a>
            </div>
        ` : ''}
        
        <div style="margin-top: 2rem; text-align: center;">
            <a href="${anime.url}" target="_blank" class="btn-primary" style="text-decoration: none; display: inline-flex;">
                <i class="fas fa-external-link-alt"></i> View on ${anime.source === 'jikan' ? 'MyAnimeList' : 'Kitsu'}
            </a>
        </div>
    `;
    
    elements.detailModal.classList.remove('hidden');
}

function initializeAnimations() {
    // Initialize theme
    initializeTheme();
    
    // Initialize infinite scroll observer
    initializeInfiniteScroll();
    
    // Initialize typing animation
    const typingElement = document.querySelector('.typing-animation');
    if (typingElement) {
        const texts = ['Amazing Anime', 'Epic Adventures', 'Magical Stories', 'Incredible Journeys'];
        let textIndex = 0;
        let charIndex = 0;
        let isDeleting = false;
        
        function typeText() {
            const currentText = texts[textIndex];
            
            if (isDeleting) {
                typingElement.textContent = currentText.substring(0, charIndex - 1);
                charIndex--;
            } else {
                typingElement.textContent = currentText.substring(0, charIndex + 1);
                charIndex++;
            }
            
            let typeSpeed = isDeleting ? 50 : 100;
            
            if (!isDeleting && charIndex === currentText.length) {
                typeSpeed = 2000;
                isDeleting = true;
            } else if (isDeleting && charIndex === 0) {
                isDeleting = false;
                textIndex = (textIndex + 1) % texts.length;
                typeSpeed = 500;
            }
            
            setTimeout(typeText, typeSpeed);
        }
        
        typeText();
    }
}

// ===== CACHING SYSTEM =====
function getCacheKey(endpoint, params = {}) {
    const paramString = Object.keys(params).sort().map(key => `${key}=${params[key]}`).join('&');
    return `${endpoint}?${paramString}`;
}

function getCachedData(key) {
    const cached = apiCache.get(key);
    if (cached && Date.now() - cached.timestamp < CONFIG.CACHE_DURATION) {
        return cached.data;
    }
    apiCache.delete(key);
    return null;
}

function setCachedData(key, data) {
    apiCache.set(key, {
        data: data,
        timestamp: Date.now()
    });
}

// ===== THEME SYSTEM =====
function initializeTheme() {
    document.body.setAttribute('data-theme', currentTheme);
    
    // Add theme toggle button if it doesn't exist
    if (!document.getElementById('theme-toggle')) {
        const themeToggle = document.createElement('button');
        themeToggle.id = 'theme-toggle';
        themeToggle.className = 'theme-toggle-btn';
        themeToggle.innerHTML = `<i class="fas ${currentTheme === 'dark' ? 'fa-sun' : 'fa-moon'}"></i>`;
        themeToggle.title = `Switch to ${currentTheme === 'dark' ? 'light' : 'dark'} theme`;
        
        // Add to navigation or header
        const nav = document.querySelector('.nav-container') || document.querySelector('nav') || document.body;
        nav.appendChild(themeToggle);
        
        themeToggle.addEventListener('click', toggleTheme);
    }
}

function toggleTheme() {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', currentTheme);
    localStorage.setItem(CONFIG.THEME_KEY, currentTheme);
    
    const toggleBtn = document.getElementById('theme-toggle');
    if (toggleBtn) {
        toggleBtn.innerHTML = `<i class="fas ${currentTheme === 'dark' ? 'fa-sun' : 'fa-moon'}"></i>`;
        toggleBtn.title = `Switch to ${currentTheme === 'dark' ? 'light' : 'dark'} theme`;
    }
    
    showToast(`Switched to ${currentTheme} theme`, 'success');
}

// ===== USER PREFERENCES & PERSONALIZATION =====
function saveUserPreferences() {
    userPreferences.region = currentRegion;
    userPreferences.favoriteGenres = favoriteGenres;
    userPreferences.theme = currentTheme;
    localStorage.setItem(CONFIG.USER_PREFERENCES_KEY, JSON.stringify(userPreferences));
}

function updateFavoriteGenres(genres) {
    genres.forEach(genre => {
        if (!favoriteGenres.includes(genre) && favoriteGenres.length < 5) {
            favoriteGenres.push(genre);
        }
    });
    saveUserPreferences();
}

// ===== RECENTLY VIEWED TRACKING =====
function addToRecentlyViewed(anime) {
    // Remove if already exists
    recentlyViewed = recentlyViewed.filter(item => item.id !== anime.id);
    
    // Add to beginning
    recentlyViewed.unshift({
        id: anime.id,
        title: anime.title,
        image: anime.image,
        timestamp: Date.now()
    });
    
    // Keep only last 20 items
    recentlyViewed = recentlyViewed.slice(0, 20);
    
    // Update favorite genres based on viewed anime
    if (anime.genres) {
        updateFavoriteGenres(anime.genres);
    }
    
    localStorage.setItem(CONFIG.RECENT_VIEWED_KEY, JSON.stringify(recentlyViewed));
}

// ===== USER RATING SYSTEM =====
function rateAnime(animeId, rating) {
    userRatings[animeId] = {
        rating: rating,
        timestamp: Date.now()
    };
    localStorage.setItem(CONFIG.USER_RATINGS_KEY, JSON.stringify(userRatings));
    showToast(`Rated ${rating}/10 stars`, 'success');
}

function getUserRating(animeId) {
    return userRatings[animeId]?.rating || null;
}

// ===== RECOMMENDATION ENGINE =====
function getPersonalizedRecommendations() {
    const recommendations = [];
    
    // Base recommendations on favorite genres
    if (favoriteGenres.length > 0) {
        favoriteGenres.forEach(genre => {
            // This would ideally call an API with genre filtering
            // For now, we'll use a placeholder approach
            recommendations.push({ genre, weight: 1.0 });
        });
    }
    
    // Base recommendations on watchlist
    if (watchlist.length > 0) {
        watchlist.forEach(anime => {
            if (anime.genres) {
                anime.genres.forEach(genre => {
                    const existing = recommendations.find(r => r.genre === genre);
                    if (existing) {
                        existing.weight += 0.5;
                    } else {
                        recommendations.push({ genre, weight: 0.5 });
                    }
                });
            }
        });
    }
    
    return recommendations.sort((a, b) => b.weight - a.weight);
}

async function loadRecommendedAnime() {
    showLoading('Loading personalized recommendations...');
    
    try {
        const recommendations = getPersonalizedRecommendations();
        let recommendedAnime = [];
        
        if (recommendations.length > 0) {
            // Get anime based on top recommended genre
            const topGenre = recommendations[0].genre;
            const response = await fetch(`${CONFIG.JIKAN_API}/anime?genres=${getGenreId(topGenre)}&order_by=score&sort=desc&limit=${CONFIG.ITEMS_PER_PAGE}`);
            
            if (response.ok) {
                const data = await response.json();
                recommendedAnime = data.data.map(anime => ({
                    id: anime.mal_id,
                    title: anime.title,
                    type: anime.type,
                    year: anime.aired?.from ? new Date(anime.aired.from).getFullYear() : 'Unknown',
                    score: anime.score,
                    synopsis: anime.synopsis,
                    genres: anime.genres?.map(genre => genre.name) || [],
                    image: anime.images?.jpg?.large_image_url || generateFallbackImage(anime.title),
                    mature: isMatureContent(anime),
                    source: 'jikan'
                }));
            }
        }
        
        // Fallback to top anime if no personalized recommendations
        if (recommendedAnime.length === 0) {
            recommendedAnime = await getTopAnime();
        }
        
        return recommendedAnime;
        
    } catch (error) {
        console.error('Failed to load recommendations:', error);
        return await getTopAnime(); // Fallback
    } finally {
        hideLoading();
    }
}

function getGenreId(genreName) {
    const genreMap = {
        'Action': 1, 'Adventure': 2, 'Comedy': 4, 'Drama': 8,
        'Fantasy': 10, 'Horror': 14, 'Mystery': 7, 'Romance': 22,
        'Sci-Fi': 24, 'Slice of Life': 36, 'Sports': 30, 'Supernatural': 37,
        'Thriller': 41, 'Historical': 13, 'Military': 38, 'Psychological': 40,
        'School': 23, 'Shounen': 27, 'Shoujo': 25, 'Seinen': 42
    };
    return genreMap[genreName] || 1;
}

// ===== ADVANCED SEARCH FILTERS =====
function createAdvancedSearchModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'advanced-search-modal';
    modal.innerHTML = `
        <div class="modal-container">
            <div class="modal-header">
                <h3><i class="fas fa-search"></i> Advanced Search</h3>
                <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-content">
                <div class="search-filters">
                    <div class="filter-group">
                        <label>Genres:</label>
                        <div class="genre-checkboxes">
                            ${CONFIG.ANIME_GENRES.map(genre => `
                                <label class="checkbox-label">
                                    <input type="checkbox" value="${genre}" name="genres">
                                    <span>${genre}</span>
                                </label>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="filter-group">
                        <label>Year Range:</label>
                        <div class="year-range">
                            <input type="number" id="year-from" placeholder="From" min="1960" max="2024">
                            <span>to</span>
                            <input type="number" id="year-to" placeholder="To" min="1960" max="2024">
                        </div>
                    </div>
                    
                    <div class="filter-group">
                        <label>Type:</label>
                        <select id="type-filter">
                            <option value="">Any</option>
                            <option value="tv">TV Series</option>
                            <option value="movie">Movie</option>
                            <option value="ova">OVA</option>
                            <option value="special">Special</option>
                            <option value="ona">ONA</option>
                        </select>
                    </div>
                    
                    <div class="filter-group">
                        <label>Status:</label>
                        <select id="status-filter">
                            <option value="">Any</option>
                            <option value="airing">Currently Airing</option>
                            <option value="complete">Completed</option>
                            <option value="upcoming">Upcoming</option>
                        </select>
                    </div>
                    
                    <div class="filter-group">
                        <label>Minimum Score:</label>
                        <input type="range" id="min-score" min="0" max="10" step="0.1" value="0">
                        <span id="score-value">0.0</span>
                    </div>
                    
                    <div class="filter-group">
                        <label>Sort by:</label>
                        <select id="sort-filter">
                            <option value="score">Score</option>
                            <option value="popularity">Popularity</option>
                            <option value="title">Title</option>
                            <option value="start_date">Release Date</option>
                            <option value="episodes">Episode Count</option>
                        </select>
                    </div>
                </div>
            </div>
            <div class="modal-actions">
                <button class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                    Cancel
                </button>
                <button class="btn-primary" onclick="performAdvancedSearch()">
                    <i class="fas fa-search"></i> Search
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add score slider listener
    const scoreSlider = modal.querySelector('#min-score');
    const scoreValue = modal.querySelector('#score-value');
    scoreSlider.addEventListener('input', (e) => {
        scoreValue.textContent = parseFloat(e.target.value).toFixed(1);
    });
}

async function performAdvancedSearch() {
    const modal = document.getElementById('advanced-search-modal');
    
    // Collect filter values
    const selectedGenres = Array.from(modal.querySelectorAll('input[name="genres"]:checked')).map(cb => cb.value);
    const yearFrom = modal.querySelector('#year-from').value;
    const yearTo = modal.querySelector('#year-to').value;
    const type = modal.querySelector('#type-filter').value;
    const status = modal.querySelector('#status-filter').value;
    const minScore = parseFloat(modal.querySelector('#min-score').value);
    const sortBy = modal.querySelector('#sort-filter').value;
    
    modal.remove();
    
    showLoading('Searching with advanced filters...');
    
    try {
        let url = `${CONFIG.JIKAN_API}/anime?`;
        const params = [];
        
        if (selectedGenres.length > 0) {
            const genreIds = selectedGenres.map(genre => getGenreId(genre)).join(',');
            params.push(`genres=${genreIds}`);
        }
        
        if (type) params.push(`type=${type}`);
        if (status) params.push(`status=${status}`);
        if (minScore > 0) params.push(`min_score=${minScore}`);
        if (yearFrom) params.push(`start_date=${yearFrom}-01-01`);
        if (yearTo) params.push(`end_date=${yearTo}-12-31`);
        
        params.push(`order_by=${sortBy}`);
        params.push(`sort=desc`);
        params.push(`limit=${CONFIG.ITEMS_PER_PAGE}`);
        
        url += params.join('&');
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('Advanced search failed');
        
        const data = await response.json();
        const results = data.data.map(anime => ({
            id: anime.mal_id,
            title: anime.title,
            type: anime.type,
            year: anime.aired?.from ? new Date(anime.aired.from).getFullYear() : 'Unknown',
            score: anime.score,
            synopsis: anime.synopsis,
            genres: anime.genres?.map(genre => genre.name) || [],
            image: anime.images?.jpg?.large_image_url || generateFallbackImage(anime.title),
            mature: isMatureContent(anime),
            source: 'jikan'
        }));
        
        displaySearchResults(results, true);
        showSearchSection();
        
        if (results.length === 0) {
            showToast('No results found with the specified filters', 'warning');
        } else {
            showToast(`Found ${results.length} results with advanced filters`, 'success');
        }
        
    } catch (error) {
        console.error('Advanced search error:', error);
        showToast('Advanced search failed. Please try again.', 'error');
    } finally {
        hideLoading();
    }
}

// ===== INFINITE SCROLL =====
function initializeInfiniteScroll() {
    intersectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && isInfiniteScrollEnabled && hasMoreResults && !isLoading) {
                loadMoreResults();
            }
        });
    }, { threshold: 0.1 });
    
    // Observe load more container if it exists
    const loadMoreContainer = elements.loadMoreContainer;
    if (loadMoreContainer) {
        intersectionObserver.observe(loadMoreContainer);
    }
}

function enableInfiniteScroll() {
    isInfiniteScrollEnabled = true;
    showToast('Infinite scroll enabled', 'info');
}

function disableInfiniteScroll() {
    isInfiniteScrollEnabled = false;
    showToast('Infinite scroll disabled', 'info');
}

// ===== SOCIAL FEATURES =====
function shareAnime(anime) {
    const shareData = {
        title: `Check out ${anime.title}!`,
        text: `${anime.title} - ${anime.synopsis.substring(0, 100)}...`,
        url: window.location.href
    };
    
    if (navigator.share && navigator.canShare(shareData)) {
        navigator.share(shareData);
    } else {
        // Fallback: copy to clipboard
        const shareText = `${shareData.title}\n${shareData.text}\n${shareData.url}`;
        navigator.clipboard.writeText(shareText).then(() => {
            showToast('Share link copied to clipboard!', 'success');
        }).catch(() => {
            showToast('Failed to copy share link', 'error');
        });
    }
}

// ===== ENHANCED SEARCH WITH CACHING =====
async function searchAnimeWithCache(query, page = 1) {
    const cacheKey = getCacheKey('search', { query, page });
    const cachedData = getCachedData(cacheKey);
    
    if (cachedData) {
        return cachedData;
    }
    
    const results = await searchAnime(query, page);
    setCachedData(cacheKey, results);
    return results;
}

// ===== ENHANCED ANIME DETAILS WITH RATINGS & RECOMMENDATIONS =====
function showEnhancedAnimeDetails(anime) {
    // Add to recently viewed
    addToRecentlyViewed(anime);
    
    const genres = anime.genres.map(genre => `<span class="genre-tag">${genre}</span>`).join('');
    const themes = anime.themes?.map(theme => `<span class="genre-tag">${theme}</span>`).join('') || '';
    const studios = anime.studios?.join(', ') || 'Unknown';
    const status = anime.status || 'Unknown';
    const episodes = anime.episodes || 'Unknown';
    const streamingLinks = generateStreamingLinks(anime.title);
    const userRating = getUserRating(anime.id);
    
    elements.detailContent.innerHTML = `
        <div style="display: flex; gap: 2rem; margin-bottom: 2rem; flex-wrap: wrap;">
            <img src="${anime.image}" alt="${anime.title}" 
                 style="width: 300px; height: 400px; object-fit: cover; border-radius: 15px; flex-shrink: 0;"
                 onerror="this.src='${generateFallbackImage(anime.title)}'">
            <div style="flex: 1; min-width: 300px;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                    <h2 style="font-size: 2rem; margin: 0; color: var(--text-primary);">${anime.title}</h2>
                    <button class="btn-secondary" onclick="shareAnime(${JSON.stringify(anime).replace(/"/g, '&quot;')})" title="Share anime">
                        <i class="fas fa-share-alt"></i>
                    </button>
                </div>
                
                ${anime.englishTitle && anime.englishTitle !== anime.title ? 
                    `<h3 style="font-size: 1.2rem; margin-bottom: 0.5rem; color: var(--text-secondary);">${anime.englishTitle}</h3>` : ''}
                ${anime.japaneseTitle && anime.japaneseTitle !== anime.title ? 
                    `<p style="font-size: 1rem; margin-bottom: 1rem; color: var(--text-secondary);">${anime.japaneseTitle}</p>` : ''}
                
                <div style="display: flex; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap;">
                    <span class="anime-year">${anime.year}</span>
                    <span class="anime-type">${anime.type}</span>
                    <span class="anime-type">${episodes} episodes</span>
                    <span class="anime-type">${status}</span>
                    ${anime.score !== 'N/A' && anime.score ? `<div class="anime-rating"><i class="fas fa-star"></i> ${anime.score}</div>` : ''}
                </div>
                
                <!-- User Rating -->
                <div class="user-rating-section" style="margin-bottom: 1rem;">
                    <strong style="color: var(--text-primary);">Your Rating:</strong>
                    <div class="rating-stars" style="display: inline-flex; margin-left: 0.5rem;">
                        ${[1,2,3,4,5,6,7,8,9,10].map(rating => `
                            <button class="rating-star ${userRating >= rating ? 'active' : ''}" 
                                    onclick="rateAnime(${anime.id}, ${rating})" 
                                    title="Rate ${rating}/10">
                                <i class="fas fa-star"></i>
                            </button>
                        `).join('')}
                    </div>
                    ${userRating ? `<span style="margin-left: 0.5rem; color: var(--accent-color);">${userRating}/10</span>` : ''}
                </div>
                
                <div style="margin-bottom: 1rem;">
                    <strong style="color: var(--text-primary);">Studio:</strong> <span style="color: var(--text-secondary);">${studios}</span>
                </div>
                
                ${anime.rank ? `<div style="margin-bottom: 1rem;"><strong style="color: var(--text-primary);">Rank:</strong> <span style="color: var(--text-secondary);">#${anime.rank}</span></div>` : ''}
                
                <div style="margin-bottom: 1rem;">
                    <strong style="color: var(--text-primary);">Genres:</strong>
                    <div style="margin-top: 0.5rem;">${genres}</div>
                </div>
                
                ${themes ? `<div style="margin-bottom: 1rem;"><strong style="color: var(--text-primary);">Themes:</strong><div style="margin-top: 0.5rem;">${themes}</div></div>` : ''}
            </div>
        </div>
        
        <div>
            <h3 style="color: var(--text-primary); margin-bottom: 1rem;">Synopsis</h3>
            <p style="color: var(--text-secondary); line-height: 1.8;">${anime.synopsis}</p>
        </div>
        
        <div style="margin-top: 2rem;">
            <h3 style="color: var(--text-primary); margin-bottom: 1rem;">Watch on Streaming Platforms</h3>
            <div class="streaming-links">
                ${streamingLinks.map(link => `
                    <a href="${link.url}" target="_blank" class="streaming-link ${link.platform}">
                        <i class="${streamingPlatforms[link.platform]?.icon || 'fas fa-play'}"></i>
                        ${link.name}
                    </a>
                `).join('')}
            </div>
        </div>
        
        ${anime.trailer ? `
            <div style="margin-top: 2rem;">
                <h3 style="color: var(--text-primary); margin-bottom: 1rem;">Trailer</h3>
                <a href="${anime.trailer}" target="_blank" class="btn-primary" style="text-decoration: none; display: inline-flex;">
                    <i class="fas fa-play"></i> Watch Trailer
                </a>
            </div>
        ` : ''}
        
        <div style="margin-top: 2rem; text-align: center;">
            <a href="${anime.url}" target="_blank" class="btn-primary" style="text-decoration: none; display: inline-flex;">
                <i class="fas fa-external-link-alt"></i> View on ${anime.source === 'jikan' ? 'MyAnimeList' : 'Kitsu'}
            </a>
        </div>
    `;
    
    elements.detailModal.classList.remove('hidden');
}
