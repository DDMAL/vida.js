(function ($)
{
    var vida = function(element, options)
    {

        $(element).append(
            '<div class="vida-page-controls">' +
                '<div class="vida-prev-page"></div>' +
                '<div class="vida-zoom-controls">' +
                    '<span class="vida-zoom-in"></span>' +
                    '<span class="vida-zoom-out"></span>' +
                '</div>' +
                '<div class="vida-next-page"></div>' +
            '</div>' +
            '<div id="vida-body">' +
                'Loading...' +
            '</div>');

        function resizeComponents()
        {
            $("#vida-body").height(options.parentSelector.height() - $(".vida-page-controls").outerHeight());
            $("#vida-body").offset({'top': $(".vida-page-controls").outerHeight()});
            $("#vida-body").width(options.parentSelector.width() * 0.95);
            $("#vida-body").css('margin-left', options.parentSelector.width() * 0.025);     
        }

        function refreshVerovio()
        {
            $("#vida-body").height(options.parentSelector.height() - $(".vida-page-controls").outerHeight());
            $("#vida-body").offset({'top': $(".vida-page-controls").outerHeight()});
            $("#vida-body").width(options.parentSelector.width() * 0.95);
            vrvToolkit.loadData( dataGlobal + "\n" );
            vrvToolkit.setOptions(JSON.stringify({
                pageHeight: initialPageHeight,
                pageWidth: initialPageWidth,
                inputFormat: 'mei',
                scale: currentScale,
                adjustPageHeight: 1,
                ignoreLayout: 1,
                border: 0
            }));
            //console.log("verovio -f mei -h", initialPageHeight, "-w", initialPageWidth, "-b 0 -s", currentScale, "--ignore-layout --adjust-page-height Guami_Canzona_24.mei");    
            var svg = vrvToolkit.renderPage(currentPage);
            $("svg").remove();
            $("#vida-body").html(svg);
        }

        var vrvToolkit = new verovio.toolkit();
        var currentScale = 40;
        var currentPage = 1;
        var initialPageHeight = $("#vida-body").height() * (100 / currentScale);
        var initialPageWidth = $("#vida-body").width() * (100 / currentScale);
        var totalPages;
        var dataGlobal;

        vrvToolkit.setOptions(JSON.stringify({
            pageHeight: initialPageHeight,
            pageWidth: initialPageWidth,
            inputFormat: 'mei',
            scale: currentScale,
            adjustPageHeight: 1,
            ignoreLayout: 1
        }));


        $.get("Guami_Canzona_24.mei", function(data) 
        {
            dataGlobal = data;
            refreshVerovio();
            totalPages = vrvToolkit.getPageCount();
            resizeComponents();
        });

        $(".vida-next-page").on('click', function()
        {
            if (currentPage < totalPages)
            {
                currentPage += 1;
                refreshVerovio();
                $("#vida-body").scrollTop(0);
                $("#vida-body").scrollLeft(0);
            }
        });

        $(".vida-prev-page").on('click', function()
        {
            if (currentPage > 1)
            {
                currentPage -= 1;
                refreshVerovio();
            }
        });

        $(".vida-zoom-in").on('click', function()
        {
            if (currentScale <= 100)
            {
                currentScale += 10;
                refreshVerovio();
            }
        });

        $(".vida-zoom-out").on('click', function()
        {
            if (currentScale > 10)
            {
                currentScale -= 10;
                refreshVerovio();
            }
        });

        $(window).on('resize', resizeComponents);

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