const GAS_API_URL = "https://script.google.com/macros/s/AKfycbyq01uVhRU8iIZuVm4Y9k40igFrPe0nX_20oOF6VZunUXUJCozrFCqL6_iNWjwyPAnr/exec";

const app = {
    masterWords: [],
    userProgress: {},
    currentQueue: [],
    currentIndex: 0,
    mode: 'en-jp',

    async init() {
        const loadingOverlay = document.getElementById('loading-overlay');
        const loadingText = loadingOverlay.querySelector('p');
        try {
            console.log("Fetching started...");
            const response = await fetch(GAS_API_URL);
            const rawData = await response.json();
            
            this.masterWords = rawData.map(item => {
                const newItem = {};
                for (let key in item) {
                    const cleanKey = key.trim();
                    const val = item[key];
                    if (cleanKey === "ID") newItem.id = val;
                    if (cleanKey === "英語" || cleanKey === "English") newItem.en = val;
                    if (cleanKey === "意味" || cleanKey === "日本語" || cleanKey === "Meaning") newItem.jp = val;
                    if (cleanKey === "読み方" || cleanKey === "読み") newItem.read = val;
                    if (cleanKey === "品詞") newItem.pos = val;
                    if (cleanKey === "レベル") newItem.lv = val;
                }
                return newItem;
            }).filter(item => item.en);

            console.log("Standardized Data Ready:", this.masterWords[0]);

            const saved = localStorage.getItem('word_app_progress_v1');
            this.userProgress = saved ? JSON.parse(saved) : {};

            this.setupUI();
            this.updateStats();

            // 画面を表示させる
            loadingOverlay.classList.add('hidden');
            console.log("App Ready and Overlay Hidden");
        } catch (e) {
            console.error("Critical Error:", e);
            loadingText.innerHTML = `読み込みエラー: ${e.message}`;
        }
    },

    setupUI() {
        const levels = [...new Set(this.masterWords.map(w => w.lv))].filter(l => l).sort((a,b) => a-b);
        const poses = [...new Set(this.masterWords.map(w => w.pos))].filter(p => p);
        
        const lSelect = document.getElementById('level-select');
        lSelect.innerHTML = "";
        levels.forEach(l => lSelect.add(new Option(`レベル ${l}`, l)));

        const pSelect = document.getElementById('pos-select');
        pSelect.innerHTML = '<option value="all">すべての品詞</option>';
        poses.forEach(p => pSelect.add(new Option(p, p)));
    },

    updateStats() {
        const container = document.getElementById('stats-container');
        if (!container) return; // 要素がない場合はスキップ
        container.innerHTML = "";
        
        const levels = [...new Set(this.masterWords.map(w => w.lv))].filter(l => l).sort((a,b) => a-b);
        const targetPoses = ["名詞", "動詞", "形容詞", "副詞"];

        levels.forEach(l => {
            targetPoses.forEach(p => {
                const words = this.masterWords.filter(w => w.lv == l && w.pos == p);
                if (words.length === 0) return;
                const correctCount = words.filter(w => this.userProgress[w.id] === 1).length;
                const percent = Math.round((correctCount / words.length) * 100);
                const div = document.createElement('div');
                div.className = "stat-item";
                div.innerHTML = `Lv${l} [${p}]<br><b>${percent}%</b> (${correctCount}/${words.length})`;
                container.appendChild(div);
            });
        });
    },

    start(selectedMode) {
        const lv = document.getElementById('level-select').value;
        const pos = document.getElementById('pos-select').value;
        this.mode = selectedMode;
        
        let filtered = this.masterWords.filter(w => w.lv == lv);
        if (pos !== "all") filtered = filtered.filter(w => w.pos === pos);
        
        if (filtered.length === 0) return alert("条件に合う単語がありません。");

        this.currentQueue = filtered.sort((a, b) => {
            const sA = this.userProgress[a.id] || 0;
            const sB = this.userProgress[b.id] || 0;
            if (sA !== sB) return sA - sB;
            return Math.random() - 0.5;
        });

        this.currentIndex = 0;
        document.getElementById('setup-screen').classList.remove('hidden'); // 念のため
        document.getElementById('setup-screen').classList.add('hidden');
        document.getElementById('quiz-screen').classList.remove('hidden');
        this.renderQuiz();
    },

    renderQuiz() {
        const word = this.currentQueue[this.currentIndex];
        document.getElementById('progress-text').innerText = `${this.currentIndex + 1} / ${this.currentQueue.length}`;
        document.getElementById('pos-tag').innerText = word.pos || '不明';
        document.getElementById('level-tag').innerText = `Lv.${word.lv}`;
        document.getElementById('question-text').innerText = (this.mode === 'en-jp') ? word.en : word.jp;
        document.getElementById('answer-text').innerText = (this.mode === 'en-jp') ? word.jp : word.en;
        document.getElementById('reading-text').innerText = word.read || '';
        document.getElementById('answer-zone').classList.add('hidden');
        document.getElementById('judge-btns').classList.add('hidden');
        document.getElementById('show-btn').classList.remove('hidden');
    },

    showAnswer() {
        document.getElementById('answer-zone').classList.remove('hidden');
        document.getElementById('judge-btns').classList.remove('hidden');
        document.getElementById('show-btn').classList.add('hidden');
    },

    next(isCorrect) {
        const word = this.currentQueue[this.currentIndex];
        this.userProgress[word.id] = isCorrect ? 1 : -1;
        localStorage.setItem('word_app_progress_v1', JSON.stringify(this.userProgress));
        this.currentIndex++;
        if (this.currentIndex < this.currentQueue.length) {
            this.renderQuiz();
        } else {
            alert("学習終了！");
            this.goHome();
        }
    },

    goHome() {
        this.updateStats();
        document.getElementById('setup-screen').classList.remove('hidden');
        document.getElementById('quiz-screen').classList.add('hidden');
    }
};

window.onload = () => app.init();
