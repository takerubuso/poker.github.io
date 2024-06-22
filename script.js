updateUI() {
    // ゲームステージの更新
    document.getElementById('game-stage').textContent = this.gameStage;
    
    // ポット金額の更新
    document.getElementById('pot-amount').textContent = this.pot;
    
    // コミュニティカードの更新
    document.getElementById('community-cards').innerHTML = this.communityCards.map(card => `<div class="card">${card}</div>`).join('');
    
    // プレイヤー情報の更新
    const playersDiv = document.getElementById('players');
    playersDiv.innerHTML = '';
    this.players.forEach((player, index) => {
        const playerDiv = document.createElement('div');
        playerDiv.className = `player-info ${index === this.currentPlayerIndex ? 'current' : ''}`;
        playerDiv.innerHTML = `
            <span>${player.name} (${player.chips} chips)</span>
            <span>ベット: ${player.bet}</span>
            <span>手札: ${player.isFolded ? 'Folded' : player.hand.map(card => `<div class="card">${card}</div>`).join('')}</span>
        `;
        playersDiv.appendChild(playerDiv);
    });
    
    // 現在のプレイヤーの更新
    document.getElementById('current-player').textContent = this.players[this.currentPlayerIndex].name;
    
    // 現在のベットの更新
    document.getElementById('current-bet').textContent = this.currentBet;
    
    // アクションボタンの更新
    const currentPlayer = this.players[this.currentPlayerIndex];
    document.getElementById('fold-btn').disabled = currentPlayer.isFolded;
    document.getElementById('check-btn').disabled = this.currentBet > currentPlayer.bet;
    document.getElementById('call-btn').disabled = this.currentBet === currentPlayer.bet;
    document.getElementById('raise-btn').disabled = currentPlayer.chips === 0;
    document.getElementById('raise-amount').max = currentPlayer.chips;
    
    // ゲーム開始ボタンの表示/非表示
    document.getElementById('start-btn').style.display = this.gameStage === 'waiting' ? 'inline-block' : 'none';
    document.getElementById('reset-btn').style.display = this.gameStage !== 'waiting' ? 'inline-block' : 'none';
}
// ゲームのインスタンスを作成
const game = new TexasHoldem(['Player 1', 'Player 2', 'Player 3', 'Player 4'], 1000, 10);

// ゲーム開始ボタン
document.getElementById('start-btn').addEventListener('click', () => {
    game.startNewHand();
});

// リセットボタン
document.getElementById('reset-btn').addEventListener('click', () => {
    // リセットロジックを実装する必要があります
    console.log('Game reset');
    // 例: game = new TexasHoldem(['Player 1', 'Player 2', 'Player 3', 'Player 4'], 1000, 10);
    game.updateUI();
});

// フォールドボタン
document.getElementById('fold-btn').addEventListener('click', () => {
    game.playerAction('fold');
});

// チェックボタン
document.getElementById('check-btn').addEventListener('click', () => {
    game.playerAction('check');
});

// コールボタン
document.getElementById('call-btn').addEventListener('click', () => {
    game.playerAction('call');
});

// レイズボタン
document.getElementById('raise-btn').addEventListener('click', () => {
    const raiseAmount = parseInt(document.getElementById('raise-amount').value);
    game.playerAction('raise', raiseAmount);
});

// 初期UIの更新
game.updateUI();
