const GAS_API_URL = "https://script.google.com/macros/s/AKfycbyq01uVhRU8iIZuVm4Y9k40igFrPe0nX_20oOF6VZunUXUJCozrFCqL6_iNWjwyPAnr/exec";

const app = {
    masterWords: [],
    userProgress: {}, // { ID: status(-1:誤, 1:正) }
    currentQueue: [],
    currentIndex: 0,
    mode: 'en-jp',

    async init() {
        try {
            // 1. スプレッドシートからデータ取得
            const response = await fetch(GAS_API_URL);
            if (!response.ok) throw new Error("Network response was not ok");
            this.masterWords = await response.json();
            
            // 2. 学習進捗をブラウザから読み込み
            const saved = localStorage.getItem('word_app_progress_v1');
            this.userProgress = saved ? JSON.parse(saved) : {};

            this.setupUI();
            this.updateStats();
            document.getElementById('loading-overlay').classList.add('hidden');
        } catch (e) {
            document.querySelector('#loading-overlay p').innerText = "データの取得に失敗しました。GASの公開設定を確認してください。";
            console.error(e);
        }
    },

    setupUI() {
        const levels = [...new Set(this.masterWords.map(w => w['レベル']))].sort((a,b) => a-b);
        const poses = [...new Set(this.masterWords.map(w => w['品詞']))].filter(p => p);
        
        const lSelect = document.getElementById('level-select');
        levels.forEach(l => lSelect.add(new Option(`レベル ${l}`, l)));

        const pSelect = document.getElementById('pos-select');
        poses.forEach(p => pSelect.add(new Option(p, p)));
    },

    updateStats() {
        const container = document.getElementById('stats-container');
        container.innerHTML = "";
        
        const levels = [...new Set(this.masterWords.map(w => w['レベル']))].sort((a,b) => a-b);
        const targetPoses = ["名詞", "動詞", "形容詞", "副詞"]; // 主要なもののみ表示

        levels.forEach(l => {
            targetPoses.forEach(p => {
                const words = this.masterWords.filter(w => w['レベル'] == l && w['品詞'] == p);
                if (words.length === 0) return;

                const correctCount = words.filter(w => this.userProgress[w['ID']] === 1).length;
                const percent = Math.round((correctCount / words.length) * 100);

                const div = document.createElement('div');
                div.className = "stat-item";
                if(percent === 100) div.style.borderLeftColor = "var(--success)";
                div.innerHTML = `Lv${l} [${p}]<br><b>${percent}%</b> (${correctCount}/${words.length})`;
                container.appendChild(div);
            });
        });
    },

    start(selectedMode) {
        const lv = document.getElementById('level-select').value;
        const pos = document.getElementById('pos-select').value;
        this.mode = selectedMode;

        // フィルタリング
        let filtered = this.masterWords.filter(w => w['レベル'] == lv);
        if (pos !== "all") {
            filtered = filtered.filter(w => w['品詞'] === pos);
        }

        if (filtered.length === 0) return alert("選択した条件に合う単語がありません。");

        // 出題順序の決定ロジック
        // 1. 間違えた単語(status: -1)を最優先
        // 2. 未実施(status: 0)を次に優先
        // 3. 正解済み(status: 1)を最後に
        this.currentQueue = filtered.sort((a, b) => {
            const sA = this.userProgress[a['ID']] || 0;
            const sB = this.userProgress[b['ID']] || 0;
            if (sA !== sB) return sA - sB; // -1 < 0 < 1
            return Math.random() - 0.5;    // 同じ状態ならランダム
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
        
        // モードによる出し分け
        if (this.mode === 'en-jp') {
            document.getElementById('question-text').innerText = word['英語'];
            document.getElementById('answer-text').innerText = word['意味'];
        } else {
            document.getElementById('question-text').innerText = word['意味'];
            document.getElementById('answer-text').innerText = word['英語'];
        }
        document.getElementById('reading-text').innerText = word['読み方'] || '';

        // 表示の初期化
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
        // 進捗の保存
        this.userProgress[word['ID']] = isCorrect ? 1 : -1;
        localStorage.setItem('word_app_progress_v1', JSON.stringify(this.userProgress));

        this.currentIndex++;
        if (this.currentIndex < this.currentQueue.length) {
            this.renderQuiz();
        } else {
            alert("本日の学習範囲をすべて終了しました！");
            this.goHome();
        }
    },

    goHome() {
        this.updateStats();
        document.getElementById('setup-screen').classList.remove('hidden');
        document.getElementById('quiz-screen').classList.add('hidden');
    },

    // データのバックアップ機能
    exportJSON() {
        const dataStr = JSON.stringify(this.userProgress, null, 2);
        const blob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'english_study_backup.json';
        a.click();
    },

    importJSON(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const imported = JSON.parse(e.target.result);
                this.userProgress = imported;
                localStorage.setItem('word_app_progress_v1', JSON.stringify(this.userProgress));
                this.updateStats();
                alert("データを正常に復元しました。");
            } catch (err) {
                alert("ファイルの形式が正しくありません。");
            }
        };
        reader.readAsText(file);
    }
};

// アプリの開始
window.onload = () => app.init();
