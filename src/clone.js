const fs = require("fs");
const util = require("util");
const path = require("path");
const url = require("native-url");
let { fork, exec } = require("child_process");

exec = util.promisify(exec);

const inputUrl = process.argv[2];

let inputFileName = !inputUrl.endsWith(".html") ? inputUrl + ".html" : inputUrl;
inputFileName = inputFileName.split("/");
inputFileName = inputFileName[inputFileName.length - 1];

let domain = inputUrl && inputUrl.split("/").slice(0, 3).join("/");

let folderPath = path.join(__dirname, "../static");
const filepath = path.join(folderPath, inputFileName);

const start = async () => {
  await fs.promises.mkdir(folderPath, { recursive: true });
  let source = await new Promise((r) => {
    let ps = fork("./src/htmlsource.js");
    ps.send(inputUrl);
    ps.on("message", async (source) => {
      r(source);
      ps.kill();
    });
  });

  await fs.promises.writeFile(filepath, source);
  source = await new Promise((r) => {
    let ps = fork("./src/html2css.js", [
      encodeURIComponent(filepath),
      "assets/other.css",
    ]);
    ps.on("message", (data) => {
      r(data);
      ps.kill();
    });
  });

  source = await new Promise((r) => {
    let ps = fork(`./src/html.js`);
    ps.send([inputUrl, inputFileName, source]);
    ps.on("message", (data) => {
      r(data);
      ps.kill();
    });
  });

  // Download Assets
  matches = source.match(/http(s)?\:\/\/([a-zA-Z0-9\._\-\/]*)\.css/gi) || [];
  for (let match of matches) {
    console.log(match);
    let parsed = url.parse(match);

    let localFileUrl = "/" + path.join("static", parsed.pathname);
    source = source.replace(match, localFileUrl);

    const { stdout } = await exec(`npm run css ${match}`);
    console.log(stdout);
  }

  source = source.replace(
    new RegExp(`https?://${domain.split("/")[2]}/`, "gi"),
    "/"
  );
  source = source.replace(
    new RegExp(`https?://${domain.split("/")[2]}`, "gi"),
    "/"
  );

  await fs.promises.writeFile(filepath, source);
};

start();
