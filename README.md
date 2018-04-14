# hapi-error-page [![Build status for hapi Error Page](https://img.shields.io/circleci/project/sholladay/hapi-error-page/master.svg "Build Status")](https://circleci.com/gh/sholladay/hapi-error-page "Builds")

> Friendly error pages for humans

This [hapi](https://hapijs.com) plugin makes it easy to return beautiful HTML error pages to your users.

## Why?

 - Errors in hapi are displayed as [JSON](https://json.org) by default.
 - JSON is good for machines but bad for people.
 - Works with AJAX / APIs (respects the [`Accept`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept) header).

## Install

```sh
npm install hapi-error-page --save
```

## Usage

Register the plugin on your server to enable friendly error pages.

```js
const hapi = require('hapi');
const vision = require('vision');
const errorPage = require('hapi-error-page');

const server = hapi.server();

const init = async () => {
    await server.register([
        vision,
        errorPage
    ]);
    server.views({
        engines    : {
            html : handlebars
        },
        relativeTo : __dirname,
        path       : '.'
    });
    server.route({
        method : 'GET',
        path   : '/',
        handler() {
            throw new Error('uh oh');
        }
    });
    await server.start();
    console.log('Server ready:', server.info.uri);
};

init();
```

Visiting the above route will return an HTML error page rendered by [Handlebars](https://github.com/wycats/handlebars.js/) from a view file named `error.html`. You can, of course, use other templating engines instead (see the [vision](https://github.com/hapijs/vision) documentation for details).

Please use [boom](https://github.com/hapijs/boom) to construct errors instead of `new Error()`, so that we can deliver more useful messages. This project will function correctly either way, but `boom` is preferred.

## Contributing

See our [contributing guidelines](https://github.com/sholladay/hapi-error-page/blob/master/CONTRIBUTING.md "Guidelines for participating in this project") for more details.

1. [Fork it](https://github.com/sholladay/hapi-error-page/fork).
2. Make a feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. [Submit a pull request](https://github.com/sholladay/hapi-error-page/compare "Submit code to this project for review").

## License

[MPL-2.0](https://github.com/sholladay/hapi-error-page/blob/master/LICENSE "License for hapi-error-page") © [Seth Holladay](https://seth-holladay.com "Author of hapi-error-page")

Go make something, dang it.
