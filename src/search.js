async function search(target, outgoingHeaders, ctx, env) {
    const searchRegex = /^https:\/\/api\.genius\.com\/search\?q=(.+)$/;
    const match = target.match(searchRegex);
    if (!match) throw new Error(`Invalid search URL: ${target}`);

    const query = match[1];
    const queryKey = encodeURIComponent(decodeURIComponent(query).toLowerCase());

    const cacheUrl = `${env.SEARCH_CACHE_URL}/${env.CACHE_VERSION}/${queryKey}`;
    const cacheRequest = new Request(cacheUrl, { method: "GET" });

    const cached = await caches.default.match(cacheRequest);
    if (cached) {
        console.log(`Search cache hit for query: ${decodeURIComponent(queryKey)}`);
        return cached;
    }

    const response = await fetch(target, {
        method: "GET",
        headers: outgoingHeaders,
        redirect: "follow",
    });
    if (!response.ok) throw new Error(`Failed to fetch ${target}: ${response.status}`);

    const data = await response.json();

    const newResponse = new Response(JSON.stringify(data), {
        status: response.status,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN,
            "Cache-Control": "public, max-age=172800", // Edge cache for 2 days
        },
    });
    ctx.waitUntil(caches.default.put(cacheRequest, newResponse.clone()));

    return newResponse;
}

export { search }