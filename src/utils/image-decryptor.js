export class ImageDecryptor {
  /**
   * SHA-256 implementación JavaScript pura (fallback para TVs)
   */
  static sha256Pure(message) {
    const K = [
      0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
      0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
      0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
      0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
      0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
      0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
      0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
    ];
    const H = [
      0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
      0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
    ];
    const rotr = (n, x) => (x >>> n) | (x << (32 - n));
    const sigma0 = x => rotr(7, x) ^ rotr(18, x) ^ (x >>> 3);
    const sigma1 = x => rotr(17, x) ^ rotr(19, x) ^ (x >>> 10);
    const Sigma0 = x => rotr(2, x) ^ rotr(13, x) ^ rotr(22, x);
    const Sigma1 = x => rotr(6, x) ^ rotr(11, x) ^ rotr(25, x);
    const Ch = (x, y, z) => (x & y) ^ (~x & z);
    const Maj = (x, y, z) => (x & y) ^ (x & z) ^ (y & z);
    let bytes;
    if (typeof message === 'string') {
      bytes = new TextEncoder().encode(message);
    } else {
      bytes = new Uint8Array(message);
    }
    const bitLen = bytes.length * 8;
    const paddingLen = ((bytes.length + 9) % 64 === 0) ? 0 : 64 - ((bytes.length + 9) % 64);
    const padded = new Uint8Array(bytes.length + 1 + paddingLen + 8);
    padded.set(bytes);
    padded[bytes.length] = 0x80;
    const view = new DataView(padded.buffer);
    view.setUint32(padded.length - 4, bitLen, false);
    for (let i = 0; i < padded.length; i += 64) {
      const W = new Uint32Array(64);
      for (let t = 0; t < 16; t++) {
        W[t] = view.getUint32(i + t * 4, false);
      }
      for (let t = 16; t < 64; t++) {
        W[t] = (sigma1(W[t-2]) + W[t-7] + sigma0(W[t-15]) + W[t-16]) >>> 0;
      }
      let [a, b, c, d, e, f, g, h] = H;
      for (let t = 0; t < 64; t++) {
        const T1 = (h + Sigma1(e) + Ch(e, f, g) + K[t] + W[t]) >>> 0;
        const T2 = (Sigma0(a) + Maj(a, b, c)) >>> 0;
        h = g;
        g = f;
        f = e;
        e = (d + T1) >>> 0;
        d = c;
        c = b;
        b = a;
        a = (T1 + T2) >>> 0;
      }
      H[0] = (H[0] + a) >>> 0;
      H[1] = (H[1] + b) >>> 0;
      H[2] = (H[2] + c) >>> 0;
      H[3] = (H[3] + d) >>> 0;
      H[4] = (H[4] + e) >>> 0;
      H[5] = (H[5] + f) >>> 0;
      H[6] = (H[6] + g) >>> 0;
      H[7] = (H[7] + h) >>> 0;
    }
    const result = new Uint8Array(32);
    for (let i = 0; i < 8; i++) {
      result[i * 4] = (H[i] >>> 24) & 0xff;
      result[i * 4 + 1] = (H[i] >>> 16) & 0xff;
      result[i * 4 + 2] = (H[i] >>> 8) & 0xff;
      result[i * 4 + 3] = H[i] & 0xff;
    }
    return result;
  }

/**
 * Genera key SHA-256 con fallback para TVs
 */
static async generateKey(password) {
  const encoder = new TextEncoder();
  const passwordBytes = encoder.encode(password);
  let canUseNativeCrypto = false;
  try {
    if (typeof crypto === 'undefined' || crypto === null) {
      console.log('🔐 crypto no existe');
    }
    else if (typeof crypto.subtle === 'undefined' || crypto.subtle === null) {
      console.log('🔐 crypto.subtle no existe');
    }
    else if (typeof crypto.subtle.digest !== 'function') {
      console.log('🔐 crypto.subtle.digest no es función');
    }
    else {
      canUseNativeCrypto = true;
    }
  } catch (checkError) {
    console.warn('⚠️ Error verificando crypto:', checkError.message);
    canUseNativeCrypto = false;
  }
  if (canUseNativeCrypto) {
    try {
      console.log('🔐 Usando crypto.subtle (nativo)');
      const keyBuffer = await crypto.subtle.digest('SHA-256', passwordBytes);
      return new Uint8Array(keyBuffer);
    } catch (cryptoError) {
      console.warn('⚠️ crypto.subtle.digest falló:', cryptoError.message);
    }
  }
  console.log('🔐 Usando SHA-256 JavaScript puro (fallback TV)');
  return this.sha256Pure(passwordBytes);}

  static async decryptByteRange(encryptedFileArrayBuffer, password, startByte, endByte) {
    try {
      const fileData = new Uint8Array(encryptedFileArrayBuffer);
      console.log('📦 Archivo completo:', fileData.byteLength, 'bytes');
      console.log('🎯 Rango solicitado:', startByte, '-', endByte);
      const encryptedData = fileData.slice(startByte, endByte + 1);
      console.log('🔐 Datos cifrados:', encryptedData.byteLength, 'bytes');
      const key = await this.generateKey(password);
      const decrypted = new Uint8Array(encryptedData.length);
      for (let i = 0; i < encryptedData.length; i++) {
        decrypted[i] = encryptedData[i] ^ key[i % key.length];
      }
      console.log('✅ Descifrado XOR correcto:', decrypted.length, 'bytes');
      return decrypted;
    } catch (error) {
      console.error('❌ Error descifrando rango XOR:', error);
      throw error;
    }
  }
static async downloadAndDecryptImage(cloudflareUrl, password, startByte, endByte) {
  const diagnostics = {
    url: cloudflareUrl,
    startByte,
    endByte,
    requestMethod: 'fetch with Range header',
    timestamp: new Date().toISOString(),
    steps: [],
    environment: {}
  };

  try {
    diagnostics.steps.push('🔍 Analizando entorno de ejecución');
    
    diagnostics.environment = {
      userAgent: navigator.userAgent || 'No disponible',
      platform: navigator.platform || 'No disponible',
      language: navigator.language || 'No disponible',
      onLine: navigator.onLine !== undefined ? navigator.onLine : 'No disponible',
      cookieEnabled: navigator.cookieEnabled !== undefined ? navigator.cookieEnabled : 'No disponible',
      doNotTrack: navigator.doNotTrack || 'No disponible',
      hardwareConcurrency: navigator.hardwareConcurrency || 'No disponible',
      maxTouchPoints: navigator.maxTouchPoints || 'No disponible',
      windowLocation: window.location.href || 'No disponible',
      windowProtocol: window.location.protocol || 'No disponible',
      secureContext: window.isSecureContext !== undefined ? window.isSecureContext : 'No disponible'
    };
    
    diagnostics.steps.push(`📱 UserAgent: ${diagnostics.environment.userAgent.substring(0, 80)}...`);
    diagnostics.steps.push(`🌐 Online: ${diagnostics.environment.onLine}`);
    diagnostics.steps.push(`🔒 Secure Context: ${diagnostics.environment.secureContext}`);
    diagnostics.steps.push(`🌍 Window Protocol: ${diagnostics.environment.windowProtocol}`);
    
    const urlProtocol = cloudflareUrl.startsWith('https://') ? 'https:' : 
                        cloudflareUrl.startsWith('http://') ? 'http:' : 'unknown';
    diagnostics.urlProtocol = urlProtocol;
    diagnostics.appProtocol = window.location.protocol;
    diagnostics.protocolMismatch = urlProtocol !== diagnostics.appProtocol;
    
    if (diagnostics.protocolMismatch) {
      diagnostics.steps.push(`⚠️ ADVERTENCIA: Protocolo URL (${urlProtocol}) != App (${diagnostics.appProtocol})`);
    } else {
      diagnostics.steps.push(`✅ Protocolos coinciden: ${urlProtocol}`);
    }
    
    diagnostics.steps.push('🔍 Iniciando descarga');
    console.log('📥 Descargando:', cloudflareUrl);
    console.log('📦 Rango:', startByte, '-', endByte);
    
    diagnostics.steps.push('✅ URL validada');
    if (!cloudflareUrl || !cloudflareUrl.startsWith('http')) {
      diagnostics.steps.push(`❌ URL inválida: ${cloudflareUrl}`);
      throw new Error(`URL inválida: ${cloudflareUrl}`);
    }

    // HEAD request de diagnóstico
    diagnostics.steps.push('🔍 Intentando HEAD request para diagnóstico...');
    let headSuccess = false;
    let headError = null;
    
    try {
      const headStartTime = performance.now();
      const headResponse = await fetch(cloudflareUrl, {
        method: 'HEAD',
        mode: 'cors'
      });
      const headEndTime = performance.now();
      
      headSuccess = true;
      diagnostics.headRequest = {
        success: true,
        status: headResponse.status,
        statusText: headResponse.statusText,
        duration: `${(headEndTime - headStartTime).toFixed(2)}ms`,
        headers: {}
      };
      
      headResponse.headers.forEach((value, key) => {
        diagnostics.headRequest.headers[key] = value;
      });
      
      diagnostics.steps.push(`✅ HEAD exitoso: HTTP ${headResponse.status} en ${diagnostics.headRequest.duration}`);
      diagnostics.steps.push(`📋 Accept-Ranges: ${diagnostics.headRequest.headers['accept-ranges'] || 'No especificado'}`);
      diagnostics.steps.push(`📋 CORS headers: ${diagnostics.headRequest.headers['access-control-allow-origin'] || 'No presente'}`);
      
    } catch (headErr) {
      headError = headErr;
      diagnostics.headRequest = {
        success: false,
        error: headErr.message,
        errorType: headErr.name,
        errorStack: headErr.stack?.substring(0, 200)
      };
      diagnostics.steps.push(`❌ HEAD falló: ${headErr.message}`);
      diagnostics.steps.push(`⚠️ Tipo error HEAD: ${headErr.name}`);
    }

    // GET request real
    diagnostics.steps.push(`🌐 Ejecutando GET con Range a: ${cloudflareUrl.substring(0, 80)}...`);
    diagnostics.steps.push(`📦 Headers: Range: bytes=${startByte}-${endByte}`);
    
    const fetchStartTime = performance.now();
    let response;
    
    try {
      response = await fetch(cloudflareUrl, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Range': `bytes=${startByte}-${endByte}`
        }
      });
      diagnostics.fetchSucceeded = true;
    } catch (fetchError) {
      diagnostics.fetchSucceeded = false;
      diagnostics.fetchError = {
        message: fetchError.message,
        name: fetchError.name,
        stack: fetchError.stack?.substring(0, 300),
        toString: fetchError.toString()
      };
      diagnostics.steps.push(`❌ FETCH FALLÓ ANTES DE RECIBIR RESPUESTA`);
      diagnostics.steps.push(`❌ Error tipo: ${fetchError.name}`);
      diagnostics.steps.push(`❌ Error mensaje: ${fetchError.message}`);
      
      if (fetchError.message.includes('Failed to fetch')) {
        diagnostics.steps.push(`🔍 "Failed to fetch" indica:`);
        diagnostics.steps.push(`   - Posible bloqueo CORS en TV`);
        diagnostics.steps.push(`   - Red no disponible en TV`);
        diagnostics.steps.push(`   - Certificado SSL inválido`);
        diagnostics.steps.push(`   - Timeout de red del TV`);
      }
      
      if (fetchError.message.includes('NetworkError')) {
        diagnostics.steps.push(`🔍 "NetworkError" indica problema de conectividad TV`);
      }
      
      throw fetchError;
    }
    
    const fetchEndTime = performance.now();
    
    diagnostics.fetchDuration = `${(fetchEndTime - fetchStartTime).toFixed(2)}ms`;
    diagnostics.httpStatus = response.status;
    diagnostics.statusText = response.statusText;
    diagnostics.steps.push(`✅ Response recibido: HTTP ${response.status}`);
    
    // Capturar headers de respuesta
    const responseHeaders = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });
    diagnostics.responseHeaders = JSON.stringify(responseHeaders, null, 2);
    diagnostics.steps.push(`📋 Headers recibidos: ${Object.keys(responseHeaders).length} headers`);
    
    // 🆕 SI ES 503, CAPTURAR EL BODY DEL ERROR
    if (response.status === 503) {
      diagnostics.steps.push('⚠️ ==========================================');
      diagnostics.steps.push('⚠️ HTTP 503 DETECTADO - SERVICIO NO DISPONIBLE');
      diagnostics.steps.push('⚠️ ==========================================');
      
      try {
        const errorBodyText = await response.text();
        diagnostics.error503Body = errorBodyText;
        diagnostics.error503BodyLength = errorBodyText.length;
        diagnostics.steps.push(`📄 Body completo (${errorBodyText.length} chars):`);
        diagnostics.steps.push(`📄 ${errorBodyText.substring(0, 1000)}`);
        
        // Intentar parsear como JSON
        try {
          const errorJson = JSON.parse(errorBodyText);
          diagnostics.error503Json = errorJson;
          diagnostics.steps.push('📋 Body parseado como JSON:');
          diagnostics.steps.push(JSON.stringify(errorJson, null, 2));
        } catch {
          diagnostics.steps.push('📋 Body NO es JSON, es texto plano');
        }
        
        // Analizar el mensaje
        const lowerBody = errorBodyText.toLowerCase();
        if (lowerBody.includes('rate') || lowerBody.includes('limit')) {
          diagnostics.steps.push('🔍 POSIBLE CAUSA: Rate limiting detectado');
        }
        if (lowerBody.includes('cloudflare')) {
          diagnostics.steps.push('🔍 CONFIRMADO: Error de Cloudflare');
        }
        if (lowerBody.includes('temporary') || lowerBody.includes('temporalmente')) {
          diagnostics.steps.push('🔍 POSIBLE CAUSA: Error temporal del servidor');
        }
        if (lowerBody.includes('maintenance') || lowerBody.includes('mantenimiento')) {
          diagnostics.steps.push('🔍 POSIBLE CAUSA: Servidor en mantenimiento');
        }
        
      } catch (textError) {
        diagnostics.steps.push(`❌ No se pudo leer body del 503: ${textError.message}`);
      }
      
      diagnostics.steps.push('⚠️ ==========================================');
      throw new Error(`HTTP 503 - Ver diagnósticos completos`);
    }
    
    if (response.status === 206) {
      diagnostics.steps.push('✅ Descarga parcial (206) exitosa');
      console.log('✅ Descarga parcial (206) exitosa');
    } else if (response.status === 200) {
      diagnostics.steps.push('⚠️ Servidor ignoró Range, descargando archivo completo');
      console.warn('⚠️ Servidor ignoró Range, descargando archivo completo');
    } else {
      diagnostics.steps.push(`❌ HTTP status inesperado: ${response.status}`);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    // Leer datos
    diagnostics.steps.push('📥 Leyendo ArrayBuffer...');
    const bufferStartTime = performance.now();
    const fileArrayBuffer = await response.arrayBuffer();
    const bufferEndTime = performance.now();
    
    diagnostics.downloadedBytes = fileArrayBuffer.byteLength;
    diagnostics.bufferReadDuration = `${(bufferEndTime - bufferStartTime).toFixed(2)}ms`;
    diagnostics.steps.push(`✅ ${fileArrayBuffer.byteLength} bytes descargados`);
    console.log('✅ Datos descargados:', fileArrayBuffer.byteLength, 'bytes');
    
    // Descifrado
    diagnostics.steps.push('🔐 Iniciando descifrado...');
    let imageBytes;
    if (response.status === 206) {
      diagnostics.steps.push('🔐 Descifrando datos parciales (206)');
      const fileData = new Uint8Array(fileArrayBuffer);
      const keyStartTime = performance.now();
      const key = await this.generateKey(password);
      const keyEndTime = performance.now();
      diagnostics.keyGenerationDuration = `${(keyEndTime - keyStartTime).toFixed(2)}ms`;
      diagnostics.steps.push(`✅ Key generada en ${diagnostics.keyGenerationDuration}`);
      
      imageBytes = new Uint8Array(fileData.length);
      for (let i = 0; i < fileData.length; i++) {
        imageBytes[i] = fileData[i] ^ key[i % key.length];
      }
      diagnostics.steps.push(`✅ XOR aplicado a ${imageBytes.length} bytes`);
    } else {
      diagnostics.steps.push('🔐 Extrayendo rango del archivo completo');
      imageBytes = await this.decryptByteRange(
        fileArrayBuffer,
        password,
        Number(startByte),
        Number(endByte)
      );
      diagnostics.steps.push(`✅ Rango extraído: ${imageBytes.length} bytes`);
    }
    
    // Crear Blob
    diagnostics.steps.push('🖼️ Creando Blob...');
    const blob = new Blob([imageBytes], { type: 'image/webp' });
    diagnostics.blobSize = blob.size;
    diagnostics.steps.push(`✅ Blob creado: ${blob.size} bytes`);
    
    const imageUrl = URL.createObjectURL(blob);
    diagnostics.steps.push(`✅ Blob URL creada: ${imageUrl.substring(0, 50)}...`);
    console.log('🖼️ Imagen lista para mostrar');
    
    diagnostics.success = true;
    return imageUrl;
    
  } catch (error) {
    diagnostics.success = false;
    diagnostics.errorMessage = error.message;
    diagnostics.errorName = error.name;
    diagnostics.errorStack = error.stack;
    diagnostics.steps.push(`❌ ERROR FINAL: ${error.message}`);
    
    console.error('❌ Error descargando/descifrando:', error);
    console.error('📊 Diagnósticos completos:', diagnostics);
    
    error.diagnostics = diagnostics;
    throw error;
  }
}
  static revokeBlobUrl(blobUrl) {
    if (blobUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(blobUrl);
      console.log('🗑️ Blob URL liberada');
    }
  }
}