const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const layoutPath = path.join(root, "trial3-trial-shaped-layout.json");
const configToken =
  "jZTBbtswDIZfReDZSoYdetCtK9Btl6JYAwzF0ANrs7YGSzQkOkER5N0L2XWDopHtGy19_CmRv3yEEgVbriOYf9CiUBTtoJjCCAUIV_g6LI7ReQ2hgJKd9fWw_R7Gc5gACeSrCfn4SFDHXd9iGDameBTvoACsKvbmm3G8t2R8v7esGxaNfZSArUVd8p5ChhT2tm5klnmmEvtI-pV7fUApG6pm-Zpc1C8choQ50NNBYxk4Rh0lEA69WEpYI2y9Lq0nh3H-8lOXxzHNoVPf53vZ6YDy0Z2nAhwJgjmuHpI5gkdHYOAuMeomrSqtfrEo69X1hKfpgwEHpzVjzanuRmpJLD__nPCPMUM9cq_-jhlLRS6YJqf-k1xUtxyS_JLsjMVy8nd0UNdDinqYUtaUWXf4pL7y7F9cnNP87dXNCC764pLjs_Z4h9UuwUvSn19ITvN-pJb9-_kp5R3cqT-JOwtOiulPfYQ-tGCgEemi2W4DO-KWv19taitN_7yxvB0LDmV05D6UtHXo7QtF2fyP7KG4VPphINWOosDp6fQG";

const covers = {
  "pulse-hot-au": ["nuvio-hot-australia-cover", "Hot in Australia"],
  "pulse-tonight": ["nuvio-tonight-cover", "Tonight"],
  "pulse-because-watched": [
    "nuvio-because-you-watched-cover",
    "Because You Watched...",
  ],
  "pulse-gems": ["nuvio-gems-for-you-cover", "Gems For You"],
  "pulse-new-streaming": [
    "nuvio-new-across-streaming-cover",
    "New Across Streaming",
  ],
  "pulse-new-for-you": ["nuvio-new-for-you-cover", "New For You"],
  "pulse-in-cinemas": ["nuvio-in-cinemas-cover", "In Cinemas"],
  "moving-trending": ["nuvio-trending-today-cover", "Trending Today"],
  "moving-popular": ["nuvio-popular-cover", "Popular"],
  "moving-top-rated": ["nuvio-top-rated-cover", "Top Rated"],
};

function coverUrl(catalogId, name) {
  return [
    `https://btttr.cc/${configToken}/cover/movie/`,
    `addon:0:movie:${catalogId}.png?name=${encodeURIComponent(name)}`,
  ].join("");
}

const collections = JSON.parse(fs.readFileSync(layoutPath, "utf8"));
const updated = [];

for (const collection of collections) {
  for (const folder of collection.folders || []) {
    const cover = covers[folder.id];
    if (!cover) continue;

    const url = coverUrl(...cover);
    folder.coverImageUrl = url;
    folder.heroBackdropUrl = url;
    folder.focusGifUrl = url;
    updated.push({ id: folder.id, title: folder.title, url });
  }
}

const missing = Object.keys(covers).filter(
  (id) => !updated.some((folder) => folder.id === id),
);
if (missing.length) {
  throw new Error(`Missing target folders: ${missing.join(", ")}`);
}

fs.writeFileSync(layoutPath, `${JSON.stringify(collections, null, 2)}\n`);
console.log(JSON.stringify({ ok: true, layoutPath, updated }, null, 2));
