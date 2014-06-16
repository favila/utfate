(defproject favila/utfate "0.1.0-SNAPSHOT"
  :description "Fast javascript utf-8 encoder and decoder."
  :url "http://github.com/favila/utfate"
  :dependencies [[org.clojure/clojure "1.5.1"]
                 [org.clojure/clojurescript "0.0-2234"]]
  :profiles {:dev {:plugins [[com.cemerick/austin "0.1.3"]
                             [lein-cljsbuild "1.0.3"]]}
             :hooks [leiningen.cljsbuild]}
  :cljsbuild { 
    :builds {
      "main" {
        :source-paths ["src/js" "src/clj" "src/cljs"]
        :compiler {:closure-defines {:goog.DEBUG false}
                   :output-to "target/main/utfate.js"
                   :source-map "target/main/utfate.map.js"
                   :optimizations :advanced}}}})
