// La URL de tu nuevo archivo JSON
const JSON_URL = "https://raw.githubusercontent.com/ice-dev-x/iptv_org_clean/refs/heads/main/catalogo.json";

let cachedCategorias = null;
let lastFetch = 0;

async function getCategorias() {
  if (cachedCategorias && (Date.now() - lastFetch < 300000)) {
    return cachedCategorias;
  }

  try {
    const res = await kino.fetch(JSON_URL);
    if (!res.ok) throw new Error("Fallo en la descarga del catálogo");
    
    // Convertimos el JSON directamente a objetos de JavaScript en milisegundos
    cachedCategorias = await res.json();
    lastFetch = Date.now();
    
    await kino.storage.set("backup_catalogo", cachedCategorias);
    return cachedCategorias;
    
  } catch (error) {
    const backup = await kino.storage.get("backup_catalogo");
    return backup ? backup : [];
  }
}

export async function home() {
  const categorias = await getCategorias();
  return categorias.map(cat => ({
    id: `row-${cat.id}`,
    title: cat.title,
    // Limitamos a 20 items en el inicio para no saturar la memoria
    items: cat.items.slice(0, 20) 
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