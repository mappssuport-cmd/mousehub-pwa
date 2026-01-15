import storage from './storage-manager.js';

export class GreetingMessageManager {
  static MORNING_START = 5;
  static MORNING_END = 12;
  static AFTERNOON_START = 12;
  static AFTERNOON_END = 19;

  // Mensajes según hora del día (naturales y cortos)
  static MESSAGES = {
    morning: [
      '¡Buenos días [Usuario]!',
      '¡Feliz día [Usuario]!'
    ],
    afternoon: [
      '¡Buenas tardes [Usuario]!',
      '¡Feliz tarde [Usuario]!'
    ],
    night: [
      '¡Buenas noches [Usuario]!',
      '¡Feliz noche [Usuario]!'
    ],
    generic: ['¡Hola [Usuario]!']
  };

  // Mensajes específicos por día de la semana
  static WEEKDAY_MESSAGES = {
    0: [ // Domingo
      '¡Feliz domingo [Usuario]!',
      'Domingo de descanso [Usuario]'
    ],
    1: [ // Lunes
      '¡Ánimo con la semana [Usuario]!',
      'Feliz inicio de semana [Usuario]'
    ],
    5: [ // Viernes
      '¡Feliz viernes [Usuario]!',
      'Buen fin de semana [Usuario]'
    ],
    6: [ // Sábado
      '¡Feliz sábado [Usuario]!',
      'Sábado de descanso [Usuario]'
    ]
  };

  // Mensajes estacionales/mensuales
  static SEASONAL_MESSAGES = {
    11: [ // Diciembre
      '¡Feliz navidad [Usuario]!',
      '¡Felices fiestas [Usuario]!',
      '¡Próspero año nuevo [Usuario]!'
    ],
    0: [ // Enero
      '¡Feliz año nuevo [Usuario]!',
      '¡Excelente año [Usuario]!',
      '¡Nuevo año, nuevas metas [Usuario]!'
    ],
    9: [ // Octubre
      '¡Feliz octubre [Usuario]!',
      '¡Mes de festividades [Usuario]!'
    ],
    '12-24': '¡Feliz nochebuena [Usuario]!',
    '12-25': '¡Feliz navidad [Usuario]!',
    '12-31': '¡Feliz año nuevo [Usuario]!',
    '01-01': '¡Feliz año nuevo [Usuario]!',
    '02-14': '¡Feliz día del amor [Usuario]!'
  };

  // Mensajes para horas exactas específicas
  static HOUR_SPECIFIC_MESSAGES = {
    // Mañana
    5: 'Muy temprano [Usuario]',
    6: 'Buen amanecer [Usuario]',
    7: '¡Hora de comenzar el día [Usuario]!',
    8: '¡A trabajar [Usuario]!',
    9: 'Buen inicio de jornada [Usuario]',
    10: 'Media mañana [Usuario]',
    11: 'Casi mediodía [Usuario]',
    
    // Tarde
    12: 'Hora del almuerzo [Usuario]',
    13: 'Buen comienzo de tarde [Usuario]',
    14: 'Tarde productiva [Usuario]',
    15: 'Media tarde [Usuario]',
    16: 'Avanzando en la tarde [Usuario]',
    17: 'Casi terminando [Usuario]',
    18: 'Fin de la jornada [Usuario]',
    
    // Noche
    19: 'Buen comienzo de noche [Usuario]',
    20: 'Noche tranquila [Usuario]',
    21: 'Hora de relajarse [Usuario]',
    22: 'Buenas noches [Usuario]',
    23: 'Muy tarde [Usuario]',
    0: 'Buenas madrugadas [Usuario]',
    1: '¿Todavía despierto [Usuario]?',
    2: 'Trabajando hasta tarde [Usuario]',
    3: 'En la tranquilidad de la madrugada [Usuario]',
    4: 'Casi amanece [Usuario]'
  };

  /**
   * Obtener mensaje de saludo según la hora actual
   * @returns {string} Mensaje personalizado con el nombre del usuario
   */
  static getGreetingMessage() {
    const userName = storage.get('nombre', 'Usuario');
    const message = this.selectMessageByTime();
    return message.replace('[Usuario]', userName);
  }

  /**
   * Seleccionar mensaje aleatorio según múltiples factores
   * @returns {string}
   */
  static selectMessageByTime() {
    const now = new Date();
    const hourOfDay = now.getHours();
    const dayOfWeek = now.getDay();
    const month = now.getMonth();
    const dateString = `${(month + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;

    // 1. Primero verificar si hay mensaje para hora exacta
    if (this.HOUR_SPECIFIC_MESSAGES[hourOfDay]) {
      return this.HOUR_SPECIFIC_MESSAGES[hourOfDay];
    }

    // 2. Verificar si hay mensaje para fecha específica
    if (this.SEASONAL_MESSAGES[dateString]) {
      return this.SEASONAL_MESSAGES[dateString];
    }

    let availableMessages = [];

    // 3. Mensajes según período del día
    if (hourOfDay >= this.MORNING_START && hourOfDay < this.MORNING_END) {
      availableMessages = [...this.MESSAGES.morning];
    } else if (hourOfDay >= this.AFTERNOON_START && hourOfDay < this.AFTERNOON_END) {
      availableMessages = [...this.MESSAGES.afternoon];
    } else {
      availableMessages = [...this.MESSAGES.night];
    }

    // 4. Agregar mensajes específicos del día de la semana
    if (this.WEEKDAY_MESSAGES[dayOfWeek]) {
      availableMessages = [...availableMessages, ...this.WEEKDAY_MESSAGES[dayOfWeek]];
    }

    // 5. Agregar mensajes estacionales/mensuales
    if (this.SEASONAL_MESSAGES[month]) {
      availableMessages = [...availableMessages, ...this.SEASONAL_MESSAGES[month]];
    }

    // Fallback en caso de array vacío
    if (availableMessages.length === 0) {
      availableMessages = [...this.MESSAGES.generic];
    }

    // Seleccionar mensaje aleatorio
    const randomIndex = Math.floor(Math.random() * availableMessages.length);
    return availableMessages[randomIndex];
  }

  /**
   * Obtener período del día actual
   * @returns {'morning'|'afternoon'|'night'}
   */
  static getCurrentPeriod() {
    const hourOfDay = new Date().getHours();

    if (hourOfDay >= this.MORNING_START && hourOfDay < this.MORNING_END) {
      return 'morning';
    } else if (hourOfDay >= this.AFTERNOON_START && hourOfDay < this.AFTERNOON_END) {
      return 'afternoon';
    } else {
      return 'night';
    }
  }

  /**
   * Obtener información contextual adicional
   * @returns {Object} Información del día, mes, etc.
   */
  static getContextInfo() {
    const now = new Date();
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    return {
      dayOfWeek: days[now.getDay()],
      dayOfMonth: now.getDate(),
      month: months[now.getMonth()],
      year: now.getFullYear(),
      hour: now.getHours(),
      minute: now.getMinutes().toString().padStart(2, '0')
    };
  }
}