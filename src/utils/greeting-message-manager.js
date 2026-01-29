import storage from './storage-manager.js';

export class GreetingMessageManager {
  static MORNING_START = 5;
  static MORNING_END = 12;
  static AFTERNOON_START = 12;
  static AFTERNOON_END = 19;
 static MESSAGES = {
  morning: [
    'Hay cosas nuevas, [Usuario]',
    'No te pierdas nada, [Usuario]',
    'Descubre lo nuevo, [Usuario]',
    'Ya está todo listo, [Usuario]',
    'Empieza ahora, [Usuario]',
    'Hay mucho esperando, [Usuario]',
    'Todo preparado, [Usuario]',
    'Ya puedes empezar, [Usuario]'
  ],
  afternoon: [
    'Continúa donde quedaste, [Usuario]',
    'Tienes pendientes, [Usuario]',
    'Sigue ahora, [Usuario]',
    'No pares todavía, [Usuario]',
    'Aún queda mucho, [Usuario]',
    'Tu lista te espera, [Usuario]',
    'Siguiente listo, [Usuario]',
    'Hay más por descubrir, [Usuario]'
  ],
  night: [
    'La noche es larga, [Usuario]',
    'Uno más, [Usuario]',
    'Aún es temprano, [Usuario]',
    'No termines aún, [Usuario]',
    'Sigue un rato más, [Usuario]',
    'Quedan horas, [Usuario]',
    'Solo uno más, [Usuario]',
    'Continúa ahora, [Usuario]'
  ],
  generic: [
    'Todo esperándote, [Usuario]',
    'Hay mucho nuevo, [Usuario]',
    'No te lo pierdas, [Usuario]',
    'Continúa ahora, [Usuario]',
    'Tienes cosas nuevas, [Usuario]',
    'Actualizamos todo, [Usuario]',
    'Sigue explorando, [Usuario]',
    'Más y más disponible, [Usuario]'
  ]
};
static WEEKDAY_MESSAGES = {
  0: [
    'Domingo completo, [Usuario]',
    'Todo el día disponible, [Usuario]',
    'Hoy sin parar, [Usuario]',
    'Aprovecha el domingo, [Usuario]'
  ],
  1: [
    'Cosas nuevas hoy, [Usuario]',
    'Lunes con novedades, [Usuario]',
    'Semana con estrenos, [Usuario]',
    'Hay mucho nuevo, [Usuario]'
  ],
  2: [
    'Continúa ahora, [Usuario]',
    'Siguiente ya disponible, [Usuario]',
    'No te quedes atrás, [Usuario]',
    'Sigue el ritmo, [Usuario]'
  ],
  3: [
    'Mitad de semana, [Usuario]',
    'No pares a mitad, [Usuario]',
    'Queda mucho, [Usuario]',
    'Sigue consumiendo, [Usuario]'
  ],
  4: [
    'Prepara tu finde, [Usuario]',
    'Planea el fin de semana, [Usuario]',
    'Lista qué hacer, [Usuario]',
    'Hay mucho pendiente, [Usuario]'
  ],
  5: [
    'Viernes cargado, [Usuario]',
    'Noche larga, [Usuario]',
    'Sin parar, [Usuario]',
    'Finde disponible, [Usuario]'
  ],
  6: [
    'Sábado completo, [Usuario]',
    'Todo el día aquí, [Usuario]',
    'No salgas, [Usuario]',
    'Sin límite hoy, [Usuario]'
  ]
};

static SEASONAL_MESSAGES = {
  0: [
    'Novedades del año, [Usuario]',
    'Todo renovado, [Usuario]',
    'Enero cargado, [Usuario]'
  ],
  1: [
    'Febrero con novedades, [Usuario]',
    'No te pierdas lo nuevo, [Usuario]'
  ],
  2: [
    'Cosas nuevas, [Usuario]',
    'Primavera cargada, [Usuario]'
  ],
  3: [
    'Abril lleno, [Usuario]',
    'Mucho por estrenar, [Usuario]'
  ],
  4: [
    'Mayo de novedades, [Usuario]',
    'Todo actualizado, [Usuario]'
  ],
  5: [
    'Verano cargado, [Usuario]',
    'Junio lleno, [Usuario]'
  ],
  6: [
    'Julio a tope, [Usuario]',
    'Todo disponible, [Usuario]'
  ],
  7: [
    'Agosto sin parar, [Usuario]',
    'Vacaciones aquí, [Usuario]'
  ],
  8: [
    'Septiembre con novedades, [Usuario]',
    'Cosas nuevas ahora, [Usuario]'
  ],
  9: [
    'Octubre cargado, [Usuario]',
    'Mucho disponible, [Usuario]'
  ],
  10: [
    'Finales llegando, [Usuario]',
    'No te pierdas nada, [Usuario]'
  ],
  11: [
    'Especiales navideños, [Usuario]',
    'Diciembre lleno, [Usuario]'
  ],
  '12-31': 'Cierra el año aquí, [Usuario]'
};

static HOUR_SPECIFIC_MESSAGES = {
  0: 'Uno más, [Usuario]',
  1: 'Sigue ahora, [Usuario]',
  2: 'No pares, [Usuario]',
  3: 'Continúa, [Usuario]',
  6: 'Novedades matutinas, [Usuario]',
  12: 'Mediodía cargado, [Usuario]',
  18: 'Mejor momento, [Usuario]',
  20: 'Hora pico, [Usuario]',
  21: 'Mejor horario, [Usuario]',
  22: 'Aún quedan horas, [Usuario]',
  23: 'Solo uno más, [Usuario]'
};
  /**
   * @returns {string}
   */
  static getGreetingMessage() {
    const userName = storage.get('nombre', 'Usuario');
    const message = this.selectMessageByTime();
    return message.replace('[Usuario]', userName);
  }
  /**
   * @returns {string}
   */
  static selectMessageByTime() {
    const now = new Date();
    const hourOfDay = now.getHours();
    const dayOfWeek = now.getDay();
    const month = now.getMonth();
    const dateString = `${(month + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
    if (this.HOUR_SPECIFIC_MESSAGES[hourOfDay]) {
      if (Math.random() < 0.3) {
        return this.HOUR_SPECIFIC_MESSAGES[hourOfDay];
      }
    }
    let availableMessages = [];
    if (this.SEASONAL_MESSAGES[dateString]) {
      availableMessages.push(this.SEASONAL_MESSAGES[dateString]);
    }
    if (hourOfDay >= this.MORNING_START && hourOfDay < this.MORNING_END) {
      availableMessages = [...availableMessages, ...this.MESSAGES.morning];
    } else if (hourOfDay >= this.AFTERNOON_START && hourOfDay < this.AFTERNOON_END) {
      availableMessages = [...availableMessages, ...this.MESSAGES.afternoon];
    } else {
      availableMessages = [...availableMessages, ...this.MESSAGES.night];
    }
    if (this.WEEKDAY_MESSAGES[dayOfWeek]) {
      availableMessages = [...availableMessages, ...this.WEEKDAY_MESSAGES[dayOfWeek]];
    }
    if (this.SEASONAL_MESSAGES[month]) {
      availableMessages = [...availableMessages, ...this.SEASONAL_MESSAGES[month]];
    }
    if (availableMessages.length < 5) {
      availableMessages = [...availableMessages, ...this.MESSAGES.generic];
    }
    const randomIndex = Math.floor(Math.random() * availableMessages.length);
    return availableMessages[randomIndex];
  }
  /**
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
   * @returns {Object}
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