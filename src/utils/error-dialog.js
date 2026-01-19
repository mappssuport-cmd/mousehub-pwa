/**
 * Diálogo de error detallado para TVs (sin acceso a console)
 */
export class ErrorDialog {
 static show(errorInfo) {
  // Eliminar diálogo anterior si existe
  const existing = document.getElementById('tv-error-dialog');
  if (existing) existing.remove();

  const cryptoSupport = this.checkCryptoSupport();

  const dialog = document.createElement('div');
  dialog.id = 'tv-error-dialog';
  dialog.innerHTML = `
    <style>
      #tv-error-dialog {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.95);
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: system-ui, -apple-system, sans-serif;
      }
      .error-dialog-content {
        background: linear-gradient(145deg, #1a1a2e 0%, #16213e 100%);
        border-radius: 16px;
        padding: 24px;
        width: 90%;
        max-width: 650px;
        max-height: 85vh;
        overflow-y: auto;
        color: white;
        border: 2px solid #ff4757;
        box-shadow: 0 20px 60px rgba(255, 71, 87, 0.3);
      }
      .error-dialog-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 20px;
        padding-bottom: 16px;
        border-bottom: 1px solid rgba(255,255,255,0.1);
      }
      .error-dialog-header h2 {
        margin: 0;
        color: #ff4757;
        font-size: 1.5rem;
      }
      .error-icon {
        font-size: 2.5rem;
        animation: pulse 2s infinite;
      }
      @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
      }
      .error-section {
        margin-bottom: 14px;
        padding: 14px;
        background: rgba(0,0,0,0.4);
        border-radius: 10px;
        border-left: 4px solid #ffa502;
      }
      .error-section.critical {
        border-left-color: #ff4757;
        background: rgba(255, 71, 87, 0.1);
      }
      .error-section.info {
        border-left-color: #3498db;
      }
      .error-section-title {
        font-weight: bold;
        color: #ffa502;
        margin-bottom: 8px;
        font-size: 0.95rem;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .error-section.critical .error-section-title {
        color: #ff4757;
      }
      .error-section-content {
        font-family: 'Courier New', monospace;
        font-size: 0.75rem;
        word-break: break-word;
        color: #dfe6e9;
        line-height: 1.4;
        white-space: pre-wrap;
        max-height: 300px;
        overflow-y: auto;
        padding-right: 8px;
      }
      .error-section-content::-webkit-scrollbar {
        width: 6px;
      }
      .error-section-content::-webkit-scrollbar-track {
        background: rgba(0,0,0,0.3);
        border-radius: 3px;
      }
      .error-section-content::-webkit-scrollbar-thumb {
        background: #ffa502;
        border-radius: 3px;
      }
      .crypto-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
        margin-top: 8px;
      }
      .crypto-item {
        padding: 10px;
        background: rgba(0,0,0,0.3);
        border-radius: 8px;
        text-align: center;
      }
      .crypto-item.ok {
        border: 1px solid #2ecc71;
      }
      .crypto-item.fail {
        border: 1px solid #ff4757;
      }
      .crypto-status {
        font-size: 1.5rem;
        margin-bottom: 4px;
      }
      .crypto-label {
        font-size: 0.75rem;
        color: #b2bec3;
      }
      .error-close-btn {
        width: 100%;
        padding: 16px;
        background: linear-gradient(135deg, #ff4757 0%, #ff6b81 100%);
        border: none;
        border-radius: 10px;
        color: white;
        font-size: 1.1rem;
        font-weight: bold;
        cursor: pointer;
        margin-top: 20px;
        transition: all 0.3s ease;
      }
      .error-close-btn:hover,
      .error-close-btn:focus {
        transform: scale(1.02);
        outline: 3px solid #ffa502;
        outline-offset: 3px;
        box-shadow: 0 5px 20px rgba(255, 71, 87, 0.4);
      }
      .timestamp {
        font-size: 0.75rem;
        color: #636e72;
        text-align: right;
        margin-top: 10px;
      }
    </style>
    <div class="error-dialog-content">
      <div class="error-dialog-header">
        <span class="error-icon">🚨</span>
        <div>
          <h2>Error de Depuración</h2>
          <small style="color: #b2bec3;">Información detallada para TV</small>
        </div>
      </div>
      
      <div class="error-section critical">
        <div class="error-section-title">📍 Método donde falló</div>
        <div class="error-section-content">${errorInfo.method || 'Desconocido'}</div>
      </div>
      
      <div class="error-section critical">
        <div class="error-section-title">❌ Mensaje de error</div>
        <div class="error-section-content">${this.escapeHtml(errorInfo.message) || 'Sin mensaje'}</div>
      </div>
      
      <div class="error-section">
        <div class="error-section-title">📋 Stack trace</div>
        <div class="error-section-content">${this.escapeHtml(errorInfo.stack) || 'No disponible'}</div>
      </div>
      
      <div class="error-section info">
        <div class="error-section-title">ℹ️ Contexto y diagnóstico completo</div>
        <div class="error-section-content">${this.escapeHtml(errorInfo.context) || 'Ninguno'}</div>
      </div>
      
      <div class="error-section info">
        <div class="error-section-title">🔐 Soporte Web Crypto API</div>
        <div class="crypto-grid">
          <div class="crypto-item ${cryptoSupport.hasCrypto ? 'ok' : 'fail'}">
            <div class="crypto-status">${cryptoSupport.hasCrypto ? '✅' : '❌'}</div>
            <div class="crypto-label">crypto</div>
          </div>
          <div class="crypto-item ${cryptoSupport.hasSubtle ? 'ok' : 'fail'}">
            <div class="crypto-status">${cryptoSupport.hasSubtle ? '✅' : '❌'}</div>
            <div class="crypto-label">crypto.subtle</div>
          </div>
          <div class="crypto-item ${cryptoSupport.hasDigest ? 'ok' : 'fail'}">
            <div class="crypto-status">${cryptoSupport.hasDigest ? '✅' : '❌'}</div>
            <div class="crypto-label">digest()</div>
          </div>
        </div>
      </div>
      
      <div class="timestamp">
        🕐 ${new Date().toLocaleString()}
      </div>
      
      <button class="error-close-btn" id="closeErrorDialog">
        Cerrar (OK / Enter)
      </button>
    </div>
  `;

  document.body.appendChild(dialog);
  
  const closeBtn = document.getElementById('closeErrorDialog');
  closeBtn?.focus();
  closeBtn?.addEventListener('click', () => dialog.remove());
  
  // Cerrar con múltiples teclas (compatibilidad TV)
  const handleKey = (e) => {
    const closeKeys = [
      'Escape', 'Enter', 'Backspace',
      27,   // Escape
      13,   // Enter
      8,    // Backspace
      10009 // Samsung/LG TV Back
    ];
    
    if (closeKeys.includes(e.key) || closeKeys.includes(e.keyCode)) {
      dialog.remove();
      document.removeEventListener('keydown', handleKey);
    }
  };
  document.addEventListener('keydown', handleKey);
}

  static checkCryptoSupport() {
    const result = {
      hasCrypto: false,
      hasSubtle: false,
      hasDigest: false
    };
    
    try {
      result.hasCrypto = typeof crypto !== 'undefined' && crypto !== null;
      
      if (result.hasCrypto) {
        result.hasSubtle = typeof crypto.subtle !== 'undefined' && 
                          crypto.subtle !== null;
        
        if (result.hasSubtle) {
          result.hasDigest = typeof crypto.subtle.digest === 'function';
        }
      }
    } catch (e) {
      // Silenciar errores de verificación
    }
    
    return result;
  }

  static escapeHtml(text) {
    if (!text) return text;
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
  }
}