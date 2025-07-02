// Privacy Protector Plugin

(() => {
  const pluginName = "Privacy Protector";

  // Log helper
  const log = (...args) => console.log(`[${pluginName}]`, ...args);

  // Block geolocation API
  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition = function(success, error) {
      log("Blocked getCurrentPosition");
      if (typeof error === "function") {
        error({ code: 1, message: "User denied Geolocation" });
      }
    };
    navigator.geolocation.watchPosition = function() {
      log("Blocked watchPosition");
      return -1;
    };
  }

  // Patch fetch to block user info / telemetry requests
  const originalFetch = window.fetch;
  window.fetch = function(resource, options) {
    const url = typeof resource === "string" ? resource : resource.url;
    if (url && url.includes("discord.com/api/v9/users/@me")) {
      log("Blocked user info fetch:", url);
      // Return empty user info
      return Promise.resolve(new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }));
    }
    if (url && (url.includes("track") || url.includes("telemetry") || url.includes("report"))) {
      log("Blocked telemetry fetch:", url);
      return Promise.resolve(new Response(null, { status: 204 }));
    }
    return originalFetch.apply(this, arguments);
  };

  // Patch XMLHttpRequest to block sensitive sends
  const origXHROpen = XMLHttpRequest.prototype.open;
  const origXHRSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function(method, url) {
    this._url = url;
    return origXHROpen.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function(body) {
    if (this._url && (this._url.includes("track") || this._url.includes("telemetry") || this._url.includes("report") || this._url.includes("discord.com/api/v9/users/@me"))) {
      log("Blocked sensitive XHR send to:", this._url);
      return; // Do not send the request
    }
    return origXHRSend.apply(this, arguments);
  };

  // Disable event listeners for common tracking events
  const originalAddEventListener = window.addEventListener;
  window.addEventListener = function(type, listener, options) {
    const blockedEvents = [
      "mousemove",
      "keydown",
      "click",
      "mousedown",
      "mouseup",
      "wheel",
      "touchstart",
      "touchend"
    ];
    if (blockedEvents.includes(type)) {
      log(`Blocked adding listener for event: ${type}`);
      return;
    }
    return originalAddEventListener.call(this, type, listener, options);
  };

  // Patch console.log to avoid telemetry via logs (optional)
  const originalConsoleLog = console.log;
  console.log = function(...args) {
    const blockedTerms = ["telemetry", "track", "event", "report"];
    if (args.some(arg => typeof arg === "string" && blockedTerms.some(term => arg.toLowerCase().includes(term)))) {
      // Block logs containing spying keywords
      return;
    }
    return originalConsoleLog.apply(console, args);
  };

  // Prevent Sentry init if present
  if (window.Sentry) {
    window.Sentry.init = function() {
      log("Blocked Sentry.init");
      return;
    };
  }

  log("Privacy Protector loaded and active.");
})();
