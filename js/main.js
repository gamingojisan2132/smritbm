// ゲームインスタンスを作成
const game = new Phaser.Game(config);

// --- ゲーム設定 (定数) ---
window.BALL_DIAMETER = 80; // ボールの直径
window.BALL_SPAWN_INTERVAL = 500; // ボール生成間隔 (ミリ秒)
window.SLASH_COOLDOWN = 300; // 斬撃のクールダウンタイム（ミリ秒）
window.SLASH_PER_WAVE = false; // ウェーブごとに斬撃を1回に制限するかどうか
window.MAX_WAVES = 5; // 最大ウェーブ数