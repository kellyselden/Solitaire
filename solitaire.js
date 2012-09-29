function Solitaire(canvas, score, timer) {
	var solitaire = this;
	var ctx = canvas.getContext('2d');
	
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
	
	function Card(id, filename) {
		this.id = id;
		this.x = 0;
		this.y = 0;
		this.faceUp = false;
		this.pile = null;
		this.image = loadCardImage(filename);
		this.getImage = function() {
			return this.faceUp ? this.image : backOfCardImage;
		}
		this.hitTest = function(e) {
			if (!cardHitTest(e, this.x, this.y))
				return false;
			var cards = this.pile.pile;
			var nextCard = cards[cards.indexOf(this) + 1];
			return !nextCard || !cardHitTest(e, nextCard.x, nextCard.y);
		}
		this.paint = function(rect) {
			if (rect)
				ctx.drawImage(this.getImage(),
					(rect.x1 - this.x) * cardWidthScaleFactor,
					(rect.y1 - this.y) * cardHeightScaleFactor,
					(rect.x2 - rect.x1) * cardWidthScaleFactor,
					(rect.y2 - rect.y1) * cardHeightScaleFactor,
					rect.x1, rect.y1,
					rect.x2 - rect.x1,
					rect.y2 - rect.y1);
			else
				ctx.drawImage(this.getImage(), this.x, this.y, cardWidth, cardHeight);
		}
	}

	function loadCardImage(filename) {
		var image = new Image();
		image.src = solitaire.deckName + '/' + filename;
		return image;
	}
	
	function getMouseX(e) { return e.pageX - canvas.offsetLeft }
	function getMouseY(e) { return e.pageY - canvas.offsetTop }
	
	function cardHitTest(e, x, y) {
		return getMouseX(e) >= x
			&& getMouseX(e) <= x + cardWidth
			&& getMouseY(e) >= y
			&& getMouseY(e) <= y + cardHeight;
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
			cardsInPlay = [];
			cardsReturning = false;
			pile.updateTop();
			if (callback) callback();
		}
		if (isDoneMoving()) {
			complete();
			return;
		}
		cardsReturning = true;
		returningIntervalID = setInterval(function() {
			var diffX = card.x - pile.retX;
			var diffY = card.y - pile.retY;
			var diffZ = Math.sqrt(diffX * diffX + diffY * diffY);
			var distZ = 25;
			var distX = Math.round(diffX * distZ / diffZ) || 0;
			var distY = Math.round(diffY * distZ / diffZ) || 0;
			distX = distX > 0 ? Math.min(distX, diffX) : Math.max(distX, diffX);
			distY = distY > 0 ? Math.min(distY, diffY) : Math.max(distY, diffY);
			moveCardsInPlay(-distX, -distY);
			if (isDoneMoving()) complete();
		}, 5);
	}
	
	function moveCardsInPlay(distX, distY) {
		var oldRect = new Rect(cardsInPlay[0].x, cardsInPlay[0].y, cardsInPlay[0].x + cardWidth,
			cardsInPlay[cardsInPlay.length - 1].y + cardHeight);
		for (var i in cardsInPlay) {
			cardsInPlay[i].x += distX;
			cardsInPlay[i].y += distY;
		}
		paint(oldRect);
		paintCards(cardsInPlay);
	}
	
	function paintCards(cards, rect) {
		for (var i in cards) {
			var card = cards[cards.length - i - 1];
			var lastCard = cards[cards.length - i];
			//top card, assume entirely visible (even though a card could be moving above)
			if (!lastCard) {
				card.paint(rect ? getIntersect(rect, new Rect(card.x, card.y)) : null);
				continue;
			}
			//once one card is hidden, the rest will be
			if (card.x == lastCard.x && card.y == lastCard.y) break;
			var intersect = new Rect(card.x, card.y,
				lastCard.x + (card.x == lastCard.x ? cardWidth : 0),
				lastCard.y + (card.y == lastCard.y ? cardHeight : 0));
			intersect = rect ? getIntersect(rect, intersect) : intersect;
			//only paint visible section of bottom cards
			if (intersect)
				card.paint(intersect);
		}
	}
	
	var Pile = Class.extend({
		init: function(id) {
			this.id = id;
			this.x = 0;
			this.y = 0;
			this.topX = 0;
			this.topY = 0;
			this.retX = 0;
			this.retY = 0;
			this.pile = new Array();
		},
		push: function(cards) {
			if (!(cards instanceof Array))
				cards = [cards];
			for (var i in cards) {
				cards[i].pile = this;
				if (cardsInPlay.indexOf(cards[i]) == -1)
					this.positionCard(cards[i]);
				this.pile.push(cards[i]);
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
		},
		prepareForReturning: function() {
			this.retX = this.topX
			this.retY = this.topY;
		},
		doneReturning: function() {
			this.retX =
			this.retY = 0;
		},
		hitTest: function(e) {
			return cardHitTest(e, this.topX, this.topY);
		},
		paint: function(rect) {
			var rect2 = new Rect(this.x, this.y,
				this.topX + cardWidth,
				this.topY + cardHeight);
			var intersect = rect ? getIntersect(rect, rect2) : rect2;
			if (!intersect) return;
			if (!this.pile.length || cardsInPlay.indexOf(this.pile[0]) != -1) {
				ctx.fillStyle = 'rgb(0, 50, 0)';
				ctx.fillRect(intersect.x1, intersect.y1,
					intersect.x2 - intersect.x1,
					intersect.y2 - intersect.y1);
				return;
			}
			var index;
			paintCards(this.pile.slice(0, cardsInPlay.length && (index = this.pile.indexOf(cardsInPlay[0])) != -1
				? index : this.pile.length));
		}
	});
	var Stock = Pile.extend({
		push: function(card) {
			card.faceUp = false;
			this._super(card);
		}
	});
	var Foundation = Pile.extend({
		canAcceptCards: function(cards) {
			if (cards.length > 1) return false;
			var lastCard = this.peek();
			if (!lastCard)
				return cards[0].id % 13 == 0;
			if (lastCard.id % 13 == 12)
				return false;
			return cards[0].id == lastCard.id + 1;
		},
		getCardsForPlay: function(e) {
			if (canRemoveFromFoundations) {
				var card = this.peek();
				if (card && card.hitTest(e))
					return [card];
			}
			return [];
		}
	});
	var FanningPile = Pile.extend({
		push: function(cards) {
			this._super(cards);
			this.updateTop();
		},
		pop: function() {
			var card = this._super();
			if (!this.peek())
				this.paint();
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
			for (var i in cards)
				cards[i].faceUp = true;
			this._super(cards);
			this.positionCards();
		},
		pop: function() {
			var card = this._super();
			this.drawIndex = Math.min(this.drawIndex, this.pile.length - 1);
			return card;
		},
		positionCards: function() {
			this._super(this.pile.slice(
				Math.max(solitaire.drawThree ? -3 : -1, this.drawIndex - this.pile.length )),
				function(card, lastCard) { card.x = lastCard.x + cardFanningX });
		},
		getCardsForPlay: function(e) {
			var card = this.peek();
			return card && card.hitTest(e) ? [card] : [];
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
				lastCard.paint();
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
		getCardsForPlay: function(e) {
			if (this.peek())
				for (var i in this.pile) {
					if (!this.pile[i].faceUp) continue;
					if (this.pile[i].hitTest(e))
						return this.pile.slice(i);
				}
			return [];
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
		
		for (var i in piles) {
			piles[i].updateTop();
			piles[i].positionCards();
		}
		if (cardsReturning)
			cardsInPlay[0].pile.prepareForReturning();
		
		paint();
	}
	
	var mouseX, mouseY;
	var mouseMoved;
	
	function updateMouseCoords(e) {
		mouseX = getMouseX(e);
		mouseY = getMouseY(e);
	}
	
	canvas.addEventListener('mousedown', function(e) {
		updateMouseCoords(e);
		mouseMoved = false;
		if (cardsReturning) return;
		for (var i in sources) {
			cardsInPlay = sources[i].getCardsForPlay(e);
			if (cardsInPlay.length) {
				sources[i].prepareForDragging();
				break;
			}
		}
	});
	
	function Rect(x1, y1, x2, y2) {
		this.x1 = x1;
		this.y1 = y1;
		this.x2 = x2 || x1 + cardWidth;
		this.y2 = y2 || y1 + cardHeight;
	}
	
	canvas.addEventListener('mousemove', function(e) {
		mouseMoved = true;
		if (cardsReturning) return;
		if (cardsInPlay.length) {
			moveCardsInPlay(getMouseX(e) - mouseX, getMouseY(e) - mouseY);
			updateMouseCoords(e);
		}
	});
	
	canvas.addEventListener('mouseout', mouseup);
	
	canvas.addEventListener('mouseup', mouseup);
	
	function mouseup(e) {
		if (cardsReturning) return;
		if (cardsInPlay.length) {
			for (var i in destinations) {
				var pile = destinations[i];
				var card = cardsInPlay[0];
				if (pile == card.pile) continue;
				var intersect = getIntersect(
					new Rect(pile.topX, pile.topY,
						pile.topX + cardWidth,
						pile.topY + cardHeight),
					new Rect(card.x, card.y,
						card.x + cardWidth,
						card.y + cardHeight));
				if (intersect && pile.canAcceptCards(cardsInPlay)) {
					transferCards(cardsInPlay, pile);
					return;
				}
			}
			transferCards(cardsInPlay, cardsInPlay[0].pile);
		} else if (!mouseMoved)
			if (stock.hitTest(e))
				if (stock.pile.length)
					draw();
				else
					redeal();
	}
	
	canvas.addEventListener('dblclick', function(e) {
		if (cardsReturning) return;
		for (var i in fanningPiles) {
			cardsInPlay = fanningPiles[i].getCardsForPlay(e);
			if (cardsInPlay.length == 1) {
				fanningPiles[i].prepareForDragging();
				for (var j in foundations)
					if (foundations[j].canAcceptCards(cardsInPlay)) {
						transferCards(cardsInPlay, foundations[j]);
						return;
					}
				transferCards(cardsInPlay, cardsInPlay[0].pile);
				break;
			}
		}
	});
	
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
	var oldTopX;
	function draw() {
		if (!drawCount) {
			oldTopX = waste.topX;
			waste.drawIndex = waste.pile.length;
		}
		if (drawCount < (solitaire.drawThree ? 3 : 1) && stock.peek()) {
			drawCount++;
			cardsInPlay = [stock.peek()];
			transferCards(cardsInPlay, waste, draw);
			return;
		}
		drawCount = 0;
		
		if (oldTopX > waste.topX)
			paint(new Rect(waste.topX + cardWidth, waste.y,
				oldTopX + cardWidth, waste.y + cardHeight));
		
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
				if (j == i)
					card.faceUp = true;
				tableaus[i].push(card);
			}
		}
		resetScore();
		resetTimer();
		paint();
	}
	
	function redeal() {
		var oldTopX = waste.topX;
		while (waste.pile.length)
			stock.push(waste.pop());
		stock.paint();
		paint(new Rect(waste.x, waste.y,
			oldTopX + cardWidth,
			waste.y + cardHeight));
	}
	
	function getIntersect(r1, r2) {
		return r1.x1 < r2.x2 && r1.x2 > r2.x1
			&& r1.y1 < r2.y2 && r1.y2 > r2.y1
			? new Rect(
				Math.max(r1.x1, r2.x1),
				Math.max(r1.y1, r2.y1),
				Math.min(r1.x2, r2.x2),
				Math.min(r1.y2, r2.y2))
			: null;
	}
	
	function paint(rect) {
		rect = rect || new Rect(0, 0, canvas.width, canvas.height);
		ctx.fillStyle = 'rgb(50, 50, 50)';
		ctx.fillRect(rect.x1, rect.y1, rect.x2 - rect.x1, rect.y2 - rect.y1);
		
		stock.paint(rect);
		waste.paint(rect);
		firstFoundation.paint(rect);
		secondFoundation.paint(rect);
		thirdFoundation.paint(rect);
		fourthFoundation.paint(rect);
		firstTableau.paint(rect);
		secondTableau.paint(rect);
		thirdTableau.paint(rect);
		fourthTableau.paint(rect);
		fifthTableau.paint(rect);
		sixthTableau.paint(rect);
		seventhTableau.paint(rect);
	}
	
	var deck = [];
	var backOfCardImage;
	function loadCards() {
		for (var i = 0; i < 52; i++)
			deck[i] = new Card(i, i + '.png');
		backOfCardImage = loadCardImage('backOfCardImage.png');
	}
	
	function setup() {
		for (var i in deck)
			if (!deck[i].getImage().complete)
				return setTimeout(setup, 0);
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