const M3U_URL = "https://raw.githubusercontent.com/ice-dev-x/iptv_org_clean/refs/heads/main/latam.m3u";

// Memoria caché para no descargar la lista repetidas veces al cambiar de pestaña
let cachedCategorias = null;
let lastFetch = 0;

async function getCategorias() {
  // Si la lista ya se descargó hace menos de 5 minutos, usamos la guardada
  if (cachedCategorias && (Date.now() - lastFetch < 300000)) {
    return cachedCategorias;
  }

  const res = await kino.fetch(M3U_URL);
  if (!res.ok) return [];
  
  const text = await res.text();
  const lines = text.split('\n');
  
  // Usamos un Map para ir agrupando canales dinámicamente por su país
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
        id: `ch-${i}`,
        title: titleMatch ? titleMatch.trim() : "Canal Desconocido",
        kind: "live",
        poster: logoMatch ? logoMatch[1] : "https://placehold.co/300x450/222222/ffffff?text=TV",
        // Guardamos el nombre original del grupo (ej. "Ecuador", "México")
        _groupName: groupMatch ? groupMatch[1].trim() : "Otros" 
      };
      
    } else if (line.startsWith('http') && currentItem) {
      currentItem.ref = line;
      
      const groupName = currentItem._groupName;
      
      // Creamos un ID seguro para Kino sin tildes ni espacios (ej: "Costa Rica" -> "costa-rica")
      const groupId = groupName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '-');

      // Si el país no existe aún en nuestro mapa, lo creamos
      if (!categoriasMap.has(groupId)) {
        categoriasMap.set(groupId, { id: groupId, title: groupName, items: [] });
      }
      
      // Borramos la propiedad temporal y metemos el canal en su país
      delete currentItem._groupName;
      categoriasMap.get(groupId).items.push(currentItem);
      
      currentItem = null;
    }
  }
  
  // Convertimos el mapa a un array, lo guardamos en caché y lo devolvemos
  cachedCategorias = Array.from(categoriasMap.values());
  lastFetch = Date.now();
  return cachedCategorias;
}

// 1. Capacidad HOME: Crea una fila por cada país en el inicio
export async function home() {
  const categorias = await getCategorias();
  return categorias.map(cat => ({
    id: `row-${cat.id}`,
    title: cat.title,
    items: cat.items
  }));
}

// 2. Capacidad CHANNELS: Crea una pestaña por cada país en "En vivo"
export async function liveCategories() {
  const categorias = await getCategorias();
  return categorias.map(cat => ({
    id: cat.id,
    title: cat.title
  }));
}

// 3. Capacidad CHANNELS: Devuelve los canales del país seleccionado
export async function liveChannels({ categoryId }) {
  const categorias = await getCategorias();
  const categoria = categorias.find(c => c.id === categoryId);
  return { items: categoria ? categoria.items : [] };
}

// 4. Capacidad RESOLVE: Extrae el reproductor
export async function resolve(ref) {
  let headers = {};

  // Si el enlace pertenece a qaotic.net, le inyectamos el User-Agent de navegador móvil y su referer
  if (ref.includes("qaotic.net")) {
    headers = {
      "User-Agent": "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
      "Referer": "https://www.americatv.com.ar/"
    };
  } else {
    // Un User-Agent genérico por defecto para el resto de canales de la lista
    headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    };
  }

  return {
    url: ref,
    headers: headers
  };
}