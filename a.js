(function() {

	var bf = false,				// boolean false
		bt = true,				// boolean true
		d = document,			// document
		db = d.body,			// document.body
		m = $('#m'),			// main div
		t,						// test or temp
		w = window,				// window
		wrn = $('#w'),			// warning
		wt;						// warning span (i.e. name of failed test)

	wrn.hide();
	wrn.html('WEB BROWSER <img src="y.gif" alt="(yಠ,ಠ)y"> Y U NO <span>JAVASCRIPT</span>?!');  // stupid safari
	wt = $('#w span');			// warning span (i.e. name of failed test)
	m.show();

	/* document.createElement */
	function dce(el) { return d.createElement(el); }
	
	/* document.getElementById */
	function dge(el) { return d.getElementById(el); }

	/* e.preventDefault();
	 * e.stopPropagation(); */
	function epdsp(e) {
		e.preventDefault();
		e.stopPropagation();
	}
	
	/* display an error (or other message) */
	function err(em) {
		msg.html(em).addClass('on');		
		setTimeout(function() { msg.removeClass('on'); }, 5000);
	}
	

	/* test features */
	function tf() {
		var el1 = dce('canvas'), el2 = dce('div');
		t = '';

		if (!el1.getContext || !el1.getContext('2d')) {
			t = 'CANVAS';
		} else if (!('draggable' in el2 || ('ondragstart' in el2 && 'ondrop' in el2))) {
			t = 'DRAGNDROP';
		} else if (!(w.File && w.FileList && w.FileReader)) {
			t = 'FILEREADER';
		}

		return t;
	}

	t = tf();
	if (t !== '') {
		wt.html(t);
		wrn.show();
		m.hide();
	} else {









		/* AlphaPunchPencil -- to trace shape **/
		var APP = function() {
			this.cnv				= dce('canvas');				// canvas
			this.ctx				= this.cnv.getContext('2d');	// canvas context

			this.img				= null;							// image we're tracing
			this.imgW				= 0;							// image width
			this.imgH				= 0;							// image height
			this.imgP				= [];							// image with padding
			this.imgPD				= [];							// image pixel data

			this.mc					= {};							// a colour not present in the image (hex)
			this.mcr				= null;							// a colour not present in the image (rgba)

			this.omn				= 255;							// minimum opacity to count as opaque
			this.omx				= 255;							// maximum opacity to count as opaque

			this.l					= { y: 0, x: 0 };				// last point under consideration
			this.px					= 0;							// current pixel under consideration

			this.po					= [];							// paths of opaque objects
			this.pt					= [];							// paths of transparent objects
			this.p					= [];							// path of all objects
			this.pTxt				= '';							// path of all objects as plain text coords

			/* combine paths, removing duplicate adjacent points
			 * function to convert separate path arrays into single path array */
			this.cp					= function() {
				this.p = [];
				if (this.po.length > 0) { this.mp(this.po); }
				if (this.pt.length > 0) { this.mp(this.pt); }
			};

			/* function to draw a path on a canvas */
			this.dc					= function(ctx, c, pth) {
				var i, j, p;
				ctx.fillStyle = c;
				for (i=0; i<pth.length; i++) {
					p = pth[i];
					ctx.beginPath();
					ctx.moveTo(p.x[0],p.y[0]);
					for (j=1; j<p.x.length; j++) { ctx.lineTo(p.x[j],p.y[j]); }
					ctx.stroke();
					ctx.fill();
				}
			}

			/* function to draw a preview of the mask on a new canvas */
			this.dr					= function() {
				// canvas -- a different one than normal
				var cnv = dce('canvas'),
					ctx = cnv.getContext('2d')
					rm = dge('rm');	// "rm" == "results mask"

				ctx.clearRect(0,0,this.cnv.width,this.cnv.height);
				cnv.width = this.imgW;
				cnv.height = this.imgH;
				rm.appendChild(cnv);

				// stupid IE10 doesn't scale canvas proportionally using max-width / max-height
				$(cnv).css({ width: prv.offsetWidth + 'px', height: prv.offsetHeight + 'px' });

				this.dc(ctx, '#000', this.po);
				this.dc(ctx, '#b45a51', this.pt);
			};

			/* function to find a specific color in a set of pixel data
			 * i don't remember why sd is called "sd", but it basically stops the search after finding just one pixel */
			this.fc					= function(i,r,g,b,a,sd) {
				var imgPD = this.imgPD[i], j;
				t = [];
				for (j=0; j<imgPD.length; j=j+4) {
					if (imgPD[j] === r && imgPD[j+1] === g && imgPD[j+2] === b && imgPD[j+3] === a) {
						this.px = Math.floor(j/4);
						t.push(this.px);
						if (sd === bt) { return t; }
					}
				}
				return t;
			};

			/* function to find a missing colour -- a colour that doesn't occur in the uploaded image */
			this.fmc				= function() {
				var mct = [1];

				this.pc();

				this.ctx.drawImage(this.img, 2, 2);
				this.imgP[0] = this.ctx.getImageData(0, 0, this.imgW, this.imgH);
				this.imgPD[0] = this.imgP[0].data;

				while (mct.length !== 0) {
					this.mc = this.rc();
					mct = this.fc(0,this.mc.r,this.mc.g,this.mc.b,this.mc.a,bt);
				}
				this.mcr = 'rgba('+this.mc.r+','+this.mc.g+','+this.mc.b+','+this.mc.a+')';

				db.removeChild(this.cnv);
			};

			/* function to find paths for opaque objects in the image */
			this.fpo				= function() {
				var ec = 0,	// emergency counter
					i = 1,	// counter
					r;		// results

				// canvas!
				this.pc();

				while (r !== bf) {
					// draw the image onto the canvas, with a 2px border
					this.ctx.fillStyle = '#000';
					this.ctx.strokeStyle = '#000';
					this.ctx.drawImage(this.img, 2, 2);

					// remove old already found paths
					this.rp(1);

					// get the pixel data for the new padded image
					this.gImg(i);

					// find an opaque shape
					r = this.mn(i);
					if (r !== bf) { this.po.push(r); }

					i++;
					ec++;
					if (ec === 100) { r = bf; }
				}
				db.removeChild(this.cnv);
			};

			/* function to find paths for transparent parts of opaque objects (ie holes) in the image */
			this.fpt				= function() {
				var ctx = this.ctx,
					ec = 0,	// emergency counter
					i,
					j,
					k,
					p,
					r;

				// canvas!
				this.pc();

				// draw the existing opaque paths as a filled mc (missingColor) shape
				for (i=0; i < this.po.length; i++) {
					p = this.po[i];
					ctx.fillStyle = this.mcr;
					ctx.beginPath();
					ctx.moveTo(p.x[0],p.y[0]);
					for (j=1; j<p.x.length; j++) { ctx.lineTo(p.x[j],p.y[j]); }
					ctx.fill();
				}

				// draw the image over it
				// do this in slightly different positions to eliminate artifacts
				// we'll lose some detail, but it makes things a heck of a lot easier
				ctx.drawImage(this.img, 1, 1);
				ctx.drawImage(this.img, 2, 2);
				ctx.drawImage(this.img, 3, 3);

				// search for mc (missingColor) pixels; these are transparent bits that weren't previously addressed
				k = this.imgP.length;
				this.gImg(k);
				r = this.fc(k,this.mc.r,this.mc.g,this.mc.b,this.mc.a,bf);

				db.removeChild(this.cnv);

				if (r.length <= 1) { return bf; }

				this.pc();

				while (r !== bf) {
					// draw the image onto the canvas
					k++;
					this.gImg(k);
					for (i=0; i<r.length; i++) {
						this.px = r[i];
						this.imgPD[k][4*this.px] = 0;
						this.imgPD[k][4*this.px+1] = 0;
						this.imgPD[k][4*this.px+2] = 255;
						this.imgPD[k][4*this.px+3] = 255;
					}
					ctx.putImageData(this.imgP[k], 0, 0);

					// remove old already-found paths
					this.rp(0);

					// get the pixel data for the new padded image
					k++;
					this.gImg(k);

					r = this.mn(k);
					if (r !== bf) { this.pt.push(r); }
					ec++;
					if (ec === 100) { r = bf; }
				}

				db.removeChild(this.cnv);
			};

			/* function to get image data off the canvas */
			this.gImg				= function(i) {
				this.imgP[i] = this.ctx.getImageData(0, 0, this.imgW, this.imgH);
				this.imgPD[i] = this.imgP[i].data;
			};

			/* moore-neighbor tracing with jacob's stopping criterion
			 * based on http://www.imageprocessingplace.com/downloads_V3/root_downloads/tutorials/contour_tracing_Abeer_George_Ghuneim/moore.html */
			this.mn					= function(i) {
				// define T as a square tesselation containing a connected component P on opaque cells
				// define M(a) to be the Moore neighborhood of pixel a
				var B = { x: [], y: [] },			// output of boundary pixels. set B to be empty
					bx,
					by,
					c = { x: 0, y: 0 },				// current pixel under consideration, i.e. c is in M(p)
					ec = 0,							// emergency counter, to make sure we don't get stuck in an infinite loop
					imgPD = this.imgPD[i],			// the image data
					j,								// an index / counter
					p = { x: this.imgH-1, y: 0 },	// current boundary pixel
					pstr = {},					// object containing strings of coordinates
					s,								// the starting opaque pixel
					sc = 0,							// startcount, a counter for how many times we've traced back to the start
					tx,
					ty;

				this.px = 0;						// the pixel data point under consideration
				this.l = { y: this.imgH, x: 0 };	// last pixel, ie pixel from which s was entered
				t = '';								// temp

				// from bottom to top and left to right scan the cells of T until an opaque pixel, s, of P is found
				s = this.mnfs(i);				// an opaque pixel
				if (s === bf) { return s; }		// if we can't find s, we've failed
				B.x.push(s.x); B.y.push(s.y);	// insert s into B
				p.x = s.x; p.y = s.y;			// set the current boundary point p to s, i.e. p=s

				// backtrack i.e. move to the pixel from which s was entered.
				// set c to be the next clockwise pixel in M(p).
				c = this.l;

				// pseudo Jacob's stop criterion
				// I'm not certain I've implemented this right, but...
				// stop once you've entered the start pixel twice from the same place
				// (though we're not actually checking for that right now)
				while (sc < 2) {
					if (s.x === c.x && s.y === c.y) { sc++; }
					this.px = 4*c.y*this.imgW + 4*(c.x+1) - 1;
					t = imgPD[this.px];

					// if c matches opacity criteria...
					// crazily, it's significantly slower to look at values in a wider range
					// see http://jsperf.com/compares-w-different-numbers
					if ((t >= this.omn && t <= this.omx) || (imgPD[this.px - 3] === this.mc.r && imgPD[this.px - 2] === this.mc.g && imgPD[this.px - 1] === this.mc.b && imgPD[this.px] === this.mc.a)) {
						p.x = c.x; p.y = c.y;					// set p=c
						B.x.push(c.x); B.y.push(c.y);			// insert c in B
						c.x = this.l.x; c.y = this.l.y;			// backtrack (move the current pixel c to the pixel from which p was entered)
						this.l.x = c.x; this.l.y = c.y;
					} else {
						this.l.x = c.x; this.l.y = c.y;
						c = this.mnfc(p);
					}

					ec++;
					if (ec === 100000) { return bf; }
				}
				
				// remove extraneous points
				// points that form a straight line aren't needed
				p = { x: [B.x[0]], y: [B.y[0]] };			// points we're keeping
				t = { t: '', x: [B.x[0]], y: [B.y[0]] };	// straight line tmp
				for (j=1; j<B.x.length; j++) {
					bx = B.x[j];
					by = B.y[j];
					tx = t.x[t.x.length - 1];
					ty = t.y[t.y.length - 1];
					if ((bx === tx && (t.t !== 'y') && (by === ty + 1 || by === ty - 1))) {
						t.t = 'x'
						t.x.push(bx);
						t.y.push(by);
					} else if ((by === ty && (t.t !== 'x') && (bx === tx + 1 || bx === tx - 1))) {
						t.t = 'y'
						t.x.push(bx);
						t.y.push(by);
					} else {
						p.x.push(t.x[0]);
						p.y.push(t.y[0]);
						p.x.push(tx);
						p.y.push(ty);
						t = { t: '', x: [bx], y: [by] };
					}
				}

				
				// ...also, using Jacob's stop criterion can cause the set of points to be doubled
				// we'll address that by converting to a string, splitting in two, and replacing extra instances of the original
				// hacky kinda, but it should work
				for (j=0; j<p.x.length; j++) {
					if (!isNaN(p.x[j]) && !isNaN(p.y[j])) {
						pstr.x += p.x[j] + ',';
						pstr.y += p.y[j] + ',';
					}
				}
				pstr.xh = pstr.x.substr(0,pstr.x.length/2);	// half the x coords
				pstr.yh = pstr.y.substr(0,pstr.y.length/2);	// half the y coords
				pstr.xn = pstr.x.replace(pstr.xh,'');			// new x coords
				pstr.yn = pstr.y.replace(pstr.yh,'');			// new y coords

				if (pstr.xn.length < pstr.x.length && pstr.yn.length < pstr.y.length) {
					p.x = p.x.splice(p.x.length/2-1);
					p.y = p.y.splice(p.y.length/2-1);
				}

				return p;
			};

			/* function for the Moore-neighbor tracing to find the next c (the next "current" pixel under consideration)
			 * finds c by looking at p, the current boundary pixel, and l, the last (previous) pixel
			 * t is a simple temp var that represents the next pixel */
			this.mnfc				= function(p) {
				var l = this.l;
				t = { x: 0, y: 0 };
				if (l.x < p.x) {
					if (l.y < p.y) {
						t.x = p.x;
						t.y = l.y;
					} else {
						t.x = l.x;
						t.y = l.y-1;
					}
				} else if (l.x === p.x) {
					if (l.y < p.y) {
						t.x = p.x+1;
					} else {
						t.x = p.x-1;
					}
					t.y = l.y;
				} else if (l.x > p.x) {
					if (l.y > p.y) {
						t.x = p.x;
						t.y = l.y;
					} else {
						t.x = l.x;
						t.y = l.y+1;
					}
				}
				return t;
			};

			/* function for the Moore-neighbor tracing to find s, the starting opaque pixel */
			this.mnfs				= function(i) {
				var imgPD = this.imgPD[i],
					s = {x: 0, y: 0},
					x = 0,
					y = 0;

				for (y=this.imgH-1; y>=0; y--) {
					for (x=0; x<this.imgW; x++) {
						this.px = 4*y*this.imgW + 4*(x+1) - 1;
						t = imgPD[this.px];

						// crazily, it's significantly slower to look at values in a wider range
						// see http://jsperf.com/compares-w-different-numbers
						if (t >= this.omn && t <= this.omx) {
							s.x = x;
							s.y = y;
							return s;
						} else {
							this.l.x = x;
							this.l.y = y;
						}

					}
				}
				return bf;
			};

			/* make path
			 * moves points from an array of paths to an output path */
			this.mp					= function(a) {
				var i, j, p = this.p, pnt, l = { x: a[0].x[0], y: a[0].y[0] };
				
				for (i=0; i<a.length; i++) {
					for (j=0; j<a[i].x.length; j++) {
						pnt = { x: a[i].x[j], y: a[i].y[j] };
						if (p.length === 0 || pnt.x !== p[p.length-1].x || pnt.y !== p[p.length-1].y) {
							p.push(pnt);
							this.pTxt += ', { x: ' + pnt.x + ', y: ' + pnt.y + ' }';
						}
					}
					if (i>1) {
						p.push(l);
						this.pTxt += ', { x: ' + l.x + ', y: ' + l.y + ' }';
					}
					this.p = p;
				}
			}

			/* function to prepare canvas for use */
			this.pc					= function() {
				var cnv = this.cnv;
				this.ctx.clearRect(0,0,cnv.width,cnv.height);
				cnv.width = this.imgW;
				cnv.height = this.imgH;
				db.appendChild(cnv);
			};

			/* function to choose a random colour, used to find mc (missingColor) */
			this.rc					= function() {
				t = {
					r: Math.round(255*Math.random()),
					g: Math.round(255*Math.random()),
					b: Math.round(254*Math.random()), // not 255 because we use blue later to draw transparent segments
					a: 255
				};
				return t;
			};

			/* function to erase an already-found object/path from the canvas so we can find new ones
			 * used to find multiple disjointed objects/paths within a pic
			 * i=0 is a transparent path, i=1 is an opaque path */
			this.rp					= function(i) {
				var ctx = this.ctx, p, ps;
				if (i === 1) { ps = this.po; } else { ps = this.pt; }
				ctx.globalCompositeOperation = 'destination-out';

				// anti-aliasing artifacts appear and these can't really be turned off.
				// there is a way in mozilla, but i haven't tested it and i want consistent behaviour between browsers
				// unfortunately, for now we have to set the line width to 2 and lose some detail
				ctx.lineWidth = 2;

				for (var j=0; j<ps.length; j++) {
					p = ps[j];
					ctx.beginPath();
					ctx.moveTo(p.x[0],p.y[0]);
					for (var k=1; k<p.x.length; k++) { ctx.lineTo(p.x[k],p.y[k]); }
					ctx.stroke();
					ctx.fill();
				}
				ctx.lineWidth = 1;
				ctx.globalCompositeOperation = 'source-over';
			};
		};









		/**S**/
		var APF = function() {
			this.cnv				= dce('canvas');				// canvas
			this.ctx				= this.cnv.getContext('2d');	// canvas context

			this.imgW				= 0;							// image width
			this.imgH				= 0;							// image height

			this.p					= [];							// path

			this.c					= null;							// container for mask

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
		/**E**/









		var msg = $('#msg'), // message
			u = $('#u div'), // upload
			ui = $('#u b'),  // upload icon
			coords = { sq: [{ x: 56, y: 37 }, { x: 25, y: 37 }, { x: 25, y: 5 }, { x: 57, y: 5 }] },
			src = dge('s'),
			prv = dge('prv');

		// about link
		$('nav a').click( function() {
			$('#abt').toggleClass('on');
			return bf;
		});

		// demo
		$('.ap').each( function() {
			var f = new APF();

			$(this).find('.apt').each( function() {
				$(this).wrap('<span style="display:inline-block;position:relative;" />');
				$(this).append('<span class="apmask" id="apmask_' + this.id + '"></span>');

				f.c = dge('apmask_' + this.id);
				f.ds(0,0,this.offsetWidth,this.offsetHeight);
			});

			$(this).find('img').each( function() {
				$(this).wrap('<span style="display:inline-block;position:relative;" />');
				$(this).after('<span class="apmask" id="apmask_' + this.id + '"></span>');

				f.c = dge('apmask_' + this.id);
				f.imgW = this.offsetWidth;
				f.imgH = this.offsetHeight;
				f.p = coords[this.id];
				f.f();

				$('#apmask_' + this.id).click( function() {
					$('#' + this.id).click();
					return bf;
				});
			});
		});
		$('.d a').click(function(){ w.alert($(this).text()); return bf; });

		// get image
		u.bind('dragenter dragover', function(e) {
			epdsp(e);
			$(this).addClass('h');
		}).bind('dragleave', function(e) {
			$(this).removeClass('h');
		}).bind('drop', function(e) {
			var fs = e.originalEvent.dataTransfer.files,
				f0 = fs[0],
				fr = new FileReader();
				
			epdsp(e);

			if (fs.length === 1) {
				dge('s').alt = f0.fileName;
				if (f0.type.match(/image.png|image.gif/) !== null) {
					fr.onloadend = function(f) {
						src.src = f.target.result; // real image to trace
						prv.src = f.target.result; // preview
					};
					fr.readAsDataURL(f0);
					ui.html('✔');
					err('Image OK.');
				} else {
					ui.html('⚠');
					err('Error: wrong file type.');
				}
			} else {
				ui.html('⚠');
				err('Error: you may only upload one file.');
			}
			$(this).removeClass('h');
		});

		// do it
		$('#u a').click(function() {
			var em = 'Error. Please try again.',
				f = new APF(),
				fn,
				p = new APP(),
				js,
				jss,
				jse,
				r;

			// get ready
			msg.removeClass('on');		// clear msgs
			$('#rm canvas').remove();	// clear old masks

			// check for missing file
			if (!src.src || src.src.length < 1) { err('Error: no image uploaded.'); return bf; }

			// trace it
			p.img = src;
			p.imgW = p.img.offsetWidth + 4;
			p.imgH = p.img.offsetHeight + 4;
			try { p.fmc(); } catch(e1) { err(em); return bf; }
			try { p.fpo(); } catch(e2) { err('Error: no opaque shapes found, or the image was too complex.'); return bf; }
			try { p.fpt(); } catch(e3) { err(em); return bf;  }
			try { p.cp(); } catch(e4) { err(em); return bf;  }
			try { p.dr(); } catch(e5) { err(em); return bf; }

			// draw the mask
			f = new APF();
			f.imgW = p.imgW;
			f.imgH = p.imgH;
			f.p = p.p;

			// update the example HTML code
			fn = $(src).attr('alt');
			$('#rh span.fn').html(fn);
			fn = fn.replace(/.png|.gif/g,'');
			$('#rh span.in').html(fn);

			// get the JS code
			$.ajax({
				url: 'a.js',
				async: bf,
				success: function(data) { js = data; },
				dataType: 'text'
			});
			jss = js.indexOf('/**S**/') + 7;
			jse = js.indexOf('/**E**/');
			js = js.substr(jss, jse-jss);
			js = js.replace(/"/gm,'&quot;');
			js = js.replace(/</gm,'&lt;');
			js = js.replace(/>/gm,'&gt;');
			js = js.replace(/dce\(/gm,'document.createElement(');
			js = js.replace(/	/gm,'  ');

			js = "(function() {\n  var coords = { " + fn + ": [" + p.pTxt.substr(2,p.pTxt.length) + "] };\n\n" + js + "\n\n  $('.alphapunch').each( function() {\n    var fist = new APF();\n\n    $(this).find('.aptarget').each( function() {\n      $(this).wrap('&lt;span style=\"display:inline-block;position:relative\" /&gt;');\n      $(this).append('&lt;span class=\"apmask\" id=\"apmask_' + this.id + '\"&gt;&lt;/span&gt;');\n\n      fist.c = document.getElementById('apmask_' + this.id);\n      fist.ds(0,0,this.offsetWidth,this.offsetHeight);\n    });\n\n    $(this).find('img').each( function() {\n      $(this).wrap('&lt;span style=\"display:inline-block;position:relative\" /&gt;');\n      $(this).after('&lt;span class=\"apmask\" id=\"apmask_' + this.id + '\"&gt;&lt;/span&gt;');\n\n      fist.c = document.getElementById('apmask_' + this.id);\n      fist.imgW = this.offsetWidth;\n      fist.imgH = this.offsetHeight;\n      fist.p = coords[this.id];\n      fist.f();\n\n      $('#apmask_' + this.id).click( function() {\n        $('#' + this.id).click();\n        return false;\n      });\n    });\n  });\n})();";
			$('#rj code').html(js);

			// finish
			r = dge('r');
			$(r).addClass('on');
			err('Done!');
			setTimeout(function() { $('html,body').animate({ scrollTop: r.offsetTop - 20 }); }, 200);
			return bf;
		});
	}
})();
