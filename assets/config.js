/* ============================================================
   CONFIGURACIÓN DEL FUNNEL — lo único que tenés que tocar
   ============================================================ */
window.MC_CONFIG = {

  // Pixel de Meta (Facebook). Pegá solo el número, ej: '1234567890123456'.
  // Si queda vacío, no se carga ningún pixel.
  metaPixelId: '914352463951226', // VSL MSC (nico landing)

  // Número de WhatsApp con código de país, sin + ni espacios. Ej Argentina: '5491155554444'
  whatsapp: '19205234269',

  // Email de contacto que aparece en Privacidad y Términos. Vacío = solo WhatsApp.
  contactoEmail: 'info@myconsulting.io',

  // Link de tu evento de Calendly (el de la llamada estratégica)
  calendlyUrl: 'https://calendly.com/nicolasiannaci/llamada-estrategica',

  // Video de venta (VSL) de la landing. URL de "embed" (Loom, YouTube, Wistia, Vidalytics...)
  vslEmbedUrl: 'https://www.loom.com/embed/461d65bebeac4c14add36a66125f3b1e?hide_owner=true&hide_share=true&hide_title=true&hideEmbedTopBar=true&hide_speed=true',

  // Mini video del caso real (Joseph Ramírez) en la landing. URL de embed; vacío = placeholder.
  casoVideoUrl: 'https://www.loom.com/embed/8225e7123d814de3b4bf72fadb51fd93?hide_owner=true&hide_share=true&hide_title=true&hideEmbedTopBar=true&hide_speed=true',

  // Evento "Schedule" en la página de gracias:
  //   false → se dispara siempre que alguien llega a /gracias (recomendado al arrancar)
  //   true  → solo si la URL trae ?calificado=1
  scheduleSoloCalificados: false,

  // ---------- Página de gracias ----------

  // Video de confirmación ("mirá este video de 2 minutos"). URL de embed. Vacío = placeholder.
  videoConfirmacionUrl: 'https://www.loom.com/embed/786113a0496143f49d2b100040580edc?hide_owner=true&hide_share=true&hide_title=true&hideEmbedTopBar=true&hide_speed=true',

  // Videos cortos de objeciones (breakouts): 3 en fila en compu, uno debajo del otro en celular.
  // url = embed; vacío = placeholder.
  breakouts: [
    { titulo: 'YouTube es lento: ¿en cuánto tiempo veo resultados?', duracion: '', url: 'https://www.loom.com/embed/7c20995ba3484c82ae4725f95fee71f6?hide_owner=true&hide_share=true&hide_title=true&hideEmbedTopBar=true&hide_speed=true' },
    { titulo: '¿Cuánto tiempo me lleva a mí?',                      duracion: '0:45', url: 'https://www.loom.com/embed/b375b94f165942d4b0db5afb711f1665?hide_owner=true&hide_share=true&hide_title=true&hideEmbedTopBar=true&hide_speed=true' },
    { titulo: '¿Funciona en mi nicho?',                              duracion: '1:04', url: 'https://www.loom.com/embed/8c2369c1b447465388890aced09da8b9?hide_owner=true&hide_share=true&hide_title=true&hideEmbedTopBar=true&hide_speed=true' },
  ],

  // Casos verificables (tabla). canal / video = links reales.
  casos: [
    { cliente: 'Frank',          nicho: 'Trading',        resultado: '50K/mes desde YouTube',                antes: 'Canal desde cero',                        canal: '#', video: '#' },
    { cliente: 'Joseph Ramírez', nicho: 'E-commerce B2B', resultado: '20K → 135K/mes',                       antes: '~7.000 suscriptores, #1 de su industria', canal: '#', video: '#' },
    { cliente: 'Yari Taft',      nicho: 'Programadores',  resultado: 'Leads más nutridos y fáciles de cerrar', antes: 'Canal desde cero, ya facturaba 150K',     canal: '#', video: '#' },
  ],

  // Testimonios en video (formato vertical). url = embed; vacío = placeholder.
  testimonios: [
    { nombre: '(Nombre del cliente)', nicho: '(Nicho)', resultado: '(Una línea con el resultado)', url: '' },
    { nombre: '(Nombre del cliente)', nicho: '(Nicho)', resultado: '(Una línea con el resultado)', url: '' },
    { nombre: '(Nombre del cliente)', nicho: '(Nicho)', resultado: '(Una línea con el resultado)', url: '' },
  ],
};
