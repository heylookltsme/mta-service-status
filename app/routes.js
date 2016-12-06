const routes = require('express').Router();
const mtaStatus = require('./mta');

/**
 * Return MTA status records. Examples of acceptable routes:
 *
 * GET /status            : Returns full status records.
 * GET /status/subway     : Returns status for subway only.
 * GET /status/subway/123 : Returns status for 123 subway line only.
 */
routes.get('/status/:service?/:line?', (req,res) => {
    mtaStatus.get(req.params)
        .then((data) => {
            res.status(200).json(data);
        })
        .catch((err) => {
            res.status(400).json(err); // @todo: more nuanced error status codes would be nice
        });
});

module.exports = routes;
