var map;

function main() {
    if (Modernizr.geolocation) {
        navigator.geolocation.getCurrentPosition(lookup);
    } else {
        displayError();
    }
}

function lookup(position) {
    var lat = parseFloat(position.coords.latitude);
    var lon = parseFloat(position.coords.longitude);
    var accuracy = position.coords.accuracy;

    // allow lat/lon override
    var m = window.location.search.match(/lat=([0-9.\-]+)&lon=([0-9.\-]+)/);
    if (m) {
        lat = parseFloat(m[1]);
        lon = parseFloat(m[2]);
    }

    // update the form with whatever coords we're using
    $('input[name="lat"]').val(lat);
    $('input[name="lon"]').val(lon);

    var loc = new google.maps.LatLng(lat, lon);
    var opts = {
        zoom: getZoom() - 5,
        center: loc,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    };

    url = "http://api.dp.la/v1/items?spatial.distance=500mi&page_size=500&spatial.coordinates=" + lat + "," + lon;
    $.ajax({url: url, dataType: "jsonp", success: displayDocs});
    map = new google.maps.Map(document.getElementById("map_canvas"), opts);

    var marker = new google.maps.Marker({
        map: map,
        position: loc,
        icon: getCenterpin(),
        title: 'Current Location',
    });

}

function displayDocs(data) {
    $.each(data.docs, displayDoc);
}

function displayDoc(index, doc) {
    $(doc.spatial).each(function(i, coord) {

        // create a marker for the subject
        var coords = coord.coordinates;
        if (coords) {

            coords = coords.split(",");
            var lat = parseFloat(coords[0]);
            var lon = parseFloat(coords[1]);
            var loc = new google.maps.LatLng(lat, lon);

            var icon = getPushpin();

            var marker = new google.maps.Marker({
                map: map,
                icon: icon,
                position: loc,
                title: doc.title 
            });

            var url = doc.dplaSourceRecord.handle[2];

            // add a info window to the marker so that it displays when 
            // someone clicks on the marker
            html = '<span class="map_info">' + '<a href="' + url + '">' + doc.title + '</a></span>';
            var info = new google.maps.InfoWindow({ content: html});
            info.setPosition(loc);
            google.maps.event.addListener(marker, 'click', function() {
                info.open(map, marker);
            });
        }
    });
}

function displayError() {
    html = "<p class='error'>Your browser doesn't seem to support the HTML5 geolocation API. You will need either: Firefox (3.5+), Safari (5.0+) Chrome (5.0+), Opera (10.6+), iPhone (3.0+) or Android (2.0+). Sorry!</p>";
    $("#subject_list").replaceWith(html);
}

function getPushpin() {
    return getPin("http://maps.google.com/mapfiles/kml/pushpin/red-pushpin.png");
}

function getCenterpin() {
    return getPin("http://maps.google.com/mapfiles/kml/pushpin/blue-pushpin.png");
}

function getPin(url) {
    if (is_handheld()) {
        size = 84;
    } else {
        size = 30;
    }
    return new google.maps.MarkerImage(url, new google.maps.Size(64, 64), new google.maps.Point(0, 0), new google.maps.Point(0, size), new google.maps.Size(size, size));
}

function getZoom() {
    if (is_handheld()) {
        return 15;
    } else {
        return 12;
    }
}
