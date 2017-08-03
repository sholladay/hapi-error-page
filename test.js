import path from 'path';
import test from 'ava';
import { Server } from 'hapi';
import vision from 'vision';
import handlebars from 'handlebars';
import errorPage from '.';

const mockRoute = (option) => {
    return Object.assign(
        {
            method : 'GET',
            path   : '/',
            handler(request, reply) {
                reply(new Error('my gosh'));
            }
        },
        option
    );
};

const mockServer = async (option) => {
    const { plugin, route } = Object.assign(
        {
            plugin : [vision, errorPage],
            route  : mockRoute()
        },
        option
    );
    const server = new Server();
    server.connection();
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

const mockRequest = (server, option) => {
    return server.inject(Object.assign(
        {
            method : 'GET',
            url    : '/'
        },
        option
    ));
};

test('baseline without errorPage', async (t) => {
    const server = await mockServer({
        plugin : null
    });
    const response = await mockRequest(server);

    t.is(response.statusCode, 500);
    t.is(response.payload, JSON.stringify({
        statusCode : 500,
        error      : 'Internal Server Error',
        message    : 'An internal server error occurred'
    }));
});

test('throws without vision', async (t) => {
    const server = await mockServer({
        plugin : [errorPage]
    });
    const err = await t.throws(server.start());

    t.true(err.message.startsWith('Plugin hapi-error-page missing dependency vision'));
});

test('renders error to view', async (t) => {
    const server = await mockServer();
    const response = await mockRequest(server);

    t.is(response.statusCode, 500);
    t.is(response.payload, [
        '<p>Title: Internal Server Error</p>',
        '<p>Status code: 500</p>',
        '<p>Message: An internal server error occurred.</p>'
    ].join('\n') + '\n');
});

test('ignores non-errors', async (t) => {
    const server = await mockServer({
        route : mockRoute({
            handler(request, reply) {
                reply('must succeed');
            }
        })
    });
    const response = await mockRequest(server);

    t.is(response.statusCode, 200);
    t.is(response.payload, 'must succeed');
});
