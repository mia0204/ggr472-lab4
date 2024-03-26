/*--------------------------------------------------------------------
GGR472 LAB 4: Incorporating GIS Analysis into web maps using Turf.js 
--------------------------------------------------------------------*/

/*--------------------------------------------------------------------
Step 1: INITIALIZE MAP
--------------------------------------------------------------------*/
// Define access token
mapboxgl.accessToken = 'pk.eyJ1Ijoid3h5dWUwMjA0IiwiYSI6ImNsc2kzd2psZzJkZnMybXF1amZmbjJreWsifQ.Tavjo7Jout4NA8fo4YYY4A'; //****ADD YOUR PUBLIC ACCESS TOKEN*****

// Initialize map and edit to your preference
const map = new mapboxgl.Map({
    container: 'map', // container id in HTML
    style: 'mapbox://styles/mapbox/light-v11',  // ****ADD MAP STYLE HERE *****
    center: [-79.39, 43.65],  // starting point, longitude/latitude
    zoom: 12 // starting zoom level
});


// Add zoom and rotation controls 
map.addControl(new mapboxgl.NavigationControl());

// Add fullscreen option to the map
map.addControl(new mapboxgl.FullscreenControl());

// Create geocoder variable, only show Toronto area results
const geocoder = new MapboxGeocoder({
    accessToken: mapboxgl.accessToken,
    mapboxgl: mapboxgl,
    countries: "ca",
    place: "Toronto"
});
// Position geocoder on page
document.getElementById('geocoder').appendChild(geocoder.onAdd(map));

/*--------------------------------------------------------------------
Step 2: VIEW GEOJSON POINT DATA ON MAP
--------------------------------------------------------------------*/
//HINT: Create an empty variable
//      Use the fetch method to access the GeoJSON from your online repository
//      Convert the response to JSON format and then store the response in your new variable
let collisiongeojson;

fetch('https://raw.githubusercontent.com/mia0204/ggr472-lab4/main/data/pedcyc_collision_06-21.geojson')
    .then(response => response.json())
    .then(response => {
        console.log(response); //Check response in console
        collisiongeojson = response; // Store geojson as variable using URL from fetch response
    });


/*--------------------------------------------------------------------
    Step 3: CREATE BOUNDING BOX AND HEXGRID
--------------------------------------------------------------------*/
//HINT: All code to create and view the hexgrid will go inside a map load event handler
//      First create a bounding box around the collision point data then store as a feature collection variable
//      Access and store the bounding box coordinates as an array variable
//      Use bounding box coordinates as argument in the turf hexgrid function
map.on('load', () => {

    let bboxgeojson;
    let bbox = turf.envelope(collisiongeojson); //create bounding box around collision points
    let bboxscaled = turf.transformScale(bbox, 1.10); //scale bounding box up by 10%

    //put the resulting envelope in a geojson format FeatureCollection
    bboxgeojson = {
        "type": "FeatureCollection",
        "features": [bboxscaled]
    };

    //create hex grid
    //must be in order: minX, minY, maxX, maxY. Select from scaled envelope
    let bboxcoords = [bboxscaled.geometry.coordinates[0][0][0],
                      bboxscaled.geometry.coordinates[0][0][1],
                      bboxscaled.geometry.coordinates[0][2][0],
                      bboxscaled.geometry.coordinates[0][2][1],]
    let hexgeojson = turf.hexGrid(bboxcoords, 0.5, {units: 'kilometers'});


/*--------------------------------------------------------------------
Step 4: AGGREGATE COLLISIONS BY HEXGRID
--------------------------------------------------------------------*/
//HINT: Use Turf collect function to collect all '_id' properties from the collision points data for each heaxagon
//      View the collect output in the console. Where there are no intersecting points in polygons, arrays will be empty
let collishex = turf.collect(hexgeojson, collisiongeojson, '_id', 'values');

//count the number of features inside of each hexagon and identify max value
let maxcollis = 0; //create an empty variable

collishex.features.forEach((feature) => { //set the loop
    feature.properties.COUNT = feature.properties.values.length //count the number of collisions
    if (feature.properties.COUNT > maxcollis) { //when the count is not empty
        console.log(feature);
        maxcollis = feature.properties.COUNT //update max collision each time
    }
});


// /*--------------------------------------------------------------------
// Step 5: FINALIZE YOUR WEB MAP
// --------------------------------------------------------------------*/
//HINT: Think about the display of your data and usability of your web map.
//      Update the addlayer paint properties for your hexgrid using:
//        - an expression
//        - The COUNT attribute
//        - The maximum number of collisions found in a hexagon
//      Add a legend and additional functionality including pop-up windows
map.addSource('collis-hex', {
    type: 'geojson',
    data: hexgeojson
});

map.addLayer({
    'id': 'collis-hex-fill',
    'type': 'fill',
    'source': 'collis-hex',
    'paint': {
        'fill-color': [
            'step', //use step expression
            ['get', 'COUNT'],
            '#F9E79F',
            10, '#F39C12',
            25, '#D35400'
        ],
        'fill-opacity': 0.5,
        'fill-outline-color': "white"
    }
});

//add collision point data as another layer
map.addSource('collis-point', {
    type: 'geojson',
    data: 'https://raw.githubusercontent.com/mia0204/ggr472-lab4/main/data/pedcyc_collision_06-21.geojson'
});

map.addLayer({
    'id': 'collision',
    'type': 'circle',
    'source': 'collis-point',
    'paint': {
        'circle-radius': 3,
        'circle-color': '#633974',
        'circle-stroke-width': 1,
        'circle-stroke-color': 'white'
    }
});

//pop-up and click event
//Switch cursor to pointer when mouse is over collision point
map.on('mouseenter', 'collision', () => {
    map.getCanvas().style.cursor = 'pointer'; 
});

//Switch cursor back when mouse leaves collision point
map.on('mouseleave', 'collision', () => {
    map.getCanvas().style.cursor = ''; 
});

//pop-up showing description of collision point getting clicked
map.on('click', 'collision', (e) => {
    new mapboxgl.Popup() 
        .setLngLat(e.lngLat) 
        .setHTML("<b>Year of Collision:</b> " + e.features[0].properties.YEAR + "<br>" +
            "<b>Location (Neighborhood): </b>" + e.features[0].properties.NEIGHBOURHOOD_158 + "<br>" +
            "<b>Type: </b>" + e.features[0].properties.INVTYPE + "<br>" +
            "<b>Injury: </b>" + e.features[0].properties.INJURY)//Use click event properties to write text for popup
        .addTo(map); //Show popup on map
});

//Interactivity
//change collision layer display based on check box using setLayoutProperty method
document.getElementById('layercheck').addEventListener('change', (e) => {
    map.setLayoutProperty(
        'collision',
        'visibility',
        e.target.checked ? 'visible' : 'none'
    );
});

});