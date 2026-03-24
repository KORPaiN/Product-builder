// main.js - 습관 디자인 코치

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

    designBtn.addEventListener('click', async () => {
        const goal = goalInput.value.trim();

        if (!goal) {
            alert('목표를 입력해주세요!');
            return;
        }

        loadingSpinner.classList.remove('hidden');
        resultContainer.classList.add('hidden');

        try {
            let habitDesign;
            try {
                habitDesign = await generateTinyHabitWithAI(goal);
            } catch (aiError) {
                console.warn('AI 요청 실패, 로컬 로직으로 대체합니다.', aiError);
                
                // 원인 파악을 돕기 위한 알림
                if (window.location.protocol === 'file:') {
                    alert('안내: 지금처럼 PC 폴더에서 직접 여신 상태에서는 서버 통신이 불가능해 하드코딩 버전으로 동작합니다. 배포된 웹사이트에서 확인해주세요!');
                } else if (aiError.message.includes('API')) {
                    alert(`안내: ${aiError.message}\n임시로 하드코딩 버전으로 동작합니다. (Cloudflare 환경 변수 설정 확인 필요)`);
                }

                await new Promise(resolve => setTimeout(resolve, 400));
                habitDesign = generateTinyHabitLocal(goal);
            }

            displayResult(habitDesign);
        } catch (error) {
            console.error(error);
            alert('오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
        } finally {
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

async function generateTinyHabitWithAI(goal) {
    const response = await fetch('/api/generate-habit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal }),
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'API 요청 실패');
    }

    return await response.json();
}

function generateTinyHabitLocal(goal) {
    const goalLower = goal.toLowerCase();
    let category = "other";
    let anchors = ["양치 후", "퇴근 직후", "커피를 마신 후", "잠자리에서 일어난 직후"];
    let mvaTitle = "";
    let levels = [];
    let celebrations = ["나이스!", "아주 좋아!", "역시 대단해!", "잘했어!"];

    if (goalLower.includes('독서') || goalLower.includes('책')) {
        category = "reading";
        const anchor = "아침 커피 한 모금 후";
        mvaTitle = `${anchor}, 책을 펴서 딱 한 문장만 읽기`;
        levels = [
            { "title": "책을 손에 들고 표지만 보기", "difficulty": 0 },
            { "title": mvaTitle, "difficulty": 1 },
            { "title": "책 한 페이지 읽기", "difficulty": 2 },
            { "title": "5분 동안 독서하기", "difficulty": 3 },
            { "title": "10분 동안 집중해서 읽기", "difficulty": 4 },
            { "title": "한 챕터 끝까지 읽기", "difficulty": 5 },
            { "title": "읽은 내용 한 줄 요약하기", "difficulty": 6 }
        ];
        return { category, selectedAnchor: anchor, mva: { title: mvaTitle }, levels, celebrations };
    } 
    
    if (goalLower.includes('운동') || goalLower.includes('팔굽혀펴기') || goalLower.includes('스쿼트')) {
        category = "workout";
        const anchor = "화장실에서 나온 후";
        mvaTitle = `${anchor}, 팔굽혀펴기 1개 하기`;
        levels = [
            { "title": "운동복으로 갈아입기", "difficulty": 0 },
            { "title": mvaTitle, "difficulty": 1 },
            { "title": "팔굽혀펴기 5개 하기", "difficulty": 2 },
            { "title": "스쿼트 10개 추가하기", "difficulty": 3 },
            { "title": "5분 스트레칭 하기", "difficulty": 4 },
            { "title": "15분 전신 운동하기", "difficulty": 5 },
            { "title": "30분 루틴 완수하기", "difficulty": 6 }
        ];
        return { category, selectedAnchor: anchor, mva: { title: mvaTitle }, levels, celebrations };
    }

    if (goalLower.includes('물') || goalLower.includes('음용')) {
        category = "health";
        const anchor = "주방에 들어갈 때마다";
        mvaTitle = `${anchor}, 물 한 모금 마시기`;
        levels = [
            { "title": "컵을 꺼내 놓기", "difficulty": 0 },
            { "title": mvaTitle, "difficulty": 1 },
            { "title": "물 반 컵 마시기", "difficulty": 2 },
            { "title": "물 한 컵 가득 마시기", "difficulty": 3 },
            { "title": "오전 중 물 500ml 마시기", "difficulty": 4 },
            { "title": "하루 1.5L 목표 달성하기", "difficulty": 5 },
            { "title": "차나 영양제와 함께 마시기", "difficulty": 6 }
        ];
        return { category, selectedAnchor: anchor, mva: { title: mvaTitle }, levels, celebrations };
    }

    // Default Fallback
    const selectedAnchor = anchors[0];
    mvaTitle = `${selectedAnchor}, ${goal}을 위한 10초 행동 하기`;
    levels = Array.from({ length: 7 }, (_, i) => ({
        "title": i === 1 ? mvaTitle : `${goal} 관련 단계 ${i} 행동 실행`,
        "difficulty": i
    }));

    return {
        category: "general",
        selectedAnchor,
        mva: { title: mvaTitle },
        levels: levels,
        celebrations: celebrations
    };
}