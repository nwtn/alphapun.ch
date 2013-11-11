(function() {

	// the error message element
	// if it doesn’t already exist, create it
	var errorMessage = document.getElementById('errorMessage');
	if (!errorMessage) {
		errorMessage = document.createElement('p');
		errorMessage.className = 'error';
		errorMessage.id = 'errorMessage';
		document.body.appendChild(errorMessage);
		errorMessage = document.getElementById('errorMessage');
	}

	// test features
	Modernizr.addTest('ajax', function() {
		var xhr = new XMLHttpRequest();
		return !!('onprogress' in xhr);
	});

	// navigation links
	navigation();

	// if we have canvas and ajax and drag-and-drop, load the drag-and-drop form
	if (Modernizr.canvas && Modernizr.ajax && Modernizr.draganddrop) {
		loadDnd();
	}





	// display an error message
	function err(message) {
		if (!message || message === '') {
			message = 'Error. Try again?';
		}
		$(errorMessage).html(message).addClass('active').focus();
	}

	// load the drag-and-drop form
	function loadDnd() {
		var dnd = new XMLHttpRequest();
		dnd.onload = loadDndCallback;
		dnd.open("get", "dragndrop.html", true);
		dnd.send();
	}

	function loadDndCallback() {
		if (this.status === 200) {
			var imgform = document.getElementById('imgform');
			imgform.innerHTML = this.responseText;

			var upload = $('#imgform-dnd'),
				uploadIcon = $('#imgform-dnd b');

			upload.bind('dragenter dragover', function(e) {
				prevDef(e);
				$(this).addClass('hover');
			}).bind('dragleave', function(e) {
				$(this).removeClass('hover');
			}).bind('drop', function(e) {
				var files = e.originalEvent.dataTransfer.files,
					file = files[0],
					fileReader = new FileReader();

				prevDef(e);

				if (files.length === 1) {
					document.getElementById('imageSource').alt = file.name;
					if (file.type.match(/.png|.gif/) !== null) {
						fileReader.onloadend = function(f) {
							imageSource.src = f.target.result; // real image to trace
							// imageMask.src = f.target.result; // preview
						};
						fileReader.readAsDataURL(file);
						uploadIcon.html('✔');
						err('Image OK!');
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
	}

	// navigation links
	function navigation() {
		$('nav a').click( function() {
			$('section').removeClass('active');
			$($(this).attr('href')).addClass('active');
		});
	}

	// a small function to prevent default behaviour
	function prevDef(e) {
		e.preventDefault();
		e.stopPropagation();
	}
})();
