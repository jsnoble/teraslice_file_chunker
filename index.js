'use strict';

/*
 * file_chunker takes an incoming stream of records and prepares them for
 * writing to a file. This is largely intended for sending data to HDFS
 * but could be used for other tasks.
 *
 * The data is collected into chunks based on 'chunk_size' and is serialized
 * to a string.
 *
 * The result of this operation is an array of objects mapping chunks to file
 * names. There can be multiple chunks for the same filename.
 * [
 *   { filename: '/path/to/file', data: 'the data'}
 * ]
 */

var _ = require('lodash');

function newProcessor(context, opConfig, jobConfig) {
    var config = context.sysconfig;
    var opConfig = opConfig;
    var logger = jobConfig.logger;

    return function(data) {
        var buckets = {};
        var currentBucket

        var chunks = [];

        // First we need to group the data into reasonably sized chunks as
        // specified by opConfig.chunk_size
        for (var i = 0; i < data.length; i++) {
            var record = data[i];
            var incomingDate = formattedDate(record, opConfig);
            
            if (!buckets.hasOwnProperty(incomingDate)) {
                buckets[incomingDate] = [];
            }

            currentBucket = buckets[incomingDate];
            currentBucket.push(JSON.stringify(record));

            if (currentBucket.length >= opConfig.chunk_size) {
                chunks.push({
                    data: currentBucket.join('\n'),
                    filename: getFileName(incomingDate, opConfig, config)
                });

                buckets[incomingDate] = currentBucket = [];
            }
        }

        // Handle any lingering chunks.
        _.forOwn(buckets, function(bucket, key) {
            if (bucket.length > 0) {
                chunks.push({
                    data: bucket,
                    filename: getFileName(key, opConfig, config)
                });
            }
        });

        return chunks;
    }
}

function formattedDate(record, opConfig) {
    var offsets = {
        "daily": 10,
        "monthly": 7,
        "yearly": 4
    };

    var end = offsets[opConfig.timeseries] || 10;
    var date = new Date(record[opConfig.date_field]).toISOString().slice(0, end);

    return date.replace(/-/gi, '.');
}

function getFileName(date, opConfig, config) {
    var directory = opConfig.directory;
    if (date) {
        directory = opConfig.directory + '-' + date;
    }

    // If filename is specified we default to this
    var filename = directory + '/' + config._nodeName;

    if (opConfig.filename) {
        filename = directory + '/' + opConfig.filename;
    }

    return filename;
}

function schema() {
    return {
        timeseries: {
            doc: 'Set to an interval to have directories named using a date field from the data records.',
            default: null,
            format: ['daily', 'monthly', 'yearly', null]
        },
        date_field: {
            doc: 'Which field in each data record contains the date to use for timeseries. Only useful if "timeseries" is also specified.',
            default: 'date',
            format: String
        },
        directory: {
            doc: 'Path to use when generating the file name. Default: /',
            default: '/',
            format: String
        },
        filename: {
            doc: 'Filename to use. This is optional and is not recommended if the target is HDFS. If not specified a filename will be automatically chosen to reduce the occurence of concurrency issues when writing to HDFS.',
            default: '',
            format: 'optional_String'
        },
        chunk_size: {
            doc: 'Size of the data chunks. Specified in bytes. A new chunk will be created when this size is surpassed. Default: 50000',
            default: 50000,
            format: function(val) {
                if (isNaN(val)) {
                    throw new Error('size parameter for elasticsearch_reader must be a number')
                }
                else {
                    if (val <= 0) {
                        throw new Error('size parameter for elasticsearch_reader must be greater than zero')
                    }
                }
            }
        }
    };
}

module.exports = {
    newProcessor: newProcessor,
    schema: schema
};
