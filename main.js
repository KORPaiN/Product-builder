import { GoogleGenerativeAI } from "@google/generative-ai";

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
    const apiKeyInput = document.getElementById('api-key-input');
    const designBtn = document.getElementById('design-habit-btn');
    const loadingSpinner = document.getElementById('loading-spinner');
    const resultContainer = document.getElementById('result-container');

    const anchorText = document.getElementById('anchor-text');
    const tinyActionText = document.getElementById('tiny-action-text');
    const celebrationText = document.getElementById('celebration-text');
    const difficultyLadder = document.getElementById('difficulty-ladder');

    designBtn.addEventListener('click', async () => {
        const goal = goalInput.value.trim();
        const apiKey = apiKeyInput.value.trim();

        if (!goal) {
            alert('목표를 입력해주세요!');
            return;
        }

        loadingSpinner.classList.remove('hidden');
        resultContainer.classList.add('hidden');

        try {
            let habitDesign;
            if (apiKey) {
                habitDesign = await generateTinyHabitWithAI(goal, apiKey);
            } else {
                // Fallback to hardcoded logic if no API key
                await new Promise(resolve => setTimeout(resolve, 1000));
                habitDesign = generateTinyHabitLocal(goal);
            }
            
            displayResult(habitDesign);
        } catch (error) {
            console.error(error);
            alert('습관 디자인 중 오류가 발생했습니다: ' + error.message);
        } finally {
            loadingSpinner.classList.add('hidden');
        }
    });

    function displayResult(habitDesign) {
        anchorText.textContent = habitDesign.selectedAnchor;
        
        // Handle MVA title cleanup
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

async function generateTinyHabitWithAI(goal, apiKey) {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `
    BJ Fogg의 Tiny Habits 방법론을 사용하여 다음 목표에 대한 습관을 디자인하고 JSON으로 응답하세요.
    목표: "${goal}"

    응답 JSON 구조:
    {
        "language": "ko",
        "category": "string",
        "selectedAnchor": "string (구체적인 기존 루틴)",
        "mva": { "title": "string (앵커 직후의 30초 내외의 아주 작은 행동)" },
        "levels": [
            { "title": "난이도 0의 아주 쉬운 행동", "difficulty": 0 },
            { "title": "난이도 1의 행동 (MVA)", "difficulty": 1 },
            ... (총 7단계의 점진적 성장 사다리)
        ],
        "celebrations": ["string (즉시 할 수 있는 축하 표현 3개 이상)"]
    }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return JSON.parse(response.text());
}

function generateTinyHabitLocal(goal) {
    const goalLower = goal.toLowerCase();
    let category = "other";
    let anchors = ["양치 후", "퇴근 직후", "커피를 마신 후"];
    let mvaTitle = "";
    let levels = [];
    let celebrations = ["나이스!", "아주 좋아!", "역시 대단해!"];

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
        "selectedAnchor": anchors[0],
        "mva": {
            "title": mvaTitle,
            "difficulty": 1
        },
        "levels": levels,
        "celebrations": celebrations
    };
}