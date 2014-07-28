utfate
======

Fast and safe javascript utf-8 encoder and decoder.

Encoder is faster than a naive (unsafe) implementation (the `encodeSimple`
method in the encoding jsperf) even though it checks the source string for
validity. It is about half the speed of the native TextEncoder (on Firefox).

Decoder is only a little slower than a naive (unsafe) implementation, but
detects and rejects invalid utf-8 byte sequences. It is about a third of the
speed of the native TextEncoder (on Firefox).

* [Encoding jsperf](http://jsperf.com/utf8-encoding-methods/2)
* [Decoding jsperf](http://jsperf.com/utf8-decoding-methods/2)

Todo:
-----

* TextEncoder API
* Jsperf comparing this with
  [the TextEncoder shim](https://github.com/inexorabletash/text-encoding).
* Tests for error conditions.
