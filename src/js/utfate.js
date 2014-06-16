/**
 * @fileoverview Functions for encoding and decoding utf8
 */
goog.provide('utfate');


goog.scope(function() {


/** String.fromCharCode alias. */
utfate.SFCC = String.fromCharCode;


/**
 *  A String.fromCharCode whose input is an array.
 *  @param {!Uint8Array} ascii bytes only!
 *  @return {string}
 */
utfate.SFCCA = /** @type {function(!Uint8Array): string} */
    (Function.prototype.apply.bind(String.fromCharCode, null));


/**
 * @param {string} errormsg
 */
utfate.throwRangeError = function(errormsg) {
  throw new RangeError(errormsg);
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
utfate.UTF8InvalidTailBits = [1, 1, 0, 1];


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
utfate.inRange = function(c,  lo,  hi) { return ((c - lo) < (hi - lo + 1)); };


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
utfate.isReserved = function(c) { return ((c & 0xfffe) == 0xfffe); };


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


//BROKEN
// Test with http://www.cl.cam.ac.uk/~mgk25/ucs/examples/UTF-8-demo.txt
// http://floodyberry.wordpress.com/2007/04/14/utf-8-conversion-tricks/
/**
 * Decode UTF-8 bytes to a string.
 *
 * @param {!Uint8Array} ib
 * @param {number=} opt_start
 * @param {number=} opt_end
 * @return {string}
 */
utfate.decode = function(ib, opt_start, opt_end) {
  var i = opt_start || 0, end = opt_end || ib.length,
      ibi = 0, tail = 0,
      ascii_start = i, c = 0, mask = 0,
      out = '';

  while (i < end) {
    ibi = ib[i];
    // Fast-path for ascii. Will decode in bulk.
    if (ibi < 0x80) {
      ++i;
      continue;
    }

    if (ascii_start < i) {
      out += utfate.SFCCA(ib.subarray(ascii_start, i));
    }
    ascii_start = i;

    tail = utfate.UTF8TailLen(ibi);
    if (tail >= end - i) {
      utfate.throwDecodeError(i, ibi, tail);
    }

    mask = 0;
    switch (tail) {
      case 3:
        c = (c + ibi) << 6;
        ibi = ib[++i];
        // same as (mask << 1) | utfate.UTF8InvalidTailBits[ibi >> 6];
        mask = (mask << 1) | ((0xb >> (ibi >> 6)) & 1);
      case 2:
        c = (c + ibi) << 6;
        ibi = ib[++i];
        mask = (mask << 1) | ((0xb >> (ibi >> 6)) & 1);
      case 1:
        c = (c + ibi) << 6;
        ibi = ib[++i];
        mask = (mask << 1) | ((0xb >> (ibi >> 6)) & 1);
      case 0:
        c += ibi;
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
      out += utfate.SFCC(0xD800 | (c >> 10), 0xDC00 | (c & 0x3FF));
    } else {
      out += utfate.SFCC(c);
    }
  }
  if (ascii_start < i) {
    out += utfate.SFCCA(ib.subarray(ascii_start, i));
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
utfate.encode_result = function(chars, bytes, error) {
  return {'chars': chars, 'bytes': bytes, 'error': error};
};


/**
 * Encode a string as UTF8 in supplied byte buffer.
 *
 * @param {string} string
 * @param {!Uint8Array} out
 * @param {number=} opt_startchar
 * @param {number=} opt_endchar
 * @param {number=} opt_startbyte
 * @param {number=} opt_endbyte
 * @return {!utfate.EncodeResult} chars and bytes written
 */
utfate.encode = function(string, out, opt_startchar, opt_endchar, opt_startbyte, opt_endbyte) {
  var i = opt_startchar || 0,
      end = opt_endchar || string.length,
      bytei = opt_startbyte || 0,
      byteend = opt_endbyte || out.length,
      bytesneeded = 0,
      c = 0, c1 = 0,
      CCA = String.prototype.charCodeAt.bind(string);
  while (i < end) {
    c = CCA(i);
    if (c < 0x80) {
      // Ascii fast-path
      if (byteend <= bytei) {
        return utfate.encode_result(i, bytei, utfate.ENCODINGERRORS.OUTBUF_END);
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
      return utfate.encode_result(i, bytei - bytesneeded,
                                  utfate.ENCODINGERRORS.OUTBUF_END);
    }
    switch (bytesneeded) {
      case 4:
        // Convert to UTF32 because we need to add 0x10000 to the code point.
        c1 = CCA(++i);
        if ((c1 & 0xFC00) !== 0xDC00) {
          return utfate.encode_result(i - 1, bytei - bytesneeded,
                                      utfate.ENCODINGERRORS.ORPHAN_LSUR);
        }
        c = (((c & 0x3FF) << 10) | (c1 & 0x3FF)) + 0x10000;
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
        return utfate.encode_result(i, bytei,
                                    utfate.ENCODINGERRORS.ORPHAN_TSUR);
    }
  }
  return utfate.encode_result(i, bytei, utfate.ENCODINGERRORS.NONE);
};

window['encode'] = utfate.encode;
window['decode'] = utfate.decode;

});  // goog.scope
