var dplaMap={}
dplaMap.API_KEY = "0826ae9d2c064f8c8582859abf50f7d6"
dplaMap.PAGE_SIZE = 100;
dplaMap.MAX_RESULTS = 500;
dplaMap.firstDraw = true;
dplaMap.skipLookup = false;
dplaMap.markers={};

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
        zoom: getZoom() - 2,
        center: loc,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    };

    dplaMap.map = new google.maps.Map(document.getElementById("map_canvas"), opts);
    dplaMap.oms = new OverlappingMarkerSpiderfier(dplaMap.map, {markersWontMove: true, markersWontHide: true});
    var info = new google.maps.InfoWindow();
    dplaMap.oms.addListener('click', function(marker) {
	console.log('Click');
	info.setContent(marker.desc);
	info.open(dplaMap.map, marker);
    });
    var marker = new google.maps.Marker({
        map: dplaMap.map,
        position: loc,
        icon: getCenterpin(),
        title: 'Current Location',
    });

    google.maps.event.addListener(dplaMap.map, 'idle', lookupDocs);
    google.maps.event.addListener(dplaMap.map, 'bounds_changed', cancelLookup);
}

function lookupDocs() {
    if (dplaMap.skipLookup) {
	dplaMap.skipLookup = false;
	return;
    }
    dplaMap.count = 0;
    dplaMap.page = 0;
    var center = dplaMap.map.getCenter();
    dplaMap.lat = center.jb;
    dplaMap.lon = center.kb;

    var mapBounds = dplaMap.map.getBounds();
    var sw = mapBounds.getSouthWest();
    var ne = mapBounds.getNorthEast();
    var nw = new google.maps.LatLng(ne.lat(), sw.lng());
    // assumes map wider than tall
    var lonWidth = google.maps.geometry.spherical.computeDistanceBetween(ne, nw)
    dplaMap.radius = parseInt(lonWidth / 2 / 1000) + "km";

    clearMarkers(mapBounds);
    dplaMap.markerBounds = new google.maps.LatLngBounds();
    lookupByLocation(dplaMap.lat,dplaMap.lon,dplaMap.radius,dplaMap.page,true);
}

function lookupByLocation(lat,lon,radius,page,sorted) {
    url = "http://api.dp.la/v2/items?sourceResource.spatial.distance=" + radius
	  + "&page_size=" + dplaMap.PAGE_SIZE
          + "&sourceResource.spatial.coordinates=" + lat + "," + lon
          + "&page=" + page + "&api_key=" + dplaMap.API_KEY;
    if (sorted) {
	url += "&sort_by_pin=" + lat + "," + lon + "&sort_by=sourceResource.spatial.coordinates";
    }
    console.log("fetching results from dpla: " + url);
    dplaMap.ajaxRequest = $.ajax({url: url, dataType: "jsonp", success: displayDocs});
}

function cancelLookup() {
    if (dplaMap.ajaxRequest) {
	dplaMap.ajaxRequest.abort();
    }
}

function clearMarkers(mapBounds) {
    var markers = dplaMap.oms.getMarkers();
    for (var i=0; i < markers.length; i++) {
	var marker = markers[i];
	// Remove any markers outside our map bounds
	if (!mapBounds.contains(marker.getPosition())) {
	    marker.setMap(null);
	    dplaMap.oms.removeMarker(marker);
	    delete dplaMap.markers[marker.dplaId];
	}
    }
}

function displayDocs(data) {
    var done = true;
    if (!dplaMap.firstDraw && data.docs.length == dplaMap.PAGE_SIZE 
	  && dplaMap.count < dplaMap.MAX_RESULTS - dplaMap.PAGE_SIZE) {
	dplaMap.page += 1;
	lookupByLocation(dplaMap.lat,dplaMap.lon,dplaMap.radius,dplaMap.page, true);
	done = false;
    }
    $.each(data.docs, displayDoc);
    console.log('Points mapped: ' + dplaMap.count);
    if (done && dplaMap.firstDraw) {
	dplaMap.firstDraw = false;
	// No need to refresh on next idle because we caused zoom change
	dplaMap.skipLookup = true;
	dplaMap.map.fitBounds(dplaMap.markerBounds);
	console.log('Zoomed to bounds');
    }
}

function displayDoc(index, doc) {
    dplaMap.count += 1;
    if (doc.id in dplaMap.markers) {
	return;
    }
    var loc; 
    $(doc.sourceResource.spatial).each(function(i,coord) {
	var coords = coord.coordinates;
        // TODO: We use the first set of coords we find, but it may not be the best
        if (coords && !loc) {
            coords = coords.split(",");
            var lat = parseFloat(coords[0]);
            var lon = parseFloat(coords[1]);
            loc = new google.maps.LatLng(lat, lon);
	 }
    });

    // create a marker for the subject
    if (loc) {
	    var source = doc.sourceResource;
	    var title = source.title;
	    var description = '';
	    if ('description' in source) {
                 description = source.description;
            }
	    var date = '';
	    if ('date' in source) {
                date = ' (' + source.date.displayDate + ') ';
            }
            var provider = doc.provider.name;
	    var providerId = doc.provider['@id'];

            var icon = getPushpin();

            // TODO: Choose marker based on type of resource
            var marker = new google.maps.Marker({
                map: dplaMap.map,
                icon: icon,
                position: loc,
		title: title + ' -- ' + provider + date
            });

            var recordId = doc['@id'];
	    // No link to the record included.  What a pain in the butt! Make our own
	    var recordUrl = recordId.replace('http://dp.la/api/items','http://dp.la/item');
            var viewUrl = doc.isShownAt

            // add a info window to the marker so that it displays when 
            // someone clicks on the marker
            var item = '<a target="_new" href="' + recordUrl + '">' + title + '</a>' + date;
            provider = '<a target="_new" href="' + viewUrl + '">' + provider + '</a>.';
            var html = '<span class="map_info">' + item +' from ' + provider + ' '+description+'</span>';
	    marker.desc = html;
            marker.dplaId = doc.id;
            dplaMap.markers[doc.id] = marker;
	    dplaMap.oms.addMarker(marker);
	    dplaMap.markerBounds.extend(marker.getPosition());
        }
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
    size = 30;
    return new google.maps.MarkerImage(url, new google.maps.Size(64, 64), new google.maps.Point(0, 0), new google.maps.Point(0, size), new google.maps.Size(size, size));
}

function getZoom() {
    if (is_handheld()) {
        return 15;
    } else {
        return 12;
    }
}
