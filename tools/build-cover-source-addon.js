const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const outDir = process.env.COVER_SOURCE_OUT_DIR
  ? path.resolve(process.env.COVER_SOURCE_OUT_DIR)
  : path.join(root, "cover-source-addon");

const AIO_BASE =
  "https://aiometadatafortheweebs.midnightignite.me/stremio/b8a243f2-f7a9-426b-82c9-37262968c247";
const ALIVE_BASE = (process.env.COVER_SOURCE_ALIVE_BASE || "").replace(/\/$/, "");

function readText(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "") : "";
}

function readJson(filePath, fallback = null) {
  const text = readText(filePath);
  return text ? JSON.parse(text) : fallback;
}

function readEnvFile(filePath) {
  const env = {};
  for (const rawLine of readText(filePath).split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const index = line.indexOf("=");
    let value = line.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[line.slice(0, index).trim()] = value;
  }
  return env;
}

function serviceEnv() {
  const shared = readEnvFile(path.join(root, ".trial-secrets", ".env"));
  const credentials = readJson(path.join(root, ".trial-secrets", "friend-service-credentials.json"), {});
  return {
    ...shared,
    ...process.env,
    TMDB_API_KEY:
      process.env.TMDB_API_KEY ||
      credentials.tmdb?.api_key_v3 ||
      shared.TMDB_API_KEY ||
      "",
  };
}

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
      { base: "alive", sourceType: "movie", sourceId: "alive-tonight", fallbackSourceId: "mdblist.186303" },
      { base: "alive", sourceType: "series", sourceId: "alive-tonight", fallbackSourceId: "mdblist.186304" },
    ],
  },
  {
    id: "nuvio-because-you-watched-cover",
    type: "movie",
    name: "Nuvio Cover - Because You Watched",
    sources: [
      { base: "alive", sourceType: "movie", sourceId: "alive-because-watched", fallbackSourceId: "trakt.list.35741279" },
      { base: "alive", sourceType: "series", sourceId: "alive-because-watched", fallbackSourceId: "trakt.list.35741284" },
    ],
  },
  {
    id: "nuvio-gems-for-you-cover",
    type: "movie",
    name: "Nuvio Cover - Gems For You",
    sources: [
      { base: "alive", sourceType: "movie", sourceId: "alive-gems", fallbackSourceId: "trakt.list.35741285" },
      { base: "alive", sourceType: "series", sourceId: "alive-gems", fallbackSourceId: "trakt.list.35741286" },
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
      { base: "alive", sourceType: "movie", sourceId: "alive-new-for-you", fallbackSourceId: "mdblist.186301" },
      { base: "alive", sourceType: "series", sourceId: "alive-new-for-you", fallbackSourceId: "mdblist.186302" },
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
    direct: "tmdb",
    sources: [
      { sourceType: "movie", tmdbPath: "/trending/movie/day" },
      { sourceType: "series", tmdbPath: "/trending/tv/day" },
    ],
  },
  {
    id: "nuvio-popular-cover",
    type: "movie",
    name: "Nuvio Cover - Popular",
    direct: "tmdb",
    sources: [
      { sourceType: "movie", tmdbPath: "/movie/popular" },
      { sourceType: "series", tmdbPath: "/tv/popular" },
    ],
  },
  {
    id: "nuvio-top-rated-cover",
    type: "movie",
    name: "Nuvio Cover - Top Rated",
    direct: "tmdb",
    sources: [
      { sourceType: "movie", tmdbPath: "/movie/top_rated" },
      { sourceType: "series", tmdbPath: "/tv/top_rated" },
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

function tmdbImage(pathValue, size = "original") {
  return pathValue ? `https://image.tmdb.org/t/p/${size}${pathValue}` : undefined;
}

function yearFromDate(value) {
  return value ? String(value).slice(0, 4) : undefined;
}

function runtimeLabel(minutes) {
  if (!minutes) return undefined;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (!hours) return `${mins}min`;
  return mins ? `${hours}h${mins}min` : `${hours}h`;
}

async function tmdbJson(pathValue, params = {}) {
  const apiKey = serviceEnv().TMDB_API_KEY;
  if (!apiKey) throw new Error("Missing TMDB_API_KEY for direct TMDB cover catalogs.");
  const url = new URL(`https://api.themoviedb.org/3${pathValue}`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("language", "en-AU");
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, value);
  }
  const response = await fetch(url);
  if (!response.ok) {
    const safeUrl = String(url).replace(/api_key=[^&]+/g, "api_key=[redacted]");
    throw new Error(`TMDB fetch failed ${response.status}: ${safeUrl}`);
  }
  return response.json();
}

async function fetchTmdbDetails(sourceType, id) {
  const mediaPath = sourceType === "series" ? "tv" : "movie";
  return tmdbJson(`/${mediaPath}/${id}`, { append_to_response: "external_ids" });
}

function tmdbMetaFromDetails(sourceType, details) {
  const mediaType = sourceType === "series" ? "series" : "movie";
  const imdbId = details.external_ids?.imdb_id;
  const stremioId = imdbId || `tmdb:${mediaType}:${details.id}`;
  const title = mediaType === "series" ? details.name : details.title;
  const date = mediaType === "series" ? details.first_air_date : details.release_date;
  const year = yearFromDate(date);
  const rating = details.vote_average ? String(Number(details.vote_average).toFixed(1)).replace(/\.0$/, "") : undefined;
  const runtime = mediaType === "series"
    ? runtimeLabel(details.episode_run_time?.find(Boolean))
    : runtimeLabel(details.runtime);
  return {
    id: stremioId,
    type: mediaType,
    name: title,
    poster: imdbId
      ? `https://btttr.cc/poster-q/imdb/poster-default/${imdbId}.jpg?rs=TR`
      : tmdbImage(details.poster_path, "w500"),
    background: tmdbImage(details.backdrop_path),
    description: details.overview,
    genres: details.genres?.map((genre) => genre.name).filter(Boolean),
    year,
    releaseInfo: year,
    imdbRating: rating,
    runtime,
    behaviorHints: {
      defaultVideoId: stremioId,
      hasScheduledVideos: false,
    },
  };
}

async function fetchTmdbSource(source) {
  const pages = [1, 2, 3];
  const pageResults = await Promise.all(pages.map((page) => tmdbJson(source.tmdbPath, { page })));
  const items = pageResults.flatMap((page) => page.results || []).slice(0, 50);
  const details = [];
  for (const item of items) {
    try {
      details.push(await fetchTmdbDetails(source.sourceType, item.id));
    } catch (error) {
      console.warn(`Skipping TMDB ${source.sourceType} ${item.id}: ${error.message}`);
    }
  }
  return details.map((item) => tmdbMetaFromDetails(source.sourceType, item));
}

async function fetchSource(source) {
  const base = source.base === "alive" && ALIVE_BASE ? ALIVE_BASE : AIO_BASE;
  const sourceId = source.base === "alive" && !ALIVE_BASE && source.fallbackSourceId
    ? source.fallbackSourceId
    : source.sourceId;
  const url = `${base}/catalog/${source.sourceType}/${sourceId}.json`;
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
  const sourceFetcher = catalog.direct === "tmdb" ? fetchTmdbSource : fetchSource;
  const results = await Promise.allSettled(sources.map(sourceFetcher));
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
