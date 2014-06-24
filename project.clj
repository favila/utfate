(defproject favila/utfate "0.1.0-SNAPSHOT"
  :description "Fast javascript utf-8 encoder and decoder."
  :url "http://github.com/favila/utfate"
  :dependencies [[org.clojure/clojure "1.5.1"]
                 [org.clojure/clojurescript "0.0-2234"]]
  :source-paths ["src" "test"]
  :profiles
  {:dev
   {:plugins [[lein-cljsbuild "1.0.3"]]
    :hooks [leiningen.cljsbuild]
    :cljsbuild
    {:test-commands {"test" ["/Users/favila/js-vms/v8/d8" "target/test/utfate_test.js"]}
     :builds
     {"test"
      {:source-paths ["src" "test"]
       :compiler {:output-to "target/test/utfate_test.js"
                  :optimizations :whitespace
                  :static-fns true}}}}}}
;  :cljsbuild
;  {:builds
;   {"release"
;    {:source-paths ["src"]
;     :compiler {:closure-defines {:goog.DEBUG false}
;                :output-to "target/release/utfate.js"
;                :source-map "target/release/utfate.map.js"
;                :optimizations :advanced}}}}
  )
