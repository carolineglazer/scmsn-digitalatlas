require([
    "esri/portal/Portal",
    "esri/identity/OAuthInfo",
    "esri/identity/IdentityManager",
    "esri/core/Collection",
    "esri/Map",
    "esri/views/MapView",
    "esri/layers/FeatureLayer",
    "esri/layers/GroupLayer",
    "esri/widgets/LayerList",
    "dojo/on",
    "dojo/dom"
], function(
    Portal, OAuthInfo, identityManager, Collection, Map, MapView, 
    FeatureLayer, GroupLayer, LayerList, on, dom) {

    // ArcGIS Enterprise Portals are also supported
    var portalUrl = "https://www.arcgis.com/sharing";

    // subsitute your own client_id to identify who spawned the login and check for a matching redirect URI
    var info = new OAuthInfo({
        appId: "62qRJPFOZfeFvpoW",
        popup: false // inline redirects don't require any additional app configuration
    });
    identityManager.registerOAuthInfos([info]);

    // send users to arcgis.com to login
    on(dom.byId("sign-in"), "click", function() {
        identityManager.getCredential(portalUrl);
    });

    // log out and reload
    on(dom.byId("sign-out"), "click", function() {
        identityManager.destroyCredentials();
        window.location.reload();
    });

    // persist logins when the page is refreshed
    identityManager.checkSignInStatus(portalUrl).then(
        function() {
            dom.byId('anonymousPanel').style.display = 'none';
            dom.byId('personalizedPanel').style.display = 'block';

            // display the map once the user is logged in
            displayMap();
        }
    );

    function displayMap() {
        var portal = new Portal();

        // Once the portal has loaded, the user is signed in
        portal.load().then(function() {

            dom.byId('viewDiv').style.display = 'flex';

            var map = new Map({
                basemap: "gray"
            });

            var view = new MapView({
                container: "viewDiv",
                map: map,
                zoom: 10,
                center: [-122.106, 37.358]
            });

            var templateSurveys = {
                title: "Stewardship Survey",
                content: "{*}"
            };

            var templateEI = {
                title: "Ecosystem Integrity",
                content: "{*}"
            }

            // Get feature layers for SCMSN Stewardship Survey Responses
            surveysArray = new Collection;
            for (var i = 0; i < 14; i++) {
                var featureLayer = new FeatureLayer({
                    url: 'https://services.arcgis.com/7CRlmWNEbeCqEJ6a/arcgis/rest/services/Stewardship_Data_Aggregated_by_Stewardship_Activity/FeatureServer/'+i.toString(10),
                    outFields: ["*"],
                    popupTemplate: templateSurveys
                })
                console.log(featureLayer.url)
                surveysArray.add(featureLayer);
            }

            // Get feature layers for Ecosystem Integrity Group
            ecosystemIntegrityArray = new Collection;
            var ei_fl = new FeatureLayer({
                url: 'https://services.arcgis.com/7CRlmWNEbeCqEJ6a/arcgis/rest/services/Ecosystem_Integrity_Indicators_08122020/FeatureServer',
                outFields: ["*"],
                popupTemplate: templateEI
            })
            ecosystemIntegrityArray.add(ei_fl);

            // Initialize the layer list widget
            var layerList = new LayerList({
                view: view,
                listItemCreatedFunction: function(event) {
                    var item = event.item;
                    // build legends for all listitems within groups
                    if (item.layer.type != "group") {
                        // open legend for patch indicators
                        if (item.layer.title.startsWith("Ecosystem Integrity Indicators")) {
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
                    // Stewardship Surveys layers not visible by default
                    if (item.layer.type == "group" && item.title == "Stewardship Surveys") {
                        item.visible = false;
                    }
                    // Fix the titles for Stewardship Survey Aggregated Data
                    // if (item.layer.title.startsWith("Stewardship Data Aggregated") && item.layer.title.length > 54) {
                    //     item.layer.title = item.layer.title.substring(54);
                    //     console.log(item.layer.title)
                    // };   
                }
            });

            // Define group layers
            var surveyGroup = new GroupLayer({
                title: "Stewardship Surveys",
                layers: surveysArray,
            });
            var ecosystemIntegrityGroup = new GroupLayer({
                title: "Ecosystem Integrity",
                layers: ecosystemIntegrityArray,
            });

            // Add layer list widget below other elements in the top right corner of the view
            view.ui.add(layerList, {
                position: "top-right"
            });

            // Add everything to the map
            map.add(surveyGroup);
            map.add(ecosystemIntegrityGroup);  

            // var MROSD_Agriculture = new FeatureLayer({
            //     url: 'https://services.arcgis.com/7CRlmWNEbeCqEJ6a/arcgis/rest/services/StewardshipSurvey_AllResponses/FeatureServer/1'
            // });
            // var SCOVSA_Agriculture = new FeatureLayer({
            //     url: 'https://services.arcgis.com/7CRlmWNEbeCqEJ6a/arcgis/rest/services/StewardshipSurvey_AllResponses/FeatureServer/2'
            // });
            // var StateParks_Agriculture = new FeatureLayer({
            //     url: 'https://services.arcgis.com/7CRlmWNEbeCqEJ6a/arcgis/rest/services/StewardshipSurvey_AllResponses/FeatureServer/3'
            // })
            // var UCSC_Agriculture = new FeatureLayer({
            //     url: 'https://services.arcgis.com/7CRlmWNEbeCqEJ6a/arcgis/rest/services/StewardshipSurvey_AllResponses/FeatureServer/4'
            // });
            // var MROSD_CulturalResources_yn = new FeatureLayer({
            //     url: 'https://services.arcgis.com/7CRlmWNEbeCqEJ6a/arcgis/rest/services/StewardshipSurvey_AllResponses/FeatureServer/6'
            // });
            // var SCVOSA_CulturalResources_yn = new FeatureLayer({
            //     url: 'https://services.arcgis.com/7CRlmWNEbeCqEJ6a/arcgis/rest/services/StewardshipSurvey_AllResponses/FeatureServer/7'
            // });                    
            // var BLM_FuelsReduction = new FeatureLayer({
            //     url: 'https://services.arcgis.com/7CRlmWNEbeCqEJ6a/arcgis/rest/services/StewardshipSurvey_AllResponses/FeatureServer/9'
            // });
            // var GirlScouts_FuelsReduction = new FeatureLayer({
            //     url: 'https://services.arcgis.com/7CRlmWNEbeCqEJ6a/arcgis/rest/services/StewardshipSurvey_AllResponses/FeatureServer/10'
            // });
            // var GirlScouts_FuelsReduction_yn = new FeatureLayer({
            //     url: 'https://services.arcgis.com/7CRlmWNEbeCqEJ6a/arcgis/rest/services/StewardshipSurvey_AllResponses/FeatureServer/11'
            // });
            // var JRBP_FuelsReduction = new FeatureLayer({
            //     url: 'https://services.arcgis.com/7CRlmWNEbeCqEJ6a/arcgis/rest/services/StewardshipSurvey_AllResponses/FeatureServer/12'
            // });
            // var SanMateo_FuelsReduction = new FeatureLayer({
            //     url: 'https://services.arcgis.com/7CRlmWNEbeCqEJ6a/arcgis/rest/services/StewardshipSurvey_AllResponses/FeatureServer/13'
            // });
            // var SantaCruzCountyParks_FuelsReduction_yn = new FeatureLayer({
            //     url: 'https://services.arcgis.com/7CRlmWNEbeCqEJ6a/arcgis/rest/services/StewardshipSurvey_AllResponses/FeatureServer/14'
            // });
            // var StateParks_FuelsReduction = new FeatureLayer({
            //     url: 'https://services.arcgis.com/7CRlmWNEbeCqEJ6a/arcgis/rest/services/StewardshipSurvey_AllResponses/FeatureServer/15'
            // })
            // var StateParks_FuelsReduction_pts = new FeatureLayer({
            //     url: 'https://services.arcgis.com/7CRlmWNEbeCqEJ6a/arcgis/rest/services/StewardshipSurvey_AllResponses/FeatureServer/16'
            // })
            // var UCSC_FuelsReduction = new FeatureLayer({
            //     url: 'https://services.arcgis.com/7CRlmWNEbeCqEJ6a/arcgis/rest/services/StewardshipSurvey_AllResponses/FeatureServer/17'
            // });
            // var MROSD_Grazing = new FeatureLayer({
            //     url: 'https://services.arcgis.com/7CRlmWNEbeCqEJ6a/arcgis/rest/services/StewardshipSurvey_AllResponses/FeatureServer/19'
            // });
            // var SCVOSA_Grazing = new FeatureLayer({
            //     url: 'https://services.arcgis.com/7CRlmWNEbeCqEJ6a/arcgis/rest/services/StewardshipSurvey_AllResponses/FeatureServer/20'
            // });
            // var SCVOSA_Grazing2 = new FeatureLayer({
            //     url: 'https://services.arcgis.com/7CRlmWNEbeCqEJ6a/arcgis/rest/services/StewardshipSurvey_AllResponses/FeatureServer/21'
            // });
            // var UCSC_Grazing = new FeatureLayer({
            //     url: 'https://services.arcgis.com/7CRlmWNEbeCqEJ6a/arcgis/rest/services/StewardshipSurvey_AllResponses/FeatureServer/22'
            // });
            // var SantaClaraValley_HabitatPlan = new FeatureLayer({
            //     url: 'https://services.arcgis.com/7CRlmWNEbeCqEJ6a/arcgis/rest/services/StewardshipSurvey_AllResponses/FeatureServer/23'
            // });
            // var UCSC_Indigenous_estimate = new FeatureLayer({
            //     url: 'https://services.arcgis.com/7CRlmWNEbeCqEJ6a/arcgis/rest/services/StewardshipSurvey_AllResponses/FeatureServer/25'
            // });
            // var StateParks_Indigenous = new FeatureLayer({
            //     url: 'https://services.arcgis.com/7CRlmWNEbeCqEJ6a/arcgis/rest/services/StewardshipSurvey_AllResponses/FeatureServer/26'
            // })
            // var SanMateo_Invasives = new FeatureLayer({
            //     url: 'https://services.arcgis.com/7CRlmWNEbeCqEJ6a/arcgis/rest/services/StewardshipSurvey_AllResponses/FeatureServer/28'
            // });
            // var SCVOSA_Invasives_yn = new FeatureLayer({
            //     url: 'https://services.arcgis.com/7CRlmWNEbeCqEJ6a/arcgis/rest/services/StewardshipSurvey_AllResponses/FeatureServer/29'
            // });
            // var StateParks_Invasives = new FeatureLayer({
            //     url: 'https://services.arcgis.com/7CRlmWNEbeCqEJ6a/arcgis/rest/services/StewardshipSurvey_AllResponses/FeatureServer/30'
            // })
            // var UCSC_Invasives_estimate = new FeatureLayer({
            //     url: 'https://services.arcgis.com/7CRlmWNEbeCqEJ6a/arcgis/rest/services/StewardshipSurvey_AllResponses/FeatureServer/31'
            // });
            // var JRBP_Invasives = new FeatureLayer({
            //     url: 'https://services.arcgis.com/7CRlmWNEbeCqEJ6a/arcgis/rest/services/StewardshipSurvey_AllResponses/FeatureServer/32'
            // });
            // var all_timber = new FeatureLayer({
            //     url: 'https://services.arcgis.com/7CRlmWNEbeCqEJ6a/arcgis/rest/services/StewardshipSurvey_AllResponses/FeatureServer/67'
            // });


            // var layerListItem = {};
            // var layerList = new LayerList({
            //     view: view
            // });

            // // Adds widget below other elements in the top right corner of the view
            // view.ui.add(layerList, {
            //     position: "top-right"
            // });
            
            // // Define group layers
            // var agriculture_group = new GroupLayer({
            //     title: "Agriculture",
            //     layers: [MROSD_Agriculture,SCOVSA_Agriculture,StateParks_Agriculture,UCSC_Agriculture]
            // });
            // var culturalresources_group = new GroupLayer({
            //     title: "Cultural Resources",
            //     layers: [MROSD_CulturalResources_yn,SCVOSA_CulturalResources_yn]
            // });
            // var fuelsreduction_group = new GroupLayer({
            //     title: "Fuels Reduction Treatments",
            //     layers: [BLM_FuelsReduction,GirlScouts_FuelsReduction,GirlScouts_FuelsReduction_yn,JRBP_FuelsReduction,SantaCruzCountyParks_FuelsReduction_yn,SanMateo_FuelsReduction,StateParks_FuelsReduction,StateParks_FuelsReduction_pts,UCSC_FuelsReduction]
            // });
            // var grazing_group = new GroupLayer({
            //     title: "Grazing",
            //     layers: [MROSD_Grazing, UCSC_Grazing, SCVOSA_Grazing, SCVOSA_Grazing2]
            // });
            // var habitatplans_group = new GroupLayer({
            //     title: "Habitat Conservation Plans",
            //     layers: [SantaClaraValley_HabitatPlan]
            // });
            // var indigenous_group = new GroupLayer({
            //     title: "Indigenous Stewardship Practices",
            //     layers: [StateParks_Indigenous,UCSC_Indigenous_estimate]
            // });
            // var invasives_group = new GroupLayer({
            //     title: "Invasives Species Management",
            //     layers: [JRBP_Invasives,SanMateo_Invasives, SCVOSA_Invasives_yn, StateParks_Invasives, UCSC_Invasives_estimate]
            // }); 
            // var timber_group = new GroupLayer({
            //     title: "Timber Harvest",
            //     layers: [all_timber]
            // });
            
            // // Add group layers to map
            // map.add(timber_group);
            // map.add(invasives_group);
            // map.add(indigenous_group);
            // map.add(habitatplans_group);
            // map.add(grazing_group);
            // map.add(fuelsreduction_group);
            // map.add(culturalresources_group)
            // map.add(agriculture_group);

            // Popups on click: https://developers.arcgis.com/javascript/latest/guide/add-layers-to-a-map/

        });
    }
});