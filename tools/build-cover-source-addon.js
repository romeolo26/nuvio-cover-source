const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const outDir = process.env.COVER_SOURCE_OUT_DIR
  ? path.resolve(process.env.COVER_SOURCE_OUT_DIR)
  : path.join(root, "cover-source-addon");

const AIO_BASE =
  "https://aiometadatafortheweebs.midnightignite.me/stremio/b8a243f2-f7a9-426b-82c9-37262968c247";

const catalogs = [
  {
    sourceType: "movie",
    sourceId: "mdblist.186558",
    id: "nuvio-new-across-streaming-cover-movies",
    type: "movie",
    name: "Nuvio Cover - New Across Streaming Movies",
  },
  {
    sourceType: "series",
    sourceId: "mdblist.186559",
    id: "nuvio-new-across-streaming-cover-shows",
    type: "series",
    name: "Nuvio Cover - New Across Streaming Shows",
  },
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeJson(filePath, data) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function compactMeta(meta) {
  return {
    id: meta.id,
    type: meta.type,
    name: meta.name,
    poster: meta.poster,
    background: meta.background,
    logo: meta.logo,
    description: meta.description,
    genres: meta.genres,
    year: meta.year,
    releaseInfo: meta.releaseInfo,
    imdbRating: meta.imdbRating,
    runtime: meta.runtime,
    behaviorHints: meta.behaviorHints,
  };
}

async function fetchCatalog(catalog) {
  const url = `${AIO_BASE}/catalog/${catalog.sourceType}/${catalog.sourceId}.json`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Fetch failed ${response.status}: ${url}`);
  }
  const data = await response.json();
  return (data.metas || []).slice(0, 100).map(compactMeta);
}

async function main() {
  const manifest = {
    id: "community.nuvio.cover.source",
    version: "0.0.1",
    name: "Nuvio Cover Source Test",
    description: "Tiny catalog add-on for testing Better Posters dynamic folder covers.",
    resources: ["catalog"],
    types: ["movie", "series"],
    idPrefixes: ["tt"],
    catalogs: catalogs.map((catalog) => ({
      type: catalog.type,
      id: catalog.id,
      name: catalog.name,
      pageSize: 100,
    })),
  };

  writeJson(path.join(outDir, "manifest.json"), manifest);

  for (const catalog of catalogs) {
    const metas = await fetchCatalog(catalog);
    writeJson(
      path.join(outDir, "catalog", catalog.type, `${catalog.id}.json`),
      { metas },
    );
  }

  console.log(JSON.stringify({
    ok: true,
    outDir,
    manifest: path.join(outDir, "manifest.json"),
    catalogs: catalogs.map((catalog) => ({
      type: catalog.type,
      id: catalog.id,
      file: path.join(outDir, "catalog", catalog.type, `${catalog.id}.json`),
    })),
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
