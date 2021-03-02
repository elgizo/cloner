const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const { parse } = require("node-html-parser");
const beautify = require("js-beautify").html;

let inputFile = decodeURIComponent(process.argv[2] || "");

let outputFile = process.argv[3];

outputFile =
  outputFile &&
  path.join(__dirname, "../static", decodeURIComponent(outputFile));

let folderPath = outputFile?.split("/");
folderPath = folderPath?.slice(0, folderPath.length - 1);
folderPath = folderPath?.join("/");
const start = async (htmlData) => {
  let response = beautify(htmlData);

  response = response.replace(/ ng\-click\=\"(.*?)\"/gi, "");
  response = response.replace(/ ng\-href\=\"(.*?)\"/gi, "");
  response = response.replace(/ ng\-src\=\"(.*?)\"/gi, "");
  response = response.replace(/ ng\-if\=\"(.*?)\"/gi, "");
  response = response.replace(/ ng\-repeat\=\"(.*?)\"/gi, "");
  response = response.replace(/ ng\-show\=\"(.*?)\"/gi, "");
  response = response.replace(/ ng\-hide\=\"(.*?)\"/gi, "");
  response = response.replace(/ ng\-class\=\"(.*?)\"/gi, "");
  response = response.replace(/ ng\-style\=\"(.*?)\"/gi, "");
  response = response.replace(/ ng\-include\=\"(.*?)\"/gi, "");
  response = response.replace(/ ng\-bind\-html\=\"(.*?)\"/gi, "");
  response = response.replace(/ ng\-bind\=\"(.*?)\"/gi, "");
  response = response.replace(/ target\=\"(.*?)\"/gi, "");
  response = response.replace(/ ng\-mouseleave\=\"(.*?)\"/gi, "");
  response = response.replace(/ ng\-mouseover\=\"(.*?)\"/gi, "");
  response = response.replace(/ ng\-init\=\"(.*?)\"/gi, "");
  response = response.replace(/ ng\-model\=\"(.*?)\"/gi, "");
  response = response.replace(/ ng\-keypress\=\"(.*?)\"/gi, "");
  response = response.replace(/ left-menu\=\"(.*?)\"/gi, "");
  response = response.replace(/ ng\-controller\=\"(.*?)\"/gi, "");
  response = response.replace(/ ng\-change\=\"(.*?)\"/gi, "");
  response = response.replace(/ ng\-pattern\=\"(.*?)\"/gi, "");
  response = response.replace(/ ng\-disabled\=\"(.*?)\"/gi, "");
  response = response.replace(/ ng\-view\=\"(.*?)\"/gi, "");
  response = response.replace(/ ng\-switch\=\"(.*?)\"/gi, "");
  response = response.replace(/ ng\-switch-when\=\"(.*?)\"/gi, "");
  response = response.replace(/ template-path\=\"(.*?)\"/gi, "");
  response = response.replace(/ src=\"\:\:(.*?)\"/gi, "");
  response = response.replace(/ class=\"\"/gi, "");
  response = response.replace(/ style=\"\"/gi, "");
  response = response.replace(/ trans=\"\"/gi, "");
  response = response.replace(/<!--(.*?)-->/gims, "");
  response = response.replace(/"\/tr\//g, '"/');
  response = response.replace(/"\/tr"/g, '"/"');

  response = response.replace(/\"\/\//gi, '"https://');

  const root = parse(response);
  if (process.env.REMOVE_STYLES == 1) {
    for (let el of root.querySelectorAll("head style")) {
      el.remove();
    }
  }
  for (let el of root.querySelectorAll('link[rel="canonical"]')) {
    el.remove();
  }
  for (let el of root.querySelectorAll('link[rel="alternate"]')) {
    el.remove();
  }
  if (process.env.REMOVE_SCRIPTS == 1) {
    const list = root.querySelectorAll("script");
    for (let e of list) {
      e.remove();
    }
  }

  response = root.outerHTML;
  response = beautify(response, { max_preserve_newlines: 0 });
  process?.send?.(response);
  if (outputFile) fs.writeFileSync(outputFile, response);
};

if (fs.existsSync(inputFile)) {
  let htmlData = fs.readFileSync(inputFile).toString();
  start(htmlData);
}

process.on("message", (source) => {
  start(source);
});
