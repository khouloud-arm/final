// Configuration
const API_KEY = 'YOUR_TMDB_API_KEY'; // À remplacer par votre clé API TMDB
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

// État de l'application
const state = {
    currentPage: 1,
    totalPages: 1,
    currentView: 'discover',
    currentFilter: 'trending',
    searchQuery: '',
    currentGenre: '',
    currentYear: '',
    movies: [],
    favorites: JSON.parse(localStorage.getItem('cineExplora_favorites')) || [],
    watchlist: JSON.parse(localStorage.getItem('cineExplora_watchlist')) || [],
    collections: JSON.parse(localStorage.getItem('cineExplora_collections')) || [],
    genres: [],
    stats: {
        moviesDiscovered: parseInt(localStorage.getItem('cineExplora_moviesDiscovered')) || 0,
        favoritesCount: parseInt(localStorage.getItem('cineExplora_favoritesCount')) || 0
    }
};

// Éléments DOM
const elements = {
    // Navigation
    navLinks: document.querySelectorAll('.nav-link'),
    viewButtons: document.querySelectorAll('.view-btn'),
    
    // Contenu
    views: document.querySelectorAll('.view'),
    moviesGrid: document.getElementById('moviesGrid'),
    
    // Recherche et Filtres
    searchInput: document.getElementById('searchInput'),
    clearSearch: document.getElementById('clearSearch'),
    genreFilter: document.getElementById('genreFilter'),
    yearFilter: document.getElementById('yearFilter'),
    
    // Actions
    themeToggle: document.getElementById('themeToggle'),
    cinemaMode: document.getElementById('cinemaMode'),
    
    // Modals
    movieModal: document.getElementById('movieModal'),
    closeModal: document.getElementById('closeModal'),
    modalBody: document.getElementById('modalBody'),
    collectionModal: document.getElementById('collectionModal'),
    closeCollectionModal: document.getElementById('closeCollectionModal'),
    collectionForm: document.getElementById('collectionForm'),
    cancelCollection: document.getElementById('cancelCollection'),
    
    // Pagination
    pagination: document.getElementById('pagination'),
    prevPage: document.getElementById('prevPage'),
    nextPage: document.getElementById('nextPage'),
    pageInfo: document.getElementById('pageInfo'),
    
    // Statistiques
    moviesCount: document.getElementById('moviesCount'),
    favoritesCount: document.getElementById('favoritesCount'),
    
    // Collections
    collectionsContainer: document.querySelector('.collections-container'),
    createCollection: document.querySelector('.create-collection'),
    
    // Watchlist
    emptyWatchlist: document.getElementById('emptyWatchlist'),
    watchlistMovies: document.getElementById('watchlistMovies')
};

// Initialisation
document.addEventListener('DOMContentLoaded', async () => {
    await initializeApp();
    setupEventListeners();
    updateStats();
});

// Initialisation de l'application
async function initializeApp() {
    await loadGenres();
    await loadYears();
    await loadMovies();
    loadCollections();
    loadWatchlist();
    checkSavedTheme();
}

// Configuration des écouteurs d'événements
function setupEventListeners() {
    // Navigation
    elements.navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            switchView(link.dataset.view);
            elements.navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        });
    });

    // Filtres de vue
    elements.viewButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            elements.viewButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.currentFilter = btn.dataset.filter;
            state.currentPage = 1;
            loadMovies();
        });
    });

    // Recherche
    elements.searchInput.addEventListener('input', debounce(handleSearch, 500));
    elements.clearSearch.addEventListener('click', clearSearch);

    // Filtres
    elements.genreFilter.addEventListener('change', handleFilterChange);
    elements.yearFilter.addEventListener('change', handleFilterChange);

    // Thème et Mode
    elements.themeToggle.addEventListener('click', toggleTheme);
    elements.cinemaMode.addEventListener('click', toggleCinemaMode);

    // Pagination
    elements.prevPage.addEventListener('click', goToPreviousPage);
    elements.nextPage.addEventListener('click', goToNextPage);

    // Modals
    elements.closeModal.addEventListener('click', closeMovieModal);
    elements.movieModal.addEventListener('click', (e) => {
        if (e.target === elements.movieModal) closeMovieModal();
    });

    elements.closeCollectionModal.addEventListener('click', closeCollectionModal);
    elements.cancelCollection.addEventListener('click', closeCollectionModal);
    elements.collectionForm.addEventListener('submit', handleCollectionSubmit);

    // Collections
    elements.createCollection.addEventListener('click', openCollectionModal);

    // Touche Échap
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeMovieModal();
            closeCollectionModal();
        }
    });
}

// Chargement des données
async function loadGenres() {
    try {
        const response = await fetch(`${BASE_URL}/genre/movie/list?api_key=${API_KEY}&language=fr-FR`);
        const data = await response.json();
        state.genres = data.genres;
        
        state.genres.forEach(genre => {
            const option = document.createElement('option');
            option.value = genre.id;
            option.textContent = genre.name;
            elements.genreFilter.appendChild(option);
        });
    } catch (error) {
        console.error('Erreur lors du chargement des genres:', error);
    }
}

async function loadYears() {
    const currentYear = new Date().getFullYear();
    for (let year = currentYear; year >= 1950; year--) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        elements.yearFilter.appendChild(option);
    }
}

async function loadMovies() {
    showLoading();
    
    try {
        let url;
        
        if (state.currentView === 'discover') {
            if (state.currentFilter === 'trending') {
                url = `${BASE_URL}/trending/movie/week?api_key=${API_KEY}&language=fr-FR&page=${state.currentPage}`;
            } else if (state.currentFilter === 'new') {
                const currentYear = new Date().getFullYear();
                url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&language=fr-FR&sort_by=release_date.desc&page=${state.currentPage}&year=${currentYear}`;
            } else if (state.currentFilter === 'classic') {
                url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&language=fr-FR&sort_by=vote_average.desc&vote_count.gte=1000&page=${state.currentPage}&primary_release_date.lte=1990-12-31`;
            }
        } else if (state.searchQuery) {
            url = `${BASE_URL}/search/movie?api_key=${API_KEY}&language=fr-FR&query=${encodeURIComponent(state.searchQuery)}&page=${state.currentPage}`;
        }

        // Appliquer les filtres de genre et d'année
        if (state.currentGenre) {
            url += `&with_genres=${state.currentGenre}`;
        }
        if (state.currentYear) {
            url += `&year=${state.currentYear}`;
        }

        const response = await fetch(url);
        const data = await response.json();
        
        state.movies = data.results || [];
        state.totalPages = Math.min(data.total_pages || 1, 500);
        
        displayMovies();
        updatePagination();
        
        // Mettre à jour les statistiques
        updateDiscoveryStats(state.movies.length);
        
    } catch (error) {
        console.error('Erreur lors du chargement des films:', error);
        displayError('Erreur lors du chargement des films. Veuillez réessayer.');
    } finally {
        hideLoading();
    }
}

// Affichage des films
function displayMovies() {
    elements.moviesGrid.innerHTML = '';
    
    if (state.movies.length === 0) {
        elements.moviesGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-film"></i>
                <h4>Aucun film trouvé</h4>
                <p>Essayez de modifier vos critères de recherche</p>
            </div>
        `;
        return;
    }
    
    state.movies.forEach(movie => {
        const movieCard = createMovieCard(movie);
        elements.moviesGrid.appendChild(movieCard);
    });
}

function createMovieCard(movie) {
    const card = document.createElement('div');
    card.className = 'movie-card';
    
    const isFavorite = state.favorites.some(fav => fav.id === movie.id);
    const inWatchlist = state.watchlist.some(item => item.id === movie.id);
    
    card.innerHTML = `
        <img src="${getImageUrl(movie.poster_path)}" 
             alt="${movie.title}" 
             class="movie-poster"
             onerror="this.src='https://via.placeholder.com/300x450/f0e8f8/e8a0b8?text=Image+Non+Disponible'">
        
        <div class="movie-overlay"></div>
        
        <div class="movie-actions">
            <button class="action-icon favorite-btn ${isFavorite ? 'active' : ''}" 
                    data-movie-id="${movie.id}"
                    title="${isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}">
                <i class="fas fa-heart"></i>
            </button>
            <button class="action-icon watchlist-btn ${inWatchlist ? 'active' : ''}" 
                    data-movie-id="${movie.id}"
                    title="${inWatchlist ? 'Retirer de la liste' : 'Ajouter à la liste'}">
                <i class="fas fa-bookmark"></i>
            </button>
            <button class="action-icon collection-btn" 
                    data-movie-id="${movie.id}"
                    title="Ajouter à une collection">
                <i class="fas fa-layer-group"></i>
            </button>
        </div>
        
        <div class="movie-info">
            <h3 class="movie-title">${movie.title}</h3>
            <div class="movie-meta">
                <span class="movie-year">${movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A'}</span>
                <span class="movie-rating">
                    <i class="fas fa-star"></i>
                    ${movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'}
                </span>
            </div>
            <p class="movie-overview">${movie.overview || 'Aucune description disponible.'}</p>
        </div>
    `;
    
    // Événements
    card.addEventListener('click', (e) => {
        if (!e.target.closest('.movie-actions')) {
            openMovieModal(movie.id);
        }
    });
    
    const favoriteBtn = card.querySelector('.favorite-btn');
    favoriteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFavorite(movie);
    });
    
    const watchlistBtn = card.querySelector('.watchlist-btn');
    watchlistBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleWatchlist(movie);
    });
    
    const collectionBtn = card.querySelector('.collection-btn');
    collectionBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Ouvrir le modal de sélection de collection
        showNotification('Fonctionnalité collections à venir');
    });
    
    return card;
}

// Gestion des favoris
function toggleFavorite(movie) {
    const index = state.favorites.findIndex(fav => fav.id === movie.id);
    
    if (index === -1) {
        state.favorites.push(movie);
        showNotification(`"${movie.title}" ajouté aux favoris 💖`, 'success');
    } else {
        state.favorites.splice(index, 1);
        showNotification(`"${movie.title}" retiré des favoris`, 'info');
    }
    
    saveToLocalStorage('favorites', state.favorites);
    updateStats();
    
    // Mettre à jour l'interface
    const favoriteBtn = document.querySelector(`.favorite-btn[data-movie-id="${movie.id}"]`);
    if (favoriteBtn) {
        favoriteBtn.classList.toggle('active');
        favoriteBtn.title = favoriteBtn.classList.contains('active') ? 
            'Retirer des favoris' : 'Ajouter aux favoris';
    }
}

// Gestion de la watchlist
function toggleWatchlist(movie) {
    const index = state.watchlist.findIndex(item => item.id === movie.id);
    
    if (index === -1) {
        state.watchlist.push(movie);
        showNotification(`"${movie.title}" ajouté à votre liste 📚`, 'success');
    } else {
        state.watchlist.splice(index, 1);
        showNotification(`"${movie.title}" retiré de votre liste`, 'info');
    }
    
    saveToLocalStorage('watchlist', state.watchlist);
    
    // Mettre à jour l'interface
    const watchlistBtn = document.querySelector(`.watchlist-btn[data-movie-id="${movie.id}"]`);
    if (watchlistBtn) {
        watchlistBtn.classList.toggle('active');
        watchlistBtn.title = watchlistBtn.classList.contains('active') ? 
            'Retirer de la liste' : 'Ajouter à la liste';
    }
    
    if (state.currentView === 'watchlist') {
        loadWatchlist();
    }
}

// Gestion des collections
function loadCollections() {
    elements.collectionsContainer.innerHTML = '';
    
    // Ajouter la carte de création
    elements.collectionsContainer.appendChild(elements.createCollection);
    
    state.collections.forEach(collection => {
        const collectionCard = createCollectionCard(collection);
        elements.collectionsContainer.appendChild(collectionCard);
    });
}

function createCollectionCard(collection) {
    const card = document.createElement('div');
    card.className = 'collection-card';
    card.innerHTML = `
        <div class="collection-icon" style="background: ${collection.color || 'var(--accent-soft)'}">
            <i class="fas fa-heart"></i>
        </div>
        <h4>${collection.name}</h4>
        <p>${collection.movies.length} films</p>
        <div class="collection-description">${collection.description}</div>
    `;
    
    card.addEventListener('click', () => {
        // Ouvrir la vue de la collection
        showNotification(`Ouverture de la collection "${collection.name}"`);
    });
    
    return card;
}

function openCollectionModal() {
    elements.collectionModal.classList.add('active');
}

function closeCollectionModal() {
    elements.collectionModal.classList.remove('active');
    elements.collectionForm.reset();
}

function handleCollectionSubmit(e) {
    e.preventDefault();
    
    const name = document.getElementById('collectionName').value.trim();
    const description = document.getElementById('collectionDescription').value.trim();
    
    if (!name) {
        showNotification('Veuillez donner un nom à votre collection', 'error');
        return;
    }
    
    const newCollection = {
        id: Date.now(),
        name,
        description,
        color: getRandomCollectionColor(),
        movies: [],
        created: new Date().toISOString()
    };
    
    state.collections.push(newCollection);
    saveToLocalStorage('collections', state.collections);
    loadCollections();
    
    closeCollectionModal();
    showNotification(`Collection "${name}" créée avec succès 🎀`, 'success');
}

function getRandomCollectionColor() {
    const colors = [
        'var(--primary-pink)', 'var(--lavender)', 'var(--deep-pink)', 
        'var(--deep-lavender)', 'var(--gold)'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

// Watchlist
function loadWatchlist() {
    elements.watchlistMovies.innerHTML = '';
    
    if (state.watchlist.length === 0) {
        elements.emptyWatchlist.style.display = 'block';
        elements.watchlistMovies.style.display = 'none';
        return;
    }
    
    elements.emptyWatchlist.style.display = 'none';
    elements.watchlistMovies.style.display = 'grid';
    
    state.watchlist.forEach(movie => {
        const movieCard = createMovieCard(movie);
        elements.watchlistMovies.appendChild(movieCard);
    });
}

// Modal des films
async function openMovieModal(movieId) {
    try {
        const response = await fetch(`${BASE_URL}/movie/${movieId}?api_key=${API_KEY}&language=fr-FR&append_to_response=credits,similar`);
        const movie = await response.json();
        
        elements.modalBody.innerHTML = createModalContent(movie);
        elements.movieModal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
    } catch (error) {
        console.error('Erreur lors du chargement des détails du film:', error);
        showNotification('Erreur lors du chargement des détails du film', 'error');
    }
}

function createModalContent(movie) {
    const directors = movie.credits?.crew?.filter(person => person.job === 'Director') || [];
    const cast = movie.credits?.cast?.slice(0, 6) || [];
    const similarMovies = movie.similar?.results?.slice(0, 6) || [];
    
    return `
        <div class="modal-movie">
            <div class="modal-header">
                <img src="${getImageUrl(movie.poster_path, 'w400')}" 
                     alt="${movie.title}" 
                     class="modal-poster">
                <div class="modal-details">
                    <h2>${movie.title}</h2>
                    <div class="modal-meta">
                        <span class="modal-year">${movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A'}</span>
                        <span class="modal-runtime">${movie.runtime || 'N/A'} min</span>
                        <span class="modal-rating">
                            <i class="fas fa-star"></i>
                            ${movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'}
                        </span>
                    </div>
                    <div class="modal-genres">
                        ${movie.genres?.map(genre => `
                            <span class="genre-tag" style="background: var(--accent-soft); color: var(--accent);">
                                ${genre.name}
                            </span>
                        `).join('') || ''}
                    </div>
                    <p class="modal-overview">${movie.overview || 'Aucune description disponible.'}</p>
                    
                    <div class="modal-actions">
                        <button class="elegant-btn primary modal-favorite ${state.favorites.some(fav => fav.id === movie.id) ? 'active' : ''}" 
                                data-movie-id="${movie.id}">
                            <i class="fas fa-heart"></i>
                            ${state.favorites.some(fav => fav.id === movie.id) ? 'Retirer des Favoris' : 'Ajouter aux Favoris'}
                        </button>
                        <button class="elegant-btn secondary modal-watchlist ${state.watchlist.some(item => item.id === movie.id) ? 'active' : ''}" 
                                data-movie-id="${movie.id}">
                            <i class="fas fa-bookmark"></i>
                            ${state.watchlist.some(item => item.id === movie.id) ? 'Retirer de la Liste' : 'Ajouter à la Liste'}
                        </button>
                    </div>
                </div>
            </div>
            
            ${directors.length > 0 ? `
                <div class="modal-section">
                    <h3>Réalisateur${directors.length > 1 ? 's' : ''}</h3>
                    <p>${directors.map(director => director.name).join(', ')}</p>
                </div>
            ` : ''}
            
            ${cast.length > 0 ? `
                <div class="modal-section">
                    <h3>Distribution Principale</h3>
                    <div class="cast-grid">
                        ${cast.map(actor => `
                            <div class="cast-member">
                                <img src="${getImageUrl(actor.profile_path, 'w185')}" 
                                     alt="${actor.name}"
                                     class="cast-photo">
                                <div class="cast-info">
                                    <strong>${actor.name}</strong>
                                    <span>${actor.character}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            ${similarMovies.length > 0 ? `
                <div class="modal-section">
                    <h3>Films Similaires</h3>
                    <div class="similar-movies">
                        ${similarMovies.map(similar => `
                            <div class="similar-movie" data-movie-id="${similar.id}">
                                <img src="${getImageUrl(similar.poster_path, 'w154')}" 
                                     alt="${similar.title}">
                                <span>${similar.title}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

function closeMovieModal() {
    elements.movieModal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

// Navigation et vues
function switchView(view) {
    state.currentView = view;
    state.currentPage = 1;
    
    elements.views.forEach(v => v.classList.remove('active'));
    document.getElementById(`${view}View`).classList.add('active');
    
    // Masquer la pagination pour les vues qui n'en ont pas besoin
    elements.pagination.style.display = (view === 'discover') ? 'flex' : 'none';
    
    if (view === 'collections') {
        loadCollections();
    } else if (view === 'watchlist') {
        loadWatchlist();
    } else if (view === 'discover') {
        loadMovies();
    }
}

// Recherche et filtres
function handleSearch() {
    state.searchQuery = elements.searchInput.value.trim();
    state.currentPage = 1;
    
    if (state.searchQuery) {
        switchView('discover');
        loadMovies();
    } else {
        loadMovies();
    }
}

function clearSearch() {
    elements.searchInput.value = '';
    state.searchQuery = '';
    state.currentPage = 1;
    loadMovies();
}

function handleFilterChange() {
    state.currentGenre = elements.genreFilter.value;
    state.currentYear = elements.yearFilter.value;
    state.currentPage = 1;
    loadMovies();
}

// Pagination
function goToPreviousPage() {
    if (state.currentPage > 1) {
        state.currentPage--;
        loadMovies();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function goToNextPage() {
    if (state.currentPage < state.totalPages) {
        state.currentPage++;
        loadMovies();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function updatePagination() {
    elements.prevPage.disabled = state.currentPage === 1;
    elements.nextPage.disabled = state.currentPage === state.totalPages;
    elements.pageInfo.textContent = `Page ${state.currentPage} sur ${state.totalPages}`;
}

// Thème et mode
function toggleTheme() {
    document.body.classList.toggle('theme-dark');
    const isDark = document.body.classList.contains('theme-dark');
    localStorage.setItem('cineExplora_theme', isDark ? 'dark' : 'light');
    updateThemeIcon(isDark);
}

function updateThemeIcon(isDark) {
    const icon = elements.themeToggle.querySelector('i');
    icon.className = isDark ? 'fas fa-sun' : 'fas fa-palette';
}

function toggleCinemaMode() {
    document.body.classList.toggle('cinema-mode');
    const isCinemaMode = document.body.classList.contains('cinema-mode');
    const icon = elements.cinemaMode.querySelector('i');
    icon.className = isCinemaMode ? 'fas fa-times' : 'fas fa-theater-masks';
    
    showNotification(isCinemaMode ? 'Mode Cinéma Activé 🎭' : 'Mode Cinéma Désactivé');
}

function checkSavedTheme() {
    const savedTheme = localStorage.getItem('cineExplora_theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('theme-dark');
        updateThemeIcon(true);
    }
}

// Statistiques
function updateStats() {
    state.stats.favoritesCount = state.favorites.length;
    elements.moviesCount.textContent = state.stats.moviesDiscovered.toLocaleString();
    elements.favoritesCount.textContent = state.stats.favoritesCount.toLocaleString();
    
    // Sauvegarder les stats
    localStorage.setItem('cineExplora_moviesDiscovered', state.stats.moviesDiscovered);
    localStorage.setItem('cineExplora_favoritesCount', state.stats.favoritesCount);
}

function updateDiscoveryStats(newMoviesCount) {
    state.stats.moviesDiscovered += newMoviesCount;
    updateStats();
}

// Utilitaires
function getImageUrl(path, size = 'w500') {
    if (!path) return 'https://via.placeholder.com/300x450/f0e8f8/e8a0b8?text=Image+Non+Disponible';
    return `https://image.tmdb.org/t/p/${size}${path}`;
}

function showLoading() {
    // Afficher un indicateur de chargement élégant
    const loadingHTML = `
        <div class="empty-state">
            <div class="spinner"></div>
            <p>Chargement des films...</p>
        </div>
    `;
    elements.moviesGrid.innerHTML = loadingHTML;
}

function hideLoading() {
    // Le chargement est caché quand les films sont affichés
}

function displayError(message) {
    elements.moviesGrid.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-exclamation-triangle"></i>
            <h4>Oups !</h4>
            <p>${message}</p>
            <button onclick="loadMovies()" class="elegant-btn primary">Réessayer</button>
        </div>
    `;
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'exclamation' : 'info'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? 'var(--deep-pink)' : type === 'error' ? '#e74c3c' : 'var(--deep-lavender)'};
        color: white;
        padding: 15px 25px;
        border-radius: 15px;
        box-shadow: 0 8px 25px var(--shadow);
        z-index: 1001;
        transform: translateX(400px);
        transition: transform 0.4s ease;
        max-width: 400px;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    setTimeout(() => {
        notification.style.transform = 'translateX(400px)';
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 400);
    }, 4000);
}

function saveToLocalStorage(key, data) {
    localStorage.setItem(`cineExplora_${key}`, JSON.stringify(data));
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Styles CSS pour les notifications (à ajouter)
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    .notification-content {
        display: flex;
        align-items: center;
        gap: 10px;
        font-weight: 500;
    }
    
    .notification.success {
        background: linear-gradient(135deg, var(--deep-pink), var(--deep-lavender));
    }
    
    .spinner {
        border: 3px solid var(--accent-soft);
        border-left: 3px solid var(--accent);
        border-radius: 50%;
        width: 40px;
        height: 40px;
        animation: spin 1s linear infinite;
        margin: 0 auto 15px;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    
    .modal-section {
        margin: 30px 0;
    }
    
    .modal-section h3 {
        font-family: 'Playfair Display', serif;
        margin-bottom: 15px;
        color: var(--text-primary);
    }
    
    .cast-grid, .similar-movies {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: 15px;
    }
    
    .cast-member, .similar-movie {
        text-align: center;
    }
    
    .cast-photo {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        object-fit: cover;
        margin-bottom: 8px;
    }
    
    .cast-info {
        font-size: 0.8rem;
    }
    
    .cast-info strong {
        display: block;
        margin-bottom: 2px;
    }
    
    .similar-movie img {
        width: 100%;
        border-radius: 10px;
        margin-bottom: 8px;
    }
    
    .similar-movie span {
        font-size: 0.8rem;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }
    
    .genre-tag {
        display: inline-block;
        padding: 4px 12px;
        border-radius: 15px;
        font-size: 0.8rem;
        margin-right: 8px;
        margin-bottom: 8px;
    }
    
    .form-group {
        margin-bottom: 20px;
    }
    
    .form-group label {
        display: block;
        margin-bottom: 8px;
        font-weight: 500;
        color: var(--text-primary);
    }
    
    .form-group input, .form-group textarea {
        width: 100%;
        padding: 12px 16px;
        border: 2px solid var(--border);
        border-radius: 12px;
        background: var(--surface);
        color: var(--text-primary);
        font-family: 'Inter', sans-serif;
        transition: border-color 0.3s ease;
    }
    
    .form-group input:focus, .form-group textarea:focus {
        outline: none;
        border-color: var(--accent);
    }
    
    .form-actions {
        display: flex;
        gap: 15px;
        justify-content: flex-end;
        margin-top: 30px;
    }
`;
document.head.appendChild(notificationStyles);