(ns utfate.test.macros
  (:require [cljs.tagged-literals :as tl])
  (:import [java.nio.charset StandardCharsets]))


(defmacro str->UTF8 [sym]
  (let [s ^String (if (string? sym) sym (resolve sym))]
    (assert (string? s))
    `(js/Uint8Array. ~(tl/read-js (into (vector-of :int)
                                        (.getBytes s StandardCharsets/UTF_8))))))


;;; File from http://www.cl.cam.ac.uk/~mgk25/ucs/examples/UTF-8-demo.txt
(let [s (slurp "test-resources/UTF-8-demo.txt" :encoding "UTF-8")]
  (defmacro utf-8-demo-str []
    s)
  (defmacro utf-8-demo-bytes []
    `(js/Uint8Array. ~(tl/read-js (into (vector-of :int)
                                        (.getBytes s StandardCharsets/UTF_8))))))
