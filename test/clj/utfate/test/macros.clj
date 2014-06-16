(ns utfate.test.macros
  (:reqire [cljs.tagged-literals])
  (:import [cljs.tagged_literals JSValue]
           [java.nio.charset.StandardCharsets UTF_8]))

(defmacro str->Uint8ArrayUTF8 [^String s]
  `(js/Uint8Array. ~(JSValue. (into (vector-of :int) (.getBytes s UTF_8)))))

(defmacro def-utf-8-demo-txt []
  `(def utf-8-demo-txt
     "UTF8 test from http://www.cl.cam.ac.uk/~mgk25/ucs/examples/UTF-8-demo.txt"
     ~(slurp "http://www.cl.cam.ac.uk/~mgk25/ucs/examples/UTF-8-demo.txt"
             :encoding "UTF-8")))

