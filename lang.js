const translations = {
  ko: {
    home: "홈",
    tracker: "내 트래커",
    contact: "문의",
    title: "습관 디자인 코치",
    subtitle: "매일 조금씩, 더 나은 당신으로",
    habitInputPlaceholder: "습관을 입력하세요...",
    generateBtn: "추천받기",
    saveBtn: "저장",
    editBtn: "수정",
    deleteBtn: "삭제",
    contactTitle: "문의하기",
    messagePlaceholder: "메시지를 입력하세요...",
    sendBtn: "전송"
  },
  en: {
    home: "Home",
    tracker: "My Tracker",
    contact: "Contact",
    title: "Habit Design Coach",
    subtitle: "Better you, one habit at a time",
    habitInputPlaceholder: "Enter your habit...",
    generateBtn: "Get Recommendation",
    saveBtn: "Save",
    editBtn: "Edit",
    deleteBtn: "Delete",
    contactTitle: "Contact Us",
    messagePlaceholder: "Enter your message...",
    sendBtn: "Send"
  }
};

let currentLang = 'ko';

function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('userLang', lang);
  updateUI();
}

function updateUI() {
  const elements = document.querySelectorAll('[data-i18n]');
  elements.forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (translations[currentLang][key]) {
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = translations[currentLang][key];
      } else {
        el.textContent = translations[currentLang][key];
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const savedLang = localStorage.getItem('userLang') || 'ko';
  setLanguage(savedLang);
});
