// Get canvas and context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Get UI elements
const scoreEl = document.getElementById('score');
const shotsEl = document.getElementById('shots');

// Set canvas dimensions
canvas.width = 800;
canvas.height = 600;

// --- Game Variables ---
let score = 0;
let shots = 0;

// Physics constants
const gravity = 0.2;
const friction = 0.99;
const launchPower = 0.15;
const wallBounce = -0.7; // How much energy is kept on wall bounce

// Game state
let isDragging = false;
let canShoot = true;

// Game objects
let ball = {
    x: 100,
    y: 100,
    radius: 10,
    vx: 0,
    vy: 0,
    color: 'white'
};

let hole = {
    x: 700,
    y: 500,
    radius: 15,
    color: 'black'
};

// Mouse positions
let dragStart = { x: 0, y: 0 };
let dragEnd = { x: 0, y: 0 };

// Terrain
let terrainPoints = [];

// --- Functions ---

/**
 * Generates a random terrain path
 */
function generateTerrain() {
    terrainPoints = [];
    let y = canvas.height * (Math.random() * 0.3 + 0.6); // Start height
    const segmentLength = 20;
    
    for (let x = -segmentLength; x <= canvas.width + segmentLength; x += segmentLength) {
        terrainPoints.push({ x: x, y: y });
        // Change slope randomly but smoothly
        y += (Math.random() - 0.5) * 30;
        // Clamp y to stay within a reasonable range
        y = Math.max(canvas.height * 0.4, Math.min(canvas.height - 50, y));
    }
}

/**
 * Initializes or resets the game state
 */
function init() {
    generateTerrain();
    
    // Place the hole on a relatively flat part of the terrain
    const holeIndex = Math.floor(Math.random() * (terrainPoints.length - 10)) + 5;
    hole.x = terrainPoints[holeIndex].x;
    hole.y = terrainPoints[holeIndex].y;

    // Place the ball at the start of the terrain
    ball.x = 50;
    ball.y = terrainPoints[1].y - ball.radius - 1; // Start on the ground
    ball.vx = 0;
    ball.vy = 0;
    
    canShoot = true;
    shots = 0;
    shotsEl.innerText = `Shots: ${shots}`;
}

/**
 * Resets the level after scoring
 */
function nextLevel() {
    score++;
    scoreEl.innerText = `Score: ${score}`;
    init(); // Generate a new level
}


/**
 * Main game loop to update game state
 */
function update() {
    if (canShoot) return; // Don't update physics if waiting for a shot

    // Apply gravity
    ball.vy += gravity;

    // Apply friction
    ball.vx *= friction;
    ball.vy *= friction;

    // Update position
    ball.x += ball.vx;
    ball.y += ball.vy;

    // --- Collision Detection ---

    // 1. Wall collisions (left and right)
    if (ball.x - ball.radius < 0) {
        ball.x = ball.radius;
        ball.vx *= wallBounce;
    }
    if (ball.x + ball.radius > canvas.width) {
        ball.x = canvas.width - ball.radius;
        ball.vx *= wallBounce;
    }
    // Top boundary (less bouncy)
     if (ball.y - ball.radius < 0) {
        ball.y = ball.radius;
        ball.vy *= -0.4;
    }


    // 2. Terrain collision
    for (let i = 0; i < terrainPoints.length - 1; i++) {
        const p1 = terrainPoints[i];
        const p2 = terrainPoints[i + 1];

        // Check if the ball is within the horizontal bounds of the segment
        if (ball.x > p1.x && ball.x <= p2.x) {
            // Find the height of the terrain at the ball's x position
            const terrainHeight = p1.y + (p2.y - p1.y) * ((ball.x - p1.x) / (p2.x - p1.x));
            
            if (ball.y + ball.radius > terrainHeight) {
                ball.y = terrainHeight - ball.radius;

                // Calculate the surface normal and reflect velocity for a bounce
                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;
                const angle = Math.atan2(dy, dx);
                
                // Simple bounce reaction
                ball.vy *= -0.5; // Lose some energy on bounce
                
                // Add a slight roll based on the slope
                ball.vx += Math.sin(angle) * gravity * 2;
            }
            break;
        }
    }
    
    // 3. Hole collision (Win condition)
    const distToHole = Math.sqrt((ball.x - hole.x)**2 + (ball.y - hole.y)**2);
    const speed = Math.sqrt(ball.vx**2 + ball.vy**2);

    if (distToHole < hole.radius - ball.radius/2 && speed < 3) {
        // Ball is in the hole!
        console.log("In the hole!");
        nextLevel();
    }
    
    // Check if the ball has stopped moving
    if (speed < 0.1) {
        ball.vx = 0;
        ball.vy = 0;
        canShoot = true; // Allow the player to take another shot
    }
}


/**
 * Main drawing function
 */
function draw() {
    // Clear canvas with a sky color
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw terrain
    ctx.beginPath();
    ctx.moveTo(terrainPoints[0].x, terrainPoints[0].y);
    for (let i = 1; i < terrainPoints.length; i++) {
        ctx.lineTo(terrainPoints[i].x, terrainPoints[i].y);
    }
    ctx.lineTo(canvas.width, canvas.height); // Bottom-right corner
    ctx.lineTo(0, canvas.height); // Bottom-left corner
    ctx.closePath();
    ctx.fillStyle = '#228B22'; // Forest Green
    ctx.fill();

    // Draw hole
    ctx.beginPath();
    ctx.arc(hole.x, hole.y, hole.radius, 0, Math.PI * 2);
    ctx.fillStyle = hole.color;
    ctx.fill();
    // Flag pole for the hole
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(hole.x, hole.y);
    ctx.lineTo(hole.x, hole.y - 30);
    ctx.stroke();

    // Draw ball
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = ball.color;
    ctx.fill();

    // Draw slingshot line if dragging
    if (isDragging) {
        ctx.beginPath();
        ctx.moveTo(ball.x, ball.y);
        ctx.lineTo(dragEnd.x, dragEnd.y);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 3;
        ctx.stroke();
    }
}

/**
 * The main game loop, powered by requestAnimationFrame
 */
function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

// --- Event Listeners ---

canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Check if the click is on the ball and if we can shoot
    const dist = Math.sqrt((mouseX - ball.x)**2 + (mouseY - ball.y)**2);
    if (dist < ball.radius && canShoot) {
        isDragging = true;
        dragStart = { x: mouseX, y: mouseY };
        dragEnd = { x: mouseX, y: mouseY };
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (isDragging) {
        const rect = canvas.getBoundingClientRect();
        dragEnd = { 
            x: e.clientX - rect.left,
            y: e.clientY - rect.top 
        };
    }
});

canvas.addEventListener('mouseup', (e) => {
    if (isDragging) {
        isDragging = false;
        canShoot = false; // Ball is now in motion
        shots++;
        shotsEl.innerText = `Shots: ${shots}`;

        // Calculate launch velocity
        const dx = dragStart.x - dragEnd.x;
        const dy = dragStart.y - dragEnd.y;
        
        ball.vx = dx * launchPower;
        ball.vy = dy * launchPower;
    }
});


// Start the game!
init();
loop();