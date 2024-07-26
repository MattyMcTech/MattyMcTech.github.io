// Wait for the DOM to be fully loaded before running the script
document.addEventListener('DOMContentLoaded', (event) => {
    const gameContainer = document.getElementById('game-container');
    const typedWord = document.getElementById('typed-word');
    const scoreValue = document.getElementById('score-value');
    const totalScoreValue = document.getElementById('total-score-value');
    const waveValue = document.getElementById('wave-value');
    const wordsLeftValue = document.getElementById('words-left-value');
    const accuracyValue = document.getElementById('accuracy-value');
    const gameOver = document.getElementById('game-over');
    const waveComplete = document.getElementById('wave-complete');
    const nextWaveBtn = document.getElementById('next-wave-btn');
    const restartBtn = document.getElementById('restart-btn');
    const player = document.getElementById('player');
    const muteBtn = document.getElementById('mute-btn');
    const pauseBtn = document.getElementById('pause-btn');
    const waveCleared = document.getElementById('wave-cleared');
    const waveScore = document.getElementById('wave-score');
    const debugInfo = document.getElementById('debug-info');
    const finalScoreValue = document.getElementById('final-score-value');
    const finalAccuracyValue = document.getElementById('final-accuracy-value');
    const startGameBtn = document.getElementById('start-game-btn');
    const volumeSlider = document.getElementById('volume-slider');
    const virtualKeyboard = document.getElementById('virtual-keyboard');
const keys = virtualKeyboard.querySelectorAll('.key');

    const splatSound = new Audio('assets/sounds/splat.mp3');
    splatSound.volume = 0.3;

    const backgroundMusic = new Audio('assets/sounds/song.mp3');
    backgroundMusic.loop = true;
    backgroundMusic.volume = 0.1;

    const bulletShotSound = new Audio('assets/sounds/bullet.mp3');
    bulletShotSound.volume = 0.3;

    let zombiesShot = 0;
    let totalScore = 0;
    let words = [];
    let currentWave = 1;
    let waveWordCount = 5;
    let wordSpeed = 1.0;
    let baseSpawnRate = 1500;
    let wordsDefeated = 0;
    let wordsSpawned = 0;
    let currentTypedWord = '';
    let currentTargetWord = null;
    let isGameActive = false;
    let gameInterval;
    let isMuted = false;
    let isPaused = false;
    let lettersHitThisWave = 0;
    let audioContext;
    let musicStarted = false;
    let totalKeystrokes = 0;
    let correctKeystrokes = 0;
    let isFirstLoad = true;

    function debugLog(message) {
        console.log(`[DEBUG] ${message}`);
    }

    function updateAccuracy() {
        const accuracy = totalKeystrokes > 0 ? (correctKeystrokes / totalKeystrokes * 100).toFixed(2) : 100;
        accuracyValue.textContent = `${accuracy}%`;
    }
    function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}
    function showVirtualKeyboard() {
  if (isMobileDevice()) {
    virtualKeyboard.classList.remove('hidden');
    adjustGameContainerPadding();
  }
}
    function hideVirtualKeyboard() {
  virtualKeyboard.classList.add('hidden');
  adjustGameContainerPadding();
}
    keys.forEach(key => {
  key.addEventListener('touchstart', (e) => {
    e.preventDefault(); // Prevent default touch behavior
    handleVirtualKeyPress(key.textContent);
    key.classList.add('active');
  });

         key.addEventListener('touchend', (e) => {
    e.preventDefault();
    key.classList.remove('active');
  });
  
  // Keep the click listener for non-touch devices
  key.addEventListener('click', (e) => {
    if (!e.touches) { // Only handle click if it's not a touch event
      handleVirtualKeyPress(key.textContent);
    }
  });
});

    function handleVirtualKeyPress(key) {
  if (key === '⌫') {
    // Handle backspace
    if (currentTypedWord.length > 0) {
      currentTypedWord = currentTypedWord.slice(0, -1);
      if (currentTargetWord) {
        currentTargetWord.hitIndex--;
        currentTargetWord.element.children[currentTargetWord.hitIndex].classList.remove('hit');
      }
      if (currentTypedWord.length === 0) {
        currentTargetWord = null;
      }
    }
  } else {
    updateTypedWord(key.toLowerCase());
  }
  typedWord.textContent = currentTypedWord;
}

    function adjustGameContainerPadding() {
  const keyboardHeight = virtualKeyboard.offsetHeight;
  gameContainer.style.paddingBottom = isMobileDevice() && !virtualKeyboard.classList.contains('hidden') 
    ? `${keyboardHeight}px` 
    : '0';
}

    muteBtn.addEventListener('click', () => {
        isMuted = !isMuted;
        muteBtn.textContent = isMuted ? 'Unmute Sound' : 'Mute Sound';
        splatSound.muted = isMuted;
        backgroundMusic.muted = isMuted;
        bulletShotSound.muted = isMuted;
        
        if (isMuted) {
            backgroundMusic.pause();
        } else if (isGameActive) {
            playBackgroundMusic();
        }
    });

    pauseBtn.addEventListener('click', () => {
        isPaused = !isPaused;
        pauseBtn.textContent = isPaused ? 'Resume' : 'Pause';
        if (isPaused) {
            debugLog("Game paused, stopping music");
            clearInterval(gameInterval);
            backgroundMusic.pause();
        } else {
            debugLog("Game resumed, restarting music");
            gameInterval = setInterval(moveWords, 33);
            forcePlayMusic();
        }
    });

    volumeSlider.addEventListener('input', (e) => {
        const volume = parseFloat(e.target.value);
        splatSound.volume = volume * 0.6;
        backgroundMusic.volume = volume * 0.2;
        bulletShotSound.volume = volume * 0.6;
    });

    backgroundMusic.addEventListener('play', () => {
        debugLog("Background music play event triggered");
    });

    backgroundMusic.addEventListener('playing', () => {
        debugLog("Background music is now playing");
    });

    backgroundMusic.addEventListener('pause', () => {
        debugLog("Background music paused");
    });

    backgroundMusic.addEventListener('error', (e) => {
        debugLog(`Background music error: ${e.target.error.message}`);
    });

    async function getRandomWord(minLength, maxLength) {
        const length = Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength;
        try {
            const response = await fetch(`https://random-word-api.herokuapp.com/word?length=${length}`);
            if (!response.ok) {
                throw new Error('Failed to fetch word');
            }
            const data = await response.json();
            return data[0];
        } catch (error) {
            console.error('Error fetching word:', error);
            return fallbackGetRandomWord(length);
        }
    }

    function fallbackGetRandomWord(length) {
        const characters = 'abcdefghijklmnopqrstuvwxyz';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return result;
    }

    async function spawnWord() {
    if (wordsSpawned >= waveWordCount) return;

    let minLength, maxLength;
    if (currentWave <= 5) {
        minLength = 3;
        maxLength = 5;
    } else if (currentWave <= 10) {
        minLength = 4;
        maxLength = 6;
    } else {
        minLength = 5;
        maxLength = 8;
    }

    const word = await getRandomWord(minLength, maxLength);
    const wordElement = document.createElement('div');
    wordElement.classList.add('enemy-word');
    word.split('').forEach(letter => {
        const span = document.createElement('span');
        span.textContent = letter;
        wordElement.appendChild(span);
    });

    const bullseye = document.createElement('div');
    bullseye.classList.add('bullseye');
    wordElement.appendChild(bullseye);

    wordElement.style.visibility = 'hidden';
    gameContainer.appendChild(wordElement);
    const wordWidth = wordElement.offsetWidth;
    const wordHeight = wordElement.offsetHeight;
    wordElement.style.visibility = 'visible';

    const containerRect = gameContainer.getBoundingClientRect();
    const position = getRandomEdgePosition(wordWidth, wordHeight, containerRect);
    wordElement.style.left = `${position.x}px`;
    wordElement.style.top = `${position.y}px`;

    const individualWordSpeed = wordSpeed * (1 + (word.length - minLength) * 0.05);

    words.push({ 
        element: wordElement, 
        word, 
        hitIndex: 0, 
        x: position.x, 
        y: position.y, 
        speed: individualWordSpeed, 
        bulletsInFlight: 0, 
        isMoving: false,
        edge: position.edge
    });
    wordsSpawned++;
    updateWordsLeft();

    wordElement.classList.add('visible');

    const wordObj = words[words.length - 1];
    if (isMobileDevice()) {
        // For mobile, words always start at the top
        wordObj.y = -wordHeight;
    } else {
        // Existing logic for desktop
        switch (position.edge) {
            case 0: wordObj.y = 0; break;
            case 1: wordObj.x = containerRect.width - wordWidth; break;
            case 2: wordObj.y = containerRect.height - wordHeight; break;
            case 3: wordObj.x = 0; break;
        }
    }
    wordObj.element.style.left = `${wordObj.x}px`;
    wordObj.element.style.top = `${wordObj.y}px`;

    setTimeout(() => {
        wordObj.isMoving = true;
    }, 750);
}

    function getRandomEdgePosition(wordWidth, wordHeight, containerRect) {
    if (isMobileDevice()) {
        // For mobile, only spawn from the top
        return {
            x: Math.random() * (containerRect.width - wordWidth),
            y: -wordHeight,
            edge: 0
        };
    } else {
        // Existing logic for desktop
        const edge = Math.floor(Math.random() * 4);
        let x, y;

        switch (edge) {
            case 0: 
                x = Math.random() * (containerRect.width - wordWidth);
                y = -wordHeight;
                break;
            case 1: 
                x = containerRect.width;
                y = Math.random() * (containerRect.height - wordHeight);
                break;
            case 2: 
                x = Math.random() * (containerRect.width - wordWidth);
                y = containerRect.height;
                break;
            case 3: 
                x = -wordWidth;
                y = Math.random() * (containerRect.height - wordHeight);
                break;
        }

        return { x, y, edge };
    }
}

    function spawnWordWithDelay() {
         if (wordsSpawned < waveWordCount && isGameActive && !isPaused) {
        spawnWord();
        if (wordsSpawned < waveWordCount) {
            const delay = Math.max(500, baseSpawnRate - currentWave * 50);
            setTimeout(spawnWordWithDelay, delay);
        }
    }
    }

   function moveWords() {
    if (isPaused) return;

    const playerRect = player.getBoundingClientRect();
    const centerX = playerRect.left + playerRect.width / 2;
    const centerY = playerRect.top + playerRect.height / 2;

    words.forEach((wordObj) => {
        if (!wordObj.isMoving) return;

        let targetY;
        if (isMobileDevice()) {
            // For mobile, words move straight down
            targetY = centerY;
            const dy = targetY - (wordObj.y + wordObj.element.offsetHeight / 2);
            const distance = Math.abs(dy);
            
            if (distance > 5) {
                wordObj.y += wordObj.speed;
                wordObj.element.style.top = `${wordObj.y}px`;
            } else {
                endGame();
                return;
            }
        } else {
            // Existing logic for desktop
            const dx = centerX - (wordObj.x + wordObj.element.offsetWidth / 2);
            const dy = centerY - (wordObj.y + wordObj.element.offsetHeight / 2);
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 5) {
                const ratio = wordObj.speed / distance;
                wordObj.x += dx * ratio;
                wordObj.y += dy * ratio;
                
                wordObj.element.style.left = `${wordObj.x}px`;
                wordObj.element.style.top = `${wordObj.y}px`;
            } else {
                endGame();
                return;
            }
        }
    });
}

    function updateTypedWord(key) {
       if (!isGameActive || isPaused) return;

    totalKeystrokes++;

    if (!currentTargetWord || !words.includes(currentTargetWord)) {
        const visibleWords = getVisibleWords();
        const matchingWords = visibleWords.filter(w => w.word[0].toLowerCase() === key.toLowerCase());
        
        if (matchingWords.length > 0) {
            const playerRect = player.getBoundingClientRect();
            const playerCenterX = playerRect.left + playerRect.width / 2;
            const playerCenterY = playerRect.top + playerRect.height / 2;

            currentTargetWord = matchingWords.reduce((closest, current) => {
                const closestRect = closest.element.getBoundingClientRect();
                const currentRect = current.element.getBoundingClientRect();

                const closestDistance = Math.sqrt(
                    Math.pow(closestRect.left + closestRect.width / 2 - playerCenterX, 2) +
                    Math.pow(closestRect.top + closestRect.height / 2 - playerCenterY, 2)
                );

                const currentDistance = Math.sqrt(
                    Math.pow(currentRect.left + currentRect.width / 2 - playerCenterX, 2) +
                    Math.pow(currentRect.top + currentRect.height / 2 - playerCenterY, 2)
                );

                return currentDistance < closestDistance ? current : closest;
            });
        } else {
            currentTargetWord = null;
            currentTypedWord = '';
            typedWord.textContent = '';
            updateAccuracy();
            return;
        }
    }

    if (currentTargetWord && currentTargetWord.hitIndex < currentTargetWord.word.length && 
        currentTargetWord.word[currentTargetWord.hitIndex].toLowerCase() === key.toLowerCase()) {
        currentTypedWord += key;
        currentTargetWord.element.children[currentTargetWord.hitIndex].classList.add('hit');
        currentTargetWord.hitIndex++;
        shootBullet(currentTargetWord);
        currentTargetWord.bulletsInFlight++;
        lettersHitThisWave++;
        totalScore++;
        correctKeystrokes++;
        updateTotalScore();
        
        if (currentTargetWord.hitIndex === currentTargetWord.word.length) {
            currentTypedWord = '';
            currentTargetWord = null;
        }
    }

    typedWord.textContent = currentTypedWord;

    updateAccuracy();
    }

    function updateTotalScore() {
        totalScoreValue.textContent = totalScore;
    }

    function handleWordCompletion(targetWord) {
        zombiesShot++;
    scoreValue.textContent = zombiesShot;
    wordsDefeated++;
    
    const rect = targetWord.element.getBoundingClientRect();
    playBloodSplatter(rect.left + rect.width / 2, rect.top + rect.height / 2);
    
    if (!isMuted) {
        splatSound.currentTime = 0;
        splatSound.play();
    }
    
    words = words.filter(w => w !== targetWord);
    targetWord.element.remove();
    updateWordsLeft();
    checkWaveCompletion();
    }

    function dazeWord(wordObj) {
        wordObj.element.classList.add('dazed');
    wordObj.speed *= 0.75;
    setTimeout(() => {
        wordObj.element.classList.remove('dazed');
        wordObj.speed = wordSpeed * (1 + (wordObj.word.length - 3) * 0.05);
    }, 1000);
    }

    function checkWaveCompletion() {
         if (wordsDefeated >= waveWordCount) {
        clearInterval(gameInterval);
        isGameActive = false;
        showWaveClearedPopup();
    } else if (words.length === 0 && wordsSpawned < waveWordCount) {
        spawnWordWithDelay();
    }
    }

    function showWaveClearedPopup() {
         waveScore.textContent = lettersHitThisWave;
    waveCleared.style.display = 'block';
    setTimeout(() => {
        waveCleared.style.display = 'none';
        startNextWave();
    }, 3000);
    }

    function startNextWave() {
        currentWave++;
    waveWordCount ++;
    wordSpeed += 0.2;
    baseSpawnRate = Math.max(500, baseSpawnRate - 25);
    lettersHitThisWave = 0;
    startWave();
    }

    function isElementInViewport(el) {
        const rect = el.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
    }

    function getVisibleWords() {
        return words.filter(({ element }) => isElementInViewport(element));
    }

    function updateWordsLeft() {
        wordsLeftValue.textContent = waveWordCount - wordsDefeated;
    }

    function shootBullet(targetWord) {
        const bullet = document.createElement('div');
    bullet.classList.add('bullet');
    const playerRect = player.getBoundingClientRect();
    const wordRect = targetWord.element.getBoundingClientRect();
    const bullseyeRect = targetWord.element.querySelector('.bullseye').getBoundingClientRect();

    const startX = playerRect.left + playerRect.width / 2;
    const startY = playerRect.top + playerRect.height / 2;
    const endX = bullseyeRect.left + bullseyeRect.width / 2;
    const endY = bullseyeRect.top + bullseyeRect.height / 2;

    bullet.style.left = `${startX}px`;
    bullet.style.top = `${startY}px`;

    const angle = Math.atan2(endY - startY, endX - startX) * (180 / Math.PI);
    bullet.style.transform = `rotate(${angle + 90}deg)`;
    gameContainer.appendChild(bullet);

    if (!isMuted) {
        bulletShotSound.currentTime = 0;
        bulletShotSound.play();
    }

    const animationDuration = 500;
    const startTime = Date.now();

   function animateBullet() {
        const elapsedTime = Date.now() - startTime;
        const progress = Math.min(elapsedTime / animationDuration, 1);

        const currentX = startX + (endX - startX) * progress;
        const currentY = startY + (endY - startY) * progress;

        bullet.style.left = `${currentX - bullet.offsetWidth / 2}px`;
        bullet.style.top = `${currentY - bullet.offsetHeight / 2}px`;

        if (progress < 1) {
            requestAnimationFrame(animateBullet);
        } else {
            bullet.remove();
            targetWord.bulletsInFlight--;
            dazeWord(targetWord);
            
            // Always play the hit sound if not muted
            if (!isMuted) {
                const bulletHitSound = new Audio('https://github.com/MattyMcTech/WordWarZ/raw/main/bulletHit.mp3');
                bulletHitSound.volume = 0.3;
                bulletHitSound.play();
            }
            
            // Check if the word is completed after playing the sound
            if (targetWord.bulletsInFlight === 0 && targetWord.hitIndex === targetWord.word.length) {
                handleWordCompletion(targetWord);
            }
        }
    }

    requestAnimationFrame(animateBullet);
    }

    function playBloodSplatter(x, y) {
        const bloodSplatter = document.createElement('div');
    bloodSplatter.classList.add('blood-splatter');
    bloodSplatter.style.left = `${x - 50}px`;
    bloodSplatter.style.top = `${y - 50}px`;
    gameContainer.appendChild(bloodSplatter);

    setTimeout(() => {
        bloodSplatter.remove();
    }, 1000);
    }

    function initAudioContext() {
        debugLog("Initializing audio context");
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        debugLog("New audio context created");
    }
    if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
            debugLog("Audio context resumed");
            forcePlayMusic();
        }).catch(error => {
            debugLog(`Error resuming audio context: ${error}`);
        });
    } else {
        debugLog(`Audio context state: ${audioContext.state}`);
        forcePlayMusic();
    }
    }

    function playBackgroundMusic() {
          debugLog("Attempting to play background music");
    if (!isMuted) {
        backgroundMusic.play()
            .then(() => {
                debugLog("Music started successfully");
            })
            .catch(error => {
                debugLog(`Error starting music: ${error}`);
            });
    } else {
        debugLog("Music is muted, not playing");
    }
    }

    document.addEventListener('keydown', (event) => {
         if (!isGameActive || isPaused) return;

    if (event.key === 'Backspace') {
        if (currentTypedWord.length > 0) {
            currentTypedWord = currentTypedWord.slice(0, -1);
            if (currentTargetWord) {
                currentTargetWord.hitIndex--;
                currentTargetWord.element.children[currentTargetWord.hitIndex].classList.remove('hit');
            }
            if (currentTypedWord.length === 0) {
                currentTargetWord = null;
            }
        }
    } else if (event.key.length === 1) {
        updateTypedWord(event.key);
    }
    typedWord.textContent = currentTypedWord;
    });

    function startWave() {
         isGameActive = true;
    wordsDefeated = 0;
    wordsSpawned = 0;
    words.forEach(({ element }) => element.remove());
    words = [];
    currentTypedWord = '';
    currentTargetWord = null;
    typedWord.textContent = '';
    waveComplete.style.display = 'none';
    gameOver.style.display = 'none';
    waveCleared.style.display = 'none';
    waveValue.textContent = currentWave;
    updateWordsLeft();

    gameInterval = setInterval(moveWords, 33);
    spawnWordWithDelay();
    showVirtualKeyboard();
    }

    function forcePlayMusic() {
        debugLog("Entering forcePlayMusic function");
    if (isMuted) {
        debugLog("Music is muted, not playing");
        return;
    }
    debugLog("Attempting to play background music");
    backgroundMusic.currentTime = 0;
    let playPromise = backgroundMusic.play();
    if (playPromise !== undefined) {
        playPromise.then(_ => {
            debugLog("Music playback started successfully");
        })
        .catch(error => {
            debugLog(`Music playback failed: ${error}`);
            setTimeout(forcePlayMusic, 1000);
        });
    } else {
        debugLog("Play promise is undefined, browser might not support promises for audio playback");
    }
    }

    function endGame() {
        isGameActive = false;
    clearInterval(gameInterval);
    
    // Update final score and accuracy
    finalScoreValue.textContent = totalScore;
    finalAccuracyValue.textContent = `${(correctKeystrokes / totalKeystrokes * 100).toFixed(2)}%`;
    
    // Clear any remaining words
    words.forEach(({ element }) => element.remove());
    words = [];
    
    // Hide game elements
    typedWord.textContent = '';
    waveComplete.style.display = 'none';
    waveCleared.style.display = 'none';
    
    // Show game over screen
    gameOver.style.display = 'flex';
    gameOver.style.zIndex = '2000';
    
    // Hide start button
    startGameBtn.style.display = 'none';
    

    backgroundMusic.pause();
    hideVirtualKeyboard();
    }

    function hideStartButton() {
        startGameBtn.style.display = 'none';
    }

    function showStartButton() {
        if (isFirstLoad || gameOver.style.display !== 'flex') {
            startGameBtn.style.display = 'block';
            gameOver.style.display = 'none';
            waveComplete.style.display = 'none';
            waveCleared.style.display = 'none';
        }
    }

    function initGame() {
         debugLog("Initializing game");
    isFirstLoad = false;
    zombiesShot = 0;
    totalScore = 0;
    scoreValue.textContent = zombiesShot;
    totalScoreValue.textContent = totalScore;
    currentWave = 1;
    waveWordCount = 5;
    wordSpeed = 1.0;
    baseSpawnRate = 1500;
    lettersHitThisWave = 0;
    totalKeystrokes = 0;
    correctKeystrokes = 0;
    
    gameOver.style.display = 'none';  // Ensure game over screen is hidden
    
    startWave();
    debugLog("Calling forcePlayMusic from initGame");
    forcePlayMusic();
    }

    restartBtn.addEventListener('click', () => {
        gameOver.style.display = 'none';
        hideStartButton();
        initGame();
        playBackgroundMusic();
        showVirtualKeyboard();
    });

    startGameBtn.addEventListener('click', () => {
        debugLog("Start game button clicked");
        hideStartButton();
        initAudioContext();
        initGame();
        debugLog("Calling forcePlayMusic from start button click");
        forcePlayMusic();
    });
    window.addEventListener('resize', adjustGameContainerPadding);
    showStartButton();
});
