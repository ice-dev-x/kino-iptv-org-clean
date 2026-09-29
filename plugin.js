// Asegúrate de cambiar "TU_ARCHIVO.m3u" por el nombre exacto de tu lista en GitHub
const M3U_URL = "https://raw.githubusercontent.com/ice-dev-x/iptv_org_clean/refs/heads/main/latam.m3u";

export async function home() {
  console.log("Intentando descargar:", M3U_URL);
  const res = await kino.fetch(M3U_URL);
  
  if (!res.ok) {
    console.log("Error al descargar: Código HTTP", res.status);
    return [];
  }
  
  const text = await res.text();
  const lines = text.split('\n');
  console.log("Descarga exitosa. Total de líneas procesadas:", lines.length);
  
  const canalesPropios = [];
  const canalesLatino = [];
  const canalesEspana = [];
  const canalesUsa = [];
  
  let currentItem = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    if (line.startsWith('#EXTINF:')) {
      const logoMatch = line.match(/tvg-logo="([^"]+)"/);
      const groupMatch = line.match(/group-title="([^"]+)"/i);
      const titleMatch = line.split(',').pop();
      
      currentItem = {
        id: `ch-${i}`,
        title: titleMatch ? titleMatch.trim() : "Canal Desconocido",
        kind: "tv",
        poster: logoMatch ? logoMatch[1] : "https://placehold.co/300x450/222222/ffffff?text=TV",
        _group: groupMatch ? groupMatch[1].toLowerCase() : "" 
      };
      
    } else if (line.startsWith('http') && currentItem) {
      currentItem.ref = line;
      
      const titleLower = currentItem.title.toLowerCase();
      const groupLower = currentItem._group;

      if (groupLower.includes('propio') || groupLower.includes('cmj')) {
        canalesPropios.push(currentItem);
      } else if (groupLower.includes('latino') || groupLower.includes('mexico') || groupLower.includes('ecuador') || titleLower.includes('latino')) {
        canalesLatino.push(currentItem);
      } else if (groupLower.includes('españa') || groupLower.includes('spain') || titleLower.includes('españa')) {
        canalesEspana.push(currentItem);
      } else if (groupLower.includes('usa') || groupLower.includes('english') || titleLower.includes('usa')) {
        canalesUsa.push(currentItem);
      } else {
        canalesLatino.push(currentItem);
      }
      
      delete currentItem._group;
      currentItem = null;
    }
  }
  
  const rows = [];
  if (canalesPropios.length > 0) rows.push({ id: "row-propios", title: "⭐ Mis Canales Propios", items: canalesPropios });
  if (canalesLatino.length > 0) rows.push({ id: "row-latino", title: "🌎 TV Latino", items: canalesLatino });
  if (canalesEspana.length > 0) rows.push({ id: "row-espana", title: "🇪🇸 TV España", items: canalesEspana });
  if (canalesUsa.length > 0) rows.push({ id: "row-usa", title: "🇺🇸 TV USA", items: canalesUsa });
  
  return rows;
}

export async function resolve(ref) {
  return {
    url: ref,
    headers: {
      "User-Agent": "VLC/3.0.16 LibVLC/3.0.16"
    }
  };
}