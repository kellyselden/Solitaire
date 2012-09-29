function Solitaire(canvas, score, timer) {
	var solitaire = this;
	var helper = new CanvasHelper(canvas, 'rgb(50, 50, 50)');
	
	//options
	this.drawThree = true;
	var wasteIncludedInSolve = false;
	var canRemoveFromFoundations = false;
	this.deckName = 'Deck 1';
	
	//game state
	var scoreTimerIntervalID;
	var timerHelper = new TimerHelper(timer);
	
	//move state
	var returningIntervalID = 0;
	var cardsInPlay = [];
	var cardsReturning = false;
	
	var numberOfDecks = 2;
	
	function startTimer() {
		timerHelper.start();
		scoreTimerIntervalID = setInterval(function() {
			addPoints(-2);
		}, 10000);
	}
	function stopTimer() {
		timerHelper.stop();
		clearInterval(scoreTimerIntervalID);
	}
	function resetTimer() {
		stopTimer();
		timer.innerHTML = '00:00:00';
	}
	
	function resetScore() {
		score.innerHTML = '0';
	}
	
	function addPoints(points) {
		score.innerHTML = parseInt(score.innerHTML) + points;
	}
	
	this.toggleDrawNumber = function() {
		this.drawThree = !this.drawThree;
		this.newGame();
	}
	
	this.toggleDeckNumber = function() {
		var parts = this.deckName.split(' ');
		var deckNumber = parts[1];
		if (deckNumber == numberOfDecks)
			deckNumber = 1;
		else deckNumber++;
		this.deckName = parts[0] + ' ' + deckNumber;
		
		resetCards();
	}
	
	var Card = CanvasImageObject.extend({
		init: function(id, filename) {
			this.faceUp = false;
			this.pile = null;
			this.image = loadCardImage(filename);
			this._super(id, 0, 0, 0, 0, 0, false, function() {
				return this.faceUp ? this.image : backOfCardImage;
			}, 1, 1);
		},
		onmousedown: function() {
			if (sources.indexOf(this.pile) != -1) {
				cardsInPlay = this.pile.getCardsForPlay(this);
				if (cardsInPlay.length)
					this.pile.prepareForDragging();
			}
		},
		onclick: function() {
			if (this.pile == stock)
				draw();
		},
		ondrag: function(changeX, changeY) {
			moveCards(cardsInPlay.slice(1), changeX, changeY);
		},
		ondragend: function() {
			for (var i in destinations) {
				var pile = destinations[i];
				if (pile == this.pile) continue;
				var intersect = helper.getIntersect(
					new Rect(pile.topX, pile.topY,
						pile.topX + pile.width,
						pile.topY + pile.height),
					new Rect(this.x, this.y,
						this.x + this.width,
						this.y + this.height));
				if (intersect && pile.canAcceptCards(cardsInPlay)) {
					transferCards(cardsInPlay, pile);
					return;
				}
			}
			transferCards(cardsInPlay, this.pile);
		},
		ondblclick: function() {
			if (fanningPiles.indexOf(this.pile) != -1 &&
				this.pile.peek() == this)
			{
				cardsInPlay = [this];
				for (var i in foundations)
					if (foundations[i].canAcceptCards(cardsInPlay)) {
						this.pile.prepareForDragging();
						transferCards(cardsInPlay, foundations[i]);
						break;
					}
			}
		}
	});

	function loadCardImage(filename) {
		var image = new Image();
		image.src = solitaire.deckName + '/' + filename;
		return image;
	}
	
	function startReturningCards(callback) {
		var card = cardsInPlay[0];
		var pile = card.pile;
		function isDoneMoving() {
			return card.x == pile.retX
				&& card.y == pile.retY;
		}
		function complete() {
			clearInterval(returningIntervalID);
			pile.doneReturning();
			for (var i in cardsInPlay)
				cardsInPlay[i].zindex = pile.pile.length - cardsInPlay.length + parseInt(i);
			cardsInPlay = [];
			cardsReturning = helper.turnOffEvents = false;
			pile.updateTop();
			if (callback) callback();
		}
		if (isDoneMoving()) {
			complete();
			return;
		}
		cardsReturning = helper.turnOffEvents = true;
		returningIntervalID = setInterval(function() {
			var diffX = card.x - pile.retX;
			var diffY = card.y - pile.retY;
			var diffZ = Math.sqrt(diffX * diffX + diffY * diffY);
			var distZ = 25;
			var distX = Math.round(diffX * distZ / diffZ) || 0;
			var distY = Math.round(diffY * distZ / diffZ) || 0;
			distX = distX > 0 ? Math.min(distX, diffX) : Math.max(distX, diffX);
			distY = distY > 0 ? Math.min(distY, diffY) : Math.max(distY, diffY);
			moveCards(cardsInPlay, -distX, -distY);
			helper.paint();
			if (isDoneMoving()) complete();
		}, 5);
	}
	
	function moveCards(cards, distX, distY) {
		for (var i in cards) {
			cards[i].x += distX;
			cards[i].y += distY;
		}
	}
	
	var Pile = CanvasColorObject.extend({
		init: function(id) {
			this.topX = 0;
			this.topY = 0;
			this.retX = 0;
			this.retY = 0;
			this.pile = new Array();
			this._super(id, 0, 0, 0, 0, -1, false, 'rgb(0, 50, 0)');
		},
		push: function(cards) {
			if (!(cards instanceof Array))
				cards = [cards];
			for (var i in cards) {
				var card = cards[i];
				card.pile = this;
				if (cardsInPlay.indexOf(card) == -1) {
					this.positionCard(card);
					card.zindex = this.pile.length;
				}
				this.pile.push(card);
			}
		},
		peek: function() {
			return this.pile[this.pile.length - 1];
		},
		pop: function() {
			var card = this.pile.pop();
			card.pile = null;
			return card;
		},
		positionCard: function(card) {
			card.x = this.x;
			card.y = this.y;
		},
		positionCards: function() {
			for (var i in this.pile)
				if (cardsInPlay.indexOf(this.pile[i]) == -1)
					this.positionCard(this.pile[i]);
		},
		updateTop: function() {
			var card;
			for (var i in this.pile)
				if (cardsInPlay.indexOf(this.pile[this.pile.length - 1 - i]) == -1) {
					card = this.pile[this.pile.length - 1 - i];
					break;
				}
			this.topX = card ? card.x : this.x;
			this.topY = card ? card.y : this.y;
		},
		prepareForDragging: function() {
			this.updateTop();
			this.retX = cardsInPlay[0].x;
			this.retY = cardsInPlay[0].y;
			for (var i in cardsInPlay)
				cardsInPlay[i].zindex = 53 + parseInt(i);
		},
		prepareForReturning: function() {
			this.retX = this.topX
			this.retY = this.topY;
		},
		doneReturning: function() {
			this.retX =
			this.retY = 0;
		}
	});
	var Stock = Pile.extend({
		push: function(card) {
			card.faceUp = false;
			card.draggable = false;
			this._super(card);
		},
		onclick: function() {
			redeal();
		}
	});
	var Foundation = Pile.extend({
		push: function(cards) {
			this._super(cards);
			this.peek().draggable = false;
		},
		canAcceptCards: function(cards) {
			if (cards.length > 1) return false;
			var lastCard = this.peek();
			if (!lastCard)
				return cards[0].id % 13 == 0;
			if (lastCard.id % 13 == 12)
				return false;
			return cards[0].id == lastCard.id + 1;
		},
		getCardsForPlay: function(card) {
			return canRemoveFromFoundations ? [card] : [];
		}
	});
	var FanningPile = Pile.extend({
		push: function(cards) {
			this._super(cards);
			this.updateTop();
		},
		pop: function() {
			var card = this._super();
			this.updateTop();
			return card;
		},
		positionCards: function(cards, updateFunc) {
			this._super();
			for (var i in cards) {
				var card = cards[i];
				if (cardsInPlay.indexOf(card) != -1) break;
				var lastCard = cards[i - 1];
				if (lastCard)
					updateFunc(card, lastCard);
			}
			this.updateTop();
		}
	});
	var Waste = FanningPile.extend({
		init: function(id) {
			this._super(id);
			this.drawIndex = 0;
		},
		push: function(cards) {
			for (var i in this.pile)
				this.pile[i].draggable = false;
			for (var i in cards)
				cards[i].faceUp = true;
			this._super(cards);
			this.peek().draggable = true;
			this.positionCards();
		},
		pop: function() {
			var card = this._super();
			this.drawIndex = Math.min(this.drawIndex, this.pile.length - 1);
			if (this.peek())
				this.peek().draggable = true;
			return card;
		},
		positionCards: function() {
			this._super(this.pile.slice(
				Math.max(solitaire.drawThree ? -3 : -1, this.drawIndex - this.pile.length )),
				function(card, lastCard) { card.x = lastCard.x + cardFanningX });
		},
		getCardsForPlay: function(card) {
			return this.peek() == card ? [card] : [];
		},
		prepareForReturning: function() {
			this._super();
			if (this.pile.indexOf(cardsInPlay[0]) > 0 &&
				this.drawIndex < this.pile.length - 1)
				this.retX += cardFanningX;
		}
	});
	var Tableau = FanningPile.extend({
		push: function(cards) {
			this._super(cards);
			this.positionCards();
		},
		pop: function() {
			var card = this._super();
			var lastCard = this.peek();
			if (lastCard && !lastCard.faceUp) {
				lastCard.faceUp = true;
				lastCard.draggable = true;
				lastCard.repaint = true;
				addPoints(5);
			}
			return card;
		},
		positionCards: function() {
			this._super(this.pile,
				function(card, lastCard) { card.y = lastCard.y + cardFanningY });
		},
		canAcceptCards: function(cards) {
			var lastCard = this.peek();
			if (!lastCard)
				return cards[0].id % 13 == 12;
			if (lastCard.id % 13 == 0)
				return false;
			return cards[0].id % 26 == (lastCard.id + 13) % 26 - 1;
		},
		getCardsForPlay: function(card) {
			return card.faceUp ? this.pile.slice(this.pile.indexOf(card)) : [];
		},
		prepareForReturning: function() {
			this._super();
			if (this.pile.indexOf(cardsInPlay[0]) > 0)
				this.retY += cardFanningY;
		}
	});
	
	var stock = new Stock('stock');
	var waste = new Waste('waste');
	var firstFoundation = new Foundation('firstFoundation');
	var secondFoundation = new Foundation('secondFoundation');
	var thirdFoundation = new Foundation('thirdFoundation');
	var fourthFoundation = new Foundation('fourthFoundation');
	var firstTableau = new Tableau('firstTableau');
	var secondTableau = new Tableau('secondTableau');
	var thirdTableau = new Tableau('thirdTableau');
	var fourthTableau = new Tableau('fourthTableau');
	var fifthTableau = new Tableau('fifthTableau');
	var sixthTableau = new Tableau('sixthTableau');
	var seventhTableau = new Tableau('seventhTableau');
	
	var foundations = [
		firstFoundation,
		secondFoundation,
		thirdFoundation,
		fourthFoundation
	];
	
	var tableaus = [
		firstTableau,
		secondTableau,
		thirdTableau,
		fourthTableau,
		fifthTableau,
		sixthTableau,
		seventhTableau
	];
	
	var destinations = tableaus.concat(foundations);
	var sources = [waste].concat(destinations);
	var fanningPiles = [waste].concat(tableaus);
	var piles = [stock].concat(sources);
	
	for (var i in piles)
		helper.add(piles[i]);
	
	var cardWidth, cardHeight;
	var cardWidthScaleFactor, cardHeightScaleFactor;
	var cardFanningX, cardFanningY;
	this.scale = function() {
		var section = canvas.width / 7;
		var unroundedCardWidth = section * .9;
		cardWidth = Math.round(unroundedCardWidth);
		cardHeight = Math.round(backOfCardImage.height * unroundedCardWidth / backOfCardImage.width);
		var padding = Math.round(section * .05);
		
		cardWidthScaleFactor = backOfCardImage.width / cardWidth;
		cardHeightScaleFactor = backOfCardImage.height / cardHeight;
		
		cardFanningX = Math.round(cardWidth / 4);
		cardFanningY = Math.round(cardHeight / 5);
		
		stock.y =
		waste.y =
		firstFoundation.y =
		secondFoundation.y =
		thirdFoundation.y =
		fourthFoundation.y = padding;
		
		firstTableau.x = stock.x = padding;
		secondTableau.x = waste.x = Math.round(section) + padding;
		thirdTableau.x = Math.round(section * 2) + padding;
		fourthTableau.x = firstFoundation.x = Math.round(section * 3) + padding;
		fifthTableau.x = secondFoundation.x = Math.round(section * 4) + padding;
		sixthTableau.x = thirdFoundation.x = Math.round(section * 5) + padding;
		seventhTableau.x = fourthFoundation.x = Math.round(section * 6) + padding;
		
		firstTableau.y =
		secondTableau.y =
		thirdTableau.y =
		fourthTableau.y =
		fifthTableau.y =
		sixthTableau.y =
		seventhTableau.y = cardHeight + padding * 3;
		
		for (var i in deck) {
			var card = deck[i];
			card.width = cardWidth;
			card.height = cardHeight;
			card.imageWidthScaleFactor = cardWidthScaleFactor;
			card.imageHeightScaleFactor = cardHeightScaleFactor;
		}
		for (var i in piles) {
			var pile = piles[i];
			pile.updateTop();
			pile.positionCards();
			pile.width = cardWidth;
			pile.height = cardHeight;
		}
		if (cardsReturning)
			cardsInPlay[0].pile.prepareForReturning();
		
		helper.resize();
	}
	
	function transferCards(cards, newPile, callback) {
		var oldPile = cards[0].pile;
		if (oldPile != newPile) {
			oldPile.doneReturning();
			for (var i in cards)
				oldPile.pop();
			newPile.push(cards);
			newPile.prepareForReturning();
		
			if (!timerHelper.running)
				startTimer();
			
			if (oldPile instanceof Waste &&
				newPile instanceof Tableau)
				addPoints(5);
			if (oldPile instanceof Waste &&
				newPile instanceof Foundation)
				addPoints(10);
			if (oldPile instanceof Tableau &&
				newPile instanceof Foundation)
				addPoints(10);
			if (oldPile instanceof Foundation &&
				newPile instanceof Tableau)
				addPoints(-15);
		}
		startReturningCards(callback);
		
		checkForWin();
	}
	
	function checkForWin() {
		for (var i in foundations)
			if (foundations[i].pile.length != 13) return;
		
		stopTimer();
		addPoints(Math.round(700000 / timerHelper.getTime().getSeconds()));
	}
	
	var drawCount = 0;
	function draw() {
		if (!drawCount)
			waste.drawIndex = waste.pile.length;
		if (drawCount < (solitaire.drawThree ? 3 : 1) && stock.peek()) {
			drawCount++;
			cardsInPlay = [stock.peek()];
			transferCards(cardsInPlay, waste, draw);
			return;
		}
		drawCount = 0;
		
		helper.paint();
		
		if (!timerHelper.running)
			startTimer();
	}
	
	function clearTable() {
		for (var i in piles)
			while (piles[i].peek())
				piles[i].pop();
	}
	
	this.newGame = function() {
		clearTable();
		deal();
	}
	
	this.solve = function() {
		var srcs = wasteIncludedInSolve ? fanningPiles : tableaus;
		for (var i in srcs) {
			var src = srcs[i];
			if (!src.peek()) continue;
			for (var j in foundations) {
				var dst = foundations[j];
				var cards = [src.peek()];
				if (dst.canAcceptCards(cards)) {
					cardsInPlay = cards.slice(0);
					transferCards(cards, dst, solitaire.solve);
					return;
				}
				if (!dst.peek()) break;
			}
		}
	}
	
	function deal() {
		for (var i in deck)
			stock.push(deck[i]);
		for (var i in deck) {
			var j = Math.floor(Math.random() * deck.length);
			var temp = stock.pile[i];
			stock.pile[i] = stock.pile[j];
			stock.pile[j] = temp;
		}
		for (var i = 0; i < tableaus.length; i++) {
			for (var j = 0; j <= i; j++) {
				var card = stock.pop();
				if (j == i) {
					card.faceUp = true;
					card.draggable = true;
				}
				tableaus[i].push(card);
			}
		}
		resetScore();
		resetTimer();
		helper.paint();
	}
	
	function redeal() {
		while (waste.pile.length)
			stock.push(waste.pop());
		helper.paint();
	}
	
	var deck = [];
	var backOfCardImage;
	function loadCards() {
		for (var i = 0; i < 52; i++)
			helper.add(deck[i] = new Card(i, i + '.png'));
		backOfCardImage = loadCardImage('backOfCardImage.png');
	}
	
	function setup() {
		for (var i in deck) {
			deck[i].faceUp = true;
			if (!deck[i].getImage().complete)
				return setTimeout(setup, 0);
			deck[i].faceUp = false;
		}
		if (!backOfCardImage.complete)
			return setTimeout(setup, 0);
		
		solitaire.scale();
		deal();
	}
	function resetCards() {
		clearTable();
		loadCards();
		setup();
	}
	resetCards();
}