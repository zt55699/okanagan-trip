// 初始化地图
let map;
let routeControl;
let markers = [];

// 主要住宿地点 (corrected coordinates and added photos/links)
const hotels = {
    deltaHotel: { 
        lat: 49.891541, 
        lng: -119.496875, 
        name: "Delta Hotels Grand Okanagan Resort", 
        type: "hotel",
        image: "https://dynamic-media-cdn.tripadvisor.com/media/photo-o/0f/ca/29/3c/delta-grand-okanagan.jpg?w=400&h=250&s=1",
        link: "https://www.marriott.com/en-us/hotels/ykakd-delta-hotels-grand-okanagan-resort/overview/"
    },
    walnutBeach: { 
        lat: 49.017810, 
        lng: -119.436860, 
        name: "Walnut Beach Resort", 
        type: "hotel",
        image: "https://walnutbeachresort.com/wp-content/uploads/2019/06/Walnut-Beach-Resort-Exterior-2.jpg?w=400&h=250",
        link: "https://www.walnutbeachresort.com/"
    }
};

// 热门景点
const attractions = {
    // Highway 5 (Coquihalla) attractions
    othelloTunnels: { lat: 49.3688, lng: -121.3678, name: "Othello Tunnels", type: "hiking", description: "Historic railway tunnels through dramatic canyon walls, part of Kettle Valley Railway", image: "https://www.env.gov.bc.ca/bcparks/explore/parkpgs/coquihalla/othello-tunnels.jpg?w=400&h=250", link: "https://www.env.gov.bc.ca/bcparks/explore/parkpgs/coquihalla/" },
    coquihallaCanyon: { lat: 49.3858, lng: -121.4424, name: "Coquihalla Canyon Provincial Park", type: "hiking", description: "Former Kettle Valley Railway route with tunnels and trestles, spectacular canyon views near Hope", image: "https://bcparks.ca/wp-content/uploads/2020/03/coquihalla-canyon-tunnels.jpg?w=400&h=250", link: "https://bcparks.ca/coquihalla-canyon-park/" },
    brittonCreekRestArea: { lat: 49.651870, lng: -121.000690, name: "Britton Creek Rest Area", type: "scenic", description: "Highway 5 rest stop with washroom facilities, picnic tables, and mountain views near Coquihalla Summit", image: "https://images.drivebc.ca/bchighwaycam/pub/html/www/images/coquihalla.jpg?w=400&h=250", link: "https://www.th.gov.bc.ca/restareas/" },
    zopkiosRestArea: { lat: 49.680000, lng: -120.950000, name: "Zopkios Rest Area", type: "scenic", description: "Rest area near Coquihalla Summit with mountain views and hiking opportunities", image: "https://images.drivebc.ca/bchighwaycam/pub/html/www/images/coquihalla-summit.jpg?w=400&h=250", link: "https://www.th.gov.bc.ca/restareas/" },
    fallsLakeTrail: { lat: 49.620000, lng: -121.020000, name: "Falls Lake Trail", type: "hiking", description: "1.5km alpine lake trail with impressive mountain views, 45km north of Hope near Coquihalla Summit", image: "https://bcparks.ca/wp-content/uploads/2020/03/falls-lake-trail.jpg?w=400&h=250", link: "https://bcparks.ca/falls-lake-recreation-area/" },
    coquihallaSummit: { lat: 49.685000, lng: -120.940000, name: "Coquihalla Summit", type: "scenic", description: "Highest point on Highway 5 at 1,244m elevation with mountain views and alpine environment", image: "https://images.drivebc.ca/bchighwaycam/pub/html/www/images/coquihalla-pass.jpg?w=400&h=250", link: "https://www.drivebc.ca/" },
    
    // Highway 5A Merritt to Kamloops attractions
    nicolaLake: { lat: 50.130000, lng: -120.850000, name: "Nicola Lake", type: "scenic", description: "Large scenic lake just outside Merritt with over 20 fish species including Kokanee and Rainbow Trout", image: "https://www.tourismkamloops.com/wp-content/uploads/2020/06/nicola-lake.jpg?w=400&h=250", link: "https://www.tourismkamloops.com/" },
    beaverRanchFlats: { lat: 50.180000, lng: -120.720000, name: "Beaver Ranch Flats Conservation Area", type: "scenic", description: "Wetland conservation area for bird watching at north end of Nicola Lake, completed in 1991", image: "https://www.tourismkamloops.com/wp-content/uploads/2020/06/beaver-ranch-flats.jpg?w=400&h=250", link: "https://www.tourismkamloops.com/" },
    ladyOfLourdesChurch: { lat: 50.200000, lng: -120.650000, name: "Lady of Lourdes Log Church", type: "cultural", description: "Historic log church near Douglas Lake road turnoff, 28km north of Merritt", image: "https://www.tourismkamloops.com/wp-content/uploads/2020/06/lady-lourdes-church.jpg?w=400&h=250", link: "https://www.tourismkamloops.com/" },
    rocheLakePark: { lat: 50.630000, lng: -120.100000, name: "Roche Lake Provincial Park", type: "outdoor", description: "World-class trout fishing lakes, 75km north of Merritt and 23km south of Kamloops", image: "https://bcparks.ca/wp-content/uploads/2020/03/roche-lake-park.jpg?w=400&h=250", link: "https://bcparks.ca/roche-lake-park/" },
    trappLake: { lat: 50.500000, lng: -120.300000, name: "Trapp Lake", type: "scenic", description: "Scenic lake approximately 75km north of Merritt with fishing and camping opportunities", image: "https://www.tourismkamloops.com/wp-content/uploads/2020/06/trapp-lake.jpg?w=400&h=250", link: "https://www.tourismkamloops.com/" },
    
    // Highway 1 Fraser Canyon attractions (Hell's Gate area)
    hellsGate: { lat: 49.783300, lng: -121.450000, name: "Hell's Gate Airtram", type: "scenic", description: "Fraser River canyon views via suspension bridge and aerial tramway", image: "https://hellsgateairtram.com/wp-content/uploads/2020/05/hells-gate-airtram-view.jpg?w=400&h=250", link: "https://www.hellsgateairtram.com/" },
    bostonBar: { lat: 49.816700, lng: -121.450000, name: "Boston Bar Rest Area", type: "scenic", description: "Highway rest stop with Fraser River views and historic railway information", image: "https://www.drivebc.ca/wp-content/uploads/2020/06/boston-bar-rest-area.jpg?w=400&h=250", link: "https://www.drivebc.ca/" },
    spuzzumCreek: { lat: 49.750000, lng: -121.416700, name: "Spuzzum Creek Rest Area", type: "scenic", description: "Scenic pullout along Highway 1 with creek views and picnic tables", image: "https://www.drivebc.ca/wp-content/uploads/2020/06/spuzzum-creek-rest.jpg?w=400&h=250", link: "https://www.drivebc.ca/" },
    alexandraBridge: { lat: 49.716700, lng: -121.433300, name: "Alexandra Bridge Provincial Park", type: "scenic", description: "Historic suspension bridge over Fraser River, built 1926, scenic views and short trails", image: "https://bcparks.ca/wp-content/uploads/2020/03/alexandra-bridge.jpg?w=400&h=250", link: "https://bcparks.ca/alexandra-bridge-park/" },
    
    // Kamloops area
    monteCreekWinery: { lat: 50.6434, lng: -119.9239, name: "Monte Creek Winery", type: "wine", description: "Kamloops' largest winery with 75 acres of vines overlooking South Thompson River Valley, 10 minutes from Kamloops", image: "https://montecreekwinery.com/wp-content/uploads/2020/06/monte-creek-winery-aerial-view.jpg?w=400&h=250", link: "https://www.montecreekwinery.com/" },
    kennaCartwrightPark: { lat: 50.673, lng: -120.453, name: "Kenna Cartwright Park", type: "hiking", description: "BC's largest municipal park with 800 hectares and 40km of multi-use trails", image: "https://www.kamloops.ca/sites/default/files/styles/header_image/public/kenna-cartwright-park-view.jpg?w=400&h=250", link: "https://www.kamloops.ca/parks-recreation/parks-trails/kenna-cartwright-park" },
    petersonCreekPark: { lat: 50.677, lng: -120.334, name: "Peterson Creek Nature Park", type: "hiking", description: "100 hectares in heart of Kamloops with 10km of varied trails", image: "https://www.kamloops.ca/sites/default/files/styles/header_image/public/peterson-creek-trails.jpg?w=400&h=250", link: "https://www.kamloops.ca/parks-recreation/parks-trails/peterson-creek-nature-park" },
    
    // Kelowna area
    myraCanyon: { lat: 49.7684, lng: -119.3146, name: "Myra Canyon Trestles", type: "hiking", description: "Historic Kettle Valley Railway trail with 18 trestle bridges and 2 tunnels", image: "https://www.env.gov.bc.ca/bcparks/explore/parkpgs/myra_canyon/myra-canyon-trestle.jpg?w=400&h=250", link: "https://www.env.gov.bc.ca/bcparks/explore/parkpgs/myra_canyon/" },
    knoxMountain: { lat: 49.904440, lng: -119.492740, name: "Knox Mountain Park", type: "hiking", description: "Kelowna's largest natural park with 15 trails and panoramic lake views", image: "https://www.kelowna.ca/sites/default/files/styles/banner_image/public/knox-mountain-view.jpg?w=400&h=250", link: "https://www.kelowna.ca/parks-recreation/parks-beaches/knox-mountain-park" },
    okanaganMountainPark: { lat: 49.6666, lng: -119.4166, name: "Okanagan Mountain Provincial Park", type: "hiking", description: "10,000 hectares of rugged terrain with scenic views of Okanagan Lake", image: "https://www.env.gov.bc.ca/bcparks/explore/parkpgs/okan_mtn/okanagan-mountain-park.jpg?w=400&h=250", link: "https://www.env.gov.bc.ca/bcparks/explore/parkpgs/okan_mtn/" },
    bearCreek: { lat: 49.9250, lng: -119.5192, name: "Bear Creek Provincial Park", type: "beach", description: "400-metre sandy beach, BC's second most popular camping destination", image: "https://www.env.gov.bc.ca/bcparks/explore/parkpgs/bear_crk/bear-creek-beach.jpg?w=400&h=250", link: "https://www.env.gov.bc.ca/bcparks/explore/parkpgs/bear_crk/" },
    kelownaWaterfront: { lat: 49.8863, lng: -119.4967, name: "Kelowna Waterfront Park", type: "waterfront", description: "Downtown lakefront park with beaches, sculptures, and cultural district", image: "https://www.kelowna.ca/sites/default/files/styles/banner_image/public/waterfront-park-kelowna.jpg?w=400&h=250", link: "https://www.kelowna.ca/parks-recreation/parks-beaches/waterfront-park" },
    
    // Wineries - Kelowna area
    quailsGate: { lat: 49.8450, lng: -119.5850, name: "Quails' Gate Winery", type: "wine", description: "Premium Okanagan winery offering wine tastings and lakefront dining", image: "https://quailsgate.com/wp-content/uploads/2020/04/quails-gate-winery-view.jpg?w=400&h=250", link: "https://www.quailsgate.com/" },
    summerhillWinery: { lat: 49.8600, lng: -119.4950, name: "Summerhill Pyramid Winery", type: "wine", description: "Unique pyramid-shaped winery famous for organic and biodynamic wines", image: "https://summerhill.bc.ca/wp-content/uploads/2019/05/summerhill-pyramid.jpg?w=400&h=250", link: "https://www.summerhill.bc.ca/" },
    missionHillWinery: { lat: 49.8541, lng: -119.5624, name: "Mission Hill Family Estate", type: "wine", description: "Award-winning winery with stunning architecture and vineyard tours", image: "https://missionhillwinery.com/wp-content/uploads/2020/03/mission-hill-bell-tower.jpg?w=400&h=250", link: "https://www.missionhillwinery.com/" },
    
    // Peachland area
    pincushionMountain: { lat: 49.7866, lng: -119.7050, name: "Pincushion Mountain Trail", type: "hiking", description: "Steep hike offering panoramic views of Okanagan Lake and surrounding mountains", image: "https://cdn2.apstatic.com/photos/hike/7005073_medium_1555092309.jpg?w=400&h=250", link: "https://www.alltrails.com/trail/canada/british-columbia/pincushion-mountain" },
    hardyFalls: { lat: 49.7397, lng: -119.7645, name: "Hardy Falls Regional Park", type: "scenic", description: "Beautiful waterfall accessible via short hike along Deep Creek in 6-hectare park", image: "https://cdn2.apstatic.com/photos/hike/7005074_medium_1555092310.jpg?w=400&h=250", link: "https://www.alltrails.com/trail/canada/british-columbia/hardy-falls-trail" },
    antlersBeach: { lat: 49.7397599, lng: -119.764507, name: "Antlers Beach Regional Park", type: "beach", description: "Sandy beach directly across Highway 97 from Hardy Falls with picnic facilities", image: "https://peachland.ca/wp-content/uploads/2019/06/antlers-beach.jpg?w=400&h=250", link: "https://peachland.ca/attractions/beaches/" },
    
    // Summerland area
    sunOkaBeach: { lat: 49.5833, lng: -119.6667, name: "Sun-Oka Beach Provincial Park", type: "beach", description: "One of Okanagan's finest beaches with excellent swimming and picnic facilities", image: "https://www.env.gov.bc.ca/bcparks/explore/parkpgs/sun_oka/sun-oka-beach.jpg?w=400&h=250", link: "https://www.env.gov.bc.ca/bcparks/explore/parkpgs/sun_oka/" },
    giantHeadMountain: { lat: 49.5833, lng: -119.6333, name: "Giant's Head Mountain Park", type: "hiking", description: "Extinct volcano with 360-degree views of Okanagan Valley", image: "https://www.summerland.ca/sites/default/files/styles/header_image/public/giants-head-mountain.jpg?w=400&h=250", link: "https://www.summerland.ca/recreation-culture/parks-trails/giants-head-mountain" },
    
    // Penticton area
    skahaBeach: { lat: 49.4818, lng: -119.5951, name: "Skaha Beach", type: "beach", description: "Canada's top-ranked beach on warm Skaha Lake with sandy shoreline", image: "https://visitpenticton.com/wp-content/uploads/2020/06/skaha-beach-penticton.jpg?w=400&h=250", link: "https://visitpenticton.com/things-to-do/beaches/skaha-beach/" },
    okanaganBeach: { lat: 49.5045, lng: -119.5937, name: "Okanagan Beach", type: "beach", description: "Nearly 1km of premium sandy beach on Okanagan Lake in downtown Penticton", image: "https://visitpenticton.com/wp-content/uploads/2020/06/okanagan-beach-penticton.jpg?w=400&h=250", link: "https://visitpenticton.com/things-to-do/beaches/okanagan-beach/" },
    skahaBluffs: { lat: 49.4666, lng: -119.5833, name: "Skaha Bluffs Provincial Park", type: "outdoor", description: "Rock climbing paradise with 650+ routes and hiking trails up to 80m high", image: "https://www.env.gov.bc.ca/bcparks/explore/parkpgs/skaha_bl/skaha-bluffs-climbing.jpg?w=400&h=250", link: "https://www.env.gov.bc.ca/bcparks/explore/parkpgs/skaha_bl/" },
    munsonMountain: { lat: 49.4833, lng: -119.5333, name: "Munson Mountain", type: "hiking", description: "Popular hike offering epic panoramic views above Penticton", image: "https://cdn2.apstatic.com/photos/hike/7023456_medium_1555439618.jpg?w=400&h=250", link: "https://www.alltrails.com/trail/canada/british-columbia/munson-mountain" },
    
    // Naramata area
    naramataBeach: { lat: 49.5833, lng: -119.5833, name: "Manitou Beach", type: "beach", description: "White sand beach in Naramata with shade trees and picnic facilities", image: "https://naramata.com/wp-content/uploads/2019/07/manitou-beach-naramata.jpg?w=400&h=250", link: "https://naramata.com/attractions/beaches/" },
    
    // Oliver area wineries
    tinhornCreek: { lat: 49.15101, lng: -119.588065, name: "Tinhorn Creek Vineyards", type: "wine", description: "Premium South Okanagan winery known for exceptional terroir-driven wines", image: "https://tinhorn.com/wp-content/uploads/2020/05/tinhorn-creek-vineyard-view.jpg?w=400&h=250", link: "https://www.tinhorn.com/" },
    blackHillsEstate: { lat: 49.1095187, lng: -119.5486661, name: "Black Hills Estate Winery", type: "wine", description: "Boutique winery producing acclaimed reds in Oliver's Black Sage Bench", image: "https://blackhillswinery.com/wp-content/uploads/2019/08/black-hills-estate-winery.jpg?w=400&h=250", link: "https://www.blackhillswinery.com/" },
    burrowingOwl: { lat: 49.1950, lng: -119.5650, name: "Burrowing Owl Estate Winery", type: "wine", description: "Award-winning Oliver winery known for premium red wines and stunning views", image: "https://burrowingowlwine.ca/wp-content/uploads/2020/04/burrowing-owl-winery-exterior.jpg?w=400&h=250", link: "https://www.burrowingowlwine.ca/" },
    
    // Osoyoos area
    spottedLake: { lat: 49.0735, lng: -119.5668, name: "Spotted Lake", type: "scenic", description: "Sacred alkaline lake with colorful mineral spots visible in summer", image: "https://www.hellobc.com/content/uploads/2019/06/spotted-lake-osoyoos.jpg?w=400&h=250", link: "https://www.hellobc.com/things-to-do/sightseeing-tours/spotted-lake/" },
    nkmipCellars: { lat: 49.0280, lng: -119.4430, name: "Nk'Mip Cellars", type: "wine", description: "North America's first Indigenous-owned winery with cultural center", image: "https://nkmipcellars.com/wp-content/uploads/2020/03/nkmip-cellars-building.jpg?w=400&h=250", link: "https://www.nkmipcellars.com/" },
    osoyoosDesertCentre: { lat: 49.0500, lng: -119.4500, name: "Osoyoos Desert Centre", type: "cultural", description: "Canada's only desert ecosystem with interpretive trails and wildlife viewing", image: "https://osoyoosdesert.org/wp-content/uploads/2019/05/osoyoos-desert-centre.jpg?w=400&h=250", link: "https://www.osoyoosdesert.org/" },
    osoyoosLake: { lat: 49.0325, lng: -119.4682, name: "Osoyoos Lake", type: "beach", description: "Canada's warmest lake with sandy beaches and water sports", image: "https://destinationosoyoos.com/wp-content/uploads/2020/07/osoyoos-lake-beach.jpg?w=400&h=250", link: "https://www.destinationosoyoos.com/osoyoos-lake/" },
    
    // Cultural and historic sites
    kelownaMuseums: { lat: 49.8880, lng: -119.4960, name: "Kelowna Museums", type: "cultural", description: "Collection including BC Orchard Industry Museum and Wine Museum", image: "https://kelownamuseums.ca/wp-content/uploads/2020/02/kelowna-museums-building.jpg?w=400&h=250", link: "https://www.kelownamuseums.ca/" },
    pentictonMuseum: { lat: 49.4991, lng: -119.5937, name: "Penticton Museum", type: "cultural", description: "Local history museum featuring Indigenous artifacts and pioneer exhibits", image: "https://pentictonmuseum.com/wp-content/uploads/2019/04/penticton-museum-exterior.jpg?w=400&h=250", link: "https://pentictonmuseum.com/" },
    
    // Family attractions
    kangarooCreekFarm: { lat: 49.968250, lng: -119.370514, name: "Kangaroo Creek Farm", type: "family", description: "Interactive farm experience with kangaroos, lemurs, and other exotic animals located at 5932 Old Vernon Road, Kelowna", image: "https://kangaroocreek.bc.ca/wp-content/uploads/2020/06/kangaroo-creek-farm-animals.jpg?w=400&h=250", link: "https://www.kangaroocreek.bc.ca/" },
    zipzonePeachland: { lat: 49.765598, lng: -119.824009, name: "ZipZone Peachland", type: "family", description: "Canada's highest, longest, and fastest ziplines soaring 381 feet above Peachland Creek Gorge", image: "https://zipzone.ca/wp-content/uploads/2020/04/zipzone-peachland-zipline.jpg?w=400&h=250", link: "https://zipzone.ca/" },
    
    // Provincial Parks along the route
    bridalVeillFalls: { lat: 49.185301, lng: -121.744080, name: "Bridal Veil Falls Provincial Park", type: "hiking", description: "60-meter waterfall with easy 800m hike, 32 acres of protected parkland east of Chilliwack", image: "https://www.env.gov.bc.ca/bcparks/explore/parkpgs/bridal_veil/bridal-veil-falls.jpg?w=400&h=250", link: "https://www.env.gov.bc.ca/bcparks/explore/parkpgs/bridal_veil/" },
    harrisonHotSprings: { lat: 49.3000, lng: -121.7758, name: "Harrison Hot Springs", type: "scenic", description: "Resort village with natural hot springs at southern end of Harrison Lake, 90 minutes from Vancouver", image: "https://www.hellobc.com/content/uploads/2019/06/harrison-hot-springs-pool.jpg?w=400&h=250", link: "https://tourismharrison.com/" },
    sasquatchPark: { lat: 49.353657, lng: -121.704150, name: "Sasquatch Provincial Park", type: "outdoor", description: "1,217 hectares touching four beautiful lakes including Harrison Lake, 6km north of Harrison Hot Springs", image: "https://bcparks.ca/wp-content/uploads/2020/03/sasquatch-park-lake.jpg?w=400&h=250", link: "https://bcparks.ca/sasquatch-park/" },
    goldenEarsPark: { lat: 49.3577, lng: -122.5045, name: "Golden Ears Provincial Park", type: "hiking", description: "555.9 sq km park with twin peaks Golden Ears (1,716m), 11km north of Maple Ridge", image: "https://bcparks.ca/wp-content/uploads/2020/03/golden-ears-park-mountain.jpg?w=400&h=250", link: "https://bcparks.ca/golden-ears-park/" },
    cultusLake: { lat: 49.0533, lng: -121.9867, name: "Cultus Lake Provincial Park", type: "beach", description: "656 hectares of warm lake recreation 11km southwest of Chilliwack, established 1950", image: "https://bcparks.ca/wp-content/uploads/2020/03/cultus-lake-beach.jpg?w=400&h=250", link: "https://bcparks.ca/cultus-lake-park/" },
    cathedralPark: { lat: 49.0677, lng: -120.1420, name: "Cathedral Provincial Park", type: "hiking", description: "33,272 hectares of wilderness 3km west of Keremeos, named after Cathedral Mountain near US border", image: "https://bcparks.ca/wp-content/uploads/2020/03/cathedral-park-mountain.jpg?w=400&h=250", link: "https://bcparks.ca/cathedral-park/" },
    steinValley: { lat: 50.2835, lng: -121.6219, name: "Stein Valley Nlaka'pamux Heritage Park", type: "hiking", description: "Co-managed wilderness park with 150km of trails, suspension bridge, west of Lytton via ferry", image: "https://bcparks.ca/wp-content/uploads/2020/03/stein-valley-river.jpg?w=400&h=250", link: "https://bcparks.ca/stein-valley-nlakapamux-heritage-park/" },
    
    // Scenic Viewpoints and Lookouts
    kamloopsLakeViewpoint: { lat: 50.6761, lng: -120.3408, name: "Kamloops Lake Viewpoint", type: "scenic", description: "Designated viewpoint on Trans-Canada Highway at Savona with sweeping lake views and trails", image: "https://www.tourismkamloops.com/wp-content/uploads/2020/06/kamloops-lake-viewpoint.jpg?w=400&h=250", link: "https://www.tourismkamloops.com/" },
    kalamalkaLookout: { lat: 50.2673, lng: -119.2734, name: "Kalamalka Lake Lookout", type: "scenic", description: "Spectacular turquoise lake views on old Highway 97 (Kalamalka Lakeview Drive) south of Vernon", image: "https://www.tourismvernon.com/wp-content/uploads/2020/06/kalamalka-lake-lookout.jpg?w=400&h=250", link: "https://www.tourismvernon.com/" },
    munsonMountainViewpoint: { lat: 49.4833, lng: -119.5333, name: "Munson Mountain Scenic Lookout", type: "scenic", description: "Iconic Penticton sign visible from Highway 97, panoramic views of Okanagan and Skaha Lakes", image: "https://visitpenticton.com/wp-content/uploads/2020/06/munson-mountain-penticton-sign.jpg?w=400&h=250", link: "https://visitpenticton.com/" },
    thompsonRiverOverlook: { lat: 50.676109, lng: -120.340836, name: "Kamloops Scenic Outlook", type: "scenic", description: "View confluence of North and South Thompson Rivers at Overlander Bridge off Columbia Street", image: "https://www.tourismkamloops.com/wp-content/uploads/2020/06/thompson-river-confluence.jpg?w=400&h=250", link: "https://www.tourismkamloops.com/" },
    
    // Year-round outdoor activities
    bigWhite: { lat: 49.7166, lng: -118.9500, name: "Big White Ski Resort", type: "outdoor", description: "Major ski resort with winter sports and summer mountain biking", image: "https://bigwhite.com/wp-content/uploads/2020/03/big-white-ski-resort-village.jpg?w=400&h=250", link: "https://www.bigwhite.com/" },
    silverStar: { lat: 50.4166, lng: -119.0333, name: "Silver Star Mountain Resort", type: "outdoor", description: "Year-round resort offering skiing, hiking, and mountain biking", image: "https://skisilverstar.com/wp-content/uploads/2020/02/silver-star-mountain-resort.jpg?w=400&h=250", link: "https://www.skisilverstar.com/" },
    
    // Provincial Parks along the route
    bridalVeillFalls: { lat: 49.185301, lng: -121.744080, name: "Bridal Veil Falls Provincial Park", type: "hiking", description: "60-meter waterfall accessible via easy 800m hike, 32 acres of protected area", image: "https://www.env.gov.bc.ca/bcparks/explore/parkpgs/bridal_veil/bridal-veil-falls.jpg?w=400&h=250", link: "https://www.env.gov.bc.ca/bcparks/explore/parkpgs/bridal_veil/" },
    
    harrisonHotSprings: { lat: 49.300000, lng: -121.775800, name: "Harrison Hot Springs", type: "cultural", description: "Natural hot springs resort village 90 minutes east of Vancouver", image: "https://www.harrisonresort.com/wp-content/uploads/2020/03/harrison-hot-springs-resort.jpg?w=400&h=250", link: "https://www.harrisonresort.com/" },
    
    sasquatchPark: { lat: 49.353657, lng: -121.704150, name: "Sasquatch Provincial Park", type: "hiking", description: "1,217 hectares touching four lakes including Harrison Lake, 6km north of Harrison Hot Springs", image: "https://www.env.gov.bc.ca/bcparks/explore/parkpgs/sasquatch/sasquatch-park.jpg?w=400&h=250", link: "https://www.env.gov.bc.ca/bcparks/explore/parkpgs/sasquatch/" },
    
    cultusLake: { lat: 49.053300, lng: -121.986700, name: "Cultus Lake Provincial Park", type: "beach", description: "656 hectares park with warm lake recreation, 11km southwest of Chilliwack", image: "https://www.env.gov.bc.ca/bcparks/explore/parkpgs/cultus_lk/cultus-lake-beach.jpg?w=400&h=250", link: "https://www.env.gov.bc.ca/bcparks/explore/parkpgs/cultus_lk/" },
    
    cathedralPark: { lat: 49.067700, lng: -120.142000, name: "Cathedral Provincial Park", type: "hiking", description: "33,272 hectares wilderness park named after Cathedral Mountain, 3km west of Keremeos", image: "https://www.env.gov.bc.ca/bcparks/explore/parkpgs/cathedral/cathedral-mountain.jpg?w=400&h=250", link: "https://www.env.gov.bc.ca/bcparks/explore/parkpgs/cathedral/" },
    
    manningPark: { lat: 49.061389, lng: -120.787500, name: "E.C. Manning Provincial Park", type: "hiking", description: "70,844 hectares of alpine wilderness on Highway 3, known for wildflower meadows and mountain views", image: "https://www.env.gov.bc.ca/bcparks/explore/parkpgs/ec_manning/manning-park-meadows.jpg?w=400&h=250", link: "https://www.env.gov.bc.ca/bcparks/explore/parkpgs/ec_manning/" },
    
    // Highway 3 (Crowsnest) attractions from Osoyoos to Hope
    hopeTownCenter: { lat: 49.384800, lng: -121.438500, name: "Hope Town Center", type: "cultural", description: "Base of operations for adventure, famous as filming location for First Blood (1982)", image: "https://www.crowsnestscenic3.com/wp-content/uploads/2020/06/hope-town.jpg?w=400&h=250", link: "https://www.crowsnestscenic3.com/places/hope/" },
    lightningLakeTrail: { lat: 49.070000, lng: -120.780000, name: "Lightning Lake Trail", type: "hiking", description: "Popular Manning Park trail looping around Lightning Lake with Rainbow Bridge crossing", image: "https://bcparks.ca/wp-content/uploads/2020/03/lightning-lake-trail.jpg?w=400&h=250", link: "https://bcparks.ca/ec-manning-park/" },
    allisonPass: { lat: 49.060000, lng: -120.750000, name: "Allison Pass", type: "scenic", description: "Mountain pass at 1,342m elevation in Manning Park with alpine views", image: "https://www.crowsnestscenic3.com/wp-content/uploads/2020/06/allison-pass.jpg?w=400&h=250", link: "https://www.crowsnestscenic3.com/" },
    princetonTownCenter: { lat: 49.455300, lng: -120.503600, name: "Princeton", type: "cultural", description: "Market center where Tulameen River joins Similkameen River, gateway to Similkameen Valley", image: "https://www.crowsnestscenic3.com/wp-content/uploads/2020/06/princeton-town.jpg?w=400&h=250", link: "https://www.crowsnestscenic3.com/" },
    hedleyMuseum: { lat: 49.354800, lng: -120.072200, name: "Hedley Museum", type: "cultural", description: "Historic mining town museum at 712 Daly Avenue, Hedley Country Market for river tubing", image: "https://www.crowsnestscenic3.com/wp-content/uploads/2020/06/hedley-museum.jpg?w=400&h=250", link: "https://www.crowsnestscenic3.com/" },
    keremeosTrail: { lat: 49.200000, lng: -119.850000, name: "Keremeos Fruit Stands", type: "cultural", description: "Highway 3 fruit stands selling cherries, apples, and apricots in season, including Parsons Farm Market", image: "https://www.crowsnestscenic3.com/wp-content/uploads/2020/06/keremeos-fruit-stands.jpg?w=400&h=250", link: "https://www.crowsnestscenic3.com/" },
    orofinoWinery: { lat: 49.180000, lng: -119.800000, name: "Orofino Winery", type: "wine", description: "Canada's first strawbale winery in Cawston, unique desert-style tasting room", image: "https://orofinowinery.com/wp-content/uploads/2020/05/orofino-winery-exterior.jpg?w=400&h=250", link: "https://orofinowinery.com/" },
    sevenStonesWinery: { lat: 49.190000, lng: -119.820000, name: "Seven Stones Winery", type: "wine", description: "Boutique winery in Similkameen Valley known for organic wines and scenic vineyard views", image: "https://sevenstoneswinery.com/wp-content/uploads/2020/05/seven-stones-vineyard.jpg?w=400&h=250", link: "https://sevenstoneswinery.com/" },
    
    // Scenic Viewpoints
    kamloopsLakeViewpoint: { lat: 50.676100, lng: -120.340800, name: "Kamloops Lake Viewpoint", type: "scenic", description: "Designated viewpoint on Trans-Canada Highway at Savona with washrooms and trails", image: "https://www.kamloops.ca/sites/default/files/kamloops-lake-viewpoint.jpg?w=400&h=250", link: "https://www.kamloops.ca/" },
    
    kalamalkaLookout: { lat: 50.267300, lng: -119.273400, name: "Kalamalka Lake Lookout", type: "scenic", description: "Turquoise lake views from Old Highway 97, south of Vernon with picnic tables", image: "https://www.vernontourism.com/wp-content/uploads/kalamalka-lake-viewpoint.jpg?w=400&h=250", link: "https://www.vernontourism.com/" },
    
    munsonLookout: { lat: 49.483300, lng: -119.533300, name: "Munson Mountain Scenic Lookout", type: "scenic", description: "Panoramic views behind iconic Penticton sign, overlooks both Okanagan and Skaha Lakes", image: "https://visitpenticton.com/wp-content/uploads/munson-mountain-lookout.jpg?w=400&h=250", link: "https://visitpenticton.com/" },
    
    
    // Additional Wineries
    road13Vineyards: { lat: 49.120000, lng: -119.580000, name: "Road 13 Vineyards", type: "wine", description: "Boutique winery on Golden Mile Bench known for innovative winemaking and unique varietals", image: "https://road13vineyards.com/wp-content/uploads/road13-vineyard-view.jpg?w=400&h=250", link: "https://road13vineyards.com/" },
    
    // Sun Peaks Resort
    sunPeaks: { lat: 50.884448, lng: -119.885911, name: "Sun Peaks Resort", type: "outdoor", description: "Canada's second-largest ski resort with 4,270 acres, 45 minutes northeast of Kamloops", image: "https://www.sunpeaksresort.com/wp-content/uploads/2020/03/sun-peaks-village.jpg?w=400&h=250", link: "https://www.sunpeaksresort.com/" },
    harkersFruitRanch: { lat: 49.4500, lng: -119.6000, name: "Harker's Organic Fruit Ranch", type: "cultural", description: "Certified organic fruit farm near Cawston with U-pick cherries, apples, and stone fruits", image: "https://www.harkerfruit.com/wp-content/uploads/2020/06/harkers-fruit-ranch.jpg?w=400&h=250", link: "https://www.harkerfruit.com/" },
    fruitlandProduce: { lat: 49.5500, lng: -119.6200, name: "Fruitland Produce Stand", type: "cultural", description: "Roadside fruit stand on Highway 97 in Summerland with seasonal local fruits and vegetables", image: "https://www.summerland.ca/wp-content/uploads/2020/07/fruitland-produce.jpg?w=400&h=250", link: "https://www.summerland.ca/" },
    
    // Historic Sites and Photography Spots
    naramataInn: { lat: 49.5960, lng: -119.5827, name: "Historic Naramata Inn", type: "cultural", description: "1908 heritage hotel on Okanagan Lake, historic architecture and lakefront dining", image: "https://naramatainn.com/wp-content/uploads/2020/05/naramata-inn-historic.jpg?w=400&h=250", link: "https://naramatainn.com/" },
    kettleValleyTrestle: { lat: 49.4000, lng: -119.4500, name: "Kettle Valley Railway Trestle", type: "scenic", description: "Historic railway trestle bridge offering photography opportunities and valley views", image: "https://www.env.gov.bc.ca/bcparks/explore/parkpgs/kettle_valley/kvr-trestle.jpg?w=400&h=250", link: "https://www.env.gov.bc.ca/bcparks/" },
    fairviewGhostTown: { lat: 49.2500, lng: -119.4000, name: "Fairview Ghost Town Site", type: "cultural", description: "Historic gold rush town ruins near Oliver, interpretive trails and mining history", image: "https://www.oliverbc.ca/wp-content/uploads/2020/07/fairview-ghost-town.jpg?w=400&h=250", link: "https://www.oliverbc.ca/" },
    
    // Additional Highway 97 Attractions
    okanaganLavender: { lat: 49.1800, lng: -119.5400, name: "Okanagan Lavender & Herb Farm", type: "scenic", description: "35-acre lavender farm near Oliver with seasonal blooms, products, and scenic views", image: "https://www.okanaganlavender.com/wp-content/uploads/2020/06/lavender-farm-fields.jpg?w=400&h=250", link: "https://www.okanaganlavender.com/" },
    roadside22Winery: { lat: 49.1200, lng: -119.5800, name: "Road 13 Vineyards", type: "wine", description: "Small boutique winery south of Oliver with unique desert-style tasting room", image: "https://road13vineyards.com/wp-content/uploads/2020/05/road13-tasting-room.jpg?w=400&h=250", link: "https://road13vineyards.com/" },
    inkameepDesert: { lat: 49.0500, lng: -119.4000, name: "Inkameep Desert", type: "scenic", description: "Rare pocket desert ecosystem near Osoyoos with unique flora and interpretive trails", image: "https://www.hellobc.com/content/uploads/2019/06/inkameep-desert.jpg?w=400&h=250", link: "https://www.hellobc.com/" }
};

// 主要城镇和地标
const mainLocations = {
    burnaby: { lat: 49.2488, lng: -122.9805, name: "本拿比", type: "city" },
    kelowna: { lat: 49.8880, lng: -119.4960, name: "基洛纳", type: "city" },
    kelownaWaterfront: { lat: 49.8863, lng: -119.4967, name: "基洛纳滨水区", type: "waterfront" },
    peachland: { lat: 49.7791, lng: -119.7367, name: "桃地镇", type: "city" },
    penticton: { lat: 49.4991, lng: -119.5937, name: "彭蒂克顿", type: "city" },
    osoyoos: { lat: 49.0325, lng: -119.4682, name: "奥索尤斯", type: "city" },
    oliver: { lat: 49.1832, lng: -119.5506, name: "奥利弗", type: "city" },
    hope: { lat: 49.3858, lng: -121.4424, name: "希望镇", type: "city" }
};

// 合并所有地点用于路线规划
const allLocations = { ...mainLocations, ...hotels, ...attractions };

// 完整的旅游路线（展示所有热门景点）
const completeRoute = [
    mainLocations.burnaby,
    mainLocations.kelowna,
    hotels.deltaHotel,
    mainLocations.kelownaWaterfront,
    attractions.myraCanyon,
    attractions.knoxMountain,
    attractions.bearCreek,
    attractions.quailsGate,
    attractions.summerhillWinery,
    mainLocations.peachland,
    mainLocations.penticton,
    mainLocations.oliver,
    attractions.burrowingOwl,
    mainLocations.osoyoos,
    attractions.nkmipCellars,
    hotels.walnutBeach,
    attractions.spottedLake,
    mainLocations.hope,
    mainLocations.burnaby
];

// 自定义图标和颜色
const customIcons = {
    hotel: { icon: '🛏️', color: '#e74c3c', size: 'large' },
    wine: { icon: '🍷', color: '#8e44ad', size: 'medium' },
    hiking: { icon: '🥾', color: '#27ae60', size: 'medium' },
    water: { icon: '🌊', color: '#3498db', size: 'medium' },
    scenic: { icon: '📸', color: '#f39c12', size: 'medium' },
    city: { icon: '🏘️', color: '#34495e', size: 'medium' },
    waterfront: { icon: '🌊', color: '#3498db', size: 'medium' },
    beach: { icon: '🏖️', color: '#f1c40f', size: 'medium' },
    cultural: { icon: '🏛️', color: '#9b59b6', size: 'medium' },
    family: { icon: '🎠', color: '#e67e22', size: 'medium' },
    outdoor: { icon: '⛷️', color: '#2c3e50', size: 'medium' }
};

// 创建自定义标记
function createCustomMarker(location) {
    const iconData = customIcons[location.type] || customIcons.scenic;
    const size = iconData.size === 'large' ? [40, 40] : [30, 30];
    
    return L.divIcon({
        html: `<div style="
            background: ${iconData.color};
            color: white;
            border-radius: 50%;
            width: ${size[0]}px;
            height: ${size[1]}px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: ${iconData.size === 'large' ? '20px' : '16px'};
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
            border: 3px solid white;
        ">${iconData.icon}</div>`,
        className: 'custom-marker-icon',
        iconSize: size,
        iconAnchor: [size[0]/2, size[1]/2]
    });
}

// 初始化函数
function initMap() {
    // 创建地图
    map = L.map('map').setView([49.5, -119.5], 7);
    
    // 添加地图图层
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    // 显示完整的旅游路线
    showCompleteRoute();
}

// 显示完整的旅游路线
function showCompleteRoute() {
    // 清除现有路线和标记
    clearMap();
    
    // 分别添加不同类型的标记
    addLocationMarkers();
    
    // 创建主要驾驶路线（简化版，突出主要城镇）
    const mainRoutePoints = [
        mainLocations.burnaby,
            mainLocations.kelowna,
        mainLocations.penticton,
        mainLocations.oliver,
        mainLocations.osoyoos,
        mainLocations.hope,
        mainLocations.burnaby
    ];
    
    const waypoints = mainRoutePoints.map(loc => L.latLng(loc.lat, loc.lng));
    
    routeControl = L.Routing.control({
        waypoints: waypoints,
        routeWhileDragging: false,
        addWaypoints: false,
        createMarker: function() { return null; },
        lineOptions: {
            styles: [{ 
                color: '#e74c3c', 
                weight: 8, 
                opacity: 0.9,
                dashArray: '10, 5'
            }]
        },
        show: false
    }).addTo(map);
    
    // 调整地图视图
    const allWaypoints = completeRoute.map(loc => L.latLng(loc.lat, loc.lng));
    const bounds = L.latLngBounds(allWaypoints);
    map.fitBounds(bounds, { padding: [30, 30] });
}

// 添加所有位置标记
function addLocationMarkers() {
    // 添加酒店标记（最突出）
    Object.values(hotels).forEach(location => {
        const marker = L.marker([location.lat, location.lng], {
            icon: createCustomMarker(location)
        }).addTo(map);
        
        const popupContent = `
            <div class="popup-content">
                <h4>${customIcons[location.type].icon} ${location.name}</h4>
                <p><strong>Premium Accommodation</strong></p>
                ${location.image ? `<img src="${location.image}" alt="${location.name}" style="width:100%; max-width:300px; height:150px; object-fit:cover; border-radius:6px; margin:8px 0;">` : ''}
                <p>Luxury lakefront resort with full amenities and stunning views</p>
                ${location.link ? `<a href="${location.link}" target="_blank" class="external-link">📍 More Details</a>` : ''}
            </div>
        `;
        
        marker.bindPopup(popupContent);
        markers.push(marker);
    });
    
    // 添加景点标记
    Object.values(attractions).forEach(location => {
        const marker = L.marker([location.lat, location.lng], {
            icon: createCustomMarker(location)
        }).addTo(map);
        
        const description = location.description || getAttractionDescription(location.name);
        
        const popupContent = `
            <div class="popup-content">
                <h4>${customIcons[location.type].icon} ${location.name}</h4>
                <p><strong>${getTypeDescription(location.type)}</strong></p>
                ${location.image ? `<img src="${location.image}" alt="${location.name}" style="width:100%; max-width:300px; height:150px; object-fit:cover; border-radius:6px; margin:8px 0;">` : ''}
                <p>${description}</p>
                ${location.link ? `<a href="${location.link}" target="_blank" class="external-link">📍 More Details</a>` : ''}
            </div>
        `;
        
        marker.bindPopup(popupContent);
        markers.push(marker);
    });
    
    // 添加主要城镇标记
    Object.values(mainLocations).forEach(location => {
        const marker = L.marker([location.lat, location.lng], {
            icon: createCustomMarker(location)
        }).addTo(map);
        
        const popupContent = `
            <div class="popup-content">
                <h4>${customIcons[location.type].icon} ${location.name}</h4>
                <p><strong>Major Town</strong></p>
                <p>Key stop along the Okanagan route</p>
            </div>
        `;
        
        marker.bindPopup(popupContent);
        markers.push(marker);
    });
}

// 获取景点描述
function getAttractionDescription(name) {
    const descriptions = {
        "地狱门峡谷": "观赏弗雷泽河峡谷的壮观景色，体验吊桥和空中缆车",
        "迈拉峡谷铁路步道": "历史悠久的铁路步道，拥有18座木制栈桥和隧道",
        "诺克斯山公园": "基洛纳最大的自然公园，山顶可俯瞰奥卡纳根湖全景",
        "熊溪省立公园": "400米长的沙滩，是BC省第二受欢迎的露营地",
        "鹌鹑门酒庄": "奥卡纳根地区知名精品酒庄，提供品酒和湖景用餐",
        "夏山金字塔酒庄": "独特的金字塔建筑酒庄，以有机葡萄酒闻名",
        "斑点湖": "神奇的碱性湖泊，夏季呈现彩色斑点，原住民圣地",
        "Nk'Mip酒庄": "北美首家原住民拥有的酒庄，结合文化体验",
        "穴居猫头鹰酒庄": "奥利弗地区顶级酒庄，以红酒闻名"
    };
    return descriptions[name] || "热门旅游景点";
}

// 获取类型描述
function getTypeDescription(type) {
    const types = {
        wine: "Wine Tasting",
        hiking: "Hiking & Nature",
        scenic: "Scenic Attraction",
        beach: "Beach & Swimming",
        hotel: "Premium Accommodation",
        city: "City Center",
        waterfront: "Waterfront Area",
        cultural: "Cultural Attraction",
        family: "Family Fun",
        outdoor: "Outdoor Recreation"
    };
    return types[type] || "Tourist Attraction";
}

// 移除旧的图标函数，使用新的自定义标记系统

// 清除地图上的标记和路线
function clearMap() {
    // 清除标记
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
    
    // 清除路线
    if (routeControl) {
        map.removeControl(routeControl);
        routeControl = null;
    }
}

// 日期选择器功能
document.addEventListener('DOMContentLoaded', function() {
    // 初始化地图
    initMap();
    
    // 移除日期选择功能，改为显示完整的旅游指南
    
    // 景点点击展开详情
    const attractions = document.querySelectorAll('.attraction');
    attractions.forEach(attraction => {
        attraction.addEventListener('click', function(e) {
            // 如果点击的是链接，不展开
            if (e.target.tagName === 'A') return;
            
            const details = this.querySelector('.attraction-details');
            if (details) {
                // 切换显示状态
                if (details.style.display === 'block') {
                    details.style.display = 'none';
                } else {
                    // 先关闭其他已展开的详情
                    document.querySelectorAll('.attraction-details').forEach(d => {
                        d.style.display = 'none';
                    });
                    details.style.display = 'block';
                    
                    // 滚动到视图中
                    setTimeout(() => {
                        details.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }, 100);
                }
            }
        });
    });
    
    // 模态框功能
    const modal = document.getElementById('attraction-modal');
    const modalBody = document.getElementById('modal-body');
    const closeBtn = document.querySelector('.close');
    
    // 关闭模态框
    closeBtn.addEventListener('click', function() {
        modal.style.display = 'none';
    });
    
    // 点击模态框外部关闭
    window.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // 地图标记点击事件
    markers.forEach(marker => {
        marker.on('click', function() {
            // 可以在这里添加更详细的景点信息展示
        });
    });
    
    // 添加地图控件
    L.control.scale({
        imperial: false,
        metric: true,
        position: 'bottomright'
    }).addTo(map);
    
    // 添加全屏控件
    map.addControl(new L.Control.Fullscreen({
        position: 'topright'
    }));
});

// 辅助函数：格式化时间
function formatTime(hours, minutes) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

// 辅助函数：计算驾驶时间
function calculateDrivingTime(distance) {
    // 假设平均速度80km/h
    const hours = Math.floor(distance / 80);
    const minutes = Math.round((distance % 80) / 80 * 60);
    return `约${hours}小时${minutes > 0 ? minutes + '分钟' : ''}`;
}

// 添加打印功能
function printItinerary() {
    window.print();
}

// 添加分享功能
function shareItinerary() {
    if (navigator.share) {
        navigator.share({
            title: '奥卡纳根周末之旅',
            text: '查看我们的奥卡纳根周末旅行计划！',
            url: window.location.href
        }).catch(console.error);
    } else {
        // 复制链接到剪贴板
        navigator.clipboard.writeText(window.location.href)
            .then(() => alert('链接已复制到剪贴板！'))
            .catch(console.error);
    }
}

// 添加图片懒加载
if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('lazy');
                imageObserver.unobserve(img);
            }
        });
    });
    
    // 观察所有懒加载图片
    const lazyImages = document.querySelectorAll('img.lazy');
    lazyImages.forEach(img => imageObserver.observe(img));
}