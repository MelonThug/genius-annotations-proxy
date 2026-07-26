function compareVersions(v1, v2) { // Returns negative number if v1 < v2, 0 if v1 == v2, positive number if v1 > v2
    if (!v1) return -1;
    
    const p1 = v1.replace(/^v/, '').split('.').map(Number);
    const p2 = v2.replace(/^v/, '').split('.').map(Number);
    
    const len = Math.max(p1.length, p2.length);
    for (let i = 0; i < len; i++) {
        const num1 = p1[i] || 0;
        const num2 = p2[i] || 0;
        
        if (num1 !== num2) {
            return num1 - num2;
        }
    }
    return 0;
}

export { compareVersions }