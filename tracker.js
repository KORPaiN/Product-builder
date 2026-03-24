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
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span class="label">현재 단계 (Lv.${currentLevel})</span>
                        <span style="font-weight: 800; color: var(--primary-color);">${Math.round((currentLevel/6)*100)}% 달성</span>
                    </div>
                    <p style="font-size: 1.15rem; font-weight: 700; margin: 0.5rem 0;">${currentLevelObj.title}</p>
                </div>
                <div class="action-row">
                    ${currentLevel < 6 ? `<button class="levelup-btn" id="lvup-${docId}"><i class="fas fa-arrow-up"></i> 다음 레벨로</button>` : '<span style="color:var(--primary-color); font-weight:800;">✨ 최종 단계 도달!</span>'}
                    <button class="checkin-btn" id="chk-${docId}" ${isCheckedToday ? 'disabled' : ''}>
                        ${isCheckedToday ? '<i class="fas fa-check-circle"></i> 오늘 완료' : '<i class="fas fa-check"></i> 오늘 체크인'}
                    </button>
                </div>
            `;
            
            attachViewEventListeners();
        };

        const renderEditView = () => {
            card.innerHTML = `
                <div class="habit-header">
                    <div style="width: 100%;">
                        <label style="font-size:0.8rem; font-weight:700;">대목표 수정</label>
                        <input type="text" class="edit-input" id="edit-goal-${docId}" value="${goal}">
                        <label style="font-size:0.8rem; font-weight:700;">평소 루틴 수정</label>
                        <input type="text" class="edit-input" id="edit-anchor-${docId}" value="${recipe.selectedAnchor}">
                        <label style="font-size:0.8rem; font-weight:700;">현재 행동 수정</label>
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
                    loadHabits(); // Reload all habits and calendar
                }
            };
            
            const chkBtn = card.querySelector(`#chk-${docId}`);
            if (chkBtn) {
                chkBtn.onclick = async () => {
                    const now = new Date().toISOString();
                    await db.collection('users').doc(uid).collection('habits').doc(docId).update({
                        logs: firebase.firestore.FieldValue.arrayUnion(now)
                    });
                    loadHabits(); // Reload all habits and calendar
                };
            }

            const lvupBtn = card.querySelector(`#lvup-${docId}`);
            if (lvupBtn) {
                lvupBtn.onclick = async () => {
                    if (confirm(`Lv.${currentLevel + 1}로 레벨업 하시겠습니까? 행동이 조금 더 구체화됩니다.`)) {
                        await db.collection('users').doc(uid).collection('habits').doc(docId).update({
                            currentLevel: currentLevel + 1
                        });
                        loadHabits(); // Reload all habits and calendar
                    }
                };
            }
        };

        const attachEditEventListeners = () => {
            card.querySelector('.cancel-edit-btn').onclick = renderDefaultView;
            card.querySelector('.save-edit-btn').onclick = async () => {
                const newGoal = document.getElementById(`edit-goal-${docId}`).value;
                const newAnchor = document.getElementById(`edit-anchor-${docId}`).value;
                const newAction = document.getElementById(`edit-action-${docId}`).value;

                const updatedRecipe = JSON.parse(JSON.stringify(recipe));
                updatedRecipe.selectedAnchor = newAnchor;
                const lvIdx = updatedRecipe.levels.findIndex(l => l.difficulty === currentLevel);
                if (lvIdx !== -1) updatedRecipe.levels[lvIdx].title = newAction;

                await db.collection('users').doc(uid).collection('habits').doc(docId).update({
                    goal: newGoal,
                    recipe: updatedRecipe
                });
                loadHabits(); // Reload all habits and calendar
            };
        };

        renderDefaultView();
        habitsList.appendChild(card);
    }

    // --- 통합 달력 렌더링 (월 이동 지원) ---
    function renderGlobalCalendar() {
        const year = currentViewDate.getFullYear();
        const month = currentViewDate.getMonth();
        calendarTitle.textContent = `${year}년 ${month + 1}월`;

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const totalDays = lastDay.getDate();
        const startWeekday = firstDay.getDay();

        globalCalendarGrid.innerHTML = '';

        // 요일 라벨
        ['일', '월', '화', '수', '목', '금', '토'].forEach(wd => {
            const el = document.createElement('div');
            el.className = 'calendar-weekday';
            el.textContent = wd;
            globalCalendarGrid.appendChild(el);
        });

        for (let i = 0; i < startWeekday; i++) globalCalendarGrid.appendChild(document.createElement('div'));

        const totalHabitCount = allHabits.length;

        for (let d = 1; d <= totalDays; d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            
            // 모든 습관 로그에서 해당 날짜 완료된 개수 합산
            let doneCount = 0;
            allHabits.forEach(h => {
                const logs = h.logs || [];
                if (logs.some(l => l.startsWith(dateStr))) doneCount++;
            });

            const dayEl = document.createElement('div');
            const ratio = totalHabitCount > 0 ? doneCount / totalHabitCount : 0;
            let levelClass = 'level-0';
            if (ratio > 0.75) levelClass = 'level-4';
            else if (ratio > 0.5) levelClass = 'level-3';
            else if (ratio > 0.25) levelClass = 'level-2';
            else if (ratio > 0) levelClass = 'level-1';

            const isToday = d === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
            dayEl.className = `heatmap-day ${levelClass} ${isToday ? 'today' : ''}`;
            
            dayEl.innerHTML = `
                <div style="font-size: 0.6rem; position: absolute; top: 2px; left: 4px; opacity: 0.6;">${d}</div>
                <div class="heatmap-tooltip">${dateStr}<br>${doneCount} / ${totalHabitCount} 완료</div>
            `;
            globalCalendarGrid.appendChild(dayEl);
        }
    }

    // 연속 달성일(Streak) 계산 로직
    function calculateStreak(dates) {
        if (!dates.length) return 0;
        const sortedDates = [...new Set(dates)].sort().reverse();
        let streak = 0;
        const checkDate = new Date();
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
