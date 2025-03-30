// ゲームの設定
const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: 414,
    height: 736,
    backgroundColor: '#4488aa',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 300 },
            debug: false
        }
    },
    scene: [BallGame],
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    }
};