const GAS_API_URL = https://script.google.com/macros/s/AKfycbyq01uVhRU8iIZuVm4Y9k40igFrPe0nX_20oOF6VZunUXUJCozrFCqL6_iNWjwyPAnr/exec

const app = {
    masterWords: [],
    userProgress: {},
    currentQueue: [],
    currentIndex: 0,
    mode: 'en-jp',

    async init() {
        try {
            // GASからデータを取得
            const response = await fetch(GAS_API_URL);
            this.masterWords = await response.json();
            
            // ローカルストレージから進捗を読み込み
            const saved = localStorage.getItem('word_app_progress');
            this.userProgress = saved ? JSON.parse(saved) : {};

            this.renderFilters();
            this.updateStats();
            document.getElementById('loading-overlay').classList.add('hidden');
        } catch (e) {
            alert("データの読み込みに失敗しました。URLを確認してください。");
            console.error(e);
        }
    },

    renderFilters() {
        const levels = [...new Set(this.masterWords.map(w => w['レベル']))].sort();
        const poses = [...new Set(this.masterWords.map(w => w['品詞']))];
        
        const lSelect = document.getElementById('level-select');
        levels.forEach(l => lSelect.add(new Option(`レベル ${l}`, l)));

        const pSelect = document.getElementById('pos-select');
        poses.forEach(p => pSelect.add(new Option(p, p)));
    },

    updateStats() {
        const container = document.getElementById('stats-container');
        container.innerHTML = "";
        const levels = [...new Set(this.masterWords.map(w => w['レベル']))].sort();
        const poses = ["名詞", "動詞", "形容詞", "副詞"];

        levels.forEach(l => {
            poses.forEach(p => {
                const words = this.masterWords.filter(w => w['レベル'] == l && w['品詞'] == p);
                if (words.length === 0) return;

                const correct = words.filter(w => this.userProgress[w['ID']] === 1).length;
                const percent = Math.round((correct / words.length) * 100);

                const div = document.createElement('div');
                div.className = "stat-item";
                div.innerHTML = `Lv${l} [${p}]<br><b>${percent}%</b> (${correct}/${words.length})`;
                container.appendChild(div);
            });
        });
    },

    start(selectedMode) {
        const lv = document.getElementById('level-select').value;
        const pos = document.getElementById('pos-select').value;
        this.mode = selectedMode;

        let filtered = this.masterWords.filter(w => w['レベル'] == lv);
        if (pos !== "all") filtered = filtered.filter(w => w['品詞'] === pos);

        // 優先順位：間違い(-1) > 未着手(0) > 正解(1)
        this.currentQueue = filtered.sort((a, b) => {
            const sA = this.userProgress[a['ID']] || 0;
            const sB = this.userProgress[b['ID']] || 0;
            if (sA !== sB) return sA - sB;
            return Math.random() - 0.5; // 同じ優先度ならシャッフル
        });

        if (this.currentQueue.length === 0) return alert("該当する単語がありません");

        this.currentIndex = 0;
        document.getElementById('setup-screen').classList.add('hidden');
        document.getElementById('quiz-screen').classList.remove('hidden');
        this.renderQuiz();
    },

    renderQuiz() {
        const word = this.currentQueue[this.currentIndex];
        document.getElementById('progress-text').innerText = `${this.currentIndex + 1} / ${this.currentQueue.length}`;
        document.getElementById('pos-tag').innerText = word['品詞'];
        document.getElementById('question-text').innerText = (this.mode === 'en-jp') ? word['英語'] : word['意味'];
        document.getElementById('answer-text').innerText = (this.mode === 'en-jp') ? word['意味'] : word['英語'];
        document.getElementById('reading-text').innerText = word['読み方'];

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
        this.userProgress[word['ID']] = isCorrect ? 1 : -1;
        localStorage.setItem('word_app_progress', JSON.stringify(this.userProgress));

        this.currentIndex++;
        if (this.currentIndex < this.currentQueue.length) {
            this.renderQuiz();
        } else {
            alert("終了しました！");
            this.goHome();
        }
    },

    goHome() {
        this.updateStats();
        document.getElementById('setup-screen').classList.remove('hidden');
        document.getElementById('quiz-screen').classList.add('hidden');
    },

    exportJSON() {
        const dataStr = JSON.stringify(this.userProgress, null, 2);
        const blob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'study_data.json'; a.click();
    },

    importJSON(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            this.userProgress = JSON.parse(e.target.result);
            localStorage.setItem('word_app_progress', JSON.stringify(this.userProgress));
            this.updateStats();
            alert("データを復元しました");
        };
        reader.readAsText(file);
    }
};

window.onload = () => app.init();
