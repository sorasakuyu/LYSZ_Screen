(function() {
    'use strict';
    
    const API_BASE = 'http://localhost:9000';
    
    function fetchWithTimeout(url, ms, options) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), ms);
        
        const mergedOptions = {
            ...options,
            signal: controller.signal,
            cache: 'no-store'
        };
        
        return fetch(url, mergedOptions).finally(() => clearTimeout(timeoutId));
    }
    
    function buildUrl(endpoint, device) {
        const separator = endpoint.includes('?') ? '&' : '?';
        return `${API_BASE}${endpoint}${separator}device=${device}`;
    }
    
    function apiRequest(endpoint, options) {
        options = options || {};
        const device = window.getDeviceCode();
        const url = buildUrl(endpoint, device);
        const timeout = options.timeout || 8000;
        
        const fetchOptions = {
            method: options.method || 'GET',
            headers: options.headers,
            body: options.body
        };
        
        return fetchWithTimeout(url, timeout, fetchOptions);
    }
    
    function apiGet(endpoint, timeout) {
        return apiRequest(endpoint, { timeout: timeout || 8000 });
    }
    
    function apiPost(endpoint, data, timeout) {
        return apiRequest(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data),
            timeout: timeout || 8000
        });
    }
    
    window.apiRequest = apiRequest;
    window.apiGet = apiGet;
    window.apiPost = apiPost;
    window.API_BASE = API_BASE;
})();
