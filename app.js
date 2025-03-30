document.addEventListener('DOMContentLoaded', function() {
    const playButton = document.getElementById('play-btn');
    const prevButton = document.getElementById('prev-btn');
    const nextButton = document.getElementById('next-btn');
    const progressBar = document.getElementById('progress');
    const volumeControl = document.getElementById('volume');
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    const nowPlayingTitle = document.getElementById('now-playing-title');
    const nowPlayingArtist = document.getElementById('now-playing-artist');
    const nowPlayingCover = document.getElementById('now-playing-cover');
    const spotifyRedirect = document.getElementById('spotify-redirect');
    const loadingIndicator = document.getElementById('loading');

    const apiConfig = {
        headers: {
            'x-rapidapi-key': '77949e5b31mshb521e7aa50867cdp11f731jsne9bfdb0629c9',
            'x-rapidapi-host': 'spotify23.p.rapidapi.com'
        }
    };

    const apiEndpoints = {
        search: 'https://spotify23.p.rapidapi.com/search/?type=multi&offset=0&limit=10&numberOfTopResults=5',
        trackDetails: 'https://spotify23.p.rapidapi.com/tracks/',
        artistDetails: 'https://spotify23.p.rapidapi.com/artist_overview/'
    };

    let currentState = {
        currentTrack: null,
        isPlaying: false,
        currentTab: 'songs',
        searchResults: null,
        currentTime: 0,
        volume: 80,
        audio: new Audio() 
    };

    function setLoading(loading) {
        loadingIndicator.style.display = loading ? 'flex' : 'none';
    }

    async function fetchAPI(endpoint, params = {}) {
        try {
            const url = new URL(endpoint);
            Object.entries(params).forEach(([key, value]) => {
                url.searchParams.append(key, value);
            });
            
            const response = await fetch(url, {
                method: 'GET',
                headers: apiConfig.headers
            });
            
            if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
            return await response.json();
        } catch (error) {
            console.error(`Error en ${endpoint}:`, error);
            throw error;
        }
    }

    async function fetchTrackDetails(trackId) {
        try {
            const response = await fetch(`https://spotify23.p.rapidapi.com/tracks/?ids=${trackId}`, { // Usar endpoint de RapidAPI
                headers: {
                    'x-rapidapi-key': '77949e5b31mshb521e7aa50867cdp11f731jsne9bfdb0629c9',
                    'x-rapidapi-host': 'spotify23.p.rapidapi.com'
                }
            });
            
            if (!response.ok) throw new Error(`Error ${response.status}`);
            const data = await response.json();
            return data.tracks[0]; // Estructura de respuesta de RapidAPI
        } catch (error) {
            console.error('Error fetching track:', error);
            throw error;
        }
    }

    

    async function searchSpotify(query) {
        try {
            setLoading(true);
            const searchResults = await fetchAPI(apiEndpoints.search, { 
                q: query,
                type: 'track,album,artist',
                limit: 10
            });
            
            const normalizedResults = {
                tracks: { items: [] },
                albums: { items: [] },
                artists: { items: [] }
            };
    
            if (searchResults.tracks?.items) {
                normalizedResults.tracks.items = searchResults.tracks.items
                    .filter(item => item.data && (item.data.name || item.data.title))
                    .map(item => {
                        const trackData = item.data;
                        return {
                            data: {
                                ...trackData,
                                name: trackData.name || trackData.title,
                                artists: trackData.artists || trackData.artistList || [],
                                album: trackData.album || trackData.albumOfTrack || {}
                            }
                        };
                    });
            }
    
            if (searchResults.albums?.items) {
                normalizedResults.albums.items = searchResults.albums.items
                    .filter(item => item.data && item.data.name)
                    .map(item => ({
                        data: {
                            ...item.data,
                            artists: item.data.artists || []
                        }
                    }));
            }
    
            if (searchResults.artists?.items) {
                normalizedResults.artists.items = searchResults.artists.items
                    .filter(item => item.data && (item.data.profile?.name || item.data.name))
                    .map(item => ({
                        data: {
                            ...item.data,
                            name: item.data.profile?.name || item.data.name
                        }
                    }));
            }
    
            currentState.searchResults = normalizedResults;
            return normalizedResults;
        } catch (error) {
            console.error('Error en la búsqueda:', error);
            throw new Error('No se pudo completar la búsqueda. Verifica tu conexión o intenta con otros términos.');
        } finally {
            setLoading(false);
        }
    }

    async function playTrack(track) {
        try {
            const trackId = track.id || track.data?.id || track.uri?.split(':')[2];
            if (!trackId) throw new Error('ID de track no disponible');

            const detailedTrack = await fetchTrackDetails(trackId);
            
            nowPlayingTitle.textContent = detailedTrack.name;
            nowPlayingArtist.textContent = detailedTrack.artists 
                ? detailedTrack.artists.map(a => a.name).join(', ') 
                : 'Artista desconocido';
            nowPlayingCover.src = detailedTrack.album?.images?.[0]?.url || 'img/default-song.png';

            currentState.audio.src = detailedTrack.preview_url;
            currentState.audio.volume = currentState.volume / 100;

            currentState.audio.ontimeupdate = () => {
                const progress = (currentState.audio.currentTime / currentState.audio.duration) * 100;
                progressBar.value = progress;
                document.getElementById('current-time').textContent = 
                    formatTime(currentState.audio.currentTime);
            };

        currentState.audio.ontimeupdate = () => {
            const progress = (currentState.audio.currentTime / currentState.audio.duration) * 100;
            progressBar.value = progress;
            document.getElementById('current-time').textContent = 
                formatTime(currentState.audio.currentTime);
        };

            await currentState.audio.play();
            playButton.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';

        } catch (error) {
            console.error("❌ Error al reproducir:", error);
            nowPlayingArtist.textContent = 'Error al cargar el artista';
        }
    }

    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        seconds = Math.floor(seconds % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }


    function showErrorMessage(element, message) {
        const errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        errorElement.innerHTML = `
            <svg viewBox="0 0 24 24" width="24" height="24">
                <path fill="currentColor" d="M11 15h2v2h-2zm0-8h2v6h-2zm.99-5C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/>
            </svg>
            <span>${message}</span>
        `;
        element.appendChild(errorElement);
    }

    function updateUI(results) {
        tabContents.forEach(tab => {
            tab.innerHTML = '';
            
            if (!results) {
                showErrorMessage(tab, 'No se encontraron resultados');
                return;
            }
        });

        const songsTab = document.getElementById('songs');
        if (results.tracks?.items?.length > 0) {
            results.tracks.items.forEach(item => {
                const card = createTrackCard(item.data);
                songsTab.appendChild(card);
            });
        } else {
            showErrorMessage(songsTab, 'No se encontraron canciones');
        }

        const albumsTab = document.getElementById('albums');
        if (results.albums?.items?.length > 0) {
            results.albums.items.forEach(item => {
                const card = createAlbumCard(item.data);
                albumsTab.appendChild(card);
            });
        } else {
            showErrorMessage(albumsTab, 'No se encontraron álbumes');
        }

        const artistsTab = document.getElementById('artists');
        if (results.artists?.items?.length > 0) {
            results.artists.items.forEach(item => {
                const card = createArtistCard(item.data);
                artistsTab.appendChild(card);
            });
        } else {
            showErrorMessage(artistsTab, 'No se encontraron artistas');
        }
    }

    function createTrackCard(track) {
        const card = document.createElement('div');
        card.className = 'card';
        
        const trackData = track.data || track;
        const imageUrl = trackData.album?.images?.[0]?.url || 
                        trackData.albumOfTrack?.coverArt?.sources?.[0]?.url || 
                        'img/default-song.png';
        
        let artistNames = 'Artista desconocido';
        if (trackData.artists) {
            if (Array.isArray(trackData.artists)) {
                artistNames = trackData.artists.map(artist => {
                    return artist.profile?.name || artist.name || 'Artista desconocido';
                }).join(', ');
            } else if (trackData.artists.items) {
                artistNames = trackData.artists.items.map(item => {
                    return item.profile?.name || 'Artista desconocido';
                }).join(', ');
            }
        }
        
        card.innerHTML = `
            <div class="card-image-container">
                <img src="${imageUrl}" alt="${trackData.name}">
                <div class="play-overlay">▶</div>
            </div>
            <h3>${trackData.name || 'Canción sin nombre'}</h3>
            <p class="artist-names">${artistNames}</p>
            <p class="album">${trackData.album?.name || 'Álbum desconocido'}</p>
            ${trackData.uri ? `
            <a href="https://open.spotify.com/track/${trackData.uri.split(':')[2]}" 
               class="spotify-link" 
               target="_blank">
                <svg viewBox="0 0 24 24" width="16" height="16">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.56 18.72 12.84c.36.179.54.659.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.601-1.559.3z"/>
                </svg>
                Escuchar en Spotify
            </a>` : ''}
        `;
        
        card.addEventListener('click', () => playTrack(trackData));
        return card;
    }

    function createAlbumCard(album) {
        const card = document.createElement('div');
        card.className = 'card';
        
        const imageUrl = album.coverArt?.sources?.[0]?.url || 
                        album.images?.[0]?.url || 
                        'img/default-song.png';
        
        const artistNames = album.artists?.items?.map(a => a.profile?.name).filter(Boolean).join(', ') || 
                          album.artists?.map(a => a.name).filter(Boolean).join(', ') || 
                          'Artista desconocido';
        
        card.innerHTML = `
            <div class="card-image-container">
                <img src="${imageUrl}" alt="${album.name}">
                <div class="play-overlay">▶</div>
            </div>
            <h3>${album.name}</h3>
            <p>${artistNames}</p>
            <p class="album">Álbum • ${album.date?.year || 'Año desconocido'}</p>
            ${album.uri ? `<a href="https://open.spotify.com/album/${album.uri.split(':')[2]}" class="spotify-link" target="_blank">
                <svg viewBox="0 0 24 24" width="16" height="16">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.56 18.72 12.84c.36.179.54.659.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.601-1.559.3z"/>
                </svg>
                Ver en Spotify
            </a>` : ''}
        `;
        
        return card;
    }

    function createArtistCard(artist) {
        const card = document.createElement('div');
        card.className = 'card';
        
        const imageUrl = artist.visuals?.avatarImage?.sources?.[0]?.url || 
                        artist.images?.[0]?.url || 
                        'img/default-song.png';
        
        card.innerHTML = `
            <div class="card-image-container">
                <img src="${imageUrl}" alt="${artist.profile?.name || 'Artista'}">
                <div class="play-overlay">▶</div>
            </div>
            <h3>${artist.profile?.name || 'Artista'}</h3>
            <p>Artista</p>
            ${artist.uri ? `<a href="https://open.spotify.com/artist/${artist.uri.split(':')[2]}" class="spotify-link" target="_blank">
                <svg viewBox="0 0 24 24" width="16" height="16">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.56 18.72 12.84c.36.179.54.659.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.601-1.559.3z"/>
                </svg>
                Ver en Spotify
            </a>` : ''}
        `;
        
        return card;
    }

    function handleSearch() {
        const query = searchInput.value.trim();
        if (!query) return;
        
        searchSpotify(query)
            .then(updateUI)
            .catch(error => {
                console.error('Búsqueda fallida:', error);
                const errorMessage = document.createElement('p');
                errorMessage.className = 'error';
                errorMessage.textContent = 'Error al realizar la búsqueda. Intenta nuevamente.';
                
                tabContents.forEach(tab => {
                    tab.innerHTML = '';
                    tab.appendChild(errorMessage.cloneNode(true));
                });
            });
    }


function getRandomRecommendation() {
    const genres = [
        'pop', 'rock', 'hiphop', 'electronic', 'jazz', 
        'reggaeton', 'indie', 'metal', 'classical', 'kpop'
    ];
    
    const years = [
        '2020-2023', 
        '2010-2019', 
        '2000-2009',
        '1990-1999'  
    ];
    
    const randomGenre = genres[Math.floor(Math.random() * genres.length)];
    const randomYear = years[Math.floor(Math.random() * years.length)];
    
    return `genre:${randomGenre} year:${randomYear}`;
}

function loadInitialData() {
    const randomQuery = getRandomRecommendation();
    
    searchInput.placeholder = `Buscando: ${randomQuery.split(':')[1].split(' ')[0]}...`;
    
    searchSpotify(randomQuery)
        .then(updateUI)
        .catch(error => {
            console.error('Error cargando recomendaciones:', error);
            searchSpotify('top global')
                .then(updateUI)
                .catch(fallbackError => {
                    console.error('Error en respaldo:', fallbackError);
                    document.getElementById('songs').innerHTML = 
                        '<p class="error">No se pudieron cargar recomendaciones</p>';
                });
        });
}

    searchButton.addEventListener('click', handleSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            currentState.currentTab = button.dataset.tab;
            
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(tab => tab.classList.remove('active'));
            
            button.classList.add('active');
            document.getElementById(button.dataset.tab).classList.add('active');
        });
    });

playButton.addEventListener('click', () => {
    if (!currentState.currentTrack?.preview_url) {
        showErrorMessage(document.getElementById('songs'), 'Esta canción no tiene vista previa disponible');
        return;
    }
    
    if (currentState.audio.paused) {
        currentState.audio.play()
            .then(() => {
                playButton.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
            })
            .catch(error => {
                console.error('Error al reproducir:', error);
                playButton.innerHTML = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
            });
    } else {
        currentState.audio.pause();
        playButton.innerHTML = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
    }
});

async function playTrack(track) {
    try {
        const trackId = track.id || track.data?.id || track.uri?.split(':')[2];
        if (!trackId) throw new Error('ID de track no disponible');

        const detailedTrack = await fetchTrackDetails(trackId);
        
        currentState.currentTrack = detailedTrack;
        
        if (!detailedTrack.preview_url) {
            throw new Error('No hay vista previa disponible');
        }

        nowPlayingTitle.textContent = detailedTrack.name;
        nowPlayingArtist.textContent = detailedTrack.artists?.map(a => a.name).join(', ') || 'Artista desconocido';
        nowPlayingCover.src = detailedTrack.album?.images?.[0]?.url || 'img/default-song.png';

        currentState.audio.pause();
        currentState.audio = new Audio(detailedTrack.preview_url);
        currentState.audio.volume = currentState.volume / 100;

        currentState.audio.ontimeupdate = () => {
            if (currentState.audio.duration) {
                const progress = (currentState.audio.currentTime / currentState.audio.duration) * 100;
                progressBar.value = progress;
                document.getElementById('current-time').textContent = 
                    formatTime(currentState.audio.currentTime);
            }
        };

        await currentState.audio.play();
        playButton.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';

    } catch (error) {
        console.error("❌ Error al reproducir:", error);
        playButton.innerHTML = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
        showErrorMessage(document.getElementById('songs'), error.message.includes('preview') 
            ? 'Vista previa no disponible' 
            : 'Error al cargar la canción');
    }
}

    volumeControl.addEventListener('input', (e) => {
        currentState.volume = e.target.value;
        currentState.audio.volume = currentState.volume / 100;
    });

    progressBar.addEventListener('input', (e) => {
        currentState.currentTime = e.target.value;
        if (currentState.audio.duration) {
            currentState.audio.currentTime = (currentState.currentTime / 100) * currentState.audio.duration;
        }
    });

    currentState.audio.addEventListener('timeupdate', () => {
        if (currentState.audio.duration) {
            progressBar.value = (currentState.audio.currentTime / currentState.audio.duration) * 100;
        }
    });

    function loadInitialData() {
        searchSpotify('Jose jose')
            .then(updateUI)
            .catch(error => console.error('Error cargando datos iniciales:', error));
    }

    // loadInitialData();
});
