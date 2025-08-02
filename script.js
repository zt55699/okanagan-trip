// 初始化地图
let map;
let routeControl;
let markers = [];
let markerClusterGroup = null; // For performance optimization

// Performance optimization flags
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

// 路线缓存系统
const routeCache = {
    storage: new Map(),
    localStoragePrefix: 'okanagan_route_',
    
    // 生成路线缓存键
    generateKey: function(waypoints) {
        return waypoints.map(wp => `${wp.lat.toFixed(4)},${wp.lng.toFixed(4)}`).join('|');
    },
    
    // 从localStorage加载缓存
    loadFromLocalStorage: function() {
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(this.localStoragePrefix)) {
                    const routeKey = key.substring(this.localStoragePrefix.length);
                    const data = JSON.parse(localStorage.getItem(key));
                    if (data && Date.now() - data.timestamp < 24 * 60 * 60 * 1000) {
                        this.storage.set(routeKey, data);
                    } else {
                        localStorage.removeItem(key); // 清理过期数据
                    }
                }
            }
        } catch (e) {
            console.warn('Failed to load route cache from localStorage:', e);
        }
    },
    
    // 获取缓存的路线
    get: function(waypoints) {
        const key = this.generateKey(waypoints);
        let cached = this.storage.get(key);
        
        // 如果内存中没有，尝试从localStorage获取
        if (!cached) {
            try {
                const localData = localStorage.getItem(this.localStoragePrefix + key);
                if (localData) {
                    cached = JSON.parse(localData);
                    if (cached && Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) {
                        this.storage.set(key, cached);
                    } else {
                        localStorage.removeItem(this.localStoragePrefix + key);
                        return null;
                    }
                }
            } catch (e) {
                console.warn('Failed to get cached route from localStorage:', e);
            }
        }
        
        if (cached && Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) { // 24小时缓存
            console.log('Using cached route data');
            return cached.data;
        }
        return null;
    },
    
    // 存储路线到缓存
    set: function(waypoints, routeData) {
        const key = this.generateKey(waypoints);
        const cacheData = {
            data: routeData,
            timestamp: Date.now()
        };
        
        // 存储到内存
        this.storage.set(key, cacheData);
        
        // 存储到localStorage
        try {
            localStorage.setItem(this.localStoragePrefix + key, JSON.stringify(cacheData));
            console.log('Route data cached to memory and localStorage');
        } catch (e) {
            console.warn('Failed to cache route to localStorage:', e);
            console.log('Route data cached to memory only');
        }
    },
    
    // 清理过期缓存
    cleanup: function() {
        const now = Date.now();
        const expiredKeys = [];
        
        // 清理内存缓存
        this.storage.forEach((value, key) => {
            if (now - value.timestamp > 24 * 60 * 60 * 1000) {
                expiredKeys.push(key);
            }
        });
        expiredKeys.forEach(key => this.storage.delete(key));
        
        // 清理localStorage缓存
        try {
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(this.localStoragePrefix)) {
                    const data = JSON.parse(localStorage.getItem(key));
                    if (!data || now - data.timestamp > 24 * 60 * 60 * 1000) {
                        keysToRemove.push(key);
                    }
                }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));
        } catch (e) {
            console.warn('Failed to cleanup localStorage cache:', e);
        }
    },
    
    // 初始化缓存
    init: function() {
        this.loadFromLocalStorage();
        this.cleanup();
    }
};

// 创建后备路线（简单直线连接）
function createFallbackRoute(waypoints) {
    const coordinates = waypoints.map(wp => [wp.lng, wp.lat]);
    
    return {
        name: 'Fallback Route',
        coordinates: coordinates,
        instructions: waypoints.map((wp, index) => ({
            type: 'Straight',
            modifier: null,
            text: index === 0 ? 'Start' : index === waypoints.length - 1 ? 'Arrive at destination' : `Continue to waypoint ${index + 1}`,
            distance: index < waypoints.length - 1 ? calculateDistance(waypoints[index], waypoints[index + 1]) : 0,
            time: index < waypoints.length - 1 ? calculateDistance(waypoints[index], waypoints[index + 1]) / 50 * 3600 : 0 // 假设50km/h平均速度
        })),
        summary: {
            totalDistance: waypoints.reduce((total, wp, index) => {
                if (index < waypoints.length - 1) {
                    return total + calculateDistance(wp, waypoints[index + 1]);
                }
                return total;
            }, 0),
            totalTime: waypoints.reduce((total, wp, index) => {
                if (index < waypoints.length - 1) {
                    return total + calculateDistance(wp, waypoints[index + 1]) / 50 * 3600;
                }
                return total;
            }, 0)
        }
    };
}

// 计算两点之间的距离（米）
function calculateDistance(point1, point2) {
    const R = 6371000; // 地球半径（米）
    const lat1Rad = point1.lat * Math.PI / 180;
    const lat2Rad = point2.lat * Math.PI / 180;
    const deltaLatRad = (point2.lat - point1.lat) * Math.PI / 180;
    const deltaLngRad = (point2.lng - point1.lng) * Math.PI / 180;

    const a = Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
        Math.cos(lat1Rad) * Math.cos(lat2Rad) *
        Math.sin(deltaLngRad / 2) * Math.sin(deltaLngRad / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

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
    othelloTunnels: { lat: 49.3688, lng: -121.3678, name: "Othello Tunnels", type: "hiking", description: "Historic railway tunnels through dramatic canyon walls, part of Kettle Valley Railway", image: "https://www.env.gov.bc.ca/bcparks/explore/parkpgs/coquihalla/othello-tunnels.jpg?w=400&h=250", link: "https://bcparks.ca/coquihalla-canyon-park/" },
    coquihallaCanyon: { lat: 49.3858, lng: -121.4424, name: "Coquihalla Canyon Provincial Park", type: "hiking", description: "Former Kettle Valley Railway route with tunnels and trestles, spectacular canyon views near Hope", image: "https://bcparks.ca/wp-content/uploads/2020/03/coquihalla-canyon-tunnels.jpg?w=400&h=250", link: "https://bcparks.ca/coquihalla-canyon-park/" },
    brittonCreekRestArea: { lat: 49.651870, lng: -121.000690, name: "Britton Creek Rest Area", type: "scenic", description: "Highway 5 rest stop with washroom facilities, picnic tables, and mountain views near Coquihalla Summit", image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=250", link: "https://www.th.gov.bc.ca/restareas/" },
    zopkiosRestArea: { lat: 49.5958, lng: -121.1224, name: "Zopkios Rest Area", type: "scenic", description: "Rest area near Coquihalla Summit with mountain views and hiking opportunities", image: "https://images.unsplash.com/photo-1551632811-561732d1e306?w=400&h=250", link: "https://www.th.gov.bc.ca/restareas/" },
    fallsLakeTrail: { lat: 49.612702, lng: -121.065052, name: "Falls Lake Trail", type: "hiking", description: "1.5km alpine lake trail with impressive mountain views, 45km north of Hope near Coquihalla Summit", image: "https://bcparks.ca/wp-content/uploads/2020/03/falls-lake-trail.jpg?w=400&h=250", link: "https://bcparks.ca/coquihalla-summit-recreation-area/" },
    coquihallaSummit: { lat: 49.6000, lng: -121.0500, name: "Coquihalla Summit", type: "scenic", description: "Highest point on Highway 5 at 1,244m elevation with mountain views and alpine environment", image: "https://images.unsplash.com/photo-1464822759844-d150ad6c0ce8?w=400&h=250", link: "https://www.drivebc.ca/" },
    
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
    myraCanyon: { lat: 49.7684, lng: -119.3146, name: "Myra Canyon Trestles", type: "hiking", description: "Historic Kettle Valley Railway trail with 18 trestle bridges and 2 tunnels", image: "https://www.env.gov.bc.ca/bcparks/explore/parkpgs/myra_canyon/myra-canyon-trestle.jpg?w=400&h=250", link: "https://bcparks.ca/kettle-valley-rail-trail/" },
    knoxMountain: { lat: 49.904440, lng: -119.492740, name: "Knox Mountain Park", type: "hiking", description: "Kelowna's largest natural park with 15 trails and panoramic lake views", image: "https://www.kelowna.ca/sites/default/files/styles/banner_image/public/knox-mountain-view.jpg?w=400&h=250", link: "https://www.kelowna.ca/parks-recreation/parks-beaches/knox-mountain-park" },
    okanaganMountainPark: { lat: 49.6666, lng: -119.4166, name: "Okanagan Mountain Provincial Park", type: "hiking", description: "10,000 hectares of rugged terrain with scenic views of Okanagan Lake", image: "https://www.env.gov.bc.ca/bcparks/explore/parkpgs/okan_mtn/okanagan-mountain-park.jpg?w=400&h=250", link: "https://bcparks.ca/okanagan-mountain-park/" },
    bearCreek: { lat: 49.9250, lng: -119.5192, name: "Bear Creek Provincial Park", type: "beach", description: "400-metre sandy beach, BC's second most popular camping destination", image: "https://www.env.gov.bc.ca/bcparks/explore/parkpgs/bear_crk/bear-creek-beach.jpg?w=400&h=250", link: "https://bcparks.ca/bear-creek-park/" },
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
    sunOkaBeach: { lat: 49.5833, lng: -119.6667, name: "Sun-Oka Beach Provincial Park", type: "beach", description: "One of Okanagan's finest beaches with excellent swimming and picnic facilities", image: "https://www.env.gov.bc.ca/bcparks/explore/parkpgs/sun_oka/sun-oka-beach.jpg?w=400&h=250", link: "https://bcparks.ca/sun-oka-beach-park/" },
    giantHeadMountain: { lat: 49.5833, lng: -119.6333, name: "Giant's Head Mountain Park", type: "hiking", description: "Extinct volcano with 360-degree views of Okanagan Valley", image: "https://www.summerland.ca/sites/default/files/styles/header_image/public/giants-head-mountain.jpg?w=400&h=250", link: "https://www.summerland.ca/recreation-culture/parks-trails/giants-head-mountain" },
    
    // Penticton area
    skahaBeach: { lat: 49.4818, lng: -119.5951, name: "Skaha Beach", type: "beach", description: "Canada's top-ranked beach on warm Skaha Lake with sandy shoreline", image: "https://visitpenticton.com/wp-content/uploads/2020/06/skaha-beach-penticton.jpg?w=400&h=250", link: "https://visitpenticton.com/things-to-do/beaches/skaha-beach/" },
    okanaganBeach: { lat: 49.5045, lng: -119.5937, name: "Okanagan Beach", type: "beach", description: "Nearly 1km of premium sandy beach on Okanagan Lake in downtown Penticton", image: "https://visitpenticton.com/wp-content/uploads/2020/06/okanagan-beach-penticton.jpg?w=400&h=250", link: "https://visitpenticton.com/things-to-do/beaches/okanagan-beach/" },
    skahaBluffs: { lat: 49.4666, lng: -119.5833, name: "Skaha Bluffs Provincial Park", type: "outdoor", description: "Rock climbing paradise with 650+ routes and hiking trails up to 80m high", image: "https://www.env.gov.bc.ca/bcparks/explore/parkpgs/skaha_bl/skaha-bluffs-climbing.jpg?w=400&h=250", link: "https://bcparks.ca/skaha-bluffs-park/" },
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
    
    // U-Pick Fruit Farms
    kuipersFamilyFruitFarm: { lat: 49.8700, lng: -119.4200, name: "Kuipers Family Fruit Farm", type: "upick", description: "Historic family orchard since 1921 offering u-pick cherries, apricots, peaches and plums with stunning Okanagan Lake views", image: "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400&h=250", link: "https://www.facebook.com/kuipersfamilyfruitfarm/" },
    roseHillOrchard: { lat: 50.1450, lng: -119.3200, name: "Rose Hill Orchard", type: "upick", description: "10-acre mixed fruit orchard and cidery with u-pick cherries, apples, peaches, strawberries and on-site cafe", image: "https://images.unsplash.com/photo-1592419044706-39d57a362a8b?w=400&h=250", link: "https://www.rosehillorchard.com/" },
    hillsideOrchards: { lat: 49.1650, lng: -119.5400, name: "Hillside Orchards", type: "upick", description: "4th generation sustainable farm with over 30 varieties of u-pick fruits and vegetables, fully non-GMO operation", image: "https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?w=400&h=250", link: "https://hillsideorchards.ca/" },
    
    // Provincial Parks along the route
    bridalVeillFalls: { lat: 49.185301, lng: -121.744080, name: "Bridal Veil Falls Provincial Park", type: "hiking", description: "60-meter waterfall with easy 800m hike, 32 acres of protected parkland east of Chilliwack", image: "https://www.env.gov.bc.ca/bcparks/explore/parkpgs/bridal_veil/bridal-veil-falls.jpg?w=400&h=250", link: "https://bcparks.ca/bridal-veil-falls-park/" },
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
    bridalVeillFalls: { lat: 49.185301, lng: -121.744080, name: "Bridal Veil Falls Provincial Park", type: "hiking", description: "60-meter waterfall accessible via easy 800m hike, 32 acres of protected area", image: "https://www.env.gov.bc.ca/bcparks/explore/parkpgs/bridal_veil/bridal-veil-falls.jpg?w=400&h=250", link: "https://bcparks.ca/bridal-veil-falls-park/" },
    
    harrisonHotSprings: { lat: 49.300000, lng: -121.775800, name: "Harrison Hot Springs", type: "cultural", description: "Natural hot springs resort village 90 minutes east of Vancouver", image: "https://www.harrisonresort.com/wp-content/uploads/2020/03/harrison-hot-springs-resort.jpg?w=400&h=250", link: "https://www.harrisonresort.com/" },
    
    sasquatchPark: { lat: 49.353657, lng: -121.704150, name: "Sasquatch Provincial Park", type: "hiking", description: "1,217 hectares touching four lakes including Harrison Lake, 6km north of Harrison Hot Springs", image: "https://www.env.gov.bc.ca/bcparks/explore/parkpgs/sasquatch/sasquatch-park.jpg?w=400&h=250", link: "https://bcparks.ca/sasquatch-park/" },
    
    cultusLake: { lat: 49.053300, lng: -121.986700, name: "Cultus Lake Provincial Park", type: "beach", description: "656 hectares park with warm lake recreation, 11km southwest of Chilliwack", image: "https://www.env.gov.bc.ca/bcparks/explore/parkpgs/cultus_lk/cultus-lake-beach.jpg?w=400&h=250", link: "https://bcparks.ca/cultus-lake-park/" },
    
    cathedralPark: { lat: 49.067700, lng: -120.142000, name: "Cathedral Provincial Park", type: "hiking", description: "33,272 hectares wilderness park named after Cathedral Mountain, 3km west of Keremeos", image: "https://www.env.gov.bc.ca/bcparks/explore/parkpgs/cathedral/cathedral-mountain.jpg?w=400&h=250", link: "https://bcparks.ca/cathedral-park/" },
    
    manningPark: { lat: 49.061389, lng: -120.787500, name: "E.C. Manning Provincial Park", type: "hiking", description: "70,844 hectares of alpine wilderness on Highway 3, known for wildflower meadows and mountain views", image: "https://www.env.gov.bc.ca/bcparks/explore/parkpgs/ec_manning/manning-park-meadows.jpg?w=400&h=250", link: "https://bcparks.ca/ec-manning-park/" },
    
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
    
    // Highway 3 (Crowsnest) Attractions - Osoyoos to Hope
    hopeDowntown: { lat: 49.384800, lng: -121.438500, name: "Hope Town Center", type: "cultural", description: "Famous as filming location for First Blood (Rambo), chainsaw carving capital with visitor center", image: "https://www.hopetourism.ca/wp-content/uploads/2020/05/hope-town-center.jpg?w=400&h=250", link: "https://www.hopetourism.ca/" },
    
    lightningLakeTrail: { lat: 49.070000, lng: -120.780000, name: "Lightning Lake Trail", type: "hiking", description: "Popular 2.4km Manning Park trail around alpine lake with Rainbow Bridge and mountain views", image: "https://www.env.gov.bc.ca/bcparks/explore/parkpgs/ec_manning/lightning-lake.jpg?w=400&h=250", link: "https://bcparks.ca/ec-manning-park/" },
    
    allisonPass: { lat: 49.060000, lng: -120.750000, name: "Allison Pass", type: "scenic", description: "Mountain pass on Highway 3 at 1,342m elevation, spectacular alpine scenery and photo opportunities", image: "https://www.drivebc.ca/wp-content/uploads/2020/07/allison-pass-summit.jpg?w=400&h=250", link: "https://www.drivebc.ca/" },
    
    princeton: { lat: 49.455300, lng: -120.503600, name: "Princeton", type: "cultural", description: "Historic market center where Tulameen and Similkameen Rivers meet, museum and antique shops", image: "https://www.princeton.ca/wp-content/uploads/2020/06/princeton-downtown.jpg?w=400&h=250", link: "https://www.princeton.ca/" },
    
    hedleyMuseum: { lat: 49.354800, lng: -120.072200, name: "Hedley Museum", type: "cultural", description: "Historic mining town museum with gold rush artifacts and Similkameen River tubing nearby", image: "https://www.hedleymuseum.ca/wp-content/uploads/2020/05/hedley-museum-exterior.jpg?w=400&h=250", link: "https://www.hedleymuseum.ca/" },
    
    keremeosGristMill: { lat: 49.200000, lng: -119.850000, name: "Keremeos Grist Mill", type: "cultural", description: "1877 historic flour mill still operating with original equipment, seasonal demonstrations", image: "https://www.keremeosmill.ca/wp-content/uploads/2020/06/keremeos-grist-mill.jpg?w=400&h=250", link: "https://www.keremeosmill.ca/" },
    
    orifinoWinery: { lat: 49.180000, lng: -119.800000, name: "Orofino Winery", type: "wine", description: "Canada's first strawbale winery in Cawston, sustainable practices and unique architecture", image: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&h=250", link: "https://orofinowinery.com/" },
    
    sevenStonesWinery: { lat: 49.190000, lng: -119.820000, name: "Seven Stones Winery", type: "wine", description: "Organic vineyard with scenic mountain views in Cawston Valley, small-batch artisan wines", image: "https://sevenstoneswinery.com/wp-content/uploads/2020/05/seven-stones-vineyard.jpg?w=400&h=250", link: "https://sevenstoneswinery.com/" },
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

// 热门餐厅 - 沿线标志性高评分餐厅
const restaurants = {
    // Chilliwack area restaurants
    brooklynPizza: { lat: 49.1625, lng: -121.9513, name: "Brooklyn Pizza", type: "restaurant", description: "Popular local pizzeria known for authentic New York style pizza and friendly atmosphere in Chilliwack", link: "https://www.facebook.com/BrooklynPizzaChilliwack/" },
    whiteSpotChilliwack: { lat: 49.1580, lng: -121.9480, name: "White Spot Chilliwack", type: "restaurant", description: "Classic Canadian family restaurant famous for Triple O burgers and legendary pies", link: "https://www.whitespot.ca/" },
    oldEastIndian: { lat: 49.1690, lng: -121.9587, name: "Old East Indian Cuisine", type: "restaurant", description: "Highly rated authentic Indian restaurant with traditional curries and tandoor specialties", link: "https://www.facebook.com/OldEastIndianCuisineChilliwack/" },
    
    // Hope area restaurants  
    homeRestaurantHope: { lat: 49.3800, lng: -121.4400, name: "Home Restaurant & Pie Shop", type: "restaurant", description: "Famous pie shop and family restaurant, Hope's most beloved dining spot since 1940s", link: "https://www.homerestaurant.ca/" },
    logCabinPub: { lat: 49.3820, lng: -121.4380, name: "Log Cabin Pub", type: "restaurant", description: "Rustic pub with hearty comfort food, steaks and burgers in a cozy log cabin atmosphere", link: "https://www.facebook.com/LogCabiPubHope/" },
    hopeMountainCentre: { lat: 49.3790, lng: -121.4420, name: "Hope Mountain Centre Cafe", type: "restaurant", description: "Mountain cafe with fresh coffee, homemade soups and sandwiches, popular with hikers and locals", link: "https://www.hopemountaincentre.ca/" },
    
    // Merritt area restaurants
    centralHotelMerritt: { lat: 50.1126, lng: -120.7853, name: "Central Hotel Restaurant", type: "restaurant", description: "Historic hotel restaurant serving steaks, seafood and Canadian classics in downtown Merritt since 1908", link: "https://www.centralhotelmerritt.com/" },
    collinsBar: { lat: 50.1120, lng: -120.7840, name: "Collins Bar & Grill", type: "restaurant", description: "Popular sports bar and grill with comfort food, wings and local craft beers", link: "https://www.facebook.com/CollinsBarGrill/" },
    quilchenaHotel: { lat: 50.1100, lng: -120.7900, name: "Quilchena Hotel Restaurant", type: "restaurant", description: "Historic 1908 hotel restaurant with fine dining, steaks and regional cuisine", link: "https://www.quilchenahotel.com/" },
    
    // Kamloops area restaurants
    kekuKamloops: { lat: 50.6745, lng: -120.3273, name: "Kekuli Cafe", type: "restaurant", description: "Indigenous-owned cafe famous for bannock burgers and fry bread, celebrating First Nations cuisine", link: "https://www.kekulicafe.com/" },
    redCollarBrewing: { lat: 50.6720, lng: -120.3350, name: "Red Collar Brewing", type: "restaurant", description: "Local craft brewery with gastropub menu, wood-fired pizzas and Kamloops-brewed beers", link: "https://www.redcollarbrewing.com/" },
    theNobleKamloops: { lat: 50.6750, lng: -120.3400, name: "The Noble Pig Brewhouse", type: "restaurant", description: "Award-winning brewpub with craft beers and elevated pub fare, consistently rated best in Kamloops", link: "https://www.noblepigbrewhouse.com/" },
    helmsKamloops: { lat: 50.6700, lng: -120.3300, name: "Helm's Restaurant", type: "restaurant", description: "Upscale steakhouse and seafood restaurant with extensive wine list and elegant atmosphere", link: "https://www.helmsrestaurant.ca/" },
    brownsBowl: { lat: 50.6780, lng: -120.3250, name: "Brown's Social House", type: "restaurant", description: "Modern casual dining with creative dishes, craft cocktails and lively social atmosphere", link: "https://www.brownssocialhouse.com/" },
    
    // Kelowna area restaurants
    raudhusKelowna: { lat: 49.8880, lng: -119.4960, name: "Raudz Regional Table", type: "restaurant", description: "Award-winning restaurant showcasing Okanagan ingredients, voted best fine dining in Kelowna", link: "https://www.raudz.com/" },
    gatherKelowna: { lat: 49.8863, lng: -119.4967, name: "Gather Restaurant", type: "restaurant", description: "Farm-to-table restaurant with seasonal menu, locally-sourced ingredients and creative West Coast cuisine", link: "https://www.gatherkelowna.com/" },
    kraftyKitchen: { lat: 49.8920, lng: -119.4950, name: "Krafty Kitchen + Bar", type: "restaurant", description: "Contemporary restaurant with innovative comfort food and extensive craft beer selection", link: "https://www.kraftykitchen.ca/" },
    waterfrontWine: { lat: 49.8958, lng: -119.4958, name: "Waterfront Wine Bar", type: "restaurant", description: "Upscale wine bar and restaurant with lake views, featuring Okanagan wines and farm-to-table cuisine", link: "https://www.waterfrontwines.ca/" },
    cookKelowna: { lat: 49.8850, lng: -119.4980, name: "COOK Kelowna", type: "restaurant", description: "Modern Canadian cuisine with locally-sourced ingredients, known for innovative seasonal menus", link: "https://www.cookkelowna.com/" },
    microBar: { lat: 49.8900, lng: -119.4940, name: "Micro Bar + Bites", type: "restaurant", description: "Intimate wine bar with small plates, featuring local wines and artisanal charcuterie", link: "https://www.microbarkelowna.com/" },
    
    // Penticton area restaurants
    theHotel: { lat: 49.4991, lng: -119.5937, name: "The Hotel Penticton Restaurant", type: "restaurant", description: "Historic hotel's upscale restaurant featuring locally-sourced ingredients and extensive wine list", link: "https://www.hotelpenticton.com/" },
    sageRestaurant: { lat: 49.4980, lng: -119.5920, name: "Sage Restaurant at The Lakeside Resort", type: "restaurant", description: "Fine dining restaurant with lakefront views, featuring contemporary cuisine and Okanagan wines", link: "https://www.lakesideresort.bc.ca/" },
    olympia: { lat: 49.4970, lng: -119.5950, name: "Olympia Pizza & Spaghetti House", type: "restaurant", description: "Family-owned Italian restaurant serving authentic pizza and pasta since 1960, local institution", link: "https://www.olympiarestaurant.ca/" },
    whipperSnapper: { lat: 49.4900, lng: -119.5920, name: "Whipper Snapper Distillery", type: "restaurant", description: "Craft distillery with tasting room and restaurant, specializing in spirits and elevated pub fare", link: "https://www.whippersnapperdistillery.com/" },
    
    // Oliver area restaurants
    oliverTwist: { lat: 49.1832, lng: -119.5506, name: "Oliver Twist Restaurant", type: "restaurant", description: "Family restaurant serving hearty Canadian fare and comfort food in downtown Oliver for over 20 years", link: "https://www.facebook.com/OliverTwistRestaurant/" },
    mainstreetGrill: { lat: 49.1820, lng: -119.5520, name: "Mainstreet Grill", type: "restaurant", description: "Popular local steakhouse known for perfectly grilled steaks, ribs and fresh seafood", link: "https://www.facebook.com/MainstreetGrillOliver/" },
    oliverEats: { lat: 49.1840, lng: -119.5480, name: "Oliver Eats Cafe", type: "restaurant", description: "Cozy cafe with homemade breakfast and lunch favorites, fresh baking and local coffee", link: "https://www.facebook.com/OliverEatsCafe/" },
    
    // Osoyoos area restaurants
    campo: { lat: 49.0325, lng: -119.4682, name: "Campo Marina Restaurant", type: "restaurant", description: "Lakefront restaurant with patio dining, Italian cuisine, and beautiful views of Osoyoos Lake", link: "https://www.camporestaurant.com/" },
    nkMipCellarsRestaurant: { lat: 49.0280, lng: -119.4430, name: "Nk'Mip Cellars Restaurant", type: "restaurant", description: "Fine dining at North America's first Indigenous-owned winery, featuring fusion cuisine and wine pairings", link: "https://www.nkmipcellars.com/" },
    fieldstoneRestaurant: { lat: 49.0300, lng: -119.4650, name: "Fieldstone Fruit Wines Restaurant", type: "restaurant", description: "Unique fruit wine tasting with light meals, featuring wines made from Okanagan fruits", link: "https://www.fieldstonewines.com/" },
    boatersBeach: { lat: 49.0350, lng: -119.4700, name: "Boaters Beach House", type: "restaurant", description: "Casual lakefront dining with fresh seafood, burgers and cocktails, perfect summer patio", link: "https://www.facebook.com/BoatersBeachHouse/" }
};

// 主要城镇和地标 (English names for original data storage)
const mainLocations = {
    burnaby: { lat: 49.2488, lng: -122.9805, name: "Burnaby", type: "city" },
    merritt: { lat: 50.1128, lng: -120.7847, name: "Merritt", type: "city" },
    kelowna: { lat: 49.8880, lng: -119.4960, name: "Kelowna", type: "city" },
    kelownaWaterfront: { lat: 49.8863, lng: -119.4967, name: "Kelowna Waterfront", type: "waterfront" },
    peachland: { lat: 49.7791, lng: -119.7367, name: "Peachland", type: "city" },
    penticton: { lat: 49.4991, lng: -119.5937, name: "Penticton", type: "city" },
    osoyoos: { lat: 49.0325, lng: -119.4682, name: "Osoyoos", type: "city" },
    oliver: { lat: 49.1832, lng: -119.5506, name: "Oliver", type: "city" },
    hope: { lat: 49.3858, lng: -121.4424, name: "Hope", type: "city" }
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
    outdoor: { icon: '⛷️', color: '#2c3e50', size: 'medium' },
    restaurant: { icon: '🍽️', color: '#c0392b', size: 'medium' },
    upick: { icon: '🍑', color: '#ff6b6b', size: 'medium' }
};

// 创建自定义标记
// Cache for marker icons to improve performance
const markerIconCache = new Map();

function createCustomMarker(location) {
    const iconData = customIcons[location.type] || customIcons.scenic;
    const cacheKey = `${location.type}-${iconData.size}`;
    
    // Return cached icon if available
    if (markerIconCache.has(cacheKey)) {
        return markerIconCache.get(cacheKey);
    }
    
    const size = iconData.size === 'large' ? [40, 40] : [30, 30];
    
    const icon = L.divIcon({
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
            box-shadow: ${isMobile ? '0 2px 4px rgba(0,0,0,0.2)' : '0 4px 8px rgba(0,0,0,0.3)'};
            border: ${isMobile ? '2px' : '3px'} solid white;
            will-change: transform;
            -webkit-transform: translateZ(0);
            transform: translateZ(0);
        ">${iconData.icon}</div>`,
        className: 'custom-marker-icon',
        iconSize: size,
        iconAnchor: [size[0]/2, size[1]/2]
    });
    
    // Cache the icon
    markerIconCache.set(cacheKey, icon);
    return icon;
}

// 初始化函数
function initMap() {
    // 初始化和清理路线缓存
    routeCache.init();
    
    // 定义地图边界 (限制在BC省南部和Okanagan地区 - 使用固定的大边界)
    const southWest = L.latLng(47.0, -125.0); // 南西角 (扩大边界)
    const northEast = L.latLng(53.0, -115.0); // 北东角 (扩大边界)
    const bounds = L.latLngBounds(southWest, northEast);
    
    // 创建地图 (minZoom: 6 limits scaling to ~100km view, bounds limit panning area)
    const mapOptions = {
        minZoom: 6,
        maxZoom: 18,
        maxBounds: bounds,
        maxBoundsViscosity: 0.0,
        wheelPxPerZoomLevel: 60,
        zoomSnap: 0.1,
        // Mobile optimizations
        tap: !isIOS, // Disable tap on iOS to prevent delay
        tapTolerance: 40,
        touchZoom: isMobile ? 'center' : true,
        bounceAtZoomLimits: false,
        // Performance optimizations
        zoomAnimation: !isMobile, // Disable zoom animation on mobile
        fadeAnimation: !isMobile,
        markerZoomAnimation: !isMobile,
        preferCanvas: isMobile, // Use canvas renderer on mobile for better performance
        renderer: isMobile ? L.canvas({ padding: 0.5 }) : L.svg()
    };
    
    map = L.map('map', mapOptions).setView([49.5, -119.5], 7);
    
    // 添加地图图层
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    // 显示完整的旅游路线
    showCompleteRoute();
    
    // 添加地图控件
    addMapControls();
}

// 显示完整的旅游路线
function showCompleteRoute() {
    // 清除现有路线和标记
    clearMap();
    
    // 分别添加不同类型的标记
    addLocationMarkers();
    
    // 创建驾驶路线
    createRoute();
}

// 创建主要驾驶路线（只创建路线，不影响标记）
function createRoute() {
    // 创建主要驾驶路线（包含酒店和景点）
    const mainRoutePoints = [
        mainLocations.burnaby,
        mainLocations.merritt,
        mainLocations.kelowna,
        hotels.deltaHotel,
        attractions.kangarooCreekFarm,
        mainLocations.penticton,
        mainLocations.oliver,
        mainLocations.osoyoos,
        hotels.walnutBeach,
        mainLocations.hope,
        mainLocations.burnaby
    ];
    
    const waypoints = mainRoutePoints.map(loc => L.latLng(loc.lat, loc.lng));
    
    // Ensure any existing route control is cleaned up first
    if (routeControl) {
        try {
            map.removeControl(routeControl);
        } catch (e) {
            console.warn('Error removing existing route control:', e);
        }
        routeControl = null;
    }
    
    // 检查缓存
    const cachedRoute = routeCache.get(waypoints);
    
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
        show: false,
        fitSelectedRoutes: false,
        router: L.Routing.osrmv1({
            serviceUrl: 'https://router.project-osrm.org/route/v1',
            profile: 'driving',
            timeout: 10000, // 10秒超时
            
            // 自定义路线请求函数，实现缓存和重试逻辑
            route: function(waypoints, callback, context, options) {
                // 检查缓存
                const cached = routeCache.get(waypoints);
                if (cached) {
                    setTimeout(() => callback.call(context, null, cached), 0);
                    return;
                }
                
                // 实现重试逻辑
                let retryCount = 0;
                const maxRetries = 3;
                const retryDelay = 2000; // 2秒延迟
                
                const attemptRoute = () => {
                    // 调用原始OSRM路由器
                    const originalRouter = L.Routing.osrmv1({
                        serviceUrl: 'https://router.project-osrm.org/route/v1',
                        profile: 'driving',
                        timeout: 10000
                    });
                    
                    originalRouter.route(waypoints, function(error, routes) {
                        if (error) {
                            console.warn(`Route attempt ${retryCount + 1} failed:`, error);
                            
                            if (retryCount < maxRetries) {
                                retryCount++;
                                console.log(`Retrying in ${retryDelay}ms... (attempt ${retryCount}/${maxRetries})`);
                                setTimeout(attemptRoute, retryDelay);
                                return;
                            }
                            
                            // 最大重试次数后，使用简单直线连接作为后备方案
                            console.warn('All routing attempts failed, using fallback route');
                            const fallbackRoute = createFallbackRoute(waypoints);
                            callback.call(context, null, [fallbackRoute]);
                        } else {
                            // 成功获取路线，存入缓存
                            if (routes && routes.length > 0) {
                                routeCache.set(waypoints, routes);
                            }
                            callback.call(context, error, routes);
                        }
                    }, context, options);
                };
                
                attemptRoute();
            }
        })
    }).addTo(map);
    
    // Auto-centering removed - users can manually navigate the map
}

// 过滤器功能
function filterMarkers(filterType) {
    currentFilter = filterType;
    
    // 更新按钮状态
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`filter${filterType.charAt(0).toUpperCase() + filterType.slice(1)}`).classList.add('active');
    
    // 只更新标记显示，不重新创建路线
    updateMarkerVisibility();
}

// 更新标记显示（不重新创建路线）
function updateMarkerVisibility() {
    // 清除现有标记
    clearMarkers();
    
    // 重新添加符合过滤条件的标记
    addLocationMarkers();
}

// 只清除标记，保留路线
function clearMarkers() {
    markers.forEach(marker => {
        try {
            if (map && marker) {
                map.removeLayer(marker);
            }
        } catch (e) {
            console.warn('Error removing marker:', e);
        }
    });
    markers = [];
}

// 检查标记是否应该显示
function shouldShowMarker(location) {
    if (currentFilter === 'all') return true;
    
    if (currentFilter === 'dining') {
        return location.type === 'restaurant' || location.type === 'wine';
    }
    
    if (currentFilter === 'landmarks') {
        return location.type !== 'restaurant' && location.type !== 'wine';
    }
    
    return true;
}

// 添加所有位置标记
function addLocationMarkers() {
    // Use layer group for better performance
    const markerLayer = L.layerGroup();
    
    // Batch create all markers first, then add to map at once
    const markersToAdd = [];
    
    // 添加酒店标记（最突出）
    Object.values(hotels).forEach(location => {
        if (!shouldShowMarker(location)) return;
        
        const marker = L.marker([location.lat, location.lng], {
            icon: createCustomMarker(location),
            zIndexOffset: 1000,  // Ensure hotels appear on top of all other markers
            // Mobile optimizations
            riseOnHover: !isMobile,
            autoPanOnFocus: false
        });
        
        // Defer popup content creation for better performance
        marker.on('click', function() {
            if (!this.getPopup()) {
                const originalName = originalData ? Object.values(originalData.hotels).find(h => h.lat === location.lat && h.lng === location.lng)?.name : null;
                const accurateImageUrl = getAccurateImageUrl(location, originalName);
                const popupContent = `
                    <div class="popup-content">
                        <h4>${customIcons[location.type].icon} ${location.name}</h4>
                        <p><strong>${getTranslatedTypeDescription(location.type)}</strong></p>
                        <img src="${accurateImageUrl}" alt="${location.name}" style="width:100%; max-width:300px; height:150px; object-fit:cover; border-radius:6px; margin:8px 0;" loading="lazy">
                        <p>${currentLanguage === 'zh' ? '湖滨豪华度假村，设施齐全，景色优美' : 'Luxury lakefront resort with full amenities and stunning views'}</p>
                        ${location.link ? `<a href="${location.link}" target="_blank" class="external-link">📍 ${currentLanguage === 'zh' ? '更多详情' : 'More Details'}</a>` : ''}
                    </div>
                `;
                this.bindPopup(popupContent, { autoPan: false }).openPopup();
            }
        });
        
        markersToAdd.push(marker);
        markers.push(marker);
    });
    
    // 添加景点标记
    Object.entries(attractions).forEach(([key, location]) => {
        if (!shouldShowMarker(location)) return;
        
        const marker = L.marker([location.lat, location.lng], {
            icon: createCustomMarker(location),
            zIndexOffset: 200,  // Attractions appear above restaurants but below main locations
            riseOnHover: !isMobile,
            autoPanOnFocus: false
        });
        
        // Defer popup content creation
        marker.on('click', function() {
            if (!this.getPopup()) {
                const originalDescription = originalData ? originalData.attractions[key].description : location.description;
                const description = getTranslatedDescription(originalDescription) || getAttractionDescription(location.name);
                const originalName = originalData ? originalData.attractions[key].name : null;
                const accurateImageUrl = getAccurateImageUrl(location, originalName);
                
                const popupContent = `
                    <div class="popup-content">
                        <h4>${customIcons[location.type].icon} ${location.name}</h4>
                        <p><strong>${getTranslatedTypeDescription(location.type)}</strong></p>
                        <img src="${accurateImageUrl}" alt="${location.name}" style="width:100%; max-width:300px; height:150px; object-fit:cover; border-radius:6px; margin:8px 0;" loading="lazy">
                        <p>${description}</p>
                        ${location.link ? `<a href="${location.link}" target="_blank" class="external-link">📍 ${currentLanguage === 'zh' ? '更多详情' : 'More Details'}</a>` : ''}
                    </div>
                `;
                
                this.bindPopup(popupContent, { autoPan: false }).openPopup();
            }
        });
        
        markersToAdd.push(marker);
        markers.push(marker);
    });
    
    // 添加餐厅标记
    Object.entries(restaurants).forEach(([key, location]) => {
        if (!shouldShowMarker(location)) return;
        
        const marker = L.marker([location.lat, location.lng], {
            icon: createCustomMarker(location),
            zIndexOffset: 100,  // Restaurants appear at the bottom of the hierarchy
            riseOnHover: !isMobile,
            autoPanOnFocus: false
        });
        
        // Defer popup content creation
        marker.on('click', function() {
            if (!this.getPopup()) {
                const originalName = originalData ? originalData.restaurants?.[key]?.name || location.name : location.name;
                const accurateImageUrl = getAccurateImageUrl(location, originalName);
                
                const originalDescription = originalData && originalData.restaurants ? originalData.restaurants[key].description : location.description;
                const description = getTranslatedDescription(originalDescription) || getAttractionDescription(location.name);
                
                const popupContent = `
                    <div class="popup-content">
                        <h4>${customIcons[location.type].icon} ${location.name}</h4>
                        <p><strong>${getTranslatedTypeDescription(location.type)}</strong></p>
                        <img src="${accurateImageUrl}" alt="${location.name}" style="width:100%; max-width:300px; height:150px; object-fit:cover; border-radius:6px; margin:8px 0;" loading="lazy">
                        <p>${description}</p>
                        ${location.link ? `<a href="${location.link}" target="_blank" class="external-link">📍 ${currentLanguage === 'zh' ? '更多详情' : 'More Details'}</a>` : ''}
                    </div>
                `;
                
                this.bindPopup(popupContent, { autoPan: false }).openPopup();
            }
        });
        
        markersToAdd.push(marker);
        markers.push(marker);
    });
    
    // 添加主要城镇标记
    Object.values(mainLocations).forEach(location => {
        if (!shouldShowMarker(location)) return;
        
        const marker = L.marker([location.lat, location.lng], {
            icon: createCustomMarker(location),
            zIndexOffset: 500,  // Main locations appear above attractions but below hotels
            riseOnHover: !isMobile,
            autoPanOnFocus: false
        });
        
        // Defer popup content creation
        marker.on('click', function() {
            if (!this.getPopup()) {
                const popupContent = `
                    <div class="popup-content">
                        <h4>${customIcons[location.type].icon} ${location.name}</h4>
                        <p><strong>${getTranslatedTypeDescription(location.type)}</strong></p>
                        <p>${currentLanguage === 'zh' ? '奥卡纳根路线上的重要站点' : 'Key stop along the Okanagan route'}</p>
                    </div>
                `;
                
                this.bindPopup(popupContent, { autoPan: false }).openPopup();
            }
        });
        
        markersToAdd.push(marker);
        markers.push(marker);
    });
    
    // Add all markers to map at once for better performance
    if (isMobile) {
        // On mobile, use requestAnimationFrame for smoother rendering
        requestAnimationFrame(() => {
            markersToAdd.forEach(marker => {
                markerLayer.addLayer(marker);
            });
            markerLayer.addTo(map);
        });
    } else {
        // On desktop, add directly
        markersToAdd.forEach(marker => {
            markerLayer.addLayer(marker);
        });
        markerLayer.addTo(map);
    }
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
        "穴居猫头鹰酒庄": "奥利弗地区顶级酒庄，以红酒闻名",
        
        // 餐厅描述
        "布鲁克林披萨": "深受当地人喜爱的披萨店，以正宗纽约风味披萨和友好氛围闻名于奇利瓦克",
        "白点餐厅奇利瓦克店": "经典加拿大家庭餐厅，以Triple O汉堡和传奇馅饼闻名",
        "老东印度料理": "备受好评的正宗印度餐厅，传统咖喱和唐杜里烤肉特色菜",
        "家乡餐厅暨馅饼店": "著名的馅饼店和家庭餐厅，自1940年代以来深受希望镇居民喜爱",
        "木屋酒吧": "朴实酒吧，舒适美食、牛排和汉堡，原木小屋氛围",
        "希望山中心咖啡厅": "山区咖啡厅，新鲜咖啡、自制汤品和三明治，徒步者和当地人喜爱",
        "中心酒店餐厅": "历史悠久的酒店餐厅，自1908年起在梅里特市中心供应牛排、海鲜和加拿大经典菜肴",
        "柯林斯酒吧烤肉店": "受欢迎的体育酒吧烤肉店，舒适美食、鸡翅和当地精酿啤酒",
        "奎尔奇纳酒店餐厅": "1908年历史酒店餐厅，高级餐饮、牛排和地方美食",
        "克库利咖啡馆": "原住民拥有的咖啡馆，以班诺克汉堡和炸面包闻名，弘扬第一民族美食",
        "红领啤酒厂": "当地精酿啤酒厂，提供美食酒吧菜单、木火披萨和坎卢普斯本地啤酒",
        "贵族猪酿酒屋": "获奖酿酒酒吧，精酿啤酒和高级酒吧美食，持续被评为坎卢普斯最佳",
        "赫尔姆餐厅": "高档牛排海鲜餐厅，丰富酒单和优雅氛围",
        "布朗社交餐厅": "现代休闲餐饮，创意菜肴、手工鸡尾酒和活跃社交氛围",
        "劳兹地方风味餐厅": "获奖餐厅，展示奥卡纳根本地食材，被评为基洛纳最佳高级餐厅",
        "聚会餐厅": "农场到餐桌的餐厅，季节性菜单，本地食材和创意西海岸美食",
        "工艺厨房酒吧": "现代餐厅，创新舒适美食和丰富精酿啤酒选择",
        "湖滨酒吧": "高档酒吧餐厅，湖景，奥卡纳根葡萄酒和农场到餐桌美食",
        "库克基洛纳餐厅": "现代加拿大料理，本地食材，以创新季节性菜单闻名",
        "微型酒吧小食": "私密酒吧，小食，当地葡萄酒和手工熟食",
        "彭蒂克顿酒店餐厅": "历史酒店的高档餐厅，采用本地食材，提供丰富的葡萄酒单",
        "湖滨度假村贤哲餐厅": "高级餐厅，湖滨景观，现代料理和奥卡纳根葡萄酒",
        "奥林匹亚披萨意面屋": "家族经营意大利餐厅，自1960年供应正宗披萨和意面，当地传统",
        "鞭炮酿酒厂": "精酿酒厂，品酒室和餐厅，专门供应烈酒和高级酒吧美食",
        "奥利弗扭转餐厅": "家庭餐厅，20多年来在奥利弗市中心供应丰盛的加拿大菜肴和舒适美食",
        "主街烤肉店": "受欢迎的当地牛排屋，以完美烤制牛排、排骨和新鲜海鲜闻名",
        "奥利弗美食咖啡厅": "舒适咖啡厅，自制早餐和午餐美食，新鲜烘焙和当地咖啡",
        "坎波码头餐厅": "湖滨餐厅，露台用餐，意大利美食，奥索尤斯湖美景",
        "Nk'Mip酒窖餐厅": "北美第一家原住民拥有酒庄的高级餐厅，融合料理和葡萄酒搭配",
        "田石果酒餐厅": "独特果酒品尝配清淡餐食，采用奥卡纳根水果酿制的葡萄酒",
        "船民海滨小屋": "休闲湖滨餐厅，新鲜海鲜、汉堡和鸡尾酒，完美夏日露台"
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
        outdoor: "Outdoor Recreation",
        restaurant: "Restaurant & Dining",
        upick: "U-Pick Fruit Farm"
    };
    return types[type] || "Tourist Attraction";
}

// 移除旧的图标函数，使用新的自定义标记系统

// 清除地图上的标记和路线
function clearMap() {
    // 清除标记
    markers.forEach(marker => {
        try {
            if (map && marker) {
                map.removeLayer(marker);
            }
        } catch (e) {
            console.warn('Error removing marker:', e);
        }
    });
    markers = [];
    
    // 清除路线
    try {
        if (routeControl && map) {
            map.removeControl(routeControl);
        }
    } catch (e) {
        console.warn('Error removing route control:', e);
    }
    routeControl = null;
}

// 添加地图控件的函数
function addMapControls() {
    // 添加地图控件
    L.control.scale({
        imperial: false,
        metric: true,
        position: 'bottomright'
    }).addTo(map);
    
    // 全屏控件暂时移除以避免加载错误
    // Note: Fullscreen functionality can be added back when plugin loads properly
}

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

// 语言切换功能
let currentLanguage = 'zh'; // 默认中文
let originalData = null; // 存储原始英文数据
let currentFilter = 'all'; // 当前过滤器状态

// 完整的翻译对照表
const translations = {
    zh: {
        title: '🍷 奥肯纳根旅游指南 🏔️',
        subtitle: '从温哥华到奥肯纳根湖区 • 热门景点与美食指南',
        langBtn: 'EN',
        // 过滤器翻译
        filters: {
            all: '全部',
            landmarks: '景点',
            dining: '美食'
        },
        // 酒店翻译
        hotels: {
            'Delta Hotels Grand Okanagan Resort': '奥卡纳根三角洲豪华度假村',
            'Walnut Beach Resort': '核桃海滩度假村'
        },
        // 景点翻译
        attractions: {
            'Othello Tunnels': '奥赛罗隧道',
            'Coquihalla Canyon Provincial Park': '科基哈拉峡谷省立公园',
            'Britton Creek Rest Area': '布里顿溪休息区',
            'Zopkios Rest Area': '佐普基奥斯休息区',
            'Falls Lake Trail': '瀑布湖步道',
            'Coquihalla Summit': '科基哈拉山顶',
            'Nicola Lake': '尼古拉湖',
            'Beaver Ranch Flats Conservation Area': '海狸牧场平地保护区',
            'Lady of Lourdes Log Church': '卢尔德圣母木教堂',
            'Roche Lake Provincial Park': '罗氏湖省立公园',
            'Trapp Lake': '特拉普湖',
            "Hell's Gate Airtram": '地狱门空中缆车',
            'Boston Bar Rest Area': '波士顿酒吧休息区',
            'Spuzzum Creek Rest Area': '斯普祖姆溪休息区',
            'Alexandra Bridge Provincial Park': '亚历山德拉桥省立公园',
            'Monte Creek Winery': '蒙特溪酒庄',
            'Kenna Cartwright Park': '肯纳·卡特莱特公园',
            'Peterson Creek Nature Park': '彼得森溪自然公园',
            'Myra Canyon Trestles': '迈拉峡谷栈桥',
            'Knox Mountain Park': '诺克斯山公园',
            'Okanagan Mountain Provincial Park': '奥卡纳根山省立公园',
            'Bear Creek Provincial Park': '熊溪省立公园',
            'Kelowna Waterfront Park': '基洛纳滨水公园',
            "Quails' Gate Winery": '鹌鹑门酒庄',
            'Summerhill Pyramid Winery': '夏山金字塔酒庄',
            'Mission Hill Family Estate': '传教山家族酒庄',
            'Pincushion Mountain Trail': '针垫山步道',
            'Hardy Falls Regional Park': '哈迪瀑布地区公园',
            'Antlers Beach Regional Park': '鹿角海滩地区公园',
            'Sun-Oka Beach Provincial Park': '阳光奥卡海滩省立公园',
            "Giant's Head Mountain Park": '巨人头山公园',
            'Skaha Beach': '斯卡哈海滩',
            'Okanagan Beach': '奥卡纳根海滩',
            'Skaha Bluffs Provincial Park': '斯卡哈悬崖省立公园',
            'Munson Mountain': '曼森山',
            'Manitou Beach': '马尼托海滩',
            'Tinhorn Creek Vineyards': '锡角溪葡萄园',
            'Black Hills Estate Winery': '黑山庄园酒庄',
            'Burrowing Owl Estate Winery': '穴居猫头鹰庄园酒庄',
            'Spotted Lake': '斑点湖',
            "Nk'Mip Cellars": "Nk'Mip酒窖",
            'Osoyoos Desert Centre': '奥索尤斯沙漠中心',
            'Osoyoos Lake': '奥索尤斯湖',
            'Kelowna Museums': '基洛纳博物馆',
            'Penticton Museum': '彭蒂克顿博物馆',
            'Kangaroo Creek Farm': '袋鼠溪农场',
            'ZipZone Peachland': '桃地镇飞索',
            'Kuipers Family Fruit Farm': '奎珀斯家庭果园',
            'Rose Hill Orchard': '玫瑰山果园',
            'Hillside Orchards': '山坡果园',
            'Bridal Veil Falls Provincial Park': '新娘面纱瀑布省立公园',
            'Harrison Hot Springs': '哈里森温泉',
            'Sasquatch Provincial Park': '野人省立公园',
            'Golden Ears Provincial Park': '金耳朵省立公园',
            'Cultus Lake Provincial Park': '文化湖省立公园',
            'Cathedral Provincial Park': '大教堂省立公园',
            'Stein Valley Nlaka\'pamux Heritage Park': '斯坦因谷原住民遗产公园',
            'Kamloops Lake Viewpoint': '坎卢普斯湖观景点',
            'Kalamalka Lake Lookout': '卡拉马尔卡湖观景台',
            'Munson Mountain Scenic Lookout': '曼森山风景观景台',
            'Kamloops Scenic Outlook': '坎卢普斯风景观景台',
            'Big White Ski Resort': '大白山滑雪场',
            'Silver Star Mountain Resort': '银星山度假村',
            'Hope Town Center': '希望镇中心',
            'Lightning Lake Trail': '闪电湖步道',
            'Allison Pass': '艾利森山口',
            'Princeton': '普林斯顿',
            'Hedley Museum': '赫德利博物馆',
            'Keremeos Grist Mill': '克里米奥斯磨坊',
            'Orofino Winery': '奥罗菲诺酒庄',
            'Seven Stones Winery': '七石酒庄',
            'Road 13 Vineyards': '13号公路葡萄园',
            'Sun Peaks Resort': '太阳峰度假村',
            // 新增缺失的景点翻译
            'E.C. Manning Provincial Park': 'E.C.曼宁省立公园',
            'Keremeos Fruit Stands': '克里米奥斯水果摊',
            'Historic Naramata Inn': '历史纳拉马塔客栈',
            'Kettle Valley Railway Trestle': '水壶谷铁路栈桥',
            'Fairview Ghost Town Site': '费尔维尤鬼城遗址',
            'Okanagan Lavender & Herb Farm': '奥卡纳根薰衣草香草农场',
            'Inkameep Desert': '印卡米普沙漠',
            "Harker's Organic Fruit Ranch": '哈克有机水果农场',
            'Fruitland Produce Stand': '果园农产品摊'
        },
        // 餐厅翻译
        restaurants: {
            'Brooklyn Pizza': '布鲁克林披萨',
            'White Spot Chilliwack': '白点餐厅奇利瓦克店',
            'Old East Indian Cuisine': '老东印度料理',
            'Home Restaurant & Pie Shop': '家乡餐厅暨馅饼店',
            'Log Cabin Pub': '木屋酒吧',
            'Hope Mountain Centre Cafe': '希望山中心咖啡厅',
            'Central Hotel Restaurant': '中心酒店餐厅',
            'Collins Bar & Grill': '柯林斯酒吧烤肉店',
            'Quilchena Hotel Restaurant': '奎尔奇纳酒店餐厅',
            'Kekuli Cafe': '克库利咖啡馆',
            'Red Collar Brewing': '红领啤酒厂',
            'The Noble Pig Brewhouse': '贵族猪酿酒屋',
            "Helm's Restaurant": '赫尔姆餐厅',
            "Brown's Social House": '布朗社交餐厅',
            'Raudz Regional Table': '劳兹地方风味餐厅',
            'Gather Restaurant': '聚会餐厅',
            'Krafty Kitchen + Bar': '工艺厨房酒吧',
            'Waterfront Wine Bar': '湖滨酒吧',
            'COOK Kelowna': '库克基洛纳餐厅',
            'Micro Bar + Bites': '微型酒吧小食',
            'The Hotel Penticton Restaurant': '彭蒂克顿酒店餐厅',
            'Sage Restaurant at The Lakeside Resort': '湖滨度假村贤哲餐厅',
            'Olympia Pizza & Spaghetti House': '奥林匹亚披萨意面屋',
            'Whipper Snapper Distillery': '鞭炮酿酒厂',
            'Oliver Twist Restaurant': '奥利弗扭转餐厅',
            'Mainstreet Grill': '主街烤肉店',
            'Oliver Eats Cafe': '奥利弗美食咖啡厅',
            'Campo Marina Restaurant': '坎波码头餐厅',
            "Nk'Mip Cellars Restaurant": 'Nk\'Mip酒窖餐厅',
            'Fieldstone Fruit Wines Restaurant': '田石果酒餐厅',
            'Boaters Beach House': '船民海滨小屋'
        },
        // 城市翻译
        cities: {
            'Burnaby': '本拿比',
            'Merritt': '梅里特',
            'Kelowna': '基洛纳',
            'Kelowna Waterfront': '基洛纳滨水区',
            'Peachland': '桃地镇',
            'Penticton': '彭蒂克顿',
            'Osoyoos': '奥索尤斯',
            'Oliver': '奥利弗',
            'Hope': '希望镇'
        },
        // 类型描述翻译
        types: {
            'Wine Tasting': '葡萄酒品鉴',
            'Hiking & Nature': '徒步与自然',
            'Scenic Attraction': '风景名胜',
            'Beach & Swimming': '海滩游泳',
            'Premium Accommodation': '豪华住宿',
            'City Center': '市中心',
            'Waterfront Area': '滨水区',
            'Cultural Attraction': '文化景点',
            'Family Fun': '家庭娱乐',
            'Outdoor Recreation': '户外娱乐',
            'Restaurant & Dining': '餐厅美食',
            'Major Town': '主要城镇',
            'U-Pick Fruit Farm': '自采果园'
        },
        // 景点详细描述翻译
        descriptions: {
            'Historic railway tunnels through dramatic canyon walls, part of Kettle Valley Railway': '历史悠久的铁路隧道穿越壮观的峡谷壁，属于水壶谷铁路的一部分',
            'Former Kettle Valley Railway route with tunnels and trestles, spectacular canyon views near Hope': '前水壶谷铁路线路，有隧道和栈桥，希望镇附近壮观的峡谷景色',
            'Highway 5 rest stop with washroom facilities, picnic tables, and mountain views near Coquihalla Summit': '5号高速公路休息站，设有洗手间、野餐桌和科基哈拉山顶附近的山景',
            'Rest area near Coquihalla Summit with mountain views and hiking opportunities': '科基哈拉山顶附近的休息区，山景和徒步机会',
            '1.5km alpine lake trail with impressive mountain views, 45km north of Hope near Coquihalla Summit': '1.5公里高山湖泊步道，山景令人印象深刻，希望镇北45公里科基哈拉山顶附近',
            'Highest point on Highway 5 at 1,244m elevation with mountain views and alpine environment': '5号高速公路最高点，海拔1244米，山景和高山环境',
            'Large scenic lake just outside Merritt with over 20 fish species including Kokanee and Rainbow Trout': '梅里特外的大型风景湖，有20多种鱼类，包括红鲑鱼和虹鳟鱼',
            'Wetland conservation area for bird watching at north end of Nicola Lake, completed in 1991': '尼古拉湖北端的湿地保护区，1991年建成，用于观鸟',
            'Historic log church near Douglas Lake road turnoff, 28km north of Merritt': '道格拉斯湖路口附近的历史木制教堂，梅里特北28公里',
            'World-class trout fishing lakes, 75km north of Merritt and 23km south of Kamloops': '世界级鳟鱼钓鱼湖，梅里特北75公里，坎卢普斯南23公里',
            'Scenic lake approximately 75km north of Merritt with fishing and camping opportunities': '梅里特北约75公里的风景湖，有钓鱼和露营机会',
            'Fraser River canyon views via suspension bridge and aerial tramway': '通过吊桥和空中缆车观赏弗雷泽河峡谷景色',
            'Highway rest stop with Fraser River views and historic railway information': '高速公路休息站，有弗雷泽河景色和历史铁路信息',
            'Scenic pullout along Highway 1 with creek views and picnic tables': '1号高速公路沿线风景停车区，有溪流景色和野餐桌',
            'Historic suspension bridge over Fraser River, built 1926, scenic views and short trails': '弗雷泽河上的历史吊桥，建于1926年，风景优美，有短步道',
            "Kamloops' largest winery with 75 acres of vines overlooking South Thompson River Valley, 10 minutes from Kamloops": '坎卢普斯最大的酒庄，75英亩葡萄园俯瞰南汤普森河谷，距坎卢普斯10分钟',
            "BC's largest municipal park with 800 hectares and 40km of multi-use trails": 'BC省最大的市政公园，800公顷，40公里多用途步道',
            '100 hectares in heart of Kamloops with 10km of varied trails': '坎卢普斯市中心100公顷，10公里多样化步道',
            'Historic Kettle Valley Railway trail with 18 trestle bridges and 2 tunnels': '历史悠久的水壶谷铁路步道，有18座栈桥和2个隧道',
            "Kelowna's largest natural park with 15 trails and panoramic lake views": '基洛纳最大的自然公园，15条步道和全景湖景',
            '10,000 hectares of rugged terrain with scenic views of Okanagan Lake': '10000公顷崎岖地形，奥卡纳根湖风景',
            "400-metre sandy beach, BC's second most popular camping destination": '400米沙滩，BC省第二受欢迎的露营地',
            'Downtown lakefront park with beaches, sculptures, and cultural district': '市中心湖滨公园，有海滩、雕塑和文化区',
            'Premium Okanagan winery offering wine tastings and lakefront dining': '奥卡纳根优质酒庄，提供葡萄酒品鉴和湖滨用餐',
            'Unique pyramid-shaped winery famous for organic and biodynamic wines': '独特的金字塔形酒庄，以有机和生物动力葡萄酒闻名',
            'Award-winning winery with stunning architecture and vineyard tours': '获奖酒庄，建筑令人惊叹，提供葡萄园游览',
            'Steep hike offering panoramic views of Okanagan Lake and surrounding mountains': '陡峭的徒步，提供奥卡纳根湖和周围山脉的全景',
            'Beautiful waterfall accessible via short hike along Deep Creek in 6-hectare park': '美丽的瀑布，通过深溪6公顷公园的短途徒步可达',
            'Sandy beach directly across Highway 97 from Hardy Falls with picnic facilities': '97号高速公路对面哈迪瀑布的沙滩，有野餐设施',
            "One of Okanagan's finest beaches with excellent swimming and picnic facilities": '奥卡纳根最好的海滩之一，游泳和野餐设施优良',
            'Extinct volcano with 360-degree views of Okanagan Valley': '死火山，奥卡纳根山谷360度景观',
            "Canada's top-ranked beach on warm Skaha Lake with sandy shoreline": '加拿大排名第一的海滩，位于温暖的斯卡哈湖，沙质海岸线',
            'Nearly 1km of premium sandy beach on Okanagan Lake in downtown Penticton': '彭蒂克顿市中心奥卡纳根湖上近1公里的优质沙滩',
            'Rock climbing paradise with 650+ routes and hiking trails up to 80m high': '攀岩天堂，650多条路线和高达80米的徒步步道',
            'Popular hike offering epic panoramic views above Penticton': '受欢迎的徒步路线，彭蒂克顿上方史诗般的全景',
            'White sand beach in Naramata with shade trees and picnic facilities': '纳拉马塔的白沙滩，有遮荫树和野餐设施',
            'Premium South Okanagan winery known for exceptional terroir-driven wines': '南奥卡纳根优质酒庄，以出色的风土驱动葡萄酒而闻名',
            "Boutique winery producing acclaimed reds in Oliver's Black Sage Bench": '精品酒庄，在奥利弗黑贤者台地生产备受赞誉的红酒',
            'Award-winning Oliver winery known for premium red wines and stunning views': '奥利弗获奖酒庄，以优质红酒和绝美景色而闻名',
            'Sacred alkaline lake with colorful mineral spots visible in summer': '神圣的碱性湖泊，夏季可见彩色矿物斑点',
            "North America's first Indigenous-owned winery with cultural center": '北美第一家原住民拥有的酒庄，设有文化中心',
            "Canada's only desert ecosystem with interpretive trails and wildlife viewing": '加拿大唯一的沙漠生态系统，有解释步道和野生动物观赏',
            "Canada's warmest lake with sandy beaches and water sports": '加拿大最温暖的湖泊，有沙滩和水上运动',
            'Collection including BC Orchard Industry Museum and Wine Museum': '包括BC果园工业博物馆和葡萄酒博物馆的收藏',
            'Local history museum featuring Indigenous artifacts and pioneer exhibits': '当地历史博物馆，展示原住民文物和开拓者展品',
            'Interactive farm experience with kangaroos, lemurs, and other exotic animals located at 5932 Old Vernon Road, Kelowna': '位于基洛纳老弗农路5932号的互动农场体验，有袋鼠、狐猴和其他异国动物',
            "Canada's highest, longest, and fastest ziplines soaring 381 feet above Peachland Creek Gorge": '加拿大最高、最长、最快的飞索，在桃地镇溪峡谷上空381英尺翱翔',
            'Luxury lakefront resort with full amenities and stunning views': '湖滨豪华度假村，设施齐全，景色优美',
            // 新增缺失的描述翻译
            '60-meter waterfall with easy 800m hike, 32 acres of protected parkland east of Chilliwack': '60米瀑布，轻松的800米徒步，奇利瓦克东部32英亩保护公园',
            'Resort village with natural hot springs at southern end of Harrison Lake, 90 minutes from Vancouver': '度假村，哈里森湖南端的天然温泉，距温哥华90分钟',
            '1,217 hectares touching four beautiful lakes including Harrison Lake, 6km north of Harrison Hot Springs': '1217公顷接触四个美丽湖泊包括哈里森湖，哈里森温泉北6公里',
            '555.9 sq km park with twin peaks Golden Ears (1,716m), 11km north of Maple Ridge': '555.9平方公里公园，双峰金耳朵山(1716米)，枫树岭北11公里',
            '656 hectares of warm lake recreation 11km southwest of Chilliwack, established 1950': '656公顷温湖休闲区，奇利瓦克西南11公里，1950年建立',
            '33,272 hectares of wilderness 3km west of Keremeos, named after Cathedral Mountain near US border': '33272公顷荒野，克里米奥斯西3公里，以美国边境附近大教堂山命名',
            'Co-managed wilderness park with 150km of trails, suspension bridge, west of Lytton via ferry': '共管荒野公园，150公里步道，吊桥，莱顿西部通过渡轮',
            'Designated viewpoint on Trans-Canada Highway at Savona with sweeping lake views and trails': '萨沃纳横加公路指定观景点，湖景壮阔，有步道',
            'Spectacular turquoise lake views on old Highway 97 (Kalamalka Lakeview Drive) south of Vernon': '旧97号公路(卡拉马尔卡湖景大道)上壮观的绿松石湖景，弗农南部',
            'Iconic Penticton sign visible from Highway 97, panoramic views of Okanagan and Skaha Lakes': '97号公路可见的标志性彭蒂克顿标志，奥卡纳根湖和斯卡哈湖全景',
            'View confluence of North and South Thompson Rivers at Overlander Bridge off Columbia Street': '在哥伦比亚街外的奥弗兰德桥观看南北汤普森河汇流',
            'Major ski resort with winter sports and summer mountain biking': '主要滑雪度假村，冬季运动和夏季山地自行车',
            'Year-round resort offering skiing, hiking, and mountain biking': '全年度假村，提供滑雪、徒步和山地自行车',
            '60-meter waterfall accessible via easy 800m hike, 32 acres of protected area': '60米瀑布，轻松800米徒步可达，32英亩保护区',
            'Natural hot springs resort village 90 minutes east of Vancouver': '天然温泉度假村，温哥华东90分钟',
            '1,217 hectares touching four lakes including Harrison Lake, 6km north of Harrison Hot Springs': '1217公顷接触四个湖泊包括哈里森湖，哈里森温泉北6公里',
            '656 hectares park with warm lake recreation, 11km southwest of Chilliwack': '656公顷公园，温湖休闲，奇利瓦克西南11公里',
            '33,272 hectares wilderness park named after Cathedral Mountain, 3km west of Keremeos': '33272公顷荒野公园，以大教堂山命名，克里米奥斯西3公里',
            '70,844 hectares of alpine wilderness on Highway 3, known for wildflower meadows and mountain views': '3号公路上70844公顷高山荒野，以野花草地和山景闻名',
            'Base of operations for adventure, famous as filming location for First Blood (1982)': '冒险行动基地，以《第一滴血》(1982)拍摄地闻名',
            'Popular Manning Park trail looping around Lightning Lake with Rainbow Bridge crossing': '曼宁公园受欢迎步道，环绕闪电湖，彩虹桥穿越',
            'Mountain pass at 1,342m elevation in Manning Park with alpine views': '曼宁公园海拔1342米山口，高山景色',
            'Market center where Tulameen River joins Similkameen River, gateway to Similkameen Valley': '图拉米恩河汇入西米尔卡米恩河的市场中心，西米尔卡米恩谷门户',
            'Historic mining town museum at 712 Daly Avenue, Hedley Country Market for river tubing': '历史采矿小镇博物馆，戴利大道712号，赫德利乡村市场漂流',
            'Highway 3 fruit stands selling cherries, apples, and apricots in season, including Parsons Farm Market': '3号公路水果摊，季节性销售樱桃、苹果和杏，包括帕森斯农场市场',
            "Canada's first strawbale winery in Cawston, unique desert-style tasting room": '加拿大首家草捆酒庄，位于考斯顿，独特沙漠风格品酒室',
            'Boutique winery in Similkameen Valley known for organic wines and scenic vineyard views': '西米尔卡米恩谷精品酒庄，以有机葡萄酒和风景葡萄园而闻名',
            'Designated viewpoint on Trans-Canada Highway at Savona with washrooms and trails': '萨沃纳横加公路指定观景点，有洗手间和步道',
            'Turquoise lake views from Old Highway 97, south of Vernon with picnic tables': '旧97号公路绿松石湖景，弗农南部，有野餐桌',
            'Panoramic views behind iconic Penticton sign, overlooks both Okanagan and Skaha Lakes': '标志性彭蒂克顿标志后的全景，俯瞰奥卡纳根湖和斯卡哈湖',
            'Boutique winery on Golden Mile Bench known for innovative winemaking and unique varietals': '黄金英里台地精品酒庄，以创新酿酒和独特品种而闻名',
            "Canada's second-largest ski resort with 4,270 acres, 45 minutes northeast of Kamloops": '加拿大第二大滑雪场，4270英亩，坎卢普斯东北45分钟',
            'Famous as filming location for First Blood (Rambo), chainsaw carving capital with visitor center': '以《第一滴血》(兰博)拍摄地闻名，电锯雕刻之都，有游客中心',
            'Popular 2.4km Manning Park trail around alpine lake with Rainbow Bridge and mountain views': '曼宁公园受欢迎的2.4公里步道，环绕高山湖泊，彩虹桥和山景',
            'Mountain pass on Highway 3 at 1,342m elevation, spectacular alpine scenery and photo opportunities': '3号公路海拔1342米山口，壮观高山景色和拍照机会',
            'Historic market center where Tulameen and Similkameen Rivers meet, museum and antique shops': '图拉米恩河和西米尔卡米恩河汇合的历史市场中心，博物馆和古董店',
            'Historic mining town museum with gold rush artifacts and Similkameen River tubing nearby': '历史采矿小镇博物馆，淘金文物，附近西米尔卡米恩河漂流',
            '1877 historic flour mill still operating with original equipment, seasonal demonstrations': '1877年历史面粉磨坊，仍用原始设备运营，季节性演示',
            "Canada's first strawbale winery in Cawston, sustainable practices and unique architecture": '加拿大首家草捆酒庄，位于考斯顿，可持续实践和独特建筑',
            'Organic vineyard with scenic mountain views in Cawston Valley, small-batch artisan wines': '考斯顿谷有机葡萄园，山景优美，小批量手工葡萄酒',
            'Certified organic fruit farm near Cawston with U-pick cherries, apples, and stone fruits': '考斯顿附近认证有机水果农场，自采樱桃、苹果和核果',
            'Roadside fruit stand on Highway 97 in Summerland with seasonal local fruits and vegetables': '萨默兰97号公路路边水果摊，季节性当地水果蔬菜',
            '1908 heritage hotel on Okanagan Lake, historic architecture and lakefront dining': '1908年奥卡纳根湖遗产酒店，历史建筑和湖滨用餐',
            'Historic railway trestle bridge offering photography opportunities and valley views': '历史铁路栈桥，提供摄影机会和山谷景色',
            'Historic gold rush town ruins near Oliver, interpretive trails and mining history': '奥利弗附近历史淘金镇遗迹，解释步道和采矿历史',
            '35-acre lavender farm near Oliver with seasonal blooms, products, and scenic views': '奥利弗附近35英亩薰衣草农场，季节性花期、产品和风景',
            'Small boutique winery south of Oliver with unique desert-style tasting room': '奥利弗南部小型精品酒庄，独特沙漠风格品酒室',
            'Rare pocket desert ecosystem near Osoyoos with unique flora and interpretive trails': '奥索尤斯附近罕见袖珍沙漠生态系统，独特植物和解释步道',
            
            // 餐厅英文描述翻译
            'Popular local pizzeria known for authentic New York style pizza and friendly atmosphere in Chilliwack': '深受当地人喜爱的披萨店，以正宗纽约风味披萨和友好氛围闻名于奇利瓦克',
            'Classic Canadian family restaurant famous for Triple O burgers and legendary pies': '经典的加拿大家庭餐厅，以Triple O汉堡和传奇馅饼闻名',
            'Highly rated authentic Indian restaurant with traditional curries and tandoor specialties': '备受好评的正宗印度餐厅，供应传统咖喱和坦都烧烤特色菜',
            'Famous pie shop and family restaurant, Hope\'s most beloved dining spot since 1940s': '著名的馅饼店和家庭餐厅，自1940年代以来深受希望镇居民喜爱',
            'Rustic pub with hearty comfort food, steaks and burgers in a cozy log cabin atmosphere': '质朴的酒吧，在舒适的木屋氛围中供应丰盛的舒适食物、牛排和汉堡',
            'Mountain cafe with fresh coffee, homemade soups and sandwiches, popular with hikers and locals': '山地咖啡馆，供应新鲜咖啡、自制汤品和三明治，深受徒步者和当地人喜爱',
            'Historic hotel restaurant serving steaks, seafood and Canadian classics in downtown Merritt since 1908': '历史悠久的酒店餐厅，自1908年起在梅里特市中心供应牛排、海鲜和加拿大经典菜肴',
            'Popular sports bar and grill with comfort food, wings and local craft beers': '受欢迎的体育酒吧烤肉店，供应舒适食物、鸡翅和当地精酿啤酒',
            'Historic 1908 hotel restaurant with fine dining, steaks and regional cuisine': '历史悠久的1908年酒店餐厅，提供精致餐饮、牛排和地方美食',
            'Indigenous-owned cafe famous for bannock burgers and fry bread, celebrating First Nations cuisine': '原住民拥有的咖啡馆，以班诺克汉堡和炸面包闻名，弘扬第一民族美食',
            'Local craft brewery with gastropub menu, wood-fired pizzas and Kamloops-brewed beers': '当地精酿啤酒厂，提供美食酒吧菜单、木火披萨和坎卢普斯本地啤酒',
            'Award-winning brewpub with craft beers and elevated pub fare, consistently rated best in Kamloops': '获奖的精酿酒吧，供应精酿啤酒和高品质酒吧美食，一直被评为坎卢普斯最佳',
            'Upscale steakhouse and seafood restaurant with extensive wine list and elegant atmosphere': '高档牛排和海鲜餐厅，拥有丰富的葡萄酒单和优雅的氛围',
            'Modern casual dining with creative dishes, craft cocktails and lively social atmosphere': '现代休闲餐厅，创意菜肴，手工调酒和活跃的社交氛围',
            'Award-winning restaurant showcasing Okanagan ingredients, voted best fine dining in Kelowna': '获奖餐厅，展示奥卡纳根本地食材，被评为基洛纳最佳高级餐厅',
            'Farm-to-table restaurant with seasonal menu, locally-sourced ingredients and creative West Coast cuisine': '农场到餐桌的餐厅，季节性菜单，本地食材和创意西海岸美食',
            'Contemporary restaurant with innovative comfort food and extensive craft beer selection': '现代餐厅，创新舒适美食和丰富的精酿啤酒选择',
            'Upscale wine bar and restaurant with lake views, featuring Okanagan wines and farm-to-table cuisine': '高档酒吧餐厅，湖景优美，提供奥卡纳根葡萄酒和农场到餐桌美食',
            'Modern Canadian cuisine with locally-sourced ingredients, known for innovative seasonal menus': '现代加拿大料理，本地食材，以创新季节性菜单著称',
            'Intimate wine bar with small plates, featuring local wines and artisanal charcuterie': '温馨酒吧，小食精美，提供本地葡萄酒和手工熟食',
            'Historic hotel\'s upscale restaurant featuring locally-sourced ingredients and extensive wine list': '历史酒店的高档餐厅，采用本地食材，提供丰富的葡萄酒单',
            'Fine dining restaurant with lakefront views, featuring contemporary cuisine and Okanagan wines': '高档餐厅，湖滨景观，现代料理和奥卡纳根葡萄酒',
            'Family-owned Italian restaurant serving authentic pizza and pasta since 1960, local institution': '家族经营的意大利餐厅，自1960年起供应正宗披萨和意面，当地名店',
            'Craft distillery with tasting room and restaurant, specializing in spirits and elevated pub fare': '精酿酒厂，品酒室和餐厅，专业烈酒和高品质酒吧美食',
            'Family restaurant serving hearty Canadian fare and comfort food in downtown Oliver for over 20 years': '家庭餐厅，20多年来在奥利弗市中心供应丰盛的加拿大菜肴和舒适美食',
            'Popular local steakhouse known for perfectly grilled steaks, ribs and fresh seafood': '受欢迎的当地牛排餐厅，以完美烤制的牛排、肋排和新鲜海鲜闻名',
            'Cozy cafe with homemade breakfast and lunch favorites, fresh baking and local coffee': '温馨咖啡馆，家制早餐和午餐招牌菜，新鲜烘焙和本地咖啡',
            'Lakefront restaurant with patio dining, Italian cuisine, and beautiful views of Osoyoos Lake': '湖滨餐厅，露台用餐，意大利料理，奥索尤斯湖美景',
            'Fine dining at North America\'s first Indigenous-owned winery, featuring fusion cuisine and wine pairings': '北美首家原住民酒庄的高级餐厅，融合料理和葡萄酒搭配',
            'Unique fruit wine tasting with light meals, featuring wines made from Okanagan fruits': '独特果酒品鉴配轻食，采用奥卡纳根水果酿制的葡萄酒',
            'Casual lakefront dining with fresh seafood, burgers and cocktails, perfect summer patio': '休闲湖滨餐厅，新鲜海鲜、汉堡和调酒，完美的夏日露台',
            'Lakefront restaurant with patio dining, Italian cuisine, and beautiful views of Osoyoos Lake': '湖滨餐厅，露台用餐，意大利美食，奥索尤斯湖美景',
            
            // U-Pick 果园描述翻译
            'Historic family orchard since 1921 offering u-pick cherries, apricots, peaches and plums with stunning Okanagan Lake views': '历史悠久的家庭果园，自1921年起提供自采樱桃、杏子、桃子和李子，享有奥卡纳根湖壮丽景色',
            '10-acre mixed fruit orchard and cidery with u-pick cherries, apples, peaches, strawberries and on-site cafe': '10英亩综合果园和苹果酒厂，提供自采樱桃、苹果、桃子、草莓和现场咖啡厅',
            '4th generation sustainable farm with over 30 varieties of u-pick fruits and vegetables, fully non-GMO operation': '第四代可持续农场，提供30多种自采水果和蔬菜，完全非转基因经营'
        }
    },
    en: {
        title: '🍷 Okanagan Travel Guide 🏔️',
        subtitle: 'From Burnaby to Okanagan Lake • Popular Attractions & Driving Routes',
        langBtn: '中文',
        // 过滤器翻译
        filters: {
            all: 'All',
            landmarks: 'Landmarks',
            dining: 'Dining'
        }
    }
};

function toggleLanguage() {
    // 首次切换时保存原始英文数据
    if (!originalData) {
        originalData = {
            hotels: JSON.parse(JSON.stringify(hotels)),
            attractions: JSON.parse(JSON.stringify(attractions)),
            restaurants: JSON.parse(JSON.stringify(restaurants)),
            mainLocations: JSON.parse(JSON.stringify(mainLocations))
        };
    }
    
    currentLanguage = currentLanguage === 'zh' ? 'en' : 'zh';
    updateLanguage();
}

// 更新页面文本元素
function updatePageElements() {
    const t = translations[currentLanguage];
    document.querySelector('.main-title').textContent = t.title;
    document.querySelector('.subtitle').textContent = t.subtitle;
    document.getElementById('langBtn').innerHTML = `🌐 ${t.langBtn}`;
    
    // 更新过滤器按钮文本
    const filterTexts = document.querySelectorAll('.filter-text');
    if (filterTexts.length > 0) {
        filterTexts[0].textContent = t.filters.all;
        filterTexts[1].textContent = t.filters.landmarks; 
        filterTexts[2].textContent = t.filters.dining;
    }
}

function updateLanguage() {
    const t = translations[currentLanguage];
    
    // 更新页面元素
    updatePageElements();
    
    if (currentLanguage === 'zh') {
        // 切换到中文
        translateToChineseNames();
    } else {
        // 切换到英文，恢复原始数据
        restoreOriginalNames();
    }
    
    // 重新显示路线和标记
    showCompleteRoute();
}

function translateToChineseNames() {
    const t = translations.zh;
    
    // 翻译酒店名称
    Object.keys(hotels).forEach(key => {
        const hotel = hotels[key];
        hotel.name = t.hotels[originalData.hotels[key].name] || hotel.name;
    });
    
    // 翻译景点名称
    Object.keys(attractions).forEach(key => {
        const attraction = attractions[key];
        attraction.name = t.attractions[originalData.attractions[key].name] || attraction.name;
    });
    
    // 翻译餐厅名称
    Object.keys(restaurants).forEach(key => {
        const restaurant = restaurants[key];
        const originalName = originalData && originalData.restaurants ? originalData.restaurants[key].name : restaurant.name;
        restaurant.name = t.restaurants[originalName] || restaurant.name;
    });
    
    // 翻译城市名称
    Object.keys(mainLocations).forEach(key => {
        const location = mainLocations[key];
        location.name = t.cities[originalData.mainLocations[key].name] || location.name;
    });
}

function restoreOriginalNames() {
    // 恢复原始英文名称
    Object.keys(hotels).forEach(key => {
        hotels[key].name = originalData.hotels[key].name;
    });
    
    Object.keys(attractions).forEach(key => {
        attractions[key].name = originalData.attractions[key].name;
    });
    
    Object.keys(restaurants).forEach(key => {
        if (originalData && originalData.restaurants && originalData.restaurants[key]) {
            restaurants[key].name = originalData.restaurants[key].name;
        }
    });
    
    Object.keys(mainLocations).forEach(key => {
        mainLocations[key].name = originalData.mainLocations[key].name;
    });
}

// 获取翻译后的类型描述
function getTranslatedTypeDescription(type) {
    if (currentLanguage === 'zh') {
        const chineseTypes = translations.zh.types;
        const englishDescription = getTypeDescription(type);
        return chineseTypes[englishDescription] || englishDescription;
    }
    return getTypeDescription(type);
}

// 获取翻译后的描述
function getTranslatedDescription(originalDescription) {
    if (currentLanguage === 'zh' && originalDescription) {
        return translations.zh.descriptions[originalDescription] || originalDescription;
    }
    return originalDescription;
}

// 生成真实准确的图片URL - 使用图片搜索引擎
function getAccurateImageUrl(location, originalName = null) {
    // 构建精确的搜索关键词 - 使用原始英文名称确保图片准确
    let searchTerm = originalName || location.name;
    
    // 为特定地点添加地理位置信息以提高搜索准确性 - 使用原始英文名称进行关键词匹配
    const nameForMatching = originalName || location.name;
    if (nameForMatching.includes('Provincial Park') || nameForMatching.includes('Park')) {
        searchTerm += ' British Columbia Canada';
    } else if (nameForMatching.includes('Winery') || nameForMatching.includes('Vineyards') || nameForMatching.includes('Cellars')) {
        searchTerm += ' Okanagan Valley BC winery';
    } else if (nameForMatching.includes('Beach') || nameForMatching.includes('Lake')) {
        searchTerm += ' Okanagan BC Canada lake beach';
    } else if (nameForMatching.includes('Museum') || nameForMatching.includes('Centre') || nameForMatching.includes('Center')) {
        searchTerm += ' British Columbia Canada';
    } else if (nameForMatching.includes('Falls') || nameForMatching.includes('Waterfall')) {
        searchTerm += ' British Columbia Canada waterfall';
    } else if (nameForMatching.includes('Mountain') || nameForMatching.includes('Trail') || nameForMatching.includes('Hiking')) {
        searchTerm += ' British Columbia Canada hiking trail mountain';
    } else if (nameForMatching.includes('Hot Springs')) {
        searchTerm += ' British Columbia Canada hot springs resort';
    } else {
        // 为城市和一般景点添加BC省信息
        searchTerm += ' BC Canada';
    }
    
    // 使用 Bing 图片搜索 - 可靠的图片来源
    const encodedSearch = encodeURIComponent(searchTerm);
    
    // 使用 Bing 图片搜索 API 格式 - 更稳定可靠
    // 构造一个指向真实搜索结果的URL，会显示该地点的实际照片
    return `https://tse1.mm.bing.net/th?q=${encodedSearch}&w=400&h=250&c=7&rs=1&o=5&pid=1.7`;
}

// 页面加载时立即初始化为中文
document.addEventListener('DOMContentLoaded', function() {
    // 立即保存原始英文数据
    originalData = {
        hotels: JSON.parse(JSON.stringify(hotels)),
        attractions: JSON.parse(JSON.stringify(attractions)),
        restaurants: JSON.parse(JSON.stringify(restaurants)),
        mainLocations: JSON.parse(JSON.stringify(mainLocations))
    };
    
    // 初始化地图前先设置中文
    translateToChineseNames();
    updatePageElements();
    
    // 然后初始化地图
    initMap();
});