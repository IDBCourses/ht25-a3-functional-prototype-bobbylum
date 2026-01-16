// ============================================
// CANVAS AND CONTEXT
// ============================================
// These variables will hold the canvas element and drawing context
let canvas; // The HTML canvas element the game is drawn
let ctx; // The 2D context that draws shapes and images

// ============================================
// GAME STATE VARIABLES
// ============================================
// These keep track of the current state of the game
let score = 0; // How many walls the player has successfully passed
let lives = 3; // How many lives the player has left (3 at start of the game)
let gameSpeed = 3; // How fast walls move across the screen (pixels per frame)
let gameRunning = true; // Is the game currently running? (true) or over? (false)
let gamePaused = false; // Is the game paused for long press? (true = paused, false = playing)

// ============================================
// WALL VARIABLES
// ============================================
// Variables related to the wall obstacles
let walls = []; // An array that stores all current wall objects on screen
let wallSpawnTimer = 0; // Counts frames to know when to spawn the next wall
let wallSpawnInterval = 150; // How many frames to wait before spawning a new wall
let colorIndex = 0; // Keeps track of which color to use for the next wall
// Array of colors that walls can be - cycles through these
const wallColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE'];
// The possible directions a wall can require 
const directions = ['up', 'down', 'left', 'right'];
// Special wall type that requires long press
const specialWallChance = 0.2; // 20% chance of spawning a special wall

// ============================================
// CAPYBARA VARIABLES
// ============================================
// Variables for the player character (capybara)
const capybaraX = 150; // The fixed X position (horizontal) where capybara stays
const capybaraY = 325; // The fixed Y position (vertical) where capybara stays
let targetDirection = null; // The direction the player wants to change to
let isLongPressing = false; // Is the player currently doing a long press?

// Object to store all the capybara images for different directions
let capyImages = {
    up: null, // Will hold the "capi up.png" image
    down: null, // Will hold the "capi down.png" image
    left: null, // Will hold the "capi left.png" image
    right: null, // Will hold the "capi right.png" image
    special: null // Will hold the "capi special.png" image for long press success
};

// The main capybara object that stores its position, size, and current state
let capybara = {
    x: capybaraX, // Current X position (horizontal)
    y: capybaraY, // Current Y position (vertical)
    width: 80, // Width of the capybara image in pixels
    height: 80, // Height of the capybara image in pixels
    state: 'right' // Current direction/orientation (starts facing right)
};

// ============================================
// KEYBOARD SWIPE DETECTION
// ============================================
// This represents a British QWERTY keyboard layout in rows
// Used to detect when player "swipes" across keys
const keyOrder = [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'], // Top row
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'], // Middle row
    ['z', 'x', 'c', 'v', 'b', 'n', 'm'] // Bottom row
];
let keySequence = []; // Stores the last few keys pressed in order
let lastKeyTime = 0; // Timestamp of when the last key was pressed
const swipeTimeout = 300; // How many milliseconds before we reset the key sequence

// ============================================
// LONG PRESS DETECTION
// ============================================
let longPressActive = false; // Is spacebar currently being held?
let longPressStartTime = 0; // When did the long press start
const longPressDuration = 1000; // How long to hold (in milliseconds) - 1 second
let longPressCompleted = false; // Has the long press been completed?

// ============================================
// WALL CLASS
// ============================================
// This is a "blueprint" for creating wall objects
// Each wall is an obstacle the player needs to get past
class Wall {
    // Constructor runs when you create a new wall: new Wall()
    constructor() {
        this.x = canvas.width; // Start the wall at the right edge of the screen
        this.width = 15; // How wide the wall is (thin vertical line)
        this.height = canvas.height; // Make wall as tall as the game canvas
        
        // Decide if this is a special wall (requires a long press)
        this.isSpecial = Math.random() < specialWallChance; // Random chance for special wall
        
        // Pick a color - special walls are gold/orange, normal walls are random colors
        if (this.isSpecial) {
            this.color = '#FFD700'; // Gold color for special walls
        } else {
            // Pick a color from the wallColors array 
            this.color = wallColors[colorIndex % wallColors.length];
            colorIndex++; // Increment so next wall gets a different color
        }
        
        // Randomly pick one of the directions (up, down, left, or right)
        this.direction = directions[Math.floor(Math.random() * directions.length)];
        this.passed = false; // Has the player successfully passed this wall?
        this.checked = false; // Have we already checked collision for this wall?
    }

    // Move the wall to the left each frame
    update() {
        this.x -= gameSpeed; // Subtract gameSpeed from x position (moves left)
    }

    // Draw the wall on the canvas
    draw() {
        ctx.fillStyle = this.color; // Set the drawing color to this wall's color
        // Draw a rectangle: x position, y position, width, height
        ctx.fillRect(this.x, 0, this.width, this.height);
        
        // If this is a special wall, draw a visual indicator
        if (this.isSpecial) {
            ctx.fillStyle = '#FFF'; // White color for the star
            ctx.font = 'bold 40px Arial'; // Font for the star symbol
            // Draw a star symbol in the middle of the wall
            ctx.fillText('⭐', this.x - 15, canvas.height / 2);
        }
    }

    // Check if the capybara collides with this wall
    // Takes the capybara object as a parameter
    checkCollision(capy, playerIsLongPressing) {
        // If already passed or checked, don't check again
        if (this.passed || this.checked) return false;
        
        // Check if capybara and wall overlap horizontally
        // capy.x < this.x + this.width means capy's left edge is left of wall's right edge
        // capy.x + capy.width > this.x means capy's right edge is right of wall's left edge
        const overlapX = capy.x < this.x + this.width && capy.x + capy.width > this.x;
        
        // If they overlap horizontally and it isn't checked yet
        if (overlapX && !this.checked) {
            this.checked = true; // Mark as checked so it's only checked once
            
            // SPECIAL WALL LOGIC - requires long press for special state
            if (this.isSpecial) {
                // Player must be long pressing or have special state to pass through special wall
                if (playerIsLongPressing || capy.state === 'special') {
                    // SUCCESS! Player is long pressing or in special state
                    this.passed = true; // Mark wall as successfully passed
                    score += 2; // Special walls give 2 points instead of 1
                    
                    // Every 5 walls, make the game harder
                    if (score % 5 === 0) {
                        gameSpeed += 0.5; // Walls move faster
                        // Walls spawn more frequently (but not less than every 50 frames)
                        wallSpawnInterval = Math.max(50, wallSpawnInterval - 5);
                    }
                    return false; // Return false = no collision, player passed through
                } else {
                    // FAILURE! Not long pressing and not special - collision
                    return true;
                }
            }
            // NORMAL WALL LOGIC - requires matching direction
            else {
                // Check if capybara's orientation matches what this wall requires
                if (capy.state === this.direction) {
                    // SUCCESS! Capybara is in the correct position
                    this.passed = true; // Mark wall as successfully passed
                    score++; // Increase the player's score by 1
                    
                    // Every 5 walls, make the game harder
                    if (score % 5 === 0) {
                        gameSpeed += 0.5; // Walls move faster
                        // Walls spawn more frequently (but not less than every 50 frames)
                        wallSpawnInterval = Math.max(50, wallSpawnInterval - 5);
                    }
                    return false; // Return false = no collision, player passed through
                } else {
                    // FAILURE! Wrong orientation - this is a collision
                    return true; // Return true = collision happened
                }
            }
        }
        
        return false; // No overlap or already checked = no collision
    }
}

// ============================================
// SETUP FUNCTION - Runs once at start
// ============================================
// This function initializes everything when the page loads
function setup() {
    // Get the canvas element from the HTML page by its ID
    canvas = document.getElementById('game-canvas');
    // Get the 2D drawing context - this is what lets us draw on the canvas
    ctx = canvas.getContext('2d');
    // Set the canvas width in pixels
    canvas.width = 800;
    // Set the canvas height in pixels
    canvas.height = 700;
    
    // Load all the capybara images from the Pics folder
    
    // Create a new Image object for the "up" direction
    capyImages.up = new Image();
    // Set where to load the image from
    capyImages.up.src = 'Pics/capi up.png';
    
    // Create a new Image object for the "down" direction
    capyImages.down = new Image();
    capyImages.down.src = 'Pics/capi down.png';
    
    // Create a new Image object for the "left" direction
    capyImages.left = new Image();
    capyImages.left.src = 'Pics/capi left.png';
    
    // Create a new Image object for the "right" direction
    capyImages.right = new Image();
    capyImages.right.src = 'Pics/capi right.png';
    
    // Create a new Image object for the "special" direction (for long press success)
    capyImages.special = new Image();
    capyImages.special.src = 'Pics/capi special.png';
    
    // Set up keyboard event listeners
    // When any key is pressed down, call the handleKeyPress function
    document.addEventListener('keydown', handleKeyPress);
    // When any key is released, call the handleKeyRelease function
    document.addEventListener('keyup', handleKeyRelease);
    
    // Wait for all images to load before starting the game
    let imagesLoaded = 0; // Counter for how many images have loaded
    const totalImages = 5; // the 5 images to load for the capybara
    
    // Loop through each image in the capyImages object
    Object.values(capyImages).forEach(img => {
        // When an image finishes loading, this function runs
        img.onload = () => {
            imagesLoaded++; // Increment the counter
            // If all images are loaded, start the game
            if (imagesLoaded === totalImages) {
                loop(); // Call loop() to start the game
            }
        };
        
        // If an image fails to load, this function runs
        img.onerror = () => {
            // Log an error message to the console
            console.error('Failed to load image:', img.src);
            imagesLoaded++; // Still increment counter
            // If all images attempted (success or fail), start anyway
            if (imagesLoaded === totalImages) {
                loop(); // Start game with fallback graphics
            }
        };
    });
}

// ============================================
// DRAW CAPYBARA
// ============================================
// This function draws the capybara on the screen
function drawCapybara() {
    // Get the correct image based on capybara's current state
    const img = capyImages[capybara.state];
    
    // Check if image exists and has finished loading
    if (img && img.complete) {
        // Draw the image on the canvas
        // Parameters: image, x position, y position, width, height
        ctx.drawImage(img, capybara.x, capybara.y, capybara.width, capybara.height);
    } else {
        // If image not loaded, draw a brown rectangle as backup
        ctx.fillStyle = '#8B6F47'; // Brown color
        // Draw rectangle: x, y, width, height
        ctx.fillRect(capybara.x, capybara.y, capybara.width, capybara.height);
    }
}

// ============================================
// DRAW UI (Score, Lives, Arrow)
// ============================================
// This function draws all the user interface elements
function drawUI() {
    // Set text color to black
    ctx.fillStyle = '#000';
    // Set font: bold, 28 pixels, Arial font
    ctx.font = 'bold 28px Arial';
    
    // Draw score in top left corner
    ctx.fillText('⭐', 20, 40); // Star emoji at x=20, y=40
    // Convert score number to text and draw it
    ctx.fillText(score.toString(), 60, 40); // Score at x=60, y=40
    
    // Draw lives as hearts in top right corner
    ctx.font = '28px Arial'; // Set font size
    const heartSize = 35; // Space between each heart
    const startX = canvas.width - 130; // Starting x position from right edge
    
    // Loop 3 times for 3 hearts
    for (let i = 0; i < 3; i++) {
        // If this heart number is less than current lives
        if (i < lives) {
            // Draw a filled pink heart
            ctx.fillText('💗', startX + (i * heartSize), 40);
        } else {
            // If life is lost, draw a black heart
            ctx.fillStyle = '#666'; // Gray color
            ctx.fillText('🖤', startX + (i * heartSize), 40);
            ctx.fillStyle = '#000'; // Reset color back to black
        }
    }
    
    // If game is paused for long press, show progress bar
    if (gamePaused && longPressActive) {
        const now = Date.now();
        const pressDuration = now - longPressStartTime;
        const progress = Math.min(pressDuration / longPressDuration, 1); // 0 to 1
        
        // Draw "HOLD SPACE!" text
        ctx.font = 'bold 40px Arial';
        ctx.fillStyle = '#000';
        ctx.fillText('HOLD SPACE!', canvas.width / 2 - 120, canvas.height / 2 - 50);
        
        // Draw progress bar background
        ctx.fillStyle = '#ddd';
        ctx.fillRect(canvas.width / 2 - 150, canvas.height / 2, 300, 30);
        
        // Draw progress bar fill
        ctx.fillStyle = '#FFD700'; // Gold color
        ctx.fillRect(canvas.width / 2 - 150, canvas.height / 2, 300 * progress, 30);
        
        // Draw progress bar border
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.strokeRect(canvas.width / 2 - 150, canvas.height / 2, 300, 30);
        
        return; // Don't draw other UI elements while paused
    }
    
    // Draw arrow indicator showing next required direction
    // Only draw if there is at least one wall on screen
    if (walls.length > 0) {
        const nextWall = walls[0]; // Get the first (closest) wall
        
        // Check if the next wall is a special wall
        if (nextWall.isSpecial) {
            // For special walls, show a different indicator
            ctx.font = 'bold 56px Arial'; // Bigger font
            ctx.fillText('⭐', canvas.width / 2 - 25, 60); // Show star
            // Add text below to explain
            ctx.font = '20px Arial';
            ctx.fillText('PRESS SPACE!', canvas.width / 2 - 65, 90);
        } else {
            // For normal walls, show direction arrow
            ctx.font = 'bold 56px Arial'; // Bigger font for arrow
            
            let arrow = ''; // Variable to hold the arrow symbol
            // Choose arrow based on wall's required direction
            if (nextWall.direction === 'up') arrow = '↑';
            else if (nextWall.direction === 'down') arrow = '↓';
            else if (nextWall.direction === 'left') arrow = '←';
            else if (nextWall.direction === 'right') arrow = '→'; // Right arrow
            
            // Draw arrow in center top of screen
            ctx.fillText(arrow, canvas.width / 2 - 25, 60);
        }
    }
}

// ============================================
// DETECT KEYBOARD SWIPES
// ============================================
// This function analyzes key presses to detect swipe patterns
// Takes an array of keys as input
function detectSwipe(keys) {
    // Check for horizontal swipes (left-to-right for 'right', right-to-left for 'left')
    for (let row of keyOrder) {
        // Map each key to its position in the row, in press order
        let positions = keys.map(k => row.indexOf(k)).filter(p => p !== -1);
        
        if (positions.length >= 2) {
            // Check if positions are sequential (no large gaps)
            let isSequential = true;
            for (let i = 1; i < positions.length; i++) {
                if (Math.abs(positions[i] - positions[i-1]) > 2) isSequential = false;
            }
            
            if (isSequential) {
                // If positions increase (left-to-right press), it's a right swipe
                if (positions[positions.length - 1] > positions[0]) {
                    return 'right';
                }
                // If positions decrease (right-to-left press), it's a left swipe
                if (positions[positions.length - 1] < positions[0]) {
                    return 'left';
                }
            }
        }
    }
    
    // Check for vertical swipes (up or down)
    if (keys.length >= 2) {
        // Map each key to which row it's in
        let rows = keys.map(k => {
            for (let i = 0; i < keyOrder.length; i++) {
                if (keyOrder[i].includes(k)) return i; // Return row index
            }
            return -1; // Key not found
        }).filter(r => r !== -1); // Remove keys not found
        
        // If keys span at least 2 rows
        if (rows.length >= 2 && Math.max(...rows) - Math.min(...rows) >= 1) {
            // If moving from higher row number to lower = up swipe
            if (rows[rows.length - 1] < rows[0]) return 'up';
            // If moving from lower row number to higher = down swipe
            if (rows[rows.length - 1] > rows[0]) return 'down';
        }
    }
    
    return null; // No swipe pattern detected
}

// ============================================
// HANDLE KEYBOARD INPUT
// ============================================
// This function is called every time a key is pressed
// Parameter 'e' is the event object containing info about the key press
function handleKeyPress(e) {
    // Prevent default spacebar behavior (page scrolling)
    if (e.key === ' ') {
        e.preventDefault();
    }
    
    const key = e.key.toLowerCase(); // Get the key pressed and make it lowercase
    const now = Date.now(); // Get current time in milliseconds
    
    // ---- LONG PRESS DETECTION (SPACEBAR ONLY) ----
    // Check if spacebar is pressed and not already active
    if (e.key === ' ' && !longPressActive && !gamePaused) {
        longPressActive = true; // Mark that spacebar is being held
        longPressStartTime = now; // Record when the press started
        longPressCompleted = false; // Reset completion status
        gamePaused = true; // PAUSE THE GAME
        return; // Don't process other inputs while pausing
    }
    
    // Don't process other keys if game is paused
    if (gamePaused) return;
    
    // ---- SWIPE DETECTION ----
    // If too much time passed since last key, reset the sequence
    if (now - lastKeyTime > swipeTimeout) {
        keySequence = []; // Clear the array
    }
    
    keySequence.push(key); // Add the new key to the sequence
    lastKeyTime = now; // Update the last key time
    
    // Keep only the last 5 keys (remove oldest if more than 5)
    if (keySequence.length > 5) keySequence.shift(); // shift() removes first item
    
    // Try to detect a swipe pattern from the key sequence
    const swipe = detectSwipe(keySequence);
    if (swipe) { // If a swipe was detected
        targetDirection = swipe; // Set the target direction
        keySequence = []; // Clear the sequence
    }
    
    // Also allow arrow keys for easier testing/playing
    if (e.key === 'ArrowUp') targetDirection = 'up';
    if (e.key === 'ArrowDown') targetDirection = 'down';
    if (e.key === 'ArrowLeft') targetDirection = 'left';
    if (e.key === 'ArrowRight') targetDirection = 'right';
}

// ============================================
// HANDLE KEYBOARD RELEASE
// ============================================
// This function is called when a key is released (let go)
function handleKeyRelease(e) {
    // If spacebar is released
    if (e.key === ' ' && longPressActive) {
        // Check if the long press was held long enough
        const now = Date.now();
        const pressDuration = now - longPressStartTime;
        
        // If not held long enough, fail the long press
        if (pressDuration < longPressDuration) {
            gamePaused = false; // Unpause game
            longPressActive = false; // Reset long press
            longPressCompleted = false; // Mark as not completed
            isLongPressing = false; // Player failed
            // Player failed to hold long enough - will collide with special wall
        }
    }
}

// ============================================
// CHECK FOR LONG PRESS
// ============================================
// This function checks if spacebar has been held long enough
// Called every frame in the game loop
function checkLongPress() {
    // If spacebar is being held down and game is paused
    if (longPressActive && gamePaused) {
        const now = Date.now(); // Get current time
        const pressDuration = now - longPressStartTime; // How long has key been held?
        
        // If held long enough, complete the long press
        if (pressDuration >= longPressDuration && !longPressCompleted) {
            longPressCompleted = true; // Mark as completed
            isLongPressing = true; // Player successfully long pressed
            gamePaused = false; // UNPAUSE THE GAME
            longPressActive = false; // Reset the active state
            capybara.state = 'special'; // Change to special image for visual feedback
        }
    }
}

// ============================================
// UPDATE CAPYBARA STATE
// ============================================
// This function updates the capybara's direction/orientation
function updateCapybara() {
    // If player has chosen a new direction
    if (targetDirection) {
        capybara.state = targetDirection; // Change capybara's state (resets from 'special' if needed)
        
        // Keep capybara in the same spot regardless of state
        capybara.x = capybaraX; // Reset to fixed X position
        capybara.y = capybaraY; // Reset to fixed Y position
        targetDirection = null; // Clear the target after updating
    }
}

// ============================================
// MAIN GAME LOOP - Runs every frame
// ============================================
// This is the heart of the game - it runs continuously
function loop() {
    // If game is over, stop the loop
    if (!gameRunning) return;
    
    // Clear the entire canvas (erase previous frame)
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background color (semi-transparent green)
    ctx.fillStyle = 'rgba(212, 232, 212, 0.3)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Check for long press progress
    checkLongPress();
    
    // If game is paused, don't update game logic, just draw UI
    if (gamePaused) {
        // Still draw walls and capybara (frozen)
        for (let i = 0; i < walls.length; i++) {
            walls[i].draw();
        }
        drawCapybara();
        drawUI(); // This will show the progress bar
        requestAnimationFrame(loop);
        return;
    }
    
    // Wall spawning logic
    wallSpawnTimer++; // Increment the timer each frame
    // If enough frames have passed, spawn a new wall
    if (wallSpawnTimer >= wallSpawnInterval) {
        walls.push(new Wall()); // Create new wall and add to array
        wallSpawnTimer = 0; // Reset the timer
    }
    
    // Update and draw all walls
    // Loop backwards so we can safely remove walls
    for (let i = walls.length - 1; i >= 0; i--) {
        walls[i].update(); // Move wall left
        walls[i].draw(); // Draw wall on canvas
        
        // Check if this wall collides with capybara
        // Pass the long press state to the collision check
        if (walls[i].checkCollision(capybara, isLongPressing)) {
            lives--; // Player loses a life
            walls.splice(i, 1); // Remove this wall from array
            isLongPressing = false; // Reset long press state after collision
            
            // Check if player has no lives left
            if (lives <= 0) {
                gameRunning = false; // Stop the game
                // Update game over screen with final score
                document.getElementById('final-score').textContent = score;
                // Show the game over screen
                document.getElementById('game-over').style.display = 'block';
            }
        } 
        // Remove walls that have moved off the left side of screen
        else if (walls[i].x + walls[i].width < 0) {
            walls.splice(i, 1); // Remove from array
        }
    }
    
    // After successfully passing a special wall, reset long press
    if (isLongPressing) {
        // Check if the closest wall (that we'd be colliding with) has been passed
        let shouldResetLongPress = true;
        for (let wall of walls) {
            // If there's a special wall close to the capybara that hasn't been passed
            if (wall.isSpecial && !wall.passed && wall.x < capybara.x + capybara.width + 50) {
                shouldResetLongPress = false;
                break;
            }
        }
        // If no close special walls, reset the long press
        if (shouldResetLongPress) {
            isLongPressing = false;
            longPressCompleted = false;
        }
    }
    
    // Update the capybara based on player input
    updateCapybara();
    // Draw the capybara on screen
    drawCapybara();
    
    // Draw all UI elements (score, lives, arrows)
    drawUI();
    
    // Call loop again for the next frame
    // requestAnimationFrame makes it run at ~60 frames per second
    requestAnimationFrame(loop);
}

// ============================================
// START GAME WHEN PAGE LOADS
// ============================================
// When the page finishes loading, call setup()
window.addEventListener('load', setup);