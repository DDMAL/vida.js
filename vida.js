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
            musicData: "",
            pageHeight: 100,
            pageTopOffsets: [],
            pageWidth: 100,
            scale: 40,
            totalPages: 0,
            verovioWorker: new Worker("verovioWorker.js")
        };

        $.extend(settings, options);

        settings.verovioWorker.onmessage = function(event){
            switch (event.data[0]){
                case "loadData":
                    //event.data[1] is all the SVG data, event.data[2] is the total number of pages
                    settings.totalPages = event.data[2];
                    settings.currentPage = 0;
                    $("#vida-body").html("");
                    $("#vida-body").append(event.data[1]);            

                    //create the array of pageTopOffsets after everything's loaded into the DOM
                    var curSystem = $(".system").length;
                    while(curSystem--)
                    {
                        settings.pageTopOffsets[curSystem] = $($(".system")[curSystem]).offset().top - $("#vida-body").offset().top - settings.border;
                    }

                    break;
                default:
                    console.log(event.data[1]);
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
            settings.verovioWorker.postMessage(['setOptions', JSON.stringify({
                pageHeight: settings.pageHeight,
                pageWidth: settings.pageWidth,
                inputFormat: 'mei',
                scale: settings.scale,
                adjustPageHeight: 1,
                noLayout: settings.horizontallyOriented,
                ignoreLayout: 1,
                border: settings.border
            })]);
        }

        function refreshVerovio()
        {
            $("#vida-body").prepend('<div class="vida-loading-popup">Loading...</div>');
            $("#vida-body").height(options.parentSelector.height() - $(".vida-page-controls").outerHeight());
            $("#vida-body").offset({'top': $(".vida-page-controls").outerHeight()});
            $("#vida-body").width(options.parentSelector.width() * 0.95);
            reloadOptions();
            settings.verovioWorker.postMessage(['loadData', settings.musicData + "\n"]);  
        }

        this.changeMusic = function(newData)
        {
            settings.musicData = newData;
            refreshVerovio();
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
            var curScroll = $(e.target).scrollTop();
            while(curPage--)
            {
                var pageTop = settings.pageTopOffsets[curPage];
                if(curScroll > pageTop)
                {
                    //there's a bit at the top
                    settings.currentPage = curPage;
                    break;
                }
            }
            checkNavIcons();
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
            if(settings.currentPage == totalPages)
            {
                $(".vida-next-page").css('visibility', 'hidden');
            }
            else if($(".vida-prev-page").css('visibility') == 'hidden')
            {
                $(".vida-prev-page").css('visibility', 'visible');
            }            

            if(settings.currentPage == 1)
            {
                $(".vida-prev-page").css('visibility', 'hidden');
            }
            else if($(".vida-next-page").css('visibility') == 'hidden')
            {
                $(".vida-next-page").css('visibility', 'visible');
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
                settings.musicData = data;
                refreshVerovio();
                resizeComponents();
                $(".vida-prev-page").css('visibility', 'hidden');
            });
        }
        else if(options.fileOnLoad && !options.fileOnLoadIsURL)
        {
            settings.musicData = options.fileOnLoad;
        }
        else
        {
            $("#vida-body").html("<h4>Load a file into Verovio!</h4>");
        }

        $(".vida-orientation-toggle").on('click', this.toggleOrientation);

        $(".vida-grid-toggle").on('click', this.toggleGrid);

        $(".vida-next-page").on('click', function()
        {
            if (settings.currentPage < totalPages)
            {
                settings.currentPage += 1;
                scrollToCurrentPage();
            }
        });

        $(".vida-prev-page").on('click', function()
        {
            if (settings.currentPage > 1)
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

        $(window).on('resize', resizeComponents);
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