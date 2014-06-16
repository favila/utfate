(ns utfate.test.core
  (:require-macros [utfate.test.macros :as m])
  (:require utfate))

(m/def-utf-8-demo-txt)

(def utf-8-demo-utf8
  (m/str->Uint8ArrayUTF8 utf-8-demo-txt))

(defn byte-arrays-equal? [x y]
  (and
    (= (type x) (type y))
    (= (alength x) (alength y))
    (every? true? (map #(= %1 %2) x y)))

(assert (byte-arrays-equal? (utfate/encode utf-8-demo-txt) utf-8-demo-utf8))