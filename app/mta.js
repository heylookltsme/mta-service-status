'use strict';

const _ = require('lodash');
const fs = require('fs');
const util = require('util');
const request = require('request');
const cheerio = require('cheerio');

const cachedData = '/.cache/status.json';
const ttl = 60*5*1000; // 5 minutes in ms

const mtaStatusUrl = 'http://service.mta.info/ServiceStatus/status.html';

/**
 * Checks the status of MTA services. (only subway rn.) First checks a local
 * cache of the data. Fetches the status via html scraping, if cache expired or
 * unavailable.
 *
 * @return Promse - A promise that resolves with an MTA status object.
 */
function checkStatus() {
    return new Promise((resolve, reject) => {
        getStatusFromCache()
            .then(function(data) {
                resolve(data);
            })
            .catch(function(err) {
                resolve(scrapeStatus());
            });
    });
}

/**
 * Gets the subway status from the cache, if possible.
 *
 * @return Promise - A promise that resolves with data or rejects if there's no
 *                   valid cache.
 */
function getStatusFromCache() {
   return new Promise((resolve, reject) => {
        fs.stat(__dirname + cachedData, (err, stats) => {
            if (err) {
                reject(err);
            } else {
                // Make sure the cache is funky fresh.
                let mtime = new Date(util.inspect(stats.mtime));
                let now = new Date().getTime();

                if ((now - ttl) > mtime.getTime()) {
                    fs.unlink(__dirname + cachedData);
                    reject('Cache is too old');
                } else {
                    fs.readFile(__dirname + cachedData, (err, data) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(JSON.parse(data));
                        }
                    });
                }
            }
        });
    });
}

/**
 * Scrapes the MTA's status page for the subway status. HTML scraping! What fun!
 * Also caches the data in a local file.
 *
 * @todo: scrape statuses for services other than the subway
 *
 * @return Promise - A promise that resolves with a subway status object.
 */
function scrapeStatus() {
    return new Promise((resolve, reject) => {
        request(mtaStatusUrl, (err, response, responseHtml) => {
            if (err) {
                reject(err);
            }

            const $ = cheerio.load(responseHtml);

            let results = {
                subway: []
            };

            $('#subwayDiv').find('tr').each((index, row) => {
                // First row is irrelevant.
                if (index !== 0) {

                    results.subway.push({
                        name: $(row).find('img').attr('alt').replace(/subway|\s/ig, ''),
                        status: $(row).find('span[class^="subway_"]').text(),
                    });
                }
            });

            // Write to the local cache.
            fs.writeFile(__dirname + cachedData, JSON.stringify(results), (err) => {
                // @todo: handle error
            });

            resolve(results);
        });
    });
}

/**
 * Filters the status data by MTA service and line. Both are optional, but to
 * filter by line, you must also specify a service.
 *
 * @param {Object} data - The MTA status data.
 * @param {string} options.service - The service name.
 * @param {string} options.line - The line name.
 * @return {Object|Array} The filtered data.
 */
function filterData(data, options) {
    if (options.service) {
        data = _.get(data, options.service);

        if (options.line) {
            data = _.find(data, {name: options.line});
        }
    }
    return data;
};

/**
 *
 * @todo: add default parameters once i can move from node 4.1
 */
const getStatus = function(options) {
    options || (options = {});

    return new Promise((resolve, reject) => {
        checkStatus()
            .then((data) => {
                data = filterData(data, options);

                if (!_.isUndefined(data)) {
                    resolve(data);
                } else {
                    reject('No data for those options'); // @todo: it'd be nice to be more specific
                }
            })
            .then((data) => {
                resolve(data);
            })
            .catch((err) => {
                reject(err);
            });
    });
};

module.exports = {
    get: getStatus
};

