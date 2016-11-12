// the polyfills must be one of the first things imported in node.js.
// The only modules to be imported higher - node modules with es6-promise 3.x or other Promise polyfill dependency
// (rule of thumb: do it if you have zone.js exception that it has been overwritten)
// if you are including modules that modify Promise, such as NewRelic,, you must include them before polyfills
import 'angular2-universal-polyfills';

// Fix Universal Style
import { NodeDomRootRenderer, NodeDomRenderer } from 'angular2-universal/node';
function renderComponentFix(componentProto: any) {
  return new NodeDomRenderer(this, componentProto, this._animationDriver);
}
NodeDomRootRenderer.prototype.renderComponent = renderComponentFix;
// End Fix Universal Style

import * as path from 'path';
import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as cookieParser from 'cookie-parser';

// Angular 2
import { enableProdMode } from '@angular/core';
// Angular 2 Universal
import { createEngine } from 'angular2-express-engine';

const minify = require('html-minifier').minify;
const minifyOptions = {
  removeComments: true,
  removeCommentsFromCDATA: true,
  collapseWhitespace: true,
  collapseBooleanAttributes: true,
  removeAttributeQuotes: true,
  removeRedundantAttributes: true,
  useShortDoctype: true,
  removeEmptyAttributes: true,
  removeOptionalTags: true,
  removeEmptyElements: true,
};
const compression = require('compression');

// App
import { MainModule } from './app/app.node.module';

// enable prod for faster renders
enableProdMode();

const app = express();
const ROOT = path.join(path.resolve(__dirname, '..'));

// Express View
app.engine('.html', createEngine({
  precompile: true,
  ngModule: MainModule,
  providers: [
    // stateless providers only since it's shared
  ]
}));
app.set('port', process.env.PORT || 443);
app.set('views', __dirname);
app.set('view engine', 'html');

app.use(cookieParser('Angular 2 Universal'));
app.use(bodyParser.json());
app.use(compression());

// Serve static files
app.use('/assets', express.static(path.join(__dirname, 'assets'), {maxAge: 30}));
app.use(express.static(path.join(ROOT, 'dist/client'), {index: false}));

import { serverApi } from './backend/api';
// Our API for demos only
app.get('/data.json', serverApi);

// Routes with html5pushstate
// ensure routes match client-side-app
app.get('/', ngApp);
app.get('/posts', ngApp);
app.get('/posts/*', ngApp); // or use /:id?
app.get('/talks', ngApp);
app.get('/projects', ngApp);
app.get('/contact', ngApp);

app.get('*', function (req, res) {
  res.setHeader('Content-Type', 'application/json');
  var pojo = {status: 404, message: 'No Content'};
  var json = JSON.stringify(pojo, null, 2);
  res.status(404).send(json);
});

const spdy = require('spdy');
const fs = require('fs');

// Server

/*
 let server = app.listen(app.get('port'), () => {
 console.log(`Listening on: http://localhost:${server.address().port}`);
 });
 */

let server = spdy.createServer({
  key: fs.readFileSync('../cert/*_samvloeberghs_be.key'),
  cert: fs.readFileSync('../cert/*_samvloeberghs_be.crt')
}, app)
  .listen(app.get('port'), (err) => {
    if (err) {
      throw new Error(err);
    }
    console.log('Listening on port: ' + app.get('port'));
  });

var http = require('http');
http.createServer(function (req, res) {
  res.writeHead(301, { "Location": "https://" + req.headers['host'] + req.url });
  res.end();
}).listen(80);

function ngApp(req, res) {

  const config = {
    req,
    res,
    preboot: false,
    baseUrl: '/',
    requestUrl: req.originalUrl,
    originUrl: 'https://samvloeberghs.be'
  };

  let allowedCachePaths = ['', 'home', 'post', 'posts', 'talks', 'projects', 'contact'];
  allowedCachePaths = [];
  let cachePath = req.originalUrl.substr(1).replace('/', '_');
  if (cachePath === '') {
    cachePath = 'home';
  }
  let fileCachePath = cacheFolder + '/' + cachePath;

  // console.log(allowedCachePaths, cachePath, fileCachePath);
  // console.log('cache not allowed for: ' + cachePath);
  //res.render('index', config);


  // IF CACHE ALLOWED
  // ----------------
  if (allowedCachePaths.indexOf(cachePath)) {

    // check for existing file for the requests uri
    try {

      fs.accessSync(fileCachePath, fs.F_OK);
      readHtmlCache(fileCachePath, (html: string) => {
        console.log('cache exists for: ' + cachePath);
        res.status(200).send(html);
      });

    } catch (e) {

      console.log('no cache for: ' + cachePath);

      res.render('index', config, (err, html) => {

        if (err) {
          console.log(err);
        }

        let minifiedHtml = minify(html, minifyOptions);
        saveHtmlCache(fileCachePath, minifiedHtml);

        // send output
        res.status(200).send(minifiedHtml);
      });

    }


  }
  // CACHE NOT ALLOWED
  // -----------------
  else {
    // no caching
    console.log('cache not allowed for: ' + cachePath);
    res.render('index', config, (err, html) => {

      if (err) {
        console.log(err);
      }

      let minifiedHtml = minify(html, minifyOptions);

      // send output
      res.status(200).send(minifiedHtml);
    });
  }

}

const cacheFolder = 'cache';

function readHtmlCache(path, cb) {

  fs.readFile(path, {encoding: 'utf-8'}, function (err, data) {
    if (err) {
      return console.log(err);
    }
    cb(data);

  });
}

function saveHtmlCache(path, html) {

  fs.writeFile(path, html, {encoding: 'utf-8'}, function (err) {
    if (err) {
      return console.log(err);
    }

    console.log("The file was saved!");
  });

}
