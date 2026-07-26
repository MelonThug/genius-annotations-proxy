import { compareVersions } from "./util";

async function fetchAnnotations(target, outgoingHeaders, clientVersion, env){
    let referentsRegex;
    const isLegacyClient = !clientVersion || compareVersions(clientVersion, "1.3.1") <= 0;

    if(isLegacyClient){
        referentsRegex = /^https:\/\/api\.genius\.com\/referents\?song_id=(\d+)&text_format=plain&per_page=50$/;
    } else {
        referentsRegex = /^https:\/\/api\.genius\.com\/referents\?song_id=(\d+)&text_format=html&per_page=50$/;
    }
    
    const match = target.match(referentsRegex);
    const songId = match[1];

    const cacheKey = `annotations:${songId}`
    const cached = await env.KV_CACHE.get(cacheKey, {type: "json"});
    if(cached) {
        console.log(`Annotation cache hit for ${target}`)
        return new Response(JSON.stringify(cached), { 
            status: 200, 
            headers: { "Content-Type": "application/json" } 
        });
    }

    const response = await fetch(target, {
		method: "GET",
		headers: outgoingHeaders,
		redirect: "follow",
	});
    if (!response.ok) throw new Error(`Failed to fetch ${target}: ${response.status}`);

    const data = await response.json();
    // Cache for 7 days
    try {
        await env.KV_CACHE.put(cacheKey, JSON.stringify(data), {expirationTtl: 60 * 60 * 24 * 7, });
    } catch (e){ console.warn("Error writing annotations to KV: ", e) }
    

    return new Response(JSON.stringify(data), { 
        status: response.status, 
        headers: { "Content-Type": "application/json" } 
    });
}

export { fetchAnnotations }