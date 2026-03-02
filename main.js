document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initHabitDesigner();
});

function initTheme() {
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
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

    const anchorText = document.getElementById('anchor-text');
    const tinyActionText = document.getElementById('tiny-action-text');
    const celebrationText = document.getElementById('celebration-text');
    const difficultyLadder = document.getElementById('difficulty-ladder');
    const jsonOutput = document.getElementById('json-output');

    designBtn.addEventListener('click', async () => {
        const goal = goalInput.value.trim();
        if (!goal) {
            alert('목표를 입력해주세요!');
            return;
        }

        loadingSpinner.classList.remove('hidden');
        resultContainer.classList.add('hidden');

        await new Promise(resolve => setTimeout(resolve, 1000));

        const habitDesign = generateTinyHabit(goal);
        
        // Update UI components
        anchorText.textContent = habitDesign.selectedAnchor;
        tinyActionText.textContent = habitDesign.mva.title.replace(habitDesign.selectedAnchor + ", ", "");
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

        jsonOutput.textContent = JSON.stringify(habitDesign, null, 2);

        loadingSpinner.classList.add('hidden');
        resultContainer.classList.remove('hidden');
        resultContainer.scrollIntoView({ behavior: 'smooth' });
    });
}

function generateTinyHabit(goal) {
    const goalLower = goal.toLowerCase();
    let category = "other";
    let anchors = ["양치 후", "퇴근 직후", "커피를 마신 후"];
    let mvaTitle = "";
    let levels = [];
    let celebrations = ["나이스!", "아주 좋아!", "역시 대단해!"];
    let safetyNotes = [];

    if (goalLower.includes('독서') || goalLower.includes('책')) {
        category = "reading";
        anchors = ["침대에 눕기 전", "아침 커피 한 모금 후", "지하철에 앉은 후"];
        const anchor = anchors[0];
        mvaTitle = `${anchor}, 책을 펴서 딱 한 문장만 읽으세요.`;
        levels = [
            { "title": "책을 손에 들고 표지만 봅니다.", "difficulty": 0 },
            { "title": `${anchor}, 책을 펴서 딱 한 문장만 읽으세요.`, "difficulty": 1 },
            { "title": "책 한 페이지를 읽으세요.", "difficulty": 2 },
            { "title": "5분 동안 독서를 즐기세요.", "difficulty": 3 },
            { "title": "10분 동안 집중해서 읽으세요.", "difficulty": 4 },
            { "title": "한 챕터를 끝까지 읽으세요.", "difficulty": 5 },
            { "title": "책의 내용을 요약하여 기록하세요.", "difficulty": 6 }
        ];
    } else if (goalLower.includes('운동') || goalLower.includes('팔굽혀펴기') || goalLower.includes('달리기')) {
        category = "workout";
        anchors = ["신발을 신은 후", "화장실에서 나온 후", "잠자리에서 일어난 직후"];
        const anchor = anchors[0];
        mvaTitle = `${anchor}, 팔굽혀펴기 1개를 즉시 하세요.`;
        levels = [
            { "title": "운동복으로 갈아입기만 하세요.", "difficulty": 0 },
            { "title": `${anchor}, 팔굽혀펴기 1개를 즉시 하세요.`, "difficulty": 1 },
            { "title": "팔굽혀펴기 5개를 가뿐하게 하세요.", "difficulty": 2 },
            { "title": "1분 동안 스쿼트를 수행하세요.", "difficulty": 3 },
            { "title": "5분 동안 고강도 운동을 하세요.", "difficulty": 4 },
            { "title": "15분 동안 전신 운동을 완료하세요.", "difficulty": 5 },
            { "title": "30분간 목표한 운동 루틴을 완수하세요.", "difficulty": 6 }
        ];
        safetyNotes = ["관절에 통증이 느껴지면 즉시 중단하고 휴식을 취하세요."];
    } else if (goalLower.includes('공부') || goalLower.includes('학습') || goalLower.includes('강의')) {
        category = "study";
        anchors = ["책상에 앉은 후", "노트북을 켠 후", "저녁 식사를 마친 후"];
        const anchor = anchors[0];
        mvaTitle = `${anchor}, 단어 하나만 암기하거나 노트 한 줄을 적으세요.`;
        levels = [
            { "title": "공부할 책을 책상 위에 펼쳐만 두세요.", "difficulty": 0 },
            { "title": `${anchor}, 단어 하나만 암기하거나 노트 한 줄을 적으세요.`, "difficulty": 1 },
            { "title": "관련 영상이나 강의를 2분간 시청하세요.", "difficulty": 2 },
            { "title": "기출 문제 한 문제를 정성껏 푸세요.", "difficulty": 3 },
            { "title": "15분 동안 집중해서 학습하세요.", "difficulty": 4 },
            { "title": "배운 내용을 남에게 설명하듯 말해보세요.", "difficulty": 5 },
            { "title": "1시간 동안 깊이 있는 몰입 학습을 하세요.", "difficulty": 6 }
        ];
    } else {
        const anchor = anchors[0];
        mvaTitle = `${anchor}, ${goal}을 위한 30초 행동을 하세요.`;
        levels = Array.from({ length: 7 }, (_, i) => ({
            "title": i === 1 ? mvaTitle : `${goal} 관련 단계 ${i} 행동을 실행하세요.`,
            "difficulty": i
        }));
    }

    return {
        "language": "ko",
        "category": category,
        "suggestedAnchors": anchors,
        "selectedAnchor": anchors[0],
        "mva": {
            "title": mvaTitle,
            "difficulty": 1
        },
        "levels": levels,
        "celebrations": celebrations,
        "troubleshooting": {
            "ifFail": [
                "난이도를 한 단계 낮추어 다시 시도해 보세요.",
                "행동을 더 작게 쪼개어 부담을 줄이세요.",
                "더 자연스럽게 이어질 수 있는 새로운 앵커를 찾으세요.",
                "주변 환경을 정리하여 행동을 더 쉽게 만드세요."
            ]
        },
        "safetyNotes": safetyNotes
    };
}