import * as THREE from 'three';
import { setupUI } from './uiManager.js';
import { loginGuest, setPlayerName, submitScore, getTopScores } from './api.js'

// --- INITIALIZE CLOUD DATABASE ---
// This runs in the background as soon as the webpage opens
loginGuest()
    .then(() => console.log("Successfully connected to LootLocker!"))
    .catch((err) => console.error("Database connection failed:", err));

// --- SETUP ---
const scene = new THREE.Scene();

const aspect = window.innerWidth / window.innerHeight;
const d = 10;
const camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);
camera.position.set(10, 10, 10); 
camera.lookAt(0, 0, 0); 

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 20, 0);
scene.add(directionalLight);

const scoreElement = document.getElementById('score');
const comboElement = document.getElementById('combo');
// --- INITIALIZE UI ---
const ui = setupUI(resetGame, async (username) => {
    // This code runs when the player clicks "Submit Score"
    try {
        await setPlayerName(username);       // 1. Save their name to the cloud
        await submitScore(Math.ceil(score)); // 2. Save their score to the cloud
        const top10 = await getTopScores();  // 3. Download the global high scores
        ui.showLeaderboard(top10);           // 4. Update the screen
    } catch (error) {
        console.error("Failed to submit score:", error);
        alert("Something went wrong connecting to the leaderboard!");
    }
});
// --- GAME STATE ---
const boxes = []; 
const overhangs = []; // Array to store the pieces that fall off
const ripples = []; // Ripple animation
let currentBox = null;
let speed = 0.08; 
let movingDirection = 1; 

// NEW SCORING VARIABLES
let score = 0; 
let perfectCombo = 0;

const boxHeight = 1;
const boxSize = 3;

//zooming animation variables
let zoomOutTarget = null;
let lookAtTarget = null;
let targetZoom = 1; //tracks orthographic zoom level for smooth transition

// --- BOX GENERATOR ---
function createBox(x, y, z, width, depth, color) {
    const geometry = new THREE.BoxGeometry(width, boxHeight, depth);
    const material = new THREE.MeshStandardMaterial({ 
        color: color,
        roughness: 0.2, // Low roughness = sleek, glossy lacquer surface
        metalness: 0.1  // Adds a bit of dense, solid mass to the look
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    scene.add(mesh);
    return mesh;
}

// Spawn Foundation
const foundation = createBox(0, 0, 0, boxSize, boxSize, 0x3498db);
boxes.push(foundation);

// Spawn First Moving Box
currentBox = createBox(0, boxHeight, 0, boxSize, boxSize, 0xe74c3c);
currentBox.position.x = -7;


// --- PHASE 4: SLICING LOGIC ---
let gameEnded = false;
let currentWidth = boxSize; 
let currentDepth = boxSize; // NEW: Track the depth of the box
let movingAxis = 'x';       // NEW: Track if it's moving on 'x' or 'z'
let isAnimating = false;

window.addEventListener('pointerdown', placeBox);

function placeBox() {
    if (gameEnded || isAnimating) return; 
    
    isAnimating = true; 

    const topBox = boxes[boxes.length - 1];
    
    // Calculate distance on the ACTIVE axis
    const distance = currentBox.position[movingAxis] - topBox.position[movingAxis];
    const absDistance = Math.abs(distance);
    
    const tolerance = 0.2; 
    const isPerfect = absDistance <= tolerance;

    // Grab the dimension of the active axis
    const activeDimension = movingAxis === 'x' ? currentWidth : currentDepth;
    const overlap = isPerfect ? activeDimension : activeDimension - absDistance;

    if (overlap > 0) {
        // --- SUCCESS ---
        const newPos = isPerfect ? topBox.position[movingAxis] : topBox.position[movingAxis] + (distance / 2);
        
        scene.remove(currentBox);
        
       // Calculate new dimensions (changed from const to let so we can modify them)
        let newWidth = movingAxis === 'x' ? overlap : currentWidth;
        let newDepth = movingAxis === 'z' ? overlap : currentDepth;
        
        // --- NEW GIMMICK: RESTORE PIECES ON 10+ COMBO ---
        // We use 'perfectCombo + 1' because the counter increments a few lines down.
        // This triggers exactly on the 10th perfect hit and stays active.
        if (isPerfect && (perfectCombo + 1) >= 10) {
            if (movingAxis === 'x') {
                newWidth = Math.min(boxSize, newWidth + 0.5); // Caps it at original size (3)
            } else if (movingAxis === 'z') {
                newDepth = Math.min(boxSize, newDepth + 0.5);
            }
        }
        
        // Calculate new placement position
        const placedBoxX = movingAxis === 'x' ? newPos : currentBox.position.x;
        const placedBoxZ = movingAxis === 'z' ? newPos : currentBox.position.z;

        const placedBox = createBox(placedBoxX, currentBox.position.y, placedBoxZ, newWidth, newDepth, currentBox.material.color.getHex());
        boxes.push(placedBox);

        // --- PERFECT RIPPLE ---
        if (isPerfect) {
            const rippleGeometry = new THREE.BoxGeometry(newWidth + 0.2, 0.1, newDepth + 0.2);
            const rippleMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });
            const ripple = new THREE.Mesh(rippleGeometry, rippleMaterial);
            ripple.position.set(placedBoxX, currentBox.position.y - (boxHeight / 2), placedBoxZ);
            scene.add(ripple);
            ripples.push(ripple); 
        }

        // --- MULTIPLIER AND COMBO LOGIC ---
        let currentMultiplier = 1; 
        if (isPerfect) {
            perfectCombo++; 
            if (perfectCombo >= 2) {
                currentMultiplier = 1 + (Math.floor((perfectCombo + 1) / 3) * 0.5);
            }
        } else {
            perfectCombo = 0; 
        }
            
        if (currentMultiplier > 1) {
            // If they are at 10+ combo, stack an extra message!
            if (perfectCombo >= 10) {
                comboElement.innerText = `x${currentMultiplier} COMBO!\n+0.5 PLATFORM WIDENED!`;
                comboElement.style.color = '#2ecc71'; // Temporarily flash green for recovery!
            } else {
                comboElement.innerText = `x${currentMultiplier} COMBO!`;
                comboElement.style.color = '#f1c40f'; // Normal gold combo color
            }
            
            comboElement.style.transform = 'scale(1.2)';
            setTimeout(() => { comboElement.style.transform = 'scale(1)'; }, 100);
        } else {
            comboElement.innerText = ''; 
        }

        score += currentMultiplier;
        scoreElement.innerText = Math.ceil(score); 

        if (currentMultiplier > 1) {
            comboElement.innerText = `x${currentMultiplier} COMBO!`;
            comboElement.style.transform = 'scale(1.2)';
            setTimeout(() => { comboElement.style.transform = 'scale(1)'; }, 100);
        } else {
            comboElement.innerText = ''; 
        }

        // --- GENERATE FALLING PIECE ---
        if (!isPerfect) {
            const overhangWidth = movingAxis === 'x' ? absDistance : currentWidth;
            const overhangDepth = movingAxis === 'z' ? absDistance : currentDepth;
            const overhangPos = newPos + (distance > 0 ? (overlap / 2 + absDistance / 2) : -(overlap / 2 + absDistance / 2));
            
            const overhangX = movingAxis === 'x' ? overhangPos : currentBox.position.x;
            const overhangZ = movingAxis === 'z' ? overhangPos : currentBox.position.z;
            
            const overhangBox = createBox(overhangX, currentBox.position.y, overhangZ, overhangWidth, overhangDepth, currentBox.material.color.getHex());
            overhangs.push(overhangBox);
        }

        // --- UPDATE DIMENSIONS ---
        // Changed from 'overlap' to carry over our newly restored width/depth sizes
        if (movingAxis === 'x') currentWidth = newWidth;
        if (movingAxis === 'z') currentDepth = newDepth;

        const nextY = currentBox.position.y + boxHeight;
        const randomColor = Math.random() * 0xffffff;
        
        // --- THE 50-POINT 4-SIDE LOGIC ---
        // Lock the non-moving axis to the placed box so it stays aligned
        let startX = placedBoxX; 
        let startZ = placedBoxZ;

        // If score is 30+, allow 4 sides. Otherwise, just 2.
        const numSides = score >= 30 ? 4 : 2;
        const randomSide = Math.floor(Math.random() * numSides);

        if (randomSide === 0) {
            movingAxis = 'x'; startX = -7; movingDirection = 1;  // Left
        } else if (randomSide === 1) {
            movingAxis = 'x'; startX = 7;  movingDirection = -1; // Right
        } else if (randomSide === 2) {
            movingAxis = 'z'; startZ = -7; movingDirection = 1;  // Back
        } else if (randomSide === 3) {
            movingAxis = 'z'; startZ = 7;  movingDirection = -1; // Front
        }
        
        currentBox = createBox(startX, nextY, startZ, currentWidth, currentDepth, randomColor); 
        speed += 0.005; 
        
        setTimeout(() => { isAnimating = false; }, 100);
        
    } else {
        // --- FAILURE ---
        gameEnded = true;

        // Calculate the tower height
        const stackHeight = boxes.length * boxHeight;
        
        // 1. Pan the camera straight UP to the middle of the tower (keep X and Z at 10)
        zoomOutTarget = new THREE.Vector3(10, 10 + (stackHeight / 2), 10);
        
        // 2. Calculate the zoom level (Taller tower = smaller zoom number)
        targetZoom = 15 / (stackHeight + 15); 

        // Delay the Game Over modal
        setTimeout(() => {
            ui.showGameOver(Math.ceil(score));
        }, 1500);
    }
    
}
    // --- RESET GAME LOGIC ---
function resetGame() {
    if (currentBox) scene.remove(currentBox);

    // Remove stacked boxes EXCEPT the foundation
    for (let i = 1; i < boxes.length; i++) {
        scene.remove(boxes[i]);
    }
    boxes.splice(1); 

    // Remove falling pieces and ripples
    overhangs.forEach(obj => scene.remove(obj));
    overhangs.length = 0; 
    ripples.forEach(obj => scene.remove(obj));
    ripples.length = 0;

    // Reset Camera
    zoomOutTarget = null;
    targetZoom = 1;
    camera.zoom = 1;
    camera.updateProjectionMatrix();
    camera.position.set(10, 10, 10);
    camera.lookAt(0, 0, 0);

    // Reset variables
    score = 0;
    perfectCombo = 0;
    currentWidth = boxSize;
    currentDepth = boxSize; 
    movingAxis = 'x';
    gameEnded = false;
    isAnimating = false;
    speed = 0.08;

    scoreElement.innerText = '0';
    comboElement.innerText = '';

    // Spawn new box
    const startFirstFromLeft = Math.random() > 0.5;
    currentBox = createBox(startFirstFromLeft ? -7 : 7, boxHeight, 0, boxSize, boxSize, 0xe74c3c);
    movingDirection = startFirstFromLeft ? 1 : -1;
}
// --- GAME LOOP ---
function animate() {
    requestAnimationFrame(animate);

if (currentBox && !gameEnded) { 
        // Move along the currently active axis (either 'x' or 'z')
        currentBox.position[movingAxis] += speed * movingDirection;

        // Bounce back if it hits the edges
        if (currentBox.position[movingAxis] > 7) {
            movingDirection = -1;
        }
        if (currentBox.position[movingAxis] < -7) {
            movingDirection = 1;
        }
    }

    // --- NEW: PHYSICS AND CAMERA ---
    
    // 1. Smoothly move the camera up as the tower grows
    const targetCameraY = (boxes.length * boxHeight) + 10; 
    // This math makes the camera "glide" to its target instead of snapping instantly
    camera.position.y += (targetCameraY - camera.position.y) * 0.1; 
    
    // Ensure the camera always looks down at the tower, not just straight ahead
    camera.lookAt(0, camera.position.y - 10, 0); 

    // 2. Make all the chopped pieces fall down and spin
    for (let i = 0; i < overhangs.length; i++) {
        overhangs[i].position.y -= 0.1; // Gravity pulling it down
        overhangs[i].rotation.z += 0.05; // Add a nice little tumble effect
    }
    if (!gameEnded) {
        // --- GAMEPLAY CAMERA ---
        // 1. Smoothly move the camera up as the tower grows
        const targetCameraY = (boxes.length * boxHeight) + 10; 
        camera.position.y += (targetCameraY - camera.position.y) * 0.1; 
        
        // Ensure the camera always looks down at the tower
        camera.lookAt(0, camera.position.y - 10, 0); 
    } else if (zoomOutTarget) {
        // --- GAME OVER CINEMATIC CAMERA ---
        // Smoothly glide the position up
        camera.position.lerp(zoomOutTarget, 0.05);
        
        // Smoothly zoom out the orthographic view
        camera.zoom += (targetZoom - camera.zoom) * 0.05;
        camera.updateProjectionMatrix(); // Required when changing Orthographic zoom!
    }
    // --- NEW: ANIMATE RIPPLES ---
    // We loop backwards because we are removing items from the array as we go
    for (let i = ripples.length - 1; i >= 0; i--) {
        const ripple = ripples[i];
        
        // Expand the ripple outwards
        ripple.scale.x += 0.05;
        ripple.scale.z += 0.05;
        
        // Fade it out
        ripple.material.opacity -= 0.04;

        // If it is completely invisible, delete it to save memory
        if (ripple.material.opacity <= 0) {
            scene.remove(ripple);
            ripples.splice(i, 1);
        }
    }
    if (gameEnded && zoomOutTarget) {
        // Smoothly glide the camera backwards (0.05 controls the speed/smoothness)
        camera.position.lerp(zoomOutTarget, 0.05);
        
    }
    renderer.render(scene, camera);
}

animate();