document.addEventListener('DOMContentLoaded', () => {
    const startScreen = document.getElementById('start-screen');
    const startGameButton = document.getElementById('start-game-button');
    const gameWrapper = document.getElementById('game-wrapper');
    const startButton = document.getElementById('start-button'); // ゲーム内のリセットボタン
    const diskCountSlider = document.getElementById('disk-count-slider');   // ディスクの枚数
    const towers = document.querySelectorAll('.tower');
    const gameContainer = document.getElementById('game-container');    // ゲームコンテナ
    const moveCountSpan = document.getElementById('move-count');
    const winMessage = document.getElementById('win-message');  // クリア時のメッセージ
    const resetMessage = document.getElementById('reset-message'); // リセット時のメッセージ

    // ヒントポップアップ
    const hintPopup = document.getElementById('hint-popup');
    const hintText = document.getElementById('hint-text');
    const closeHintButton = document.getElementById('close-hint-button');
    const restartFromHintButton = document.getElementById('restart-from-hint-button');

    // エラーポップアップ
    const errorPopup = document.getElementById('error-popup');
    const closeErrorButton = document.getElementById('close-error-button');
    const restartFromErrorButton = document.getElementById('restart-from-error-button');

    // プログレスバー
    const progressOverlay = document.getElementById('progress-overlay');
    const progressBar = document.getElementById('progress-bar');

    // 設定画面の要素
    const settingsButton = document.getElementById('settings-button');
    const settingsScreen = document.getElementById('settings-screen');
    const closeSettingsButton = document.getElementById('close-settings-button');


    const NUM_OF_TOWERS = 3;    // タワーの数

    let moveCount = 0;  // 移動回数

    // ヒントメッセージ
    const uselessHints = [
        "このゲームは「ハノイの塔」といいます！",
        "ディスクは動かせます！",
        "棒は動かせません！",
        "一番上のディスク以外は掴めません！",
        "小さいディスクの上に大きいディスクは置けません！",
        "マウスを使うと遊びやすいですよ！",
        "キーボードはほとんど使用しません！",
        "休憩も大切です！",
        "ゴールは一番右の塔です！",
        "その調子！",
        "諦めないで！",
        "何かお困りですか？"
    ];

    // タイマー管理用の変数
    let hintTimerId = null;
    const hintTimeoutDuration = 8000; // 8秒
    let hintTimerStartTime = 0;
    let hintTimeRemaining = 0;

    // カスタムドラッグと物理シミュレーション用の変数
    let isDragging = false;
    let draggedDisk = null;
    let originalTower = null;
    let physics = {
        pos: { x: 0, y: 0 },    // 位置
        velocity: { x: 0, y: 0 },   // 速度
        cursor: { x: 0, y: 0 }, // カーソルの位置
        stiffness: 0.005, // ばねの硬さ
        damping: 0.1,   // 減衰
        mass: 5,        // 質量
    };
    let animationFrameId = null;


    // 「ゲーム開始」ボタンのイベント
    startGameButton.addEventListener('click', async () => {
        startScreen.classList.add('hidden'); // スタート画面を隠す
        await showLoadingAnimation();   // プログレスバー
        gameWrapper.classList.remove('hidden'); // ゲーム本体を表示
        initializeGame(false); // ゲームを初期化して開始
    });

    // ゲーム内のリセットボタンのイベント
    startButton.addEventListener('click', () => initializeGame(true));

    // ヒントポップアップのイベントリスナー
    // ヒントの「OK」ボタン
    closeHintButton.addEventListener('click', () => {
        hintPopup.classList.add('hidden');  // ポップアップを閉じる
    });
    
    // ヒントの「戻す」ボタン
    restartFromHintButton.addEventListener('click', () => {
        hintPopup.classList.add('hidden'); // ポップアップを閉じる
        initializeGame(true);                 // ゲームをリセットする
    });

    // エラーポップアップのイベントリスナー
    // エラーの「OK」ボタン
    closeErrorButton.addEventListener('click', () => {
        errorPopup.classList.add('hidden');
    });

    // エラーの「戻す」ボタン
    restartFromErrorButton.addEventListener('click', () => {
        errorPopup.classList.add('hidden');
        initializeGame(true);
    });

    // 設定画面の表示ボタン
    settingsButton.addEventListener('click', async () => {
        pauseHintTimer();
        await showLoadingAnimation();
        settingsScreen.classList.remove('hidden');
    });

    // 設定画面の「OK」ボタン
    closeSettingsButton.addEventListener('click', async () => {
        await showLoadingAnimation();
        settingsScreen.classList.add('hidden');
        initializeGame(true);   // 盤面はここでリセット
    });

    // ゲームの初期化と開始
    function initializeGame(isReset = false) {
        // 全ての塔をクリア
        towers.forEach(tower => tower.innerHTML = '');
        
        // メッセージとカウンターをリセット
        moveCount = 0;
        moveCountSpan.textContent = moveCount;
        winMessage.textContent = '';
        
        //const diskCount = parseInt(diskCountInput.value);
        const diskCount = Math.round(parseFloat(diskCountSlider.value));
        const firstTower = document.getElementById('tower-1');

        // ディスクを生成して最初の塔に配置
        for (let i = diskCount; i > 0; i--) {
            const disk = document.createElement('div');
            disk.classList.add('disk');
            //disk.draggable = true;
            disk.dataset.size = i;
            disk.style.width = `${110 + (i * 2)}%`;   // サイズの変化を2%ずつにして分かりにくくする
            disk.style.backgroundColor = `#c0392b`;    // すべて赤に
            //disk.textContent = i; //サイズは非表示
            firstTower.appendChild(disk);

            // mousedownイベントでドラッグ開始
            disk.addEventListener('mousedown', handleMouseDown);
        }

         // isResetがtrueの時だけメッセージを表示（ゲームスタート時はなし）
        if (isReset) {
            resetMessage.textContent = '☆リセットされました☆';
            resetMessage.style.opacity = 1;
            setTimeout(() => { resetMessage.style.opacity = 0; }, 1000);
        }
        
        // 既存のタイマーをクリアしてから新しいタイマーを設定
        clearTimeout(hintTimerId);
        startHintTimer(hintTimeoutDuration);

        addDragListeners();
    }

    // ヒントを表示する関数
    function showUselessHint() {
        // ヒントのリストからランダムに一つ選ぶ
        const randomIndex = Math.floor(Math.random() * uselessHints.length);
        hintText.textContent = uselessHints[randomIndex];
        // ポップアップを表示する
        hintPopup.classList.remove('hidden');
    }

    // タイマー制御関数
    /**
     * 指定された時間でヒントタイマーを開始する関数
     * @param {number} duration - 待ち時間 (ミリ秒)
     */
    function startHintTimer(duration) {
        hintTimerStartTime = Date.now();
        hintTimeRemaining = duration; // 開始時の残り時間をセット
        hintTimerId = setTimeout(() => {
            showUselessHint();
            startHintTimer(hintTimeoutDuration); // 次の10秒タイマーを開始
        }, duration);
    }

    // ヒントタイマーを一時停止し、残り時間を計算して保存する関数
    function pauseHintTimer() {
        clearTimeout(hintTimerId);
        const elapsed = Date.now() - hintTimerStartTime;
        hintTimeRemaining = Math.max(0, hintTimeRemaining - elapsed);
    }

    // 保存された残り時間でタイマーを再開する関数
    function resumeHintTimer() {
        startHintTimer(hintTimeRemaining);
    }

    // エラーポップアップを表示する関数
    function showErrorPopup() {
        errorPopup.classList.remove('hidden');
    }

    // プログレスバーのアニメーション関数
    /**
     * 2秒間のプログレスバーアニメーションを表示する
     * @returns {Promise<void>} アニメーション完了時に解決されるPromise
     */
    function showLoadingAnimation() {
        return new Promise(resolve => {
            // オーバーレイを表示し、バーをリセット
            progressOverlay.classList.remove('hidden');
            progressBar.style.transition = 'none'; // 一時的にトランジションを無効化
            progressBar.style.width = '0%';

            // 95%まで1秒かけて進める
            setTimeout(() => {
                progressBar.style.transition = 'width 1s ease-out'; // トランジションを再設定
                progressBar.style.width = '95%';
            }, 20); // 少し遅延させてから開始

            // 1.9秒間、95%で停止
            setTimeout(() => {
            }, 1020); // 1秒後 + 2.9秒の停止期間の開始

            // 最後の5%を0.1秒で進めて完了
            setTimeout(() => {
                progressBar.style.transition = 'width 0.1s linear'; // 最後の動き
                progressBar.style.width = '100%';
            }, 2920); // 1秒 + 2.9秒後

            // アニメーション完了後、オーバーレイを隠してPromiseを解決
            setTimeout(() => {
                progressOverlay.classList.add('hidden');
                resolve();
            }, 3100); // 全体の時間より少し後に実行
        });
    }

    // カスタムドラッグ＆ドロップと物理シミュレーションのロジック
    // マウスでディスクを掴んだ時の処理
    async function handleMouseDown(e) {
        // すでにドラッグ中、または一番上のディスクでない場合は何もしない
        if (isDragging || e.target.parentElement.lastChild !== e.target) {
            e.preventDefault();
            // 上のでないディスクを掴もうとしたらエラー
            if (e.target.parentElement.lastChild !== e.target) {
                pauseHintTimer();
                await showLoadingAnimation();
                resumeHintTimer();
                showErrorPopup();
            }
            return;
        }

        e.preventDefault();
        isDragging = true;
        draggedDisk = e.target;
        originalTower = e.target.parentElement;

        // タワーのインデックスnと幅を取得し、オフセットを計算
        const towerIndex = Array.from(towers).indexOf(originalTower);
        const towerWidth = originalTower.offsetWidth;
        physics.offset = towerIndex * towerWidth;
        const pixelWidth = draggedDisk.offsetWidth;

        // offsetLeft/Top を使って親要素からの相対位置を取得
        const initialX = draggedDisk.offsetLeft;
        const initialY = draggedDisk.offsetTop;

        gameContainer.appendChild(draggedDisk);

        // この時点で一度スタイルを適用して、位置を固定する
        draggedDisk.style.position = 'absolute';
        draggedDisk.style.left = `${initialX}px`;
        draggedDisk.style.top = `${initialY}px`;
        draggedDisk.style.zIndex = '1000';
        draggedDisk.style.width = `${pixelWidth}px`; // 幅をピクセルで固定

        // 物理計算の初期化
        physics.pos = { x: initialX + physics.offset, y: initialY };
        physics.velocity = { x: 0, y: 0 };

        // カーソル位置もコンテナからの相対位置で保持
        const containerRect = gameContainer.getBoundingClientRect();
        physics.cursor = {
            x: e.clientX - containerRect.left,
            y: e.clientY - containerRect.top
        };

        // マウスの動きと、ボタンを放すイベントをdocument全体で監視
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        
        // アニメーションループを開始
        animationFrameId = requestAnimationFrame(animationLoop);
    }

    // ディスクを掴んだままマウスを動かした時の処理
    function handleMouseMove(e) {
        if (!isDragging) return;
        // カーソル位置をコンテナ基準の相対座標で更新
        const containerRect = gameContainer.getBoundingClientRect();
        physics.cursor.x = e.clientX - containerRect.left;
        physics.cursor.y = e.clientY - containerRect.top;
    }

    // 物理法則に基づいてディスクを動かすアニメーションループ
    function animationLoop() {
        if (!isDragging) return;

        // カーソルとディスクの間の距離を計算
        // カーソルとディスクの中心位置の計算もコンテナ基準で行う
        const diskCenterX = physics.pos.x + draggedDisk.offsetWidth / 2;
        const diskCenterY = physics.pos.y + draggedDisk.offsetHeight / 2;
        const displacementX = physics.cursor.x - diskCenterX;
        const displacementY = physics.cursor.y - diskCenterY;

        // ばねの力 (F = k * x)
        const springForceX = physics.stiffness * displacementX;
        const springForceY = physics.stiffness * displacementY;

        // 減衰力 (F = c * v)
        const dampingForceX = physics.damping * physics.velocity.x;
        const dampingForceY = physics.damping * physics.velocity.y;

        // 合力から加速度を計算 (a = F / m)
        const accelerationX = (springForceX - dampingForceX) / physics.mass;
        const accelerationY = (springForceY - dampingForceY) / physics.mass;

        // 速度と位置を更新
        physics.velocity.x += accelerationX;
        physics.velocity.y += accelerationY;
        physics.pos.x += physics.velocity.x;
        physics.pos.y += physics.velocity.y;

        // ディスクのスタイルに反映
        draggedDisk.style.left = `${physics.pos.x}px`;
        draggedDisk.style.top = `${physics.pos.y}px`;

        // 次のフレームを予約
        animationFrameId = requestAnimationFrame(animationLoop);
    }

    // マウスのボタンを放した時の処理
    async function handleMouseUp(e) {
        if (!isDragging) return;
        isDragging = false;
        cancelAnimationFrame(animationFrameId); // アニメーションを停止

        // イベントリスナーを削除
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        
        // ヒント表示中はドロップできない（元の場所に戻す）
        if (!hintPopup.classList.contains('hidden')) {
            resetDiskPosition();
            return;
        }

        // 設置先のタワーを決定
        const finalX = physics.pos.x + draggedDisk.offsetWidth / 2;
        let targetTower = null;
        towers.forEach(tower => {
            // getBoundingClientRectの代わりにoffsetLeft/offsetWidthを使用
            const towerLeft = tower.offsetLeft + tower.offsetWidth * 2 / 5;
            const towerRight = tower.offsetLeft + tower.offsetWidth * 4 / 5;
            if (finalX >= towerLeft && finalX <= towerRight) {
                targetTower = tower;
            }
        });

        // 設置判定
        if (targetTower) {
            const topDisk = targetTower.lastChild;
            const draggedDiskSize = parseInt(draggedDisk.dataset.size);

            // 有効な移動かチェック
            if (!topDisk || draggedDiskSize < parseInt(topDisk.dataset.size)) {
                // 有効な移動
                resetDiskPosition(); // スタイルをリセット
                targetTower.appendChild(draggedDisk); // 新しいタワーに追加
                
                pauseHintTimer();
                await showLoadingAnimation();
                moveCount++;
                moveCountSpan.textContent = moveCount;
                const isGameWon = checkWinCondition();
                if (!isGameWon) resumeHintTimer();
            } else {
                // 無効な移動
                pauseHintTimer();
                await showLoadingAnimation();
                resumeHintTimer();
                resetDiskPosition(); // 元の場所に戻す
                showErrorPopup();
            }
        } else {
            // タワーの外にドロップされた場合も元の場所に戻す
            resetDiskPosition();
        }

        draggedDisk = null;
        originalTower = null;
    }

    // ディスクのスタイルをリセットし、元のタワーに戻す
    function resetDiskPosition() {
        if (!draggedDisk || !originalTower) return;
        // インラインスタイルを削除して、CSSクラスによる配置に戻す
        draggedDisk.style.position = '';
        draggedDisk.style.zIndex = '';
        draggedDisk.style.left = '';
        draggedDisk.style.top = '';
        // 元のタワーに戻す
        originalTower.appendChild(draggedDisk);
    }

    // ゲームをクリアしたか判定する関数
    function checkWinCondition() {
        
        const diskCount = Math.round(parseFloat(diskCountSlider.value));
        const lastTower = document.getElementById(`tower-${NUM_OF_TOWERS}`);
        
        if (lastTower.children.length === diskCount) {
            // ゲーム画面を隠し、スタート画面に戻す
            gameWrapper.classList.add('hidden');
            startScreen.classList.remove('hidden');
            
            return true;      // クリア時のメッセージなどはなし
        }
        else {
            return false;
        }
    }
});