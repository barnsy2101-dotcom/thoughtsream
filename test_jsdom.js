const { JSDOM } = require('jsdom');
const options = {
  resources: "usable",
  runScripts: "dangerously",
  url: "http://127.0.0.1:3006/"
};

JSDOM.fromURL("http://127.0.0.1:3006/", options).then(dom => {
  const window = dom.window;
  window.addEventListener("error", (event) => {
    console.error("JSDOM Error Event:", event.error ? event.error.message : event.message);
  });
  console.log("Loading...");
  setTimeout(() => {
    console.log("Body innerHTML length:", window.document.body.innerHTML.length);
    if(window.lastError) {
      console.log("lastError:", window.lastError);
    }
    if(window.myLogs) {
      console.log("myLogs:", window.myLogs);
    }
  }, 3000);
}).catch(err => {
  console.error("Failed to start JSDOM:", err);
});
