// main.js - 습관 디자인 코치

// Firebase 설정 및 초기화
const firebaseConfig = {
    apiKey: "AIzaSyBauvvnnl0qfBUoiWwR4TWUqYA5hiaAftM",
    authDomain: "loginhabittracker-491f0.firebaseapp.com",
    projectId: "loginhabittracker-491f0",
    storageBucket: "loginhabittracker-491f0.firebasestorage.app",
    messagingSenderId: "641004626839",
    appId: "1:641004626839:web:04a6c240d6b14391675ad2"
};

let auth, db, provider;
let currentUser = null;
let currentHabitDesign = null;

if (window.firebase) {
    firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();
    provider = new firebase.auth.GoogleAuthProvider();
}

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initHabitDesigner();
});

function initTheme() {
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    if (!themeToggleBtn) return;

    const updateButtonText = () => {
        themeToggleBtn.textContent = document.body.classList.contains('dark-theme') ? '라이트 모드' : '다크 모드';
    };

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
    }
    updateButtonText();

    themeToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark-theme');
        updateButtonText();
        localStorage.setItem('theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
    });
}

function initHabitDesigner() {
    const goalInput = document.getElementById('goal-input');
    const designBtn = document.getElementById('design-habit-btn');
    const loadingSpinner = document.getElementById('loading-spinner');
    const resultContainer = document.getElementById('result-container');

    if (!designBtn) return;

    const anchorText = document.getElementById('anchor-text');
    const tinyActionText = document.getElementById('tiny-action-text');
    const celebrationText = document.getElementById('celebration-text');
    const difficultyLadder = document.getElementById('difficulty-ladder');
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userProfile = document.getElementById('user-profile');
    const userNameSpan = document.getElementById('user-name');
    const navTrackerLink = document.getElementById('nav-tracker-link');
    const saveHabitBtn = document.getElementById('save-habit-btn');
    const anchorInput = document.getElementById('anchor-input');
    const addRoutineBtn = document.getElementById('add-routine-btn');
    const myRoutinesContainer = document.getElementById('my-routines-container');
    const myRoutineChips = document.getElementById('my-routine-chips');
    const recommendationChips = document.querySelectorAll('.anchor-chip:not(#my-routine-chips .anchor-chip)');

    let isRequesting = false;
    let lastRequestTime = 0;

    // --- 내 트래커 링크 상시 노출 및 로그인 유도 ---
    navTrackerLink?.addEventListener('click', (e) => {
        if (!currentUser) {
            e.preventDefault(); // 페이지 이동 방지
            alert('습관 트래커를 이용하려면 먼저 로그인이 필요합니다! 구글 로그인을 진행합니다.');
            auth.signInWithPopup(provider).catch(e => console.error(e));
        }
    });

    // --- 추천 칩 클릭 이벤트 ---
    recommendationChips.forEach(chip => {
        chip.addEventListener('click', () => {
            anchorInput.value = chip.dataset.anchor;
            updateActiveChip(chip);
        });
    });

    function updateActiveChip(activeChip) {
        document.querySelectorAll('.anchor-chip').forEach(c => c.classList.remove('active'));
        activeChip.classList.add('active');
    }

    // --- 나의 루틴(앵커) 저장 로직 ---
    addRoutineBtn?.addEventListener('click', async () => {
        if (!currentUser) {
            alert('루틴을 저장하려면 로그인이 필요합니다!');
            return;
        }
        const anchor = anchorInput.value.trim();
        if (!anchor) return;

        addRoutineBtn.disabled = true;
        try {
            await saveUserAnchor(currentUser.uid, anchor);
            anchorInput.value = '';
            loadUserAnchors(currentUser.uid); // 새로고침
        } catch (e) {
            console.error(e);
        } finally {
            addRoutineBtn.disabled = false;
        }
    });

    async function saveUserAnchor(uid, anchor) {
        const anchorsRef = db.collection('users').doc(uid).collection('anchors');
        // 중복 체크
        const snapshot = await anchorsRef.where('text', '==', anchor).get();
        if (snapshot.empty) {
            await anchorsRef.add({
                text: anchor,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    }

    async function loadUserAnchors(uid) {
        const snapshot = await db.collection('users').doc(uid).collection('anchors')
                                 .orderBy('createdAt', 'desc').limit(10).get();
        
        myRoutineChips.innerHTML = '';
        if (snapshot.empty) {
            myRoutinesContainer.classList.add('hidden');
            return;
        }

        myRoutinesContainer.classList.remove('hidden');
        snapshot.forEach(doc => {
            const data = doc.data();
            const chip = document.createElement('button');
            chip.className = 'anchor-chip';
            chip.dataset.anchor = data.text;
            chip.textContent = `⭐ ${data.text}`;
            chip.onclick = () => {
                anchorInput.value = data.text;
                updateActiveChip(chip);
            };
            myRoutineChips.appendChild(chip);
        });
    }

    // --- Firebase Auth (로그인 상태 전환) ---
    auth.onAuthStateChanged((user) => {
        if (user) {
            // 로그인 상태
            currentUser = user;
            userNameSpan.textContent = `${user.displayName}님`;
            loginBtn.classList.add('hidden');
            logoutBtn.classList.remove('hidden');
            userProfile.classList.remove('hidden');
            loadUserAnchors(user.uid);
        } else {
            // 로그아웃 상태
            currentUser = null;
            userNameSpan.textContent = '';
            loginBtn.classList.remove('hidden');
            logoutBtn.classList.add('hidden');
            userProfile.classList.add('hidden');
        }
    });

    // 구글 로그인 클릭
    loginBtn?.addEventListener('click', async () => {
        try {
            await auth.signInWithPopup(provider);
        } catch (error) {
            console.error(error);
            alert("로그인 중 오류가 발생했습니다.");
        }
    });

    // 로그아웃 클릭
    logoutBtn?.addEventListener('click', async () => {
        try {
            await auth.signOut();
            alert("로그아웃 되었습니다.");
        } catch (error) {
            console.error(error);
        }
    });

    // 습관 저장 기능
    saveHabitBtn?.addEventListener('click', async () => {
        if (!currentUser) {
            alert('습관을 저장하고 트래킹하려면 먼저 구글 로그인이 필요합니다!');
            auth.signInWithPopup(provider).catch(e => console.error(e));
            return;
        }

        if (!currentHabitDesign) {
            alert('저장할 습관 레시피가 없습니다.');
            return;
        }

        const startLevelSelect = document.getElementById('start-level');
        const selectedStartLevel = startLevelSelect ? parseInt(startLevelSelect.value) : 1;

        try {
            saveHabitBtn.disabled = true;
            saveHabitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 저장 중...';

            await db.collection('users').doc(currentUser.uid).collection('habits').add({
                goal: currentHabitDesign.goalTitle || goalInput.value.trim(),
                recipe: currentHabitDesign,
                currentLevel: selectedStartLevel,
                checkInDates: [], // 달력 형태(Heatmap)로 날짜 텍스트(YYYY-MM-DD)를 저장할 배열
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            alert('습관이 내 계정에 성공적으로 저장되었습니다! [내 트래커] 탭에서 확인하세요.');
            window.location.href = 'tracker.html';
        } catch (error) {
            console.error(error);
            alert('저장 중 오류가 발생했습니다.');
            saveHabitBtn.disabled = false;
            saveHabitBtn.innerHTML = '<i class="fas fa-save"></i> 이 습관 내 계정에 저장하고 시작하기';
        }
    });

    // --- 기존 디자인 버튼 로직 ---
    designBtn.addEventListener('click', async () => {
        if (isRequesting) return;

        const now = Date.now();
        if (now - lastRequestTime < 10000) { // 10초 쿨타임
            alert('과도한 요청을 방지하기 위해 잠시 후 다시 시도해주세요. (10초 제한)');
            return;
        }

        const goal = goalInput.value.trim();
        const anchor = anchorInput.value.trim();

        if (!goal) {
            alert('목표를 입력해주세요!');
            return;
        }

        loadingSpinner.classList.remove('hidden');
        resultContainer.classList.add('hidden');
        isRequesting = true;

        try {
            let habitDesign;
            try {
                habitDesign = await generateTinyHabitWithAI(goal, anchor);
            } catch (aiError) {
                console.warn('AI 요청 실패, 로컬 로직으로 대체합니다.', aiError);
                
                if (window.location.protocol === 'file:') {
                    alert('안내: 지금처럼 PC 폴더에서 직접 여신 상태에서는 서버 통신이 불가능해 하드코딩 버전으로 동작합니다. 배포된 웹사이트에서 확인해주세요!');
                } else if (aiError.message.includes('API')) {
                    alert(`안내: ${aiError.message}\n임시로 하드코딩 버전으로 동작합니다.`);
                }

                await new Promise(resolve => setTimeout(resolve, 400));
                habitDesign = generateTinyHabitLocal(goal);
            }

            if (!habitDesign || !habitDesign.selectedAnchor) {
                habitDesign = generateTinyHabitLocal(goal);
            }

            currentHabitDesign = habitDesign;
            currentHabitDesign.goalTitle = goal;

            lastRequestTime = Date.now();
            displayResult(habitDesign);
        } catch (error) {
            console.error(error);
            alert('오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
        } finally {
            isRequesting = false;
            loadingSpinner.classList.add('hidden');
        }
    });

    function displayResult(habitDesign) {
        anchorText.textContent = habitDesign.selectedAnchor;
        
        let action = habitDesign.mva.title;
        if (action.includes(habitDesign.selectedAnchor)) {
            action = action.replace(habitDesign.selectedAnchor, "").replace(/^[, ]+/, "");
        }
        tinyActionText.textContent = action;
        
        celebrationText.textContent = habitDesign.celebrations[0];
        
        difficultyLadder.innerHTML = '';
        habitDesign.levels.forEach((level) => {
            const li = document.createElement('li');
            li.className = 'ladder-item';
            li.innerHTML = `
                <div class="ladder-level">${level.difficulty}</div>
                <div class="ladder-text">${level.title}</div>
            `;
            difficultyLadder.appendChild(li);
        });

        resultContainer.classList.remove('hidden');
        resultContainer.scrollIntoView({ behavior: 'smooth' });
    }
}

async function generateTinyHabitWithAI(goal, anchor = "") {
    const response = await fetch('/api/generate-habit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal, anchor }),
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'API 요청 실패');
    }

    return await response.json();
}

function generateTinyHabitLocal(goal) {
    const anchorInput = document.getElementById('anchor-input');
    const userAnchor = anchorInput ? anchorInput.value.trim() : "";
    const selectedAnchor = userAnchor || "매일 정해진 기존 일상 직후";
    
    const celebrations = ["나이스!", "아주 좋아!", "역시 대단해!", "잘했어!", "오늘도 해냈군요!"];
    const goalLower = goal.toLowerCase();
    
    let levels = [];
    
    // 단순화된 로컬 생성 로직: 모든 카테고리에서 난이도 0 제거 및 1~6단계 구성
    if (goalLower.includes('독서') || goalLower.includes('책')) {
        levels = [
            { "title": `${goal.slice(0, 10)}... 책 펴서 딱 한 문장 읽기`, "difficulty": 1 },
            { "title": "책 한 페이지 읽기", "difficulty": 2 },
            { "title": "5분 동안 독서하기", "difficulty": 3 },
            { "title": "10분 동안 집중해서 읽기", "difficulty": 4 },
            { "title": "한 챕터 끝까지 읽기", "difficulty": 5 },
            { "title": goal, "difficulty": 6 }
        ];
    } else if (goalLower.includes('물') || goalLower.includes('음용')) {
        levels = [
            { "title": "물 한 모금 시원하게 마시기", "difficulty": 1 },
            { "title": "물 반 컵 마시기", "difficulty": 2 },
            { "title": "물 한 컵 가득 마시기", "difficulty": 3 },
            { "title": "오전 중 500ml 마시기", "difficulty": 4 },
            { "title": "하루 1.5L 달성하기", "difficulty": 5 },
            { "title": goal, "difficulty": 6 }
        ];
    } else {
        // 일반적인 경우
        levels = [
            { "title": `${goal.slice(0, 10)}... 아주 작게 시작하기 (30초)`, "difficulty": 1 },
            { "title": `${goal.slice(0, 10)}... 조금 더 늘리기 (3분)`, "difficulty": 2 },
            { "title": `${goal.slice(0, 10)}... 중간 단계 도달 (10분)`, "difficulty": 3 },
            { "title": `${goal.slice(0, 10)}... 습관 안착시키기 (20분)`, "difficulty": 4 },
            { "title": `${goal.slice(0, 10)}... 목표에 가까워지기 (40분)`, "difficulty": 5 },
            { "title": goal, "difficulty": 6 }
        ];
    }

    return {
        category: "general",
        selectedAnchor,
        mva: { title: levels[0].title },
        levels: levels,
        celebrations: celebrations
    };
}