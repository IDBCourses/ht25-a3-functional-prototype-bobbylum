/*  Malmo University
 Interaction Design course 
 Programming Assignment A3: Functional Prototype
 Liv Maury
 liv.maury7@gmail.com
 *
 *
 Game description and "rules" can be found in the README file.
*/

// ----- Variables ------

// DOM element references for const variables assigned in setup
let gameContainer, biggerGuy, potionBar, speechBubble, startScreen, scoreDisplay, timerDisplay;

//Const. variables
const potionVial = "../Pics/Items/Vial1.png"; 
const maxPotionFilled = 10; //limit of the potion fill
const leftStart = '38.5%'; // starting x position of trinkets 
const step = 2; // how much the trinket moves each key press (in %)

//Let variables
let gameStarted = false;  // tracks if game is currently running
let score = 0;    // player's current score
let timer = 20;   // countdown timer in seconds
let timerInterval = null;  // interval ID for the main timer
let trinketChosen = null;  // the current trinket Forest Buddy wants
let potionFilling = false; // whether spacebar is held to fill potion
let potionActive = false;  // whether Forest Buddy is requesting a potion
let potionTimeout = null; // timeout ID for potion request deadline
let potionInterval = null;  // interval ID for potion filling animation
let potionFillCount = 0; // number of potions successfully filled

//------ Arrays -------

// Array to hold trinket DOM elements assigned in setup 
let trinketEls = []; //this array stays empty here but is defined with its elements in setup

// Array of random comments Forest Buddy makes
const biggyComments = [
    "I need my trinket!",
    "Come one, gimme a trinket!",
    "One more trinket, please!",
    "Gimme one of those trinkets!",
    "That's a shiny trinket you have there!",
    "A trinket a day keeps the bad guys away!"
];


// ----- Functions ------

//---- Trinket functions -----

// Resets a trinket element back to its starting position
function resetTrinket(el) {
    el.style.left = leftStart;   // move back to starting position (38.5% from left)
    el.style.opacity = 1;  // make it visible again
    el.dataset.used = 'false'; // mark as unused so it can be moved again
}

// Randomly selects which trinket Forest Buddy wants next
function pickChosenTrinket() {
    const trinkets = document.querySelectorAll('.consumable'); // get all trinket elements
    trinketChosen = Array.from(trinkets)[Math.floor(Math.random() * trinkets.length)]; // pick random trinket
    updateSpeechBubble(trinketChosen.dataset.sprite); // show it in the speech bubble
}

// Moves a trinket one step to the right (towards Forest Buddy)
function moveTrinketStep(trinketEl) {
    if (trinketEl.dataset.used === 'true') return;   // don't move if already used
    
    const currentLeft = parseFloat(trinketEl.style.left || leftStart); // get current position
    const newLeft = currentLeft + step;   // calculate new position
    trinketEl.style.left = newLeft + '%';    // apply new position

    // Get bounding boxes to check if trinket reached Forest Buddy
    const trinketRect = trinketEl.getBoundingClientRect();   // trinket's position on screen
    const biggyRect = biggerGuy.getBoundingClientRect();   // Forest Buddy's position on screen

    // Check if trinket has reached Forest Buddy (right edge of trinket >= left edge of Forest Buddy)
    if (trinketRect.right >= biggyRect.left) {
        if (trinketEl === trinketChosen) {     // correct trinket was delivered
            score++;    // increase score
            showFeedback(true); // show star feedback
            scoreDisplay.textContent = `Score: ${score}`;  // update score display
            updateSpeechBubble(trinketChosen.dataset.sprite); // show next requested trinket
            timer += 20; // give bonus time for correct answer
        } else { // wrong trinket was delivered
            showFeedback(false); // show skull feedback
        }
        
        trinketEl.dataset.used = 'true';    // mark trinket as used
        trinketEl.style.opacity = 0;   // hide the trinket with fade out

        // After short delay, reset trinket and pick new request
        setTimeout(() => {
            resetTrinket(trinketEl); // move trinket back to start
            pickChosenTrinket(); // choose new trinket to request
        }, 200);
    }
}

// Shows visual feedback (star for correct, skull for wrong)
function showFeedback(isCorrect) {
    speechBubble.innerHTML = ''; // clear current content

    // Create image element for feedback
    const feedback = document.createElement('img');
    feedback.src = isCorrect ? '../Pics/Items/Star2.png' : '../Pics/Items/Skull3.png'; // star or skull
    feedback.style.width = '48px'; // set size
    feedback.style.height = '48px';
    speechBubble.appendChild(feedback); // add to speech bubble

    // After 5 seconds, return to showing requested item
    setTimeout(() => {
        if (potionActive) { // if potion is being requested
            updateSpeechBubble('../Pics/Items/Vial1.png'); // show potion
        } else { // otherwise
            updateSpeechBubble(trinketChosen.dataset.sprite); // show requested trinket
        }
    }, 5000);
}

// ----- Potion requests ------

// Initiates a potion filling request from Forest Buddy
function startPotionRequest() {
    if (potionFillCount >= maxPotionFilled) { // max potions already filled
        pickChosenTrinket(); // request trinket instead
        return;
    }
    
    potionActive = true;  // mark potion request as active
    potionFilling = false; // player hasn't started filling yet
    updateSpeechBubble('../Pics/Items/Vial1.png'); // show potion vial in speech bubble
    potionBar.style.width = '0%'; // reset potion bar to empty

    // Set 15 second deadline - game ends if potion not filled in time
    potionTimeout = setTimeout(() => {
        if (potionActive) { // if potion still active (not filled)
            endGame(); // player failed, end game
        }
    }, 15000);
}

// Updates the potion bar fill progress (called repeatedly while spacebar held)
function updatePotion() {
    if (!potionActive || !potionFilling) return; // only update if potion active and player filling

    let currentWidth = parseFloat(potionBar.style.width) || 0; // get current fill level
    if (currentWidth < 100) { // if not full yet
        potionBar.style.width = Math.min(100, currentWidth + 2) + '%'; // increase by 2%, max 100%
        
        if (currentWidth + 2 >= 100) { // potion just became full
            score++; // increase score
            potionFillCount++; // track number of potions filled
            showFeedback(true); // show star feedback
            scoreDisplay.textContent = `Score: ${score}`; // update score display
            clearInterval(potionInterval); // stop filling animation
            clearTimeout(potionTimeout); // cancel the deadline timer
            potionActive = false; // deactivate potion request
            potionFilling = false; // stop filling
            potionBar.style.width = '0%'; // reset bar to empty
            updateSpeechBubble(trinketChosen.dataset.sprite); // show next trinket request
        }
    }
}


// ----- Main timer -----

// Starts the countdown timer for the game
function startTimer() {
    timerInterval = setInterval(() => { // run every second
        if (!gameStarted) return; // only count down if game is running
        timer--; // decrease time by 1 second
        if (timer <= 0) endGame(); // time's up, end game
        timerDisplay.textContent = `Time: ${timer}`; // update display
    }, 1000);
}

// ----- Random potion requests -----

// Randomly decides whether to start a potion request (5% chance per second)
function maybePotionRequest() {
    if (gameStarted && !potionActive) { // only if game running and no active potion
        if (Math.random() < 0.05) startPotionRequest(); // 5% chance to request potion
    }
    setTimeout(maybePotionRequest, 1000); // check again in 1 second
}

// Shows a random comment from Forest Buddy in the speech bubble
function showRandomBiggyComment() {
    if (!gameStarted || potionActive) return; // only show during normal gameplay
    
    const comment = biggyComments[Math.floor(Math.random() * biggyComments.length)]; // pick random comment
    const previousContent = speechBubble.textContent; // save what was shown before
    speechBubble.textContent = comment; // show comment
    
    // After 2 seconds, restore previous content
    setTimeout(() => {
        if (gameStarted && !potionActive) speechBubble.textContent = previousContent;
    }, 2000);
}

// Randomly decides whether or not to show a Forest Buddy comment (30% chance every 5 seconds)
function maybeBiggyComment() {
    if (gameStarted && !potionActive) { // only during normal gameplay
        if (Math.random() < 0.3) showRandomBiggyComment(); // 30% chance to show comment
    }
    setTimeout(maybeBiggyComment, 5000); // check again in 5 seconds
}

// ----- Game control -----

// Starts the game
function startGame() {
    if (gameStarted) return; // prevent starting the game twice
    
    potionFillCount = 0; // reset the potion counter
    gameStarted = true; // mark the game as started
    score = 0; // reset the score
    timer = 20; // set the initial time as 20
    scoreDisplay.textContent = `Score: ${score}`; // update the score display
    timerDisplay.textContent = `Time: ${timer}`; // update the timer display
    startScreen.style.display = 'none'; // hide the starting screen 
    gameContainer.style.display = 'flex'; // show the game container
    
    // Reset all trinkets to starting positions
    for (let i = 0; i < trinketEls.length; i++) resetTrinket(trinketEls[i]);
    
    pickChosenTrinket(); // choose first trinket to request
    startTimer(); // start countdown timer
    maybePotionRequest(); // start checking for potion requests
    maybeBiggyComment(); // start checking for random comments
}

// Updates the speech bubble to show an image
function updateSpeechBubble(imagePath) {
    speechBubble.innerHTML = ''; // clear current content
    const img = document.createElement('img'); // create new image element
    img.src = imagePath; // set image source
    img.style.width = '48px'; // set width
    img.style.height = 'auto'; // auto-set height to maintain original look of the image
    speechBubble.appendChild(img); // add it to speech bubble
}

// End of the game
function endGame() {
    gameStarted = false; // mark game as stopped
    clearInterval(timerInterval); // stop countdown timer
    clearInterval(potionInterval); // stop potion filling animation
    clearTimeout(potionTimeout); // cancel potion deadline
    potionActive = false; // deactivate potion request
    potionFilling = false; // stop filling
    alert(`Game over :( Your score: ${score}`); // show final score as a browser alert
    startScreen.style.display = 'block'; // show start screen again
    gameContainer.style.display = 'none'; // hide game container
}

// ----- EVENT LISTENERS -----
// Key press events
function handleKeyDown(ev) {
    // Shift+P starts the game
    if (ev.shiftKey && ev.code === 'KeyP') {
        ev.preventDefault();
        startGame();
        return;
    }

    // Spacebar starts filling potion if potion is requested
    if (ev.code === 'Space' && potionActive && !potionFilling) {
        potionFilling = true; // mark as filling
        if (potionInterval) clearInterval(potionInterval); // clear any existing interval
        potionInterval = setInterval(updatePotion, 50); // update potion bar every 50ms
    }

    if (!gameStarted || potionActive) return; // only process trinket keys during normal gameplay

    const key = ev.key.toUpperCase(); // get uppercase version of pressed key for it to register properly
    
    // Check each trinket to see if this key controls it
    for (let i = 0; i < trinketEls.length; i++) {
        const trinket = trinketEls[i];
        const keys = trinket.dataset.keys; // get keys assigned to this trinket
        if (keys.includes(key)) { // if pressed key is in this trinket's key set
            moveTrinketStep(trinket); // move the trinket
            ev.preventDefault(); // prevent default browser action
            break; // stop checking other trinkets
        }
    }
}

// Key release events
function handleKeyUp(ev) {
    // When spacebar is released, stop filling the potion bar
    if (ev.code === 'Space') {
        potionFilling = false; // mark as not filling
        if (potionInterval) { // if filling interval exists
            clearInterval(potionInterval); // stop it
            potionInterval = null; // clear reference
        }
    }
}

// Code that runs repeatedly (game loop)
/* loop() currently not in use since all updates are event-driven
function loop() {
    
    
    window.requestAnimationFrame(loop); // schedule next frame
}*/

// Setup runs once at program start to initialize everything
function setup() {
    // Get all the DOM element references and assign them to the file's variables
    gameContainer = document.getElementById('game-container');
    biggerGuy = document.getElementById('bigger-guy');
    potionBar = document.getElementById('potion-bar');
    speechBubble = document.getElementById('speech-bubble');
    startScreen = document.getElementById('start-screen');
    scoreDisplay = document.getElementById('score-display');
    timerDisplay = document.getElementById('timer-display');
    
    // the trinket elements that belong in the trinketEls array
    trinketEls = [
        document.getElementById('trinket1'),
        document.getElementById('trinket2'),
        document.getElementById('trinket3')
    ];
    
    //event listeners for keyboard
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    // Start the game loop - not in use 
    //window.requestAnimationFrame(loop);
}

// Call setup 
setup();