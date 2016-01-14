(function ($)
{
    var vida = function(element, options)
    {
        var settings = {
            border: 50,
            clickedPage: undefined,
            currentPage: 0,
            fileOnLoad: "",         //load a file in by default
            fileOnLoadIsURL: false, //whether said file is a URL or is already-loaded data
            horizontallyOriented: 0,//1 or 0 (NOT boolean, but mimicing it) for whether the page will display horizontally or vertically
            ignoreLayout: 1,
            mei: "",
            pageHeight: 100,
            pageTops: [],
            pageWidth: 100,
            scale: 40,
            svg: "",
            systemData: {}, //systemID: {'topOffset': offset, 'pageIdx'': pageidx}
            totalPages: 0,
            verovioWorker: new Worker(options.workerLocation)
        };

        var drag_id = [];
        var drag_start;
        var dragging;
        var last_note = ["", 0];
        var mute = false;
        var editorActive = false;
        var highlighted_cache = [];

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
                    $("#vida-svg-overlay").html(""); //clear this so all its systems disappear
                    $("#vida-svg-wrapper").html(event.data[1]);
                    settings.svg = event.data[1];

                    var vidaOffset = $("#vida-svg-wrapper").offset().top;
                    var pages = document.getElementById("vida-svg-wrapper").children;

                    for(var pIdx = 0; pIdx < pages.length; pIdx++)
                    {
                        settings.pageTops[pIdx] = pages[pIdx].getBoundingClientRect().top;
                        var systems = pages[pIdx].querySelectorAll('g[class=system]');
                        for(var sIdx = 0; sIdx < systems.length; sIdx++) 
                        {
                            settings.systemData[systems[sIdx].id] = {
                                'topOffset': systems[sIdx].getBoundingClientRect().top - vidaOffset - settings.border,
                                'pageIdx': pIdx
                            };   
                        }
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

                    var parsedDoc = parser.parseFromString(this_svg, "text/xml");
                    var thisChild = document.getElementById("vida-svg-wrapper").children[this_page];
                    document.getElementById("vida-svg-wrapper").replaceChild(parsedDoc.firstChild, thisChild);

                    settings.svg = $("#vida-svg-wrapper").html();

                    if(event.data[3]) create_overlay( 0 );
                    $(".vida-loading-popup").remove();
                    reapplyHighlights();
                    break;

                case "returnPageCount":
                    settings.totalPages = event.data[1];
                    break;

                case "mei":
                    settings.mei = event.data[1];
                    mei.Events.publish("VerovioUpdated", [settings.mei]);
                    break;

                default:
                    console.log("Message from Verovio of type", event.data[0]+":", event.data[1]);
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

        function initPopup(text)
        {
            settings.parentSelector.prepend('<div class="vida-loading-popup">' + text + '</div>');
            $(".vida-loading-popup").offset({
                'top': settings.parentSelector.offset().top + 50,
                'left': settings.parentSelector.offset().left + 30
            });
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
            $("#loadText").remove();
            initPopup("Loading...");
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
        }

        function reloadPage(pageIdx, initOverlay)
        {
            initPopup("Reloading...");
            reloadMEI();
            settings.verovioWorker.postMessage(['renderPage', pageIdx, initOverlay]);
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

        this.scrollToObject = function(id)
        {
            var parent = options.parentSelector[0];
            var index = $("#vida-svg-overlay " + id).closest('#vida-svg-overlay > svg').index("#vida-svg-overlay > svg")

            scrollToPage(index);
        };

        function newHighlight(div, id) 
        {
            for(var idx = 0; idx < highlighted_cache.length; idx++)
            {
                if(div == highlighted_cache[idx][0] && id == highlighted_cache[idx][1]) return;
            }
            highlighted_cache.push([div, id]);
            reapplyHighlights();
        }

        function reapplyHighlights()
        {
            for(var idx = 0; idx < highlighted_cache.length; idx++)
            {
                $("#" + highlighted_cache[idx][0] + " * #" + highlighted_cache[idx][1] ).css({
                    "fill": "#ff0000",
                    "stroke": "#ff0000",
                    "fill-opacity": "1.0",
                    "stroke-opacity": "1.0"
                });
            }
        }

        function removeHighlight(div, id)
        {
            for(var idx = 0; idx < highlighted_cache.length; idx++)
            {
                if(div == highlighted_cache[idx][0] && id == highlighted_cache[idx][1])
                {
                    var removed = highlighted_cache.splice(idx, 1);
                    var css = removed[0] == "vida-svg-wrapper" ?
                        {
                            "fill": "#000000",
                            "stroke": "#000000",
                            "fill-opacity": "1.0",
                            "stroke-opacity": "1.0"
                        } :
                        {
                            "fill": "#000000",
                            "stroke": "#000000",
                            "fill-opacity": "0.0",
                            "stroke-opacity": "0.0"
                        };
                    $("#" + removed[0] + " * #" + removed[1] ).css(css);
                    return;
                }
            }
        }

        function resetHighlights()
        {
            while(highlighted_cache[0])
            {
                removeHighlight(highlighted_cache[0][0], highlighted_cache[0][1]);
            }
        }

        var mouseDownListener = function(e)
        {
            var idx;
            var t = e.target, tx = parseInt(t.getAttribute("x"), 10), ty = parseInt(t.getAttribute("y"), 10);
            var id = t.parentNode.attributes.id.value;
            var sysID = t.closest('.system').attributes.id.value;
            var sysIDs = Object.keys(settings.systemData);

            for(idx = 0; idx < sysIDs.length; idx++)
            {
                var curID = sysIDs[idx];
                if(curID == sysID)
                {
                    settings.clickedPage = settings.systemData[curID].pageIdx;
                    break;
                }
            }

            if (id != drag_id[0]) drag_id.unshift( id ); // make sure we don't add it twice
            //hide_id( "svg_output", drag_id[0] );
            resetHighlights();
            newHighlight( "vida-svg-overlay", drag_id[0] );

            var viewBoxSVG = $(t).closest("svg");
            var parentSVG = viewBoxSVG.parent().closest("svg")[0];
            var actualSizeArr = viewBoxSVG[0].getAttribute("viewBox").split(" ");
            var actualHeight = parseInt(actualSizeArr[2]);
            var actualWidth = parseInt(actualSizeArr[3]);
            var svgHeight = parseInt(parentSVG.getAttribute('height'));
            var svgWidth = parseInt(parentSVG.getAttribute('width'));
            var pixPerPix = ((actualHeight / svgHeight) + (actualWidth / svgWidth)) / 2;

            drag_start = {
                "x": tx, 
                "initY": e.pageY, 
                "svgY": ty, 
                "pixPerPix": pixPerPix //ty / (e.pageY - $("#vida-svg-wrapper")[0].getBoundingClientRect().top)
            };
            // we haven't started to drag yet, this might be just a selection
            dragging = false;
            $(document).on("mousemove", mouseMoveListener);
            $(document).on("mouseup", mouseUpListener);
            $(document).on("touchmove", mouseMoveListener);
            $(document).on("touchend", mouseUpListener);
            mei.Events.publish("HighlightSelected", [id])
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

            settings.verovioWorker.postMessage(['edit', editorAction, settings.clickedPage, false]); 
            removeHighlight( "vida-svg-overlay", drag_id[0] );  
            newHighlight( "vida-svg-wrapper", drag_id[0] ); 
            e.preventDefault();
        };

        var mouseUpListener = function()
        {
            $(document).unbind("mousemove", mouseMoveListener);
            $(document).unbind("mouseup", mouseUpListener);
            $(document).unbind("touchmove", mouseMoveListener);
            $(document).unbind("touchend", mouseUpListener);
            if (dragging) {
                removeHighlight("vida-svg-overlay", drag_id[0]);
                delete this.__origin__; 
                reloadPage( settings.clickedPage, true );
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
            $("#vida-svg-overlay").on('click.vida', function(e) {
                var closestMeasure = $(e.target).closest(".measure");
                if (closestMeasure.length > 0)
                    mei.Events.publish('MeasureClicked', [closestMeasure]);
            });

            $("#vida-svg-overlay * .note").on('mousedown.vida', mouseDownListener);
            $("#vida-svg-overlay * .note").on('touchstart.vida', mouseDownListener);
            $("#vida-svg-overlay * defs").append("filter").attr("id", "selector");
            resizeComponents();
        }

        var syncScroll = function(e)
        {        
            var newTop = $(e.target).scrollTop();
            $("#vida-svg-wrapper").scrollTop(newTop);

            for(var idx = 0; idx < settings.pageTops.length; idx++)
            {
                var thisTop = settings.pageTops[idx];
                if(newTop <= thisTop)
                {
                    //there's a bit at the top
                    settings.currentPage = idx;
                    break;
                }
            }

            checkNavIcons();
        };

        var scrollToPage = function(pageNumber)
        {
            var toScrollTo = settings.pageTops[pageNumber];
            if ((toScrollTo > document.querySelector("#vida-svg-overlay").getBoundingClientRect().bottom) ||
                (toScrollTo < document.querySelector("#vida-svg-overlay").getBoundingClientRect().top))
                $("#vida-svg-overlay").scrollTop(toScrollTo);
            
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
            $("#vida-svg-wrapper").html("<h4 id='loadText'>Load a file into Verovio!</h4>");
        }

        $(".vida-orientation-toggle").on('click', this.toggleOrientation);

        $(".vida-grid-toggle").on('click', this.toggleGrid);

        $(".vida-next-page").on('click', function()
        {
            if (settings.currentPage < settings.totalPages - 1)
            {
                scrollToPage(settings.currentPage + 1);
            }
        });

        $(".vida-prev-page").on('click', function()
        {
            if (settings.currentPage > 0)
            {
                scrollToPage(settings.currentPage - 1);
            }
        });

        $("#vida-svg-overlay").on('scroll', syncScroll);

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