// カードクラス
class Card {
    constructor(suit, rank) {
        this.suit = suit;
        this.rank = rank;
    }

    toString() {
        return `${this.rank}${this.suit}`;
    }

    static compareCards(a, b) {
        const ranks = '23456789TJQKA';
        return ranks.indexOf(b.rank) - ranks.indexOf(a.rank);
    }
}

// デッキクラス
class Deck {
    constructor() {
        this.reset();
    }

    reset() {
        const suits = ['♠', '♥', '♦', '♣'];
        const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
        this.cards = suits.flatMap(suit => ranks.map(rank => new Card(suit, rank)));
        this.shuffle();
    }

    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    draw() {
        return this.cards.pop();
    }
}

// プレイヤークラス
class Player {
    constructor(name, chips) {
        this.name = name;
        this.chips = chips;
        this.hand = [];
        this.bet = 0;
        this.totalBet = 0;
        this.isFolded = false;
        this.isAllIn = false;
    }

    receiveCard(card) {
        this.hand.push(card);
    }

    placeBet(amount) {
        amount = Math.min(amount, this.chips);
        this.chips -= amount;
        this.bet += amount;
        this.totalBet += amount;
        if (this.chips === 0) {
            this.isAllIn = true;
        }
        return amount;
    }

    fold() {
        this.isFolded = true;
    }

    resetForNewHand() {
        this.hand = [];
        this.bet = 0;
        this.totalBet = 0;
        this.isFolded = false;
        this.isAllIn = false;
    }
}

// ゲームクラス
class TexasHoldem {
    constructor(playerNames, startingChips, smallBlind) {
        this.players = playerNames.map(name => new Player(name, startingChips));
        this.deck = new Deck();
        this.communityCards = [];
        this.pot = 0;
        this.sidePots = [];
        this.currentBet = 0;
        this.smallBlind = smallBlind;
        this.bigBlind = smallBlind * 2;
        this.minRaise = this.bigBlind;
        this.buttonIndex = 0;
        this.currentPlayerIndex = 0;
        this.lastAggressorIndex = null;
        this.gameStage = 'waiting';
    }

    startNewHand() {
        this.deck.reset();
        this.communityCards = [];
        this.pot = 0;
        this.sidePots = [];
        this.currentBet = 0;
        this.minRaise = this.bigBlind;
        this.gameStage = 'preflop';
        this.players.forEach(player => player.resetForNewHand());

        // ブラインドの徴収
        this.buttonIndex = (this.buttonIndex + 1) % this.players.length;
        const sbIndex = (this.buttonIndex + 1) % this.players.length;
        const bbIndex = (this.buttonIndex + 2) % this.players.length;
        this.players[sbIndex].placeBet(this.smallBlind);
        this.players[bbIndex].placeBet(this.bigBlind);
        this.pot = this.smallBlind + this.bigBlind;
        this.currentBet = this.bigBlind;

        // 初期ハンドの配布
        for (let i = 0; i < 2; i++) {
            for (let player of this.players) {
                player.receiveCard(this.deck.draw());
            }
        }

        this.currentPlayerIndex = (bbIndex + 1) % this.players.length;
        this.lastAggressorIndex = bbIndex;
        this.updateUI();
    }

    playerAction(action, amount = 0) {
        const player = this.players[this.currentPlayerIndex];
        
        switch (action) {
            case 'fold':
                player.fold();
                break;
            case 'check':
                if (player.bet !== this.currentBet) {
                    throw new Error('チェックできません。コールまたはフォールドしてください。');
                }
                break;
            case 'call':
                this.pot += player.placeBet(this.currentBet - player.bet);
                break;
            case 'raise':
                if (amount < this.currentBet + this.minRaise) {
                    throw new Error(`最小レイズは ${this.currentBet + this.minRaise} です。`);
                }
                this.pot += player.placeBet(amount - player.bet);
                this.currentBet = amount;
                this.minRaise = this.currentBet - this.lastAggressorIndex;
                this.lastAggressorIndex = this.currentPlayerIndex;
                break;
        }

        if (this.isRoundComplete()) {
            this.nextStage();
        } else {
            this.nextPlayer();
        }

        this.updateUI();
    }

    nextPlayer() {
        do {
            this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        } while (this.players[this.currentPlayerIndex].isFolded || this.players[this.currentPlayerIndex].isAllIn);
    }

    isRoundComplete() {
        const activePlayers = this.players.filter(p => !p.isFolded && !p.isAllIn);
        return activePlayers.every(p => p.bet === this.currentBet) && 
               (this.currentPlayerIndex === this.lastAggressorIndex || activePlayers.length === 1);
    }

    nextStage() {
        switch (this.gameStage) {
            case 'preflop':
                this.gameStage = 'flop';
                this.dealCommunityCards(3);
                break;
            case 'flop':
                this.gameStage = 'turn';
                this.dealCommunityCards(1);
                break;
            case 'turn':
                this.gameStage = 'river';
                this.dealCommunityCards(1);
                break;
            case 'river':
                this.showdown();
                return;
        }
        this.startNewBettingRound();
    }

    dealCommunityCards(num) {
        for (let i = 0; i < num; i++) {
            this.communityCards.push(this.deck.draw());
        }
    }

    startNewBettingRound() {
        this.players.forEach(player => player.bet = 0);
        this.currentBet = 0;
        this.minRaise = this.bigBlind;
        this.currentPlayerIndex = (this.buttonIndex + 1) % this.players.length;
        this.lastAggressorIndex = null;
    }

    showdown() {
        this.gameStage = 'showdown';
        const activePlayersHands = this.players
            .filter(p => !p.isFolded)
            .map(p => ({
                player: p,
                hand: this.evaluateHand([...p.hand, ...this.communityCards])
            }))
            .sort((a, b) => b.hand.strength - a.hand.strength);

        // サイドポットの計算
        this.calculateSidePots();

        // 勝者の決定と賞金の分配
        let remainingPot = this.pot;
        for (const sidePot of this.sidePots) {
            const eligiblePlayers = activePlayersHands.filter(p => sidePot.players.includes(p.player));
            const winners = this.determineWinners(eligiblePlayers);
            const winAmount = Math.floor(sidePot.amount / winners.length);
            winners.forEach(winner => {
                winner.player.chips += winAmount;
                remainingPot -= winAmount;
            });
        }

        // メインポットの分配
        const mainPotWinners = this.determineWinners(activePlayersHands);
        const mainPotWinAmount = Math.floor(remainingPot / mainPotWinners.length);
        mainPotWinners.forEach(winner => {
            winner.player.chips += mainPotWinAmount;
        });

        this.displayResults(mainPotWinners);
        this.updateUI();
    }

    calculateSidePots() {
        const sortedPlayers = this.players.filter(p => !p.isFolded).sort((a, b) => a.totalBet - b.totalBet);
        let previousBet = 0;
        this.sidePots = [];

        for (let i = 0; i < sortedPlayers.length; i++) {
            const currentPlayer = sortedPlayers[i];
            if (currentPlayer.totalBet > previousBet) {
                const sidePotAmount = (currentPlayer.totalBet - previousBet) * (sortedPlayers.length - i);
                this.sidePots.push({
                    amount: sidePotAmount,
                    players: sortedPlayers.slice(i)
                });
                previousBet = currentPlayer.totalBet;
            }
        }
    }

    determineWinners(eligiblePlayers) {
        const bestHand = eligiblePlayers[0].hand;
        return eligiblePlayers.filter(p => p.hand.strength === bestHand.strength);
    }

    evaluateHand(cards) {
        // ハンドの評価ロジック（7枚のカードから最強の5枚を選ぶ）
        const allCombinations = this.getCombinations(cards, 5);
        const evaluatedHands = allCombinations.map(combo => this.rankHand(combo));
        return evaluatedHands.sort((a, b) => b.strength - a.strength)[0];
    }

    getCombinations(cards, k) {
        if (k > cards.length || k <= 0) {
            return [];
        }
        if (k === cards.length) {
            return [cards];
        }
        if (k === 1) {
            return cards.map(card => [card]);
        }
        const combinations = [];
        for (let i = 0; i < cards.length - k + 1; i++) {
            const head = cards.slice(i, i + 1);
            const tailCombos = this.getCombinations(cards.slice(i + 1), k - 1);
            tailCombos.forEach(tailCombo => {
                combinations.push(head.concat(tailCombo));
            });
        }
        return combinations;
    }

    rankHand(hand) {
        hand.sort(Card.compareCards);
        const ranks = hand.map(card => card.rank);
        const suits = hand.map(card => card.suit);
        const rankCounts = {};
        ranks.forEach(rank => rankCounts[rank] = (rankCounts[rank] || 0) + 1);
        const uniqueRanks = Object.keys(rankCounts).length;
        const isFlush = suits.every(suit => suit === suits[0]);
        const isStraight = this.checkStraight(ranks);

        if (isFlush && isStraight && ranks[0] === 'A') return { name: 'ロイヤルフラッシュ', strength: 9 };
        if (isFlush && isStraight) return { name: 'ストレートフラッシュ', strength: 8 };
        if (uniqueRanks === 2 && Math.max(...Object.values(rankCounts)) === 4) return { name: 'フォーカード', strength: 7 };
        if (uniqueRanks === 2) return { name: 'フルハウス', strength: 6 };
        if (isFlush) return { name: 'フラッシュ', strength: 5 };
        if (isStraight) return { name: 'ストレート', strength: 4 };
        if (uniqueRanks === 3 && Math.max(...Object.values(rankCounts)) === 3) return { name: 'スリーカード', strength: 3 };
        if (uniqueRanks === 3) return { name: 'ツーペア', strength: 2 };
        if (uniqueRanks === 4) return { name: 'ワンペア', strength: 1 };
        return { name: 'ハイカード', strength: 0 };
    }

    checkStraight(ranks) {
        const order = '23456789TJQKA';
        const indices = ranks.map(rank => order.indexOf(rank)).sort((a, b) => a - b);
        if (indices[4] - indices[0] === 4) return true;
        // エースローストレートのチェック
        if (indices[4] === 12 && indices[3] === 3 && indices[0] === 0) return true;
        return false;
    }

    displayResults(winners) {
        const winnerNames = winners.map(w => w.player.name).join(', ');
        const handName = winners[0].hand.name;
        alert(`勝者: ${winnerNames}\nハンド: ${handName}`);
    }

    updateUI() {
        // UIの更新ロジック（HTMLの更新）
        document.getElementById('community-cards').innerHTML = this.communityCards.map(card => `<div class="card">${card}</div>`).join('');
        document.getElementById('pot-amount').textContent = this.pot;
        document.getElementById('game-stage').textContent = this.gameStage;

        const playersDiv = document.getElementById('players');
        playersDiv.innerHTML = '';
        this.players.forEach((player, index) => {
            const playerDiv = document.createElement('div');
            playerDiv.className = `player-info ${index === this.currentPlayerIndex ? 'current' : ''}`;
            playerDiv.innerHTML = `
                <span>${player.name} (${player.chips} chips)</span>
                <span>${player.isFolded ? 'Folded' : player.hand.map(card => `
