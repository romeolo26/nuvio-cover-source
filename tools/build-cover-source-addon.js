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
    id: "nuvio-hot-australia-cover",
    type: "movie",
    name: "Nuvio Cover - Hot in Australia",
    sources: [
      { sourceType: "movie", sourceId: "trakt.trending.movies" },
      { sourceType: "series", sourceId: "trakt.trending.shows" },
    ],
  },
  {
    id: "nuvio-tonight-cover",
    type: "movie",
    name: "Nuvio Cover - Tonight",
    sources: [
      { sourceType: "movie", sourceId: "mdblist.186303" },
      { sourceType: "series", sourceId: "mdblist.186304" },
    ],
  },
  {
    id: "nuvio-because-you-watched-cover",
    type: "movie",
    name: "Nuvio Cover - Because You Watched",
    sources: [
      { sourceType: "movie", sourceId: "trakt.list.35741279" },
      { sourceType: "series", sourceId: "trakt.list.35741284" },
    ],
  },
  {
    id: "nuvio-gems-for-you-cover",
    type: "movie",
    name: "Nuvio Cover - Gems For You",
    sources: [
      { sourceType: "movie", sourceId: "trakt.list.35741285" },
      { sourceType: "series", sourceId: "trakt.list.35741286" },
    ],
  },
  {
    id: "nuvio-new-across-streaming-cover",
    type: "movie",
    name: "Nuvio Cover - New Across Streaming",
    sources: [
      { sourceType: "movie", sourceId: "mdblist.186558" },
      { sourceType: "series", sourceId: "mdblist.186559" },
    ],
  },
  {
    id: "nuvio-new-for-you-cover",
    type: "movie",
    name: "Nuvio Cover - New For You",
    sources: [
      { sourceType: "movie", sourceId: "mdblist.186301" },
      { sourceType: "series", sourceId: "mdblist.186302" },
    ],
  },
  {
    id: "nuvio-in-cinemas-cover",
    type: "movie",
    name: "Nuvio Cover - In Cinemas",
    sources: [
      { sourceType: "movie", sourceId: "tmdb.discover.movie.in-cinemas.au" },
      { sourceType: "movie", sourceId: "tmdb.discover.movie.coming-soon.au" },
      { sourceType: "movie", sourceId: "mdblist.187399" },
    ],
  },
  {
    id: "nuvio-trending-today-cover",
    type: "movie",
    name: "Nuvio Cover - Trending Today",
    sources: [
      { sourceType: "movie", sourceId: "tmdb.trending_movie" },
      { sourceType: "series", sourceId: "tmdb.trending_series" },
    ],
  },
  {
    id: "nuvio-popular-cover",
    type: "movie",
    name: "Nuvio Cover - Popular",
    sources: [
      { sourceType: "movie", sourceId: "tmdb.top_movie" },
      { sourceType: "series", sourceId: "tmdb.top_series" },
    ],
  },
  {
    id: "nuvio-top-rated-cover",
    type: "movie",
    name: "Nuvio Cover - Top Rated",
    sources: [
      { sourceType: "movie", sourceId: "tmdb.top_rated_movie" },
      { sourceType: "series", sourceId: "tmdb.top_rated_series" },
    ],
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

function dedupeMetas(metas) {
  const seen = new Set();
  const result = [];
  for (const meta of metas) {
    const key = meta.imdb_id || meta.id || `${meta.type}:${meta.name}:${meta.year}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(meta);
  }
  return result;
}

function interleaveMetas(sourceMetas) {
  const result = [];
  const maxLength = Math.max(0, ...sourceMetas.map((metas) => metas.length));
  for (let index = 0; index < maxLength; index += 1) {
    for (const metas of sourceMetas) {
      if (metas[index]) result.push(metas[index]);
    }
  }
  return result;
}

async function fetchSource(source) {
  const url = `${AIO_BASE}/catalog/${source.sourceType}/${source.sourceId}.json`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Fetch failed ${response.status}: ${url}`);
  }
  const data = await response.json();
  return data.metas || [];
}

async function fetchCatalog(catalog) {
  const sources = catalog.sources || [
    { sourceType: catalog.sourceType, sourceId: catalog.sourceId },
  ];
  const results = await Promise.allSettled(sources.map(fetchSource));
  const sourceMetas = results
    .filter((result) => result.status === "fulfilled")
    .map((result) => result.value);

  for (const [index, result] of results.entries()) {
    if (result.status === "rejected") {
      console.warn(
        `Skipping ${sources[index].sourceId} for ${catalog.id}: ${result.reason.message}`,
      );
    }
  }

  if (sourceMetas.length === 0) {
    throw new Error(`All sources failed for ${catalog.id}`);
  }

  return dedupeMetas(interleaveMetas(sourceMetas))
    .slice(0, 100)
    .map(compactMeta);
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
