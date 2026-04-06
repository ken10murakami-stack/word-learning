// app オブジェクト内の既存の関数を更新・追加してください

// setupUI を更新（リセット用のセレクトボックスにも値をセット）
setupUI() {
    const levels = [...new Set(this.masterWords.map(w => w.lv))].filter(l => l).sort((a,b) => a-b);
    const poses = [...new Set(this.masterWords.map(w => w.pos))].filter(p => p);
    
    const lSelect = document.getElementById('level-select');
    const rlSelect = document.getElementById('reset-level-select'); // 追加
    lSelect.innerHTML = "";
    rlSelect.innerHTML = ""; // 追加
    levels.forEach(l => {
        lSelect.add(new Option(`レベル ${l}`, l));
        rlSelect.add(new Option(`レベル ${l}`, l)); // 追加
    });

    const pSelect = document.getElementById('pos-select');
    const rpSelect = document.getElementById('reset-pos-select'); // 追加
    pSelect.innerHTML = '<option value="all">すべての品詞</option>';
    rpSelect.innerHTML = '<option value="all">全品詞</option>'; // 追加
    poses.forEach(p => {
        pSelect.add(new Option(p, p));
        rpSelect.add(new Option(p, p)); // 追加
    });
},

// 特定の範囲をリセットする関数を追加
resetSpecificProgress() {
    const lv = document.getElementById('reset-level-select').value;
    const pos = document.getElementById('reset-pos-select').value;
    
    const targetScope = pos === "all" ? `レベル ${lv} の全単語` : `レベル ${lv} の [${pos}]`;
    if (!confirm(`${targetScope} の学習記録を削除してもよろしいですか？`)) return;

    // フィルタリングして対象のIDを特定
    let targets = this.masterWords.filter(w => w.lv == lv);
    if (pos !== "all") {
        targets = targets.filter(w => w.pos === pos);
    }

    // userProgress から対象のIDを削除
    targets.forEach(w => {
        delete this.userProgress[w.id];
    });

    // 保存と反映
    localStorage.setItem('word_app_progress_v1', JSON.stringify(this.userProgress));
    this.updateStats();
    alert("リセットが完了しました。");
},
