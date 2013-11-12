(function() {

	// the error message element
	$('body').append('<p class="error" id="errorMessage');
	var errorMessage = $('#errorMessage');

	// navigation links
	navigation();

	// if we have canvas and ajax and drag-and-drop, load the drag-and-drop form
	if (Modernizr.canvas && Modernizr.draganddrop) {
		loadDnd();
	}

	// demo
	// optional params:
	// demoFist.containerClass = 'alphapunch';
	// demoFist.targetClass = 'alphapunch-target';
	// demoFist.maskClass = 'alphapunch-mask';
	var demoFist = new alphaPunchFist();
	demoFist.coords	= {
		square: [
			{ x: 56, y: 37 },
			{ x: 25, y: 37 },
			{ x: 25, y: 5 },
			{ x: 57, y: 5 }
		]
	};
	demoFist.punch();





	// display an error message
	function err(message) {
		if (!message || message === '') {
			message = 'Error. Try again?';
		}
		errorMessage.html(message).addClass('active').focus();
	}

	// load the drag-and-drop form
	function loadDnd() {
		$.ajax({
			url: 'template/dragndrop.html',
			success: loadDndCallback,
			dataType: 'html'
		});
	}

	function loadDndCallback(data, textStatus, jqXHR) {
		if (jqXHR.status !== 200 || textStatus !== 'success') return; // need an error here

		$('#imgform').html(data);

		var upload = $('#imgform-dnd'),
			uploadIcon = $('#imgform-dnd b');

		upload.bind('dragenter dragover', function(e) {
			prevDef(e);
			$(this).addClass('hover');

		}).bind('dragleave', function(e) {
			$(this).removeClass('hover');

		}).bind('drop', function(e) {
			prevDef(e);

			var files = e.originalEvent.dataTransfer.files,
				file = files[0];

			if (files.length === 1) {
				if (file.type.match(/.png|.gif/) !== null) {
					uploadIcon.html('✔');
					loadResults(file);
				} else {
					uploadIcon.html('⚠');
					err('Error: wrong file type. Only PNG and GIF files may be uploaded.');
				}

			} else {
				uploadIcon.html('⚠');
				err('Error: one file at a time, please.');
			}

			$(this).removeClass('hover');
		});
	}

	// load results HTML
	function loadResults(file) {
		$.ajax({
			url: 'template/results.html',
			success: loadResultsCallback(file),
			dataType: 'html'
		});
	}

	function loadResultsCallback(file) {
		return function(data, textStatus, jqXHR) {
			if (jqXHR.status !== 200 || textStatus !== 'success') return; // need an error here

			$('#results').remove();
			$('main').append(data);
			processUpload(file);
		};
	}

	// navigation links
	function navigation() {
		$('nav a').click( function() {
			$('section').removeClass('active');
			$($(this).attr('href')).addClass('active');
		});
	}

	// process uploaded image
	function processUpload(file) {
		var fileReader = new FileReader(),
			imageSource = $('#imageSource');

		fileReader.readAsDataURL(file);
		fileReader.onloadend = function(f) {
			imageSource.attr('alt', file.name);
			imageSource.attr('src', f.target.result);

			// call alphaPunchPencil to trace the image
			var filename,							// filename of uploaded image
				pencil = new alphaPunchPencil(),	// pencil object
				css,								// generated CSS
				html,								// generated HTML
				javascript,							// generated JavaScript
				results;							// results section element

			// get ready
			errorMessage.removeClass('active');		// clear error messages
			$('#imageMask').remove();				// clear old masks

			// check for missing file
			if (!imageSource.attr('src') || imageSource.attr('src') === '') {
				err('Error: no image.');
				return false;
			}

			// trace it
			pencil.sourceImage = document.getElementById('imageSource');
			pencil.imageWidth = pencil.sourceImage.offsetWidth + 4;
			pencil.imageHeight = pencil.sourceImage.offsetHeight + 4;
			pencil.previewContainer = document.getElementById('results-mask');
			if (!pencil.trace()) {
				error('Error tracing image');
			}

			// get the HTML
			$.ajax({
				url: 'template/html.txt',
				async: false,
				success: function(data) { html = data; },
				dataType: 'text'
			});

			// update the example HTML
			filename = imageSource.attr('alt');
			html = html.replace(/\[FILENAME\]/g, filename);
			filename = filename.replace(/.png|.gif/g,'');
			html = html.replace(/\[IMAGENAME\]/g, filename);
			$('#results-html code').html($('<div />').text(html));

			// get the CSS
			$.ajax({
				url: 'template/css.txt',
				async: false,
				success: function(data) { css = data; },
				dataType: 'text'
			});

			// update the example CSS
			$('#results-css code').html($('<div />').text(css));

			// get the JS code
			$.ajax({
				url: 'template/javascript.txt',
				async: false,
				success: function(data) { javascript = data; },
				dataType: 'text'
			});

			// update the example JS
			javascript = javascript.replace('w.coords = {}', 'w.coords = { "' + filename + '": [' + pencil.pathsText.substr(2,pencil.pathsText.length) + ']}');
			$('#results-javascript code').html($('<div />').text(javascript));

			// finish
			return false;
		};

		return false;
	}

	// a small function to prevent default behaviour
	function prevDef(e) {
		e.preventDefault();
		e.stopPropagation();
	}
})();
