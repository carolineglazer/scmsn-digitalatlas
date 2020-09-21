require([
    "esri/core/Collection",
    "esri/core/promiseUtils",
    "esri/Map",
    "esri/Graphic",
    "esri/views/MapView",
    "esri/layers/FeatureLayer",
    "esri/layers/TileLayer",
    "esri/layers/GroupLayer",
    "esri/layers/GraphicsLayer",
    "esri/geometry/geometryEngine",
    "esri/widgets/LayerList",
    "esri/widgets/Slider",
    "esri/widgets/Sketch/SketchViewModel",
    "dojo/on",
    "dojo/dom"
], function(
    Collection, promiseUtils, Map, Graphic, MapView, FeatureLayer, TileLayer, GroupLayer, 
    GraphicsLayer, geometryEngine, LayerList, Slider, SketchViewModel, on, dom) {

    displayMap();

    function displayMap() {

        dom.byId('viewDiv').style.display = 'flex';
        dom.byId('drawDiv').style.display = 'block';

        var map = new Map({
            basemap: "gray"
        });

        var view = new MapView({
            container: "viewDiv",
            map: map,
            zoom: 10,
            center: [-122.106, 37.358]
        });

        // Define GraphicsLayers for sketching polygons
        var sketchLayer = new GraphicsLayer();
        var bufferLayer = new GraphicsLayer();

        var mapLayer = null;
        var mapLayerView = null;
        var bufferSize = 0;

        // Assisgn mapLayer (the layer which is queried after a polygon is drawn) once drawDiv is clicked
        document
            .getElementById("drawDiv")
            .addEventListener("click", drawDivClickHandler);
        function drawDivClickHandler(event) {
            drawDiv.style.display = "none";
            queryDiv.style.display = "block";
            mapLayer = map.allLayers.find(function(layer) {
                    return layer.title === document.getElementById("query-layer").value;
            });
            view.whenLayerView(mapLayer).then(function (layerView) {
                mapLayerView = layerView;
                mapLayer.outFields = ["*"];
            })
            .catch(function(){
                document.getElementById("drawDiv").style.display = "block";
                alert("Please wait for map to finish loading");
                document.getElementById("queryDiv").style.display = "none";
            })
        };

        // Use SketchViewModel to draw polygons that are used as a query
        var sketchGeometry = null;
        var sketchViewModel = new SketchViewModel({
            layer: sketchLayer,
            defaultUpdateOptions: {
                tool: "reshape",
                toggleToolOnClick: false
            },
            view: view,
            defaultCreateOptions: { hasZ: false }
        });

        // Geometry drawing stuff - sketchViewModel
        sketchViewModel.on("create", function (event) {
            if (event.state === "complete") {
                sketchGeometry = event.graphic.geometry;
                runQuery();
            }
        });
        sketchViewModel.on("update", function(event) {
            if (event.state === "complete") {
                sketchGeometry = event.graphics[0].geometry;
                runQuery();
            }
        });

        // draw geometry buttons - use the selected geometry to sktech
        document
            .getElementById("point-geometry-button")
            .addEventListener("click", geometryButtonsClickHandler);
        document
            .getElementById("line-geometry-button")
            .addEventListener("click", geometryButtonsClickHandler);
        document
            .getElementById("polygon-geometry-button")
            .addEventListener("click", geometryButtonsClickHandler);
        document
            .getElementById("toggle")
            .addEventListener("click", function() {
                document.getElementById("queryDiv").style.display = "none";
                document.getElementById("drawDiv").style.display = "block";
                clearGeometry();
                clearHighlighting();
            });
        function geometryButtonsClickHandler(event) {
            var geometryType = event.target.value;
            clearGeometry();
            sketchViewModel.create(geometryType);
        }

        // Define buffer value slider, min/max in meters
        var bufferNumSlider = new Slider({
            container: "bufferNum",
            min: 0,
            max: 2500,
            steps: 5,
            visibleElements: {
                labels: true
            },
            precision: 0,
            labelFormatFunction: function (value, type) {
                return value.toString() + "m";
            },
            values: [0]
        });
        // get user entered values for buffer
        bufferNumSlider.on(
            ["thumb-change", "thumb-drag"],
            bufferVariablesChanged
        );
        function bufferVariablesChanged(event) {
            bufferSize = event.value;
            runQuery();
        }
        // Clear the geometry and set the default renderer
        document
            .getElementById("clearGeometry")
            .addEventListener("click", clearGeometry);

        // Clear the geometry and set the default renderer
        function clearGeometry() {
            sketchGeometry = null;
            sketchViewModel.cancel();
            sketchLayer.removeAll();
            bufferLayer.removeAll();
            clearHighlighting();
            clearCharts();
            document.getElementById("count").innerHTML = "0";
            resultDiv.style.display = "none";
        }

        // set the geometry query on the visible MapLayerView
        var debouncedRunQuery = promiseUtils.debounce(function () {
            if (!sketchGeometry) {
                return;
            }

            resultDiv.style.display = "block";
            updateBufferGraphic(bufferSize);
            return promiseUtils.eachAlways([
                queryStatistics(),
                updateMapLayer()
            ]);
        });

        function runQuery() {
            debouncedRunQuery().catch((error) => {
                if (error.name === "AbortError") {
                    return;
                }
                console.error(error);
            });
        }

        // Set the renderer with objectIds
        var highlight = null;
        function clearHighlighting() {
            if (highlight) {
                highlight.remove();
                highlight = null;
            }
        }

        function highlightObjects(result) {
            clearHighlighting();
            document.getElementById("count").innerHTML = result.features.length;
            highlight = mapLayerView.highlight(result.features);
        }

        // update the graphic with buffer
        function updateBufferGraphic(buffer) {
            //add a polygon graphic for the buffer
            if (buffer > 0) {
                var bufferGeometry = geometryEngine.geodesicBuffer(
                    sketchGeometry,
                    buffer,
                    "meters"
                );
                if (bufferLayer.graphics.length === 0) {
                    bufferLayer.add(
                        new GraphicsLayer({
                            geometry: bufferGeometry,
                            sybmol: sketchViewModel.polygonSymbol
                        })
                    );
                } else {
                    bufferLayer.graphics.getItemAt(0).geometry = bufferGeometry;
                }
            } else {
                bufferLayer.removeAll();
            }
        }

        function updateMapLayer() {
            var query = mapLayer.createQuery();
            query.geometry = sketchGeometry;
            query.distance = bufferSize;
            return mapLayer.queryFeatures(query).then(highlightObjects);
        }

        // var yearChart = null;
        var pctChart = null;

        function queryStatistics() {
            var statDefintions = [
                {
                    onStatisticField: "CASE WHEN PCT = 'chaparral' THEN 1 ELSE 0 END",
                    outStatisticFieldName: "chaparral",
                    statisticType: "sum"
                },
                {
                    onStatisticField: "CASE WHEN PCT = 'coastal_dunes' THEN 1 ELSE 0 END",
                    outStatisticFieldName: "coastal_dunes",
                    statisticType: "sum"
                },
                {
                    onStatisticField: "CASE WHEN PCT = 'coastal_redwood_forest' THEN 1 ELSE 0 END",
                    outStatisticFieldName: "coastal_redwood_forest",
                    statisticType: "sum"
                },
                {
                    onStatisticField: "CASE WHEN PCT = 'coastal_scrub' THEN 1 ELSE 0 END",
                    outStatisticFieldName: "coastal_scrub",
                    statisticType: "sum"
                },
                {
                    onStatisticField: "CASE WHEN PCT = 'evergreen_montane' THEN 1 ELSE 0 END",
                    outStatisticFieldName: "evergreen_montane",
                    statisticType: "sum"
                },
                {
                    onStatisticField: "CASE WHEN PCT = 'marshes_wetlands' THEN 1 ELSE 0 END",
                    outStatisticFieldName: "marshes_wetlands",
                    statisticType: "sum"
                },
                {
                    onStatisticField: "CASE WHEN PCT = 'mixed_grasslands' THEN 1 ELSE 0 END",
                    outStatisticFieldName: "mixed_grasslands",
                    statisticType: "sum"
                },
                {
                    onStatisticField: "CASE WHEN PCT = 'oak_woodlands' THEN 1 ELSE 0 END",
                    outStatisticFieldName: "oak_woodlands",
                    statisticType: "sum"
                },
                {
                    onStatisticField: "CASE WHEN PCT = 'riparian_forests' THEN 1 ELSE 0 END",
                    outStatisticFieldName: "riparian_forests",
                    statisticType: "sum"
                },
            ]
            var query = mapLayerView.layer.createQuery();
            query.geometry = sketchGeometry;
            query.distance = bufferSize;
            query.outStatistics = statDefintions;
            return mapLayerView.queryFeatures(query).then(function (result) {
                var allStats = result.features[0].attributes;
                updateChart(pctChart, [
                    allStats.chaparral,
                    allStats.coastal_dunes,
                    allStats.coastal_redwood_forest,
                    allStats.coastal_scrub,
                    allStats.evergreen_montane,
                    allStats.marshes_wetlands,
                    allStats.mixed_grasslands,
                    allStats.oak_woodlands,
                    allStats.riparian_forests
                ]);
            }, console.error);
        }

        // Update the given chart with new data
        function updateChart(chart, dataValues) {
            chart.data.datasets[0].data = dataValues;
            chart.update();
        }

        function createPCTChart() {
            var pctCanvas = document.getElementById("pct-chart");
            pctChart = new Chart(pctCanvas.getContext("2d"), {
                type: "doughnut",
                data: {
                    labels: ["Chaparral", "Coastal Dunes", "Coastal Redwood Forest", "Coastal Scrub", "Mixed Evergreen / Montane Hardwood", "Marshes or Wetlands", "Mixed Grasslands", "Oak Woodlands", "Riparian Forests"],
                    datasets: [
                        {
                            backgroundColor: [
                                "#9DAC40",
                                "#4458C3",
                                "#DF506C",
                                "#51D0E5",
                                "#F668E7",
                                "#73F056",
                                "#F5B08A",
                                "#9E698C",
                                "#5FFBC6"
                            ],
                            borderWidth: 0,
                            data: [0,0,0,0,0,0,0,0,0]
                        }
                    ]
                },
                options: {
                    responsive: false,
                    cutoutPercentage: 35,
                    legend: {
                        position: "bottom"
                    },
                    title: {
                        display: true,
                        text: "Plant Cover Type (# of patches)"
                    }
                }
            });
        }

        function clearCharts() {
            updateChart(pctChart, [0,0,0,0,0,0,0,0,0]);
            document.getElementById("count").innerHTML = 0;
        }

        var templateEI = {
            title: "Patch-Level Ecosystem Integrity Metrics",
            content: [
                {
                    type: "fields",
                    fieldInfos: [
                        { fieldName: "PCT",
                            label: "Plant Community Type" },
                        { fieldName: "Area_hecta",
                            label: "Area, hectares" },
                        { fieldName: "ENN",
                            label: "Euclidean Nearest Neighbor (of same PCT)" },
                        { fieldName:"Shape Index",
                            label: "Shape Index" },
                        { fieldName: "Perim_Area",
                            label: "Perimeter to Area Ratio (meters:hectares)" },
                        { fieldName: "vegrisk_m",
                            label: "Vegetation Risk to Drought, Mean" },
                        { fieldName: "vegrisk_sd",
                            label: "vegetation Risk to Drought, Stdd" },
                        { fieldName: "EssentialP",
                            label: "CLN2 'Essential' Percentage" },
                        { fieldName: "NIRv_mean",
                            label: "NIRv, Mean" },
                        { fieldName: "NIRv_stdd",
                            label: "NIRv, Stdd" },
                        { fieldName: "NDVI_mean",
                            label: "NDVI, Mean" },
                        { fieldName: "NDVI_stdd",
                            label: "NDVI, Stdd" },
                        { fieldName: "HM_90_mean",
                            label: "Human Modification, 90m, Mean" },
                        { fieldName: "HM_90_stdd",
                            label: "Human Modification, 90m, Stdd" },    
                        { fieldName: "nearby",
                            label: "# of Patches w/in 2.5km" },
                        { fieldName: "med_ps_ex",
                            label: "Median Area of Patches w/in 2.5km" },
                        { fieldName: "patch_id",
                            label: "Patch ID" }
                    ]
                }
            ] 
        };
            
        // Get feature layers for Ecosystem Integrity Group
        ecosystemIntegrityArray = new Collection;
        var ei_fl = new FeatureLayer({
            url: 'https://services.arcgis.com/7CRlmWNEbeCqEJ6a/arcgis/rest/services/Ecosystem_Integrity_Indicators_08122020/FeatureServer',
            outFields: ["*"],
            popupTemplate: templateEI
        })
        ecosystemIntegrityArray.add(ei_fl);            

        // layerList
        view.when(function() {
            // Kinda hacky way to hide two untitled layers (mapLayer and mapLayerView) from layerList
            var hideLayer = view.map.layers.flatten(function(item){
                return item.layers || item.sublayers;
            }).find(function(layer){
                return layer.title == null;
            });
            hideLayer.listMode = "hide";
            hideLayer.title = "hidden";
            var hideLayer = view.map.layers.flatten(function(item){
                return item.layers || item.sublayers;
            }).find(function(layer){
                return layer.title == null;
            });
            hideLayer.listMode = "hide";
            // Initialize the layer list widget
            var layerList = new LayerList({
                view: view,
                listItemCreatedFunction: function(event) {
                    var item = event.item;
                    // build legends for all listitems within groups
                    if (item.layer.type == "feature") {
                        // open legend for survey layers
                        if (item.layer.title.startsWith("Ecosystem Integrity Indicator")) {
                            item.panel = {
                                content: "legend",
                                open: true
                            }
                        // close legend otherwise
                        } else {
                            item.panel = {
                                content: "legend",
                                open: false
                            }
                        };
                    };
                    // NDVI and NIRv layers not visible by default
                    if (item.layer.title == "NDVI" || item.layer.title == "NIRv") {
                        item.visible = false;
                    }
                }
            });
            // Add layerList to the UI
            view.ui.add(layerList, {
                position: "top-right"
            });
        });
        
        var ecosystemIntegrityGroup = new GroupLayer({
            title: "Ecosystem Integrity",
            layers: ecosystemIntegrityArray,
        });

        // Add all query/result/draw divs to the page
        view.ui.add([queryDiv], "bottom-left");
        view.ui.add([resultDiv], "bottom-left");
        view.ui.add([drawDiv], "bottom-left");

        // Add everything to the map
        map.add(ecosystemIntegrityGroup)
        // Add sketch layer to view.map
        view.map.addMany([bufferLayer, sketchLayer]);

        // Create PCT Chart
        createPCTChart();

    }
});