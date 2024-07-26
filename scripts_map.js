

function doAddInfoToMap() {

    const map = new google.maps.Map(document.getElementById("map"), {
        zoom: 12,
        center: { lat: 10.3688933, lng: 76.2138581 }
    });
    // const drawingManager = new google.maps.drawing.DrawingManager();

    map.addListener('click', function () {
        if(window.selectedPersonInfo){
            window.selectedPersonInfo.__infoWindow && window.selectedPersonInfo.__infoWindow.close();
        }
        window.selectedPersonInfo = null;
    })

    window.googleMapInstance = map;
    window.drawingManagerInstance = map;


    allPersonInfos.forEach(function (personInfo) {

        if(!personInfo.__latLng){
            // skipping
            return;
        }

        let label = personInfo['Sl No.'];
        let imageUrl = 'https://mt.google.com/vt/icon/name=icons/onion/SHARED-mymaps-container-bg_4x.png,icons/onion/SHARED-mymaps-container_4x.png,icons/onion/1644-parking_4x.png&highlight=ff000000,F9A825,ff000000&scale=1.0';
        if(personInfo.is_hotlisted){
            imageUrl = 'https://mt.google.com/vt/icon/name=icons/onion/SHARED-mymaps-container-bg_4x.png,icons/onion/SHARED-mymaps-container_4x.png,icons/onion/1512-bank-dollar_4x.png&highlight=ff000000,673AB7,ff000000&scale=1.0';
        }

        const personMarker = new google.maps.Marker({
            position: personInfo.__latLng,
            map,
            //label,
            icon: imageUrl
        });
        personInfo.__marker = personMarker;
        personInfo.__marker.setVisible(false);


        let contentString =
            '<div id="content">' +
            '<h1 id="firstHeading" class="firstHeading">'+ personInfo.display_name +'</h1>' +
`
 <a target="_blank" href="${personInfo.gbp_link}"><span>Open Link</span></a>
` +
            '<div id="bodyContent">' +
            "<table class=\"markerBodyContentTable\">@bodyTableContent@</table>" +
            "</div>" +
            "</div>";

        let bodyContentArr = [];
        for(let key in personInfo){
            if(key.startsWith('__')){
                continue;
            }
            if(personInfo[key]){
                bodyContentArr.push(`<tr><td><b>${key}</b></td><td>${personInfo[key]}</td></tr>`)
            }
        }
        contentString = contentString.replace('@bodyTableContent@', bodyContentArr.join('\n'));

        const infoWindow = new google.maps.InfoWindow({
            content: contentString
        });
        personInfo.__infoWindow = infoWindow;


        personMarker.addListener("click", () => {
            personInfo.__infoWindow .open(map, personMarker);
            window.selectedPersonInfo = personInfo;
        });

    });

    setTimeout(function () {
        initializeAllPolygonsFromDb();
    }, 1000);
}

function refreshAnalysisText() {
    let primaryContactsCount = filteredPersonInfos.filter(function (personInfo) {
        return personInfo.is_hotlisted;
    }).length;

    let secondaryContactsCount = filteredPersonInfos.filter(function (personInfo) {
        return !personInfo.is_hotlisted;
    }).length;

    // let highRiskContactsCount = filteredPersonInfos.filter(function (personInfo) {
    //     return personInfo.__isHighRisk;
    // }).length;


    let displayText = `Hotlisted : ${primaryContactsCount}, Other : ${secondaryContactsCount}`;



    if(rectangleInstance){
        let visibleRegion = rectangleInstance.getBounds();

        let primaryContactsCountInsideRect = filteredPersonInfos.filter(function (personInfo) {
            if(personInfo.is_hotlisted && personInfo.__marker){
                if(visibleRegion.contains( personInfo.__marker.getPosition() )){
                    return true;
                }
            }
            return false;
        }).length;

        let secondaryContactsCountInsideRect = filteredPersonInfos.filter(function (personInfo) {
            if(!personInfo.is_hotlisted && personInfo.__marker){
                if(visibleRegion.contains( personInfo.__marker.getPosition() )){
                    return true;
                }
            }
            return false;
        }).length;

        displayText += `<span style="display: inline-block;margin-left: 10px;"> [ Rectangle = Hotlisted : ${primaryContactsCountInsideRect}, Other : ${secondaryContactsCountInsideRect} ] </span>`;
    }

    setAnalysisDisplayText(displayText);
}

function updateMapsWithFilteredPersons() {
    allPersonInfos.forEach(function (personInfo) {
        personInfo.__marker && personInfo.__marker.setVisible(false);
    });

    filteredPersonInfos.forEach(function (personInfo) {
        personInfo.__marker && personInfo.__marker.setVisible(true);
    });

    setTimeout(function () {
        let marker = getCenterMarker();
        if(marker){
            googleMapInstance.setCenter(marker.getPosition());
        }

        refreshAnalysisText();
    }, 100);
}


function getCenterMarker() {
    for (let i = 0; i < filteredPersonInfos.length; i++) {
        if(filteredPersonInfos[i].__marker){
            return filteredPersonInfos[i].__marker;
        }
    }
    return null;
}
function getFirstMarker() {
    for (let i = 0; i < filteredPersonInfos.length; i++) {
        if(filteredPersonInfos[i].__marker){
            return filteredPersonInfos[i].__marker;
        }
    }
    return null;
}
function getLastMarker() {
    for (let i = allPersonInfos.length-1; i >=0; i--) {
        if(allPersonInfos[i].__marker){
            return allPersonInfos[i].__marker;
        }
    }
    return null;
}

function calculatePositionWithDistance(lat, lng, distanceRequiredInMeters) {
    var earth = 6378.137,  //radius of the earth in kilometer
        pi = Math.PI,
        cos = Math.cos,
        m = (1 / ((2 * pi / 360) * earth)) / 1000;  //1 meter in degree

    var new_latitude = lat + (distanceRequiredInMeters * m);
    var new_longitude = lng + (distanceRequiredInMeters * m) / cos(lat * (pi / 180));

    return {
        lat : new_latitude,
        lng : new_longitude
    }
}


let rectangleInstance;
let rectangleInstanceSize = 5000;
function updateRectangleAreaSize(newValueStr) {
    rectangleInstanceSize = parseInt(newValueStr);
    toggleRectangleArea();
    setTimeout(function () {
        toggleRectangleArea();
    }, 50);
}

function toggleRectangleArea() {

    if(rectangleInstance){
        // googleMapInstance.remove(rectangleInstance)
        globalElements.rectangleAreaSize.hide();
        rectangleInstance.setMap(null);
        rectangleInstance = null;
        return;
    }

    if(!globalElements.rectangleAreaSize){
        globalElements.rectangleAreaSize = $('#rectangleAreaSize');
    }

    globalElements.rectangleAreaSize.show();

    if(!getFirstMarker()){
        return;
    }

    let initialPos = googleMapInstance.getCenter()
    let finalPos = calculatePositionWithDistance(initialPos.lat(), initialPos.lng(), rectangleInstanceSize);
    // console.log(initialPos);
    // console.log(finalPos);
    // console.log(rectangleInstanceSize);

    var bounds = new google.maps.LatLngBounds(
        initialPos,
        finalPos,
    );

    var rectangle = new google.maps.Rectangle({
        bounds: bounds,
        draggable: true,
        // editable: true
    });

    rectangle.setMap(window.googleMapInstance);
    rectangle.addListener('dragend', function () {
       refreshAnalysisText();
    });
    rectangleInstance = rectangle;
}


let allPolygons = {};
function setToAddPolygonMode() {
    var map = window.googleMapInstance;
    var isClosed = false;
    var poly = new google.maps.Polyline({ map: map, path: [], strokeColor: "#FF0000", strokeOpacity: 1.0, strokeWeight: 2 });
    let polygonId = 'p__'+new Date().getTime();
    poly.__id = polygonId;
    allPolygons[polygonId] = poly;
    window._latestPoly = poly;
    let listenerHandle = google.maps.event.addListener(map, 'click', function (clickEvent) {
        if (isClosed)
            return;
        let markerIndex = poly.getPath().length;
        var isFirstMarker = markerIndex === 0;
        var marker = new google.maps.Marker({ map: map, position: clickEvent.latLng, draggable: true });
        if (isFirstMarker) {
            google.maps.event.addListener(marker, 'click', function () {
                if (isClosed)
                    return;
                var path = poly.getPath();
                poly.setMap(null);
                poly = new google.maps.Polygon({ map: map, path: path, strokeColor: "#FF0000", strokeOpacity: 0.8, strokeWeight: 2, fillColor: "#FF0000", fillOpacity: 0.35 });
                isClosed = true;

                google.maps.event.removeListener(listenerHandle);

                poly.__id = polygonId;
                allPolygons[polygonId] = poly;
                window._latestPoly = poly;
                poly.__firstMarker = marker;
                savePolygonInfoToDb(poly);

                poly.addListener("click", () => {
                    showInfoWindowForPolygon(poly);
                    window.selectedPolygon = poly;
                });
            });
        }
        google.maps.event.addListener(marker, 'drag', function (dragEvent) {
            poly.getPath().setAt(markerIndex, dragEvent.latLng);
            savePolygonInfoToDb(poly);
        });
        poly.getPath().push(clickEvent.latLng);
    });
}

function savePolygonInfoToDb(poly) {
    let polyInfo = {
        pathArray : poly.getPath().getArray(),
        id : poly.__id,
        displayName : poly.__displayName || 'Polygon'
    };
    let json = JSON.stringify(polyInfo);
    localStorage['polygon__' + poly.__id] = json;
}

function initializeAllPolygonsFromDb() {
    for(let key in localStorage){
        if(!key.startsWith('polygon__')){
            continue;
        }

        addPolygonFromJson(JSON.parse(localStorage[key]));
    }
}

function addPolygonFromJson(obj) {
    let markersArr = [];
    let map = googleMapInstance;

    let tempPoly = new google.maps.Polyline({ map: map, path: [], strokeColor: "#FF0000", strokeOpacity: 1.0, strokeWeight: 2 });

    for (let markerIndex = 0; markerIndex < obj.pathArray.length; markerIndex++) {
        // var isFirstMarker = markerIndex === 0;
        let marker = new google.maps.Marker({ map: map, position: new google.maps.LatLng(obj.pathArray[markerIndex]), draggable: true });
        markersArr.push(marker);
        tempPoly.getPath().push(marker.getPosition());
    }


    let poly = new google.maps.Polygon({ map: googleMapInstance, path: tempPoly.getPath(), strokeColor: "#FF0000", strokeOpacity: 0.8, strokeWeight: 2, fillColor: "#FF0000", fillOpacity: 0.35 });

    for (let markerIndex = 0; markerIndex < obj.pathArray.length; markerIndex++) {
        google.maps.event.addListener(markersArr[markerIndex], 'drag', function (dragEvent) {
            poly.getPath().setAt(markerIndex, dragEvent.latLng);
            savePolygonInfoToDb(poly);
        });
    }

    tempPoly.setMap(null);

    poly.__firstMarker = markersArr[0];
    poly.__id = obj.id;
    poly.__displayName = obj.displayName;
    allPolygons[obj.id] = poly;
    window._latestPoly = poly;

    poly.addListener("click", () => {
        showInfoWindowForPolygon(poly);
        window.selectedPolygon = poly;
    });

}

function deletePolygon(polygonId){
    let polygon = allPolygons[polygonId];
    if(polygon.__infoWindow){
        polygon.__infoWindow.close()
    }
    delete localStorage['polygon__' + polygonId];
    polygon.setMap(null);
}

function polygonInfoWindowNameChanged(polygonId, newName){
    // let element = $('.content[data-polygon-id="'+polygonId+'"]');
    let polygon = allPolygons[polygonId];
    polygon.__displayName = newName; //element.val();
    savePolygonInfoToDb(polygon);
}

function showInfoWindowForPolygon(polygon){

    let contentString =
        '<div id="content" data-polygon-id=\"'+polygon.__id+'\">' +
        '<input id="firstHeading" type="text" style="border: none;padding: 4px;" onchange=\"polygonInfoWindowNameChanged(\''+polygon.__id+'\', this.value)\" class="firstHeading" value="'+ (polygon.__displayName || "Polygon") +'">' +
        '<div id="bodyContent">' +
        "<table class=\"markerBodyContentTable\">@bodyTableContent@</table>" +
        "<br/>" +
        "<div class=\"buttons\"><button id=\"delete\" onclick=\"deletePolygon('"+polygon.__id+"');\" class=\"play-button red\">Delete</button></div>" +
        "</div>" +
        "</div>";


    let visibleRegion = polygon.getBounds();


    let primaryContactsCountInsideRect = filteredPersonInfos.filter(function (personInfo) {
        if(personInfo.is_hotlisted && personInfo.__marker){
            if(visibleRegion.contains( personInfo.__marker.getPosition() )){
                return true;
            }
        }
        return false;
    }).length;

    let secondaryContactsCountInsideRect = filteredPersonInfos.filter(function (personInfo) {
        if(!personInfo.is_hotlisted && personInfo.__marker){
            if(visibleRegion.contains( personInfo.__marker.getPosition() )){
                return true;
            }
        }
        return false;
    }).length;


    let bodyContentArr = [];
    bodyContentArr.push(`<tr><td><b>Hotlisted</b></td><td>${primaryContactsCountInsideRect}</td></tr>`);
    bodyContentArr.push(`<tr><td><b>Others</b></td><td>${secondaryContactsCountInsideRect}</td></tr>`);
    // bodyContentArr.push(`<tr><td><b>High Risk</b></td><td>${highRiskContactsCountInsideRect}</td></tr>`);

    contentString = contentString.replace('@bodyTableContent@', bodyContentArr.join('\n'));

    const infoWindow = new google.maps.InfoWindow({
        content: contentString
    });
    infoWindow.open(googleMapInstance, polygon.__firstMarker);
    polygon.__infoWindow = infoWindow;

}

// let visibleRegion = googleMapInstance.getBounds();
// //let mapBound = visibleRegion.latLngBounds;
//
// if(visibleRegion.contains( allPersonInfos[0].__marker.getPosition() )){
//     console.log('yes')
// }


