export default function ( HC, Canvas, $el, Timer, Fingers, KeyPatterns ) {

    var Hotcold = HC,
        Canvas = Canvas,
        $el = $el,
        Timer = Timer,
        Fingers = Fingers,
        KeyPatterns = KeyPatterns;

    function Course() {

        // the main data structure to hold the all the lines of the course
        var lesson = [];

        // specifies the current index of the current line
        var curr_index = 0;

        //specifies the current line that is being processed
        var curr_line = 0;

        //denotes the length of the current line
        var curr_line_length = 0;

        //total lines in the course
        var course_length = 0;

        //contains the span wrapped screen texts
        var screen_text = '';

        //time for the course
        var minutes = 0;

        // Our "Worker" Helper
        var helper;

        var keys = [];

        this.get_time = function () {
            return minutes;
        };

        for ( var i = 32; i < 127; i++ ) {

            var temp = '#key_' + i;
            keys[ i ] = $( temp );

            if ( i >= 65 && i <= 90 ) {

                //we have caps letters; assign them appropriate divs of small letters in the virtual keyboard;
                var code = String.fromCharCode( i )
                                    .toLowerCase()
                                    .charCodeAt( 0 );
                temp = '#key_' + code;
                keys[ i ] = $( temp );

            }

            // numbers 0 - 9
            if ( i >= 48 && i <= 57 ) {
                //we have numbers (top row) assign them the appropriate divs    
                var code = get_numeric_div( i );
                temp = '#key_' + code;
                keys[ i ] = $( temp );
            }

            // mapping all the symbols to appropriate div
            // 91 => [, 93 => ], 59 => ; , 39 => ' (single quote) , 92 => \, 44 => ,(comma),
            // 46 => . (period), 47 => /, 95 => _ (underscore), 43 => +, 96 => `(tick), 45 => hyphen() 
            // NOTE: for keyboard change, this has to be dynamic
            if ( i == 91 || i == 93 || i == 59 || i == 39 || i == 92 || i == 44 || i == 46 || i == 47 || i == 43 || i == 96 || i == 45) {
                var code = get_numeric_div( i );
                temp = '#key_' + code;
                keys[ i ] = $( temp );
            }

        }

        //initialize the course; get the contents from the json file and prepare the local variables;   

        this.init = function ( course_details ) {

            var self = this; // save reference

            // note: lesson is defined globally in this object; careful of this gotcha

            if ( !course_details ) {
                
                lesson = convertJson();
                // we need to check if it is default 1 min or custom time
                minutes = $el.free_time.is(":checked") ? 1 : $el.custom_duration.val();
                self.prepare();
                // all done; lets return
                return;

            } else {

                // we have one extra special case; check if course text is an array
                if ( _.isArray( course_details.course_text ) ) {

                    // for each line in course
                    _.each( course_details.course_text, function (val, key) {
                        
                        lesson[ key ] = {};
                        lesson[ key ].code = [];
                        lesson[ key ].text = [];
                        lesson[ key ].pattern = [];
                        
                        // convert each string in line to code and finger pattern
                        _.each( val, function (str, index) {
                            lesson[ key ].text.push( str );
                            var code = str.charCodeAt( 0 );
                            var pattern = get_finger_pattern( code );
                            lesson[ key ].pattern.push( pattern );
                            lesson[ key ].code.push( code );
                        } );
                        
                    } );

                    minutes = course_details.duration ? course_details.duration : 1;
                    self.prepare();

                    // all done;
                    return;
                }

                // it is a general lesson; parse the course text and other stuff from the course details
                lesson = convertJson( course_details );
                minutes = course_details.duration ? course_details.duration : 1;
                self.prepare();
                // all done; lets return  
                return;
            }

            return;

        }; //end of init

        // prepare the course
        this.prepare = function () {

            // clean_canvas();
            Canvas.clean_canvas();
            //initiate the worker 

            helper = new Worker( 'js/hotcold_stat_helper.js' );

            helper.addEventListener( 'message', function ( event ) {

                var result = JSON.parse( event.data );

                // do not blindly remove all the class; let the "backlit class be there"
                var has_backlit = $(result.highlight.div_id).hasClass("backlit") ? "backlit": "";
                $(result.highlight.div_id).removeClass();
                $(result.highlight.div_id).addClass( 'keys ' + has_backlit );
                $(result.highlight.div_id).addClass( result.highlight.div_class );

                // do not blindly remove all the class; let the "backlit class be there"
                var has_backlit = keys[ result.highlight.code ].hasClass("backlit") ? "backlit": "";
                keys[ result.highlight.code ].removeClass();
                keys[ result.highlight.code ].addClass( 'keys ' + has_backlit );
                keys[ result.highlight.code ].addClass( result.highlight.div_class );

                if ( result.highlight.format == 2 ) {
                    keys[ result.highlight.code ]
                        .children( '.bottom-k' )
                        .addClass( 'u_line' );
                } else {
                    keys[ result.highlight.code ]
                        .children( '.bottom-k' )
                        .removeClass( 'u_line' );
                }

                $el.c_div.html( result.update );

            }, false );

            helper.addEventListener( 'error', function ( e ) {
                //console.log('Worker error info: message '+e.message);
            }, false );

            course_length = lesson.length;
            curr_line_length = lesson[ curr_line ].code.length;

            for ( var i = 32; i < 127; i++ ) {
                keys[ i ].removeClass()
                        .addClass( 'keys' );
            }

            $el.lv.html( '' );
            // var live_update = $( '#c' );
            $el.c_div.html( '' );
            // var c_label = $( '#c_label' );
            $el.c_label.hide();

            // var min_div = $( '#min' );
            // var sec_div = $( '#sec' );

            $el.$min_div.html( minutes );
            $el.$sec_div.html( '00' );

            // var ci = $( '#completion_indicator' );
            $el.ci.hide();

            // var completed_div = $( '#completed' );
            $el.completed_div.html( '' );

            // var gross_speed = $( '#type_speed' );
            $el.type_speed.html( '' );
            // var net_speed = $( '#net_type_speed' );
            $el.net_type_speed.html( '' );
            // var accuracy = $( '#accuracy' );
            $el.accuracy.html( '' );

            $.each( lesson[ curr_line ].text, function ( key, val ) {
                var span_text = '<span>' + val + '</span>';
                screen_text += span_text;
            } );

            highlight_finger( lesson[ curr_line ].pattern[ curr_index ] );

            highlight_key( lesson[ curr_line ].code[ curr_index ] );

            $el.lv.html( screen_text );

            var temp = curr_index + 1;
            
            $el.lv.find("span:nth-child(" + temp + ")").addClass( "key_before" );

            Hotcold.course_init = true;

            keys[ 32 ].addClass( 'space_start' );

            $el.abort.show();
            $el.space_to_resume.hide();

        };

        //redo function
        this.redo = function () {

            //reset the hotcold object variables

            Hotcold.reset();

            //reset the variables
            curr_index = 0;
            curr_line = 0;
            curr_line_length = 0;
            course_length = 0;
            screen_text = '';

            $el.completed_button.hide();
            $el.redo_course.hide();
            $el.space_to_start.show();
            $el.c_home.hide();

            this.prepare();

        };

        this.clean_window = function () {

            $el.lv.html( '' );

            //reset the hotcold object variables

            Hotcold.reset();

            //reset the variables
            curr_index = 0;
            curr_line = 0;
            curr_line_length = 0;
            course_length = 0;
            screen_text = '';

            Canvas.reset();

            $el.completed_button.hide();
            $el.redo_course.hide();
            $el.space_to_start.show();
            $el.c_home.hide();

        };

        this.manage_screen = function ( key_typed ) {

            if ( key_typed == lesson[ curr_line ].code[ curr_index ] ) {

                //now send a message to our helper (worker) so that it can start working :)

                helper.postMessage( { "status": "right", "code": lesson[ curr_line ].code[ curr_index ], "close": false } );

                $el.lv.find("span:nth-child(" + curr_index + ")").removeClass( "key_before" );
                
                var temp = curr_index + 1;
                $el.lv.find("span:nth-child(" + temp + ")").addClass( "key_ok" );

                Hotcold.correct++;

            } else {

                //now send a message to our helper (worker) so that it can start working :)

                helper.postMessage( { "status": "wrong", "code": lesson[ curr_line ].code[ curr_index ], "close": false } );

                $el.lv.find("span:nth-child(" + curr_index + ")").removeClass( "key_before" );
                
                var temp = curr_index + 1;
                $el.lv.find("span:nth-child(" + temp + ")").addClass( "key_not_ok" );

            }

            //console.log('index' +curr_index);

            curr_index += 1;

            if ( curr_index == curr_line_length ) {

                //console.log('current line over');
                curr_line++;

                //update completion status

                if ( curr_line == course_length ) {
                    //console.log('course also over');
                    //end_course();
                    this.end_course();
                } else {
                    curr_index = 0;
                    curr_line_length = lesson[ curr_line ].code.length;
                    //change the screen
                    screen_text = '';
                    $.each( lesson[ curr_line ].text, function ( key, val ) {
                        var span_text = '<span>' + val + '</span>';
                        screen_text += span_text;
                    } );

                    $el.lv.html( screen_text );

                }
            }

            
            var temp = curr_index + 1;
            $el.lv.find("span:nth-child(" + temp + ")").addClass( "key_before" );

            if ( Hotcold.course_init ) {
                //perform finger pattern
                highlight_finger( lesson[ curr_line ].pattern[ curr_index ] );
                //perform key highlight
                highlight_key( lesson[ curr_line ].code[ curr_index ] );
            }

            // var completed_div = $( '#completed' );
            var completed_percent = parseInt( ( curr_line / course_length ) * 100, 10 );
            var completed_text = completed_percent + '%';
            $el.completed_div.html( completed_text );

        };

        this.end_course = function () {

            Timer.endTimer();

            Hotcold.course_init = false;
            Hotcold.course_started = false;
            Hotcold.course_completed = true;

            var finger = $( '.finger' );
            finger.hide();

            var r_shift = $( '#shift_right' );
            var l_shift = $( '#shift_left' );

            if ( Hotcold.right_shift ) {
                r_shift.removeClass( 'backlit' );
                Hotcold.right_shift = false;
            }

            if ( Hotcold.left_shift ) {
                l_shift.removeClass( 'backlit' );
                Hotcold.left_shift = false;
            }

            if ( Hotcold.prev_key != 0 )
                keys[ Hotcold.prev_key ].removeClass( 'backlit' );

            Hotcold.prev_key = 0;

            //close the worker;

            helper.postMessage( { "close": true } );

            Canvas.complete();

            //console.log("Timer and course finished");
        };

        // -------------------------------------------------------------------------------------------
        // START: Helper functions
        // -------------------------------------------------------------------------------------------

        // START: highlight finger module
        function highlight_finger (code) {

            switch ( code ) {

                case 1:
                    $el.finger.hide();
                    $el.finger_1.show();
                    break;

                case 2:
                    $el.finger.hide();
                    $el.finger_2.show();
                    break;

                case 3:
                    $el.finger.hide();
                    $el.finger_3.show();
                    break;

                case 4:
                    $el.finger.hide();
                    $el.finger_4.show();
                    break;

                case 5:
                    $el.finger.hide();
                    $el.finger_5.show();
                    break;

                case 6:
                    $el.finger.hide();
                    $el.finger_6.show();
                    break;

                case 7:
                    $el.finger.hide();
                    $el.finger_7.show();
                    break;

                case 8:
                    $el.finger.hide();
                    $el.finger_8.show();
                    break;

                case 9:
                    $el.finger.hide();
                    $el.finger_9.show();
                    break;

                case 10:
                    $el.finger.hide();
                    $el.finger_10.show();
                    break;

                case 11:
                    $el.finger.hide();
                    $el.finger_1.show();
                    $el.finger_10.show();
                    break;

                case 12:
                    $el.finger.hide();
                    $el.finger_2.show();
                    $el.finger_10.show();
                    break;

                case 13:
                    $el.finger.hide();
                    $el.finger_3.show();
                    $el.finger_10.show();
                    break;

                case 14:
                    $el.finger.hide();
                    $el.finger_4.show();
                    $el.finger_10.show();
                    break;

                case 15:
                    $el.finger.hide();
                    $el.finger_7.show();
                    $el.finger_1.show();
                    break;

                case 16:
                    $el.finger.hide();
                    $el.finger_1.show();
                    $el.finger_8.show();
                    break;

                case 17:
                    $el.finger.hide();
                    $el.finger_1.show();
                    $el.finger_9.show();
                    break;

                case 18:
                    $el.finger.hide();
                    $el.finger_1.show();
                    $el.finger_10.show();
                    break;

            }

        }
        // END: highlight finger module

        // START: Highlight key
        function highlight_key( code ) {

            if ( Hotcold.prev_key != 0 ) {
                keys[ Hotcold.prev_key ].removeClass( 'backlit' );
            }

            var r_shift = $( '#shift_right' );
            var l_shift = $( '#shift_left' );

            if ( Hotcold.right_shift ) {
                r_shift.removeClass( 'backlit' );
                Hotcold.right_shift = false;
            }

            if ( Hotcold.left_shift ) {
                l_shift.removeClass( 'backlit' );
                Hotcold.left_shift = false;
            }

            var right_shift_patterns = KeyPatterns[ Hotcold.layout ].right,
                is_right_shift = right_shift_patterns.indexOf(code) > -1,
                left_shift_patterns = KeyPatterns[ Hotcold.layout ].left,
                is_left_shift = left_shift_patterns.indexOf(code) > -1;

            if ( is_right_shift ) {
                Hotcold.right_shift = true;
                r_shift.addClass( 'backlit' );
            }

            if (is_left_shift) {
                Hotcold.left_shift = true;
                l_shift.addClass( 'backlit' );
            }

            keys[ code ].addClass( 'backlit' );

            Hotcold.prev_key = code;

        }
        // END: Highlight key

        // START: get_numeric_div
        //module to get the right div ids for numbers and special characters;
        // TODO: should tweak this for each keyboard layouts also in stat helper
        function get_numeric_div( code ) {

            switch ( code ) {

                case 49:
                    return 33;

                case 50:
                    return 64;

                case 51:
                    return 35;

                case 52:
                    return 36;

                case 53:
                    return 37;

                case 54:
                    return 94;

                case 55:
                    return 38;

                case 56:
                    return 42;

                case 57:
                    return 40;

                case 48:
                    return 41;

                case 91:
                    return 123;

                case 93:
                    return 125;

                case 59:
                    return 58;

                case 39:
                    return 34;

                case 92:
                    return 124;

                case 44:
                    return 60;

                case 46:
                    return 62;

                case 47:
                    return 63;

                // case 95:
                //     return 45;

                // tick => `, mapping to ~
                case 96:
                    return 126;

                // hyphen mapping to underscore
                case 45: 
                    return 95;

                // note this for +; have to watch out in case of bugs;
                // note this module is also used in stat helper
                case 43:
                    // return 61;
                    return 43;

            }

        }
        // END: get_numeric_div

        //returns finger highlighting pattern

        //1-10 correponding finger from left to right
        //11-14 right shift plus left hand four fingers
        //15-18 left shift plus right hand four fingers (starting from index)
        function get_finger_pattern( code ) {

            var char = String.fromCharCode( code ),
                pattern = Fingers[ Hotcold.layout ][ char ];

            return  pattern;

        } //end of get_finger_pattern module

        // START: convertJson module
        function convertJson( course_details ) {

            var custom_lesson = course_details ? course_details.course_text : $el.cli.val().trim();

            var newString = custom_lesson.replace( /\r?\n|\r/g, " " );

            var str = new String( newString );

            var start_index = 0;
            var last_index = course_details ? course_details.line_length : 30;

            var index = 0;

            var temp = [];

            var converted = [];

            //console.log(String.fromCharCode(str.charCodeAt(last_index)));

            if ( str.length > last_index ) {

                while ( str.length > last_index ) {

                    var last_space = -1;

                    str = $.trim( str );

                    if ( str[ last_index ] && str.charCodeAt( last_index ) != 32 ) {

                        var last_space = str.lastIndexOf( " ", last_index )

                    }

                    if ( last_space != -1 ) {

                        converted[ index ] = { "text": [], "code": [], "pattern": [] };

                        for ( var i = 0; i < last_space; i++ ) {
                            converted[ index ].text.push( str[ i ] );
                            var code = str[ i ].charCodeAt( 0 );
                            var pattern = get_finger_pattern( code );
                            converted[ index ].pattern.push( pattern );
                            converted[ index ].code.push( code );
                        }

                        index++;

                        str = str.slice( last_space + 1 );

                        str = $.trim( str );

                    } else {

                        converted[ index ] = { "text": [], "code": [], "pattern": [] };

                        for ( var i = 0; i < last_index; i++ ) {
                            converted[ index ].text.push( str[ i ] );
                            var code = str[ i ].charCodeAt( 0 );
                            var pattern = get_finger_pattern( code );
                            converted[ index ].pattern.push( pattern );
                            converted[ index ].code.push( code );
                        }

                        index++;

                        str = str.slice( last_index );

                        str = $.trim( str );

                    }

                    if ( str.length < last_index ) {
                        converted[ index ] = { "text": [], "code": [], "pattern": [] };

                        for ( var i = 0; i < str.length; i++ ) {
                            converted[ index ].text.push( str[ i ] );
                            var code = str[ i ].charCodeAt( 0 );
                            var pattern = get_finger_pattern( code );
                            converted[ index ].pattern.push( pattern );
                            converted[ index ].code.push( code );

                        }

                    }

                }

            } else {

                str = $.trim( str );

                converted[ index ] = { "text": [], "code": [], "pattern": [] };

                for ( var i = 0; i < str.length; i++ ) {
                    converted[ index ].text.push( str[ i ] );
                    var code = str[ i ].charCodeAt( 0 );
                    var pattern = get_finger_pattern( code );
                    converted[ index ].pattern.push( pattern );
                    converted[ index ].code.push( code );
                }

            }

            return converted;

        } 
        // END: convertJson module

        // -------------------------------------------------------------------------------------------
        // END: Helper functions
        // -------------------------------------------------------------------------------------------

    }

    return Course;

};

// export the course constructor
