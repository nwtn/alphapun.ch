/* alphaPun.ch (Fist) - http://alphapun.ch/
 * by David Newton - @newtron - https://github.com/nwtn/ - david@davidnewton.ca
 */

(function() {
	var coords = {
			square: [
				{ x: 56, y: 37 },
				{ x: 25, y: 37 },
				{ x: 25, y: 5 },
				{ x: 57, y: 5 }
			]
		},

		alphaPunchFist = function() {
			this.cn				= dce('canvas');				// canvas
			this.ctx			= this.cn.getContext('2d');		// canvas context

			this.iw				= 0;							// image width
			this.ih				= 0;							// image height

			this.p				= [];							// path

			this.c				= null;							// container for mask

			/* function to sort edge points in an array */
			this.es					= function(a, b) {
				if (a.ymn === b.ymn) {
					if (a.xvl === b.xvl) { return a.ymx - b.ymx; }
					return a.xvl - b.xvl;
				}
				return a.ymn - b.ymn;
			};

			/* function to draw a span as part of a mask */
			this.ds					= function(x, y, w, h) {
				var el = dce('span');
				h = h+2; // increase height to account for somewhat inaccurate offsetHeight values
				el.style.cssText = 'position:absolute;top:'+y+'px;left:'+x+'px;width:'+w+'px;height:'+h+'px;';
				this.c.appendChild(el);
			};

			/* function to draw a filled polygon
			 * based on algorithm @ Polygon Fill Teaching Tool
			 * http://www.cs.rit.edu/~icss571/filling/index.html
			 */
			this.f					= function() {
				var eAc = [],
					eAl = [],
					e,
					dx,
					eG = [],
					i,
					j,
					p,
					p0,
					p1,
					s,
					x,
					xmxg = 0,	// global x max
					xe = 0,		// x end; used for SPAN coords/width
					xs = 0,		// x start; used for SPAN coords/width
					xw = 1,		// x width; used for SPAN coords/width
					ymng = 0,	// global y min
					ymxg = 0;	// global x max

				// wipe out last one, so we don't double up on multiple calls
				this.c.innerHTML = '';


				/*
					1. Initializing All of the Edges:
					The first thing that needs to be done is determine how the polygon's vertices are
					related. The eAl table will hold this information.

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

				for (i=0; i<this.p.length; i++) {
					e = {};
					p0 = this.p[i];

					// if p0 is last point, p1 is first point
					if (i === this.p.length-1) {
						p1 = this.p[0];
					} else {
						p1 = this.p[i+1];
					}

					// maximum y value of the two vertices
					e.ymx = p0.y;
					if (p1.y > e.ymx) { e.ymx = p1.y; }
					if (e.ymx > ymxg) { ymxg = e.ymx; }

					// minimum y value of the two vertices
					e.ymn = p0.y;
					if (p1.y < e.ymn) { e.ymn = p1.y; }
					if (e.ymn < ymng) { ymng = e.ymn; }

					// x value associated with the minimum y value
					e.xvl = parseInt(p0.x,10);
					if (p1.y < p0.y) { e.xvl = parseInt(p1.x,10); }
					if (e.xvl > xmxg) { xmxg = e.xvl; }

					// slope of the edge
					// I'll actually store both m and 1/m (oom)
					// I also have to check for division by 0, which isn't explicitly mentioned in the algorithm
					dx = p0.x - p1.x;
					if (dx === 0) {
						e.m = NaN;
						e.oom = 0;
					} else {
						e.m = (p0.y - p1.y) / dx;
						if (e.m === 0) {
							e.oom = NaN;
						} else {
							e.oom = 1/e.m;
						}
					}
					eAl.push(e);
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

				for (i=0; i<eAl.length; i++) {
					if (eAl[i].m !== 0) {
						eG.push(eAl[i]);
					}
				}
				eG.sort(this.es);




				/* 3. Initializing Parity
					The initial parity is even since no edges have been crossed yet.

					DN: moved this into loop
				*/


				/* 4. Initializing the Scan-Line
					The initial scan-line is equal to the lowest y value for all of the global
					edges. Since the global edge table is sorted, the scan-line is the minimum y
					value of the first entry in this table.
				*/

				s = eG[0].ymn;


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

				for (s; s<ymxg; s++) {
					/*
						e) Remove any edges from the global edge table for which the minimum y value is
							equal to the scan-line and place them in the active edge table.

							DN: moved to top of loop; note that splicing the thing we're looping through
							is a bad idea;
					*/

					p = 0;
					t = []; // tmp
					for (i=0; i<eG.length; i++) {
						if (eG[i].ymn === s) {
							eAc.push(eG[i]);
						} else {
							t.push(eG[i]);
						}
					}
					eG = t.slice(0);


					/*
						f) Reorder the edges in the active edge table according to increasing x value.
							This is done in case edges have crossed.

							DN: moved to top of loop
					*/
					eAc.sort(this.es);


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
					for (x=0; x<=xmxg; x++) {
						for (i=0; i<eAc.length; i++) {
							if (Math.round(eAc[i].xvl) === x) {
								if (p === 0) {
									xs = x;
									p = 1;
								} else {
									xe = x;
									xw = xe-xs;
									if (xw === 0) { xw = 1; }
									this.ds(xs,s,xw,1);
									p = 0;
								}
							}
						}
					}


					/*
						c) Remove any edges from the active edge table for which the maximum y value is
							equal to the (DN: next) scan_line.
					*/

					t = [];	// tmp
					for (i=0; i<eAc.length; i++) {
						if (eAc[i].ymx === s + 1) { continue; }

						/*
							d) Update the x value for for each edge in the active edge table using the
								formula x1 = x0 + 1/m. (This is based on the line formula and the fact that
								the next scan-line equals the old scan-line plus one.)
						*/

						eAc[i].xvl = eAc[i].xvl + eAc[i].oom;
						t.push(eAc[i]);
					}
					eAc = t.slice(0);

					/*
						b) Increase the scan-line by 1.
							DN: reordered this
					*/
				}


			};
		};


	$('.alphapunch').each(
		function() {
			var fist = new alphaPunchFist();

			$(this).find('.alphapunch-target').each(
				function() {
					$(this).wrap('<span style="display:inline-block;position:relative" />');
					$(this).append('<span class="alphapunch-mask" id="alphapunch-mask-' + this.id + '"></span>');
					fist.c = document.getElementById('alphapunch-mask-' + this.id);
					fist.ds(0,0,this.offsetWidth,this.offsetHeight);
			});

			$(this).find('img').each(
				function() {
					$(this).wrap('<span style="display:inline-block;position:relative" />');
					$(this).after('<span class="alphapunch-mask" id="alphapunch-mask-' + this.id + '"></span>');
					fist.c = document.getElementById('alphapunch-mask-' + this.id);
					fist.iw = this.offsetWidth;
					fist.ih = this.offsetHeight;
					fist.p = coords[this.id];
					fist.f();
					$('#alphapunch-mask-' + this.id).click(
						function() {
							$('#' + this.id).click();
							return false;
						}
					);
				}
			);
		}
	);
})();
