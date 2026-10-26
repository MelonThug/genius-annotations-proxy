export function isChallenge(response) {
    if (response.headers.get("cf-mitigated") === "challenge") return true;

    return [403, 429, 503].includes(response.status) &&
        (response.headers.get("content-type") || "").includes("text/html");
}

export function buildCleanHeaders(target, authHeaders) {
    const isPage = new URL(target).hostname.toLowerCase() === "genius.com";
    const headers = new Headers({
        "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
        "Accept": isPage ? "text/html,application/xhtml+xml" : "application/json",
        "Accept-Language": "en-US,en;q=0.9",
    });
    if (isPage) headers.set("Referer", "https://genius.com/");
    const auth = authHeaders.get("Authorization");
    if (auth) headers.set("Authorization", auth);
    return headers;
}

export async function geniusFetch(target, headers, init = {}) {
    const first = await fetch(target, { ...init, headers });
    if (!isChallenge(first)) return first;

    console.warn(
        `Genius challenge on default headers: status=${first.status} ` +
        `cf-ray=${first.headers.get("cf-ray")} target=${target}. Retrying with clean headers.`
    );
    first.body?.cancel();

    const retry = await fetch(target, { ...init, headers: buildCleanHeaders(target, headers) });
    console.log(
        `Clean-header retry: status=${retry.status} ` +
        `cf-mitigated=${retry.headers.get("cf-mitigated")} cf-ray=${retry.headers.get("cf-ray")}`
    );
    return retry;
}