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
            systemData: [], //idx: {'topOffset': offset, 'id'': id}
            pageHeight: 100,
            pageWidth: 100,
            scale: 40,
            svg: "",
            totalPages: 0,
            verovioWorker: new Worker("vida.js/verovioWorker.js")
        };

        var parser = new DOMParser();

        this.getSVG = function()
        {
            return settings.svg;
        };

        this.getMei = function()
        {
            return settings.mei;
        };

        reloadMEI = function()
        {
            settings.verovioWorker.postMessage(['mei']);
        };

        $.extend(settings, options);

        settings.verovioWorker.onmessage = function(event){
            switch (event.data[0]){
                case "meconium":
                    $("#vida-svg-wrapper").html(event.data[1]);
                    settings.svg = event.data[1];

                    var vidaOffset = $("#vida-svg-wrapper").offset().top;
                    var systems = document.getElementsByClassName("system");

                    for(var idx = 0; idx < systems.length; idx++)
                    {
                        var thisID = systems[idx].id;
                        settings.systemData[idx] = {
                            'topOffset': systems[idx].getBoundingClientRect().top - vidaOffset - settings.border,
                            'id': thisID
                        };
                        //console.log(settings.systemData[idx].topOffset);
                    }

                    create_overlay( 0 );  
                    $(".vida-loading-popup").remove();
                    break;

                case "renderedPage":
                    //console.log("Rendered page", event.data[1], "internally.");
                    break;

                case "returnPage":
                    var this_page = event.data[1];
                    var this_svg = event.data[2];

                    var sysID = settings.systemData[this_page].id;
                    var thisSys = document.getElementById(sysID);
                    var parent = thisSys.parentNode;
                    var parsedDoc = parser.parseFromString(this_svg, "text/xml");
                    //replace the fulL SVG
                    document.getElementById("vida-svg-wrapper").replaceChild(parsedDoc.firstChild, thisSys.parentNode.parentNode.parentNode);

                    settings.svg = $("#vida-svg-wrapper").html();

                    if(event.data[3]) create_overlay( 0 );

                    break;

                case "returnPageCount":
                    settings.totalPages = event.data[1];
                    break;

                case "mei":
                    settings.mei = event.data[1];
                    mei.Events.publish("VerovioUpdated", [settings.mei]);
                    break;

                default:
                    console.log(event.data[0], event.data[1]);
                    break;
            }
        };

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
            '<div id="vida-svg-wrapper" class="vida-svg-object" style="z-index: 1; position:absolute;"></div>' +
            '<div id="vida-svg-overlay" class="vida-svg-object" style="z-index: 1; position:absolute;"></div>');

        function resizeComponents()
        {
            $("#vida-svg-wrapper").height(options.parentSelector.height() - $(".vida-page-controls").outerHeight());
            $("#vida-svg-overlay").height($("#vida-svg-wrapper").height());

            $("#vida-svg-wrapper").offset({'top': $(".vida-page-controls").outerHeight()});
            $("#vida-svg-overlay").offset($("#vida-svg-wrapper").offset());

            $("#vida-svg-wrapper").width(options.parentSelector.width());
            $("#vida-svg-overlay").width(options.parentSelector.width());
        }

        function reloadOptions()
        {
            settings.pageHeight = Math.max($("#vida-svg-wrapper").height() * (100 / settings.scale) - settings.border, 100); // minimal value required by Verovio
            settings.pageWidth = Math.max($("#vida-svg-wrapper").width() * (100 / settings.scale) - settings.border, 100); // idem     
            settings.verovioWorker.postMessage(['setOptions', JSON.stringify({
                pageHeight: settings.pageHeight,
                pageWidth: settings.pageWidth,
                inputFormat: 'mei',
                scale: settings.scale,
                adjustPageHeight: 1,
                noLayout: settings.horizontallyOriented,
                ignoreLayout: settings.ignoreLayout,
                border: settings.border
            })]);
        }

        function refreshVerovio(newData)
        {
            if(newData) settings.mei = newData;
            if(!settings.mei) return;
            console.log("called with data");
            $("#vida-svg-wrapper").prepend('<div class="vida-loading-popup">Loading...</div>');
            $("#vida-svg-wrapper").height(options.parentSelector.height() - $(".vida-page-controls").outerHeight());
            $("#vida-svg-wrapper").offset({'top': $(".vida-page-controls").outerHeight()});
            $("#vida-svg-wrapper").width(options.parentSelector.width() * 0.95);
            reloadOptions();

            if (newData)
            {
                settings.verovioWorker.postMessage(['loadData', newData + "\n"]); 
            }
            else
            {
                settings.verovioWorker.postMessage(['redoLayout']);
            }

            checkNavIcons();
            reloadMEI();
//            load_document( true );
        }

        this.changeMusic = function(newData)
        {
            refreshVerovio(newData);
        };

        this.reloadPanel = function()
        {            
            reloadOptions();
            refreshVerovio();
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
            settings.verovioWorker.postMessage(['edit', editorAction]);
        };

        this.toggleGrid = function()
        {
            /*settings.pageHeight = settings.pageHeight / 2;
            settings.pageWidth = settings.pageWidth / 2;() {
            //     $('#top').scrollTop($(this).scrollTop());
            // });
            settings.scale = settings.scale / 2;
            reloadOptions();
            refreshVerovio();*/
        };

        var updateCurrentPage = function(e)
        {        
            var objArr = $(".vida-svg-object");

            for(var cnt = 0; cnt < objArr.length; cnt++)
            {
                if (objArr[cnt].id != e.target.id)
                {
                    $(objArr[cnt]).scrollTop($(e.target).scrollTop());
                }
            }

            var curPage = settings.systemData.length;
            var curMid = $("#vida-svg-wrapper").scrollTop() + $("#vida-svg-wrapper").height() / 2;
            
            while(curPage--)
            {
                var thisPage = settings.systemData[curPage];
                if(curMid > thisPage.topOffset)
                {
                    //there's a bit at the top
                    settings.currentPage = curPage;
                    break;
                }
            }

            checkNavIcons();
        };

        var drag_id = [];
        var drag_start;
        var dragging;
        var last_note = ["", 0];
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
            if (drag_id.length === 0) {
                return;
            }
            editorAction = JSON.stringify({ action: 'set', param: { elementId: drag_id[0],
                attrType: attr, attrValue: value }   
            });
            var res = this.edit( editorAction );
            reload_page( drag_id[0] );  
        }

        function editInsert( elementType ) {
            if ((drag_id.length < 2) || (drag_id[0] == drag_id[1]) ) {
                console.log("Select two (different) notes!");
                return;
            }
            editorAction = JSON.stringify({ action: 'insert', param: { elementType: elementType,
                startid: drag_id[1], endid: drag_id[0] }   
            });
            var res = this.edit( editorAction );
            reload_page( drag_id[0] );  
        }

        function reset_overlay( ) {
            $("#vida-svg-overlay").html("");
        }

        function reload_page( id ) {
            //settings.verovioWorker.postMessage(['redoLayout']);
            reloadMEI();
            settings.verovioWorker.postMessage(['renderPage', settings.currentPage, true]);
        }

        function load_document( init_overlay )
        {
            $("#vida-svg-wrapper").html("");
            $("#vida-svg-overlay").html("");
            for(var idx = 0; idx < settings.totalPages; idx++)
            {
                $("#vida-svg-wrapper").append(vrvToolkit.renderPage(idx + 1, ""));
                var thisID = $(".system")[idx].id;
                settings.systemData[idx] = {
                    'topOffset': $($(".system")[idx]).offset().top - $("#vida-svg-wrapper").offset().top - settings.border,
                    'id': thisID
                };
                //console.log(settings.systemData[idx].topOffset);
            }
            settings.svg = $("#vida-svg-wrapper").html();
            if ( init_overlay ) {
                create_overlay( 0 );   
            }
        }

        // function load_page( idx, init_overlay ) 
        // {
        //     var temp_svg = vrvToolkit.renderPage(idx + 1, "");

        //     var sysID = settings.systemData[settings.currentPage].id;
        //     var thisSys = document.getElementById(sysID);
        //     var parent = thisSys.parentNode;
        //     var parsedDoc = parser.parseFromString(temp_svg, "text/xml");
        //     //replace the fulL SVG
        //     document.getElementById("vida-svg-wrapper").replaceChild(parsedDoc.firstChild, thisSys.parentNode.parentNode.parentNode);

        //     settings.svg = $("#vida-svg-wrapper").html();
        //     if ( init_overlay ) {
        //         create_overlay( 0 );   
        //     }
        // }

        var mouseDownListener = function(e)
        {
            var idx;
            var t = e.target;
            var id = t.parentNode.attributes.id.value;
            var sysID = t.closest('.system').attributes.id.value;
            for(idx = 0; idx < settings.systemData.length; idx++)
            {
                if(settings.systemData[idx].id == sysID)
                {
                    settings.currentPage = idx;
                    break;
                }
            }

            if (idx == settings.systemData.length) console.log("whoops");

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
            //var res = 
            settings.verovioWorker.postMessage(['edit', editorAction, settings.currentPage, false]); 
            //load_page( settings.currentPage, false );
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
            overlay_svg = $("#vida-svg-overlay > svg");

            var gElems = document.querySelectorAll("#vida-svg-overlay * g");
            var pathElems = document.querySelectorAll("#vida-svg-overlay * path");
            var idx;

            for (idx = 0; idx < gElems.length; idx++)
            {
                gElems[idx].style.strokeOpacity = 0.0;
                gElems[idx].style.fillOpacity = 0.0;
            }
            for (idx = 0; idx < pathElems.length; idx++)
            {
                pathElems[idx].style.strokeOpacity = 0.0;
                pathElems[idx].style.fillOpacity = 0.0;
            }

            $("#vida-svg-overlay * text").remove();

            $("#vida-svg-overlay * .note").on('mousedown', mouseDownListener);
            $("#vida-svg-overlay * defs").append("filter").attr("id", "selector");
            resizeComponents();
        }

        var scrollToPage = function(pageNumber)
        {
            $("#vida-svg-wrapper").unbind('scroll', updateCurrentPage);
            $("#vida-svg-wrapper").scrollTop(settings.systemData[pageNumber].topOffset + 1);
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

        $(".vida-svg-object").on('scroll', updateCurrentPage);

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