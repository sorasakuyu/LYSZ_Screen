(function() {
    'use strict';
    
    const DEVICE_KEY = 'kaguya_device_code';
    
    function getCanvasFingerprint() {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            ctx.textBaseline = 'top';
            ctx.font = '14px Arial';
            ctx.fillStyle = '#f60';
            ctx.fillRect(125, 1, 62, 20);
            ctx.fillStyle = '#069';
            ctx.fillText('Kaguya-BigScreen-Device', 2, 15);
            ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
            ctx.fillText('Kaguya-BigScreen-Device', 4, 17);
            return canvas.toDataURL();
        } catch (e) {
            return '';
        }
    }
    
    function getWebGLInfo() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (!gl) return '';
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (!debugInfo) return '';
            const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
            const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
            return renderer + '|' + vendor;
        } catch (e) {
            return '';
        }
    }
    
    function getAudioFingerprint() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const analyser = audioContext.createAnalyser();
            const gain = audioContext.createGain();
            const scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);
            
            gain.gain.value = 0;
            oscillator.type = 'triangle';
            oscillator.frequency.value = 10000;
            
            oscillator.connect(analyser);
            analyser.connect(scriptProcessor);
            scriptProcessor.connect(gain);
            gain.connect(audioContext.destination);
            
            oscillator.start(0);
            oscillator.stop(0.001);
            
            return audioContext.sampleRate.toString();
        } catch (e) {
            return '';
        }
    }
    
    function fnv1aHash(str) {
        let hash = 2166136261;
        for (let i = 0; i < str.length; i++) {
            hash ^= str.charCodeAt(i);
            hash = Math.imul(hash, 16777619);
        }
        return (hash >>> 0).toString(16).toUpperCase().padStart(8, '0');
    }
    
    function generateDeviceCode() {
        const components = [
            getCanvasFingerprint(),
            getWebGLInfo(),
            getAudioFingerprint(),
            screen.width + 'x' + screen.height + 'x' + screen.colorDepth,
            screen.pixelDepth || '',
            new Date().getTimezoneOffset().toString(),
            navigator.language || navigator.userLanguage || '',
            navigator.platform || '',
            navigator.hardwareConcurrency || '',
            navigator.deviceMemory || '',
            navigator.userAgent
        ];
        
        const combined = components.join('|||');
        const hash1 = fnv1aHash(combined);
        const hash2 = fnv1aHash(combined + hash1);
        
        return hash1 + hash2;
    }
    
    function getDeviceCode() {
        let code = localStorage.getItem(DEVICE_KEY);
        if (!code) {
            code = generateDeviceCode();
            try {
                localStorage.setItem(DEVICE_KEY, code);
            } catch (e) {
                console.warn('无法存储设备码到 localStorage');
            }
        }
        return code;
    }
    
    window.getDeviceCode = getDeviceCode;
    
    if (typeof window.console !== 'undefined') {
        console.log('[Kaguya] 设备机器码:', getDeviceCode());
    }
})();
