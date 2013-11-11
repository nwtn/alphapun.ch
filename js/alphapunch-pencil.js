/* alphaPun.ch (Pencil) - http://alphapun.ch/
 * by David Newton - @newtron - https://github.com/nwtn/ - david@davidnewton.ca
 */

(function(w) {
	w.alphaPunchPencil = function() {
		this.canvas					= document.createElement('canvas');	// canvas
		this.context				= this.canvas.getContext('2d');		// canvas context

		this.sourceImage			= null;								// image we're tracing
		this.imageWidth				= 0;								// image width
		this.imageHeight			= 0;								// image height
		this.imageWithPadding		= [];								// image with padding
		this.imagePixelData			= [];								// image pixel data

		this.missingColor			= {};								// a colour not present in the image (hex)
		this.missingColorRGB		= null;								// a colour not present in the image (rgb)

		this.opacityMinimum			= 255;								// minimum opacity to count as opaque
		this.opacityMaximum			= 255;								// maximum opacity to count as opaque

		this.prevPoint				= { y: 0, x: 0 };					// last (previous) point under consideration
		this.currentPixel			= 0;								// current pixel under consideration

		this.pathsOpaque			= [];								// paths of opaque objects
		this.pathsTransparent		= [];								// paths of transparent objects
		this.paths					= [];								// path of all objects
		this.pathsText				= '';								// path of all objects as plain text coords

		/* combine paths, removing duplicate adjacent points
		 * function to convert separate path arrays into single path array */
		this.combinePaths			= function() {
			this.paths = [];
			if (this.pathsOpaque.length > 0) { this.makePath(this.pathsOpaque); }
			if (this.pathsTransparent.length > 0) { this.makePath(this.pathsTransparent); }
		};

		/* function to draw a path on a canvas */
		this.drawPathOnCanvas		= function(context, color, paths) {
			var i,		// counter
				j,		// counter
				path;	// path

			context.fillStyle = color;

			for (i=0; i<paths.length; i++) {
				path = paths[i];
				context.beginPath();
				context.moveTo(path.x[0], path.y[0]);
				for (j=1; j<path.x.length; j++) {
					context.lineTo(path.x[j], path.y[j]);
				}
				context.stroke();
				context.fill();
			}
		};

		/* function to draw a preview of the mask on a new canvas */
		this.drawPreview			= function() {
			// canvas -- a different one than normal
			var canvas = document.createElement('canvas'),
				context = canvas.getContext('2d'),
				resultsMask = document.getElementById('results-mask');

			context.clearRect(0, 0, this.canvas.width, this.canvas.height);
			canvas.width = this.imageWidth;
			canvas.height = this.imageHeight;
			resultsMask.appendChild(canvas);

			// IE10 doesn’t scale canvas proportionally using max-width / max-height
			var imageSource = document.getElementById('imageSource');
			$(canvas).css({ width: imageSource.offsetWidth + 'px', height: imageSource.offsetHeight + 'px' });

			this.drawPathOnCanvas(context, '#000', this.pathsOpaque);
			this.drawPathOnCanvas(context, '#b45a51', this.pathsTransparent);
		};

		/* function to find a specific color in a set of pixel data */
		this.findColor				= function(i, red, green, blue, singleResult) {
			var imagePixelData = this.imagePixelData[i],
				j,
				tmp = [];

			for (j = 0; j < imagePixelData.length; j = j + 4) {
				if (imagePixelData[j] === red && imagePixelData[j + 1] === green && imagePixelData[j + 2] === blue && imagePixelData[j + 3] === 255) {
					this.currentPixel = Math.floor(j / 4);
					tmp.push(this.currentPixel);
					if (singleResult === true) { return tmp; }
				}
			}

			return tmp;
		};

		/* function to find a missing colour -- a colour that doesn't occur in the uploaded image */
		this.findMissingColor		= function() {
			var missingColorArray = [1];

			this.prepareCanvas();

			this.context.drawImage(this.sourceImage, 2, 2);
			this.imageWithPadding[0] = this.context.getImageData(0, 0, this.imageWidth, this.imageHeight);
			this.imagePixelData[0] = this.imageWithPadding[0].data;

			while (missingColorArray.length !== 0) {
				this.missingColor = this.randomColor();
				missingColorArray = this.findColor(0, this.missingColor.red, this.missingColor.green, this.missingColor.blue, true);
			}
			this.missingColorRGB = 'rgb(' + this.missingColor.red + ', ' + this.missingColor.green + ', ' + this.missingColor.blue + ')';

			document.body.removeChild(this.canvas);
		};

		/* function to find paths for opaque objects in the image */
		this.findPathsOpaque				= function() {
			var emergencyCounter = 0,	// emergency counter to stop at 100 paths
				i = 1,					// counter
				results;				// results

			// canvas!
			this.prepareCanvas();

			while (results !== false) {
				// draw the image onto the canvas, with a 2px border
				this.context.fillStyle = '#000';
				this.context.strokeStyle = '#000';
				this.context.drawImage(this.sourceImage, 2, 2);

				// remove old already found paths
				this.removePaths(1);

				// get the pixel data for the new padded image
				this.getImageData(i);

				// find an opaque shape
				results = this.mooreNeighborTrace(i);
				if (results !== false) { this.pathsOpaque.push(results); }

				i++;
				emergencyCounter++;
				if (emergencyCounter === 100) { results = false; }
			}
			document.body.removeChild(this.canvas);
		};

		/* function to find paths for transparent parts of opaque objects (ie holes) in the image */
		this.findPathsTransparent				= function() {
			var context = this.context,
				emergencyCounter = 0,	// emergency counter to stop at 100 paths
				i,						// counter
				j,						// counter
				k,						// counter for new image we’re creating
				path,					// path
				results;				// results

			// canvas!
			this.prepareCanvas();

			// draw the existing opaque paths as a filled missingColor shape
			for (i = 0; i < this.pathsOpaque.length; i++) {
				path = this.pathsOpaque[i];
				context.fillStyle = this.missingColorRGB;
				if (path.x.length == 1) {
					context.fillRect(path.x[0], path.y[0], 1, 1);
				} else {
					context.beginPath();
					context.moveTo(path.x[0], path.y[0]);
					for (j = 1; j < path.x.length; j++) {
						context.lineTo(path.x[j], path.y[j]);
					}
					context.fill();
				}
			}

			// draw the image over it
			// do this in slightly different positions to eliminate artifacts
			// we'll lose some detail, but it makes things a heck of a lot easier
			context.drawImage(this.sourceImage, 1, 1);
			context.drawImage(this.sourceImage, 2, 2);
			context.drawImage(this.sourceImage, 3, 3);

			// search for missingColor pixels;
			// these are transparent bits that weren't previously addressed
			k = this.imageWithPadding.length;
			this.getImageData(k);
			results = this.findColor(k, this.missingColor.red, this.missingColor.green, this.missingColor.blue, false);

			document.body.removeChild(this.canvas);

			if (results.length <= 1) { return false; }

			this.prepareCanvas();

			while (results !== false) {
				// draw the image onto the canvas
				k++;
				this.getImageData(k);
				for (i=0; i<results.length; i++) {
					this.currentPixel = results[i];
					this.imagePixelData[k][4 * this.currentPixel] = 0;
					this.imagePixelData[k][4 * this.currentPixel + 1] = 0;
					this.imagePixelData[k][4 * this.currentPixel + 2] = 255;
					this.imagePixelData[k][4 * this.currentPixel + 3] = 255;
				}
				context.putImageData(this.imageWithPadding[k], 0, 0);

				// remove old already-found paths
				this.removePaths(0);

				// get the pixel data for the new padded image
				k++;
				this.getImageData(k);

				results = this.mooreNeighborTrace(k);
				if (results !== false) { this.pathsTransparent.push(results); }
				emergencyCounter++;
				if (emergencyCounter === 100) { results = false; }
			}

			document.body.removeChild(this.canvas);
		};

		/* function to get image data off the canvas */
		this.getImageData				= function(i) {
			this.imageWithPadding[i] = this.context.getImageData(0, 0, this.imageWidth, this.imageHeight);
			this.imagePixelData[i] = this.imageWithPadding[i].data;
		};

		/* moore-neighbor tracing with jacob's stopping criterion
		 * based on http://www.imageprocessingplace.com/downloads_V3/root_downloads/tutorials/contour_tracing_Abeer_George_Ghuneim/moore.html */
		this.mooreNeighborTrace					= function(i) {
			// define T as a square tesselation containing a connected component P on opaque cells
			// define M(a) to be the Moore neighborhood of pixel a
			var boundaryPixels = { x: [], y: [] },							// output of boundary pixels. set B (boundaryPixels) to be empty
				boundaryPixelX,
				boundaryPixelY,
				currentPixel = { x: 0, y: 0 },								// current pixel under consideration, i.e. c (currentPixel) is in M(p) (boundaryPixelCurrent)
				emergencyCounter = 0,										// emergency counter, to make sure we don't get stuck in an infinite loop
				imagePixelData = this.imagePixelData[i],					// the image data
				j,															// an index / counter
				boundaryPixelCurrent = { x: this.imageHeight - 1, y: 0 },	// current boundary pixel
				coords = {},												// object containing strings of coordinates
				startingOpaquePixel,										// the starting opaque pixel
				startCount = 0,												// startcount, a counter for how many times we've traced back to the start
				tmpX,														// temporary x coordinate
				tmpY;														// temporary y coordinate

			this.currentPixel = 0;											// the pixel data point under consideration
			this.prevPoint = { y: this.imageHeight, x: 0 };					// last pixel, ie pixel from which s (startingOpaquePixel) was entered
			tmp = '';														// temp

			// from bottom to top and left to right scan the cells of T until an opaque pixel, s (startingOpaquePixel), of P is found
			startingOpaquePixel = this.mooreNeighborFindStart(i);

			// if we can't find s (startingOpaquePixel), we’ve failed
			if (startingOpaquePixel === false) {
				return false;
			}

			// insert s (startingOpaquePixel) into B (boundaryPixels)
			boundaryPixels.x.push(startingOpaquePixel.x);
			boundaryPixels.y.push(startingOpaquePixel.y);

			// set the current boundary point p (boundaryPixelCurrent) to s (startingOpaquePixel), i.e. p=s
			boundaryPixelCurrent.x = startingOpaquePixel.x;
			boundaryPixelCurrent.y = startingOpaquePixel.y;

			// backtrack i.e. move to the pixel from which s was entered.
			// set c (currentPixel) to be the next clockwise pixel in M(p) (boundaryPixelCurrent).
			currentPixel = this.prevPoint;

			// pseudo Jacob’s stop criterion
			// I'm not certain I’ve implemented this right, but...
			// stop once you’ve entered the start pixel twice from the same place
			// (though we’re not actually checking for that right now)
			while (startCount < 2) {

				// should this check the prevPoint as well?
				if (startingOpaquePixel.x === currentPixel.x && startingOpaquePixel.y === currentPixel.y) {
					startCount++;
				}

				this.currentPixel = 4 * currentPixel.y * this.imageWidth + 4 * (currentPixel.x + 1) - 1;
				tmp = imagePixelData[this.currentPixel];

				// if c (currentPixel) matches opacity criteria...
				// crazily, it’s significantly slower to look at values in a wider range
				// see http://jsperf.com/compares-w-different-numbers
				if ((tmp >= this.opacityMinimum && tmp <= this.opacityMaximum) || (imagePixelData[this.currentPixel - 3] === this.missingColor.red && imagePixelData[this.currentPixel - 2] === this.missingColor.green && imagePixelData[this.currentPixel - 1] === this.missingColor.blue && imagePixelData[this.currentPixel] === 255)) {
					// set p (boundaryPixelCurrent) =c (currentPixel)
					boundaryPixelCurrent.x = currentPixel.x;
					boundaryPixelCurrent.y = currentPixel.y;

					// insert c (currentPixel) in B (boundaryPixels)
					boundaryPixels.x.push(currentPixel.x);
					boundaryPixels.y.push(currentPixel.y);

					// backtrack (move the current pixel c (currentPixel) to the pixel from which p (boundaryPixelCurrent) was entered)
					currentPixel.x = this.prevPoint.x;
					currentPixel.y = this.prevPoint.y;
					this.prevPoint.x = currentPixel.x;
					this.prevPoint.y = currentPixel.y;
				} else {
					this.prevPoint.x = currentPixel.x;
					this.prevPoint.y = currentPixel.y;
					currentPixel = this.mooreNeighborFindCurrent(boundaryPixelCurrent);
				}

				emergencyCounter++;
				if (emergencyCounter === 100000) { startCount = 2; }
			}

			// remove extraneous points
			// points that form a straight line aren't needed
			boundaryPixelCurrent = { x: [boundaryPixels.x[0]], y: [boundaryPixels.y[0]] };	// points we're keeping
			tmp = { type: '', x: [boundaryPixels.x[0]], y: [boundaryPixels.y[0]] };			// straight line tmp

			for (j = 1; j < boundaryPixels.x.length; j++) {
				boundaryPixelX = boundaryPixels.x[j];
				boundaryPixelY = boundaryPixels.y[j];
				tmpX = tmp.x[tmp.x.length - 1];
				tmpY = tmp.y[tmp.y.length - 1];
				if ((boundaryPixelX === tmpX && (tmp.type !== 'y') && (boundaryPixelY === tmpY + 1 || boundaryPixelY === tmpY - 1))) {
					tmp.type = 'x';
					tmp.x.push(boundaryPixelX);
					tmp.y.push(boundaryPixelY);
				} else if ((boundaryPixelY === tmpY && (tmp.type !== 'x') && (boundaryPixelX === tmpX + 1 || boundaryPixelX === tmpX - 1))) {
					tmp.type = 'y';
					tmp.x.push(boundaryPixelX);
					tmp.y.push(boundaryPixelY);
				} else {
					boundaryPixelCurrent.x.push(tmp.x[0]);
					boundaryPixelCurrent.y.push(tmp.y[0]);
					boundaryPixelCurrent.x.push(tmpX);
					boundaryPixelCurrent.y.push(tmpY);
					tmp = { type: '', x: [boundaryPixelX], y: [boundaryPixelY] };
				}
			}


			// ...also, using Jacob's stop criterion can cause the set of points to be doubled
			// we'll address that by converting to a string, splitting in two, and replacing extra instances of the original
			// hacky kinda, but it should work
			for (j = 0; j < boundaryPixelCurrent.x.length; j++) {
				if (!isNaN(boundaryPixelCurrent.x[j]) && !isNaN(boundaryPixelCurrent.y[j])) {
					coords.x += boundaryPixelCurrent.x[j] + ',';
					coords.y += boundaryPixelCurrent.y[j] + ',';
				}
			}
			coords.xh = coords.x.substr(0,coords.x.length/2);	// half the x coords
			coords.yh = coords.y.substr(0,coords.y.length/2);	// half the y coords
			coords.xn = coords.x.replace(coords.xh,'');			// new x coords
			coords.yn = coords.y.replace(coords.yh,'');			// new y coords

			if (coords.xn.length < coords.x.length && coords.yn.length < coords.y.length) {
				boundaryPixelCurrent.x = boundaryPixelCurrent.x.splice(boundaryPixelCurrent.x.length / 2 - 1);
				boundaryPixelCurrent.y = boundaryPixelCurrent.y.splice(boundaryPixelCurrent.y.length / 2 - 1);
			}

			return boundaryPixelCurrent;
		};

		/* function for the Moore-neighbor tracing to find the next c (currentPixel) (the next "current" pixel under consideration)
		 * finds currentPixel by looking at pixel, the current boundary pixel, and prevPoint, the last (previous) pixel
		 * tmp is a simple temp var that represents the next pixel */
		this.mooreNeighborFindCurrent			= function(pixel) {
			var prevPoint = this.prevPoint;
			tmp = { x: 0, y: 0 };

			if (prevPoint.x < pixel.x) {
				if (prevPoint.y < pixel.y) {
					tmp.x = pixel.x;
					tmp.y = prevPoint.y;
				} else {
					tmp.x = prevPoint.x;
					tmp.y = prevPoint.y - 1;
				}
			} else if (prevPoint.x === pixel.x) {
				if (prevPoint.y < pixel.y) {
					tmp.x = pixel.x + 1;
				} else {
					tmp.x = pixel.x - 1;
				}
				tmp.y = prevPoint.y;
			} else if (prevPoint.x > pixel.x) {
				if (prevPoint.y > pixel.y) {
					tmp.x = pixel.x;
					tmp.y = prevPoint.y;
				} else {
					tmp.x = prevPoint.x;
					tmp.y = prevPoint.y + 1;
				}
			}
			return tmp;
		};

		/* function for the Moore-neighbor tracing to find s (startingOpaquePixel), the starting opaque pixel */
		this.mooreNeighborFindStart				= function(i) {
			var imagePixelData = this.imagePixelData[i],
				startingOpaquePixel = {x: 0, y: 0},
				x = 0,
				y = 0,
				tmp;

			for (y = this.imageHeight - 1; y >= 0; y--) {
				for (x = 0; x < this.imageWidth; x++) {
					this.currentPixel = 4 * y *this.imageWidth + 4 * (x + 1) - 1;
					tmp = imagePixelData[this.currentPixel];

					// crazily, it's significantly slower to look at values in a wider range
					// see http://jsperf.com/compares-w-different-numbers
					if (tmp >= this.opacityMinimum && tmp <= this.opacityMaximum) {
						startingOpaquePixel.x = x;
						startingOpaquePixel.y = y;
						return startingOpaquePixel;
					} else {
						this.prevPoint.x = x;
						this.prevPoint.y = y;
					}

				}
			}
			return false;
		};

		/* make path
		 * moves points from an array of paths to an output path */
		this.makePath							= function(array) {
			var i,
				j,
				paths = this.paths,
				point,
				prevPoint = { x: array[0].x[0], y: array[0].y[0] };

			for (i = 0; i < array.length; i++) {
				for (j = 0; j < array[i].x.length; j++) {
					point = { x: array[i].x[j], y: array[i].y[j] };
					if (paths.length === 0 || point.x !== paths[paths.length-1].x || point.y !== paths[paths.length-1].y) {
						paths.push(point);
						this.pathsText += ', { x: ' + point.x + ', y: ' + point.y + ' }';
					}
				}
				if (i > 1) {
					paths.push(prevPoint);
					this.pathsText += ', { x: ' + prevPoint.x + ', y: ' + prevPoint.y + ' }';
				}
				this.paths = paths;
			}
		};

		/* function to prepare canvas for use */
		this.prepareCanvas					= function() {
			var canvas = this.canvas;
			this.context.clearRect(0,0,canvas.width,canvas.height);
			canvas.width = this.imageWidth;
			canvas.height = this.imageHeight;
			document.body.appendChild(canvas);
		};

		/* function to choose a random colour, used to find missingColor */
		this.randomColor			= function() {
			var color = {
				'red':		Math.round(255 * Math.random()),
				'green':	Math.round(255 * Math.random()),
				'blue':		Math.round(254 * Math.random()) // not 255 because we use blue later to draw transparent segments
			};
			return color;
		};

		/* function to erase an already-found object/path from the canvas so we can find new ones
		 * used to find multiple disjointed objects/paths within a pic
		 * i=0 is a transparent path, i=1 is an opaque path */
		this.removePaths					= function(i) {
			var context = this.context, p, ps;
			if (i === 1) { ps = this.pathsOpaque; } else { ps = this.pathsTransparent; }
			context.globalCompositeOperation = 'destination-out';

			// anti-aliasing artifacts appear and these can't really be turned off.
			// there is a way in mozilla, but i haven't tested it and i want consistent behaviour between browsers
			// unfortunately, for now we have to set the line width to 2 and lose some detail
			context.lineWidth = 2;

			for (var j=0; j<ps.length; j++) {
				p = ps[j];
				if (p.x.length == 1) {
					context.fillRect(p.x[0],p.y[0],1,1);
				} else {
					context.beginPath();
					context.moveTo(p.x[0],p.y[0]);
					for (var k=1; k<p.x.length; k++) { context.lineTo(p.x[k],p.y[k]); }
					context.stroke();
					context.fill();
				}
			}
			context.lineWidth = 1;
			context.globalCompositeOperation = 'source-over';
		};
	};
})(window);
