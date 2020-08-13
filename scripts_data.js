

window.hasDatasetChanged = false;

let latestFilterConfig = {};
function doFilterOverallData() {
    let newFilterConfig = {
        date : globalElements.availableDatesList.val(),
        policeStation : globalElements.policeStationsList.val(),
        riskType : globalElements.riskTypeList.val(),
    };

    latestFilterConfig = newFilterConfig;

    window.filteredPersonInfos = [];

    let filterHelperArr_0 = [];
    if(latestFilterConfig.date){
        allPersonInfos.forEach(function (personInfo) {
            if(personInfo.__dateStr === latestFilterConfig.date){
                filterHelperArr_0.push(personInfo);
            }
        });
    }
    else{
        filterHelperArr_0 = allPersonInfos.slice();
    }

    let filterHelperArr_1 = [];
    if(latestFilterConfig.policeStation){
        filterHelperArr_0.forEach(function (personInfo) {
            if(personInfo.__policeStation && personInfo.__policeStation.id === latestFilterConfig.policeStation){
                filterHelperArr_1.push(personInfo);
            }
        });
    }
    else{
        filterHelperArr_1 = filterHelperArr_0.slice();
    }

    let filterHelperArr_2 = [];
    if(latestFilterConfig.riskType) {
        if (latestFilterConfig.riskType === 'HIGH') {
            filterHelperArr_1.forEach(function (personInfo) {
                if (personInfo.__isHighRisk) {
                    filterHelperArr_2.push(personInfo);
                }
            });
        }
        if (latestFilterConfig.riskType === 'LOW') {
            filterHelperArr_1.forEach(function (personInfo) {
                if (!personInfo.__isHighRisk) {
                    filterHelperArr_2.push(personInfo);
                }
            });
        }

    }
    else{
        filterHelperArr_2 = filterHelperArr_1.slice();
    }


    window.filteredPersonInfos = filterHelperArr_2;
    updateMapsWithFilteredPersons();
}


function loadOverallDatabase() {
    globalElements.analysisDisplayText = $('#progressDisplay');
    window.filteredPersonInfos = [];
    window.allPersonInfos = [];
    window.allPoliceStations = [];
    window.allPoliceStationsMap = {};

    tbodyParsedGoogleMapCordinates.empty();

    let availableDates = getAvailableDatesWithData();
    console.log(availableDates);

    availableDates.forEach(function (dateStr ) {
        let actualDate = new Date(moment(dateStr).valueOf());
        // let actualDateStr = moment(actualDate).format('YYYY-MM-DD');

        let allParsedCsvInfosOfDateArr = getCsvDataForDate(actualDate);
        window._allParsedCsvInfosOfDateArr = allParsedCsvInfosOfDateArr;

        let previousParsedPersonInfo = null;

        allParsedCsvInfosOfDateArr.forEach(function (parsedCsvInfo) {
            let titleRow = parsedCsvInfo.meta.fields;
            parsedCsvInfo.data.forEach(function (personInfo) {

                if(previousParsedPersonInfo){
                    if(personInfo['Contact ID'] === '"'){
                        personInfo['Contact ID'] = previousParsedPersonInfo['Contact ID'];
                    }
                }

                if(!personInfo['LOCATION (LAT & LONG)']){
                    console.log('skipping', personInfo);
                    return;
                }

                let policeStationId = personInfo['Police Station'].trim();
                if(!allPoliceStationsMap[policeStationId]){
                    allPoliceStationsMap[policeStationId] = {
                        id : policeStationId
                    };
                    allPoliceStations.push(allPoliceStationsMap[policeStationId]);
                }

                personInfo.__dateStr = dateStr;
                personInfo.__contactId = personInfo['Contact ID'];
                personInfo.__policeStation = allPoliceStationsMap[policeStationId];
                personInfo.__latLng = personInfo['LOCATION (LAT & LONG)'];

                personInfo.__isHighRisk = ((personInfo['Category of contact-(High risk/Low risk)'] || '')).trim().toUpperCase().indexOf('HIGH') != -1;

                personInfo.__isPrimary = ((personInfo['Primary/Secondary'] || '')).trim().toUpperCase() === 'PRIMARY';
                personInfo.__isSecondary = !personInfo.__isPrimary; //((personInfo['Primary/Secondary'] || '')).trim().toUpperCase() === 'SEC';

                if(personInfo.__latLng){
                    personInfo.__latLng = personInfo.__latLng.trim();
                    personInfo.__latLng = {
                        lat: parseFloat(personInfo.__latLng.split(',')[0]),
                        lng: parseFloat(personInfo.__latLng.split(',')[1])
                    }
                }

                let trElement = $(document.createElement('tr'));
                trElement.html('<td>' + (tbodyParsedGoogleMapCordinates.children().length + 1) +
                    '</td>' + '<td>' + JSON.stringify(personInfo.__latLng) + '</td><td class="address"></td>');
                trElement.attr('data-lat-lng', JSON.stringify(personInfo.__latLng));
                trElement.attr('data-waiting', '1');

                tbodyParsedGoogleMapCordinates.append(trElement);
                window.allPersonInfos.push(personInfo);
                previousParsedPersonInfo = personInfo;
            });
        });

    });

    console.log(window.allPersonInfos)

    initializePoliceStationsList();
    initializeAvailableDatesList();
    globalElements.riskTypeList = $('#riskTypeList');

    doAddInfoToMap();
    doFilterOverallData();
}




function initializeAvailableDatesList() {
    let availableDatesList = $('#availableDatesList');
    globalElements.availableDatesList = availableDatesList;
    availableDatesList.html('<option value="">ALL</option>');

    getAvailableDatesWithData().forEach(function (dateStr) {
        let liElement = $(document.createElement('option'));
        liElement.text(dateStr.replace(/"/g, ''));
        liElement.attr('value', dateStr.replace(/"/g, ''));
        availableDatesList.append(liElement);
    });

    availableDatesList.on('change', function () {
        doFilterOverallData();
    });
}



function initializePoliceStationsList() {
    let policeStationsList = $('#policeStationsList');
    globalElements.policeStationsList = policeStationsList;
    policeStationsList.html('<option value="">ALL</option>');

    allPoliceStations.forEach(function (policeStationInstance) {
        let liElement = $(document.createElement('option'));
        liElement.text(policeStationInstance.id);
        liElement.attr('value', policeStationInstance.id);
        policeStationsList.append(liElement);
    });

    policeStationsList.on('change', function () {
        doFilterOverallData();
    });
}











function setAnalysisDisplayText(text) {
    globalElements.analysisDisplayText.html(text);
}


function getCsvKeyForDate(date) {
    return 'csv__' + date.toDateString()+'___' + moment(date).format('YYYY-MM-DD');
}

function deleteCsvDataForDate(date) {
    let key = getCsvKeyForDate(date);
    if(localStorage[key]){
        delete localStorage[key];		
        window.hasDatasetChanged = true;
    }
}

function getAvailableDatesWithData() {
	let dateStrs = [];
	for(let key in localStorage){
	  if(key.startsWith('csv__')){
		dateStrs.push(key.split('___')[1]);
	  }
	}
	return dateStrs;
}

function saveCsvDataForDate(date, allParsedCsvInfosArr) {
    let key = getCsvKeyForDate(date);
    localStorage[key] = JSON.stringify(allParsedCsvInfosArr);
    window.hasDatasetChanged = true;
}

function getCsvDataForDate(date) {
    let key = getCsvKeyForDate(date);
    if(localStorage[key]){
        return JSON.parse(localStorage[key]);
    }
    return null;
}

function doesCsvStrExists(date) {
    let key = getCsvKeyForDate(date);
    if(localStorage[key]){
        return true;
    }
    return false;
}


function showManageCsvFilesUI() {
    let manageCsvFilesContainer = $('#manageCsvFilesContainer');
    let datesToCsvTable = manageCsvFilesContainer.find('#datesToCsvTable');
    let datesToCsvTableBody = datesToCsvTable.find('tbody');
    let csvFileInput = manageCsvFilesContainer.find('#csv-file-input');

    datesToCsvTableBody.empty();

    manageCsvFilesContainer.fadeIn('fast');

    globalElements.manageCsvFilesContainer = manageCsvFilesContainer;
    globalElements.datesToCsvTable = datesToCsvTable;
    globalElements.csvFileInput = csvFileInput;

    var datesArr = getDaysArray(new Date("2020-08-01"),new Date());

    datesArr.forEach(function (dateObj) {
        let trElement = $(document.createElement('tr'));
        trElement.data('date', dateObj);

        let tdElement_0 = $(document.createElement('td'));
        let tdElement_1 = $(document.createElement('td'));

        let dataExists = doesCsvStrExists(dateObj);

        tdElement_0.text(dateObj.toDateString());

        if(!dataExists){
            tdElement_0.css('color', 'darkgreen');
            tdElement_1.html('<span>No Data Exists</span> <button class="play-button green choose-file">Choose File</button>');
        }
        else{
            tdElement_0.css('color', 'darkred');
            tdElement_1.html(`<button class="play-button red delete-file">Delete Data</button>`);
        }

        tdElement_0.appendTo(trElement)
        tdElement_1.appendTo(trElement)
        trElement.appendTo(datesToCsvTableBody)

    });

    if(!manageCsvFilesContainer.data('eventsBound')){
        manageCsvFilesContainer.data('eventsBound', true);

        datesToCsvTable.on('click', 'button', function () {
            let actualDate = $(this).closest('tr').data('date');
            console.log(this)

            if($(this).is('.choose-file')){
                showNewCsvFilePicker(actualDate);
            }
            else{
                confirmAndRemoveCsvFile(actualDate);
            }

        });
    }

    console.log(datesArr)
}

function confirmAndRemoveCsvFile(actualDate) {
    if(confirm('Delete data of ' + actualDate.toDateString())){
        deleteCsvDataForDate(actualDate);
        showManageCsvFilesUI();
    }
}


function getDaysArray(start, end) {
    for(var arr=[],dt=new Date(start); dt<=end; dt.setDate(dt.getDate()+1)){
        arr.push(new Date(dt));
    }
    return arr;
};


function showImportDataPopup() {
    showNewCsvFilePicker();
}

function showNewCsvFilePicker(actualDate) {
    console.log('showNewCsvFilePicker', globalElements.csvFileInput.get(0));
    globalElements.csvFileInput.trigger('click');
    if(actualDate){
        globalElements.csvFileInput.data('date', actualDate);
    }
    globalElements.csvFileInput.on('change', function (e) {
        globalElements.csvFileInput.off('change');
        if(!e.target.files.length){
            console.log('no csv selected');
            return;
        }

        if(!actualDate){
            if(e.target.files[0].name.endsWith('.dat')){
                handleImportDataFile(e.target.files[0]);
            }
            return;
        }

        let selectedDate = globalElements.csvFileInput.data('date');
        if(confirm('Save new data for : ' + selectedDate.toDateString())){
            let numFilesRead = 0;
            let allParsedCsvInfos = [];

            for (let i = 0; i < e.target.files.length; i++) {
                let csvFile = e.target.files[i];

                let reader = new FileReader();
                reader.readAsText(csvFile,'UTF-8');
                reader.onload = readerEvent => {
                    numFilesRead++;
                    let csvStr = readerEvent.target.result.trim(); // this is the content!
                    console.log( selectedDate, csvStr );

                    let parsedCsvInfo = Papa.parse(csvStr, {header : true});
                    allParsedCsvInfos.push(parsedCsvInfo);

                    if(numFilesRead ===  e.target.files.length){
                        doParseDataAndSave(selectedDate, allParsedCsvInfos);
                    }
                }
            }


        }


    });
}



function hideManageCsvFilesUI() {
    if(hasDatasetChanged){
        location.href = location.href;
    }
    globalElements.manageCsvFilesContainer.fadeOut('fast');
}



function handleImportDataFile(datFile) {

    if(!confirm('Import data from ' + datFile.name+'. This will erase all previous data.')){
        return;
    }

    let reader = new FileReader();
    reader.readAsText(datFile,'UTF-8');
    reader.onload = readerEvent => {
        let encryptedStr = readerEvent.target.result; // this is the content!

        showPasswordDialog(function (isSave, password) {
            if (!isSave) {
                return;
            }

            if (!password) {
                return;
            }

            try{

                let decryptedJson = CryptoJS.AES.decrypt(encryptedStr, password).toString(CryptoJS.enc.Utf8);

                let allImportedData = JSON.parse(decryptedJson);

                localStorage.clear();
                for(var key in allImportedData){
                    localStorage[key] = allImportedData[key];
                }

                alert('Import Successful.')

                setTimeout(function () {
                    location.href = location.href;
                }, 200);
            }
            catch (e) {
                console.log(e)
                alert('Import Failed. Wrong password')
            }

        });



    }

}

function showExportDataPopup() {
    showPasswordDialog(function (isSave, password) {
        if (!isSave) {
            return;
        }

        if (!password) {
            return;
        }
        let exportObj = {};
        for (let key in localStorage) {
            exportObj[key] = localStorage[key];
        }

        let allData = JSON.stringify(exportObj);

        let encrypted = CryptoJS.AES.encrypt(allData, password);


        let blob = new Blob([encrypted], {type: "text/plain;charset=utf-8"});
        saveAs(blob, "export__" + new Date().toLocaleString() + '___' + new Date().getTime() + ".dat");
    });
}





function doParseDataAndSave(actualDate, allParsedCsvInfos) {
    window.tempParsedCsvInfo = allParsedCsvInfos;
    saveCsvDataForDate(actualDate, allParsedCsvInfos);
    showManageCsvFilesUI();
}