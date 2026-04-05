// 本来はGoogleスプレッドシートから取得するデータ
let rawData = [
    { id: 1, en: "apple", read: "アップル", pos: "名詞", jp: "りんご", level: 1, status: 0 },
    { id: 2, en: "run", read: "ラン", pos: "動詞", jp: "走る", level: 1, status: -1 }, // 前回ミス
    { id: 3, en: "beautiful", read: "ビューティフル", pos: "形容詞", jp: "美しい", level: 1, status: 0 },
    { id: 4, en: "quickly", read: "クイックリー", pos: "副詞", jp: "素早く", level: 2, status: 0 }
];

const app = {
    currentWords: [],
    currentIndex: 0,
    mode: 'en-jp',

    // アプリ起動
    start(selectedMode) {
        const level = document.getElementById('level-select').value;
        this.mode = selectedMode;
        
        // フィルタリング & 優先順位(status -1を最優先)
        this.currentWords = rawData
            .filter(w => w.level == level)
            .sort((a, b) => a.status - b.status);

        if (this.currentWords.length === 0) return alert("データがありません");

        document.getElementById('setup-screen').classList.add('hidden');
        document.getElementById('quiz-screen').classList.remove('hidden');
        this.render();
    },

    // 出題表示
    render() {
        const word = this.currentWords[this.currentIndex];
        const total = this.currentWords.length;
        
        document.getElementById('progress-text').innerText = `${this.currentIndex + 1} / ${total}`;
        document.getElementById('pos-tag').innerText = word.pos;
        
        // 問題文の切り替え
        document.getElementById('question-text').innerText = 
            (this.mode === 'en-jp') ? word.en : word.jp;
        
        // 解答文の準備
        document.getElementById('answer-text').innerText = 
            (this.mode === 'en-jp') ? word.jp : word.en;
        document.getElementById('reading-text').innerText = word.read;

        // 表示リセット
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
        // 本来はここでスプレッドシート(status)を更新する処理を呼ぶ
        const word = this.currentWords[this.currentIndex];
        word.status = isCorrect ? 1 : -1; 

        this.currentIndex++;
        if (this.currentIndex < this.currentWords.length) {
            this.render();
        } else {
            alert("このレベルの学習が完了しました！");
            location.reload();
        }
    }
};

// 初期表示：達成状況の簡易計算
window.onload = () => {
    const levels = [1, 2, 3];
    let html = "";
    levels.forEach(l => {
        const lvWords = rawData.filter(w => w.level == l);
        const done = lvWords.filter(w => w.status === 1).length;
        if(lvWords.length > 0) {
            html += `レベル${l}: ${done}/${lvWords.length} 完了<br>`;
        }
    });
    document.getElementById('status-view').innerHTML = html;
};
