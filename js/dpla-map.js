var API_KEY = "0826ae9d2c064f8c8582859abf50f7d6"
var map;
var count = 0;

function main() {
    if (Modernizr.geolocation) {
        navigator.geolocation.getCurrentPosition(makeMap);
    } else {
        displayError();
    }
}

function makeMap(position) {
    var lat = parseFloat(position.coords.latitude);
    var lon = parseFloat(position.coords.longitude);
    var loc = new google.maps.LatLng(lat, lon);

    var opts = {
        zoom: getZoom() - 4,
        center: loc,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    };

    map = new google.maps.Map(document.getElementById("map_canvas"), opts);
    var marker = new google.maps.Marker({
        map: map,
        position: loc,
        icon: getCenterpin(),
        title: 'Current Location',
    });

    google.maps.event.addListener(map, 'idle', lookupDocs);
}

function lookupDocs() {
    var center = map.getCenter();
    var lat = center.jb;
    var lon = center.kb;

    var bounds = map.getBounds();
    var sw = bounds.getSouthWest();
    var ne = bounds.getNorthEast();
    var nw = new google.maps.LatLng(ne.lat(), sw.lng());
    var lonWidth = google.maps.geometry.spherical.computeDistanceBetween(ne, nw)
    radius = parseInt(lonWidth / 1600) + "mi";

    url = "http://api.dp.la/v2/items?sourceResource.spatial.distance=" + radius + "&page_size=500&sourceResource.spatial.coordinates=" + lat + "," + lon +"&api_key=" + API_KEY;
    console.log("fetching results from dpla: " + url);
    $.ajax({url: url, dataType: "jsonp", success: displayDocs});
}

function displayDocs(data) {
    $.each(data.docs, displayDoc);
}

function displayDoc(index, doc) {
    count += 1;
    // TODO: Multiple items with same coords need to be dithered or aggregated
    $(doc.sourceResource.spatial).each(function(i, coord) {

        // create a marker for the subject
        var coords = coord.coordinates;
        if (coords) {
            coords = coords.split(",");
            var lat = parseFloat(coords[0]);
            var lon = parseFloat(coords[1]);
            var loc = new google.maps.LatLng(lat, lon);

	    var source = doc.sourceResource;
	    var title = source.title;
	    var description = '';
	    if ('description' in source) {
                 description = source.description;
            }
	    var date = '?';
	    if ('date' in source) {
                date = source.date.displayDate;
            }
            var provider = doc.provider.name;
	    var providerId = doc.provider['@id'];

            var icon = getPushpin();

            var marker = new google.maps.Marker({
                map: map,
                icon: icon,
                position: loc,
		title: title + ' -- ' + provider
            });

            var recordId = doc['@id'];
	    // No link to the record included.  What a pain in the butt!
	    var recordUrl = recordId.replace('http://dp.la/api/items','http://dp.la/item');
            var viewUrl = doc.isShownAt

            // add a info window to the marker so that it displays when 
            // someone clicks on the marker
            html = '<span class="map_info">' + '<a target="_new" href="' + viewUrl + '">' + title + '</a> from ' + provider + '.  '+description+'</span>';
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
