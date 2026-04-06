const GAS_API_URL = "https://script.google.com/macros/s/AKfycbyP6DOvquiEmALt7coEB9ATGUaIdCIU6UayptZ3iyGsTw2UYfAAaw9H9n4RbGqk2wU/exec";

const app = {
    masterWords: [],
    userProgress: {},
    currentQueue: [],
    currentIndex: 0,
    mode: 'en-jp',

    async init() {
        const loadingText = document.querySelector('#loading-overlay p');
        try {
            console.log("Fetching started..."); // デバッグ用
            loadingText.innerText = "GASに接続中...";

            // fetchの第2オプションを追加して確実に取得
            const response = await fetch(GAS_API_URL, {
                method: "GET",
                mode: "cors"
            });

            if (!response.ok) throw new Error("サーバーからの応答が正常ではありません。");
            
            this.masterWords = await response.json();
            console.log("Data loaded:", this.masterWords.length, "words");

            const saved = localStorage.getItem('word_app_progress_v1');
            this.userProgress = saved ? JSON.parse(saved) : {};

            this.setupUI();
            this.updateStats();
            document.getElementById('loading-overlay').classList.add('hidden');
        } catch (e) {
            console.error("Critical Error:", e);
            loadingText.innerHTML = `エラーが発生しました:<br><span style="color:red; font-size:0.8rem;">${e.message}</span><br><br>GASのURLをブラウザで直接開き、承認（Allow）を完了させてから再読み込みしてください。`;
        }
    },

    setupUI() {
        const levels = [...new Set(this.masterWords.map(w => w['レベル']))].sort((a,b) => a-b);
        const poses = [...new Set(this.masterWords.map(w => w['品詞']))].filter(p => p);
        
        const lSelect = document.getElementById('level-select');
        lSelect.innerHTML = ""; // 初期化
        levels.forEach(l => lSelect.add(new Option(`レベル ${l}`, l)));

        const pSelect = document.getElementById('pos-select');
        pSelect.innerHTML = '<option value="all">すべての品詞</option>'; // 初期化
        poses.forEach(p => pSelect.add(new Option(p, p)));
    },

    updateStats() {
        const container = document.getElementById('stats-container');
        container.innerHTML = "";
        const levels = [...new Set(this.masterWords.map(w => w['レベル']))].sort((a,b) => a-b);
        const targetPoses = ["名詞", "動詞", "形容詞", "副詞"];

        levels.forEach(l => {
            targetPoses.forEach(p => {
                const words = this.masterWords.filter(w => w['レベル'] == l && w['品詞'] == p);
                if (words.length === 0) return;
                const correctCount = words.filter(w => this.userProgress[w['ID']] === 1).length;
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
        let filtered = this.masterWords.filter(w => w['レベル'] == lv);
        if (pos !== "all") filtered = filtered.filter(w => w['品詞'] === pos);
        if (filtered.length === 0) return alert("条件に合う単語がありません。");

        this.currentQueue = filtered.sort((a, b) => {
            const sA = this.userProgress[a['ID']] || 0;
            const sB = this.userProgress[b['ID']] || 0;
            if (sA !== sB) return sA - sB;
            return Math.random() - 0.5;
        });

        this.currentIndex = 0;
        document.getElementById('setup-screen').classList.add('hidden');
        document.getElementById('quiz-screen').classList.remove('hidden');
        this.renderQuiz();
    },

    renderQuiz() {
        const word = this.currentQueue[this.currentIndex];
        document.getElementById('progress-text').innerText = `${this.currentIndex + 1} / ${this.currentQueue.length}`;
        document.getElementById('pos-tag').innerText = word['品詞'] || '不明';
        document.getElementById('level-tag').innerText = `Lv.${word['レベル']}`;
        document.getElementById('question-text').innerText = (this.mode === 'en-jp') ? word['英語'] : word['意味'];
        document.getElementById('answer-text').innerText = (this.mode === 'en-jp') ? word['意味'] : word['英語'];
        document.getElementById('reading-text').innerText = word['読み方'] || '';
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
        localStorage.setItem('word_app_progress_v1', JSON.stringify(this.userProgress));
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
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'study_data.json';
        a.click();
    },

    importJSON(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            this.userProgress = JSON.parse(e.target.result);
            localStorage.setItem('word_app_progress_v1', JSON.stringify(this.userProgress));
            this.updateStats();
            alert("復元しました");
        };
        reader.readAsText(file);
    }
};

window.onload = () => app.init();
