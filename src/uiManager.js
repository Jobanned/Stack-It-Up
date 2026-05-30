export function setupUI(onRestartClick) {
    // 1. Create the overlay container
    const modal = document.createElement('div');
    modal.style.cssText = `
        display: none; 
        position: absolute; 
        top: 0; left: 0; 
        width: 100vw; height: 100vh; 
        background-color: rgba(0, 0, 0, 0.7); 
        z-index: 20; 
        flex-direction: column; 
        justify-content: center; 
        align-items: center; 
        font-family: 'Helvetica Neue', Arial, sans-serif; 
        color: white;
    `;

    // 2. Create the Title
    const title = document.createElement('h1');
    title.innerText = "GAME OVER";
    title.style.cssText = "font-size: 60px; margin-bottom: 10px; text-shadow: 2px 4px 10px rgba(0,0,0,0.5);";

    // 3. Create the Score Display
    const scoreDisplay = document.createElement('p');
    scoreDisplay.style.cssText = "font-size: 24px; margin-bottom: 30px;";
    
    // 4. Create the Restart Button
    const restartBtn = document.createElement('button');
    restartBtn.innerText = "Play Again";
    restartBtn.style.cssText = `
        padding: 15px 40px; 
        font-size: 24px; 
        font-weight: bold; 
        color: white; 
        background-color: #e74c3c; 
        border: none; 
        border-radius: 8px; 
        cursor: pointer; 
        box-shadow: 0 4px 6px rgba(0,0,0,0.3);
    `;

    // Add a simple hover effect using JS events
    restartBtn.addEventListener('mouseenter', () => restartBtn.style.backgroundColor = '#c0392b');
    restartBtn.addEventListener('mouseleave', () => restartBtn.style.backgroundColor = '#e74c3c');

    // 5. Connect the Restart Logic
    restartBtn.addEventListener('click', () => {
        modal.style.display = 'none'; // Hide the modal
        onRestartClick(); // Run the reset logic from main.js
    });

    // 6. Assemble everything and attach to the webpage
    modal.appendChild(title);
    modal.appendChild(scoreDisplay);
    modal.appendChild(restartBtn);
    document.body.appendChild(modal);

    // 7. Return the functions we want to use in main.js
    return {
        showGameOver: (finalScore) => {
            scoreDisplay.innerText = `Final Score: ${finalScore}`;
            modal.style.display = 'flex'; // Reveals the modal
        }
    };
}