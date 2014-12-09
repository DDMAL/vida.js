importScripts("verovio-toolkit.js");
var vrvToolkit = new verovio.toolkit();

var returnData = function()
{
    var totalPages = vrvToolkit.getPageCount();
    var svgText = "";
    
    for(var curPage = 1; curPage <= totalPages; curPage++)
    {
        svgText += vrvToolkit.renderPage(curPage);
    }

    postMessage(["returnData", svgText, totalPages]);

};

this.addEventListener('message', function(event){
    switch (event.data[0])
    {
        case "setOptions":
            vrvToolkit.setOptions(event.data[1]);
            break;

        case "redoLayout":
            vrvToolkit.redoLayout();
            returnData();
            break;

        case "loadData":
            vrvToolkit.loadData(event.data[1]);
            returnData();
            break;
        default:
            postMessage(["Did not recognize that input."]);
            break;
    }
}, false);