const M3U_URL = "https://raw.githubusercontent.com/ice-dev-x/iptv_org_clean/refs/heads/main/latam.m3u";

// Función central: Descarga y clasifica la lista una sola vez
async function procesarLista() {
  const res = await kino.fetch(M3U_URL);
  if (!res.ok) return { propios: [], latino: [], espana: [], usa: [] };
  
  const text = await res.text();
  const lines = text.split('\n');
  
  const categorias = {
    propios: [],
    latino: [],
    espana: [],
    usa: []
  };
  
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
        kind: "live",
        poster: logoMatch ? logoMatch[1] : "https://placehold.co/300x450/222222/ffffff?text=TV",
        _group: groupMatch ? groupMatch[1].toLowerCase() : "" 
      };
      
    } else if (line.startsWith('http') && currentItem) {
      currentItem.ref = line;
      
      const titleLower = currentItem.title.toLowerCase();
      const groupLower = currentItem._group;

      if (groupLower.includes('propio') || groupLower.includes('cmj')) {
        categorias.propios.push(currentItem);
      } else if (groupLower.includes('latino') || groupLower.includes('mexico') || groupLower.includes('ecuador') || titleLower.includes('latino')) {
        categorias.latino.push(currentItem);
      } else if (groupLower.includes('españa') || groupLower.includes('spain') || titleLower.includes('españa')) {
        categorias.espana.push(currentItem);
      } else if (groupLower.includes('usa') || groupLower.includes('english') || titleLower.includes('usa')) {
        categorias.usa.push(currentItem);
      } else {
        categorias.latino.push(currentItem);
      }
      
      currentItem = null;
    }
  }
  return categorias;
}

// 1. Capacidad HOME: Muestra filas en la pantalla principal
export async function home() {
  const cat = await procesarLista();
  const rows = [];
  if (cat.propios.length > 0) rows.push({ id: "row-propios", title: "⭐ Mis Canales Propios", items: cat.propios });
  if (cat.latino.length > 0) rows.push({ id: "row-latino", title: "🌎 TV Latino", items: cat.latino });
  if (cat.espana.length > 0) rows.push({ id: "row-espana", title: "🇪🇸 TV España", items: cat.espana });
  if (cat.usa.length > 0) rows.push({ id: "row-usa", title: "🇺🇸 TV USA", items: cat.usa });
  return rows;
}

// 2. Capacidad CHANNELS: Define las categorías de la pestaña "En vivo"
export async function liveCategories() {
  return [
    { id: "propios", title: "Mis Canales" },
    { id: "latino", title: "TV Latino" },
    { id: "espana", title: "TV España" },
    { id: "usa", title: "TV USA" }
  ];
}

// 3. Capacidad CHANNELS: Devuelve los canales cuando el usuario abre una categoría
export async function liveChannels({ categoryId }) {
  const cat = await procesarLista();
  return { items: cat[categoryId] || [] };
}

// 4. Capacidad RESOLVE: Extrae el reproductor VLC
export async function resolve(ref) {
  return {
    url: ref,
    headers: {
      "User-Agent": "VLC/3.0.16 LibVLC/3.0.16"
    }
  };
}