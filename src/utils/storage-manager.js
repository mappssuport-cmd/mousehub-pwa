class StorageManager {
  constructor(prefix = 'MouseHubPrefs') {
    this.prefix = prefix;
  }
  /**
   * @param {string} key - Clave
   * @param {any} value - Valor (se convertirá a JSON)
   */
  set(key, value) {
    try {
      const fullKey = `${this.prefix}_${key}`;
      const jsonValue = JSON.stringify(value);
      localStorage.setItem(fullKey, jsonValue);
      return true;
    } catch (error) {
      console.error('Error guardando en storage:', error);
      return false;
    }
  }
  /**
   * @param {string} key - Clave
   * @param {any} defaultValue - Valor por defecto si no existe
   * @returns {any}
   */
  get(key, defaultValue = null) {
    try {
      const fullKey = `${this.prefix}_${key}`;
      const value = localStorage.getItem(fullKey);   
      if (value === null) {
        return defaultValue;
      }
      return JSON.parse(value);
    } catch (error) {
      console.error('Error obteniendo de storage:', error);
      return defaultValue;
    }
  }
  /**
   * @param {string} key - Clave a eliminar
   */
  remove(key) {
    try {
      const fullKey = `${this.prefix}_${key}`;
      localStorage.removeItem(fullKey);
      return true;
    } catch (error) {
      console.error('Error eliminando de storage:', error);
      return false;
    }
  }
  clear() {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.prefix)) {
          localStorage.removeItem(key);
        }
      });
      return true;
    } catch (error) {
      console.error('Error limpiando storage:', error);
      return false;
    }
  }
  /**
   * @param {string} key
   * @returns {boolean}
   */
  has(key) {
    const fullKey = `${this.prefix}_${key}`;
    return localStorage.getItem(fullKey) !== null;
  }
  /**
   * @param {Object} data - Objeto con pares clave-valor
   */
  setMultiple(data) {
    try {
      Object.entries(data).forEach(([key, value]) => {
        this.set(key, value);
      });
      return true;
    } catch (error) {
      console.error('Error guardando múltiples valores:', error);
      return false;
    }
  }
  /**
   * @returns {Object}
   */
  getAll() {
    const result = {};
    const keys = Object.keys(localStorage);
    keys.forEach(fullKey => {
      if (fullKey.startsWith(this.prefix)) {
        const key = fullKey.replace(`${this.prefix}_`, '');
        result[key] = this.get(key);
      }
    });
    return result;
  }
}
const storage = new StorageManager('MouseHubPrefs');
export default storage;