(ns utfate.test.core
  (:require-macros [utfate.test.macros :as m])
  (:require utfate))

(def utf8-str (m/utf-8-demo-str))
(def utf8-bytes (m/utf-8-demo-bytes))

(defn byte-arrays-equal? [x y]
  (and
    (instance? js/Uint8Array x)
    (instance? js/Uint8Array y)
    (= (alength x) (alength y))
    (every? true? (map #(= (aget x %) (aget y %)) (range (alength x))))))

(assert (byte-arrays-equal? (utfate/encode utf8-str) utf8-bytes))

(assert (= (utfate/decode utf8-bytes) utf8-str))

;; TODO: Need tests for the following error conditions:
;; Encoding: orphaned surrogates, too-small out buffer.
;; Decoding: overlong encodings, invalid bytes, missing tail bytes,
;;           unexpected tail, 4+ byte sequences (U+10FFFF and above).
