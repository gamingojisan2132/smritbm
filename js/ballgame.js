// ボールゲームのクラス
class BallGame extends Phaser.Scene {
    constructor() {
        super('BallGame');
        
        // ボールの設定
        this.BALL_DIAMETER = 64; // ボールの直径
        this.SLASH_HEIGHT = 32; // 斬撃の高さ
        this.SLASH_DURATION = 8; // 斬撃の表示フレーム数
        this.SLASH_FREEZE_TIME = 300; // 斬撃後のフリーズ時間（ミリ秒）
        this.GRAVITY = 300; // 重力設定
        this.INITIAL_TIME = 45; // 初期制限時間（秒）
        this.SAME_COLOR_BONUS_BASE = 5; // 同じ色2個以上のボーナス基本値
        this.SAME_COLOR_BONUS_EXTRA = 1; // 2個以上の場合、追加1個あたりのボーナス
        
        // 色と速度の設定
        this.ballColorSettings = [
            { color: 0xff0000, speedFactor: 1.0 },    // 赤：標準速度
            { color: 0x00ff00, speedFactor: 0.8 },    // 緑：やや遅い
            { color: 0x0000ff, speedFactor: 1.2 },    // 青：やや速い
            { color: 0xffff00, speedFactor: 0.7 },    // 黄：遅い
        ];
        
        // 変数の初期化
        this.balls = null;
        this.isWaveActive = false;
        this.slashLine = null;
        this.slicedCountText = {};
        this.slicedCounts = {};
        this.counterCircles = {}; // カウンター円の位置を保存
        this.timeLeft = this.INITIAL_TIME; // 残り時間
        this.timeText = null; // 時間表示テキスト
        this.gameActive = true; // ゲームの状態
        this.bonusTexts = []; // ボーナス表示用テキスト配列
        this.backgroundImages = null; // 背景画像グループ
        this.waveStartScheduled = false; // 次のウェーブ開始がスケジュール済みか
        this.canSlashThisWave = true; // このウェーブで斬撃可能か
        this.score = 0; // スコアを初期化
        this.lastBgImageKey = null; // 最後に表示した背景画像のキーを記憶する変数
        this.currentWaveTotalBalls = 0; // 現在のウェーブのボール総数
        this.currentWaveSlicedBalls = 0; // 現在のウェーブで斬ったボール数
        this.waveNumber = 0; // 現在のウェーブ番号
        this.bombAppeared = false; // 爆弾が出現したかどうか
        this.bombs = null; // 爆弾のグループ
        this.highScores = []; // ハイスコア配列
        this.pendingFever = false; // フィーバーモード保留フラグ
        
        // ★フィーバーモード用変数
        this.isFeverTime = false; // フィーバー中かどうかのフラグ
        this.feverTimerEvent = null; // フィーバー時間管理タイマー
        this.coins = null; // コインのグループ
        this.feverSlashCooldown = 50; // フィーバー中の斬撃クールダウン(ms)
        this.normalSlashCooldown = this.SLASH_FREEZE_TIME; // 通常時のクールダウン(ms) - 既存のものを参照
        this.lastSlashTime = 0; // ★最後に斬撃した時刻
        
        // BGM関連
        this.bgmCounter = 0; // BGM切り替え用カウンター
        this.currentBgm = null; // 現在再生中のBGM
        
        // ★フィーバー後猶予期間
        this.isPostFeverGrace = false; // フィーバー終了後の空振り猶予期間中か
        this.postFeverGraceTimer = null; // 猶予期間タイマー
        
        // カウントダウン効果音
        this.countdownSound = null;
        this.bombReadySound = null; // 爆弾登場音
        
        // サウンド設定
        this.soundEnabled = true; // サウンドが有効かどうか
    }
    
    preload() {
        // 動く背景画像 (女の子)
        this.load.image('backgroundImage', 'assets/images/t01.png'); // 既存のt01
        this.load.image('backgroundImage2', 'assets/images/t02.png'); // t02
        this.load.image('backgroundImage3', 'assets/images/t03.png'); // t03 を追加
        this.load.image('backgroundImage4', 'assets/images/t04.png'); // t04 を追加
        // 他の背景画像を追加したら、ここにも同様に追加してください (例: 'backgroundImage5', 'assets/images/t05.png')
        
        // 静的な背景画像
        this.load.image('staticBackground', 'assets/images/background.jpg');
        
        // 爆弾画像
        this.load.image('bomb', 'assets/images/bomb.png');
        // ★コイン画像
        this.load.image('coin', 'assets/images/coin.png');
        
        // 「お見事！」画像
        this.load.image('excellent', 'assets/images/excellent.png');
        
        // BGM追加
        this.load.audio('bgm01', 'assets/sounds/bgm01.mp3');
        this.load.audio('bgm02', 'assets/sounds/bgm02.mp3');
        
        // 効果音追加
        this.load.audio('slash', 'assets/sounds/slash.mp3');
        this.load.audio('miss', 'assets/sounds/miss.mp3');
        this.load.audio('excellent', 'assets/sounds/excellent.mp3');
        this.load.audio('gameover', 'assets/sounds/gameover.mp3');
        this.load.audio('get', 'assets/sounds/get.mp3');
        this.load.audio('retry', 'assets/sounds/retry.mp3');
        
        // 新しい効果音追加
        this.load.audio('countdown01', 'assets/sounds/countdown01.mp3');
        this.load.audio('countdown02', 'assets/sounds/countdown02.mp3');
        this.load.audio('bomb_ready', 'assets/sounds/bomb_ready.mp3');
        this.load.audio('bomb', 'assets/sounds/bomb.mp3');
        
        // さらに追加の効果音
        this.load.audio('highscore', 'assets/sounds/highscore.mp3');
        this.load.audio('fever_slash', 'assets/sounds/fever_slash.mp3');
        this.load.audio('fever_in', 'assets/sounds/fever_in.mp3');
    }
    
    create() {
        // --- ゲーム状態の初期化（リスタート時に重要）---
        this.timeLeft = this.INITIAL_TIME;
        this.score = 0; // スコアを初期化
        this.gameActive = true; // ゲームを開始状態にする
        this.waveStartScheduled = false; // ウェーブ開始フラグをリセット
        this.canSlashThisWave = true; // リスタート時も斬撃可能に
        this.waveNumber = 0; // ウェーブ番号をリセット
        this.bombAppeared = false; // 爆弾出現フラグをリセット
        this.pendingFever = false; // フィーバー保留フラグもリセット
        // ------------------------------------------
        
        const { width, height } = this.sys.game.config;
        
        // 静的な背景画像を追加し、画面サイズに合わせる
        let staticBg = this.add.image(width / 2, height / 2, 'staticBackground');
        staticBg.displayWidth = width;
        staticBg.displayHeight = height; // 画面に合わせて伸縮させる
        staticBg.setDepth(-2); // 一番後ろに表示
        
        // BGMを再生
        this.playBGM();
        
        // 物理グループの初期化
        this.leftWall = this.physics.add.staticGroup();
        let leftWallObj = this.add.rectangle(0, this.sys.game.config.height / 2, 1, this.sys.game.config.height, 0xff0000);
        leftWallObj.setOrigin(0, 0.5);
        leftWallObj.visible = false; // 見えない壁
        this.leftWall.add(leftWallObj);
        this.physics.add.existing(leftWallObj, true); // true = static
        
        this.rightWall = this.physics.add.staticGroup();
        let rightWallObj = this.add.rectangle(this.sys.game.config.width, this.sys.game.config.height / 2, 1, this.sys.game.config.height, 0xff0000);
        rightWallObj.setOrigin(1, 0.5);
        rightWallObj.visible = false; // 見えない壁
        this.rightWall.add(rightWallObj);
        this.physics.add.existing(rightWallObj, true); // true = static
        
        // 色ごとのカウンター初期化
        this.ballColorSettings.forEach(setting => {
            const colorHex = '#' + setting.color.toString(16).padStart(6, '0');
            this.slicedCounts[colorHex] = 0;
        });
        
        // 切断カウント表示を初期化
        let startX = 20;
        const startY = 30;
        const spacing = 60;
        
        this.ballColorSettings.forEach((setting, index) => {
            const colorHex = '#' + setting.color.toString(16).padStart(6, '0');
            const x = startX + index * spacing;
            
            // 色付きの丸を表示
            const circle = this.add.circle(x, startY, 15, setting.color);
            circle.setStrokeStyle(2, 0xffffff);
            
            // カウンターの円の位置を保存
            this.counterCircles[colorHex] = { x: x, y: startY };
            
            // カウント数字を表示
            const text = this.add.text(x + 20, startY, '0', { 
                fontFamily: 'Arial', 
                fontSize: '20px', 
                fill: '#ffffff',
                align: 'left'
            });
            text.setOrigin(0, 0.5);
            
            // テキストオブジェクトを保存
            this.slicedCountText[colorHex] = text;
        });
        
        // スコア表示テキスト
        this.scoreText = this.add.text(width - 30, 30, '0', {
            fontFamily: 'Arial',
            fontSize: '28px',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        });
        this.scoreText.setOrigin(1, 0.5);
        
        // 制限時間表示
        this.timeText = this.add.text(
            width / 2, 
            70, 
            this.formatTime(this.timeLeft), 
            { 
                fontFamily: 'Arial', 
                fontSize: '64px', 
                fill: '#ffffff',
                align: 'center'
            }
        );
        this.timeText.setOrigin(0.5);
        
        // 時間カウントダウンタイマー
        if (this.timeEvent) this.timeEvent.remove(); // 古いタイマーがあれば削除
        this.timeEvent = this.time.addEvent({
            delay: 1000, // 1秒ごと
            callback: this.updateTimer,
            callbackScope: this,
            loop: true
        });
        
        // ボールのグループを作成
        this.balls = this.physics.add.group();
        
        // 爆弾のグループを作成
        this.bombs = this.physics.add.group();
        
        // 背景画像のグループを作成し、深度を設定
        this.backgroundImages = this.physics.add.group();
        this.backgroundImages.setDepth(-1); // ボールより後ろに表示
        
        // 背景画像グループの物理特性を有効化
        this.physics.world.enable(this.backgroundImages);
        
        // 斬撃ライン用のグラフィックスを作成（初期状態は非表示）
        this.slashLine = this.add.graphics();
        
        // クリックイベントの追加
        this.input.off('pointerdown', this.createSlash, this); // 古いリスナーがあれば削除
        this.input.on('pointerdown', this.createSlash, this);
        
        // ★コインのグループを作成
        this.coins = this.physics.add.group();
        
        // 最初のwaveを開始
        this.time.delayedCall(500, this.startNewWave, [], this);
        
        // 定期的にボールの状態をチェック
        this.time.addEvent({
            delay: 500, // 0.5秒ごと
            callback: this.checkWaveStatus,
            callbackScope: this,
            loop: true
        });
        
        // サウンドオンオフボタンを追加
        this.createSoundToggleButton();
    }
    
    update() {
        // 画面外（下）に出たボールを削除
        let activeBalls = 0;
        
        this.balls.getChildren().forEach(ball => {
            if (ball.y > this.sys.game.config.height + this.BALL_DIAMETER) {
                ball.destroy();
            } else {
                activeBalls++;
            
                // 壁との衝突をチェック（追加の安全策として）
                if (ball.x <= this.BALL_DIAMETER / 2) {
                    ball.x = this.BALL_DIAMETER / 2 + 1;
                    if (ball.body && ball.body.velocity) {
                        ball.body.velocity.x = Math.abs(ball.body.velocity.x);
                    }
                } else if (ball.x >= this.sys.game.config.width - this.BALL_DIAMETER / 2) {
                    ball.x = this.sys.game.config.width - this.BALL_DIAMETER / 2 - 1;
                    if (ball.body && ball.body.velocity) {
                        ball.body.velocity.x = -Math.abs(ball.body.velocity.x);
                    }
                }
            }
        });
        
        // 画面外に出た爆弾を削除し、爆弾登場音を停止
        if (this.bombs) {
            let activeBombs = 0;
            this.bombs.getChildren().forEach(bomb => {
                if (bomb.y > this.sys.game.config.height + 256) { // 爆弾サイズを考慮
                    bomb.destroy();
                } else {
                    activeBombs++;
                }
            });
            
            // アクティブな爆弾がなくなったら爆弾登場音を停止
            if (activeBombs === 0 && this.bombReadySound) {
                this.bombReadySound.stop();
                this.bombReadySound = null;
            }
        }
        
        // 背景画像の更新処理
        this.backgroundImages.getChildren().forEach(bgImage => {
            const gameHeight = this.sys.game.config.height;

            // 画像の上端が画面下端より下に行ったら削除
            if (bgImage.y - bgImage.displayHeight / 2 > gameHeight) {
                console.log("Background image destroyed: bottom exit"); // デバッグログ追加
                bgImage.destroy();
            }
            // 画像の下端が画面上端より上に行った場合も削除（追加のチェック）
            else if (bgImage.y + bgImage.displayHeight / 2 < 0) {
                console.log("Background image destroyed: top exit"); // デバッグログ追加
                bgImage.destroy();
            }
        });
        
        // すべてのボールが画面外に出た場合、waveを非アクティブにする
        if (this.isWaveActive && activeBalls === 0) {
            this.isWaveActive = false;
        }
    }
    
    // 時間を「00:00」形式にフォーマットするヘルパーメソッド
    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    
    // 時間を更新するメソッド
    updateTimer() {
        if (!this.gameActive) return;
        
        this.timeLeft -= 1;
        
        // 時間表示を更新
        if (this.timeText) {
            this.timeText.setText(this.formatTime(this.timeLeft));
            
            // 残り時間が少ない場合は赤く表示
            if (this.timeLeft <= 10) {
                this.timeText.setStyle({ fill: '#ff0000' });
            }
            
            // 残り時間に応じたカウントダウン効果音
            if (this.timeLeft === 15) {
                // 残り15秒でcountdown01.mp3をループ再生
                if (this.countdownSound) {
                    this.countdownSound.stop();
                }
                this.countdownSound = this.sound.add('countdown01', { loop: true, volume: 0.4 });
                this.countdownSound.play();
            } else if (this.timeLeft === 5) {
                // 残り5秒でcountdown02.mp3に切り替え
                if (this.countdownSound) {
                    this.countdownSound.stop();
                }
                this.countdownSound = this.sound.add('countdown02', { loop: true, volume: 0.5 });
                this.countdownSound.play();
            }
        }
        
        // 時間切れチェック
        if (this.timeLeft <= 0) {
            // カウントダウン音を停止
            if (this.countdownSound) {
                this.countdownSound.stop();
                this.countdownSound = null;
            }
            this.gameOver();
        }
    }
    
    // 時間を「00:00」形式にフォーマットするヘルパーメソッド
    formatTime(seconds) {
        // 秒のみの2桁表示に変更
        return `${Math.floor(seconds).toString().padStart(2, '0')}`;
    }
    
    // 時間を更新するメソッド
    updateTimer() {
        if (!this.gameActive) return;
        
        this.timeLeft -= 1;
        
        // 時間表示を更新
        if (this.timeText) {
            this.timeText.setText(this.formatTime(this.timeLeft));
            
            // 残り時間が少ない場合は赤く表示
            if (this.timeLeft <= 10) {
                this.timeText.setStyle({ fill: '#ff0000' });
            }
            
            // 残り時間に応じたカウントダウン効果音
            if (this.timeLeft === 15) {
                // 残り15秒でcountdown01.mp3をループ再生
                if (this.countdownSound) {
                    this.countdownSound.stop();
                }
                this.countdownSound = this.sound.add('countdown01', { loop: true, volume: 0.4 });
                this.countdownSound.play();
            } else if (this.timeLeft === 5) {
                // 残り5秒でcountdown02.mp3に切り替え
                if (this.countdownSound) {
                    this.countdownSound.stop();
                }
                this.countdownSound = this.sound.add('countdown02', { loop: true, volume: 0.5 });
                this.countdownSound.play();
            }
        }
        
        // 時間切れチェック
        if (this.timeLeft <= 0) {
            // カウントダウン音を停止
            if (this.countdownSound) {
                this.countdownSound.stop();
                this.countdownSound = null;
            }
            this.gameOver();
        }
    }
    
    // ゲームオーバー処理
    gameOver() {
        if (!this.gameActive) return; // 既にゲームオーバーなら何もしない
        this.gameActive = false;
        console.log('Game Over!');
        
        // ゲームオーバー効果音を再生
        this.sound.play('gameover', { volume: 0.6 });
        
        // ★フィーバー関連タイマーを停止
        if (this.feverTimerEvent) {
            this.feverTimerEvent.remove();
            this.feverTimerEvent = null;
        }
        if (this.coinSpawnTimer) {
            this.coinSpawnTimer.remove();
            this.coinSpawnTimer = null;
        }
        // ★ isFeverTime も false に戻す（念のため）
        this.isFeverTime = false;
        this.isPostFeverGrace = false; // 猶予期間も終了
        
        // 爆弾登場音を停止
        if (this.bombReadySound) {
            this.bombReadySound.stop();
            this.bombReadySound = null;
        }
        
        // 残っているボールや爆弾、コインなどをクリア
        if(this.balls) this.balls.clear(true, true);
        if(this.bombs) this.bombs.clear(true, true);
        if(this.coins) this.coins.clear(true, true);
        
        // スコアの保存
        this.saveScore(this.score);
        
        // 結果画面の表示
        this.showResult();
    }
    
    // スコアを保存
    saveScore(score) {
        // LocalStorageからハイスコアを取得
        let highScores = [];
        const storedScores = localStorage.getItem('ballGameHighScores');
        
        if (storedScores) {
            highScores = JSON.parse(storedScores);
        }
        
        // 新しいスコアを追加
        highScores.push({
            score: score,
            date: new Date().toLocaleString()
        });
        
        // スコアの降順でソート
        highScores.sort((a, b) => b.score - a.score);
        
        // 上位5件だけを保持
        highScores = highScores.slice(0, 5);
        
        // ハイスコア（1位）かどうかをチェック
        const isNewHighScore = highScores[0].score === score && 
                              highScores[0].date === new Date().toLocaleString();
        
        // ハイスコア時に効果音を再生
        if (isNewHighScore && this.soundEnabled) {
            this.sound.play('highscore', { volume: 0.6 });
        }
        
        // LocalStorageに保存
        localStorage.setItem('ballGameHighScores', JSON.stringify(highScores));
        
        // インスタンス変数に保存
        this.highScores = highScores;
    }
    
    // 結果画面の表示
    showResult() {
        // 背景を暗くする
        const overlay = this.add.rectangle(
            this.sys.game.config.width / 2,
            this.sys.game.config.height / 2,
            this.sys.game.config.width,
            this.sys.game.config.height,
            0x000000
        );
        overlay.setAlpha(0.7);
        overlay.setDepth(100);
        
        // 結果パネル
        const panelWidth = this.sys.game.config.width * 0.8;
        const panelHeight = this.sys.game.config.height * 0.8;
        const panel = this.add.rectangle(
            this.sys.game.config.width / 2,
            this.sys.game.config.height / 2,
            panelWidth,
            panelHeight,
            0x333333
        );
        panel.setAlpha(0.9);
        panel.setDepth(101);
        
        // タイトル
        const titleText = this.add.text(
            this.sys.game.config.width / 2,
            this.sys.game.config.height * 0.2,
            'ゲーム終了',
            {
                fontFamily: 'Arial Black',
                fontSize: '36px',
                fill: '#ffffff'
            }
        );
        titleText.setOrigin(0.5);
        titleText.setDepth(102);
        
        // スコア表示
        const scoreText = this.add.text(
            this.sys.game.config.width / 2,
            this.sys.game.config.height * 0.3,
            `スコア: ${this.score}`,
            {
                fontFamily: 'Arial',
                fontSize: '28px',
                fill: '#ffffff'
            }
        );
        scoreText.setOrigin(0.5);
        scoreText.setDepth(102);
        
        // ハイスコア表示
        const highScoreTitle = this.add.text(
            this.sys.game.config.width / 2,
            this.sys.game.config.height * 0.4,
            'トップ5スコア',
            {
                fontFamily: 'Arial',
                fontSize: '24px',
                fill: '#ffff00'
            }
        );
        highScoreTitle.setOrigin(0.5);
        highScoreTitle.setDepth(102);
        
        // ハイスコアリスト
        let yPos = this.sys.game.config.height * 0.45;
        for (let i = 0; i < this.highScores.length; i++) {
            const scoreItem = this.highScores[i];
            const isCurrentScore = scoreItem.score === this.score && 
                                  scoreItem.date === new Date().toLocaleString();
            
            const rankText = this.add.text(
                this.sys.game.config.width * 0.3,
                yPos,
                `${i + 1}.`,
                {
                    fontFamily: 'Arial',
                    fontSize: '20px',
                    fill: isCurrentScore ? '#ffff00' : '#ffffff'
                }
            );
            rankText.setOrigin(0, 0.5);
            rankText.setDepth(102);
            
            const scoreItemText = this.add.text(
                this.sys.game.config.width * 0.35,
                yPos,
                `${scoreItem.score}点`,
                {
                    fontFamily: 'Arial',
                    fontSize: '20px',
                    fill: isCurrentScore ? '#ffff00' : '#ffffff'
                }
            );
            scoreItemText.setOrigin(0, 0.5);
            scoreItemText.setDepth(102);
            
            yPos += 30;
        }
        
        // リトライボタン
        const retryButton = this.add.rectangle(
            this.sys.game.config.width / 2,
            this.sys.game.config.height * 0.7,
            200,
            50,
            0x4444ff
        );
        retryButton.setDepth(102);
        retryButton.setInteractive({ useHandCursor: true });
        
        const retryText = this.add.text(
            this.sys.game.config.width / 2,
            this.sys.game.config.height * 0.7,
            'リトライ',
            {
                fontFamily: 'Arial',
                fontSize: '24px',
                fill: '#ffffff'
            }
        );
        retryText.setOrigin(0.5);
        retryText.setDepth(103);
        
        // クレジットボタン
        const creditButton = this.add.rectangle(
            this.sys.game.config.width / 2,
            this.sys.game.config.height * 0.8,
            200,
            50,
            0x666666
        );
        creditButton.setDepth(102);
        creditButton.setInteractive({ useHandCursor: true });
        
        const creditText = this.add.text(
            this.sys.game.config.width / 2,
            this.sys.game.config.height * 0.8,
            'クレジット',
            {
                fontFamily: 'Arial',
                fontSize: '24px',
                fill: '#ffffff'
            }
        );
        creditText.setOrigin(0.5);
        creditText.setDepth(103);
        
        // ボタンのホバーエフェクト
        retryButton.on('pointerover', () => {
            retryButton.setFillStyle(0x6666ff);
        });
        
        retryButton.on('pointerout', () => {
            retryButton.setFillStyle(0x4444ff);
        });
        
        creditButton.on('pointerover', () => {
            creditButton.setFillStyle(0x888888);
        });
        
        creditButton.on('pointerout', () => {
            creditButton.setFillStyle(0x666666);
        });
        
        // リトライボタンのクリックイベント
        retryButton.on('pointerdown', () => {
            // リトライ効果音を再生
            this.sound.play('retry', { volume: 0.5 });
            
            // カウントダウン音を停止
            if (this.countdownSound) {
                this.countdownSound.stop();
                this.countdownSound = null;
            }
            
            // 爆弾登場音を停止
            if (this.bombReadySound) {
                this.bombReadySound.stop();
                this.bombReadySound = null;
            }
            
            // BGMカウンターをインクリメント（次のBGMに切り替えるため）
            this.bgmCounter++;
            console.log(`BGM counter incremented to ${this.bgmCounter}`);
            
            // 現在のシーンを再起動
            this.scene.restart();
        });
        
        // クレジットボタンのクリックイベント
        creditButton.on('pointerdown', () => {
            // 現在はまだ表示のみ
            console.log('クレジットボタンがクリックされました');
            // 将来的にはクレジット表示を実装
        });
    }
    
    // 時間を「00:00」形式にフォーマットするヘルパーメソッド
    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    
    // 時間を更新するメソッド
    updateTimer() {
        if (!this.gameActive) return;
        
        this.timeLeft -= 1;
        
        // 時間表示を更新
        if (this.timeText) {
            this.timeText.setText(this.formatTime(this.timeLeft));
            
            // 残り時間が少ない場合は赤く表示
            if (this.timeLeft <= 10) {
                this.timeText.setStyle({ fill: '#ff0000' });
            }
            
            // 残り時間に応じたカウントダウン効果音
            if (this.timeLeft === 15) {
                // 残り15秒でcountdown01.mp3をループ再生
                if (this.countdownSound) {
                    this.countdownSound.stop();
                }
                this.countdownSound = this.sound.add('countdown01', { loop: true, volume: 0.4 });
                this.countdownSound.play();
            } else if (this.timeLeft === 5) {
                // 残り5秒でcountdown02.mp3に切り替え
                if (this.countdownSound) {
                    this.countdownSound.stop();
                }
                this.countdownSound = this.sound.add('countdown02', { loop: true, volume: 0.5 });
                this.countdownSound.play();
            }
        }
        
        // 時間切れチェック
        if (this.timeLeft <= 0) {
            // カウントダウン音を停止
            if (this.countdownSound) {
                this.countdownSound.stop();
                this.countdownSound = null;
            }
            this.gameOver();
        }
    }
    
    // 時間を「00:00」形式にフォーマットするヘルパーメソッド
    formatTime(seconds) {
        // 秒のみの2桁表示に変更
        return `${Math.floor(seconds).toString().padStart(2, '0')}`;
    }
    
    // 時間を更新するメソッド
    updateTimer() {
        if (!this.gameActive) return;
        
        this.timeLeft -= 1;
        
        // 時間表示を更新
        if (this.timeText) {
            this.timeText.setText(this.formatTime(this.timeLeft));
            
            // 残り時間が少ない場合は赤く表示
            if (this.timeLeft <= 10) {
                this.timeText.setStyle({ fill: '#ff0000' });
            }
            
            // 残り時間に応じたカウントダウン効果音
            if (this.timeLeft === 15) {
                // 残り15秒でcountdown01.mp3をループ再生
                if (this.countdownSound) {
                    this.countdownSound.stop();
                }
                this.countdownSound = this.sound.add('countdown01', { loop: true, volume: 0.4 });
                this.countdownSound.play();
            } else if (this.timeLeft === 5) {
                // 残り5秒でcountdown02.mp3に切り替え
                if (this.countdownSound) {
                    this.countdownSound.stop();
                }
                this.countdownSound = this.sound.add('countdown02', { loop: true, volume: 0.5 });
                this.countdownSound.play();
            }
        }
        
        // 時間切れチェック
        if (this.timeLeft <= 0) {
            // カウントダウン音を停止
            if (this.countdownSound) {
                this.countdownSound.stop();
                this.countdownSound = null;
            }
            this.gameOver();
        }
    }
    
    // 時間ボーナスを追加
    addTimeBonus(seconds, x, y) {
        // 時間を追加（3連撃以上の場合のみ）
        if (seconds > 0) {
            this.timeLeft += seconds;
        }
        
        // ボーナステキスト表示
        const bonusText = this.add.text(
            x,
            y,
            `+${seconds}`,
            {
                fontFamily: 'Arial',
                fontSize: '24px',
                fill: '#ffff00',
                align: 'center'
            }
        );
        bonusText.setOrigin(0.5);
        
        // アニメーション（上に移動しながらフェードアウト）
        this.tweens.add({
            targets: bonusText,
            y: y - 50,
            alpha: 0,
            duration: 1500,
            ease: 'Power2',
            onComplete: () => {
                // アニメーション完了後にテキストを削除
                if (bonusText.active) bonusText.destroy();
            }
        });
        
        // 時間表示をアニメーション
        this.tweens.add({
            targets: this.timeText,
            scaleX: 1.2,
            scaleY: 1.2,
            duration: 200,
            yoyo: true,
            ease: 'Bounce.easeOut'
        });
    }
    
    // コンボ表示 (旧 showComboText)
    displayCombo(comboCount, x, y) { // ★引数変更、リネーム
        console.log(`[displayCombo] Called with comboCount: ${comboCount}, x: ${x}, y: ${y}`); // ★ Log 4
        
        // 新しいコンボテキスト内容を決定
        let comboTextContent = '';
        if (typeof comboCount === 'string') {
            // 既にテキスト形式で渡された場合はそのまま使用
            comboTextContent = comboCount;
        } else if (comboCount >= 2) {
            comboTextContent = `${comboCount} 連撃！`;
        } else {
            console.log('[displayCombo] comboCount < 2, returning.'); // ★ Log
            // 1コンボは通常表示しない
            return; // 何も表示しない
        }
        console.log(`[displayCombo] Determined text: ${comboTextContent}`); // ★ Log
        
        // 既存のコンボテキストがあれば削除 (念のため)
        if (this.comboTextInstance) {
            console.log('[displayCombo] Destroying previous combo text.'); // ★ Log
            this.comboTextInstance.destroy();
            clearTimeout(this.comboClearTimeout);
        }
        
        console.log('[displayCombo] Creating new text object...'); // ★ Log 5
        const comboText = this.add.text(x, y, comboTextContent, { // ★ 新しいテキストとスタイル
            fontFamily: 'Arial Black', // より力強いフォントに
            fontSize: '48px',
            fill: '#ff9900', // 少し明るいオレンジ
            stroke: '#000000',
            strokeThickness: 5,
            align: 'center'
        });
        comboText.setOrigin(0.5);
        
        comboText.setDepth(8); // 深度調整
        
        // 既存のコンボテキストがあれば削除 (念のため)
        if (this.comboTextInstance) {
            this.comboTextInstance.destroy();
            clearTimeout(this.comboClearTimeout);
        }
        this.comboTextInstance = comboText; // 新しいテキストを保持
        
        // アニメーション（ポップアップ）
        this.tweens.add({
            targets: comboText,
            alpha: 0,
            duration: 500, // 少し長めに表示
            delay: 800, // 表示されてから消え始めるまでの時間
            ease: 'Power1',
            onComplete: () => {
                // アニメーション完了後にテキストを削除
                if (comboText.active) comboText.destroy();
                if (this.comboTextInstance === comboText) { // 他の表示で上書きされていないか確認
                    this.comboTextInstance = null;
                }
            }
        });
        
        // 一定時間後にテキストをクリアするためのタイマー (重複表示防止用)
        this.comboClearTimeout = setTimeout(() => {
            if (this.comboTextInstance === comboText) {
                 if (comboText.active) comboText.destroy();
                 this.comboTextInstance = null;
            }
        }, 1300); // アニメーション時間より少し長く
    }
    
    // コンボボーナスの計算
    calculateComboBonus(hitCount) {
        // 2個以上の場合にボーナスを計算
        if (hitCount >= 2) {
            // 基本ボーナス + 追加ボーナス
            const bonusTime = this.SAME_COLOR_BONUS_BASE + (hitCount - 2) * this.SAME_COLOR_BONUS_EXTRA;
            return {
                bonusTime: bonusTime,
                comboCount: hitCount
            };
        } else {
            // 1個以下の場合はボーナスなし
            return {
                bonusTime: 0,
                comboCount: hitCount
            };
        }
    }
    
    // 斬撃処理
    createSlash(pointer) {
        // ゲームが終了している場合は何もしない
        if (!this.gameActive) return;
        
        // ★フィーバー中のクールダウンチェック
        const now = this.time.now; // 現在時刻を取得
        if (this.isFeverTime && now < this.lastSlashTime + this.feverSlashCooldown) {
            return; // クールダウン中なら処理しない
        }
        this.lastSlashTime = now; // 最後に斬撃した時刻を更新

        // このウェーブで既に斬撃済みの場合は何もしない (フィーバー中は無視)
        if (!this.isFeverTime && !this.canSlashThisWave) return;
        
        // 斬撃音を再生（空振り時は再生しないように削除）
        
        // クリック位置のY座標
        const y = pointer.y;
        
        // --- 斬撃エフェクト (線) ---
        // 前回の線をクリア
        if (this.slashEffectLine) {
            this.slashEffectLine.destroy();
        }
        this.slashEffectLine = this.add.graphics();
        this.slashEffectLine.lineStyle(15, 0xffffff, 0.9); // 太さ15, 白, 不透明度0.9
        this.slashEffectLine.setDepth(6); // フラッシュより手前に表示
        
        this.slashEffectLine.beginPath();
        this.slashEffectLine.moveTo(0, y);
        this.slashEffectLine.lineTo(this.sys.game.config.width, y);
        this.slashEffectLine.strokePath();
        
        // 少し遅れて線を消す (例: 100ms後)
        this.time.delayedCall(100, () => {
            if (this.slashEffectLine) {
                this.slashEffectLine.destroy();
                this.slashEffectLine = null;
            }
        });
        // --------------------
        
        // 斬撃の判定範囲
        const slashTop = y - this.SLASH_HEIGHT / 2; // 判定自体は元の細い線基準
        const slashBottom = y + this.SLASH_HEIGHT / 2;
        
        // 斬撃に当たったボールを検出
        let hitCount = 0;
        let hitColorCounts = {}; // ★同一斬撃内での色ごとのヒット数を記録
        let slicedSomething = false; // この斬撃で何か切ったかのフラグ
        let hitBall = false; // この斬撃でボールに当たったかのフラグ
        let hitBomb = false; // この斬撃で爆弾に当たったかのフラグ
        
        // --- 通常ボールの衝突判定 (フィーバー中はスキップ) ---
        if (!this.isFeverTime) {
            this.balls.getChildren().forEach(ball => {
                // ボールがすでに斬られていないか確認
                if (ball.sliced) return;
                
                // ボールの上端と下端
                const ballTop = ball.y - this.BALL_DIAMETER / 2;
                const ballBottom = ball.y + this.BALL_DIAMETER / 2;
                
                // 斬撃とボールの衝突判定
                if (ballBottom >= slashTop && ballTop <= slashBottom) {
                    // ボールが斬撃に当たった
                    hitCount++;
                    
                    // このウェーブで斬ったボール数をカウント
                    const prevSlicedCount = this.currentWaveSlicedBalls; // デバッグ用
                    this.currentWaveSlicedBalls++;
                    console.log(`Sliced: ${prevSlicedCount} -> ${this.currentWaveSlicedBalls} / ${this.currentWaveTotalBalls}`); // ★デバッグログ追加
                    
                    // 全斬りボーナスチェック - すべてのボールを斬ったら「お見事！」ボーナス発動
                    if (this.currentWaveSlicedBalls === this.currentWaveTotalBalls && this.currentWaveTotalBalls > 0) {
                        this.triggerAllSlicedBonus();
                    }
                    
                    // ボールを斬られた状態にする
                    ball.sliced = true;
                    
                    // 斬撃音を再生（フィーバー中かどうかで音を変える）
                    if (this.isFeverTime) {
                        this.sound.play('fever_slash', { volume: 0.5 });
                    } else {
                        this.sound.play('slash', { volume: 0.5 });
                    }
                    
                    // ボールの色を変更（視覚効果）
                    ball.setStrokeStyle(3, 0xffffff);
                    
                    // --- スコア加算とポップアップ表示 (ボールごとに実行) ---
                    const scoreValue = 10;
                    this.score += scoreValue;
                    this.scoreText.setText(`${this.score}`); // スコア表示更新
                    
                    const scorePopup = this.add.text(ball.x, ball.y, `+${scoreValue}`, {
                        fontFamily: 'Arial Black',
                        fontSize: '24px',
                        fill: '#ffff00',
                        stroke: '#000000',
                        strokeThickness: 3
                    });
                    scorePopup.setOrigin(0.5);
                    this.tweens.add({
                        targets: scorePopup,
                        y: scorePopup.y - 40, // 少し上に移動
                        alpha: 0, // フェードアウト
                        duration: 800, // 0.8秒で消える
                        ease: 'Power1',
                        onComplete: () => {
                            scorePopup.destroy(); // アニメーション完了後に削除
                        }
                    });
                    // --------------------------------------------------
                    
                    // ボールの色情報を取得してカウント
                    if (ball.colorData) {
                        const colorHex = '#' + ball.colorData.color.toString(16).padStart(6, '0');
                        // ★同一斬撃内でのヒット数をカウント
                        if (!hitColorCounts[colorHex]) {
                            hitColorCounts[colorHex] = 0;
                        }
                        hitColorCounts[colorHex]++;
                        
                        // 永続カウント更新とフィーバーチェック
                        this.slicedCounts[colorHex]++;
                        this.slicedCountText[colorHex].setText(this.slicedCounts[colorHex]);

                        // フィーバー突入チェック (まだペンディング中でなければ)
                        if (!this.pendingFever && this.slicedCounts[colorHex] >= 10) { // ★ 20 から 10 に変更
                            this.pendingFever = true;
                            console.log(`FEVER PENDING for color ${colorHex}! Triggered count: ${this.slicedCounts[colorHex]}`); 
                            // オプション：カウンターの色を変えるなどのフィードバック
                            const counterText = this.slicedCountText[colorHex];
                            if (counterText) {
                                 // 例: 一時的に黄色にする
                                counterText.setFill('#ffff00'); 
                                this.time.delayedCall(1000, () => {
                                    // 1秒後に白に戻す（フィーバー開始時に戻すなど、調整が必要かも）
                                    if (counterText.active) counterText.setFill('#ffffff');
                                });
                            }
                        }
                        
                        // ボールを一時停止
                        if (ball.body) {
                            ball.body.setVelocity(0, 0);
                            
                            // カウンターへの吸収アニメーション開始 (★ 通常時のクールダウン時間を適用)
                            this.time.delayedCall(this.normalSlashCooldown, () => {
                                // ボールが存在するか確認
                                if (ball && ball.active) {
                                    // 対応するカウンターの位置を取得
                                    const counterCircle = this.counterCircles[colorHex];
                                    
                                    if (counterCircle) {
                                        // 吸収アニメーションの作成
                                        this.tweens.add({
                                            targets: ball,
                                            x: counterCircle.x,
                                            y: counterCircle.y,
                                            scaleX: 0.1,
                                            scaleY: 0.1,
                                            alpha: 0.7,
                                            ease: 'Cubic.easeIn',
                                            duration: 500,
                                            onComplete: () => {
                                                // アニメーション完了後にボールを削除
                                                ball.destroy();
                                                
                                                // ボール吸い込み効果音を再生
                                                this.sound.play('get', { volume: 0.4 });
                                                
                                                // カウンター強調表示エフェクト
                                                this.tweens.add({
                                                    targets: this.slicedCountText[colorHex],
                                                    scaleX: 1.3,
                                                    scaleY: 1.3,
                                                    duration: 150,
                                                    yoyo: true,
                                                    ease: 'Bounce.easeOut'
                                                });
                                            }
                                        });
                                    } else {
                                        // カウンターが見つからない場合は単純に消滅
                                        ball.destroy();
                                        // ボール吸い込み効果音を再生
                                        this.sound.play('get', { volume: 0.4 });
                                    }
                                }
                            });
                        }
                    } else {
                        // 色情報がない場合は単純に消滅
                        if (ball.body) {
                            ball.body.setVelocity(0, 0);
                            this.time.delayedCall(this.normalSlashCooldown, () => {
                                if (ball && ball.active) {
                                    ball.destroy();
                                }
                            });
                        }
                    }
                    
                    slicedSomething = true;
                    hitBall = true;
                }
            });
        }
        // -------------------------------------------

        // --- 爆弾との衝突判定 (フィーバー中はスキップ) ---
        if (!this.isFeverTime) {
            this.bombs.getChildren().forEach(bomb => {
                // 爆弾がすでに斬られていないか確認
                if (bomb.sliced) return;
                
                // 爆弾の上端と下端 (★爆弾サイズに合わせて調整が必要かも)
                const bombSize = 256; // 仮。実際のサイズ変数を使うべき
                const bombTop = bomb.y - bombSize / 2;
                const bombBottom = bomb.y + bombSize / 2;
                
                // 斬撃と爆弾の衝突判定
                if (bombBottom >= slashTop && bombTop <= slashBottom) {
                    // 爆弾が斬撃に当たった
                    hitBomb = true;
                    
                    // 爆弾を斬られた状態にする
                    bomb.sliced = true;
                    
                    // 爆弾登場音を停止
                    if (this.bombReadySound) {
                        this.bombReadySound.stop();
                        this.bombReadySound = null;
                    }
                    
                    // 爆弾爆発音を再生
                    this.sound.play('bomb', { volume: 0.6 });
                    
                    // 爆弾の見た目を変更（赤く点滅）
                    this.tweens.add({
                        targets: bomb,
                        alpha: 0.2,
                        yoyo: true,
                        repeat: 3, // 3回点滅
                        duration: 100,
                        onComplete: () => {
                            bomb.destroy(); // 点滅後に削除
                        }
                    });
                    
                    // ペナルティ処理
                    this.timeLeft -= 10; // 残り時間を10秒減らす
                    if (this.timeLeft < 0) {
                        this.timeLeft = 0; // 0秒未満にならないようにする
                    }
                    this.timeText.setText(this.formatTime(this.timeLeft)); // 時間表示を更新
                    
                    // ペナルティ表示
                    const penaltyText = this.add.text(bomb.x, bomb.y, '-10s', {
                        fontFamily: 'Arial Black',
                        fontSize: '30px',
                        fill: '#ff0000', // 赤色で表示
                        stroke: '#ffffff',
                        strokeThickness: 4
                    });
                    penaltyText.setOrigin(0.5);
                    this.tweens.add({
                        targets: penaltyText,
                        alpha: 0,
                        y: penaltyText.y - 50,
                        duration: 1500,
                        ease: 'Power1',
                        onComplete: () => {
                            penaltyText.destroy();
                        }
                    });
                    
                    slicedSomething = true;
                }
            });
        }
        // -------------------------------------------

        // --- コインとの衝突判定 (フィーバー中のみ) ---
        if (this.isFeverTime) {
            this.coins.getChildren().forEach(coin => {
                // コインがすでに斬られていないか確認 (念のため)
                if (coin.sliced) return;

                // コインの上端と下端 (★コインサイズに合わせて調整が必要)
                const coinDiameter = 32; // 仮。実際のサイズを使うべき
                const coinTop = coin.y - coinDiameter / 2;
                const coinBottom = coin.y + coinDiameter / 2;

                // 斬撃とコインの衝突判定
                if (coinBottom >= slashTop && coinTop <= slashBottom) {
                    // コインが斬撃に当たった
                    coin.sliced = true; // 斬られた状態にする
                    
                    // フィーバー中の斬撃音を再生
                    this.sound.play('fever_slash', { volume: 0.5 });
                    
                    // スコア加算 (+1000点)
                    const scoreValue = 1000;
                    this.score += scoreValue;
                    this.scoreText.setText(`${this.score}`); // スコア表示更新

                    // スコアポップアップ表示
                    const scorePopup = this.add.text(coin.x, coin.y, `+${scoreValue}`, {
                        fontFamily: 'Arial Black',
                        fontSize: '28px',
                        fill: '#ffd700', // 金色
                        stroke: '#000000',
                        strokeThickness: 3
                    });
                    scorePopup.setOrigin(0.5);
                    this.tweens.add({
                        targets: scorePopup,
                        y: scorePopup.y - 50, // 少し上に移動
                        alpha: 0, // フェードアウト
                        duration: 600, // 0.6秒で消える
                        ease: 'Power1',
                        onComplete: () => {
                            scorePopup.destroy(); // アニメーション完了後に削除
                        }
                    });

                    // コインを即座に削除 (アニメーションなし)
                    coin.destroy();
                    slicedSomething = true;
                }
            });
        }
        // -------------------------------------------

        // --- コンボ判定 (フィーバー中はスキップ) ---
        if (!this.isFeverTime && hitBall) { // ボールを斬った場合のみ連撃判定
            // 同じ色のボールがいくつ斬られたか集計
            let maxSameColorHit = 0;
            let comboX = pointer.x;
            let comboY = pointer.y;
            
            Object.keys(hitColorCounts).forEach(colorHex => {
                const count = hitColorCounts[colorHex];
                if (count > maxSameColorHit) {
                    maxSameColorHit = count;
                }
                // コンボ表示位置は最後に斬った同色ボールの位置を使う？（要検討）
            });
            
            // 2個以上同じ色を斬ったらコンボボーナス
            if (maxSameColorHit >= 2) {
                // コンボ表示 (3連撃以上でタイムボーナス)
                this.displayCombo(maxSameColorHit, comboX, comboY);
                if (maxSameColorHit >= 3) {
                    this.addTimeBonus(3, comboX, comboY); // 3秒ボーナス
                }
            }
        }
        // -------------------------------------------

        // 何も斬れなかった場合のペナルティ (フィーバー中はスキップ)
        if (!this.isFeverTime && !slicedSomething && !hitBomb && !this.isPostFeverGrace) { // hitBall は使わない (ボール以外も斬る可能性があるため)
            // 空振り音を再生
            this.sound.play('miss', { volume: 0.4 });
            
            this.timeLeft -= 5; // 残り時間を5秒減らす
            if (this.timeLeft < 0) {
                this.timeLeft = 0; // 0秒未満にならないようにする
            }
            this.timeText.setText(this.formatTime(this.timeLeft)); // 時間表示を更新
            
            // ペナルティ表示 (オプション)
            const penaltyText = this.add.text(pointer.x, pointer.y - 30, '-5s', {
                fontFamily: 'Arial',
                fontSize: '24px',
                fill: '#ff0000', // 赤色で表示
                stroke: '#ffffff',
                strokeThickness: 4
            });
            penaltyText.setOrigin(0.5);
            this.tweens.add({
                targets: penaltyText,
                alpha: 0,
                y: penaltyText.y - 50,
                duration: 1000,
                ease: 'Power1',
                onComplete: () => {
                    penaltyText.destroy();
                }
            });
        }
        
        // このウェーブでの斬撃を不可にする (フィーバー中はスキップ)
        if (!this.isFeverTime && hitBall) { // hitBall はループ内で true になる
            if (window.SLASH_PER_WAVE) { // グローバル定数を参照
                this.canSlashThisWave = false; // 斬撃不可にする
            }
        }
    }
    
    checkWaveStatus() {
        if (!this.gameActive) return;
 
        // アクティブなボールがないかチェック
        let activeBalls = 0;
        this.balls.getChildren().forEach(ball => {
            if (ball.active) { 
                activeBalls++;
            }
        });
 
        if (this.isWaveActive && activeBalls === 0) {
            // 現在のウェーブはアクティブだが、画面上のボールがなくなった場合
            this.isWaveActive = false; // ウェーブを非アクティブにする
        } else if (!this.isWaveActive && activeBalls === 0 && !this.waveStartScheduled) {
            // ウェーブ非アクティブ、ボールなし、かつまだスケジュールされていない場合のみ
            this.waveStartScheduled = true; // スケジュール済みフラグを立てる
            this.time.delayedCall(500, this.startNewWave, [], this);
        }
    }
    
    // 新しいボールのwaveを開始
    startNewWave() {
        if (!this.gameActive) return; // ゲームがアクティブでないなら何もしない

        // ★フィーバーモード突入チェック
        if (this.pendingFever) {
            this.pendingFever = false; // フラグをリセット
            // カウンターの色を戻す処理（もし変更していた場合）
            this.ballColorSettings.forEach(setting => {
                const colorHex = '#' + setting.color.toString(16).padStart(6, '0');
                const counterText = this.slicedCountText[colorHex];
                if (counterText && counterText.active) {
                    counterText.setFill('#ffffff');
                }
            });
            this.startFeverMode(); // フィーバーモード開始
            return; // 通常のウェーブは開始しない
        }
 
        // ウェーブ番号を増加
        this.waveNumber++;
        
        // ウェーブ情報リセット
        const ballsToThrowThisWave = 6; // ★実際にこのウェーブで投げるボール数
        this.currentWaveTotalBalls = ballsToThrowThisWave; // ★実際に投げる数を総数として記録
        this.currentWaveSlicedBalls = 0;
        console.log(`Wave ${this.waveNumber} Start! Throwing ${this.currentWaveTotalBalls} Balls`); // ログ更新
 
        // 新しいウェーブが実際に開始されたので、スケジュールフラグをリセット
        this.waveStartScheduled = false;
 
        // 新しいウェーブの開始時に背景画像を投げる
        this.throwBackgroundImage();
 
        this.isWaveActive = true;
 
        // 一度に6個のボールを投げる (実際に投げる数に合わせてループ)
        for (let i = 0; i < this.currentWaveTotalBalls; i++) { // ★記録した総数分ループ
            // わずかな遅延をつけて順番に投げる（完全な同時ではなく、少しずらす）
            this.time.delayedCall(i * 200, this.throwBall, [], this);
        }
        
        // 爆弾の出現条件を変更（ウェーブ3以降、たまに出現、連続して出現しない）
        if (this.waveNumber >= 3 && !this.bombAppeared) {
            // 30%の確率で爆弾を出現させる
            if (Phaser.Math.Between(1, 10) <= 3) {
                // ボールの後に少し遅れて爆弾を投げる
                this.time.delayedCall(this.currentWaveTotalBalls * 200 + 300, this.throwBomb, [], this);
                this.bombAppeared = true; // 爆弾が出現したフラグを立てる
                
                // 次のウェーブで爆弾フラグをリセットするタイマーを設定
                this.time.delayedCall(5000, () => {
                    this.bombAppeared = false; // 爆弾フラグをリセット
                    console.log("Bomb flag reset, can appear in future waves");
                }, [], this);
            }
        }
        
        // このウェーブでの斬撃を可能にする
        this.canSlashThisWave = true;
    }
    
    // 爆弾を投げる
    throwBomb() {
        // 画面下のランダムな位置から爆弾を投げる
        const x = Phaser.Math.Between(this.BALL_DIAMETER, this.sys.game.config.width - this.BALL_DIAMETER);
        const y = this.sys.game.config.height + this.BALL_DIAMETER / 2;
        
        // 爆弾スプライトを作成
        const bomb = this.add.sprite(x, y, 'bomb');
        bomb.setScale(1.0); // サイズを256x256に調整（元画像が256x256の場合はスケール1.0）
        this.bombs.add(bomb);
        
        // 爆弾登場音を再生
        this.bombReadySound = this.sound.add('bomb_ready', { loop: true, volume: 0.3 });
        this.bombReadySound.play();
        
        // 最前面に表示
        bomb.setDepth(10);
        
        // 物理特性を有効にする
        this.physics.add.existing(bomb);
        
        // 爆弾であることを示すフラグ
        bomb.isBomb = true;
        
        // 左右の壁との衝突設定
        this.physics.add.collider(bomb, this.leftWall, this.handleWallCollision, null, this);
        this.physics.add.collider(bomb, this.rightWall, this.handleWallCollision, null, this);
        
        // 放物線の頂点が画面上部指定位置になるように初速度を計算
        const gravity = this.GRAVITY;
        
        // 爆弾の初速度を計算
        const baseVelocityY = -Math.sqrt(2 * gravity * (y - (this.sys.game.config.height * 0.5)));
        
        // 水平方向の速度
        const baseHorizontalSpeed = 50; // 基本の水平速度
        const horizontalVariation = Phaser.Math.Between(-30, 30); // バリエーション
        const velocityX = baseHorizontalSpeed + horizontalVariation;
        
        // 左右ランダムに移動する
        const direction = Phaser.Math.Between(0, 1) === 0 ? -1 : 1;
        
        // 速度設定
        bomb.body.setVelocity(velocityX * direction, baseVelocityY);
        
        // バウンス設定（反射係数）
        bomb.body.setBounce(0.7);
        
        // 重力を設定
        bomb.body.setGravityY(gravity);
        
        // 回転アニメーション
        this.tweens.add({
            targets: bomb,
            angle: 360,
            duration: 2000,
            repeat: -1,
            ease: 'Linear'
        });
    }
    
    handleWallCollision(ball, wall) {
        // 壁に当たった時の処理
        // x速度を反転して反射させる
        ball.body.velocity.x = -ball.body.velocity.x;
        
        // 速度ブースト（1.5倍）
        ball.body.velocity.x *= 1.5;
        
        // 中央方向へのバイアスを追加
        const centerX = this.sys.game.config.width / 2;
        const distanceFromCenter = centerX - ball.x;
        const centerForce = distanceFromCenter * 0.08; // 中央に向かう力の強さ（調整可能）
        
        // 現在の速度に中央方向の力を加える
        ball.body.velocity.x += centerForce;
        
        // 速度の下限を設定（最低速度を保証）
        const minVelocity = 150;
        if (Math.abs(ball.body.velocity.x) < minVelocity) {
            ball.body.velocity.x = Math.sign(ball.body.velocity.x) * minVelocity;
        }
        
        // 速度の上限を設定して無限加速を防止
        const maxVelocity = 500;
        if (Math.abs(ball.body.velocity.x) > maxVelocity) {
            ball.body.velocity.x = Math.sign(ball.body.velocity.x) * maxVelocity;
        }
    }
    
    // ボールを投げる処理
    throwBall() {
        // 画面下のランダムな位置からボールを投げる
        const x = Phaser.Math.Between(this.BALL_DIAMETER, this.sys.game.config.width - this.BALL_DIAMETER);
        const y = this.sys.game.config.height + this.BALL_DIAMETER / 2;
        
        // ボールが到達する頂点をランダムに決定（画面上部20%〜70%の間）
        const minPeakY = this.sys.game.config.height * 0.2;  // 上から20%
        const maxPeakY = this.sys.game.config.height * 0.7;  // 上から70%
        const peakY = Phaser.Math.Between(minPeakY, maxPeakY);
        
        // ランダムな色の設定を選択
        const ballSetting = Phaser.Utils.Array.GetRandom(this.ballColorSettings);
        
        // ボールを円形で描画
        const ball = this.add.circle(x, y, this.BALL_DIAMETER / 2, ballSetting.color);
        this.balls.add(ball);
        
        // 物理特性を有効にする
        this.physics.add.existing(ball);
        
        // ボールに色の情報を保存
        ball.colorData = ballSetting;
        
        // 左右の壁との衝突設定
        this.physics.add.collider(ball, this.leftWall, this.handleWallCollision, null, this);
        this.physics.add.collider(ball, this.rightWall, this.handleWallCollision, null, this);
        
        // 放物線の頂点が画面上部指定位置になるように初速度を計算
        const gravity = this.GRAVITY;
        
        // 重要：すべてのボールが同じpeakYに到達するよう調整
        // 2次関数の公式を用いた計算：y = y0 + v0*t + 0.5*g*t^2
        // 頂点では速度が0になるので：t = v0/g, そこから v0 = sqrt(2*g*(y0-peakY))
        
        // すべてのボールが同じ高さに到達するための基本初速度
        const baseVelocityY = -Math.sqrt(2 * gravity * (y - peakY));
        
        // 色による速度差は到達時間に影響するが、同じ高さに到達する
        // 速度係数が大きいほど速く移動するが、同じ高さに到達する
        const velocityY = baseVelocityY;
        
        // 水平方向の速度を色に基づいて調整
        const baseHorizontalSpeed = 50; // 基本の水平速度
        const horizontalVariation = Phaser.Math.Between(-30, 30); // バリエーション
        const velocityX = (baseHorizontalSpeed + horizontalVariation) * ballSetting.speedFactor;
        
        // 左右ランダムに移動する
        const direction = Phaser.Math.Between(0, 1) === 0 ? -1 : 1;
        
        // 速度設定（垂直方向は全ボール同じ、水平方向は色による差を付ける）
        ball.body.setVelocity(velocityX * direction, velocityY);
        
        // バウンス設定（反射係数）
        ball.body.setBounce(1.0, 0); // x方向のみ反射、ちょうど保存
    }
    
    // 全斬りボーナス処理
    triggerAllSlicedBonus() {
        // ボーナスが複数回呼ばれないようにチェック (currentWaveSlicedBallsが-1なら既に実行済み)
        if (this.currentWaveSlicedBalls === -1) return;
        
        console.log("お見事！全斬りボーナス！"); // コンソールに表示
        // 「お見事！」効果音を再生
        this.sound.play('excellent', { volume: 0.7 });
        
        // ★スコアを1.1倍にする (小数点以下切り捨て)
        const bonusAmount = Math.floor(this.score * 0.1);
        this.score += bonusAmount;
        this.scoreText.setText(`${this.score}`);

        // 「お見事！」画像を表示
        const excellentImage = this.add.image(
            this.sys.game.config.width / 2,
            this.sys.game.config.height / 2,
            'excellent'
        );
        excellentImage.setOrigin(0.5);
        excellentImage.setDepth(10); // 最前面に表示
        excellentImage.setScale(0.1); // 初期サイズを小さく
        
        // アニメーションで表示して消す
        this.tweens.add({
            targets: excellentImage,
            scale: 1.0, // 元のサイズまで拡大
            duration: 500,
            ease: 'Bounce.easeOut',
            onComplete: () => {
                // 少し待ってからフェードアウト
                this.time.delayedCall(800, () => {
                    this.tweens.add({
                        targets: excellentImage,
                        alpha: 0,
                        duration: 300,
                        onComplete: () => {
                            excellentImage.destroy();
                        }
                    });
                });
            }
        });

        // 次のウェーブを即座に開始する（少し遅延させる）
        this.waveStartScheduled = true; // スケジュール済みフラグを立てる
        this.time.delayedCall(1000, this.startNewWave, [], this); // 1秒後に次のウェーブへ
        
        // 全斬りフラグをリセット
        this.currentWaveSlicedBalls = -1; // 特殊な値にしておく
    }
    
    // ★フィーバーモード開始処理
    startFeverMode() {
        console.log("FEVER MODE START!");
        this.isFeverTime = true;

        // フィーバー突入音を再生
        if (this.soundEnabled) {
            this.sound.play('fever_in', { volume: 0.6 });
        }

        // 1. メインタイマー停止
        if (this.timeEvent) {
            this.timeEvent.paused = true;
        }
        
        // 2. 既存のボールと爆弾をクリア
        if(this.balls) this.balls.clear(true, true);
        if(this.bombs) this.bombs.clear(true, true);
        // 既存のコインもクリア（念のため）
        if(this.coins) this.coins.clear(true, true);
        
        // TODO: 既存のボール生成タイマーなども止める必要があれば追加

        // 3. フィーバータイマー開始 (5秒)
        if (this.feverTimerEvent) this.feverTimerEvent.remove(); // 古いのがあれば削除
        this.feverTimerEvent = this.time.delayedCall(5000, this.endFeverMode, [], this);

        // 4. コイン生成タイマー開始 (例: 10msごと)
        this.coinSpawnTimer = this.time.addEvent({
            delay: 10, // 0.01秒ごとにコイン生成 (さらに倍)
            callback: this.spawnCoin,
            callbackScope: this,
            loop: true
        });
        
        // 5. TODO: 背景やBGM変更などの演出
        this.cameras.main.flash(300, 255, 255, 0); // 開始時にフラッシュ
        
        // 5. フィーバー開始テキスト表示
        const feverText = this.add.text(
            this.sys.game.config.width / 2,
            this.sys.game.config.height / 2,
            'FEVER!!!',
            {
                fontFamily: 'Impact', // 目立つフォント
                fontSize: '100px',
                fill: '#ff0000', // 赤
                stroke: '#ffff00',
                strokeThickness: 8
            }
        );
        feverText.setOrigin(0.5);
        feverText.setDepth(20); // 最前面
        
        // アニメーション
        this.tweens.add({
            targets: feverText,
            scale: 1.2,
            angle: Phaser.Math.Between(-5, 5), // 少し傾ける
            duration: 150,
            yoyo: true,
            ease: 'Bounce.easeOut',
            onComplete: () => {
                // 少し待ってからフェードアウト
                this.time.delayedCall(500, () => {
                    this.tweens.add({
                        targets: feverText,
                        alpha: 0,
                        duration: 300,
                        onComplete: () => {
                            feverText.destroy();
                        }
                    });
                });
            }
        });
    }

    // ★フィーバーモード終了処理
    endFeverMode() {
        console.log("FEVER MODE END!");
        this.isFeverTime = false;

        // 1. コイン生成タイマー停止
        if (this.coinSpawnTimer) {
            this.coinSpawnTimer.remove();
            this.coinSpawnTimer = null;
        }

        // 2. フィーバータイマーイベントクリア
        if (this.feverTimerEvent) {
            this.feverTimerEvent = null; 
        }

        // 3. メインタイマー再開
        if (this.timeEvent) {
            this.timeEvent.paused = false;
        }
        
        // 4. 画面を白くフェードアウト
        this.cameras.main.fadeOut(1000, 255, 255, 255, (camera, progress) => {
            if (progress === 1) {
                // 5. フェードアウト完了後に画面をリセット
                this.cameras.main.resetFX(); // フェードアウト効果をリセット
                this.cameras.main.fadeIn(500, 255, 255, 255); // フェードイン
                
                // 修正: 直接startNewWaveを呼ばず、フラグだけリセットして
                // 通常のウェーブ管理システム(checkWaveStatus)に任せる
                this.isWaveActive = false;
                this.waveStartScheduled = false;
            }
        });
        
        // ★4. フィーバー後猶予期間スタート
        this.isPostFeverGrace = true;
        if (this.postFeverGraceTimer) this.postFeverGraceTimer.remove(); // 古いのをクリア
        this.postFeverGraceTimer = this.time.delayedCall(3000, () => {
            console.log("Post-fever grace period ended.");
            this.isPostFeverGrace = false;
            this.postFeverGraceTimer = null; // タイマー参照をクリア
        }, [], this);
        console.log("Post-fever grace period started (3 seconds).");
    }

    // ★コインを生成して投げる処理
    spawnCoin() {
        if (!this.isFeverTime || !this.gameActive) return; // フィーバー中かつゲームアクティブ時のみ

        const { width, height } = this.sys.game.config;
        const x = Phaser.Math.Between(50, width - 50); // 画面左右端を除くX座標
        const y = height + 30; // 画面下部から開始
        const coinVelocityY = -800; // 上昇速度 (調整可能)
        const coinAngularVelocity = Phaser.Math.Between(-360, 360); // 回転 (オプション)

        const coin = this.coins.create(x, y, 'coin');
        if (!coin) return; // 生成失敗チェック

        coin.setDepth(5); // 爆弾より手前、ボールと同じくらい？
        coin.setCircle(16); // 当たり判定を円形に (半径16 = 直径32)
        coin.body.setAllowGravity(false); // 重力無効！
        coin.setVelocity(0, coinVelocityY); // 真上に移動
        coin.setAngularVelocity(coinAngularVelocity); // 回転させる

        // ★扇状に広がるように、X方向の速度にも少しランダム性を加える
        const velocityX = Phaser.Math.Between(-150, 150); // 横方向の速度 (-150 から +150 の範囲)
        coin.setVelocity(velocityX, coinVelocityY); // X方向にも速度を設定

        coin.setCollideWorldBounds(false); // 画面境界で跳ね返らない

        // 画面外に出たら自動で削除（非アクティブ化・非表示化）
        coin.checkWorldBounds = true;
        coin.body.onWorldBounds = true; // 世界境界との衝突イベントを有効に
        coin.body.world.on('worldbounds', (body) => {
            // 画面外（特に上外）に出たコインを削除
             if (body.gameObject === coin && coin.y < -100) { // 画面上部から十分離れたら
                 this.coins.killAndHide(coin);
                 coin.setActive(false);
                 coin.setVisible(false);
             }
        }, this);
    }

    // 背景画像を投げる関数
    throwBackgroundImage() {
        console.log("throwBackgroundImage called"); // デバッグログ追加
        
        // 新しい背景画像を生成する前に、既存の背景画像をすべて削除
        this.backgroundImages.getChildren().forEach(bgImage => {
            bgImage.destroy();
        });
        console.log("All existing background images cleared");
        
        // 利用可能な背景画像のキーリスト
        const availableBgImageKeys = [
            'backgroundImage',
            'backgroundImage2',
            'backgroundImage3',
            'backgroundImage4'
        ];
        // 他の背景画像を追加したら、このリストにもキーを追加してください (例: 'backgroundImage5')
 
        let randomBgKey;
        // 複数の画像があり、前回と同じものが選ばれたら選び直す
        if (availableBgImageKeys.length > 1) {
            do {
                randomBgKey = Phaser.Utils.Array.GetRandom(availableBgImageKeys);
            } while (randomBgKey === this.lastBgImageKey);
        } else {
            // 画像が1種類しかない場合はそのまま選ぶ
            randomBgKey = availableBgImageKeys[0];
        }
        
        this.lastBgImageKey = randomBgKey; // 今回選ばれたキーを記憶
        
        if (!this.textures.exists(randomBgKey) || !this.gameActive) {
            return;
        }

        const gameWidth = this.sys.game.config.width;
        const gameHeight = this.sys.game.config.height;

        // 画像を画面外下部から生成
        const bgImage = this.physics.add.image(
            gameWidth / 2,
            gameHeight + 150, // 開始位置を少し下に設定 (origin 0.5, 0.5 なので調整)
            randomBgKey // ランダムに選ばれたキーを使用
        );

        bgImage.setOrigin(0.5, 0.5); // 画像の中央を基点にする

        // キャンバス幅に合わせてスケール調整
        const originalWidth = bgImage.width;
        bgImage.displayWidth = gameWidth;
        bgImage.scaleY = bgImage.scaleX; // アスペクト比を維持

        bgImage.setDepth(-1); // ボールより後ろに表示
        bgImage.setCollideWorldBounds(false); // 画面境界との衝突を無効化
        bgImage.body.setAllowGravity(true); // 重力を有効にする
        bgImage.body.setGravityY(this.GRAVITY / 4); // 重力をボールの1/4に設定 (弱くする)

        // 画像を上方向に投げる（速度はランダム）
        const initialVelocityY = Phaser.Math.Between(-550, -450); // 上方向への初速 (-550 ~ -450の範囲)

        bgImage.body.setVelocityY(initialVelocityY);

        // X方向にもわずかな揺れを与える（オプション）
        const initialVelocityX = Phaser.Math.Between(-20, 20);
        bgImage.body.setVelocityX(initialVelocityX);
        bgImage.body.setBounceX(1); // 左右の壁で跳ね返るようにする
        bgImage.body.setImmovable(true); // 他の物理オブジェクトに影響を与えないようにする

        // 左右の壁との衝突を設定
        this.physics.add.collider(bgImage, this.leftWall);
        this.physics.add.collider(bgImage, this.rightWall);
    }
    
    playBGM() {
        // 既存のBGMを停止
        if (this.currentBgm) {
            this.currentBgm.stop();
        }
        
        // bgmCounterに基づいてBGMを選択（0ならbgm01、1ならbgm02）
        const bgmKey = this.bgmCounter % 2 === 0 ? 'bgm01' : 'bgm02';
        
        // BGMを再生（ループあり、音量調整）
        this.currentBgm = this.sound.add(bgmKey, {
            loop: true,
            volume: 0.5
        });
        this.currentBgm.play();
        
        console.log(`Playing ${bgmKey}`);
    }
    
    // サウンドオンオフボタンを作成
    createSoundToggleButton() {
        const width = this.sys.game.config.width;
        const height = this.sys.game.config.height;
        
        // ボタンの背景
        const soundButton = this.add.circle(
            width - 30,
            height - 30,
            20,
            0x333333
        );
        soundButton.setAlpha(0.7);
        soundButton.setDepth(100);
        soundButton.setInteractive({ useHandCursor: true });
        
        // ボタンのアイコン（音符マーク）
        const soundIcon = this.add.text(
            width - 30,
            height - 30,
            this.soundEnabled ? '🔊' : '🔇',
            {
                fontFamily: 'Arial',
                fontSize: '20px',
                fill: '#ffffff'
            }
        );
        soundIcon.setOrigin(0.5);
        soundIcon.setDepth(101);
        
        // ボタンのホバーエフェクト
        soundButton.on('pointerover', () => {
            soundButton.setFillStyle(0x555555);
        });
        
        soundButton.on('pointerout', () => {
            soundButton.setFillStyle(0x333333);
        });
        
        // クリックイベント
        soundButton.on('pointerdown', () => {
            this.soundEnabled = !this.soundEnabled;
            soundIcon.setText(this.soundEnabled ? '🔊' : '🔇');
            
            // サウンドの状態を切り替え
            if (!this.soundEnabled) {
                // サウンドをミュート
                this.sound.setMute(true);
            } else {
                // サウンドのミュートを解除
                this.sound.setMute(false);
            }
        });
        
        // 参照を保存
        this.soundButton = soundButton;
        this.soundIcon = soundIcon;
    }
}