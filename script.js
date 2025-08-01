// 初始化地图
let map;
let routeControl;
let markers = [];

// 地点坐标
const locations = {
    burnaby: { lat: 49.2488, lng: -122.9805, name: "本拿比" },
    fraserValley: { lat: 49.1044, lng: -122.3219, name: "菲沙河谷酒庄" },
    merritt: { lat: 50.1123, lng: -120.7919, name: "梅里特" },
    kelowna: { lat: 49.8880, lng: -119.4960, name: "基洛纳" },
    kelownaWaterfront: { lat: 49.8863, lng: -119.4967, name: "基洛纳滨水区" },
    myraCanyon: { lat: 49.7684, lng: -119.3146, name: "迈拉峡谷" },
    okanagan: { lat: 49.8880, lng: -119.4960, name: "奥卡纳根湖" },
    peachland: { lat: 49.7791, lng: -119.7367, name: "桃地镇" },
    penticton: { lat: 49.4991, lng: -119.5937, name: "彭蒂克顿" },
    naramata: { lat: 49.5962, lng: -119.5936, name: "纳拉马塔" },
    osoyoos: { lat: 49.0325, lng: -119.4682, name: "奥索尤斯" },
    oliver: { lat: 49.1832, lng: -119.5506, name: "奥利弗" },
    keremeos: { lat: 49.2028, lng: -119.8294, name: "克里米奥斯" },
    hope: { lat: 49.3858, lng: -121.4424, name: "希望镇" },
    deltaHotel: { lat: 49.8857, lng: -119.4932, name: "Delta Hotels Grand Okanagan Resort" },
    walnutBeach: { lat: 49.0245, lng: -119.4533, name: "Walnut Beach Resort" },
    desertCentre: { lat: 49.0789, lng: -119.5343, name: "奥索尤斯沙漠中心" }
};

// 每日路线
const dayRoutes = {
    day1: [
        locations.burnaby,
        locations.fraserValley,
        locations.merritt,
        locations.kelowna,
        locations.deltaHotel,
        locations.kelownaWaterfront
    ],
    day2: [
        locations.kelowna,
        locations.myraCanyon,
        locations.okanagan,
        locations.peachland,
        locations.penticton,
        locations.naramata,
        locations.osoyoos,
        locations.walnutBeach,
        locations.desertCentre
    ],
    day3: [
        locations.osoyoos,
        locations.oliver,
        locations.keremeos,
        locations.hope,
        locations.burnaby
    ]
};

// 自定义图标
const customIcons = {
    hotel: '🛏',
    wine: '🍷',
    hiking: '🥾',
    water: '🌊',
    scenic: '📍',
    home: '🏠',
    restaurant: '🍽️',
    beach: '🏖️',
    desert: '🌵',
    fruit: '🍑',
    bridge: '🌉'
};

// 初始化函数
function initMap() {
    // 创建地图
    map = L.map('map').setView([49.5, -119.5], 7);
    
    // 添加地图图层
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    // 显示第一天的路线
    showDayRoute('day1');
}

// 显示特定日期的路线
function showDayRoute(day) {
    // 清除现有路线和标记
    clearMap();
    
    const route = dayRoutes[day];
    if (!route) return;
    
    // 添加标记
    route.forEach((location, index) => {
        const icon = getIconForLocation(location.name);
        const marker = L.marker([location.lat, location.lng]).addTo(map);
        
        // 自定义弹出内容
        const popupContent = `
            <div class="popup-content">
                <h4>${icon} ${location.name}</h4>
                <p>第${index + 1}站</p>
            </div>
        `;
        
        marker.bindPopup(popupContent);
        markers.push(marker);
    });
    
    // 添加路线
    const waypoints = route.map(loc => L.latLng(loc.lat, loc.lng));
    
    routeControl = L.Routing.control({
        waypoints: waypoints,
        routeWhileDragging: false,
        addWaypoints: false,
        createMarker: function() { return null; }, // 不创建默认标记
        lineOptions: {
            styles: [{ color: '#667eea', weight: 6, opacity: 0.8 }]
        },
        language: 'zh',
        show: false // 隐藏方向面板
    }).addTo(map);
    
    // 调整地图视图以适应路线
    const bounds = L.latLngBounds(waypoints);
    map.fitBounds(bounds, { padding: [50, 50] });
}

// 获取位置对应的图标
function getIconForLocation(name) {
    if (name.includes('酒庄') || name.includes('葡萄酒')) return customIcons.wine;
    if (name.includes('Hotel') || name.includes('Resort')) return customIcons.hotel;
    if (name.includes('峡谷') || name.includes('徒步')) return customIcons.hiking;
    if (name.includes('湖') || name.includes('滨水') || name.includes('海滩')) return customIcons.water;
    if (name.includes('沙漠')) return customIcons.desert;
    if (name.includes('水果')) return customIcons.fruit;
    if (name.includes('桥')) return customIcons.bridge;
    if (name.includes('本拿比')) return customIcons.home;
    return customIcons.scenic;
}

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
    
    // 日期按钮点击事件
    const dayButtons = document.querySelectorAll('.day-btn');
    const dayContents = document.querySelectorAll('.day-content');
    
    dayButtons.forEach(button => {
        button.addEventListener('click', function() {
            const selectedDay = this.getAttribute('data-day');
            
            // 更新按钮状态
            dayButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            // 显示对应内容
            dayContents.forEach(content => {
                content.style.display = 'none';
            });
            document.getElementById(`day${selectedDay}`).style.display = 'block';
            
            // 更新地图路线
            showDayRoute(`day${selectedDay}`);
        });
    });
    
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