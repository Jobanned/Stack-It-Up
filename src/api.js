const GAME_KEY = 'dev_c4dcf560fb694566b541effed2bec95b'; // <-- PASTE YOUR API KEY HERE
const LEADERBOARD_ID = '34694'; // <-- PASTE YOUR LEADERBOARD ID HERE
let sessionToken = '';
let playerId = ''; 
// ------------------------------------------

// 1. Log the player in anonymously (ARCADE MODE)
export async function loginGuest() {
    const body = { game_key: GAME_KEY, game_version: "1.0.0" };

    const res = await fetch('https://api.lootlocker.io/game/v2/session/guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    const data = await res.json();
    
    // Now JavaScript knows what these variables are!
    sessionToken = data.session_token;
    playerId = data.player_id; 
}

// 2. Set the player's username
export async function setPlayerName(username) {
    await fetch('https://api.lootlocker.io/game/player/name', {
        method: 'PATCH',
        headers: { 
            'Content-Type': 'application/json',
            'x-session-token': sessionToken 
        },
        body: JSON.stringify({ name: username })
    });
}

// 3. Submit the final score
export async function submitScore(score) {
    await fetch(`https://api.lootlocker.io/game/leaderboards/${LEADERBOARD_ID}/submit`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'x-session-token': sessionToken 
        },
        body: JSON.stringify({ score: score })
    });
}

// 4. Get the Top 10 High Scores
export async function getTopScores() {
    const res = await fetch(`https://api.lootlocker.io/game/leaderboards/${LEADERBOARD_ID}/list?count=10`, {
        method: 'GET',
        headers: { 'x-session-token': sessionToken }
    });
    const data = await res.json();
    return data.items; // Returns the array of players and scores
}