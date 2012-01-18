var player,
	track,
	curHint,
	curProblem,
	JSHINT;

require([ "ace/worker/jshint" ], function( jshint ) {
	JSHINT = jshint.JSHINT;
});

$(function(){
	// Start the editor and canvas drawing area
	var editor = new Editor( "editor" );
	Canvas.init();
	
	$("#editor").data( "editor", editor );
	
	// Set up toolbar buttons
	$(document).buttonize();
	
	$("#play").click(function() {
		if ( Record.playing ) {
			Record.pausePlayback();
		} else {
			Record.play();
		}
	});
	
	$("#progress").slider({
		range: "min",
		value: 0,
		min: 0,
		max: 100
	});
	
	var wasDrawing,
		recordData;
	
	$(Record).bind({
		playStarted: function( e, resume ) {
			// Reset the editor and canvas to its initial state
			if ( !resume ) {
				editor.reset();
				Canvas.clear();
				Canvas.endDraw();
			}
			
			if ( wasDrawing ) {
				$(Canvas).trigger( "drawStarted" );
			}
			
			$("#overlay").show();
			
			$("#play").addClass( "ui-state-active" )
				.find( ".ui-icon" )
					.removeClass( "ui-icon-play" ).addClass( "ui-icon-pause" );
		},
		
		playStopped: function() {
			$("#overlay").hide();
			
			wasDrawing = Canvas.drawing;
			
			if ( wasDrawing ) {
				$(Canvas).trigger( "drawEnded" );
			}
			
			$("#play").removeClass( "ui-state-active" )
				.find( ".ui-icon" )
					.addClass( "ui-icon-play" ).removeClass( "ui-icon-pause" );
		}
	});
	
	$("#tests").delegate( "button.check", "click", function() {
		var exercise = $(this).parent().prev().data( "exercise" ),
			code = editor.editor.getSession().getValue().replace(/\r/g, "\n"),
			validate, pass = false;
		 
		try {
			validate = new Function( code + "\nreturn " + exercise.validate );
			pass = validate();
		} catch( e ) {
			// TODO: Show error message
		}
		
		if ( pass ) {
			$(this).next(".error").remove();
			$(this).after( "<p><strong>Success!</strong> You answered the exercise correctly.</p>" );
			$(this).remove();
		
		} else {
			$(this).after( "<p class='error'><strong>Oops!</strong> You answered the exercise incorrectly.</p>" );
		}
	});
	
	$("#tests").delegate( "h3", "click", function( e ) {
		var exercise =  $(this).data( "exercise" );

		if ( exercise && exercise.time != null ) {
			seekTo( exercise.time );
		}
	});
	
	$("#test").click(function() {
		var numTest = $("#tests h3").length + 1,
			testObj = { title: "Exercise #" + numTest };
		
		if ( !Record.log( testObj ) ) {
			return false;
		}
		
		insertExerciseForm( testObj );
	});
	
	$("#get-hint").bind( "buttonClick", function() {
		if ( !$("#hint").is(":visible") ) {
			showHint();
		
			$("#hint")
				.addClass( "ui-state-active" )
				.css({ bottom: -30, opacity: 0.1 })
				.show()
				.animate({ bottom: 5, opacity: 1.0 }, 300 );
		}
	});
	
	$("#hint .close").click(function() {
		$("#hint")
			.animate({ bottom: -30, opacity: 0.1 }, 300, function() {
				$(this).hide();
			});

		return false;
	});
	
	$("#hint .nav a").click(function() {
		if ( !$(this).hasClass( "ui-state-disabled" ) ) {
			if ( $(this).hasClass( "next" ) ) {
				curHint += 1;
		
			} else {
				curHint -= 1;
			}
		
			showHint();
		}
		
		return false;
	});
	
	$("#run-code").bind( "buttonClick", function() {
		var userCode = $("#editor").editorText(),
			validate = curProblem.validate,
			pass = JSHINT( userCode );
			
		/* 
		var errors = [];
        for (var i=0; i<results.data.length; i++) {
            var error = results.data[i];
            if (error)
                errors.push({
                    row: error.line-1,
                    column: error.character-1,
                    text: error.reason,
                    type: "warning",
                    lint: error
                });
        }
        session.setAnnotations(errors);
		*/
		
		if ( pass ) {
		
			// TODO: Run JSHint
			// Show errors in results
			// Show errors/warnings in editor (?)
		
			runCode( userCode + "\n" + validate, { assert: assert } );
			
			$("#results").show();
		} else {
			// TODO: Log out errors
			console.log( "Error", JSHINT.errors );
			
			$("#results").hide();
		}
	});
	
	openExerciseDialog( openExercise );
});

var assert = function( a, b, msg ) {
	var pass = a === b;
	
	$("#results ul").append(
		"<li class='" + (pass ? "pass" : "error") +
		"'><span class='ui-icon ui-icon-" + (pass ? "circle-check" : "alert") +
		"'></span> <span class='msg'>" + msg + "</li>"
	);
};

var showHint = function() {
	$("#hint")
		.find( "strong" ).text( "Hint #" + (curHint + 1) + ":" ).end()
		.find( ".text" ).text( curProblem.hints[ curHint ] || "" ).end()
		.find( "a.prev" ).toggleClass( "ui-state-disabled", curHint === 0 ).end()
		.find( "a.next" ).toggleClass( "ui-state-disabled", curHint + 1 === curProblem.hints.length );
};

var openExercise = function( exercise ) {
	Exercise = exercise;

	// If an audio track is provided, load the track data
	// and load the audio player as well
	if ( Exercise.audioID ) {
		loadAudio();
	}
	
	$("h1").text( Exercise.title );
	
	document.title = Exercise.title;
	
	/* Perhaps not necessary?
	$("<p>" + Exercise.desc + "</p>")
		.appendTo( "body" )
		.dialog({ title: Exercise.title, resizable: false, draggable: false,
			buttons: { "Start Exercise": function() { $(this).dialog("close"); } },
			close: startExercise
		});
	*/

	if ( Exercise.problems ) {
		for ( var i = 0, l = Exercise.problems.length; i < l; i++ ) {
			insertExercise( Exercise.problems[i] );
		}
	}
	
	$("#exercise-tabs")
		.append( "<div id='overlay'></div>" )
		.tabs({
			show: function( e, ui ) {
				showProblem( Exercise.problems[ ui.index ] );
			}
		})
		.removeClass( "ui-widget-content" )
		.find( ".ui-tabs-nav" ).removeClass( "ui-corner-all" ).addClass( "ui-corner-top" ).end();
	
	startExercise();
};

var startExercise = function() {
	$("#overlay").hide();
};

var showProblem = function( problem ) {
	curProblem = problem;
	curHint = 0;
	
	$("#exercise-tabs .ui-state-active").removeClass( "ui-state-active" );
	
	$("#editor").editorText( problem.start || "" );
	
	$("#problem")
		.find( ".title" ).text( problem.title || "" ).end()
		.find( ".desc" ).text( (problem.desc || "").replace( /\n/g, "<br>" ) ).end();
	
	$("#run-code").toggleClass( "ui-state-disabled", !problem.validate );
	$("#get-hint").toggleClass( "ui-state-disabled", !(problem.hints && problem.hints.length) );
	
	$("#hint").hide();
};

var insertExercise = function( testObj ) {
	$( $("#tab-tmpl").html() )
		.find( ".ui-icon" ).remove().end()
		.find( "a" ).append( testObj.title || "Problem" ).end()
		.appendTo("#exercise-tabs ul.ui-tabs-nav");
};

var seekTo = function( time ) {
	$("#progress").slider( "option", "value", time / 1000 );
	Record.seekTo( time );
	
	if ( typeof SC !== "undefined" ) {
		player.setPosition( time );
		player.resume();
	
	} else {
		player.seekTo( time / 1000 );
	}
};

// track.waveform_url (hot)
var audioInit = function() {
	var updateTime = true,
		wasPlaying;
	
	var updateTimeLeft = function( time ) {
		$("#timeleft").text( "-" + formatTime( (track.duration / 1000) - time ) );
	};
	
	$("#playbar").show();
	$("#progress").slider( "option", "max", track.duration / 1000 );

	Record.time = 0;

	updateTimeLeft( 0 );

	player = SC.stream( Exercise.audioID.toString(), {
		autoLoad: true,
		
		whileplaying: function() {
			if ( updateTime && Record.playing ) {
				$("#progress").slider( "option", "value", player.position / 1000 );
			}
		},
		
		onplay: Record.play,
		onresume: Record.play,
		onpause: Record.pausePlayback
	});
	
	$("#progress").slider({
		start: function() {
			updateTime = false;
			wasPlaying = Record.playing;
		},
		
		slide: function( e, ui ) {
			updateTimeLeft( ui.value );
		},
		
		change: function( e, ui ) {
			updateTimeLeft( ui.value );
		},
		
		stop: function( e, ui ) {
			updateTime = true;
			
			if ( wasPlaying ) {
				seekTo( ui.value * 1000 );
			}
		}
	});
	
	$(Record).bind({
		playStarted: function() {
			if ( player.paused ) {
				player.resume();

			} else if ( player.playState === 0 ) {
				player.play();
			}
		},
		
		playStopped: function() {
			player.pause();
		}
	});
};

Record.handlers.test = function( e ) {
	Record.pausePlayback();
	Canvas.endDraw();
	// $("#tests").accordion({ active: e.pos });
};