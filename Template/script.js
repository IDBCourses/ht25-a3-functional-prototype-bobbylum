//------------------VARIABLES------------------


// ---Game Container---

// DOM element that holds the game
let gameContainer; // the container div for the game

// ---Game state variables---

// variables to keep track of the current state of the game
let score = 0; // How many walls the player has successfully passed
let lives = 3; // How many lives the player has left (3 at start of the game)
let gameSpeed = 3; // How fast walls move across the screen (pixels per frame)
let gameRunning = true; // Is the game currently running? (true) or over? (false)
let gamePaused = false; // Is the game paused for long press? (true = paused, false = playing)


// ---Wall variables---

// variables for the walls (obstacles)
let walls = []; // array that stores all the current wall objects on the screen
let wallSpawnTimer = 0; // counts the game frames to know when to spawn the next wall
let wallSpawnInterval = 150; // how many frames to scroll until new wall appears
let colorIndex = 0; // keeps track of which color to use for the next wall
// array for the colors that walls can be - cycles through these
const wallColors = [ '#ff0f7b', '#fe266d', '#fd3e60', '#fc5552', '#fa6c44', '#f98437', '#f89b29' ];
// the possible directions a wall can require 
const directions = [ 'up', 'down', 'left', 'right' ];
// special wall for the long press
const specialWallChance = 0.2; // 20% chance of spawning a special wall


// ---Capybara variables---

// variables for the capybara
const capybaraX = 150; // fixed X position (horizontal) where the capybara stays
const capybaraY = 325; // fixed Y position (vertical) where the capybara stays
let targetDirection = null; // direction the capybara wants to change to
let isLongPressing = false; // is the player currently doing a long press?

// object to store all the capybara images for the different directions
let capyImages = {
    up: 'url("./Pics/capi up.png")',
    down: 'url("./Pics/capi down.png")',
    left: 'url("./Pics/capi left.png")',
    right: 'url("./Pics/capi right.png")',
    special: 'url("./Pics/capi special.png")'
};

// the main capybara object that stores its position, size, and current state
let capybara = {
    x: capybaraX, // x position (horizontal)
    y: capybaraY, // y position (vertical)
    width: 80, // width of the capybara image 
    height: 80, // height of the capybara image 
    state: 'right' // direction the capybara starts in
};


//------------------KEYS SETTINGS------------------

// the game is based on a british QWERTY keyboard layout
// detects when the player "swipes" across their letter keys
const keyOrder = [
    [ 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p' ], // Top row
    [ 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l' ], // Middle row
    [ 'z', 'x', 'c', 'v', 'b', 'n', 'm' ] // Bottom row
];
let keySequence = []; // array to store the last few keys pressed in order
let lastKeyTime = 0; // timestamp of when the last key was pressed
const swipeTimeout = 200; // how many milliseconds before the new arrow is decided

// ---Long press detection---

let longPressActive = false; // is the spacebar currently being held?
let longPressStartTime = 0; // when did the long press start
const longPressDuration = 1000; // how long to hold (in ms) -> 1 second
let longPressCompleted = false; // has the long press been completed?


//------------------WALL SETTINGS------------------

// ---Wall class---

// the class serves as a "blueprint" for creating the wall objects
// each wall is an obstacle the capybara needs to get through
class Wall {
    // Constructor runs when you create a new wall -> new Wall()
    constructor() {
        this.x = 800; // start the walls at the right edge of the game container (fixed width)
        this.width = 15; // how thick the wall is in pixels
        this.height = 700; // make the wall as tall as the game container (fixed height)

        // decide if the next wall is going to be a special wall 
        this.isSpecial = Math.random() < specialWallChance; // random chance for special wall

        // pick a color - special walls are gold, normal walls follow the other set wall colors 
        if (this.isSpecial) {
            this.color = '#9f8702'; // pick gold color for the special walls
        } else {
            // pick a color from the wallColors array 
            this.color = wallColors[ colorIndex % wallColors.length ];
            colorIndex++; // increment so the next wall gets a different color
        }

        // create DOM element for the wall
        this.el = document.createElement('div');
        this.el.className = this.isSpecial ? 'wall special-wall' : 'wall';
        this.el.style.width = this.width + 'px';
        this.el.style.height = this.height + 'px';
        this.el.style.left = this.x + 'px';
        this.el.style.top = '0px';
        this.el.style.backgroundColor = this.color;
        gameContainer.appendChild(this.el);

        // randomly pick one of the directions for the arrow (up, down, left, or right) 
        this.direction = directions[ Math.floor(Math.random() * directions.length) ];
        this.passed = false; // has the player properly passed the wall?
        this.checked = false; // has the game checked for collision for this wall?
    }

    // move the wall to the left each frame
    update() {
        this.x -= gameSpeed; // subtract gameSpeed from x position (moves left)
        this.el.style.left = this.x + 'px'; // update DOM position
    }

    // --Wall collision check--

    // this takes the capybara object as a parameter
    checkCollision(capy, playerIsLongPressing) {
        // if the wall is already passed or checked, don't check it again
        if (this.passed || this.checked) return false;

        // check if the capybara image and wall overlap horizontally
        // capy.x < this.x + this.width -> capy's left edge is left of wall's right edge
        // capy.x + capy.width > this.x -> capy's right edge is right of wall's left edge
        const overlapX = capy.x < this.x + this.width && capy.x + capy.width > this.x;

        // if they overlap horizontally and it hasn't been checked yet
        if (overlapX && !this.checked) {
            this.checked = true; // mark it as checked so it's only checked once

            // -> special wall logic - requires the long press to get through the special state
            if (this.isSpecial) {
                // the player must be long pressing or already be in the special state to pass through the special wall
                if (playerIsLongPressing || capy.state === 'special') {
                    // succesful if the player is long pressing or in special state
                    this.passed = true; // mark the wall as successfully passed
                    score += 2; // special walls give 2 points instead of 1 for the normal walls

                    // every 5 walls, make the game faster
                    if (score % 5 === 0) {
                        gameSpeed += 0.5; // walls move faster
                        // the walls spawn more frequently (but not less than every 50 framesn)
                        wallSpawnInterval = Math.max(50, wallSpawnInterval - 5);
                    }
                    return false; // if it returns false => no collision, the player passed through
                } else {
                    // otherwise if the player is not long pressing and the wall is not special -> collision
                    return true;// return true => collision happened
                }
            }
            // -> normal wall logic - requires the capybara to be matching directions with the current arrow
            else {
                // check if the capybara's direction matches the arrow for this wall
                if (capy.state === this.direction) {
                    // siuccessful if the capybara is in the correct position
                    this.passed = true; // mark the wall as successfully passed
                    score++; // increase the player's score by 1

                    // every 5 walls, make the game harder
                    if (score % 5 === 0) {
                        gameSpeed += 0.5; // walls move a bit faster
                        // the walls spawn more frequently (but not less than every 50 frames)
                        wallSpawnInterval = Math.max(50, wallSpawnInterval - 5);
                    }
                    return false; // if it returns false => no collision, the player passed through
                } else {
                    // Fotherwise if the capybara is in the Wrong orientation -> collision
                    return true; // return true => collision happened
                }
            }
        }

        return false; // if there's no overlap or it's already been checked = no collision
    }
}



//------------------DRAWING------------------

//---Drawing the capybara---

// function to draw the capybara on the screen
function drawCapybara() {
    // update the capybara DOM element based on the state
    let capybaraEl = document.getElementById('capybara');
    capybaraEl.style.left = capybara.x + 'px';
    capybaraEl.style.top = capybara.y + 'px';
    // set the background image based on the state
    capybaraEl.style.backgroundImage = capyImages[ capybara.state ] || capyImages[ 'right' ];
}

// ---Drawing the UI (score, lives, arrow)---

// function to draw all the user interface elements
function drawUI() {
    // update the score
    document.getElementById('ui-score').textContent = '⭐ ' + score;

    // update the lives
    let livesText = '';
    for (let i = 0; i < 3; i++) {
        if (i < lives) {
            livesText += '💗'; // red heart for current lives
        } else {
            livesText += '🖤'; // black heart for lost lives
        }
    }
    document.getElementById('ui-lives').textContent = livesText;

    // update the arrows or special star indicator
    let uiArrow = document.getElementById('ui-arrow');
    if (walls.length > 0) {
        const nextWall = walls[ 0 ];
        // if the wall is special, show the star and "hold space" message
        if (nextWall.isSpecial) {
            uiArrow.innerHTML = '⭐<br><span style="font-size: 20px; text-align: center;">HOLD SPACE!</span>';
        //if the wall is normal, show the arrow in the direction chosen
        } else {
            const arrows = { up: '↑', down: '↓', left: '←', right: '→' };
            uiArrow.textContent = arrows[ nextWall.direction ] || '';
        }
    } else {
        uiArrow.textContent = '';
    }

    // if the game is paused for the long press, show the progress bar
    if (gamePaused && longPressActive) {
        const now = Date.now();
        const pressDuration = now - longPressStartTime;
        const progress = Math.min(pressDuration / longPressDuration, 1);
        document.getElementById('progress-fill').style.width = (progress * 100) + '%';
        document.getElementById('progress-bar').style.display = 'block';
        document.getElementById('hold-text').style.display = 'block';
    } else {
        document.getElementById('progress-bar').style.display = 'none';
        document.getElementById('hold-text').style.display = 'none';
    }
}

//------------------KEYBOARD------------------

//---Swipe detection---

// function to analyse key presses to detect swipe patterns
// takes the keys array as input
function detectSwipe(keys) {
    // checks for horizontal swipes (left-to-right for 'right', right-to-left for 'left')
    for (let row of keyOrder) {
        // map each key to its position in the row, in its press order
        let positions = keys.map(k => row.indexOf(k)).filter(p => p !== -1);

        if (positions.length >= 2) {
            // require for the keys to span at least 2 different positions in the row in case of a key skip 
            let span = Math.max(...positions) - Math.min(...positions);
            if (span >= 1) {
                // allow skipping keys: just check if the overall direction based on the first and last key positions
                if (positions[ positions.length - 1 ] > positions[ 0 ]) {
                    return 'right';
                }
                if (positions[ positions.length - 1 ] < positions[ 0 ]) {
                    return 'left';
                }
            }
        }
    }

    // check for vertical swipes (up or down)
    if (keys.length >= 2) {
        // map each key to which row it's in (top, middle or bottom)
        let rows = keys.map(k => {
            for (let i = 0; i < keyOrder.length; i++) {
                if (keyOrder[ i ].includes(k)) return i; // return the row index
            }
            return -1; // key not found
        }).filter(r => r !== -1); // remove the keys not found

        // if the keys span at least 2 rows
        if (rows.length >= 2 && Math.max(...rows) - Math.min(...rows) >= 1) {
            // if moving from higher row number to lower -> up swipe
            if (rows[ rows.length - 1 ] < rows[ 0 ]) return 'up';
            // if moving from lower row number to higher -> down swipe
            if (rows[ rows.length - 1 ] > rows[ 0 ]) return 'down';
        }
    }

    return null; // no swipe pattern detected
}

// ---Handle keyboard input---

// this function is called every time a key is pressed
// 'e' parameter is the event object containing the info about the key press
function handleKeyPress(e) {
    // prevent default spacebar behavior (page scrolling)
    if (e.key === ' ') {
        e.preventDefault();
    }

    const key = e.key.toLowerCase(); // get the key pressed and make it into lowercase
    const now = Date.now(); // get the current time in milliseconds

    // -Long press detection for the spacebar-

    // check if the spacebar is pressed and not already active
    if (e.key === ' ' && !longPressActive && !gamePaused) {
        longPressActive = true; // mark that the spacebar is being held
        longPressStartTime = now; // record when the press started
        longPressCompleted = false; // reset the completion status
        gamePaused = true; // pause the game
        return; // don't process other inputs while pausing
    }

    // don't process other keys if the game is paused
    if (gamePaused) return;

    // -Swipe detection-

    // if too much time passed since the last key press, reset the sequence
    if (now - lastKeyTime > swipeTimeout) {
        keySequence = []; // clear the array
    }

    keySequence.push(key); // add the new key to the sequence
    lastKeyTime = now; // update the last key time

    // keep only the last 5 keys (remove the oldest if > 5)
    if (keySequence.length > 5) keySequence.shift(); // shift() removes the first item

    // try to detect a swipe pattern from the key sequence
    const swipe = detectSwipe(keySequence);
    if (swipe) { // if a swipe was detected
        targetDirection = swipe; // set the target direction
        keySequence = []; // clear the sequence
    }

    /* TEST for capybara image moving => allow arrow keys
    if (e.key === 'ArrowUp') targetDirection = 'up';
    if (e.key === 'ArrowDown') targetDirection = 'down';
    if (e.key === 'ArrowLeft') targetDirection = 'left';
    if (e.key === 'ArrowRight') targetDirection = 'right';*/
}

// ---Handle keyboard release---

// function is called when a key is released
function handleKeyRelease(e) {
    // if the spacebar is released
    if (e.key === ' ' && longPressActive) {
        // check if the long press was held long enough
        const now = Date.now();
        const pressDuration = now - longPressStartTime;

        // if it's not held long enough, fail the long press
        if (pressDuration < longPressDuration) {
            gamePaused = false; // unpause game
            longPressActive = false; // reset the long press
            longPressCompleted = false; // mark as not completed
            isLongPressing = false; // player isn't long pressing
            // player has failed to hold long enough - will collide with special wall if not pressed long enough in time again
        }
    }
}

// ---Check for long press---

// function checks if the spacebar has been held long enough
// called every frame in the game loop
function checkLongPress() {
    // if the spacebar is being held down and the game is paused
    if (longPressActive && gamePaused) {
        const now = Date.now(); // get current time
        const pressDuration = now - longPressStartTime; // how long has space been held?

        // if it's held long enough, complete the long press
        if (pressDuration >= longPressDuration && !longPressCompleted) {
            longPressCompleted = true; // mark as completed
            isLongPressing = true; // player successfully long pressed
            gamePaused = false; // unpause the game
            longPressActive = false; // reset the active state
            capybara.state = 'special'; // change to the capi special image for visual feedback that it worked
        }
    }
}


//------------------CAPYBARA IMAGE UPDATE------------------

// function updates the capybara's direction
function updateCapybara() {
    // if the player has chosen a new direction
    if (targetDirection) {
        capybara.state = targetDirection; // change the capybara's state (resets from 'special state' if needed)

        // keep the capybara in the same spot no matter the state
        capybara.x = capybaraX; // reset to fixed X position
        capybara.y = capybaraY; // reset to fixed Y position
        targetDirection = null; // clear the target after updating
    }
}


//------------------SETUP AND LOOP------------------

function setup() {
    // get the game container element from the HTML page
    gameContainer = document.getElementById('game-container');

    // create the capybara DOM element
    let capybaraEl = document.createElement('div');
    capybaraEl.id = 'capybara';
    capybaraEl.style.left = capybara.x + 'px';
    capybaraEl.style.top = capybara.y + 'px';
    capybaraEl.style.backgroundImage = capyImages[ 'right' ]; // Start with right image
    gameContainer.appendChild(capybaraEl);

    // create the UI elements
    let uiScore = document.createElement('div');
    uiScore.id = 'ui-score';
    uiScore.textContent = '⭐ 0';
    gameContainer.appendChild(uiScore);

    let uiLives = document.createElement('div');
    uiLives.id = 'ui-lives';
    uiLives.textContent = '💗💗💗';
    gameContainer.appendChild(uiLives);

    let uiArrow = document.createElement('div');
    uiArrow.id = 'ui-arrow';
    gameContainer.appendChild(uiArrow);

    // create the progress bar elements
    let progressBar = document.createElement('div');
    progressBar.id = 'progress-bar';
    let progressFill = document.createElement('div');
    progressFill.id = 'progress-fill';
    progressBar.appendChild(progressFill);
    gameContainer.appendChild(progressBar);

    let holdText = document.createElement('div');
    holdText.id = 'hold-text';
    holdText.textContent = 'HOLD SPACE!';
    gameContainer.appendChild(holdText);

    // set up the keyboard event listeners
    // when any key is pressed down, call the handleKeyPress function
    document.addEventListener('keydown', handleKeyPress);

    // when any key is released, call the handleKeyRelease function
    document.addEventListener('keyup', handleKeyRelease);

    // load the capybara images
    let imagesLoaded = 0;
    const totalImages = 5;
    const imageKeys = [ 'up', 'down', 'left', 'right', 'special' ];

    imageKeys.forEach(key => {
        let img = new Image();
        img.src = capyImages[ key ].replace('url(', '').replace(')', ''); // extract the path
        img.onload = () => {
            imagesLoaded++;
            if (imagesLoaded === totalImages) {
                loop(); // start the game when all images are successfully loaded
            }
        };
        img.onerror = () => {
            console.error('Failed to load image:', img.src);
            imagesLoaded++;
            if (imagesLoaded === totalImages) {
                loop(); // start anyway even with fallbacks -> use background color for image to check if loaded if capybara doesn't appear
            }
        };
    });
}

// runs throughout the game continuously
function loop() {
    // if game is over, stop the loop
    if (!gameRunning) return;

    // check for long press progress
    checkLongPress();

    // if the game is paused, don't update game logic, just draw UI
    if (gamePaused) {
        // update UI for paused state
        drawUI();
        requestAnimationFrame(loop);
        return;
    }

    // --Wall spawning logic--

    wallSpawnTimer++; // increment the timer each frame
    // if enough frames have passed, spawn a new wall
    if (wallSpawnTimer >= wallSpawnInterval) {
        walls.push(new Wall()); // create new wall and add it to the array
        wallSpawnTimer = 0; // reset the spawn timer
    }

    // --Update and draw all walls--

    // Loop backwards so wall can be safely removed
    for (let i = walls.length - 1; i >= 0; i--) {
        walls[ i ].update(); // move the wall left

        // check if the wall collides with the capybara
        // pass the long press state to the collision check
        if (walls[ i ].checkCollision(capybara, isLongPressing)) {
            lives--; // player loses a life on collision
            gameContainer.removeChild(walls[ i ].el); // remove the wall element
            walls.splice(i, 1); // remove from array
            isLongPressing = false; // reset long press state after collision

            //--Game over--

            // check if the player has any lives left
            if (lives <= 0) {
                gameRunning = false; // stop the game
                // update the game over screen with final score
                document.getElementById('final-score').textContent = score;
                // show the game over screen
                document.getElementById('game-over').style.display = 'block';
            }
        }
        // remove walls that have moved off the left side of screen to prevent crashing
        else if (walls[ i ].x + walls[ i ].width < 0) {
            gameContainer.removeChild(walls[ i ].el); // remove wall element
            walls.splice(i, 1); // remove from the array
        }
    }

    // after successfully passing a special wall, reset the long press
    if (isLongPressing) {
        // check if the closest wall (that we'd be colliding with) has been passed
        let shouldResetLongPress = true;
        for (let wall of walls) {
            // if there's a special wall close to the capybara that hasn't been passed
            if (wall.isSpecial && !wall.passed && wall.x < capybara.x + capybara.width + 50) {
                shouldResetLongPress = false;
                break;
            }
        }
        // if there's no special walls close, reset the long press
        if (shouldResetLongPress) {
            isLongPressing = false;
            longPressCompleted = false;
        }
    }

    // call to update the capybara based on player input
    updateCapybara();
    // call to draw the capybara on screen
    drawCapybara();

    // call to draw all UI elements (score, lives, arrows)
    drawUI();

    // call loop again for the next frame
    // requestAnimationFrame makes it run at approx. 60 frames per second
    requestAnimationFrame(loop);
}


// when the page finishes loading, call setup()
window.addEventListener('load', setup);