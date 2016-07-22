var express = require("express"),
  ParseServer = require("parse-server").ParseServer,
  ParseDashboard = require('parse-dashboard'),
  routes = require("./routes"),
  http = require("http"),
  path = require("path"),
  mongoskin = require("mongoskin")
  bodyParser = require("body-parser"),
  morgan = require("morgan"),
  cookieParser = require("cookie-parser"),
  session = require("express-session"),
  methodOverride = require("method-override"),
  errorHandler = require("errorhandler"),
  W3CWebSocket = require("websocket").w3cwebsocket,
	voucher_codes = require("voucher-code-generator");
  basicAuth = require("basic-auth-connect");

var app = express();
var authorised = basicAuth(function(username, password) {
	return username == "testUser" && password == "testPass";
});

app.use(authorised);

app.locals.appTitle = "Parse Voucher";

var api = new ParseServer({
  databaseURI: "mongodb://zoobe:H3kaWr6F@iad1-c18-0.mongo.objectrocket.com:51224,iad1-c18-1.mongo.objectrocket.com:51224,iad1-c18-2.mongo.objectrocket.com:51224/zoobedev_parse?ssl=true",
  serverURL: "https://parsehqdev.zoobe.com/parse",
  appId: "lbolVcK2bDnmvknr7fQeeFXLlnCnYqdYTQsK0sT4",
  masterKey: "LhimlwumQnhpvtjHc2fbbrcRWZ0zuXrhjY8Cckyf"
});

Parse.initialize("lbolVcK2bDnmvknr7fQeeFXLlnCnYqdYTQsK0sT4");

app.use("/parse", api);

app.set("port", process.env.PORT || 3000);
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");
app.use(morgan("dev"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser("3CCC4ACD-6ED1-4844-9217-82131BDCB239"));
app.use(session({
  secret: "2C44774A-D649-4D44-9535-46E296EF984F",
  resave: true,
  saveUninitialized: false
}));
app.use(methodOverride());
app.use(require("stylus").middleware(__dirname + "/public"));
app.use(express.static(path.join(__dirname, "public")));

app.use(function(req, res, next) {
  req.session.bundles = bundles;
  return next();
});

if ("development" == app.get("env")) {
  app.use(errorHandler());
}

app.get("/", routes.index);

app.get("/vouchers/new", routes.voucher.new);
app.get("/vouchers/:code", routes.voucher.show);
app.get("/vouchers/:code/edit", routes.voucher.edit);
app.get("/vouchers/:code/assign", routes.voucher.assign);

app.all("/api/*", function(req, res, next) {
  if (authorised) return next();
  else res.send({ error: true, code: 400, message: "You are not authorised." });
});

app.post("/api/vouchers", routes.voucher.create);

app.get("/api/vouchers", routes.voucher.index);
app.get("/api/vouchers/:code", routes.voucher.index);

app.post("/api/vouchers/:code", routes.voucher.update);
app.post("/api/vouchers/:code/assign", routes.voucher.doAssign);
app.post("/api/vouchers/:code/activate", routes.voucher.activate);
app.post("/api/vouchers/:code/delete", routes.voucher.delete);

app.all("*", function(req, res) {
	res.sendStatus(404);
});

var client = new W3CWebSocket("wss://apphq.zoobe.com:9090/zoobe/api/v2");

client.onerror = function() {
  console.log("Connection Error");
};

client.onopen = function() {
  if (client.readyState === client.OPEN) {
    var json = {
      id: "001",
      method: "authenticate",
      params: {
        authentication: {
          application: {
            name: "ZoobeApp.test",
            version: "3.6.4",
            platform: "Android",
            platformVersion: "7.0.3"
          }, user: {
            uuid: "1b0fbc00-efba-401f-9a61-95b04091d6c0",
            euuid: "uN7w+SYvYq3LlhMbaF1j/UfOTWmYHilRd6ydPgxUXm8iltX7CaLpBfY2QFBHbbB+",
            locale: "en_GB",
            mcc: 262
          }
        }
      },
      jsonrpc: "2.0"
    };
    client.send(JSON.stringify(json));
  }
};

client.onclose = function() {
  console.log("WebSocket Client Closed");
};

var bundles;

client.onmessage = function(e) {
  if (typeof e.data === "string") {
    var response = JSON.parse(e.data);
    if (response.method == "onAuthenticated") {
  if (client.readyState === client.OPEN) {
    var json = {
      method: "getShop",
      params: {
        token: response.params.token
      }
    };
    client.send(JSON.stringify(json));
  }
    }
    if (response.method == "setShop") {
  bundles = response.params.shop.bundles.map(function(bundle) { return { id: bundle.bundleId, name: bundle.headline }; });
    }
  }
};

var server = http.createServer(app);
var boot = function () {
  server.listen(app.get("port"), function() {
    console.info(app.locals.appTitle + " running on http://localhost:" + app.get("port"));
  });
}
var shutdown = function() {
  server.close();
}
if (require.main === module) {
  boot();
} else {
  console.info("Running app as a module");
  exports.boot = boot;
  exports.shutdown = shutdown;
  exports.port = app.get("port");
}
