function CanvasHelper(canvas, backgroundColor) {
	var me = this;
	var objects = [];
	var oldRects = [];
	this.turnOffEvents = false;
	var ctx = canvas.getContext('2d');
	this.add = function(obj) {
		objects.push(obj);
		if (oldRects[obj.id]) throw 'object already added';
		oldRects[obj.id] = getRect(obj);
	}
	var getRect = function(obj) {
		return new Rect(obj.x, obj.y, obj.x + obj.width, obj.y + obj.height);
	}
	this.resize = function() {
		this.paint(true);
	}
	function sortObjectsByZindex() {
		objects.sort(function(a, b) {
			if (a.zindex < b.zindex)
				return 1;
			if (a.zindex > b.zindex)
				return -1;
			return 0;
		});
	}
	this.paint = function(all) {
		sortObjectsByZindex();
		var paintedRects = [];
		for (var i in objects) {
			var obj = objects[i];
			var newRect = getRect(obj);
			var oldRect = oldRects[obj.id];
			if (all || obj.repaint) {
				var rects = subtractRects([newRect], paintedRects);
				for (var j in rects) {
					var rect = rects[j];
					obj.paint(ctx, rect);
					paintedRects.push(rect);
				}
			} else if (
				oldRect.x1 != obj.x ||
				oldRect.y1 != obj.y ||
				oldRect.x2 != obj.x + obj.width ||
				oldRect.y2 != obj.y + obj.height)
			{
				var rects = subtractRects([newRect], paintedRects);
				for (var j in rects) {
					var rect = rects[j];
					obj.paint(ctx, rect);
					paintedRects.push(rect);
				}
				rects = subtractRects([oldRect], paintedRects);
				for (var j in rects) {
					var rect = rects[j];
					paintRect(rect);
					paintedRects.push(rect);
				}
			} else paintedRects.push(newRect);
			oldRects[obj.id] = newRect;
			obj.repaint = false;
		}
		if (all) {
			var rects = subtractRects([new Rect(0, 0, canvas.width, canvas.height)], paintedRects);
			ctx.fillStyle = backgroundColor;
			for (var i in rects) {
				var rect = rects[i];
				ctx.fillRect(rect.x1, rect.y1, rect.x2 - rect.x1, rect.y2 - rect.y1);
			}
		}
	}
	var paintRect = function(rect) {
		var paintedRects = [];
		for (var i in objects) {
			var obj = objects[i];
			var intersect = me.getIntersect(rect, getRect(obj));
			if (intersect) {
				var rects = subtractRects([intersect], paintedRects);
				for (var j in rects) {
					var newRect = rects[j];
					obj.paint(ctx, newRect);
					paintedRects.push(newRect);
				}
			}
		}
		var rects = subtractRects([rect], paintedRects);
		ctx.fillStyle = backgroundColor;
		for (var i in rects) {
			var rect = rects[i];
			ctx.fillRect(rect.x1, rect.y1, rect.x2 - rect.x1, rect.y2 - rect.y1);
		}
	}
	this.getIntersect = function(r1, r2) {
		return r1.x1 < r2.x2 && r1.x2 > r2.x1
			&& r1.y1 < r2.y2 && r1.y2 > r2.y1
			? new Rect(
				Math.max(r1.x1, r2.x1),
				Math.max(r1.y1, r2.y1),
				Math.min(r1.x2, r2.x2),
				Math.min(r1.y2, r2.y2))
			: null;
	}
	function subtractRects(r1s, r2s) {
		if (r2s.length)
			for (var i in r1s) {
				var r1 = r1s[i];
				for (var j in r2s) {
					var r2 = r2s[j];
					
					if (!me.getIntersect(r1, r2)) continue;
					
					var rects = [];
					var cutR1 = cloneRect(r1);
					if (r1.x1 < r2.x1) {
						var left = cloneRect(r1);
						left.x2 = cutR1.x1 = r2.x1;
						rects.push(left);
					}
					if (r1.x2 > r2.x2) {
						var right = cloneRect(r1);
						right.x1 = cutR1.x2 = r2.x2;
						rects.push(right);
					}
					if (r1.y1 < r2.y1) {
						var top = cloneRect(cutR1);
						top.y2 = r2.y1;
						rects.push(top);
					}
					if (r1.y2 > r2.y2) {
						var bottom = cloneRect(cutR1);
						bottom.y1 = r2.y2;
						rects.push(bottom);
					}
					r1s = r1s.slice(0);
					r1s.splice(parseInt(i), 1);
					for (var k in rects)
						r1s.push(rects[k]);
					return subtractRects(r1s, r2s);
				}
			}
		return r1s;
	}
	function cloneRect(rect) {
		return new Rect(rect.x1, rect.y1, rect.x2, rect.y2);
	}
	
	function getMouseX(e) { return e.pageX - canvas.offsetLeft }
	function getMouseY(e) { return e.pageY - canvas.offsetTop }
	
	function hitTest(e, obj) {
		return getMouseX(e) >= obj.x
			&& getMouseX(e) <= obj.x + obj.width
			&& getMouseY(e) >= obj.y
			&& getMouseY(e) <= obj.y + obj.height;
	}
	
	var mouseX, mouseY;
	function updateMouseCoords(e) {
		mouseX = getMouseX(e);
		mouseY = getMouseY(e);
	}
	
	var clicked, dragging;
	canvas.addEventListener('mousedown', function(e) {
		if (this.turnOffEvents) return;
		sortObjectsByZindex();
		for (var i in objects) {
			var obj = objects[i];
			if (hitTest(e, obj)) {
				if (obj.onmousedown)
					obj.onmousedown();
				clicked = obj;
				updateMouseCoords(e);
				break;
			}
		}
	});

	canvas.addEventListener('mousemove', function(e) {
		if (clicked && clicked.draggable)
			dragging = clicked;
		if (dragging) {
			var changeX = getMouseX(e) - mouseX;
			var changeY = getMouseY(e) - mouseY;
			updateMouseCoords(e);
			dragging.x += changeX;
			dragging.y += changeY;
			if (dragging.ondrag)
				dragging.ondrag(changeX, changeY);
			me.paint();
		}
		clicked = null;
	});

	canvas.addEventListener('mouseout', mouseup);
	canvas.addEventListener('mouseup', mouseup);

	function mouseup(e) {
		if (dragging && dragging.ondragend)
			dragging.ondragend();
		dragging = null;
		if (clicked && clicked.onclick)
			clicked.onclick();
		clicked = null;
	}
	
	canvas.addEventListener('dblclick', function(e) {
		if (this.turnOffEvents) return;
		sortObjectsByZindex();
		for (var i in objects) {
			var obj = objects[i];
			if (obj.ondblclick && hitTest(e, obj)) {
				obj.ondblclick();
				break;
			}
		}
	});
}

function Rect(x1, y1, x2, y2) {
	this.x1 = x1;
	this.y1 = y1;
	this.x2 = x2;
	this.y2 = y2;
}

var CanvasBaseObject = Class.extend({
	init: function(id, x, y, width, height, zindex, draggable) {
		this.id = id;
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
		this.zindex = zindex;
		this.draggable = draggable;
	}
});
var CanvasColorObject = CanvasBaseObject.extend({
	init: function(id, x, y, width, height, zindex, draggable, color) {
		this._super(id, x, y, width, height, zindex, draggable);
		this.color = color;
	},
	paint: function(ctx, rect) {
		ctx.fillStyle = this.color;
		ctx.fillRect(rect.x1, rect.y1, rect.x2 - rect.x1, rect.y2 - rect.y1);
	}
});
var CanvasImageObject = CanvasBaseObject.extend({
	init: function(id, x, y, width, height, zindex, draggable, getImage,
		imageWidthScaleFactor, imageHeightScaleFactor)
	{
		this._super(id, x, y, width, height, zindex, draggable);
		this.getImage = getImage;
		this.imageWidthScaleFactor = imageWidthScaleFactor;
		this.imageHeightScaleFactor = imageHeightScaleFactor;
	},
	paint: function(ctx, rect) {
		ctx.drawImage(this.getImage(),
			(rect.x1 - this.x) * this.imageWidthScaleFactor,
			(rect.y1 - this.y) * this.imageHeightScaleFactor,
			(rect.x2 - rect.x1) * this.imageWidthScaleFactor,
			(rect.y2 - rect.y1) * this.imageHeightScaleFactor,
			rect.x1, rect.y1,
			rect.x2 - rect.x1,
			rect.y2 - rect.y1);
	}
});