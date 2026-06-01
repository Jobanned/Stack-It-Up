export function setupUI(onRestartClick, onSubmitScoreClick) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        display: none; position: absolute; top: 0; left: 0; 
        width: 100vw; height: 100vh; background-color: rgba(0, 0, 0, 0.85); 
        z-index: 20; flex-direction: column; justify-content: center; 
        align-items: center; font-family: 'Helvetica Neue', Arial, sans-serif; color: white;
    `;

    const title = document.createElement('h1');
    title.innerText = "GAME OVER";
    title.style.cssText = "font-size: 50px; margin-bottom: 10px; color: #e74c3c;";

    const scoreDisplay = document.createElement('p');
    scoreDisplay.style.cssText = "font-size: 24px; margin-bottom: 20px; font-weight: bold;";

    // --- FORM SECTION (To enter name) ---
    const formContainer = document.createElement('div');
    formContainer.style.cssText = "display: flex; flex-direction: column; align-items: center;";

    const nameInput = document.createElement('input');
    nameInput.type = "text";
    nameInput.placeholder = "Enter your username...";
    nameInput.maxLength = 15;
    nameInput.style.cssText = "padding: 10px; font-size: 20px; margin-bottom: 15px; border-radius: 5px; border: none; text-align: center;";

    const submitBtn = document.createElement('button');
    submitBtn.innerText = "Submit Score";
    submitBtn.style.cssText = "padding: 12px 30px; font-size: 20px; font-weight: bold; color: white; background-color: #2ecc71; border: none; border-radius: 8px; cursor: pointer; margin-bottom: 10px;";

    const skipBtn = document.createElement('button');
    skipBtn.innerText = "Skip & Play Again";
    skipBtn.style.cssText = "padding: 10px 20px; font-size: 16px; color: white; background-color: #95a5a6; border: none; border-radius: 8px; cursor: pointer;";
    // ------------------------------------

    // --- LEADERBOARD SECTION ---
    const leaderboardContainer = document.createElement('div');
    leaderboardContainer.style.cssText = "display: none; flex-direction: column; align-items: center; width: 300px;";

    const loadingText = document.createElement('p');
    loadingText.innerText = "Fetching global scores...";

    const listElement = document.createElement('ol');
    listElement.style.cssText = "font-size: 20px; width: 100%; text-align: left; padding-left: 20px; margin-bottom: 20px;";

    const playAgainBtn = document.createElement('button');
    playAgainBtn.innerText = "Play Again";
    playAgainBtn.style.cssText = "padding: 15px 40px; font-size: 24px; font-weight: bold; color: white; background-color: #e74c3c; border: none; border-radius: 8px; cursor: pointer;";
    // ---------------------------

    // Button Events
    submitBtn.addEventListener('click', () => {
        const username = nameInput.value || "Anonymous";
        formContainer.style.display = 'none';
        leaderboardContainer.style.display = 'flex';
        loadingText.style.display = 'block';
        listElement.style.display = 'none';
        onSubmitScoreClick(username); // Triggers the database logic in main.js
    });

    const triggerRestart = () => {
        modal.style.display = 'none';
        nameInput.value = ''; // Clear input for next time
        onRestartClick();
    };

    skipBtn.addEventListener('click', triggerRestart);
    playAgainBtn.addEventListener('click', triggerRestart);

    // Assemble Form
    formContainer.appendChild(nameInput);
    formContainer.appendChild(submitBtn);
    formContainer.appendChild(skipBtn);

    // Assemble Leaderboard
    leaderboardContainer.appendChild(loadingText);
    leaderboardContainer.appendChild(listElement);
    leaderboardContainer.appendChild(playAgainBtn);

    // Assemble Modal
    modal.appendChild(title);
    modal.appendChild(scoreDisplay);
    modal.appendChild(formContainer);
    modal.appendChild(leaderboardContainer);
    document.body.appendChild(modal);

    return {
        showGameOver: (finalScore) => {
            scoreDisplay.innerText = `Final Score: ${finalScore}`;
            formContainer.style.display = 'flex';
            leaderboardContainer.style.display = 'none';
            modal.style.display = 'flex';
            nameInput.focus();
        },
        showLeaderboard: (topScores) => {
            loadingText.style.display = 'none';
            listElement.innerHTML = ''; 
            
            const strictlyTop10 = topScores.slice(0, 10);
            
            // --- FIX: Add (item, index) here ---
            strictlyTop10.forEach((item, index) => {
                const li = document.createElement('li');
                
                li.style.cssText = `
                    display: flex;
                    justify-content: space-between;
                    width: 100%;
                    margin-bottom: 8px;
                    border-bottom: 1px dashed rgba(255,255,255,0.2);
                    padding-bottom: 4px;
                `;
                
                const playerName = item.player.name || item.player.id; 
                
                li.innerHTML = `
                    <span>${index + 1}. ${playerName}</span>
                    <span style="font-weight: bold; color: #f1c40f;">${item.score}</span>
                `;
                
                listElement.appendChild(li);
            });
            
            listElement.style.display = 'block';
        }
    };
}