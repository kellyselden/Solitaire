//supplied objects need the following properties:
//id
//x
//y
//width
//height
//zindex
//and also the following function:
//paint(rect)
function Library(backgroundPaintFunc) {
	var library = this;
	var objects = [];
	var oldRects = [];
	var width, height;
	this.add = function(obj) {
		objects.push(obj);
		if (oldRects[obj.id]) throw 'object already added';
		oldRects[obj.id] = getRect(obj);
	}
	var getRect = function(obj) {
		return new Rect(obj.x, obj.y, obj.x + obj.width, obj.y + obj.height);
	}
	this.resize = function(w, h) {
		width = w;
		height = h;
		this.paint(true);
	}
	this.paint = function(all) {
		objects.sort(function(a, b) {
			if (a.zindex < b.zindex)
				return 1;
			if (a.zindex > b.zindex)
				return -1;
			return 0;
		});
		var paintedRects = [];
		for (var i in objects) {
			var obj = objects[i];
			var oldRect = oldRects[obj.id];
			var newRect = getRect(obj);
			if (all) {
				var rects = subtractRects([newRect], paintedRects);
				for (var j in rects) {
					var rect = rects[j];
					paintRect(rect);
					paintedRects.push(rect);
				}
			} else {
				if (oldRect.x1 != obj.x ||
					oldRect.y1 != obj.y ||
					oldRect.x2 != obj.x + obj.width ||
					oldRect.y2 != obj.y + obj.height)
				{
					var rects = subtractRects([newRect], paintedRects);
					for (var j in rects) {
						var rect = rects[j];
						paintRect(rect);
						paintedRects.push(rect);
					}
					rects = subtractRects([oldRect], paintedRects);
					for (var j in rects) {
						var rect = rects[j];
						paintRect(rect);
						paintedRects.push(rect);
					}
				} else if (obj.repaint) {
					var rects = subtractRects([oldRect], paintedRects);
					for (var j in rects) {
						var rect = rects[j];
						paintRect(rect);
						paintedRects.push(rect);
					}
				}
			}
			oldRects[obj.id] = newRect;
			obj.repaint = false;
		}
		var rects = subtractRects([new Rect(0, 0, width, height)], paintedRects);
		for (var j in rects) {
			var rect = rects[j];
			backgroundPaintFunc(rect);
		}
	}
	var paintRect = function(rect) {
		var paintedRects = [];
		for (var i in objects) {
			var obj = objects[i];
			var intersect = library.getIntersect(rect, getRect(obj));
			if (intersect) {
				var rects = subtractRects([intersect], paintedRects);
				for (var j in rects) {
					obj.paint(rect);
					paintedRects.push(rect);
				}
			}
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
					
					if (!library.getIntersect(r1, r2)) continue;
					
					if (r1.x1 == r2.x1 &&
						r1.y1 == r2.y1 &&
						r1.x2 == r2.x2 &&
						r1.y2 == r2.y2)
					{
						r1s = r1s.slice(0);
						r1s.splice(i, 1);
						return subtractRects(r1s, r2s);
					}
					
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
					if (rects.length) {
						r1s = r1s.slice(0);
						r1s.splice(i, 1);
						for (var k in rects)
							r1s.push(rects[k]);
						return subtractRects(r1s, r2s);
					}
				}
			}
		return r1s;
	}
	function cloneRect(rect) {
		return new Rect(rect.x1, rect.y1, rect.x2, rect.y2);
	}
}

function Rect(x1, y1, x2, y2) {
	this.x1 = x1;
	this.y1 = y1;
	this.x2 = x2;
	this.y2 = y2;
}