(function ($)
{
    var vida = function(element, options){

        $(element).append(
            '<div class="vida-page-controls">' +
                '<div class="vida-prev-page"></div>' +
                '<div class="vida-next-page"></div>' +
            '</div>' +
            '<div id="vida-body">' +
                'Loading...' +
            '</div>');

        var vrvToolkit = new verovio.toolkit();
        var scaleIn = 40;

        var vOptions = {
            pageHeight: $("#vida-body").height()*(100/scaleIn),
            pageWidth: $("#vida-body").width()*(100/scaleIn),
            inputFormat: 'mei',
            scale: scaleIn,
            adjustPageHeight: 1,
            adjustPageWidth: 1,
            ignoreLayout: 1
        };

        vrvToolkit.setOptions(JSON.stringify(vOptions));

        var currentPage = 1;
        var totalPages;
        var dataGlobal;

        $.get( "Guami_Canzona_24.mei", function( data ) {
            dataGlobal = data;
            refreshVerovio();
            totalPages = vrvToolkit.getPageCount();
        });

        $(".vida-next-page").on('click', function()
        {
            if(currentPage < totalPages)
            {
                currentPage += 1;
                $("#vida-body").html(vrvToolkit.renderPage(currentPage));
            }
        });

        $(".vida-prev-page").on('click', function()
        {
            if(currentPage > 1)
            {
                currentPage -= 1;
                $("#vida-body").html(vrvToolkit.renderPage(currentPage));
            }
        });

        function refreshVerovio()
        {
            vrvToolkit.loadData( dataGlobal + "\n" );
            vrvToolkit.setOptions(JSON.stringify(vOptions));
            var svg = vrvToolkit.renderPage(1);
            $("#vida-body").html(svg);
        }

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