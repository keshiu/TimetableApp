"use strict";
var main = function( data ) {
    var flightStatusesBase = [], // массив только с нужными для табло данными о рейсах
    loadDepartBase = false,
    loadArriveBase = false;

    var findFieldValue = function( base, code ) { // функция находит пару, содержащую заданное значение свойства и возвращает второе значение
        var found = false,
        requestedField = "";

        base.forEach( function( item ) {
            if ( ( "airlineCode" in item ) && ( item.airlineCode === code ) && ( found === false ) ) { // если подгружен массив airlinesWithRepeat
                found = true;
                requestedField = item.airlineLogoUrlPng;
            } else if ( ( "fs" in item ) && ( item.fs === code ) && ( found === false ) ) { // если подгружен массив *Airports
                found = true;
                requestedField = item.city;
            } else if ( ( "iata" in item ) && ( item.iata === code ) && ( found === false ) ) { // если подгружен массив *Equipments
                found = true;
                requestedField = item.name;
            }
        } );
        return ( requestedField );
    };
    var filterBase = function( base ) { // функция возвращает массив, содержащий объекты с только нужными нам свойства
        var filteredBase = [],
        i = 0;

        base.forEach( function( item ) {
            var elem = {};

            if ( "fs" in item ) { // если подгружено свойство "airports" входного файла
                elem.fs = item.fs;
                elem.city = item.city;
                filteredBase[ i ] = elem;
                i++;
            } else { // если подгружено свойство "equipments" входного файла
                elem.iata = item.iata;
                elem.name = item.name;
                filteredBase[ i ] = elem;
                i++;
            }
        } );
        return ( filteredBase );
    };
    var compareTime = function( a, b ) { // функция, описывающая метод сортировки базы рейсов по времени по расписанию
        if ( a.sheduledTime > b.sheduledTime ) return 1;
        if ( a.sheduledTime < b.sheduledTime ) return -1;
    };
    var arrayToTable = function( base ) { // превращает массив объектов в таблицу
        if ( ( loadDepartBase === true ) && ( loadArriveBase === true ) ) {
            base.sort( compareTime ); // сортируем таблицу по возрастанию времени рейса по расписанию
            base.forEach( function( item ) {
                var $tr = $( "<tr>" );

                $tr.append( "<td class='type'><img src = " + item.flightType + " width=20 height=20/></td>" ); // иконка по типу вылет/прилет
                $tr.append( $( "<td class='number'>" ).text( item.flightNumber ) ); // номер рейса
                $tr.append( $( "<td class='airline'>" ).text( item.carrierCode ) ); // код авиакомпании
                $tr.append( "<td class='logo'><img src = " + item.carrierLogo + " width=60 height=20/></td>" ); // логотип
                $tr.append( $( "<td class='plane'>" ).text( item.planeType ) ); // полное название типа самолета
                $tr.append( $( "<td class='destination'>" ).text( item.destinationCity ) ); //город назначения
                $tr.append( $( "<td class='time'>" ).text( item.sheduledTime ) ); //время по расписанию
                if ( item.flightStatus !== "" ) {
                    $tr.append( $( "<td class='status'>" ).text( "рейс задержан на " + item.flightStatus + " мин" ) );
                } else $tr.append( $( "<td class='status'>" ).text( "" ) ); // статус рейса
                if ( item.comments !== "" ) {
                    $tr.append( $( "<td class='comments'>" ).text( item.comments ) );
                } else $tr.append( $( "<td class='comments'>" ).text( "" ) ); // примечание: информация о кодшеринге
                if ( item.flightType === "images/departures_pictogram.png" ) {
                    $tr.attr( "class", "depart" );
                } else $tr.attr( "class", "arrive" );
                $( "table" ).find( "tbody" ).append( $tr );
            } );
        }
    };
    var onsuccessDepart = function( data ) { //функция обработки ответа по вылетам
        var departFlightStatuses = data.flightStatuses, //все данные о рейсах от FlightStats
        departEquipments = filterBase( data.appendix.equipments ), //только нужные нам данные о вылетающих самолетах
        departAirports = filterBase( data.appendix.airports ); // только нужные нам данные об аэропортах назначения

        departFlightStatuses.forEach( function( item ) { //проходим по всем элементам flightStatuses и нужную информацию заносим в объект flightStatusesBase
            var flightInfo = {}; //инициализируем переменную, куда будет загружаться нужная информация о конкретном рейсе
            flightInfo.flightType = "images/departures_pictogram.png"; //тип рейса: depart или arrive
            flightInfo.flightNumber = item.flightNumber; // номер рейса
            flightInfo.carrierCode = item.carrierFsCode; // fs код авиакомпании (совпадает с кодами iata)
            flightInfo.carrierLogo = findFieldValue( airlinesWithRepeat, item.carrierFsCode ); // логотип авиакомпании взятый из массива airline = {"carrierCode" : "carrierLogo"}
            flightInfo.planeIata = item.flightEquipment.scheduledEquipmentIataCode; // тип самолета iata
            flightInfo.planeType = findFieldValue( departEquipments, item.flightEquipment.scheduledEquipmentIataCode ); // полное название
            flightInfo.destinationCity = findFieldValue( departAirports, item.arrivalAirportFsCode ); // название города аэропорта назначения
            flightInfo.sheduledTime = item.departureDate.dateLocal.split( "T" )[ 1 ]; // время прибытия по расписанию
                //строка имеет вид dataTtime,
                //поэтому делим строку по разделителю "T" и берем второй элемент, чтобы получить время
            if ( ( typeof( item.delays ) !== "undefined" ) && ( typeof( item.delays.departureGateDelayMinutes ) !== "undefined" ) ) {
                flightInfo.flightStatus = item.delays.departureGateDelayMinutes;
            } else flightInfo.flightStatus = ""; // время задержки
            if ( typeof( item.codeshares ) !== "undefined" ) {
                var tempItem = [];
                for ( var i = 0; i < item.codeshares.length; i++ ) {
                    tempItem.push( item.codeshares[ i ].fsCode + item.codeshares[ i ].flightNumber );
                };
                flightInfo.comments = tempItem.join( "\n" );
            } else flightInfo.comments = ""; // примечания, кодшеринг с другими авиакомпаниями
            flightStatusesBase.push( flightInfo ); // отправляем полученный массив данных в общую базу для таблицы
        } );
        loadDepartBase = true;
        arrayToTable( flightStatusesBase );
    };

    var onsuccessArrive = function( data ) { //функция обработки ответа по прилетам
        var arriveFlightStatuses = data.flightStatuses, //все данные о рейсах от FlightStats
        arriveEquipments = filterBase( data.appendix.equipments ),
        arriveAirports = filterBase( data.appendix.airports );

        arriveFlightStatuses.forEach( function( item ) {
            var flightInfo = {};
            flightInfo.flightType = "images/arrivals_pictogram.png";
            flightInfo.flightNumber = item.flightNumber;
            flightInfo.carrierCode = item.carrierFsCode;
            flightInfo.carrierLogo = findFieldValue( airlinesWithRepeat, item.carrierFsCode );
            flightInfo.planeIata = item.flightEquipment.scheduledEquipmentIataCode;
            flightInfo.planeType = findFieldValue( arriveEquipments, item.flightEquipment.scheduledEquipmentIataCode );
            flightInfo.destinationCity = findFieldValue( arriveAirports, item.arrivalAirportFsCode )
            flightInfo.sheduledTime = item.arrivalDate.dateLocal.split( "T" )[ 1 ];
            if ( ( typeof( item.delays ) !== "undefined" ) && ( typeof( item.delays.arrivalGateDelayMinutes ) !== "undefined" ) ) {
                flightInfo.flightStatus = item.delays.arrivalGateDelayMinutes;
            } else flightInfo.flightStatus = "";
            if ( typeof( item.codeshares ) !== "undefined" ) {
                var tempItem = [];
                for ( var i = 0; i < item.codeshares.length; i++ ) {
                    tempItem.push( item.codeshares[ i ].fsCode + item.codeshares[ i ].flightNumber );
                };
                flightInfo.comments = tempItem.join( "\n" );
            } else flightInfo.comments = "";
            flightStatusesBase.push( flightInfo );
        } );
        loadArriveBase = true;
        arrayToTable( flightStatusesBase );
    };
    var onerror = function() {
        alert( "error" );
    };
    var today = new Date(),
    day = today.getDate(),
    hour = today.getHours(),
    departUrl = "https://api.flightstats.com/flex/flightstatus/rest/v2/jsonp/airport/status/SVO/dep/2015/8/" + day + "/" + hour + "?appId=6b5959c3&appKey=eb2505539470ee19b8764dddfec358be&utc=false&numHours=4&maxFlights=100",
    arriveUrl = "https://api.flightstats.com/flex/flightstatus/rest/v2/jsonp/airport/status/SVO/arr/2015/8/" + day + "/" + hour + "?appId=6b5959c3&appKey=eb2505539470ee19b8764dddfec358be&utc=false&numHours=4&maxFlights=100";

    $.ajax( {
        dataType: "jsonp",
        jsonp: "callback",
        type: "GET",
        url: departUrl
    } )
    .done( onsuccessDepart )
    .fail( onerror );
    $.ajax( {
        dataType: "jsonp",
        jsonp: "callback",
        type: "GET",
        url: arriveUrl
    } )
    .done( onsuccessArrive )
    .fail( onerror );
};
$( document ).ready( function() {
    $.getJSON( "/airlines.json", function( data ) {
        main( data );
    } );
} );
