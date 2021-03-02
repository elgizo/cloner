var fs = require("fs");
var path = require("path");
var axios = require("axios");

const inputPath = "public/";
const outputPath = "assets/cdn/";

const parseJson = (data) => {
  try {
    return JSON.parse(data);
  } catch (e) {
    return false;
  }
};
const walk = function (dir) {
  var results = [];
  var list = fs.readdirSync(dir);
  list.forEach(function (file) {
    file = dir + "/" + file;
    var stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      /* Recurse into a subdirectory */
      results = results.concat(walk(file));
    } else {
      /* Is a file */
      results.push(file);
    }
  });
  return results;
};
let exts = [".svg", ".png", ".jpg", ".jpeg", ".gif", ".webp"];
const getImages = (json) => {
  return Object.values(json || {}).reduce((list, e) => {
    if (typeof e == "object") list.push(...getImages(e));
    else if (typeof e == "string") {
      if (exts.indexOf(path.extname(e)) >= 0) list.push(e);
    }
    return list;
  }, []);
};

let list = walk(path.join(__dirname, inputPath)).filter(
  (e) => path.extname(e) == ".json"
);
async function start() {
  let currentItem = 0;
  for (let item of list) {
    let cnt = fs.readFileSync(item).toString();
    var r = /\\u([\d\w]{4})/gi;
    cnt = cnt.replace(r, function (match, grp) {
      return String.fromCharCode(parseInt(grp, 16));
    });
    fs.writeFileSync(item, cnt);
    let json = parseJson(cnt);
    let images = getImages(json);

    for (let img of images) {
      if (img.indexOf("http") == -1) continue;
      console.log(img);
      let { data } = await axios
        .get(encodeURI(img), { responseType: "stream", timeout: 5000 })
        .catch((e) => {
          console.log(e?.response?.status);
          return false;
        });
      if (!data) continue;
      let fpath = img.split("/").slice(3);
      let fname = fpath[fpath.length - 1];
      let fileFolderPath = fpath.slice(0, fpath.length - 1).join("/");
      let folderPath = path.join(__dirname, outputPath, fileFolderPath);
      try {
        fs.mkdirSync(folderPath, { recursive: true });

        let newPath = path.join(folderPath, fname);
        data.pipe(fs.createWriteStream(newPath));
        currentItem++;
        console.log(currentItem, fname);
        cnt = cnt.replace(
          img,
          path.join("/", outputPath, fileFolderPath, fname)
        );
      } catch (e) {}
    }
    fs.writeFileSync(item, cnt);
  }
}
start();
