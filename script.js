function iMap() {
    console.log('iMap init done');
    if (!google.maps.Polygon.prototype.getBounds) {
        google.maps.Polygon.prototype.getBounds = function () {
            var bounds = new google.maps.LatLngBounds();
            this.getPath().forEach(function (element, index) { bounds.extend(element); });
            return bounds;
        }
    }


    fetch('./data/ekm_tcr_invitation_makers.json')
        .then(function(res){
            return res.json()
        })
        .then(function(data){
            console.log('data', data)
            loadOverallDatabase(data);
        });
}


window.globalElements = {};

let tempValue = ``;


// let btnCopyResult = $('#btnCopyResult');
// let txtGoogleMapLinks = $('#txtGoogleMapLinks');
let tblParsedGoogleMapCordinates = $('#tblParsedGoogleMapCordinates');
let tbodyParsedGoogleMapCordinates = tblParsedGoogleMapCordinates.find('tbody');

// txtGoogleMapLinks.val(tempValue);

// tbodyParsedGoogleMapCordinates.on('click', 'tr', function () {
//     let trElement = $(this);
//     trElement.attr('data-waiting', '1');
//     trElement.removeAttr('title');
//     // doDecodeNext();
// });

// btnCopyResult.hide();
// btnCopyResult.on('click', function () {
//     let strArr = [];
//     tbodyParsedGoogleMapCordinates.find('.address').each(function(){
//         strArr.push($(this).text());
//     });
//     copyTextToClipboard(strArr.join('\n'));
//     alert('Copied');
// });

// $('#btnDecode').on('click', function () {
//     doParseData();
// });




function fallbackCopyTextToClipboard(text) {
    var textArea = document.createElement("textarea");
    textArea.value = text;

    // Avoid scrolling to bottom
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
        var successful = document.execCommand('copy');
        var msg = successful ? 'successful' : 'unsuccessful';
        console.log('Fallback: Copying text command was ' + msg);
    } catch (err) {
        console.error('Fallback: Oops, unable to copy', err);
    }

    document.body.removeChild(textArea);
}

function copyTextToClipboard(text) {
    if (!navigator.clipboard) {
        fallbackCopyTextToClipboard(text);
        return;
    }
    navigator.clipboard.writeText(text).then(function () {
        console.log('Async: Copying to clipboard was successful!');
    }, function (err) {
        console.error('Async: Could not copy text: ', err);
    });
}






globalElements.dialogForPassword = $( "#dialogForPassword" );
globalElements.dialogForPasswordInputElement = globalElements.dialogForPassword.find( "input[type=\"password\"]" );

function showPasswordDialog(callback){
    globalElements.dialogForPassword.get(0).showModal();
    globalElements.dialogForPassword.data('callback', callback);
}

function closePasswordDialog(isSave){
    if(isSave){
        if(!globalElements.dialogForPasswordInputElement.val()){
            return
        }
    }

    globalElements.dialogForPassword.get(0).close();
    globalElements.dialogForPassword.data('callback')(isSave, globalElements.dialogForPasswordInputElement.val());
}


