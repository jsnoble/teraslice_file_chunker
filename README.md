# Processor - teraslice_file_chunker

```
npm install terascope/teraslice_file_chunker
```

# Description

This processor is used to take an incoming arrary of data and split it into reasonably sized chunks for storage by another module. It was primarily intended for use with `teraslice_hdfs_append` and can be used to write files to a single directory or with timeseries spread writes across directories by date.


# Expected Inputs

An array of JSON format records.

# Output

The output of the processor is an array of records that map a chunk of data to a file. There may be multiple chunks going to the same file and there may be chunks going to many different files.

```
[
  {
     filename: '/path/to/file',
     data: 'data records serialized and separated by newlines.'
  }
]
```

# Parameters

| Name | Description | Default | Required |
| ---- | ----------- | ------- | -------- |
| timeseries | Set to an interval to have directories named using a date field from the data records. Options: ['daily', 'monthly', 'yearly', null] |  | N |
| date_field | Which field in each data record contains the date to use for timeseries. Only used if "timeseries" is also specified. | date | N |
| directory | Path to use when generating the file name. | / | N |
| filename | Filename to use. This is optional and is not recommended if the target is HDFS. If not specified a filename will be automatically chosen to reduce the occurence of concurrency issues when writing to HDFS. |  | N |
| chunk_size | Size of the data chunks. Specified in bytes. A new chunk will be created when this size is surpassed. | 50000 | N |

# Job configuration example

This just generates some random sample data and puts it into a directory in HDFS.

```
{
  "name": "Data Generator",
  "lifecycle": "persistent",
  "workers": 1,
  "operations": [
    {
      "_op": "elasticsearch_data_generator",
      "size": 5000
    },
    {
      "_op": "teraslice_file_chunker",
      "timeseries": "monthly",
      "date_field": "created",
      "directory": "/test/directory"
    },
    {
      "_op": "teraslice_hdfs_append"
    }
  ]
}
```

# Notes

Current implementation assumes incoming data is an array of JSON records so building the output data chunk consists of serializing the JSON and then joining records together with newlines.
