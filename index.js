addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});
/**
 * Respond with hello worker text
 * @param {Request} request
 */
var currentUrl = -1;
var temp = 0;
var responseUrls;

var htmlwriter = new HTMLRewriter();

/**
 * Method to obtain an random integer below the given max value
 * @param {*} max 
 */
function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}
/**
 * Method to obtain the URL stored in the cookie, if present
 * @param {*} request
 */
function getCookie(request) {
  var cookies = {};
  if (request.headers && request.headers.get("cookie") != null) {
    request.headers
      .get("cookie")
      .split(";")
      .forEach(function (cookie) {
        var parts = cookie.match(/(.*?)=(.*)$/);
        cookies[parts[1].trim()] = (parts[2] || "").trim();
      });
  }
  return cookies;
}

/**
 * Method to handle the incoming request
 * Load from the cookie or select a new URL
 * @param {*} request
 */
async function handleRequest(request) {
  let reqbody = request.headers.get("cookie");
  let cookies = await getCookie(request);
  if (cookies["variantUrl"] != null) {
    console.log("cookieval : " + cookies["variantUrl"]);
    let page = await fetchUrls(cookies["variantUrl"]);
    return page;
  }

  const url = "https://cfw-takehome.developers.workers.dev/api/variants";
  try {
    const response = await fetch(new Request(url, { method: "GET" }));

    if (response.ok) {
      const responseData = await response.json();
      responseUrls = responseData.variants;
      var cnt = responseUrls.length;
      var currentUrl = getRandomInt(cnt);
      console.log("random int : " + currentUrl);
      let page = await fetchUrls(responseUrls[currentUrl]);
      return page;
    } else {
      return new Response("Unable to load urls", {
        headers: { "content-type": "text/plain" },
      });
    }
  } catch (ex) {
    return new Response(ex, {
      headers: { "content-type": "text/plain" },
    });
  }
}

/**
 * Class to handle title of webpage
 */
class TitleElementHandler {
  text(text) {
    if (!text.lastInTextNode) text.replace("Modified " + text.text);
  }
}

/**
 * Class to handle <title> element in <header>
 */
class HeadTitleElementHandler {
  text(text) {
    var old = text.text;
    if (!text.lastInTextNode) text.replace("Modified content " + old);
  }
}

/**
 * Class to handle the contents with id = description
 */
class DescriptionElementHandler {
  text(text) {
    var oldtxt = text.text;
    if (!text.lastInTextNode)
      text.replace(oldtxt.replace("variant", "Modified variant"));
  }
}

/**
 * Class to handle the <a> tag elements
 */
class UrlElementHandler {
  element(element) {
    const url = element.getAttribute("href");
    element.setAttribute(
      "href",
      "https://www.linkedin.com/in/vignesh-chivukula/"
    );
  }

  text(text) {
    var old = text.text;
    if (!text.lastInTextNode) text.replace("Click here to view my Profile");
  }
}
/**
 * Method to obtain the contents of given url
 * Handles a failure of given URL and iterates on other URLs to provide 
 * a response to user
 * Enables and sets cookie in response
 * @param {*} url 
 */
async function fetchUrls(url) {
  try {
    const response = await fetch(new Request(url, { method: "GET" }));

    if (response.ok) {
      let modText = await htmlwriter
        .on("title", new TitleElementHandler())
        .on("#title", new HeadTitleElementHandler())
        .on("#description", new DescriptionElementHandler())
        .on("#url", new UrlElementHandler())
        .transform(response);
      let txt = await modText.text();
      return new Response(txt, {
        headers: {
          "content-type": "text/html",
          "set-cookie": `variantUrl=${url}`,
        },
      });
    } else {
      currentUrl = (currentUrl + 1) % responseUrls.length;
      if (currentUrl != temp) {
        let ret = await fetchUrls(responseUrls[currentUrl]);
        return ret;
      } else {
        return new Response("Unable to load website from urls", {
          headers: { "content-type": "text/plain" },
        });
      }
    }
  } catch (ex) {
    return new Response(ex, {
      headers: { "content-type": "text/plain" },
    });
  }
}
