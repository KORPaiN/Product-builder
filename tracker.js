// tracker.js - 습관 대시보드 관리 로직

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
    // Theme setup from local storage
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
            alert('습관 트래커를 보려면 로그인이 필요합니다.');
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
            
            habitsList.innerHTML = ''; // 로딩 스피너 제거

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
                const habitData = doc.data();
                renderHabitCard(doc.id, habitData, uid);
            });
        } catch (error) {
            console.error("습관 로드 에러:", error);
            habitsList.innerHTML = `<div style="text-align:center; color:red;">데이터를 불러오는 중 오류가 발생했습니다.</div>`;
        }
    }

    function renderHabitCard(docId, data, uid) {
        const recipe = data.recipe;
        const currentLevelObj = recipe.levels.find(l => l.difficulty === data.currentLevel) || recipe.levels[1];
        
        let lastCheckInObj = data.lastCheckInDate;
        let isCheckedToday = false;
        
        if (lastCheckInObj) {
            const lastDate = lastCheckInObj.toDate();
            const today = new Date();
            // 오늘 날짜인지 판별 (로컬 시간 기준)
            if (lastDate.getFullYear() === today.getFullYear() && 
                lastDate.getMonth() === today.getMonth() && 
                lastDate.getDate() === today.getDate()) {
                isCheckedToday = true;
            }
        }

        const card = document.createElement('div');
        card.className = 'habit-card';
        card.innerHTML = `
            <div class="habit-header">
                <div>
                    <div style="font-size: 0.9rem; font-weight: 700; color: var(--text-muted); margin-bottom: 0.2rem;">목표: ${data.goal}</div>
                    <h2 class="habit-title">${recipe.selectedAnchor} ➔ ${currentLevelObj.title}</h2>
                </div>
                <div class="habit-streak">
                    <i class="fas fa-fire"></i> ${data.streak}일 연속
                </div>
            </div>

            <div class="habit-level-info">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-weight: 600;">
                    <span>현재 성장 단계: Lv.${data.currentLevel}</span>
                    <span style="color: var(--primary-color);">목표 Lv.6 (완성)</span>
                </div>
                <div style="width: 100%; height: 10px; background: rgba(0,0,0,0.1); border-radius: 5px; overflow: hidden;">
                    <div style="width: ${(data.currentLevel / 6) * 100}%; height: 100%; background: linear-gradient(90deg, var(--primary-color), #2196F3); border-radius: 5px; transition: width 0.5s ease;"></div>
                </div>
            </div>

            <div class="action-row">
                ${data.currentLevel < 6 ? `<button class="levelup-btn" id="lvl-${docId}" title="이 단계가 충분히 익숙해졌다면 다음 레벨로 올리세요!"><i class="fas fa-arrow-up"></i> 레벨업</button>` : `<span style="padding:1rem; font-weight:800; color:var(--primary-color)">최고 레벨 마스터! 🎉</span>`}
                <button class="checkin-btn" id="chk-${docId}" ${isCheckedToday ? 'disabled' : ''}>
                    ${isCheckedToday ? '<i class="fas fa-check-circle"></i> 오늘 실천 완료!' : '<i class="fas fa-check"></i> 오늘 달성 체크인'}
                </button>
            </div>
        `;

        habitsList.appendChild(card);

        // 출석 체크 로직
        const checkBtn = card.querySelector(`#chk-${docId}`);
        checkBtn?.addEventListener('click', async () => {
            const newStreak = data.streak + 1;
            checkBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 처리 중...';
            checkBtn.disabled = true;

            try {
                await db.collection('users').doc(uid).collection('habits').doc(docId).update({
                    streak: newStreak,
                    lastCheckInDate: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                checkBtn.innerHTML = '<i class="fas fa-check-circle"></i> 오늘 실천 완료!';
                card.querySelector('.habit-streak').innerHTML = `<i class="fas fa-fire"></i> ${newStreak}일 연속`;
                
                // 축하 팝업
                const randomCeleb = recipe.celebrations[Math.floor(Math.random() * recipe.celebrations.length)];
                alert(`🔥 달성 성공! 연속 ${newStreak}일째입니다!\nAI 코치의 축하: "${randomCeleb}"`);
            } catch (error) {
                console.error(error);
                alert("체크인 중 오류가 발생했습니다.");
                checkBtn.disabled = false;
                checkBtn.innerHTML = '<i class="fas fa-check"></i> 오늘 달성 체크인';
            }
        });

        // 레벨업 로직
        const lvlBtn = card.querySelector(`#lvl-${docId}`);
        lvlBtn?.addEventListener('click', async () => {
            if (confirm("정말로 지금 난이도가 충분히 습관이 되었나요? 다음 난이도로 레벨을 올리시겠습니까?")) {
                const newLevel = data.currentLevel + 1;
                lvlBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                
                try {
                    await db.collection('users').doc(uid).collection('habits').doc(docId).update({
                        currentLevel: newLevel
                    });
                    alert(`🎉 축하합니다! 레벨 ${newLevel}로 승급했습니다! 난이도가 약간 상승합니다.`);
                    location.reload(); // 새로고침하여 단계 적용
                } catch (error) {
                    console.error(error);
                    alert("레벨업 처리 중 오류가 발생했습니다.");
                    lvlBtn.innerHTML = '<i class="fas fa-arrow-up"></i> 레벨업';
                }
            }
        });
    }
});
