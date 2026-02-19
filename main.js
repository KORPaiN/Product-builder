document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initLotto();
    initRPS();
    initMemoryGame();
});

function initTheme() {
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    if (!themeToggleBtn) {
        console.error('Theme toggle button not found!');
        return;
    }

    const updateButtonText = () => {
        if (document.body.classList.contains('dark-theme')) {
            themeToggleBtn.textContent = 'Light Theme';
        } else {
            themeToggleBtn.textContent = 'Dark Theme';
        }
    };

    const toggleTheme = () => {
        document.body.classList.toggle('dark-theme');
        updateButtonText();
        const theme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
        localStorage.setItem('theme', theme);
    };

    // Initialize state
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
    }
    updateButtonText();

    themeToggleBtn.addEventListener('click', toggleTheme);
}

function initLotto() {
    const lottoContainer = document.getElementById('lotto-container');
    const generateBtn = document.getElementById('generate-btn');

    if (!lottoContainer || !generateBtn) return;

    const getRandomColor = () => {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    };

    const generateNumbers = () => {
        lottoContainer.innerHTML = '';
        const numbers = new Set();
        while (numbers.size < 6) {
            const randomNumber = Math.floor(Math.random() * 45) + 1;
            numbers.add(randomNumber);
        }

        numbers.forEach(number => {
            const lottoBall = document.createElement('div');
            lottoBall.classList.add('lotto-ball');
            lottoBall.textContent = number;
            lottoBall.style.backgroundColor = getRandomColor();
            lottoContainer.appendChild(lottoBall);
        });
    };

    generateBtn.addEventListener('click', generateNumbers);
    generateNumbers(); // Initial generation
}

function initRPS() {
    const startGameBtn = document.getElementById('start-game-btn');
    const playRpsBtn = document.getElementById('play-rps-btn');
    const rpsResult = document.getElementById('rps-result');
    const webcamContainer = document.getElementById('webcam-container');

    if (!startGameBtn || !playRpsBtn || !rpsResult || !webcamContainer) return;

    const URL_RPS = "https://teachablemachine.withgoogle.com/models/-lscwrHBg/";
    let model, webcam, labelContainer, maxPredictions;
    let isGameRunning = false;

    // Map Korean labels to English for comparison
    const labelMap = {
        "주먹": "Rock",
        "가위": "Scissors",
        "보": "Paper"
    };

    async function startRPS() {
        if(isGameRunning) return;
        
        startGameBtn.disabled = true;
        rpsResult.innerText = "Loading model...";
        
        const modelURL = URL_RPS + "model.json";
        const metadataURL = URL_RPS + "metadata.json";

        try {
            if (typeof tmImage === 'undefined') {
                throw new Error("Teachable Machine library not loaded");
            }

            model = await tmImage.load(modelURL, metadataURL);
            maxPredictions = model.getTotalClasses();

            const flip = true; 
            webcam = new tmImage.Webcam(200, 200, flip); 
            await webcam.setup(); 
            await webcam.play();
            window.requestAnimationFrame(loop);

            webcamContainer.appendChild(webcam.canvas);
            
            isGameRunning = true;
            startGameBtn.style.display = 'none';
            playRpsBtn.style.display = 'inline-block';
            rpsResult.innerText = "Show your hand and press 'Shoot!'";
        } catch (error) {
            console.error(error);
            rpsResult.innerText = "Error loading model. Check console.";
            startGameBtn.disabled = false;
        }
    }

    async function loop() {
        webcam.update(); 
        window.requestAnimationFrame(loop);
    }

    async function handlePlay() {
        if(!isGameRunning) return;

        const prediction = await model.predict(webcam.canvas);
        let highestProb = 0;
        let userChoiceKor = "";
        
        for (let i = 0; i < maxPredictions; i++) {
            if (prediction[i].probability > highestProb) {
                highestProb = prediction[i].probability;
                userChoiceKor = prediction[i].className;
            }
        }
        
        const userChoice = labelMap[userChoiceKor] || userChoiceKor; 
        
        const comChoices = ["Rock", "Paper", "Scissors"];
        const comChoice = comChoices[Math.floor(Math.random() * 3)];
        
        let resultMsg = "";
        
        if (userChoice === comChoice) {
            resultMsg = "It's a Tie!";
        } else if (
            (userChoice === "Rock" && comChoice === "Scissors") ||
            (userChoice === "Scissors" && comChoice === "Paper") ||
            (userChoice === "Paper" && comChoice === "Rock")
        ) {
            resultMsg = "You Win! 🎉";
        } else {
            resultMsg = "You Lose! 🤖";
        }
        
        rpsResult.innerHTML = `You: ${userChoice} <br> Com: ${comChoice} <br> <strong>${resultMsg}</strong>`;
    }

    startGameBtn.addEventListener('click', startRPS);
    playRpsBtn.addEventListener('click', handlePlay);
}

function initMemoryGame() {
    const memoryGrid = document.getElementById('memory-grid');
    const moveCountDisplay = document.getElementById('move-count');
    const matchCountDisplay = document.getElementById('match-count');
    const resetBtn = document.getElementById('reset-memory-btn');

    if (!memoryGrid || !moveCountDisplay || !matchCountDisplay || !resetBtn) return;

    const icons = [
        'fa-robot', 'fa-brain', 'fa-microchip', 'fa-network-wired',
        'fa-code', 'fa-database', 'fa-laptop-code', 'fa-server'
    ];
    
    // Create pairs and shuffle
    let cardIcons = [...icons, ...icons];
    let moves = 0;
    let matches = 0;
    let flippedCards = [];
    let lockBoard = false;

    function shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    function createBoard() {
        memoryGrid.innerHTML = '';
        cardIcons = shuffle(cardIcons);
        cardIcons.forEach((iconClass, index) => {
            const card = document.createElement('div');
            card.classList.add('memory-card');
            card.dataset.icon = iconClass;
            card.innerHTML = `<i class="fas ${iconClass}"></i>`;
            card.addEventListener('click', flipCard);
            memoryGrid.appendChild(card);
        });
        
        moves = 0;
        matches = 0;
        moveCountDisplay.textContent = moves;
        matchCountDisplay.textContent = matches;
        flippedCards = [];
        lockBoard = false;
    }

    function flipCard() {
        if (lockBoard) return;
        if (this === flippedCards[0]) return;
        if (this.classList.contains('matched')) return;

        this.classList.add('flipped');
        flippedCards.push(this);

        if (flippedCards.length === 2) {
            moves++;
            moveCountDisplay.textContent = moves;
            checkForMatch();
        }
    }

    function checkForMatch() {
        const [card1, card2] = flippedCards;
        const isMatch = card1.dataset.icon === card2.dataset.icon;

        if (isMatch) {
            disableCards();
        } else {
            unflipCards();
        }
    }

    function disableCards() {
        flippedCards.forEach(card => {
            card.classList.add('matched');
            card.removeEventListener('click', flipCard);
        });
        matches++;
        matchCountDisplay.textContent = matches;
        resetBoard();
        
        if (matches === icons.length) {
            setTimeout(() => {
                alert(`Congratulations! You completed the Neural Memory Match in ${moves} moves!`);
            }, 500);
        }
    }

    function unflipCards() {
        lockBoard = true;
        setTimeout(() => {
            flippedCards.forEach(card => card.classList.remove('flipped'));
            resetBoard();
        }, 1000);
    }

    function resetBoard() {
        flippedCards = [];
        lockBoard = false;
    }

    resetBtn.addEventListener('click', createBoard);
    createBoard();
}