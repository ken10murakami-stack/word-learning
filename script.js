// 初期マスターデータ（スプレッドシートから読み込む想定のデータ）
const MASTER_WORDS = [
    { id: 1, en: "apple", read: "アップル", pos: "名詞", jp: "りんご", level: 1 },
    { id: 2, en: "run", read: "ラン", pos: "動詞", jp: "走る", level: 1 },
    { id: 3, en: "beautiful", read: "ビューティフル", pos: "形容詞", jp: "美しい", level: 1 },
    { id: 4, en: "quickly", read: "クイックリー", pos: "副詞", jp: "素早く", level: 2 },
    { id: 5, en: "book", read: "ブック", pos: "名詞", jp: "本", level: 1 },
    { id: 6, en: "eat", read: "イート", pos: "動詞", jp: "食べる", level: 2 }
];

const app = {
    userProgress: {}, // { id: status }
    currentQueue: [],
    currentIndex: 0,
    mode: 'en-jp',

    init() {
        // 保存データの読み込み
        const saved = localStorage.getItem('word_app_progress');
        this.userProgress = saved ? JSON.parse(saved) : {};
        
        this.renderFilters();
        this.updateStats();
    },

    renderFilters() {
        const levels = [...new Set(MASTER_WORDS.map(w => w.level))].sort();
        const poses = [...new Set(MASTER_WORDS.map(w => w.pos))];
        
        const lSelect = document.getElementById('level-select');
        levels.forEach(l => lSelect.add(new Option(`レベル ${l}`, l)));

        const pSelect = document.getElementById('pos-select');
        poses.forEach(p => pSelect.add(new Option(p, p)));
    },

    updateStats() {
        const container = document.getElementById('stats-container');
        container.innerHTML = "";
        
        const levels = [...new Set(MASTER_WORDS.map(w => w.level))].sort();
        const poses = [...new Set(MASTER_WORDS.map(w => w.pos))];

        levels.forEach(l => {
            poses.forEach(p => {
                const targetWords = MASTER_WORDS.filter(w => w.level == l && w.pos == p);
                if (targetWords.length === 0) return;

                const correctCount = targetWords.filter(w => this.userProgress[w.id] === 1).length;
                const percent = Math.round((correctCount / targetWords.length) * 100);

                const div = document.createElement('div');
                div.className = "stat-item";
                div.innerHTML = `Lv${l} [${p}]<br><b>${percent}%</b> (${correctCount}/${targetWords.length})`;
                container.appendChild(div);
            });
        });
    },

    start(selectedMode) {
        const lv = document.getElementById('level-select').value;
        const pos = document.getElementById('pos-select').value;
        this.mode = selectedMode;

        // フィルタリング
        let filtered = MASTER_WORDS.filter(w => w.level == lv);
        if (pos !== "all") {
            filtered = filtered.filter(w => w.pos === pos);
        }

        // 優先順位：間違えた単語(-1) > 未実施(undefined/0) > 正解済(1)
        this.currentQueue = filtered.sort((a, b) => {
            const statusA = this.userProgress[a.id] || 0;
            const statusB = this.userProgress[b.id] || 0;
            return statusA - statusB; 
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
        document.getElementById('pos-tag').innerText = word.pos;
        document.getElementById('question-text').innerText = (this.mode === 'en-jp') ? word.en : word.jp;
        document.getElementById('answer-text').innerText = (this.mode === 'en-jp') ? word.jp : word.en;
        document.getElementById('reading-text').innerText = word.read;

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
        this.saveProgress();

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

    saveProgress() {
        localStorage.setItem('word_app_progress', JSON.stringify(this.userProgress));
    },

    exportJSON() {
        const dataStr = JSON.stringify(this.userProgress, null, 2);
        const blob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'word_progress.json';
        a.click();
    },

    importJSON(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                this.userProgress = JSON.parse(e.target.result);
                this.saveProgress();
                this.updateStats();
                alert("読み込み完了しました");
            } catch (err) {
                alert("無効なJSONファイルです");
            }
        };
        reader.readAsText(file);
    }
};

window.onload = () => app.init();
