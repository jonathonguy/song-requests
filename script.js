// Configuration - Replace with your Google Sheets ID
const SPREADSHEET_ID = '2PACX-1vQ126JfPStmt8yIbfRYTC4tf4hu6iT6vFMTUgAkN3u9IJI-PUQHym7DHPl1IH51biTtWquOrdCIMtlh'; // Extract from your published URL
const API_KEY = 'AIzaSyCC92-iilQtmIWVGSgZSOaWk4eeu48RTIU'; // You'll need to create this in Google Cloud Console

// Global variables
let songsList = [];
let currentRequests = [];
let genreList = new Set();

// Initialize the application
function init() {
    gapi.load('client', initGoogleAPI);
}

// Initialize Google API client
function initGoogleAPI() {
    gapi.client.init({
        'apiKey': API_KEY,
        'discoveryDocs': ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
    }).then(() => {
        // Load songs data
        loadSongsList();
        // Load current requests
        loadRequests();
        
        // Set up event listeners
        document.getElementById('searchInput').addEventListener('input', handleSearch);
        document.getElementById('genreFilter').addEventListener('change', handleSearch);
        document.getElementById('songRequestForm').addEventListener('submit', handleSongRequest);
        
        // Refresh requests list periodically
        setInterval(loadRequests, 30000); // Refresh every 30 seconds
    });
}

// Load songs from Google Sheets
function loadSongsList() {
    gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'SetList!A:D', // Adjust based on your sheet structure
    }).then(response => {
        const range = response.result;
        if (range.values.length > 0) {
            // Assuming first row is headers: Song, Artist, Genre, Year
            const headers = range.values[0];
            songsList = range.values.slice(1).map((row, index) => {
                const song = {};
                headers.forEach((header, i) => {
                    song[header.toLowerCase()] = row[i] || '';
                });
                song.id = index;
                return song;
            });
            
            // Extract unique genres for filter
            songsList.forEach(song => {
                if (song.genre) {
                    genreList.add(song.genre);
                }
            });
            
            // Populate genre filter dropdown
            const genreFilter = document.getElementById('genreFilter');
            genreList.forEach(genre => {
                const option = document.createElement('option');
                option.value = genre;
                option.textContent = genre;
                genreFilter.appendChild(option);
            });
            
            // Initial display of results
            displaySongResults(songsList);
        }
    });
}

// Load current requests from Google Sheets
function loadRequests() {
    gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Requests!A:D', // Adjust based on your requests sheet structure
    }).then(response => {
        const range = response.result;
        if (range.values.length > 0) {
            // Assuming headers: Timestamp, Song Title, Requested By, Status
            const headers = range.values[0];
            currentRequests = range.values.slice(1).map(row => {
                const request = {};
                headers.forEach((header, i) => {
                    request[header.toLowerCase().replace(/\s+/g, '_')] = row[i] || '';
                });
                return request;
            });
            
            // Display current requests
            displayRequests();
        }
    });
}

// Handle search input and filtering
function handleSearch() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const selectedGenre = document.getElementById('genreFilter').value;
    
    // Filter songs based on search term and genre
    const filteredSongs = songsList.filter(song => {
        const matchesSearch = 
            song.title.toLowerCase().includes(searchTerm) || 
            song.artist.toLowerCase().includes(searchTerm);
        const matchesGenre = !selectedGenre || song.genre === selectedGenre;
        return matchesSearch && matchesGenre;
    });
    
    displaySongResults(filteredSongs);
}

// Display song search results
function displaySongResults(songs) {
    const resultsContainer = document.getElementById('searchResults');
    resultsContainer.innerHTML = '';
    
    if (songs.length === 0) {
        resultsContainer.innerHTML = '<p>No songs found matching your search.</p>';
        return;
    }
    
    songs.forEach(song => {
        const songElement = document.createElement('div');
        songElement.className = 'song-item';
        songElement.innerHTML = `
            <div class="song-title">${song.title}</div>
            <div class="song-artist">${song.artist}</div>
        `;
        songElement.addEventListener('click', () => selectSong(song));
        resultsContainer.appendChild(songElement);
    });
}

// Handle song selection for request
function selectSong(song) {
    document.getElementById('songTitle').value = song.title;
    // Scroll to the request form
    document.querySelector('.request-form').scrollIntoView({ behavior: 'smooth' });
}

// Handle song request submission
function handleSongRequest(event) {
    event.preventDefault();
    
    const songTitle = document.getElementById('songTitle').value;
    const requesterName = document.getElementById('requesterName').value;
    
    if (!songTitle || !requesterName) {
        alert('Please select a song and enter your name.');
        return;
    }
    
    // Submit the request to Google Sheets
    const timestamp = new Date().toISOString();
    gapi.client.sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Requests!A:D',
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        resource: {
            values: [[timestamp, songTitle, requesterName, 'Pending']]
        }
    }).then(() => {
        // Clear the form
        document.getElementById('songTitle').value = '';
        document.getElementById('requesterName').value = '';
        
        // Reload requests to show the new one
        loadRequests();
        
        alert('Your song request has been submitted!');
    }).catch(error => {
        console.error('Error submitting request:', error);
        alert('There was an error submitting your request. Please try again.');
    });
}

// Display current requests
function displayRequests() {
    const requestsContainer = document.getElementById('requestsList');
    requestsContainer.innerHTML = '';
    
    if (currentRequests.length === 0) {
        requestsContainer.innerHTML = '<p>No requests yet. Be the first to request a song!</p>';
        return;
    }
    
    // Sort requests by timestamp, newest first
    currentRequests.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Only show pending requests
    const pendingRequests = currentRequests.filter(req => req.status === 'Pending');
    
    pendingRequests.forEach(request => {
        const requestElement = document.createElement('div');
        requestElement.className = 'request-item';
        requestElement.innerHTML = `
            <div class="song-title">${request.song_title}</div>
            <div class="requester-name">Requested by: ${request.requested_by}</div>
            <div class="request-time">
                ${new Date(request.timestamp).toLocaleTimeString()}
            </div>
        `;
        requestsContainer.appendChild(requestElement);
    });
}

// Start the application when page loads
window.onload = init;
