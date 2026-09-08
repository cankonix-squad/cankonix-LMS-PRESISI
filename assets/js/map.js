async function initNationalMap(targetId){
  const target = document.getElementById(targetId);
  if (!target) return;
  if (typeof L === "undefined") {
    target.innerHTML = '<div class="map-fallback"><b>Peta nasional tidak dapat dimuat</b><span>Koneksi CDN tidak tersedia. Gunakan daftar Satdik dan program di bawah untuk drill-down.</span><a href="pages/institutions.html">Buka daftar Satdik →</a></div>';
    return;
  }
  const map = L.map(targetId).setView([-2.3,118.0],5);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
    attribution:'&copy; OpenStreetMap contributors'
  }).addTo(map);
  const dataPath = location.pathname.includes("/pages/") ? "../data/institutions.json" : "data/institutions.json";
  const data = await fetch(dataPath).then(r=>r.ok?r.json():Promise.reject(new Error("Data peta tidak tersedia"))).catch(()=>[]);
  const group=[];
  data.forEach(i=>{
    const marker=L.marker([i.lat,i.lng]).addTo(map);
    marker.bindPopup(`<b>${i.name}</b><br>${i.region}<br>${i.programs} Program Aktif<br>${i.participants.toLocaleString("id-ID")} Peserta<br><br><a href="${location.pathname.includes("/pages/") ? "institution-detail.html" : "pages/institution-detail.html"}"><b>Lihat Detail</b></a>`);
    group.push(marker);
  });
  const fg=L.featureGroup(group);
  if(group.length) map.fitBounds(fg.getBounds().pad(.25));
  else target.insertAdjacentHTML("beforeend", '<div class="map-data-warning">Data lokasi belum tersedia.</div>');
}
