/**
 * @fileoverview Functions for encoding and decoding utf8
 */
goog.provide('utfate');


/**
 * String.fromCodePoint
 * @param {number} cp
 * @return {string}
 */
utfate.SFCP = String['fromCodePoint'] ||
    function (cp) {
      if (cp < 0x10000) {
        return String.fromCharCode(cp);
      } else {
        cp -= 0x10000
        return String.fromCharCode(0xD800 | (cp >> 10), 0xDC00 | (cp & 0x3FF));
      }
    };

/**
 * @param {number} index
 * @param {number} bytes
 * @param {number=} opt_needed
 */
utfate.throwDecodeError = function(index, bytes, opt_needed) {
  var errormsg = 'Invalid UTF8 byte(s) 0x' + bytes.toString(16) +
                 ' at index ' + index;
  if (opt_needed) {
    errormsg += ': need ' + (opt_needed - 1) + ' more bytes.';
  } else {
    errormsg += '.';
  }
  throw new RangeError(errormsg);
};


/**@enum {number} */
utfate.ENCODINGERRORS = {
  NONE: 0,
  ORPHAN_LSUR: 1,  // Orphaned left (high) surrogate.
  ORPHAN_TSUR: 2,  // Orphaned right (low) surrogate.
  OUTBUF_END: 3    // Not enough room in outbuffer to encode entire string.
};


/** @type {!Array.<number>} */
utfate.UTF8InvalidOffset = [0, 1, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4];


/** @type {!Array.<number>} */
utfate.UTF8OverlongMinimum = [0, 0x80, 0x800, 0x10000];


/** @type {!Array.<number>} */
utfate.UTF8MagicSubtraction = [0, 0x00003080, 0x000E2080, 0x03C82080];


/**
 * @param {number} c
 * @param {number} lo
 * @param {number} hi
 * @return {boolean}
 */
utfate.inRange = function(c,  lo,  hi) { return ((lo <= c) && (c <= hi)); };


/**
 * @param {number} c
 * @return {boolean}
 */
utfate.isSurrogate = function(c) { return utfate.inRange(c, 0xd800, 0xdfff); };


/**
 * @param {number} c
 * @return {boolean}
 */
utfate.isNoncharacter = function(c) {
  return utfate.inRange(c, 0xfdd0, 0xfdef);
};


/**
 * @param {number} c
 * @return {boolean}
 */
utfate.isReserved = function(c) { return ((c & 0xfffe) === 0xfffe); };


/**
 * @param {number} c
 * @return {boolean}
 */
utfate.isOutOfRange = function(c) { return (c > 0x10ffff); };


/**
 * @param {number} c
 * @return {number}
 */
utfate.UTF8TailLen = function(c) {
  switch (c >> 4) {
    case 12: case 13:
      return 1;
    case 14:
      return 2;
    case 15:
      // If 4th bit unset: 3; else error;
      return (c & 0x8) ? -1 : 3;
    default:
      return -1;
  }
};


/**
 * @param {number} c
 * @return {number}
 */
utfate.UTF8InvalidTailBits = function(c) {
  return ((c >> 6) !== 2) | 0;
};


// Many tricks taken from http://floodyberry.wordpress.com/2007/04/14/utf-8-conversion-tricks/
/**
 * Decode UTF-8 bytes to a string.
 *
 * @param {!Uint8Array} ib
 * @param {number=} opt_start
 * @param {number=} opt_end
 * @return {string}
 */
utfate.decode = function(ib, opt_start, opt_end) {
  var i = opt_start | 0, end = (opt_end || ib.length) | 0,
      ibi = 0, tail = 0, c = 0, mask = 0,
      out = '';

  while (i < end) {
    ibi = ib[i];
    // Fast-path for ascii.
    // Bulk-decoding (with String.fromCharCode.apply) is slower for typed arrays
    // than char-at-a-time.
    // Cost seems to be the apply plus the typed array.
    if (ibi < 0x80) {
      out += String.fromCharCode(ibi);
      ++i;
      continue;
    }

    tail = utfate.UTF8TailLen(ibi);

    if (tail >= end - i) {
      utfate.throwDecodeError(i, ibi, tail);
    }

    mask = 0, c = ibi;
    switch (tail) {
      case 3:
        ibi = ib[++i];
        c = ((c << 6) + ibi) | 0;
        mask = utfate.UTF8InvalidTailBits(ibi);
      case 2:
        ibi = ib[++i];
        c = ((c << 6) + ibi) | 0;
        mask = (mask << 1) | utfate.UTF8InvalidTailBits(ibi);
      case 1:
        ibi = ib[++i];
        c = ((c << 6) + ibi) | 0;
        mask = (mask << 1) | utfate.UTF8InvalidTailBits(ibi);
      case 0:
        ++i;
        break;
      case -1:
        utfate.throwDecodeError(i, c);
        break;
    }

    if (mask) {
      utfate.throwDecodeError(i - utfate.UTF8InvalidOffset[mask],
          ib[i - utfate.UTF8InvalidOffset[mask]]);
    }

    c -= utfate.UTF8MagicSubtraction[tail];
    if (c < utfate.UTF8OverlongMinimum[tail] || utfate.isSurrogate(c) ||
        utfate.isNoncharacter(c) || utfate.isReserved(c) ||
        utfate.isOutOfRange(c)) {
      utfate.throwDecodeError(i - tail, ib[i - tail]);
    }

    if (tail === 3) {
      c -= 0x10000;
      out += String.fromCharCode(0xD800 | (c >> 10), 0xDC00 | (c & 0x3FF));
    } else {
      out += String.fromCharCode(c);
    }
  }
  return out;
};


/**
 * @type {number}
 * @const
 */
utfate.UTF8_ACCEPT = 0;

/**
 * @type {number}
 * @const
 */
utfate.UTF8_REJECT = 12;

// Decoding table and automaton decode method from:
// http://bjoern.hoehrmann.de/utf-8/decoder/dfa/
/**
 * @type {!Int8Array}
 * @const
 */
utfate.DECODE_TABLE = new Int8Array(
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,  0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
     0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,  0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
     0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,  0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
     0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,  0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
     1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,  9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,
     7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,  7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,
     8,8,2,2,2,2,2,2,2,2,2,2,2,2,2,2,  2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,
     10,3,3,3,3,3,3,3,3,3,3,3,3,4,3,3, 11,6,6,6,5,8,8,8,8,8,8,8,8,8,8,8,
     // The second part is a transition table that maps a combination
     // of a state of the automaton and a character class to a state.
     0,12,24,36,60,96,84,12,12,12,48,72, 12,12,12,12,12,12,12,12,12,12,12,12,
     12, 0,12,12,12,12,12, 0,12, 0,12,12, 12,24,12,12,12,12,12,24,12,24,12,12,
     12,12,12,12,12,12,12,24,12,12,12,12, 12,24,12,12,12,12,12,12,12,24,12,12,
     12,12,12,12,12,12,12,36,12,36,12,12, 12,36,12,12,12,12,12,36,12,36,12,12,
     12,36,12,12,12,12,12,12,12,12,12,12]);

/**
 * Decode UTF-8 bytes to a string.
 *
 * @param {!Uint8Array} ib
 * @param {number=} opt_start
 * @param {number=} opt_end
 * @return {string}
 */
utfate.decodeBH = function(ib, opt_start, opt_end) {
  var i = opt_start || 0,
      end = opt_end || ib.length,
      state = utfate.UTF8_ACCEPT,
      codep = 0, out = '';

  while (i < end) {
    var byte_ = ib[i], type = utfate.DECODE_TABLE[byte_];
    switch (state) {
      case utfate.UTF8_ACCEPT:
        codep = (0xff >> type) & (byte_);
        break;
      case utfate.UTF8_REJECT:
        utfate.throwDecodeError(i, byte_);
        break;
      default:
        codep = (byte_ & 0x3f) | (codep << 6);
        break;
    }
    state = utfate.DECODE_TABLE[256 + state + type];
    if (state === utfate.UTF8_ACCEPT) {
      out += utfate.SFCP(codep);
    }
    ++i;
  }
  return out;
};


/** @typedef {{chars:number,bytes:number,error:utfate.ENCODINGERRORS}} */
utfate.EncodeResult;


/**
 * @param {number} chars
 * @param {number} bytes
 * @param {utfate.ENCODINGERRORS} error
 * @return {utfate.EncodeResult}
 */
utfate.encodeResult = function(chars, bytes, error) {
  return {'chars': chars, 'bytes': bytes, 'error': error};
};


/**
 * Encode a string as UTF8 into supplied byte buffer.
 *
 * @param {string} string
 * @param {!Uint8Array} out
 * @param {number=} opt_startchar
 * @param {number=} opt_endchar
 * @param {number=} opt_startbyte
 * @param {number=} opt_endbyte
 * @return {!utfate.EncodeResult} chars and bytes written
 */
utfate.encodeInto = function(string, out, opt_startchar, opt_endchar,
                              opt_startbyte, opt_endbyte) {
  var i = opt_startchar | 0,
      end = (opt_endchar || string.length) | 0,
      bytei = opt_startbyte | 0,
      byteend = (opt_endbyte || out.length) | 0,
      bytesneeded = 0,
      c = 0, c1 = 0;
  while (i < end) {
    c = string.charCodeAt(i);
    if (c < 0x80) {
      // Ascii fast-path
      if (byteend <= bytei) {
        return utfate.encodeResult(i, bytei, utfate.ENCODINGERRORS.OUTBUF_END);
      }
      out[bytei++] = c;
      ++i;
      continue;
    } else if (c < 0x800) {
      bytesneeded = 2;
    } else if (c < 0xD800) {
      bytesneeded = 3;
    } else if (c < 0xDC00) {
      bytesneeded = 4;
    } else if (c < 0xE000) {
      bytesneeded = 0;
    } else {
      bytesneeded = 3;
    }
    bytei += bytesneeded;
    if (bytei > byteend) {
      return utfate.encodeResult(i, bytei - bytesneeded,
                                 utfate.ENCODINGERRORS.OUTBUF_END);
    }
    switch (bytesneeded) {
      case 4:
        // Convert to UTF32 because we need to add 0x10000 to the code point.
        c1 = string.charCodeAt(++i);
        if ((c1 & 0xFC00) !== 0xDC00) {
          return utfate.encodeResult(i - 1, bytei - bytesneeded,
                                     utfate.ENCODINGERRORS.ORPHAN_LSUR);
        }
        c = ((((c & 0x3FF) << 10) | (c1 & 0x3FF)) + 0x10000) | 0;
        out[--bytei] = 0x80 | (c & 0x3F);
        c >>= 6;
      case 3:
        out[--bytei] = 0x80 | (c & 0x3F);
        c >>= 6;
      case 2:
        out[--bytei] = 0x80 | (c & 0x3F);
        c >>= 6;
      case 1:
        // This does *not* cover ascii case because the shift is wrong!
        // Uint8Array will mask for us.
        out[--bytei] = (0xF00 >> bytesneeded) | c;
        bytei += bytesneeded;
        ++i;
        break;
      case 0:
        return utfate.encodeResult(i, bytei, utfate.ENCODINGERRORS.ORPHAN_TSUR);
    }
  }
  return utfate.encodeResult(i, bytei, utfate.ENCODINGERRORS.NONE);
};


/**
 * Number of bytes of UTF8 needed to encode a character.
 * @param {number} c charCode value of character.
 * @return {number} Number of utf8 bytes needed to encode; 0 if invalid.
 */
utfate.charUTF8ByteLength = function(c) {
  if (c < 0x80) {
    return 1;
  }
  if (c < 0x800) {
    return 2;
  }
  if (c < 0xD800) {
    return 3;
  }
  if (c < 0xDC00) {
    return 4;
  }
  if (c < 0xE000) {
    return 0;
  }
  return 3;
};


/**
 * Number of bytes of UTF8 needed to encode a string.
 * Does not check string for validity. May overestimate required number of
 * bytes if string is invalid.
 *
 * @param {string} s
 * @return {number} Number of utf8 bytes needed to encode string fully.
 */
utfate.byteLength = function(s) {
  var i = 0, slen = s.length, nbytes = 0;
  while (i < slen) {
    nbytes += utfate.charUTF8ByteLength(s.charCodeAt(i));
    ++i;
  }
  return nbytes;
};

/**
 * @param {number} index
 */
utfate.throwEncodeError = function(index) {
  throw new Error('Cannot encode: invalid UTF-16 in input string near ' +
                  'string index ' + index);
};

/**
 * Encode string fully into a new Uint8Array as UTF8.
 * May throw an Error if string is invalid UTF-16 and cannot be encoded.
 * Use encode-into if you want to partially encode or want to provide an out
 * buffer.
 *
 * @param {string} s
 * @return {!Uint8Array} string encoded in UTF8.
 */
utfate.encode = function(s) {
  var out = new Uint8Array(utfate.byteLength(s)),
      result = utfate.encodeInto(s, out);
  if (result['error']) {
    utfate.throwEncodeError(result['chars']);
  }
  return out;
};


/**
 * Encode string fully into a new Uint8Array as UTF8.
 * May throw an Error if string is invalid UTF-16 and cannot be encoded.
 * Use encode-into if you want to partially encode or want to provide an out
 * buffer.
 *
 * @param {string} s
 * @return {!Uint8Array} string encoded in UTF8.
 */
utfate.encode1Pass = function(s) {
  // One utf-16 char can never produce more than 3 utf-8 bytes, so we allocate a
  // buffer three times the string length so we know we'll have enough.
  var maxblen = s.length * 3,
      out = new Uint8Array(maxblen),
      result = utfate.encodeInto(s, out);
  if (result['error']) {
    utfate.throwEncodeError(result['chars']);
  }
  if (result['bytes'] < maxblen) {
    return new Uint8Array(out.buffer.slice(0, result['bytes']));
  } else {
    return out;
  }
};


/**
 * @param {string} s
 * @return {!Uint8Array}
 */
utfate.encodeSimple = function(s) {
  var out = new Uint8Array(utfate.byteLength(s)),
  p = 0, slen = s.length;
  for (var i = 0; i < slen; ++i) {
    var c = s.charCodeAt(i);
    if (c < 128) {
      out[p++] = c;
    } else if (c < 2048) {
      out[p++] = (c >> 6) | 192;
      out[p++] = (c & 63) | 128;
    } else {
      out[p++] = (c >> 12) | 224;
      out[p++] = ((c >> 6) & 63) | 128;
      out[p++] = (c & 63) | 128;
    }
  }
  return out;
};

/**
 * Converts a UTF-8 byte array to JavaScript's 16-bit Unicode.
 * @param {Uint8Array|Int8Array|Array.<number>} bytes UTF-8 byte array.
 * @return {string} 16-bit Unicode string.
 */
utfate.decodeSimple = function(bytes) {
  var out = '', pos = 0, blen = bytes.length;
  while (pos < blen) {
    var c1 = bytes[pos++];
    if (c1 < 128) {
      out += String.fromCharCode(c1);
    } else if (c1 > 191 && c1 < 224) {
      var c2 = bytes[pos++];
      out += String.fromCharCode((c1 & 31) << 6 | c2 & 63);
    } else {
      var c2 = bytes[pos++];
      var c3 = bytes[pos++];
      out += String.fromCharCode((c1 & 15) << 12 | (c2 & 63) << 6 | c3 & 63);
    }
  }
  return out;
};
