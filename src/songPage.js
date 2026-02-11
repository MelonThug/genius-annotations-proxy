import { parseJSStringLiteralJSON } from "./parsing";
import { escape } from "safe-string-literal";

async function fetchSongPage(target, outgoingHeaders, env){
    const songPageRegex = /^https:\/\/genius\.com\/songs\/(\d+)$/;
    const regexMatch = target.match(songPageRegex);
    const songId = regexMatch[1];

    const cacheKey = `song:${songId}`;
    const cached = await env.KV_CACHE.get(cacheKey, {type: "text"});
    if(cached) {
        console.log(`Song cache hit for ${target}`)
        return new Response(cached, { 
            status: 200, 
            headers: { "Content-Type": "text/html" } 
        });
    }

    const response = await fetch(target, {
		method: "GET",
		headers: outgoingHeaders,
		redirect: "follow",
	});
    if (!response.ok) throw new Error(`Failed to fetch ${target}: ${response.status}`);

    // Extract __PRELOADED_STATE__ with regex
    const html = await response.text();
    const match = html.match(
        /window\.__PRELOADED_STATE__\s*=\s*JSON\.parse\(\s*('(?:\\.|[^'])*')\s*\);/
    );

    if (!match) throw new Error("Failed to parse preloaded state");

    let jsStringLiteral = match[1];
    const jsonString = parseJSStringLiteralJSON(jsStringLiteral);
    const preloadedState = JSON.parse(jsonString);
    const annotationKey = Object.keys(preloadedState.entities.annotations)[0]
    const translations = getTranslations(songId, preloadedState)

    const minimalState = {
        songPage: {
            lyricsData: {
                body: { 
                    html: preloadedState.songPage.lyricsData.body.html 
                }
            }
        },
        entities: {
            annotations: {
                [annotationKey]: {
                    body: {
                        html: preloadedState.entities.annotations[annotationKey].body.html
                    }
                }
            },
            songs: translations
        }
    };

    let serializedLiteral = escape(JSON.stringify(minimalState));
    let formattedState = `window.__PRELOADED_STATE__ = JSON.parse('${serializedLiteral}');`

    // Cache for 7 days
    await env.KV_CACHE.put(cacheKey, formattedState, {
        expirationTtl: 60 * 60 * 24 * 7,
    });

    return new Response(formattedState, { 
        status: response.status, 
        headers: { "Content-Type": "text/html" } 
    });
}

function getTranslations(id, preloadedState){
    let translations = {}
    if(!preloadedState) return translations;
    
    const translationKeys = [id, ...preloadedState.entities.songs[id].translationSongs];
    
    for(const key of translationKeys){
        
        if(parseInt(key) === parseInt(id)){
            translations[key] = { 
                language: preloadedState.entities.songs[key].language, 
                translationSongs: preloadedState.entities.songs[id].translationSongs
            } 
        } else {
            translations[key] = {
                language: preloadedState.entities.songs[key].language 
            }
        }
    }

    return translations;
}

export { fetchSongPage }