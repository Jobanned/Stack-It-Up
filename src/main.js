import * as THREE from 'three';

// --- SETUP ---
const scene = new THREE.Scene();

const aspect = window.innerWidth / window.innerHeight;
const d = 10;
const camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);
camera.position.set(10, 10, 10); 
camera.lookAt(0, 0, 0); 

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
directionalLight.position.set(10, 20, 0);
scene.add(directionalLight);

const scoreElement = document.getElementById('score');
// --- GAME STATE ---
const boxes = []; 
const overhangs = []; // Array to store the pieces that fall off
const ripples = []; // Ripple animation
let currentBox = null;
let speed = 0.08; 
let movingDirection = 1; 

const boxHeight = 1;
const boxSize = 3;

// --- BOX GENERATOR ---
function createBox(x, y, z, width, depth, color) {
    const geometry = new THREE.BoxGeometry(width, boxHeight, depth);
    const material = new THREE.MeshLambertMaterial({ color: color });
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
let isAnimating = false;

window.addEventListener('pointerdown', placeBox);

function placeBox() {
    if (gameEnded || isAnimating) return; // Stop if game over OR if on cooldown
    
    isAnimating = true; // Lock the function

    const topBox = boxes[boxes.length - 1];
    const distance = currentBox.position.x - topBox.position.x;
    const absDistance = Math.abs(distance);
    
    // --- NEW: PERFECT MATCH TOLERANCE ---
    const tolerance = 0.2; // Allow up to 0.2 offset for a perfect match
    const isPerfect = absDistance <= tolerance;

    // If perfect, we force the overlap to stay the same size. If not, we shrink it.
    const overlap = isPerfect ? currentWidth : currentWidth - absDistance;

    if (overlap > 0) {
        // --- SUCCESS ---
        
        // If perfect, snap perfectly to the box below. Otherwise, shift it to the new chopped center.
        const newX = isPerfect ? topBox.position.x : topBox.position.x + (distance / 2);
        
        scene.remove(currentBox);
        
        // 1. Create the box that successfully landed
        const placedBox = createBox(newX, currentBox.position.y, 0, overlap, boxSize, currentBox.material.color.getHex());
        boxes.push(placedBox);

        // Update the score UI
        scoreElement.innerText = boxes.length - 1;
        if (isPerfect) {
            // Create a thin white box slightly larger than the current block
            const rippleGeometry = new THREE.BoxGeometry(currentWidth + 0.2, 0.1, boxSize + 0.2);
            // We use MeshBasicMaterial so it ignores lighting and glows bright white
            const rippleMaterial = new THREE.MeshBasicMaterial({ 
                color: 0xffffff, 
                transparent: true, 
                opacity: 0.8 
            });
            const ripple = new THREE.Mesh(rippleGeometry, rippleMaterial);
            
            // Position it exactly at the seam between the current box and the one below it
            ripple.position.set(newX, currentBox.position.y - (boxHeight / 2), 0);
            scene.add(ripple);
            ripples.push(ripple); // Add it to our animation array
        }
        // --- GENERATE FALLING PIECE (ONLY IF NOT PERFECT) ---
        if (!isPerfect) {
            const overhangWidth = absDistance;
            const overhangX = newX + (distance > 0 ? (overlap / 2 + overhangWidth / 2) : -(overlap / 2 + overhangWidth / 2));
            
            const overhangBox = createBox(overhangX, currentBox.position.y, 0, overhangWidth, boxSize, currentBox.material.color.getHex());
            overhangs.push(overhangBox);
        }
        // ----------------------------------------------------

        currentWidth = overlap;

        const nextY = currentBox.position.y + boxHeight;
        const randomColor = Math.random() * 0xffffff;
        
        currentBox = createBox(-7, nextY, 0, currentWidth, boxSize, randomColor); 
        movingDirection = 1; 
        speed += 0.005; 
        
        // Unlock the function after a short 100ms delay to prevent double-clicks
        setTimeout(() => { isAnimating = false; }, 100);
        
    } else {
        // --- FAILURE ---
        gameEnded = true;
        alert("Game Over! Refresh the page to try again.");
    }
}

// --- GAME LOOP ---
// --- GAME LOOP ---
function animate() {
    requestAnimationFrame(animate);

    if (currentBox && !gameEnded) { 
        currentBox.position.x += speed * movingDirection;

        if (currentBox.position.x > 7) {
            movingDirection = -1;
        }
        if (currentBox.position.x < -7) {
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

    renderer.render(scene, camera);
}

animate();