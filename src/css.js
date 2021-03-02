const axios = require("axios");
const path = require("path");
const fs = require("fs");
const url = require("native-url");
const beautify_css = require("js-beautify").css;

let inputUrl = decodeURIComponent(process.argv[2] || "");
let extensions = [
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".svg",
  ".ttf",
  ".eot",
  ".woff",
  ".woff2",
];
console.log("\x1b[36m%s\x1b[0m", "CSS", inputUrl);
const start = async ({ cssUrl, basePath, subPath }) => {
  let parsed = url.parse(cssUrl);
  let parsedPath = parsed.pathname
    .split("/")
    .slice(0, parsed.pathname.split("/").length - 1)
    .join("/");
  let res, staticPath;
  if (cssUrl.indexOf("http") >= 0) {
    basePath = path.join(basePath, subPath);
    staticPath = path.join(basePath, parsedPath);
    res = await axios
      .get(cssUrl)
      .then((res) => res.data)
      .catch(() => false);
  } else {
    basePath = path.join(basePath, subPath);
    staticPath = basePath;
    res = fs.readFileSync(cssUrl).toString();
  }
  if (!res) return console.log("Error");
  let cssUrlFile = cssUrl
    .split("/")
    [cssUrl.split("/").length - 1].split("?")[0];
  let localFilePath = path.join(staticPath, cssUrlFile);
  console.log(cssUrl);

  let importMatches = res?.match(/\@import( ?)("|')(.*?)("|')/gi) || [];
  for (let match of importMatches) {
    let link = match.replace(/\@import( ?)("|')(.*?)("|')/gi, "$3");

    if (link.indexOf("http") >= 0) continue;
    link = link.replace(/\'/g, "");
    link = link.replace(/\"/g, "");
    link = link.split("?")[0];
    let fileUrlPath = url.resolve(cssUrl, link);
    await start({ cssUrl: fileUrlPath, basePath });
  }

  let matches = res?.match(/url\((.*?)\)/gim) || [];
  for (let match of matches) {
    match = match.replace(/url\((.*?)\)/gim, "$1");
    if (match.indexOf("data:") >= 0) continue;
    match = match.split("?")[0];
    match = match.split("#")[0];
    match = match.replace(/\'/g, "");
    match = match.replace(/\"/g, "");
    if (!extensions.includes(path.extname(match))) continue;
    let orgmatch = match;
    if (match.indexOf("//") == 0) {
      match = "https:" + match;
    }
    let fileUrlPath =
      match.indexOf("http") == 0 ? match : url.resolve(cssUrl, match);
    let localFilePath = path.join(staticPath, match);
    let parsed = url.parse(fileUrlPath);
    if (match.indexOf("http") == 0) {
      localFilePath = path.join(staticPath, parsed.pathname);
    }

    if (match.indexOf("//") >= 0) {
      let udata = path.join("./", match.split("/").slice(3).join("/"));
      res = res.replace(new RegExp(orgmatch, "gi"), udata);
    } else if (match.indexOf("/") == 0) {
      let udata = path.join("./", match);
      res = res.replace(new RegExp(orgmatch, "gi"), udata);
    }
    if (fs.existsSync(localFilePath)) continue;

    let itemres = await axios
      .get(fileUrlPath, {
        responseType: "stream",
        timeout: 2000,
        headers: { referer: parsed.protocol + "//" + parsed.hostname },
      })
      .then((res) => res.data)
      .catch(() => false);

    if (!itemres) {
      console.log(false, fileUrlPath);
      continue;
    }

    console.log(fileUrlPath);

    await fs.promises.mkdir(
      localFilePath
        .split("/")
        .slice(0, localFilePath.split("/").length - 1)
        .join("/"),
      { recursive: true }
    );
    itemres.pipe(fs.createWriteStream(localFilePath));
  }

  await fs.promises.mkdir(
    localFilePath
      .split("/")
      .slice(0, localFilePath.split("/").length - 1)
      .join("/"),
    { recursive: true }
  );

  res = beautify_css(res);
  console.log("\x1b[36m%s\x1b[0m", "CSS WRITE", localFilePath);
  fs.writeFileSync(localFilePath, res);
};

start({
  cssUrl: inputUrl,
  basePath: path.join(__dirname, ".."),
  subPath: "static/assets",
});
