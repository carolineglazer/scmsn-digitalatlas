require([
        "esri/WebScene",
        "esri/views/SceneView",
        "esri/layers/GraphicsLayer",
        "esri/widgets/Sketch/SketchViewModel",
        "esri/widgets/Slider",
        "esri/geometry/geometryEngine",
        "esri/Graphic",
        "esri/core/promiseUtils"
      ], function (
        WebScene,
        SceneView,
        GraphicsLayer,
        SketchViewModel,
        Slider,
        geometryEngine,
        Graphic,
        promiseUtils
      ) {
        // Load webscene and display it in a SceneView
        const webscene = new WebScene({
          portalItem: {
            id: "fb5948b2bb76439792786000b942e5b7"
          }
        });
        // create the SceneView
        const view = new SceneView({
          container: "viewDiv",
          map: webscene
        });
        window.view = view;
        // add a GraphicsLayer for the sketches and the buffer
        const sketchLayer = new GraphicsLayer();
        const bufferLayer = new GraphicsLayer();
        view.map.addMany([bufferLayer, sketchLayer]);

        let sceneLayer = null;
        let sceneLayerView = null;
        let bufferSize = 0;

        // Assign scene layer once webscene is loaded and initialize UI
        webscene.load().then(function () {
          sceneLayer = webscene.layers.find(function (layer) {
            return layer.title === "Helsinki textured buildings";
          });
          sceneLayer.outFields = ["buildingMaterial", "yearCompleted"];

          view.whenLayerView(sceneLayer).then(function (layerView) {
            sceneLayerView = layerView;
            queryDiv.style.display = "block";
          });
        });

        view.ui.add([queryDiv], "bottom-left");
        view.ui.add([resultDiv], "top-right");

        // use SketchViewModel to draw polygons that are used as a query
        let sketchGeometry = null;
        const sketchViewModel = new SketchViewModel({
          layer: sketchLayer,
          defaultUpdateOptions: {
            tool: "reshape",
            toggleToolOnClick: false
          },
          view: view,
          defaultCreateOptions: { hasZ: false }
        });

        sketchViewModel.on("create", function (event) {
          if (event.state === "complete") {
            sketchGeometry = event.graphic.geometry;
            runQuery();
          }
        });

        sketchViewModel.on("update", function (event) {
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
        function geometryButtonsClickHandler(event) {
          const geometryType = event.target.value;
          clearGeometry();
          sketchViewModel.create(geometryType);
        }

        const bufferNumSlider = new Slider({
          container: "bufferNum",
          min: 0,
          max: 500,
          steps: 1,
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
          resultDiv.style.display = "none";
        }

        // set the geometry query on the visible SceneLayerView
        var debouncedRunQuery = promiseUtils.debounce(function () {
          if (!sketchGeometry) {
            return;
          }

          resultDiv.style.display = "block";
          updateBufferGraphic(bufferSize);
          return promiseUtils.eachAlways([
            queryStatistics(),
            updateSceneLayer()
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
        var highlightHandle = null;
        function clearHighlighting() {
          if (highlightHandle) {
            highlightHandle.remove();
            highlightHandle = null;
          }
        }

        function highlightBuildings(objectIds) {
          // Remove any previous highlighting
          clearHighlighting();
          const objectIdField = sceneLayer.objectIdField;
          document.getElementById("count").innerHTML = objectIds.length;

          highlightHandle = sceneLayerView.highlight(objectIds);
        }

        // update the graphic with buffer
        function updateBufferGraphic(buffer) {
          // add a polygon graphic for the buffer
          if (buffer > 0) {
            var bufferGeometry = geometryEngine.geodesicBuffer(
              sketchGeometry,
              buffer,
              "meters"
            );
            if (bufferLayer.graphics.length === 0) {
              bufferLayer.add(
                new Graphic({
                  geometry: bufferGeometry,
                  symbol: sketchViewModel.polygonSymbol
                })
              );
            } else {
              bufferLayer.graphics.getItemAt(0).geometry = bufferGeometry;
            }
          } else {
            bufferLayer.removeAll();
          }
        }

        function updateSceneLayer() {
          const query = sceneLayerView.createQuery();
          query.geometry = sketchGeometry;
          query.distance = bufferSize;
          return sceneLayerView.queryObjectIds(query).then(highlightBuildings);
        }

        var yearChart = null;
        var materialChart = null;

        function queryStatistics() {
          const statDefinitions = [
            {
              onStatisticField:
                "CASE WHEN buildingMaterial = 'concrete or lightweight concrete' THEN 1 ELSE 0 END",
              outStatisticFieldName: "material_concrete",
              statisticType: "sum"
            },
            {
              onStatisticField:
                "CASE WHEN buildingMaterial = 'brick' THEN 1 ELSE 0 END",
              outStatisticFieldName: "material_brick",
              statisticType: "sum"
            },
            {
              onStatisticField:
                "CASE WHEN buildingMaterial = 'wood' THEN 1 ELSE 0 END",
              outStatisticFieldName: "material_wood",
              statisticType: "sum"
            },
            {
              onStatisticField:
                "CASE WHEN buildingMaterial = 'steel' THEN 1 ELSE 0 END",
              outStatisticFieldName: "material_steel",
              statisticType: "sum"
            },
            {
              onStatisticField:
                "CASE WHEN buildingMaterial IN ('concrete or lightweight concrete', 'brick', 'wood', 'steel') THEN 0 ELSE 1 END",
              outStatisticFieldName: "material_other",
              statisticType: "sum"
            },
            {
              onStatisticField:
                "CASE WHEN (yearCompleted >= '1850' AND yearCompleted <= '1899') THEN 1 ELSE 0 END",
              outStatisticFieldName: "year_1850",
              statisticType: "sum"
            },
            {
              onStatisticField:
                "CASE WHEN (yearCompleted >= '1900' AND yearCompleted <= '1924') THEN 1 ELSE 0 END",
              outStatisticFieldName: "year_1900",
              statisticType: "sum"
            },
            {
              onStatisticField:
                "CASE WHEN (yearCompleted >= '1925' AND yearCompleted <= '1949') THEN 1 ELSE 0 END",
              outStatisticFieldName: "year_1925",
              statisticType: "sum"
            },
            {
              onStatisticField:
                "CASE WHEN (yearCompleted >= '1950' AND yearCompleted <= '1974') THEN 1 ELSE 0 END",
              outStatisticFieldName: "year_1950",
              statisticType: "sum"
            },
            {
              onStatisticField:
                "CASE WHEN (yearCompleted >= '1975' AND yearCompleted <= '1999') THEN 1 ELSE 0 END",
              outStatisticFieldName: "year_1975",
              statisticType: "sum"
            },
            {
              onStatisticField:
                "CASE WHEN (yearCompleted >= '2000' AND yearCompleted <= '2015') THEN 1 ELSE 0 END",
              outStatisticFieldName: "year_2000",
              statisticType: "sum"
            }
          ];
          const query = sceneLayerView.createQuery();
          query.geometry = sketchGeometry;
          query.distance = bufferSize;
          query.outStatistics = statDefinitions;

          return sceneLayerView.queryFeatures(query).then(function (result) {
            const allStats = result.features[0].attributes;
            updateChart(materialChart, [
              allStats.material_concrete,
              allStats.material_brick,
              allStats.material_wood,
              allStats.material_steel,
              allStats.material_other
            ]);
            updateChart(yearChart, [
              allStats.year_1850,
              allStats.year_1900,
              allStats.year_1925,
              allStats.year_1950,
              allStats.year_1975,
              allStats.year_2000
            ]);
          }, console.error);
        }

        // Updates the given chart with new data
        function updateChart(chart, dataValues) {
          chart.data.datasets[0].data = dataValues;
          chart.update();
        }

        function createYearChart() {
          const yearCanvas = document.getElementById("year-chart");
          yearChart = new Chart(yearCanvas.getContext("2d"), {
            type: "horizontalBar",
            data: {
              labels: [
                "1850-1899",
                "1900-1924",
                "1925-1949",
                "1950-1974",
                "1975-1999",
                "2000-2015"
              ],
              datasets: [
                {
                  label: "Build year",
                  backgroundColor: "#149dcf",
                  stack: "Stack 0",
                  data: [0, 0, 0, 0, 0, 0]
                }
              ]
            },
            options: {
              responsive: false,
              legend: {
                display: false
              },
              title: {
                display: true,
                text: "Build year"
              },
              scales: {
                xAxes: [
                  {
                    stacked: true,
                    ticks: {
                      beginAtZero: true,
                      precision: 0
                    }
                  }
                ],
                yAxes: [
                  {
                    stacked: true
                  }
                ]
              }
            }
          });
        }
        function createMaterialChart() {
          const materialCanvas = document.getElementById("material-chart");
          materialChart = new Chart(materialCanvas.getContext("2d"), {
            type: "doughnut",
            data: {
              labels: ["Concrete", "Brick", "Wood", "Steel", "Other"],
              datasets: [
                {
                  backgroundColor: [
                    "#FD7F6F",
                    "#7EB0D5",
                    "#B2E061",
                    "#BD7EBE",
                    "#FFB55A"
                  ],
                  borderWidth: 0,
                  data: [0, 0, 0, 0, 0]
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
                text: "Building Material"
              }
            }
          });
        }

        function clearCharts() {
          updateChart(materialChart, [0, 0, 0, 0, 0]);
          updateChart(yearChart, [0, 0, 0, 0, 0, 0]);
          document.getElementById("count").innerHTML = 0;
        }

        createYearChart();
        createMaterialChart();
      });