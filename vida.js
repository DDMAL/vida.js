(function ($)
{
    var vida = function(element, options){
    	console.log('created');
    	$(element).append('<div id="prev">Prev</div>' +
            '<div id="next">Next</div>' +
            '<div id="verovio">' +
                'Loading...' +
            '</div>');

    	var vrvToolkit = new verovio.toolkit();
        var vWidth = $("#verovio").width();
        var scaleIn = 40;

        var vOptions = {
            pageHeight: $("#verovio").height()*(100/scaleIn),
            pageWidth: $("#verovio").width()*(100/scaleIn),
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
        
        $("#next").on('click', function()
        {
            if(currentPage < totalPages)
            {
                currentPage+=1;
                $("#verovio").html(vrvToolkit.renderPage(currentPage));
            }
        });

        $("#prev").on('click', function()
        {
            if(currentPage > 1)
            {
                currentPage-=1;
                $("#verovio").html(vrvToolkit.renderPage(currentPage));
            }
        });

        function refreshVerovio()
        {
            vrvToolkit.loadData( dataGlobal + "\n" );
            vrvToolkit.setOptions(JSON.stringify(vOptions));
            var svg = vrvToolkit.renderPage(1);
            $("#verovio").html(svg);
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

        	console.log("here");
            // Otherwise, instantiate the document viewer
            var vidaObject = new vida(this, options);
            element.data('vida', vidaObject);
        });
    };

})(jQuery);