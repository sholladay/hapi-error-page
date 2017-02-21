import path from 'path';
import test from 'ava';
import { Server } from 'hapi';
import handlebars from 'handlebars';
import vision from 'vision';
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
    if (route) {
        server.route(route);
    }
    await server.start();
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

test('without errorPage', async (t) => {
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

    await server.stop();
});

test('throws without vision', async (t) => {
    const err = await t.throws(mockServer({
        plugin : [errorPage]
    }));

    t.true(err.message.startsWith('Plugin hapi-error-page missing dependency vision'));
});

test('errorPage basics', async (t) => {
    const server = await mockServer();
    server.views({
        engines    : {
            html : handlebars
        },
        relativeTo : path.join(__dirname, 'fixture'),
        path       : './'
    });
    const response = await mockRequest(server);

    t.is(response.statusCode, 500);
    t.is(response.payload, [
        'Title: Internal Server Error',
        'Status code: 500',
        'Message: An internal server error occurred.'
    ].map((str) => {
        return '<p>' + str + '</p>';
    }).join('\n') + '\n');

    await server.stop();
});
