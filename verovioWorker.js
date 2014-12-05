importScripts("verovio-toolkit.js");
var vrvToolkit = new verovio.toolkit();

this.addEventListener('message', function(event){
	switch (event.data[0])
	{
		case "setOptions":
			vrvToolkit.setOptions(event.data[1]);
			break;

		case "loadData":
			vrvToolkit.loadData(event.data[1]);
			var totalPages = vrvToolkit.getPageCount();
			var svgText = "<div id='vida-svg-wrapper'>";
            
            for(var curPage = 1; curPage <= totalPages; curPage++)
			{
                svgText += vrvToolkit.renderPage(curPage);
            }
            svgText += "</div>";

			postMessage(["loadData", svgText, totalPages]);
			break;
		default:
			postMessage(["Did not recognize that input."]);
			break;
	}
}, false);