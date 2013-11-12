/* alphaPun.ch (Fist) - http://alphapun.ch/
 * by David Newton - @newtron - https://github.com/nwtn/ - david@davidnewton.ca
 */

(function(w) {
	w.coords = {
		square: [
			{ x: 56, y: 37 },
			{ x: 25, y: 37 },
			{ x: 25, y: 5 },
			{ x: 57, y: 5 }
		]
	};

	w.alphaPunchFist = function() {
		this.canvas			= document.createElement('canvas');	// canvas
		this.context		= this.canvas.getContext('2d');		// canvas context
		this.imageWidth		= 0;								// image width
		this.imageHeight	= 0;								// image height
		this.path			= [];								// path
		this.container		= null;								// container for mask


		/* function to sort edges in an array */
		this.edgeSort		= function(edgeA, edgeB) {
			if (edgeA.yMin === edgeB.yMin) {
				if (edgeA.x === edgeB.x) {
					return edgeA.yMax - edgeB.yMax;
				}
				return edgeA.x - edgeB.x;
			}
			return edgeA.yMin - edgeB.yMin;
		};


		/* function to add a span as part of a mask */
		this.addSpan		= function(x, y, w, h) {
			var span = document.createElement('span');

			// increase height to account for somewhat inaccurate offsetHeight values
			h = h + 2;

			span.style.cssText = 'position: absolute;  top: ' + y + 'px;  left: ' + x + 'px;  width: ' + w + 'px;  height: ' + h + 'px;';
			this.container.appendChild(span);
		};


		/* function to draw a filled polygon
		 * based on algorithm @ Polygon Fill Teaching Tool
		 * http://www.cs.rit.edu/~icss571/filling/index.html
		 */
		this.drawPolygon	= function() {
			var edgesActive = [],
				edgesAll = [],
				edge,
				deltaX,
				edgesGlobal = [],
				i,
				parity,
				pointA,
				pointB,
				scanLine,
				x,
				xMaxGlobal = 0,	// global x max
				xEnd = 0,		// x end; used for SPAN coords/width
				xStart = 0,		// x start; used for SPAN coords/width
				xWidth = 1,		// x width; used for SPAN coords/width
				yMinGlobal = 0,	// global y min
				yMaxGlobal = 0;	// global x max

			// wipe out last one, so we don't double up on multiple calls
			this.container.innerHTML = '';

			/*
				1. Initializing All of the Edges:
				The first thing that needs to be done is determine how the polygon's vertices are
				related. The edgesAll table will hold this information.

				Each adjacent set of vertices (the first and second, second and third, ..., last
				and first) defines an edge. For each edge, the following information needs to be
				kept in a table:

				- The minimum y value of the two vertices.
				- The maximum y value of the two vertices.
				- The x value associated with the minimum y value.
				- The slope of the edge.

				The slope of the edge can be calculated from the formula for a line:
				y = mx + b;

				where m = slope, b = y-intercept,
				y0 = maximum y value,
				y1 = minimum y value,
				x0 = maximum x value,
				x1 = minimum x value

				The formula for the slope is as follows:
				m = (y0 - y1) / (x0 - x1).
			*/

			for (i=0; i<this.path.length; i++) {
				edge = {};
				pointA = this.path[i];

				// if pointA is last point, pointB is first point
				if (i === this.path.length-1) {
					pointB = this.path[0];
				} else {
					pointB = this.path[i + 1];
				}

				// maximum y value of the two vertices
				edge.yMax = pointA.y;
				if (pointB.y > edge.yMax) {
					edge.yMax = pointB.y;
				}
				if (edge.yMax > yMaxGlobal) {
					yMaxGlobal = edge.yMax;
				}

				// minimum y value of the two vertices
				edge.yMin = pointA.y;
				if (pointB.y < edge.yMin) { edge.yMin = pointB.y; }
				if (edge.yMin < yMinGlobal) { yMinGlobal = edge.yMin; }

				// x value associated with the minimum y value
				edge.x = parseInt(pointA.x, 10);
				if (pointB.y < pointA.y) { edge.x = parseInt(pointB.x,10); }
				if (edge.x > xMaxGlobal) { xMaxGlobal = edge.x; }

				// slope of the edge
				// I'll actually store both m (slope) and 1/m (oneOverSlope)
				// I also have to check for division by 0, which isn't explicitly mentioned in the algorithm
				deltaX = pointA.x - pointB.x;
				if (deltaX === 0) {
					edge.slope = NaN;
					edge.oneOverSlope = 0;
				} else {
					edge.slope = (pointA.y - pointB.y) / deltaX;
					if (edge.slope === 0) {
						edge.oneOverSlope = NaN;
					} else {
						edge.oneOverSlope = 1 / edge.slope;
					}
				}
				edgesAll.push(edge);
			}

			/* 2. Initializing the Global Edge Table:
				The global edge table will be used to keep track of the edges that are still
				needed to complete the polygon. Since we will fill the edges from bottom to top
				and left to right. To do this, the global edge table table should be inserted
				with edges grouped by increasing minimum y values. Edges with the same minimum y
				values are sorted on minimum x values as follows:

				a) Place the first edge with a slope that is not equal to zero in the global edge
					table.

				b) If the slope of the edge is zero, do not add that edge to the global edge
					table.

				c) For every other edge, start at index 0 and increase the index to the global
					edge table once each time the current edge's y value is greater than that of
					the edge at the current index in the global edge table.

					Next, Increase the index to the global edge table once each time the current
					edge's x value is greater than and the y value is less than or equal to that
					of the edge at the current index in the global edge table.

					If the index, at any time, is equal to the number of edges currently in the
					global edge table, do not increase the index.

					Place the edge information for minimum y value, maximum y value, x value,
					and 1/m in the global edge table at the index.

				The global edge table should now contain all of the edge information necessary
				to fill the polygon in order of increasing minimum y and x values.
			*/

			/* DN: I think this can be accomplished easier by just throwing the edges in
				an array and then sorting them after */

			for (i=0; i<edgesAll.length; i++) {
				if (edgesAll[i].slope !== 0) {
					edgesGlobal.push(edgesAll[i]);
				}
			}
			edgesGlobal.sort(this.edgeSort);




			/* 3. Initializing Parity
				The initial parity is even since no edges have been crossed yet.

				DN: moved this into loop
			*/


			/* 4. Initializing the Scan-Line
				The initial scan-line is equal to the lowest y value for all of the global
				edges. Since the global edge table is sorted, the scan-line is the minimum y
				value of the first entry in this table.
			*/

			scanLine = edgesGlobal[0].yMin;


			/* 5. Initializing the Active Edge Table
				The active edge table will be used to keep track of the edges that are
				intersected by the current scan-line. This should also contain ordered edges.
				This is initially set up as follows:

				Since the global edge table is ordered on minimum y and x values, search, in
				order, through the global edge table and, for each edge found having a minimum
				y value equal to the current scan-line, append the edge information for the
				maximum y value, x value, and 1/m to the active edge table. Do this until an
				edge is found with a minimum y value greater than the scan line value. The
				active edge table will now contain ordered edges of those edges that are being
				filled.

				DN: this is inside the loop. Also, things are MOVED, not COPIED, from global_
				to active_
			*/

			for (scanLine; scanLine<yMaxGlobal; scanLine++) {
				/*
					e) Remove any edges from the global edge table for which the minimum y value is
						equal to the scan-line and place them in the active edge table.

						DN: moved to top of loop; note that splicing the thing we're looping through
						is a bad idea;
				*/

				parity = 0;
				tmp = []; // tmp
				for (i=0; i<edgesGlobal.length; i++) {
					if (edgesGlobal[i].yMin === scanLine) {
						edgesActive.push(edgesGlobal[i]);
					} else {
						tmp.push(edgesGlobal[i]);
					}
				}
				edgesGlobal = tmp.slice(0);


				/*
					f) Reorder the edges in the active edge table according to increasing x value.
						This is done in case edges have crossed.

						DN: moved to top of loop
				*/
				edgesActive.sort(this.edgeSort);


				/* 6. Filling the Polygon
					Filling the polygon involves deciding whether or not to draw pixels, adding to
					and removing edges from the active edge table, and updating x values for the
					next scan-line.

					Starting with the initial scan-line, until the active edge table is empty, do
					the following:

					a) Draw all pixels from the x value of odd to the x value of even parity edge
						pairs.

						From example: Starting at the point (0,s), which is on our scan-line
						and outside of the polygon, will want to decide which points to draw for each
						scan-line.

						Once the first edge is encountered, parity = odd. All points are drawn from
						this point until the next edge is encountered. Parity is then changed to even.
				*/
				for (x=0; x<=xMaxGlobal; x++) {
					for (i=0; i<edgesActive.length; i++) {
						if (Math.round(edgesActive[i].x) === x) {
							if (parity === 0) {
								xStart = x;
								parity = 1;
							} else {
								xEnd = x;
								xWidth = xEnd - xStart;
								if (xWidth === 0) {
									xWidth = 1;
								}
								this.addSpan(xStart, scanLine, xWidth, 1);
								parity = 0;
							}
						}
					}
				}


				/*
					c) Remove any edges from the active edge table for which the maximum y value is
						equal to the (DN: next) scan_line.
				*/

				tmp = [];	// tmp
				for (i=0; i<edgesActive.length; i++) {
					if (edgesActive[i].yMax === scanLine + 1) { continue; }

					/*
						d) Update the x value for for each edge in the active edge table using the
							formula x1 = x0 + 1/m. (This is based on the line formula and the fact that
							the next scan-line equals the old scan-line plus one.)
					*/

					edgesActive[i].x = edgesActive[i].x + edgesActive[i].oneOverSlope;
					tmp.push(edgesActive[i]);
				}
				edgesActive = tmp.slice(0);

				/*
					b) Increase the scan-line by 1.
						DN: reordered this
				*/
			}


		};


		/* clickthrough */
		this.click			= function(id) {
			return function(e) {
				document.getElementById(id).click();
				return false;
			};
		};
	};

	var alphaPunchContainers = document.getElementsByClassName('alphapunch');
	for (var i in alphaPunchContainers) {
		if (!alphaPunchContainers[i].nodeName) continue;

		var fist	= new w.alphaPunchFist(),
			targets	= alphaPunchContainers[i].getElementsByClassName('alphapunch-target'),
			imgs	= alphaPunchContainers[i].getElementsByTagName('img'),
			newEl,
			newEl2,
			j;

		for (j in targets) {
			if (!targets[j].nodeName) continue;

			newEl = document.createElement('span');
			newEl.className = 'alphapunch-mask';
			newEl.id = 'alphapunch-mask-' + targets[j].id;
			targets[j].appendChild(newEl);

			newEl = document.createElement('span');
			newEl.style.cssText = 'display: inline-block;  position: relative';
			targets[j].parentNode.appendChild(newEl);
			newEl.appendChild(targets[j]);

			fist.container = document.getElementById('alphapunch-mask-' + targets[j].id);
			fist.addSpan(0, 0, targets[j].offsetWidth, targets[j].offsetHeight);
		}

		for (j in imgs) {
			if (!imgs[j].nodeName) continue;

			newEl = document.createElement('span');
			newEl.style.cssText = 'display: inline-block;  position: relative';
			imgs[j].parentNode.appendChild(newEl);
			newEl.appendChild(imgs[j]);

			newEl2 = document.createElement('span');
			newEl2.className = 'alphapunch-mask';
			newEl2.id = 'alphapunch-mask-' + imgs[j].id;
			newEl.appendChild(newEl2);

			fist.container = document.getElementById('alphapunch-mask-' + imgs[j].id);
			fist.imageWidth = imgs[j].offsetWidth;
			fist.imageHeight = imgs[j].offsetHeight;
			fist.path = w.coords[imgs[j].id];
			fist.drawPolygon();

			document.getElementById('alphapunch-mask-' + imgs[j].id).addEventListener('click', fist.click(imgs[j].id));
		}
	}
})(window);
