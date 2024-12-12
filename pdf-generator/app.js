if (process.env.NEW_RELIC_LICENSE_KEY) {
  require("newrelic");
}

var express = require("express");
const bodyParser = require("body-parser");
var app = express();
const port = process.env.PDF_PORT || 80;

app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.raw({ inflate: true, type: "text/plain" }));
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", req.headers.origin);
  res.header("Access-Control-Allow-Credentials", "true");
  res.header(
    "Access-Control-Allow-Methods",
    "GET,HEAD,OPTIONS,POST,PATCH,PUT,DELETE"
  );
  res.header("Access-Control-Expose-Headers", "Content-Length");
  res.header(
    "Access-Control-Allow-Headers",
    "Access-Control-Allow-Origin, Origin, Referrer-Policy, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Range"
  );
  if (req.method === "OPTIONS") {
    res.header(
      "Access-Control-Allow-Methods",
      "GET,HEAD,OPTIONS,POST,PATCH,PUT,DELETE"
    );
    return res.sendStatus(200);
  }
  return next();
});

// respond with "hello world" when a GET request is made to the homepage
app.get("/", function (req, res) {
  (async () => {
    res.send("hello world");
  })();
});

app.use("/v2", require("./routes/reports")());
app.listen(port, () => console.log(`Example app listening on port ${port}!`));
