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
            '<div id="vida-svg-wrapper" style="z-index: 1; position:absolute;"></div>' +
            '<div id="vida-svg-overlay" style="z-index: 1; position:absolute;"></div>');

        function resizeComponents()
        {
            $("#vida-svg-wrapper").height(options.parentSelector.height() - $(".vida-page-controls").outerHeight());
            $("#vida-svg-wrapper").offset({'top': $(".vida-page-controls").outerHeight()});
            $("#vida-svg-wrapper").width(options.parentSelector.width());
            $("#vida-svg-overlay").width(options.parentSelector.width());
            $("#vida-svg-overlay").height($("#vida-svg-wrapper").height());
            $("#vida-svg-overlay").offset($("#vida-svg-wrapper").offset());
        }

        function reloadOptions()
        {
            settings.pageHeight = Math.max($("#vida-svg-wrapper").height() * (100 / settings.scale) - settings.border, 100); // minimal value required by Verovio
            settings.pageWidth = Math.max($("#vida-svg-wrapper").width() * (100 / settings.scale) - settings.border, 100); // idem     
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
            if(newData) settings.mei = newData;
            if(!settings.mei) return;
            $("#vida-svg-wrapper").prepend('<div class="vida-loading-popup">Loading...</div>');
            $("#vida-svg-wrapper").height(options.parentSelector.height() - $(".vida-page-controls").outerHeight());
            $("#vida-svg-wrapper").offset({'top': $(".vida-page-controls").outerHeight()});
            $("#vida-svg-wrapper").width(options.parentSelector.width() * 0.95);
            reloadOptions();

            if (newData)
            {
                // $.get( "vida.js/Guami_Canzona_24.mei" , function( dataIn ) {
                //     data = dataIn;
                //     vrvToolkit.loadData(data);
                //     load_page(true);
                //     checkNavIcons();   
                //     create_overlay( 0 );  
                //     meiEditor.events.publish("VerovioUpdated");
                // }); 
                vrvToolkit.loadData(newData);
            }
            else
            {
                vrvToolkit.redoLayout();
            }

            checkNavIcons();
            localMei = vrvToolkit.getMEI();
            mei.Events.publish("VerovioUpdated", [localMei]);
            load_page( true );
            $(".vida-loading-popup").remove();
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
            var curMid = $("#vida-svg-wrapper").scrollTop() + $("#vida-svg-wrapper").height() / 2;
            
            if($("#vida-svg-wrapper").height() == $("#vida-svg-wrapper").scrollTop() + $("#vida-svg-wrapper").height())
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
        var drag_start;
        var dragging;
        var last_note = ["", 0]
        var mute = false;
        var editorActive = false;

        function highlight_id( div, id ) {
            $("#" + div + " * #" + id ).css({
                "fill": "#ff0000",
                "stroke": "#ff0000",
                "fill-opacity": "1.0",
                "stroke-opacity": "1.0"
                });
        }

        function editSet( attr, value ) {
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

        function reset_overlay( ) {
            $("#vida-svg-overlay").html("");
        };

        function reload_page( id ) {
            vrvToolkit.redoLayout();
            localMei = vrvToolkit.getMEI();
            mei.Events.publish('VerovioUpdated', [localMei]);
            load_page( true );
        }

        function load_page( init_overlay ) 
        {
            settings.totalPages = vrvToolkit.getPageCount();
            $("#vida-svg-wrapper").html("");
            $("#vida-svg-overlay").html("");
            // for(var idx = 1; idx < settings.totalPages + 1; idx++)
            for(var idx = 1; idx < 2; idx++)
            {
                $("#vida-svg-wrapper").append(vrvToolkit.renderPage(idx, ""));
                settings.pageTopOffsets[idx] = $($(".system")[idx - 1]).offset().top - $("#vida-svg-wrapper").offset().top - settings.border;
            }
            if ( init_overlay ) {
                create_overlay( 0 );   
            }
        };

        var mouseDownListener = function(e)
        {
            var t = e.target;
            id = t.parentNode.attributes["id"].value;
            if (id != drag_id[0]) drag_id.unshift( id ); // make sure we don't add it twice
            //hide_id( "svg_output", drag_id[0] );
            highlight_id( "vida-svg-overlay", drag_id[0] );
            drag_start = {"x": parseInt(t.getAttribute("x")), "initY": e.pageY, "svgY": parseInt(t.getAttribute("y")), "pixPerPix": parseInt(t.getAttribute("y")) / (e.pageY - $($("svg")[0]).offset().top)};
            // we haven't started to drag yet, this might be just a selection
            dragging = false;
            $(document).on("mousemove", mouseMoveListener);
            $(document).on("mouseup", mouseUpListener);
        };

        var mouseMoveListener = function(e)
        {
            var scaledY = drag_start.svgY + (e.pageY - drag_start.initY) * drag_start.pixPerPix;
            e.target.parentNode.setAttribute("transform", "translate(" + [0 , scaledY] + ")");
            $(e.target).parent().css({
                "fill-opacity": "0.0",
                "stroke-opacity": "0.0"
            });
            // we use this to distinct from click (selection)
            dragging = true;
            editorAction = JSON.stringify({ action: 'drag', param: { elementId: drag_id[0], 
                            x: parseInt(drag_start.x),
                            y: parseInt(scaledY) }   
            });
            // do something with the error...
            var res = vrvToolkit.edit( editorAction );
            load_page( false );
            highlight_id( "vida-svg-wrapper", drag_id[0] );  
        };

        var mouseUpListener = function()
        {
            $(document).unbind("mousemove", mouseMoveListener);
            $(document).unbind("mouseup", mouseUpListener);
            if (dragging) {
                delete this.__origin__; 
                reset_overlay();
                reload_page( drag_id[0] );
                dragging = false; 
                drag_id.length = 0;
            }
        };

        function create_overlay( id ) {
            $("#vida-svg-overlay").html( $("#vida-svg-wrapper").html() );
            overlay_svg = d3.select("#vida-svg-overlay").select("svg");

            d3.select("#vida-svg-overlay").selectAll("g, path");//.style("stroke-opacity", "0.0").style("fill-opacity", "0.0");
            d3.select("#vida-svg-overlay").selectAll("text").remove();

            $("#vida-svg-overlay * .note").on('mousedown', mouseDownListener);
            d3.select("#vida-svg-overlay").select("defs").append("filter").attr("id", "selector");
            resizeComponents();
        }

        var scrollToPage = function(pageNumber)
        {
            $("#vida-svg-wrapper").unbind('scroll', updateCurrentPage);
            $("#vida-svg-wrapper").scrollTop(settings.pageTopOffsets[pageNumber] + 1);
            $("#vida-svg-wrapper").on('scroll', updateCurrentPage);
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
            $("#vida-svg-wrapper").html("<h4>Load a file into Verovio!</h4>");
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

        $("#vida-svg-wrapper").on('scroll', updateCurrentPage);

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
            //resizeComponents();
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