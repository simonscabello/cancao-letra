const express = require("express");
const { findLyrics, findCifraUrl } = require("./lyrics");
const cors = require("cors");

const appApi = express();
const portApi = process.env.PORT || 8080;

appApi.use(cors());

// Decode + as space in path params (some clients use + instead of %20)
appApi.use("/v1", function (req, res, next) {
  req.url = req.url.replace(/\+/g, "%20");
  next();
});

const GARBAGE = new Set([
  "artist",
  "title",
  "unknown",
  "undefined",
  "null",
  "no song playing",
  "_",
  "",
]);

appApi.get("/v1/:artist/:title", function (req, res) {
  const artist = req.params.artist;
  const title = req.params.title;
  if (!artist || !title) {
    return res.status(400).send({ error: "Artist or title missing" });
  }
  if (GARBAGE.has(artist.toLowerCase()) || GARBAGE.has(title.toLowerCase())) {
    return res.status(400).send({ error: "Invalid artist or title" });
  }
  Promise.all([findLyrics(title, artist), findCifraUrl(title, artist)])
    .then(([result, cifraUrl]) => {
      res.send({ lyrics: result.lyrics, url: result.url, cifraUrl });
    })
    .catch((e) => {
      res.status(404).send({ error: "No lyrics found" });
    });
});

appApi.get("/suggest/:term", async function (req, res) {
  try {
    const response = await fetch(
      "http://api.deezer.com/search?limit=15&q=" +
        encodeURIComponent(req.params.term),
    );
    const results = await response.json();
    res.send(results);
  } catch (e) {
    res.status(500).send({ error: "Failed to fetch suggestions" });
  }
});

appApi.listen(portApi, function () {
  console.log("API listening on port " + portApi);
});
