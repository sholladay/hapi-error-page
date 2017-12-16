import path from 'path';
import test from 'ava';
import hapi from 'hapi';
import vision from 'vision';
import handlebars from 'handlebars';
import errorPage from '.';

const sendRequest = (server, option) => {
    return server.inject({
        method : 'GET',
        url    : '/',
        ...option
    });
};

const makeRoute = (option) => {
    return {
        method : 'GET',
        path   : '/',
        handler() {
            throw new Error('my gosh');
        },
        ...option
    };
};

const makeServer = async (option) => {
    const { plugin, route } = {
        plugin : [vision, errorPage],
        route  : makeRoute(),
        ...option
    };
    const server = hapi.server();
    if (plugin) {
        await server.register(plugin);
    }
    if (typeof server.views === 'function') {
        server.views({
            engines    : {
                html : handlebars
            },
            relativeTo : path.join(__dirname, 'fixture'),
            path       : '.'
        });
    }
    if (route) {
        server.route(route);
    }
    return server;
};

test('baseline without errorPage', async (t) => {
    const server = await makeServer({
        plugin : null
    });
    const response = await sendRequest(server);

    t.is(response.statusCode, 500);
    t.is(response.headers['content-type'], 'application/json; charset=utf-8');
    t.is(response.payload, JSON.stringify({
        statusCode : 500,
        error      : 'Internal Server Error',
        message    : 'An internal server error occurred'
    }));
});

test('throws without vision', async (t) => {
    const server = await makeServer({
        plugin : [errorPage]
    });
    const err = await t.throws(server.start());

    t.true(err.message.startsWith('Plugin hapi-error-page missing dependency vision'));
});

test('renders error to view', async (t) => {
    const server = await makeServer();
    const response = await sendRequest(server);

    t.is(response.statusCode, 500);
    t.is(response.headers['content-type'], 'text/html; charset=utf-8');
    t.is(response.payload, [
        '<p>Title: Internal Server Error</p>',
        '<p>Status code: 500</p>',
        '<p>Message: Sorry, an internal problem has arisen. Please try again.</p>'
    ].join('\n') + '\n');
});

test('honors media type header', async (t) => {
    const server = await makeServer();
    const requestType = (accept) => {
        return sendRequest(server, {
            headers : { accept }
        });
    };

    const jsonResp = await requestType('application/json');
    t.is(jsonResp.statusCode, 500);
    t.is(jsonResp.headers['content-type'], 'application/json; charset=utf-8');
    t.is(jsonResp.payload, JSON.stringify({
        statusCode : 500,
        error      : 'Internal Server Error',
        message    : 'An internal server error occurred'
    }));

    const htmlResp = await requestType('text/html');
    t.is(htmlResp.statusCode, 500);
    t.is(htmlResp.headers['content-type'], 'text/html; charset=utf-8');
    t.is(htmlResp.payload, [
        '<p>Title: Internal Server Error</p>',
        '<p>Status code: 500</p>',
        '<p>Message: Sorry, an internal problem has arisen. Please try again.</p>'
    ].join('\n') + '\n');

    const anyResp = await requestType('*/*');
    t.is(anyResp.statusCode, 500);
    t.is(anyResp.headers['content-type'], 'text/html; charset=utf-8');
    t.is(anyResp.payload, [
        '<p>Title: Internal Server Error</p>',
        '<p>Status code: 500</p>',
        '<p>Message: Sorry, an internal problem has arisen. Please try again.</p>'
    ].join('\n') + '\n');

    // Currently fails, see: https://github.com/hapijs/accept/issues/19
    // const jsonPreferred = await requestType('application/json, text/html;q=0.9');
    // t.is(jsonPreferred.statusCode, 500);
    // t.is(jsonPreferred.headers['content-type'], 'application/json; charset=utf-8');
    // t.is(jsonPreferred.payload, JSON.stringify({
    //     statusCode : 500,
    //     error      : 'Internal Server Error',
    //     message    : 'An internal server error occurred'
    // }));
});

test('ignores non-errors', async (t) => {
    const server = await makeServer({
        route : makeRoute({
            handler() {
                return 'must succeed';
            }
        })
    });
    const response = await sendRequest(server);

    t.is(response.statusCode, 200);
    t.is(response.headers['content-type'], 'text/html; charset=utf-8');
    t.is(response.payload, 'must succeed');
});
