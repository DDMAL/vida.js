var vrvToolkit;

(function ($)
{
    var vida = function(element, options)
    {
        self = this;
        var settings = {
            border: 50,
            currentPage: 0,
            fileOnLoad: "",         //load a file in by default
            fileOnLoadIsURL: false, //whether said file is a URL or is already-loaded data
            horizontallyOriented: 0,//1 or 0 (NOT boolean, but mimicing it) for whether the page will display horizontally or vertically
            ignoreLayout: 1,
            mei: "",
            pageHeight: 100,
            pageTopOffsets: [],
            pageWidth: 100,
            scale: 40,
            svg: "",
            totalPages: 0,
        };

        this.getSVG = function()
        {
            return settings.svg;
        };

        $.extend(settings, options);

        /*settings.verovioWorker.onmessage = function(event){
            switch (event.data[0]){
                case "returnData":
                    //event.data[1] is all the SVG data, event.data[2] is the total number of pages
                    settings.totalPages = event.data[2];
                    settings.currentPage = 0;
                    $("#vida-body").html("");
                    $("#vida-body").append("<div id='vida-svg-wrapper'>" + event.data[1] + "</div>");            

                    //create the array of pageTopOffsets after everything's loaded into the DOM
                    var curSystem = $(".system").length;
                    while(curSystem--)
                    {
                        settings.pageTopOffsets[curSystem] = $($(".system")[curSystem]).offset().top - $("#vida-body").offset().top - settings.border;
                    }
                    checkNavIcons();

                    break;

                case "mei":
                    settings.mei = event.data[1];
                    refreshVerovio();
                    break;

                default:
                    console.log(event.data[1]);
                    break;
            }
        };*/

        $(element).append(
            '<div class="vida-page-controls">' +
                '<div class="vida-prev-page vida-direction-control"></div>' +
                '<div class="vida-zoom-controls">' +
                    '<span class="vida-zoom-in"></span>' +
                    '<span class="vida-zoom-out"></span>' +
                '</div>' +
                //'<div class="vida-grid-toggle">Toggle to grid</div>' +
                '<div class="vida-orientation-toggle">Toggle orientation</div>' +
                '<div class="vida-next-page vida-direction-control"></div>' +
            '</div>' +
            '<div id="vida-body"></div>');

        function resizeComponents()
        {
            $("#vida-body").height(options.parentSelector.height() - $(".vida-page-controls").outerHeight());
            $("#vida-body").offset({'top': $(".vida-page-controls").outerHeight()});
            $("#vida-body").width(options.parentSelector.width() * 0.95);
            $("#vida-body").css('margin-left', options.parentSelector.width() * 0.025);
            reloadOptions();
            //self.reloadPanel();
        }

        function reloadOptions()
        {
            settings.pageHeight = Math.max($("#vida-body").height() * (100 / settings.scale) - settings.border, 100); // minimal value required by Verovio
            settings.pageWidth = Math.max($("#vida-body").width() * (100 / settings.scale) - settings.border, 100); // idem     
            vrvToolkit.setOptions(JSON.stringify({
                pageHeight: settings.pageHeight,
                pageWidth: settings.pageWidth,
                inputFormat: 'mei',
                scale: settings.scale,
                adjustPageHeight: 1,
                noLayout: settings.horizontallyOriented,
                ignoreLayout: settings.ignoreLayout,
                border: settings.border
            }));
        }

        function refreshVerovio(newData)
        {
            settings.mei = newData;
            $("#vida-body").prepend('<div class="vida-loading-popup">Loading...</div>');
            $("#vida-body").height(options.parentSelector.height() - $(".vida-page-controls").outerHeight());
            $("#vida-body").offset({'top': $(".vida-page-controls").outerHeight()});
            $("#vida-body").width(options.parentSelector.width() * 0.95);
            reloadOptions();
            if (newData)
            {
                $.get( "vida.js/Guami_Canzona_24.mei" , function( dataIn ) {
                    data = dataIn;
                    vrvToolkit.loadData(data);
                    load_page(true);
                    checkNavIcons();   
                    create_overlay( 0 );  
                    meiEditor.events.publish("VerovioUpdated");
                }); 
                // vrvToolkit.loadData(newData);
                // settings.totalPages = vrvToolkit.getPageCount();
                // $("#vida-body").html("<div id='vida-svg-wrapper'></div>");    
                // for(var idx = 1; idx < settings.totalPages + 1; idx++)
                // {
                //     $("#vida-svg-wrapper").append(vrvToolkit.renderPage(idx, ""));
                //     settings.pageTopOffsets[idx] = $($(".system")[idx - 1]).offset().top - $("#vida-body").offset().top - settings.border;
                // }
                // checkNavIcons();   

            }
            else
            {
                vrvToolkit.redoLayout();
            }
        }


        this.getMei = function()
        {
            return settings.mei;
        };

        this.changeMusic = function(newData)
        {
            refreshVerovio(newData);
        };

        this.reloadPanel = function()
        {            
            reloadOptions();
            refreshVerovio();
            //vrvToolkit.redoLayout();
        };

        this.toggleOrientation = function()
        {
            if(settings.horizontallyOriented === 1)
            {
                settings.horizontallyOriented = 0;
                $('.vida-direction-control').show();
            }
            else
            {
                settings.horizontallyOriented = 1;
                $('.vida-direction-control').hide();
            }

            refreshVerovio();
        };

        this.edit = function(editorAction)
        {
            vrvToolkit.edit(editorAction);
        };

        this.toggleGrid = function()
        {
            /*settings.pageHeight = settings.pageHeight / 2;
            settings.pageWidth = settings.pageWidth / 2;
            settings.scale = settings.scale / 2;
            reloadOptions();
            refreshVerovio();*/
            
        };

        var updateCurrentPage = function(e)
        {
            var curPage = settings.pageTopOffsets.length;
            var curMid = $("#vida-body").scrollTop() + $("#vida-body").height() / 2;
            
            if($("#vida-svg-wrapper").height() == $("#vida-body").scrollTop() + $("#vida-body").height())
            {
                settings.currentPage = settings.totalPages - 1;
            }
            else
            {
                while(curPage--)
                {
                    var pageTop = settings.pageTopOffsets[curPage];
                    if(curMid > pageTop)
                    {
                        //there's a bit at the top
                        settings.currentPage = curPage;
                        break;
                    }
                }
            }
            checkNavIcons();
        };


        var drag_id = new Array();

        function highlight_id( div, id ) {
            d3.select( "#" + div ).select( "#" + id ).style("fill", "#ff0000").style("stroke", "#ff0000").style("fill-opacity", "1.0")
            .style("stroke-opacity", "1.0"); // .attr("filter", "url(#selector)");
        }

        function editSet( attr, value ) {
            console.log("setting", attr, "to", value);
            if (drag_id.length == 0) {
                return;
            }
            editorAction = JSON.stringify({ action: 'set', param: { elementId: drag_id[0],
                attrType: attr, attrValue: value }   
            });
            var res = vrvToolkit.edit( editorAction );
            reload_page( drag_id[0] );  
        };

        function editInsert( elementType ) {
            if ((drag_id.length < 2) || (drag_id[0] == drag_id[1]) ) {
                console.log("Select two (different) notes!")
                return;
            }
            editorAction = JSON.stringify({ action: 'insert', param: { elementType: elementType,
                startid: drag_id[1], endid: drag_id[0] }   
            });
            var res = vrvToolkit.edit( editorAction );
            reload_page( drag_id[0] );  
        };

        var drag_overlay = d3.behavior.drag().origin(function() { 
            var t = d3.select(this);
            id = d3.select(this).attr("id");
            if (id != drag_id[0]) drag_id.unshift( id ); // make sure we don't add it twice
            //hide_id( "svg_output", drag_id[0] );
            highlight_id( "vida-svg-wrapper", drag_id[0] );
            drag_start = d3.mouse(this);
            console.log("start: ", drag_start);
            // we haven't started to drag yet, this might be just a selection
            dragging = false;
            //play_note( drag_id[0], false );
            $('.ct-menu-n1').hide();
            // console.log(t, t[0]);
            // retVal = { x: t[0].childNodes[1].getAttribute('x'), y: t[0].childNodes[1].getAttribute('y')};
            retVal = { x: drag_start[0], y: drag_start[1]};
            console.log(retVal);
            return retVal;
        })
        .on("drag", function(d,i) {
            console.log("on drag:", d, i, d3.event.y);
            d3.select(this).attr("transform", function(d,i) {
                return "translate(" + [ 0 ,d3.event.y ] + ")"
            });//.style("fill-opacity", "0.0").style("stroke-opacity", "0.0");
            this.__origin__ = [ d3.event.x,  d3.event.y];
            // we use this to distinct from click (selection)
            dragging = true;
            editorAction = JSON.stringify({ action: 'drag', param: { elementId: drag_id[0], 
                            x: parseInt(drag_start[0] + this.__origin__[0]),
                            y: parseInt(drag_start[1] + this.__origin__[1]) }   
            });
            //play_note( drag_id[0], true );
            // do something with the error...
            var res = vrvToolkit.edit( editorAction );
            //console.log( vrvToolkit.getLog() );
            load_page( false );
            highlight_id( "vida-svg-wrapper", drag_id[0] );    
        })
        .on("dragend", function(d,i) {
            if (dragging) {
                delete this.__origin__; 
                reset_overlay();
                /*
                editorAction = JSON.stringify({
                            action: 'set',
                            param: { 
                                elementId: drag_id[0], 
                                attrType: "accid",
                                attrValue: "s" 
                            }   
                        });
                // do something with the error...
                var res = vrvToolkit.edit( editorAction );
                */
                console.log( drag_id[0] );
                reload_page( drag_id[0] );
                dragging = false; 
                drag_id.length = 0;
            }
        });

        function reset_overlay( ) {
            $("#vida-svg-wrapper").html("");
        };

        function reload_page( id ) {
            vrvToolkit.redoLayout();
            // var elementPage = vrvToolkit.getPageWithElement( id );
            // if (elementPage == 0) {
            //     console.log( "ID not found" );
            //     return;
            // }
            // if (elementPage != page) {
            //     page = elementPage;
            // }
            localMei = vrvToolkit.getMEI();
            console.log(localMei);
            meiEditor.events.publish('VerovioUpdated', [localMei]);
            load_page( true );
        }

        function load_page( init_overlay ) 
        {
            settings.totalPages = vrvToolkit.getPageCount();
            $("#vida-body").html("");
            $("#vida-body").append("<div id='vida-svg-wrapper'></div>");    
            // for(var idx = 1; idx < settings.totalPages + 1; idx++)
            for(var idx = 1; idx < 2; idx++)
            {
                $("#vida-svg-wrapper").append(vrvToolkit.renderPage(idx, ""));
                settings.pageTopOffsets[idx] = $($(".system")[idx - 1]).offset().top - $("#vida-body").offset().top - settings.border;
            }
            if ( init_overlay ) {
                create_overlay( 0 );   
            }
        };

        function create_overlay( id ) {
            console.log("Creating overlay");
            $("#vida-svg-wrapper").html( $("#vida-svg-wrapper").html() );
            overlay_svg = d3.select("#vida-svg-wrapper").select("svg");
            /*
            var element = overlay_svg.select("#" + id );
            element.selectAll("*:not(use)").remove()
            var str = new XMLSerializer().serializeToString( element.node() );
            d3.select("#vida-svg-wrapper").select(".page-margin").selectAll("*").remove();
            $("#vida-svg-wrapper .page-margin").html(str);
            */
            //d3.select("#vida-svg-wrapper").selectAll("g, path").style("stroke-opacity", "0.0").style("fill-opacity", "0.0");
            //d3.select("#vida-svg-wrapper").selectAll("text").remove();
            d3.select("#vida-svg-wrapper").select("svg").selectAll(".note").call(drag_overlay);
            d3.select("#vida-svg-wrapper").select("defs").append("filter").attr("id", "selector");

            //    .append("feMorphology").attr("operator", "dilate").attr("in", "SourceGraphic").attr("radius", 3);
            //.append("feGaussianBlur").attr("stdDeviation", 5);
        };

        var scrollToPage = function(pageNumber)
        {
            $("#vida-body").unbind('scroll', updateCurrentPage);
            $("#vida-body").scrollTop(settings.pageTopOffsets[pageNumber] + 1);
            $("#vida-body").on('scroll', updateCurrentPage);
            checkNavIcons();
        };

        //updates nav icon displays
        var checkNavIcons = function()
        {
            if(settings.currentPage === settings.totalPages - 1)
            {
                $(".vida-next-page").css('visibility', 'hidden');
            }
            else if($(".vida-next-page").css('visibility') == 'hidden')
            {
                $(".vida-next-page").css('visibility', 'visible');
            }            

            if(settings.currentPage === 0)
            {
                $(".vida-prev-page").css('visibility', 'hidden');
            }
            else if($(".vida-prev-page").css('visibility') == 'hidden')
            {
                $(".vida-prev-page").css('visibility', 'visible');
            }
        };

        var scrollToCurrentPage = function()
        {
            scrollToPage(settings.currentPage);
        };

        if(options.fileOnLoad && options.fileOnLoadIsURL)
        {
            $.get(options.fileOnLoad, function(data) 
            {
                refreshVerovio(data);
                resizeComponents();
            });
        }
        else if(options.fileOnLoad && !options.fileOnLoadIsURL)
        {
            refreshVerovio(options.fileOnLoad);
            resizeComponents();
        }
        else
        {
            $("#vida-body").html("<h4>Load a file into Verovio!</h4>");
        }

        $(".vida-orientation-toggle").on('click', this.toggleOrientation);

        $(".vida-grid-toggle").on('click', this.toggleGrid);

        $(".vida-next-page").on('click', function()
        {
            if (settings.currentPage < settings.totalPages - 1)
            {
                settings.currentPage += 1;
                scrollToCurrentPage();
            }
        });

        $(".vida-prev-page").on('click', function()
        {
            if (settings.currentPage > 0)
            {
                settings.currentPage -= 1;
                scrollToCurrentPage();
            }
        });

        $("#vida-body").on('scroll', updateCurrentPage);

        $(".vida-zoom-in").on('click', function()
        {
            if (settings.scale <= 100)
            {
                settings.scale += 10;
                refreshVerovio();
            }
            if(settings.scale == 100)
            {
                $(".vida-zoom-in").css('visibility', 'hidden');
            }
            else if($(".vida-zoom-out").css('visibility') == 'hidden')
            {
                $(".vida-zoom-out").css('visibility', 'visible');
            }
        });

        $(".vida-zoom-out").on('click', function()
        {
            if (settings.scale > 10)
            {
                settings.scale -= 10;
                refreshVerovio();
            }
            if(settings.scale == 10)
            {
                $(".vida-zoom-out").css('visibility', 'hidden');
            }
            else if($(".vida-zoom-in").css('visibility') == 'hidden')
            {
                $(".vida-zoom-in").css('visibility', 'visible');
            }
        });

        $(window).on('resize', function ()
        {
            resizeComponents();
            // Cancel any previously-set resize timeouts
            clearTimeout(settings.resizeTimer);

            settings.resizeTimer = setTimeout(function ()
            {
                refreshVerovio();
            }, 200);
        });
        resizeComponents();

    };

    $.fn.vida = function (options)
    {
        return this.each(function ()
        {
            var element = $(this);

            // Return early if this element already has a plugin instance
            if (element.data('vida'))
                return;

            // Save the reference to the container element
            options.parentSelector = element;

            // Otherwise, instantiate the document viewer
            var vidaObject = new vida(this, options);
            element.data('vida', vidaObject);
        });
    };

})(jQuery);