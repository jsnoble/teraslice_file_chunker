# teraslice_file_chunker

This processor is used to take an incoming arrary of data and split it into reasonably sized chunks for storage by another module. It was primarily intended for use with `teraslice_hdfs_append` and can be used to write files to a single directory or with timeseries spread writes across directories by date.

The output of the processor is an array of records that map a chunk of data to a file. There may be multiple chunks going to the same file and there may be chunks going to many different files.

```
[
  {
     filename: '/path/to/file',
     data: 'data records serialized and separated by newlines.'
  }
]
```

Current implementation assumes incoming data is an array of JSON records so building the output data chunk consists of serializing the JSON and then joining records together with newlines.

Example Job:

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