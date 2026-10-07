const M3U_URL = "https://raw.githubusercontent.com/ice-dev-x/iptv_org_clean/refs/heads/main/latam.m3u";

// Memoria caché para no descargar la lista repetidas veces al cambiar de pestaña
let cachedCategorias = null;
let lastFetch = 0;

async function getCategorias() {
  if (cachedCategorias && (Date.now() - lastFetch < 300000)) {
    return cachedCategorias;
  }

  try {
    const res = await kino.fetch(M3U_URL);
    if (!res.ok) throw new Error("Fallo en la descarga de la lista");
    
    const text = await res.text();
    const lines = text.split('\n');
    
    const categoriasMap = new Map();
    let currentItem = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      if (line.startsWith('#EXTINF:')) {
        const logoMatch = line.match(/tvg-logo="([^"]+)"/);
        const groupMatch = line.match(/group-title="([^"]+)"/i);
        const titleMatch = line.split(',').pop();
        
        currentItem = {
          title: titleMatch ? titleMatch.trim() : "Canal Desconocido",
          kind: "live",
          // SOLUCIÓN 3: Se cambia 'poster' por 'logo'
          logo: logoMatch ? logoMatch[1] : "https://placehold.co/300x450/222222/ffffff?text=TV",
          _groupName: groupMatch ? groupMatch[1].trim() : "Otros" 
        };
        
      } else if (line.startsWith('http') && currentItem) {
        currentItem.ref = line;
        
        // SOLUCIÓN 1: ID estable basado en un hash de la URL del canal en lugar de su posición (i)
        currentItem.id = "ch-" + kino.crypto.hash("sha1", line).slice(0, 16);
        
        const groupName = currentItem._groupName;
        const groupId = groupName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '-');

        if (!categoriasMap.has(groupId)) {
          categoriasMap.set(groupId, { id: groupId, title: groupName, items: [] });
        }
        
        delete currentItem._groupName;
        categoriasMap.get(groupId).items.push(currentItem);
        
        currentItem = null;
      }
    }
    
    cachedCategorias = Array.from(categoriasMap.values());
    lastFetch = Date.now();
    
    // SOLUCIÓN 2: Guardamos la lista validada en almacenamiento persistente
    await kino.storage.set("backup_m3u_latam", cachedCategorias);
    
    return cachedCategorias;
    
  } catch (error) {
    // Si la descarga falla (sin internet o error 404), devolvemos la última copia funcional
    const backup = await kino.storage.get("backup_m3u_latam");
    return backup ? backup : [];
  }
}

export async function home() {
  const categorias = await getCategorias();
  return categorias.map(cat => ({
    id: `row-${cat.id}`,
    title: cat.title,
    items: cat.items
  }));
}

export async function liveCategories() {
  const categorias = await getCategorias();
  return categorias.map(cat => ({
    id: cat.id,
    title: cat.title
  }));
}

export async function liveChannels({ categoryId }) {
  const categorias = await getCategorias();
  const categoria = categorias.find(c => c.id === categoryId);
  return { items: categoria ? categoria.items : [] };
}

export async function resolve(ref) {
  let headers = {};

  if (ref.includes("qaotic.net")) {
    headers = {
      "User-Agent": "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
      "Referer": "https://www.americatv.com.ar/"
    };
  } else {
    headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    };
  }

  return {
    url: ref,
    headers: headers
  };
}