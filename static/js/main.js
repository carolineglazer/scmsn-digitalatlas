require([
    "esri/portal/Portal",
    "esri/identity/OAuthInfo",
    "esri/identity/IdentityManager",
    "esri/Map",
    "esri/views/MapView",
    "esri/layers/FeatureLayer",
    "esri/layers/GroupLayer",
    "esri/widgets/LayerList",
    "dojo/dom-style",
    "dojo/dom-attr",
    "dojo/on",
    "dojo/dom"
], function(
    Portal, OAuthInfo, identityManager, Map, MapView, FeatureLayer,
    GroupLayer, LayerList, domStyle, domAttr, on, dom) {

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

            var MROSD_Agriculture = new FeatureLayer({
                url: 'https://services.arcgis.com/7CRlmWNEbeCqEJ6a/arcgis/rest/services/StewardshipSurvey_AllResponses/FeatureServer/1'
            });
            var SCOVSA_Agriculture = new FeatureLayer({
                url: 'https://services.arcgis.com/7CRlmWNEbeCqEJ6a/arcgis/rest/services/StewardshipSurvey_AllResponses/FeatureServer/2'
            });
            var StateParks_Agriculture = new FeatureLayer({
                url: 'https://services.arcgis.com/7CRlmWNEbeCqEJ6a/arcgis/rest/services/StewardshipSurvey_AllResponses/FeatureServer/3'
            })
            var UCSC_Agriculture = new FeatureLayer({
                url: 'https://services.arcgis.com/7CRlmWNEbeCqEJ6a/arcgis/rest/services/StewardshipSurvey_AllResponses/FeatureServer/4'
            });
            var MROSD_CulturalResources_yn = new FeatureLayer({
                url: 'https://services.arcgis.com/7CRlmWNEbeCqEJ6a/arcgis/rest/services/StewardshipSurvey_AllResponses/FeatureServer/6'
            });
            var SCVOSA_CulturalResources_yn = new FeatureLayer({
                url: 'https://services.arcgis.com/7CRlmWNEbeCqEJ6a/arcgis/rest/services/StewardshipSurvey_AllResponses/FeatureServer/7'
            });                    
            var BLM_FuelsReduction = new FeatureLayer({
                url: 'https://services.arcgis.com/7CRlmWNEbeCqEJ6a/arcgis/rest/services/StewardshipSurvey_AllResponses/FeatureServer/9'
            });
            var GirlScouts_FuelsReduction = new FeatureLayer({
                url: 'https://services.arcgis.com/7CRlmWNEbeCqEJ6a/arcgis/rest/services/StewardshipSurvey_AllResponses/FeatureServer/10'
            });
            var GirlScouts_FuelsReduction_yn = new FeatureLayer({
                url: 'https://services.arcgis.com/7CRlmWNEbeCqEJ6a/arcgis/rest/services/StewardshipSurvey_AllResponses/FeatureServer/11'
            });
            var JRBP_FuelsReduction = new FeatureLayer({
                url: 'https://services.arcgis.com/7CRlmWNEbeCqEJ6a/arcgis/rest/services/StewardshipSurvey_AllResponses/FeatureServer/12'
            });
            var SanMateo_FuelsReduction = new FeatureLayer({
                url: 'https://services.arcgis.com/7CRlmWNEbeCqEJ6a/arcgis/rest/services/StewardshipSurvey_AllResponses/FeatureServer/13'
            });
            var SantaCruzCountyParks_FuelsReduction_yn = new FeatureLayer({
                url: 'https://services.arcgis.com/7CRlmWNEbeCqEJ6a/arcgis/rest/services/StewardshipSurvey_AllResponses/FeatureServer/14'
            });
            var StateParks_FuelsReduction = new FeatureLayer({
                url: 'https://services.arcgis.com/7CRlmWNEbeCqEJ6a/arcgis/rest/services/StewardshipSurvey_AllResponses/FeatureServer/15'
            })
            var StateParks_FuelsReduction_pts = new FeatureLayer({
                url: 'https://services.arcgis.com/7CRlmWNEbeCqEJ6a/arcgis/rest/services/StewardshipSurvey_AllResponses/FeatureServer/16'
            })
            var UCSC_FuelsReduction = new FeatureLayer({
                url: 'https://services.arcgis.com/7CRlmWNEbeCqEJ6a/arcgis/rest/services/StewardshipSurvey_AllResponses/FeatureServer/17'
            });
            var MROSD_Grazing = new FeatureLayer({
                url: 'https://services.arcgis.com/7CRlmWNEbeCqEJ6a/arcgis/rest/services/StewardshipSurvey_AllResponses/FeatureServer/19'
            });
            var SCVOSA_Grazing = new FeatureLayer({
                url: 'https://services.arcgis.com/7CRlmWNEbeCqEJ6a/arcgis/rest/services/StewardshipSurvey_AllResponses/FeatureServer/20'
            });
            var SCVOSA_Grazing2 = new FeatureLayer({
                url: 'https://services.arcgis.com/7CRlmWNEbeCqEJ6a/arcgis/rest/services/StewardshipSurvey_AllResponses/FeatureServer/21'
            });
            var UCSC_Grazing = new FeatureLayer({
                url: 'https://services.arcgis.com/7CRlmWNEbeCqEJ6a/arcgis/rest/services/StewardshipSurvey_AllResponses/FeatureServer/22'
            });
            var SantaClaraValley_HabitatPlan = new FeatureLayer({
                url: 'https://services.arcgis.com/7CRlmWNEbeCqEJ6a/arcgis/rest/services/StewardshipSurvey_AllResponses/FeatureServer/23'
            });
            var UCSC_Indigenous_estimate = new FeatureLayer({
                url: 'https://services.arcgis.com/7CRlmWNEbeCqEJ6a/arcgis/rest/services/StewardshipSurvey_AllResponses/FeatureServer/25'
            });
            var StateParks_Indigenous = new FeatureLayer({
                url: 'https://services.arcgis.com/7CRlmWNEbeCqEJ6a/arcgis/rest/services/StewardshipSurvey_AllResponses/FeatureServer/26'
            })
            var SanMateo_Invasives = new FeatureLayer({
                url: 'https://services.arcgis.com/7CRlmWNEbeCqEJ6a/arcgis/rest/services/StewardshipSurvey_AllResponses/FeatureServer/28'
            });
            var SCVOSA_Invasives_yn = new FeatureLayer({
                url: 'https://services.arcgis.com/7CRlmWNEbeCqEJ6a/arcgis/rest/services/StewardshipSurvey_AllResponses/FeatureServer/29'
            });
            var StateParks_Invasives = new FeatureLayer({
                url: 'https://services.arcgis.com/7CRlmWNEbeCqEJ6a/arcgis/rest/services/StewardshipSurvey_AllResponses/FeatureServer/30'
            })
            var UCSC_Invasives_estimate = new FeatureLayer({
                url: 'https://services.arcgis.com/7CRlmWNEbeCqEJ6a/arcgis/rest/services/StewardshipSurvey_AllResponses/FeatureServer/31'
            });
            var JRBP_Invasives = new FeatureLayer({
                url: 'https://services.arcgis.com/7CRlmWNEbeCqEJ6a/arcgis/rest/services/StewardshipSurvey_AllResponses/FeatureServer/32'
            });
            var all_timber = new FeatureLayer({
                url: 'https://services.arcgis.com/7CRlmWNEbeCqEJ6a/arcgis/rest/services/StewardshipSurvey_AllResponses/FeatureServer/67'
            });


            var layerListItem = {};
            var layerList = new LayerList({
                view: view
            });

            // Adds widget below other elements in the top right corner of the view
            view.ui.add(layerList, {
                position: "top-right"
            });
            
            // Define group layers
            var agriculture_group = new GroupLayer({
                title: "Agriculture",
                layers: [MROSD_Agriculture,SCOVSA_Agriculture,StateParks_Agriculture,UCSC_Agriculture]
            });
            var culturalresources_group = new GroupLayer({
                title: "Cultural Resources",
                layers: [MROSD_CulturalResources_yn,SCVOSA_CulturalResources_yn]
            });
            var fuelsreduction_group = new GroupLayer({
                title: "Fuels Reduction Treatments",
                layers: [BLM_FuelsReduction,GirlScouts_FuelsReduction,GirlScouts_FuelsReduction_yn,JRBP_FuelsReduction,SantaCruzCountyParks_FuelsReduction_yn,SanMateo_FuelsReduction,StateParks_FuelsReduction,StateParks_FuelsReduction_pts,UCSC_FuelsReduction]
            });
            var grazing_group = new GroupLayer({
                title: "Grazing",
                layers: [MROSD_Grazing, UCSC_Grazing, SCVOSA_Grazing, SCVOSA_Grazing2]
            });
            var habitatplans_group = new GroupLayer({
                title: "Habitat Conservation Plans",
                layers: [SantaClaraValley_HabitatPlan]
            });
            var indigenous_group = new GroupLayer({
                title: "Indigenous Stewardship Practices",
                layers: [StateParks_Indigenous,UCSC_Indigenous_estimate]
            });
            var invasives_group = new GroupLayer({
                title: "Invasives Species Management",
                layers: [JRBP_Invasives,SanMateo_Invasives, SCVOSA_Invasives_yn, StateParks_Invasives, UCSC_Invasives_estimate]
            }); 
            var timber_group = new GroupLayer({
                title: "Timber Harvest",
                layers: [all_timber]
            });
            
            // Add group layers to map
            map.add(timber_group);
            map.add(invasives_group);
            map.add(indigenous_group);
            map.add(habitatplans_group);
            map.add(grazing_group);
            map.add(fuelsreduction_group);
            map.add(culturalresources_group)
            map.add(agriculture_group);

        });
    }
});