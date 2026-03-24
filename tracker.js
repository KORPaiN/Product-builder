// tracker.js - 습관 대시보드 관리 로직 (히트맵 & 커스터마이징 포함)

const firebaseConfig = {
    apiKey: "AIzaSyBauvvnnl0qfBUoiWwR4TWUqYA5hiaAftM",
    authDomain: "loginhabittracker-491f0.firebaseapp.com",
    projectId: "loginhabittracker-491f0",
    storageBucket: "loginhabittracker-491f0.firebasestorage.app",
    messagingSenderId: "641004626839",
    appId: "1:641004626839:web:04a6c240d6b14391675ad2"
};

if (!window.firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-theme');
    }

    const userNameSpan = document.getElementById('user-name');
    const logoutBtn = document.getElementById('logout-btn');
    const habitsList = document.getElementById('habits-list');

    auth.onAuthStateChanged((user) => {
        if (user) {
            userNameSpan.textContent = `${user.displayName}님`;
            loadHabits(user.uid);
        } else {
            window.location.href = 'index.html';
        }
    });

    logoutBtn?.addEventListener('click', async () => {
        await auth.signOut();
        window.location.href = 'index.html';
    });

    async function loadHabits(uid) {
        try {
            const snapshot = await db.collection('users').doc(uid).collection('habits')
                                     .orderBy('createdAt', 'desc').get();
            
            habitsList.innerHTML = '';

            if (snapshot.empty) {
                habitsList.innerHTML = `
                    <div style="text-align:center; padding: 4rem; background: var(--glass-bg); border-radius: 20px;">
                        <i class="fas fa-seedling" style="font-size: 3rem; color: var(--primary-color); margin-bottom: 1rem;"></i>
                        <h3 style="margin-top:0;">아직 저장된 습관이 없습니다!</h3>
                        <p style="color: var(--text-muted); margin-bottom: 2rem;">홈에서 나만의 습관을 디자인하고 저장해보세요.</p>
                        <a href="index.html" class="checkin-btn" style="text-decoration:none;">습관 설계하러 가기</a>
                    </div>
                `;
                return;
            }

            snapshot.forEach(doc => {
                renderHabitCard(doc.id, doc.data(), uid);
            });
        } catch (error) {
            console.error("로드 에러:", error);
            habitsList.innerHTML = `<div style="text-align:center; color:red;">데이터 로드 중 오류 발생</div>`;
        }
    }

    function renderHabitCard(docId, data, uid) {
        const recipe = data.recipe;
        const currentLevel = data.currentLevel || 1;
        const levels = recipe.levels || [];
        const currentLevelObj = levels.find(l => l.difficulty === currentLevel) || { title: "정의되지 않음" };
        
        const checkInDates = data.checkInDates || [];
        const todayStr = new Date().toISOString().split('T')[0];
        const isCheckedToday = checkInDates.includes(todayStr);

        const card = document.createElement('div');
        card.className = 'habit-card';
        card.id = `card-${docId}`;
        
        // --- 1. 기본 뷰 (보기 모드) ---
        const renderDefaultView = () => {
            card.innerHTML = `
                <div class="card-top-actions">
                    <button class="icon-btn edit-toggle-btn" title="수정"><i class="fas fa-edit"></i></button>
                    <button class="icon-btn delete-btn" title="삭제"><i class="fas fa-trash-alt"></i></button>
                </div>
                <div class="habit-header">
                    <div>
                        <div style="font-size: 0.9rem; font-weight: 700; color: var(--text-muted); margin-bottom: 0.2rem;">목표: ${data.goal}</div>
                        <h2 class="habit-title">${recipe.selectedAnchor} ➔ ${currentLevelObj.title}</h2>
                    </div>
                    <div class="habit-streak">
                         <i class="fas fa-calendar-check"></i> 총 ${checkInDates.length}회 실천
                    </div>
                </div>

                <div class="habit-level-info">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-weight: 600;">
                        <span>현재 성장 단계: Lv.${currentLevel}</span>
                        <span style="color: var(--primary-color);">목표 Lv.6</span>
                    </div>
                    <div style="width: 100%; height: 10px; background: rgba(0,0,0,0.1); border-radius: 5px; overflow: hidden;">
                        <div style="width: ${(currentLevel / 6) * 100}%; height: 100%; background: linear-gradient(90deg, var(--primary-color), #2196F3); border-radius: 5px; transition: width 0.5s ease;"></div>
                    </div>
                </div>

                <div class="heatmap-container">
                    <div class="heatmap-header">
                        <span>실천 달력 (최근 28일)</span>
                        <span>🔥 ${calculateStreak(checkInDates)}일 연속 중</span>
                    </div>
                    <div class="heatmap-grid" id="heatmap-${docId}"></div>
                </div>

                <div class="action-row">
                    ${currentLevel < 6 ? `<button class="levelup-btn" id="lvl-${docId}"><i class="fas fa-arrow-up"></i> 레벨업</button>` : `<span style="padding:1rem; font-weight:800; color:var(--primary-color)">마스터 완료! 🏆</span>`}
                    <button class="checkin-btn" id="chk-${docId}" ${isCheckedToday ? 'disabled' : ''}>
                        ${isCheckedToday ? '<i class="fas fa-check-circle"></i> 오늘 완료' : '<i class="fas fa-check"></i> 오늘 체크인'}
                    </button>
                </div>
            `;
            
            renderHeatmap(card.querySelector(`#heatmap-${docId}`), checkInDates);
            attachViewEventListeners();
        };

        // --- 2. 편집 뷰 (수정 모드) ---
        const renderEditView = () => {
            card.innerHTML = `
                <div class="habit-header">
                    <div style="width: 100%;">
                        <label style="font-size:0.8rem; font-weight:700;">대목표 수정</label>
                        <input type="text" class="edit-input" id="edit-goal-${docId}" value="${data.goal}">
                        
                        <label style="font-size:0.8rem; font-weight:700;">평소 자주 하는 습관(시작 신호) 수정</label>
                        <input type="text" class="edit-input" id="edit-anchor-${docId}" value="${recipe.selectedAnchor}">
                        
                        <label style="font-size:0.8rem; font-weight:700;">Lv.${currentLevel} 현재 행동 수정</label>
                        <input type="text" class="edit-input" id="edit-action-${docId}" value="${currentLevelObj.title}">
                    </div>
                </div>
                <div class="action-row" style="margin-top: 1rem;">
                    <button class="glass-btn small-btn cancel-edit-btn">취소</button>
                    <button class="save-edit-btn" id="save-edit-${docId}">저장하기</button>
                </div>
            `;
            attachEditEventListeners();
        };

        const attachViewEventListeners = () => {
            card.querySelector('.edit-toggle-btn').onclick = renderEditView;
            card.querySelector('.delete-btn').onclick = async () => {
                if (confirm('이 습관을 영구히 삭제할까요? 기록이 모두 사라집니다.')) {
                    await db.collection('users').doc(uid).collection('habits').doc(docId).delete();
                    card.remove();
                }
            };
            
            card.querySelector(`#chk-${docId}`).onclick = async (e) => {
                const btn = e.currentTarget;
                btn.disabled = true;
                const newDates = [...checkInDates, todayStr];
                await db.collection('users').doc(uid).collection('habits').doc(docId).update({
                    checkInDates: newDates
                });
                location.reload(); 
            };

            card.querySelector(`#lvl-${docId}`)?.addEventListener('click', async () => {
                if (confirm('다음 난이도로 성장할 준비가 되셨나요?')) {
                    await db.collection('users').doc(uid).collection('habits').doc(docId).update({
                        currentLevel: currentLevel + 1
                    });
                    location.reload();
                }
            });
        };

        const attachEditEventListeners = () => {
            card.querySelector('.cancel-edit-btn').onclick = renderDefaultView;
            card.querySelector(`#save-edit-${docId}`).onclick = async () => {
                const newGoal = document.getElementById(`edit-goal-${docId}`).value;
                const newAnchor = document.getElementById(`edit-anchor-${docId}`).value;
                const newAction = document.getElementById(`edit-action-${docId}`).value;
                
                // 불변성을 위해 깊은 복사 후 업데이트
                const updatedRecipe = JSON.parse(JSON.stringify(recipe));
                updatedRecipe.selectedAnchor = newAnchor;
                const lvIdx = updatedRecipe.levels.findIndex(l => l.difficulty === currentLevel);
                if (lvIdx !== -1) updatedRecipe.levels[lvIdx].title = newAction;

                await db.collection('users').doc(uid).collection('habits').doc(docId).update({
                    goal: newGoal,
                    recipe: updatedRecipe
                });
                alert('수정되었습니다!');
                location.reload();
            };
        };

        renderDefaultView();
        habitsList.appendChild(card);
    }

    // 최근 28일 달력 렌더링
    function renderHeatmap(container, checkedDates) {
        const today = new Date();
        for (let i = 27; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const isChecked = checkedDates.includes(dateStr);
            
            const dayEl = document.createElement('div');
            dayEl.className = `heatmap-day ${isChecked ? 'checked' : ''}`;
            dayEl.innerHTML = `<div class="heatmap-tooltip">${dateStr} ${isChecked ? '✅ 실천' : '❌ 미실천'}</div>`;
            container.appendChild(dayEl);
        }
    }

    // 연속 달성일(Streak) 계산 로직
    function calculateStreak(dates) {
        if (!dates.length) return 0;
        const sortedDates = [...new Set(dates)].sort().reverse();
        let streak = 0;
        let checkDate = new Date();
        
        // 오늘 혹은 어제부터 시작해서 연속되는지 확인
        const todayStr = checkDate.toISOString().split('T')[0];
        checkDate.setDate(checkDate.getDate() - 1);
        const yesterdayStr = checkDate.toISOString().split('T')[0];
        
        if (!sortedDates.includes(todayStr) && !sortedDates.includes(yesterdayStr)) return 0;

        let currentCheck = sortedDates.includes(todayStr) ? new Date() : checkDate;
        
        while (true) {
            const s = currentCheck.toISOString().split('T')[0];
            if (sortedDates.includes(s)) {
                streak++;
                currentCheck.setDate(currentCheck.getDate() - 1);
            } else {
                break;
            }
        }
        return streak;
    }
});
