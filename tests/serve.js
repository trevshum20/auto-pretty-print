// Optional manual fixtures. Node's standard library only; no npm install.
const http = require("node:http");

const sample = {
  name: "Naruto",
  team: { number: 7, members: ["Naruto", "Sasuke", "Sakura"] },
  active: true,
  retired: false,
  score: -12.5,
  missing: null,
  escaped: 'Quotes: " Backslash: \\ Newline: \n Unicode: 雪 😀',
  unsafe: '</pre><script>alert("executed")</script><img src="/unexpected" onerror="alert(1)">'
};
const json = value => JSON.stringify(value);
const fixtures = {
  "/object": ["application/json", json(sample)],
  "/array": ["application/json", json([1, "two", { nested: [true, false, null] }])],
  "/folding": ["application/json", json({
    emptyObject: {}, emptyArray: [],
    nested: [{ child: { value: 1 } }, [2, 3]],
    bracketsInStrings: '[not an array] {not an object} "escaped quotes"'
  })],
  "/string": ["application/json", json("hello <b>world</b>")],
  "/number": ["application/json", "-12.5e3"],
  "/boolean": ["application/json", "true"],
  "/null": ["application/json", "null"],
  "/problem": ["application/problem+json", '{"status":400,"detail":"Bad request"}'],
  "/vendor": ["application/vnd.api+json; charset=utf-8", json(sample)],
  "/invalid": ["application/json", '{"broken":}'],
  "/empty": ["application/json", ""],
  "/plain": ["text/plain", json(sample)],
  "/xml": ["application/xml", '<root>{"value":1}</root>'],
  "/html": ["text/html", '<!doctype html><title>HTML fixture</title><pre>{"keep":"compact"}</pre><script>document.title = "Application still works";</script>'],
  "/long": ["application/json", json({
    long: "x".repeat(12000),
    rows: Array.from({ length: 3000 }, (_, i) => ({ i, active: true }))
  })]
};

const server = http.createServer((request, response) => {
  console.log(request.method, request.url);
  const fixture = fixtures[request.url];
  response.writeHead(fixture || request.url === "/" ? 200 : 404, {
    "Content-Type": fixture ? fixture[0] : "text/plain; charset=utf-8"
  });
  response.end(fixture ? fixture[1] : request.url === "/"
    ? "Open one of these paths in your browser:\n" + Object.keys(fixtures).join("\n")
    : "Not found");
});
server.listen(Number(process.argv[2] || 8080), "127.0.0.1", () => {
  console.log(`JSON fixtures: http://127.0.0.1:${server.address().port}/ (Ctrl+C to stop)`);
});
