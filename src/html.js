const fs = require("fs");
const util = require("util");
const path = require("path");
const url = require("native-url");
const axios = require("axios");
let { fork } = require("child_process");

const inputUrl = decodeURIComponent(process.argv[2] || "");
let outputFile = decodeURIComponent(process.argv[3] || "static");

outputFile = path.join(__dirname, "../static", outputFile);
let folderPath = outputFile?.split("/");
folderPath = folderPath?.slice(0, folderPath.length - 1);
folderPath = folderPath?.join("/");

const start = async (iurl, ourl = false, source = false) => {
  if (ourl) {
    outputFile = path.join(__dirname, "../static", ourl);
    folderPath = outputFile?.split("/");
    folderPath = folderPath?.slice(0, folderPath.length - 1);
    folderPath = folderPath?.join("/");
  }
  let domain = iurl.split("/").slice(0, 3).join("/");
  inputUrl.length > 0 && console.log(iurl);
  if (!source) {
    source = await new Promise((r) => {
      let ps = fork("./src/htmlsource.js");
      ps.send(iurl);
      ps.on("message", async (source) => {
        r(source);
        ps.kill();
      });
    });
  }

  let matches = source.match(/src\="[^http](.*?)"/gi) || [];

  // Replace Assets Url
  for (let match of matches) {
    rmatch = match.replace(/src="(.*?)"/gi, "$1");
    if (rmatch.endsWith(".js")) continue;
    source = source.replace(match, 'src="' + url.resolve(domain, rmatch) + '"');
  }

  // Link Rel Css
  matches = source.match(/href\="[^http](.*?)\.css"/gi) || [];
  for (let match of matches) {
    rmatch = match.replace(/href="(.*?)"/gi, "$1");
    source = source.replace(
      match,
      'href="' + url.resolve(domain, rmatch) + '"'
    );
  }

  // Download Assets
  let urlregex = /http(s)?\:\/\/([a-zA-Z0-9\._\-\/]*)\.(png|jpg|jpeg|svg|gif|webp)/gi;
  matches = source.match(urlregex) || [];
  for (let match of matches) {
    if (!folderPath) continue;
    console.log(match);

    let parsed = url.parse(match);
    let localFilePath = path.join(folderPath, "images", parsed.pathname);
    let localFileUrl = "/" + path.join("static/images", parsed.pathname);
    source = source.replace(match, localFileUrl);

    if (fs.existsSync(localFilePath)) continue;
    let reqConf = {
      responseType: "stream",
      timeout: 2000,
      headers: { referer: parsed.protocol + "//" + parsed.hostname },
    };
    let { data } = await axios.get(match, reqConf).catch(() => false);

    if (!data) console.log(false, match);
    if (!data) continue;

    let fpath = localFilePath.split("/");
    fpath = fpath.slice(0, fpath.length - 1);
    fpath = fpath.join("/");
    await fs.promises.mkdir(fpath, { recursive: true });

    data?.pipe(fs.createWriteStream(localFilePath));
  }

  let ps = fork(`./src/html-beautifier`);
  ps.send(source);
  ps.on("message", async (data) => {
    process?.send?.(data);
    if (outputFile.length > 0) await fs.promises.writeFile(outputFile, data);
    ps.kill();
  });
};

inputUrl.length > 0 && start(inputUrl);

process.on("message", (args) => {
  if (Array.isArray(args)) start(...args);
  else start(args);
});
