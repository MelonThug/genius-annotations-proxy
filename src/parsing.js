function parseJSStringLiteralJSON(jsStringLiteral){
    jsStringLiteral = jsStringLiteral.slice(1, -1);

    let jsonString = jsStringLiteral
        .replace(/\\\\/g, '\\')
        .replace(/\\"/g, '"')
        .replace(/\\'/g, "'")
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t');

    jsonString = jsonString.replace(/[\u0000-\u001F]/g, (c) => {
        switch (c) {
            case '\b': return '\\b';
            case '\f': return '\\f';
            case '\n': return '\\n';
            case '\r': return '\\r';
            case '\t': return '\\t';
            default:
                return '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0');
        }
    });

    jsonString = jsonString.replace(/\\(?!["\\/bfnrtu])/g, '\\\\');
    return jsonString;
}

export { parseJSStringLiteralJSON }