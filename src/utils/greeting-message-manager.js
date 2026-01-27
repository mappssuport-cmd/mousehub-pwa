import storage from './storage-manager.js';

export class GreetingMessageManager {
  static MORNING_START = 5;
  static MORNING_END = 12;
  static AFTERNOON_START = 12;
  static AFTERNOON_END = 19;
  static MESSAGES = {
    morning: [
      'Un nuevo día de historias increíbles te espera, [Usuario]',
      'Qué buen momento para disfrutar algo especial, [Usuario]',
      'Buenos días, [Usuario]. El catálogo está listo para ti',
      'La mañana brilla más con buen contenido, [Usuario]',
      'Comenzamos el día con las mejores recomendaciones, [Usuario]',
      'Tu momento matutino de disfrute comienza ahora, [Usuario]',
      'El día está lleno de posibilidades, [Usuario]',
      'Buenos días, [Usuario]. ¿Qué te apetece ver hoy?',
      'La frescura de la mañana perfecta para descubrir algo nuevo, [Usuario]',
      'Tu rutina mañanera se vuelve especial aquí, [Usuario]'
    ],
    afternoon: [
      'Tu tarde merece un momento excepcional, [Usuario]',
      'Buenas tardes, [Usuario]. La experiencia continúa',
      'El mejor contenido está disponible para ti, [Usuario]',
      'La tarde se presta para disfrutar sin prisas, [Usuario]',
      'Descanso de tarde con lo que más te gusta, [Usuario]',
      'El sol de la tarde ilumina tu selección personal, [Usuario]',
      'Buenas tardes, [Usuario]. ¿Buscas algo específico o te dejas sorprender?',
      'Momento perfecto para una pausa de calidad, [Usuario]',
      'La calma de la tarde combina bien con buen contenido, [Usuario]',
      'Tu espacio de desconexión te espera, [Usuario]'
    ],
    night: [
      'La mejor compañía para tu noche, [Usuario]',
      'Buenas noches, [Usuario]. Tu momento personal comienza',
      'El ambiente perfecto para disfrutar, [Usuario]',
      'La noche se llena de buenas historias, [Usuario]',
      'Relájate con lo que realmente te gusta, [Usuario]',
      'El silencio de la noche, el mejor sonido para disfrutar, [Usuario]',
      'Buenas noches, [Usuario]. ¿Preparado para dejarte llevar?',
      'La oscuridad resalta la magia de la pantalla, [Usuario]',
      'Tu refugio nocturno te da la bienvenida, [Usuario]',
      'La noche es joven y llena de posibilidades, [Usuario]'
    ],
    generic: [
      'Tu espacio personal te recibe, [Usuario]',
      'Bienvenido a tu experiencia de entretenimiento, [Usuario]',
      'Es un placer tenerte de vuelta, [Usuario]',
      'Aquí siempre hay algo que te va a gustar, [Usuario]',
      'Tu lugar favorito para desconectar, [Usuario]',
      'Siempre es buen momento para disfrutar, [Usuario]',
      'Nos alegra verte de nuevo, [Usuario]',
      'Listo para sumergirte en nuevas experiencias, [Usuario]',
      'Tu momento de desconexión comienza ahora, [Usuario]',
      'El entretenimiento de calidad te espera, [Usuario]'
    ]
  };
  static WEEKDAY_MESSAGES = {
    0: [
      'Domingo de disfrute en casa, [Usuario]',
      'Tu día perfecto para relajarte comienza ahora, [Usuario]',
      'Domingo de sofá, manta y buenas historias, [Usuario]',
      'El día de descanso se disfruta mejor aquí, [Usuario]',
      'Domingo de maratón sin remordimientos, [Usuario]',
      'El final de semana merece un buen final, [Usuario]',
      'Domingo: día para consentirte con lo que te gusta, [Usuario]',
      'Relájate, es domingo. Disfruta a tu ritmo, [Usuario]'
    ],
    1: [
      'La semana comienza con grandes historias, [Usuario]',
      'Nuevos lunes, nuevas experiencias, [Usuario]',
      'Lunes de inspiración y buen contenido, [Usuario]',
      'Comienza la semana con el pie derecho, [Usuario]',
      'Lunes de descubrimientos interesantes, [Usuario]',
      'La rutina semanal es mejor con momentos especiales, [Usuario]',
      'Lunes: el día perfecto para empezar algo nuevo, [Usuario]',
      'Semana nueva, historias nuevas, [Usuario]'
    ],
    2: [
      'Martes de buenos descubrimientos, [Usuario]',
      'La semana avanza con buen ritmo, [Usuario]',
      'Martes: día perfecto para esa serie que te engancha, [Usuario]',
      'El martes sabe mejor con contenido de calidad, [Usuario]',
      'Ya estamos en marcha, [Usuario]. ¿Qué te apetece hoy?',
      'Martes de seguir con esa historia que no puedes dejar, [Usuario]'
    ],
    3: [
      'Mitad de semana, momento para recargar energías, [Usuario]',
      'Miércoles de balance: trabajo y disfrute, [Usuario]',
      'Ya casi es fin de semana, [Usuario]. ¿Qué tal un descanso?',
      'Miércoles: el punto perfecto para una pausa de calidad, [Usuario]',
      'El miércoles pasa más rápido con buen contenido, [Usuario]',
      'Mitad de camino, mereces un buen descanso, [Usuario]'
    ],
    4: [
      'Jueves de anticipación al fin de semana, [Usuario]',
      'Ya se respira fin de semana, [Usuario]',
      'Jueves: perfecto para planear tu maratón del fin de semana, [Usuario]',
      'Un día más cerca del descanso, [Usuario]',
      'Jueves de esos momentos que te hacen olvidar el reloj, [Usuario]',
      'La semana casi termina, [Usuario]. ¿Preparando el fin de semana?'
    ],
    5: [
      'Viernes de maratón de calidad, [Usuario]',
      'El fin de semana empieza con lo mejor, [Usuario]',
      '¡Por fin es viernes! Celebra con buen contenido, [Usuario]',
      'Viernes de sofá, snacks y disfrute total, [Usuario]',
      'La semana termina, la diversión comienza, [Usuario]',
      'Viernes: la noche es tuya para disfrutar, [Usuario]',
      'Fin de semana a la vista, [Usuario]. ¿Listo para desconectar?',
      'Viernes de liberación y buen entretenimiento, [Usuario]'
    ],
    6: [
      'Sábado de experiencias memorables, [Usuario]',
      'Tu noche merece lo mejor, [Usuario]',
      'Sábado de relax total y buen contenido, [Usuario]',
      'El día perfecto para dejarlo todo y disfrutar, [Usuario]',
      'Sábado: sin horarios, sin prisas, solo disfrute, [Usuario]',
      'Fin de semana en su máximo esplendor, [Usuario]',
      'Sábado de capítulos sin fin y buenos momentos, [Usuario]',
      'Disfruta el sábado a tu ritmo, [Usuario]'
    ]
  };
  static SEASONAL_MESSAGES = {
    0: [
      'Un año nuevo de momentos increíbles, [Usuario]',
      'Comienza el año con experiencias únicas, [Usuario]',
      'Enero de nuevos comienzos y buenas historias, [Usuario]',
      'El año empieza con el mejor contenido, [Usuario]',
      'Nuevo año, nuevas historias por descubrir, [Usuario]',
      'Enero de propósitos cumplidos: disfrutar más, [Usuario]'
    ],
    1: [
      'Febrero de momentos acogedores, [Usuario]',
      'El mes del amor a las buenas historias, [Usuario]',
      'Febrero: corto pero intenso en emociones, [Usuario]',
      'El invierno se disfruta mejor desde dentro, [Usuario]',
      'Febrero de tardes largas y buen contenido, [Usuario]'
    ],
    2: [
      'Marzo de primavera y nuevos comienzos, [Usuario]',
      'La primavera trae historias frescas, [Usuario]',
      'Marzo de renovación y descubrimientos, [Usuario]',
      'Los días más largos, más tiempo para disfrutar, [Usuario]'
    ],
    3: [
      'Abril de lluvias y tardes de sofá, [Usuario]',
      'Cada lluvia tiene su arcoíris de buen contenido, [Usuario]',
      'Abril: mes perfecto para esos descubrimientos especiales, [Usuario]',
      'La primavera en su esplendor, [Usuario]. ¿Qué te apetece ver?'
    ],
    4: [
      'Mayo de flores y buenas historias, [Usuario]',
      'El buen tiempo empieza, pero dentro también se está bien, [Usuario]',
      'Mayo de transición: del interior al exterior y viceversa, [Usuario]',
      'Las tardes de mayo saben mejor con buen contenido, [Usuario]'
    ],
    5: [
      'Junio de inicio de verano y relax, [Usuario]',
      'El verano comienza con buen pie, [Usuario]',
      'Junio de noches cortas pero intensas, [Usuario]',
      'El calor se combate mejor con buena compañía, [Usuario]'
    ],
    6: [
      'Julio de verano en su máximo esplendor, [Usuario]',
      'Las vacaciones saben mejor con buen contenido, [Usuario]',
      'Julio de tardes perezosas y disfrute sin horarios, [Usuario]',
      'El mes perfecto para ese maratón pendiente, [Usuario]'
    ],
    7: [
      'Agosto de relax total, [Usuario]',
      'El mes de desconectar y disfrutar, [Usuario]',
      'Agosto: tiempo de descanso y buenas historias, [Usuario]',
      'El verano se despacio, disfrútalo a tu ritmo, [Usuario]'
    ],
    8: [
      'Septiembre de vuelta a la rutina con buen pie, [Usuario]',
      'Nuevos comienzos, nuevas historias, [Usuario]',
      'Septiembre de proyectos y momentos de relax, [Usuario]',
      'El otoño se acerca, [Usuario]. ¿Preparado para disfrutar?'
    ],
    9: [
      'Octubre de descubrimientos emocionantes, [Usuario]',
      'El mes perfecto para disfrutar sin límites, [Usuario]',
      'Octubre de noches largas y buen contenido, [Usuario]',
      'El otoño se disfruta mejor desde el sofá, [Usuario]',
      'Octubre de historias que dan calor en las noches frías, [Usuario]'
    ],
    10: [
      'Noviembre de nostalgia y buenos recuerdos, [Usuario]',
      'El frío exterior, el calor del buen contenido, [Usuario]',
      'Noviembre de reflexión y momentos especiales, [Usuario]',
      'El mes perfecto para esas historias que tocan el corazón, [Usuario]'
    ],
    11: [
      'Celebramos contigo con momentos especiales, [Usuario]',
      'Diciembre de experiencias inolvidables, [Usuario]',
      'El espíritu navideño se siente también aquí, [Usuario]',
      'Diciembre de magia, calor y buenas historias, [Usuario]',
      'El año termina con lo mejor, [Usuario]',
      'Navidad es compartir, también buenos momentos contigo mismo, [Usuario]'
    ],
    '01-06': 'Día de reyes, día de regalarse buenos momentos, [Usuario]',
    '02-14': 'Celebremos con lo que nos emociona, [Usuario]',
    '03-17': 'Un día para lo extraordinario, [Usuario]',
    '04-01': 'Día de sorpresas y descubrimientos, [Usuario]',
    '05-01': 'Día de descanso merecido, [Usuario]',
    '06-24': 'Noche de San Juan, noche de magia y buenas historias, [Usuario]',
    '07-25': 'Día de Santiago, día de caminos y buenos finales, [Usuario]',
    '08-15': 'Día de relax total, [Usuario]',
    '09-21': 'Comienza el otoño con buen pie, [Usuario]',
    '10-31': 'Noche de misterio y emociones fuertes, [Usuario]',
    '11-01': 'Día de recuerdos y nuevas memorias, [Usuario]',
    '12-24': 'Nochebuena de momentos especiales, [Usuario]',
    '12-25': 'Navidad con lo mejor, [Usuario]',
    '12-31': 'Despidamos el año con buen gusto, [Usuario]'
  };
  static HOUR_SPECIFIC_MESSAGES = {
    0: 'Madrugada de momentos ilimitados, [Usuario]',
    1: 'La noche es joven, [Usuario]. ¿Sigues despierto?',
    2: 'Noche de descubrimientos especiales, [Usuario]',
    3: 'En la tranquilidad de la madrugada, [Usuario]',
    4: 'Los primeros rayos de sol se asoman, [Usuario]',
    5: 'Madrugada de descubrimientos exclusivos, [Usuario]',
    6: 'El amanecer trae experiencias frescas, [Usuario]',
    7: 'Buen comienzo con momentos especiales, [Usuario]',
    8: 'La jornada empieza con buen contenido, [Usuario]',
    9: 'Mañana de experiencias increíbles, [Usuario]',
    10: 'La diversión te espera, [Usuario]',
    11: 'Casi mediodía de momentos memorables, [Usuario]',
    12: 'Hora del mejor entretenimiento, [Usuario]',
    13: 'Tarde de disfrute sin interrupciones, [Usuario]',
    14: 'Sesión especial de tarde, [Usuario]',
    15: 'La experiencia continúa, [Usuario]',
    16: 'Tarde de momentos de calidad, [Usuario]',
    17: 'Hora perfecta para descubrir algo nuevo, [Usuario]',
    18: 'Atardecer con buenas historias, [Usuario]',
    19: 'La noche especial comienza, [Usuario]',
    20: 'Hora de experiencias únicas, [Usuario]',
    21: 'Noche de disfrute sin límites, [Usuario]',
    22: 'Los mejores momentos te acompañan, [Usuario]',
    23: 'Noche de experiencias en casa, [Usuario]'
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