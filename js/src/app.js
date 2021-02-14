import Hotcold, { layout, reset, curr_course, course_init, course_started, key_interval, course_first_time, hits, canvas_normal_line, canvas_ref_line } from "./Hotcold.js";
import jquery_el from "./jquery_el.js";
import { current, day, night } from "./Theme.js";
import Canvas from "./Canvas.js"
import Timer from "./Timer.js"
import Course from "./Course.js"
import Support from "./Support.js"

//import KB from "./layouts.json";
//import Lessons from "../../lessons/lessons.json";

// import HC_CONFIG, { type, APPMODE, messages, PRO_CRX_URL } from "../../config.json";
const fromJson = async(url) => {
    const response = await fetch(url)
    const  object = await response.json()
    return object;
}
var APP = {

    HC_CONFIG: (async function() { await fromJson("./config.json")})(),
    //KB: fromJson("./js/src/layouts.json"),
    
    $el: jquery_el,

    start: function () {
        
       // console.log( "config ", this.HC_CONFIG, this.KB, _ );

     
        this.initKeyboardLayouts();

        this.initLayoutLessons();

        this.initializeEvents();
        this.initAppMode();

        // check for canvas/web workers support
        Support.check();
    },

    // initializes keyboard layout in the course window
    initKeyboardLayouts: function () {
        console.log("Porumai! initing keyboard events ", layout, _.keys( this.KB ) );
        var self = this; // save reference

        var $keyboard, $row, $main_key, $top_k, $bottom_k;

        // main keyboard div
        $keyboard = $("<div>")
                        .attr("id", this.layout);

        // generate rows from the layout data
        _.each( this.KB[layout], function (key_data, row) {

            // generating main row
            $row = $("<section>")
                        .attr("id", row);


            // generating keys for the row
            _.each( key_data, function (key) {

                // check if the key is special
                if (key.special) {
                    // this is a special key
                    $main_key = $("<span>")
                                    .attr("id", key.id)
                                    .addClass("keys");

                    $main_key
                        // append the top key
                        .append(
                            $("<div>")
                                .addClass("top-k")
                                .html( key.keys[0] ? key.keys[0] : "&nbsp;" )
                        )
                        // append the bottom key
                        .append(
                            $("<div>")
                                .addClass("bottom-k")
                                .html( key.keys[1] ? key.keys[1] : "&nbsp;" )
                        )

                    // all done; append the key to the row
                    $row.append( $main_key );
                } 
                // normal key
                else {
                    // in current logic, key id is character code of the top key
                    var key_id = key.keys[0].toLowerCase().charCodeAt(0);

                    $main_key = $("<span>")
                                    .attr("id", "key_" + key_id)
                                    .addClass("keys");

                    
                    $main_key
                        // append the top key
                        .append(
                            $("<div>")
                                .addClass("top-k")
                                .html( key.keys[0] )
                        )
                        // append the bottom key
                        .append(
                            $("<div>")
                                .addClass("bottom-k")
                                .html( key.keys[1] ? key.keys[1] : "&nbsp;" )
                        )

                    // all done; append the key to the row
                    $row.append( $main_key );
                }

            } );

            // all done; append the row to the keyboard
            $keyboard.append( $row );

        } );

        // keyboard generated
        // clear the existing keyboard div
        self.$el.keyboard_layout.empty();
        // append the new layout to the keyboard div
        self.$el.keyboard_layout.html( $keyboard );

        // last but not least, update the space jquery element reference
        self.$el.space = self.$el.keyboard_layout.find("#key_32");

    },

    // initializes lessons for the selected keyboard layout
    initLayoutLessons: function () {

        var self = this; // save reference
        
        // note make a copy, to prevent reversing of source
        var lessons = fetch("./lessons/lessons.json").then(response => response.parseJSON)[layout]
        //var lessons = _.map( Lessons[layout], _.clone() );
        // generate lesson (in reverse) to prepend properly
        lessons = _.chain( lessons )
                    .reverse()
                    .value();

        // clear the lesson headers (except the custom course)
        self.$el.lesson_headers.find(".lesson-header").remove();

        // empty lesson details
        self.$el.lesson_details.find(".lesson-detail").remove();
        
        
        _.each( lessons, function (lesson) {

            var lh_template = Mustache.render( self.$el.template_lh.html(), lesson );
            // display the lesson headers
            self.$el.lesson_headers.prepend( lh_template );

            // display the course row
            var $course_row = $("<div>")
                                    .attr("id", lesson.row_id)
                                    .addClass("lesson-detail tab-pane");

            // append the courses to the course row
            _.each( lesson.courses, function (course) {
                // rendering with mustache js
                var ci_template = Mustache.render( self.$el.template_ci.html(), course );
                var $course = $( ci_template );
                // attach the course details to the launch button
                $course
                    .find(".launch-course")
                    .data("hc-course", JSON.stringify(course) );

                $course_row.append( $course ); 
            } );

            // append the course row
            self.$el.lesson_details.prepend( $course_row );

        } );

        // click the first lesson
        self.$el.lesson_headers.find(".lesson-header").first().find("a").click();
    },

    // ----------------------------------------------------
    // START: HELPER FUNCTIONS

    isFullScreen: function () {
        // ref: http://stackoverflow.com/a/7855739/1410291
        if ( !window.screenTop && !window.screenY ) {
            return true;
        }

        return false;
    },

    requestFullScreen: function () {
        var el = document.getElementById( "course_window" ),
            rfs = el.requestFullScreen || el.webkitRequestFullScreen || el.mozRequestFullScreen;

        // call the appropriate function
        rfs.call( el );
    },

    cancelFullScreen: function () {
        document.cancelFullScreen = document.webkitExitFullscreen || document.mozCancelFullScreen || document.exitFullscreen;
        document.cancelFullScreen();
    },

    isProModeAllowed: function () {
        // check if the free course time is selected
        if ( APPMODE == "PRO" ) {
            return true;
        }
        return this.$el.free_time.is( ":checked" );
    },

    getProModeInfo: function () {

        var msg = "You can specify a custom time for your own course in PRO version. Get the Chrome App for the Pro Version!";

        var $holder = $( "<div>" )
                        .html( messages[ type ] || msg );

        var $b_holder = $( "<div>" )
                            .addClass("text-center");

        var $button = $( "<a>" )
            .attr( "href", PRO_CRX_URL )
            .attr( "target", "_blank" )
            .addClass( "btn btn-primary" )
            .html( "Download" )
            .appendTo( $b_holder );

        $holder.append( $b_holder );

        return $holder.get( 0 );

    },

    // END: HELPER FUNCTIONS
    // ----------------------------------------------------

    initAppMode: function () {
        APPMODE == "FREE" ? this.initFreeMode() : this.initProMode();
        // also if not web version, for now hide the full screen button
        if (type != "web") {
            this.$el.fs_toggle.hide();
            this.$el.web_home.hide();
        } else {
            this.$el.web_home.show();
        }
    },

    initFreeMode: function () {

        var self = this; // save reference

        this.$el.pro_label
            .text( "PRO" )
            .addClass( "label label-primary" );

        // init the popups
        this.$el.pro_label
            .popover( {
                container: "body",
                title: "Get PRO App",
                content: "You can specify a custom time for your own course in PRO App",
                html: true,
                trigger: "manual",
                placement: "auto"
            } );

        this.$el.pro_label.hover( function () {
            $( this ).popover( "show" );
        }, function () {
            $( this ).popover( "hide" );
        } );

        // also init the popover on the prepare & launch button
        this.$el.prepare_lesson
            .popover( {
                container: "body",
                title: "Get PRO Version",
                // content: "<div>You can specify a custom time for your own course in PRO version.<div class='text-center'><button class='btn btn-primary'>Download</button></div></div>",
                content: self.getProModeInfo(),
                html: true,
                trigger: "manual",
                placement: "auto"
            } );

        this.$el.body.click( function ( e ) {
            if ( e.target.id == "custom_lesson_launch" ) {
                e.preventDefault();
                return;
            }
            self.$el.prepare_lesson.popover( "hide" );
        } );

    },

    initProMode: function () {
        console.log( "Porumai! initing PRO mode" );
    },

    initHelpGuide: function () {

        var self = this; // save reference

        // init the helpguide modal
        this.$el.guide_modal.modal( {
            show: false
        } );

        // help guide
        this.$el.guide.click( function () {
            
            console.log( "will show help guide" );
            $.get("help.html", function (data) {
                // got the help data content
                self.$el.guide_content.html( data );
                // show the modal
                self.$el.guide_modal.modal("show");
            });
            
        } );

    },

    initializeEvents: function () {

        var self = this; // save reference

        console.log( "initing events ", this, this.$el.d_theme );

        // initialize layout change
        this.$el.kb_layout.on("change", function () {
            layout = $(this).val();
            console.log("porumai! layout changed - ", layout);
            // show lessons for the new layout
            self.initLayoutLessons();
        });

        this.initHelpGuide();

        // day theme setting
        this.$el.d_theme.click( function () {
            console.log( "setting day theme" );
            self.set_day_theme();
        } );

        // night theme setting
        this.$el.n_theme.click( function () {
            console.log( "setting night theme" );
            self.set_night_theme();
        } );

        // set the night theme manually for the first time
        self.set_night_theme();

        // go to course home
        this.$el.c_home.click( function () {
            console.log( "clicking course home" );
            reset();
            curr_course.clean_window();

            self.$el.c_win.hide();
            self.$el.c_tab.show();

            self.cancelFullScreen();
        } );

        this.initLessons();

        // pause
        this.$el.pause_button.click( function () {
            // TODO: check where this is coming from
            Timer.pauseTimer();
        } );

        // redo
        this.$el.redo_course.click( function () {
            curr_course.redo();
        } );

        // abort
        this.$el.abort.click( function () {
            curr_course.end_course();
            curr_course.clean_window();

            self.$el.c_win.hide();
            self.$el.c_tab.show();

            self.cancelFullScreen();
        } );

        this.$el.fs_toggle.click( function () {
            if ( self.isFullScreen() ) {
                self.cancelFullScreen();
            } else {
                self.requestFullScreen();
            }
        } );

        this.initCustomLesson();

        this.initKeyPressEvents();

        this.initKeyDownEvents();

        window.onload = window.onresize = function () {
            Canvas.init_canvas();
            Canvas.redraw_canvas();
            Canvas.redraw_fingers();

            var $fs_icon = self.$el.fs_toggle.children( "i" );

            // change fullscreen button icon
            if ( self.isFullScreen() ) {
                $fs_icon
                    .removeClass( "glyphicon-resize-full" )
                    .addClass( "glyphicon-resize-small" );
            } else {
                $fs_icon
                    .removeClass( "glyphicon-resize-small" )
                    .addClass( "glyphicon-resize-full" );
            }

        };

    },

    initLessons: function () {

        var self = this;

        this.$el.lesson_details.on("click", ".launch-course", function () {

            // change the keyboard layout
            self.initKeyboardLayouts();

            console.log( $.parseJSON( $(this).data("hc-course") ) );
            var course_details = $.parseJSON( $(this).data("hc-course") );
            curr_course = new Course();
            curr_course.init( course_details );
            self.$el.c_tab.hide();
            self.$el.c_win.fadeIn();
            self.requestFullScreen();
        });

        return;

    },

    initCustomLesson: function () {

        var self = this;

        this.$el.custom_lesson.keyup( function () {

            var CLI_LENGTH = $( this ).val().trim().length;

            if ( CLI_LENGTH > 0 ) {
                self.$el.no_input.hide();
                self.$el.clear_cli_input.show();
                // remove the red border warning
                self.$el.cli.removeClass( "no-input" );
            } else {
                self.$el.no_input.show();
                self.$el.clear_cli_input.hide();
            }
            self.$el.char_length.html( CLI_LENGTH );
        } );

        this.$el.prepare_lesson.click( function () {

            if ( self.$el.custom_lesson.val().trim().length == 0 ) {
                self.$el.no_input.show();
                self.$el.clear_cli_input.hide();
                // add the red border warning
                self.$el.cli.addClass( "no-input" );
            } else {
                // remove the red border warning
                self.$el.cli.removeClass( "no-input" );
                // before launching the custom lesson check if custom time is allowed
                if ( !self.isProModeAllowed() ) {
                    console.log( "PORUMAI! APP IS IN FREE MODE" );
                    // show the popover
                    $( this ).popover( "show" );
                    // DO NOT PROCEED   
                    return;
                }

                //there is an input; prepare custom lesson
                curr_course = new Course();
                curr_course.init( 0 );
                self.$el.c_tab.hide();
                self.$el.c_win.fadeIn();
            }

        } );

        this.$el.custom_duration.on( "change", function () {
            var cd = parseInt( $( this ).val(), 10 );
            self.$el.cd_ph.text( cd );

            var base_chars = 125,
                easy_chars = cd * base_chars,
                medium_chars = cd * 2 * base_chars;

            self.$el.cd_easy_ph.text( easy_chars );
            self.$el.cd_medium_ph.text( easy_chars + " - " + medium_chars );
            self.$el.cd_hard_ph.text( medium_chars );
        } );

        // clearing the input box
        this.$el.clear_cli_input.on( "click", function () {
            console.log( "Porumai! will clear the custom input" );
            self.$el.cli.val( "" );
            // trigger a keyup
            self.$el.cli.trigger( "keyup" );
        } );

    },

    initKeyPressEvents: function () {

        var self = this;

        $( document )
            .keypress( function ( e ) {

                if ( course_init ) {

                    if ( !course_started ) {

                        if ( e.which == 32 ) {

                            key_interval = 0;
                            course_started = true;

                            Timer.startTimer();

                            if ( course_first_time ) {

                                self.$el.abort.show();
                                self.$el.pause_button.show();
                                self.$el.space_to_start.hide();
                                self.$el.resume_button.hide();
                                self.$el.c_label.show();
                                course_first_time = false;
                                self.$el.space.removeClass( 'space_start' );
                            }

                        }

                    } else {
                        key_interval = 0;
                        curr_course.manage_screen( e.which );
                        hits++;
                    }

                }

            } );

    },

    initKeyDownEvents: function () {

        $( document )
            .keydown( function ( e ) {

                var is_firefox = navigator.userAgent.toLowerCase().indexOf( 'firefox' ) > -1;

                if ( is_firefox && course_started ) {

                    //firefox has a quick find; let us disable that to prevent key mismatch and accidental window resize

                    switch ( e.which ) {

                        case 222:
                        case 191:
                            e.preventDefault();
                            break;

                    }

                }

                if ( e.ctrlKey ) {

                    switch ( e.which ) {

                        case 13:
                        case 79:
                        case 84:
                        case 85:
                        case 83:
                        case 87:
                        case 80:
                        case 78:
                        case 68:
                        case 116:
                        case 70:
                        case 71:
                        case 104:
                        case 72:
                        case 106:
                        case 74:
                        case 69:
                        case 75:
                        case 76:
                            e.preventDefault();
                            break;

                        default:
                            break;

                    }

                }

            } );

    },

    set_day_theme: function () {

        current = "day";

        $( "body" )
            .css( {
                "background-color": day.body_bg,
                "color": Theme[ current ].body_text_color
            } )
            .removeClass( "night-theme" )
            .addClass( "day-theme" );

        this.$el.themes
            .removeClass( "current-theme" );

        this.$el.d_theme
            .addClass( "current-theme" );

        this.$el.c_win.css( {
            'background-color': day.body_bg
        } );
        this.$el.s_block.css( {
            "background-color": day.saved_block
        } );
        this.$el.cli.css( {
            "background-color": day.body_bg,
            "color": day.text_color
        } );

        this.$el.course_time.css( "color", day.text_color );
        this.$el.lv.css( "color", day.text_color );

        canvas_normal_line = day.canvas_normal_line;
        canvas_ref_line = Theme[ current ].canvas_ref_line;

        this.$el.canvas_a.css( "border-color", day.canvas_border );
        this.$el.canvas_b.css( "border-color", day.canvas_border );

        this.$el.c_section.css( "border-color", day.canvas_border );

        this.$el.nav_bar.removeClass( "navbar-inverse" );

        Canvas.clear_canvas_a();

    },

    set_night_theme: function () {

        current = "night";

        $( "body" )
            .css( {
                "background-color": night.body_bg,
                "color": Theme[ current ].body_text_color
            } )
            .removeClass( "day-theme" )
            .addClass( "night-theme" );

        this.$el.themes
            .removeClass( "current-theme" );

        this.$el.n_theme
            .addClass( "current-theme" );

        this.$el.c_win.css( {
            'background-color': night.body_bg
        } );
        this.$el.s_block.css( {
            "background-color": night.saved_block
        } );
        this.$el.cli.css( {
            "background-color": night.body_bg,
            "color": night.text_color
        } );

        this.$el.course_time.css( "color", night.text_color );
        this.$el.lv.css( "color", night.text_color );

        canvas_normal_line = night.canvas_normal_line;
        canvas_ref_line = Theme[ current ].canvas_ref_line;

        this.$el.canvas_a.css( "border-color", night.canvas_border );
        this.$el.canvas_b.css( "border-color", night.canvas_border );

        this.$el.c_section.css( "border-color", night.canvas_border );

        this.$el.nav_bar.addClass( "navbar-inverse" );

        Canvas.clear_canvas_a();

    }

};

// window.APP = APP;
// window.Hotcold = Hotcold;

// start the APP on doc ready
APP.start();
