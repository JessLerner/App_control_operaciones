import { MarcaAuto, ModeloPlanItem, EquipoVenta, ReferenceData } from '../types';

export const MARCAS_DISPONIBLES: MarcaAuto[] = [
  'RENAULT',
  'PEUGEOT',
  'JEEP',
  'LEAPMOTOR',
  'FIAT',
  'CITROEN',
];

export const INITIAL_MODELOS_Y_PRECIOS: ModeloPlanItem[] = [
  // --- FIAT ---
  { marca: 'FIAT', modelo: 'Cronos Drive 1.3 GSE', tipoPlan: '100%', valorCuota1: 295000, ctaFabrica: 268000 },
  { marca: 'FIAT', modelo: 'Cronos Drive 1.3 GSE', tipoPlan: '80/20', valorCuota1: 245000, ctaFabrica: 222000 },
  { marca: 'FIAT', modelo: 'Cronos Drive 1.3 GSE', tipoPlan: '70/30', valorCuota1: 215000, ctaFabrica: 195000 },
  { marca: 'FIAT', modelo: 'Cronos Precision 1.3 CVT', tipoPlan: '100%', valorCuota1: 340000, ctaFabrica: 309000 },
  { marca: 'FIAT', modelo: 'Cronos Precision 1.3 CVT', tipoPlan: '80/20', valorCuota1: 280000, ctaFabrica: 254000 },
  { marca: 'FIAT', modelo: 'Strada Freedom 1.3 CD', tipoPlan: '100%', valorCuota1: 310000, ctaFabrica: 282000 },
  { marca: 'FIAT', modelo: 'Strada Freedom 1.3 CD', tipoPlan: '80/20', valorCuota1: 260000, ctaFabrica: 236000 },
  { marca: 'FIAT', modelo: 'Pulse Drive 1.3 MT', tipoPlan: '100%', valorCuota1: 335000, ctaFabrica: 304000 },
  { marca: 'FIAT', modelo: 'Pulse Drive 1.3 MT', tipoPlan: '80/20', valorCuota1: 275000, ctaFabrica: 250000 },
  { marca: 'FIAT', modelo: 'Pulse Drive 1.3 MT', tipoPlan: '70/30', valorCuota1: 240000, ctaFabrica: 218000 },
  { marca: 'FIAT', modelo: 'Pulse Audace 1.0T CVT', tipoPlan: '80/20', valorCuota1: 315000, ctaFabrica: 286000 },
  { marca: 'FIAT', modelo: 'Fastback Audace 1.0T CVT', tipoPlan: '100%', valorCuota1: 390000, ctaFabrica: 354000 },
  { marca: 'FIAT', modelo: 'Fastback Audace 1.0T CVT', tipoPlan: '80/20', valorCuota1: 320000, ctaFabrica: 290000 },
  { marca: 'FIAT', modelo: 'Toro Freedom 1.8 AT6', tipoPlan: '100%', valorCuota1: 420000, ctaFabrica: 382000 },
  { marca: 'FIAT', modelo: 'Toro Freedom 1.8 AT6', tipoPlan: '80/20', valorCuota1: 350000, ctaFabrica: 318000 },
  { marca: 'FIAT', modelo: 'Toro Freedom 1.8 AT6', tipoPlan: '70/30', valorCuota1: 305000, ctaFabrica: 277000 },
  { marca: 'FIAT', modelo: 'Fiorino Endurance 1.4', tipoPlan: '100%', valorCuota1: 270000, ctaFabrica: 245000 },
  { marca: 'FIAT', modelo: 'Fiorino Endurance 1.4', tipoPlan: '80/20', valorCuota1: 225000, ctaFabrica: 204000 },

  // --- PEUGEOT ---
  { marca: 'PEUGEOT', modelo: '208 Active 1.6', tipoPlan: '100%', valorCuota1: 298000, ctaFabrica: 271000 },
  { marca: 'PEUGEOT', modelo: '208 Active 1.6', tipoPlan: '80/20', valorCuota1: 248000, ctaFabrica: 225000 },
  { marca: 'PEUGEOT', modelo: '208 Active 1.6', tipoPlan: '70/30', valorCuota1: 218000, ctaFabrica: 198000 },
  { marca: 'PEUGEOT', modelo: '208 Allure T200 AT', tipoPlan: '100%', valorCuota1: 355000, ctaFabrica: 322000 },
  { marca: 'PEUGEOT', modelo: '208 Allure T200 AT', tipoPlan: '80/20', valorCuota1: 295000, ctaFabrica: 268000 },
  { marca: 'PEUGEOT', modelo: '2008 Allure T200 AT', tipoPlan: '100%', valorCuota1: 385000, ctaFabrica: 350000 },
  { marca: 'PEUGEOT', modelo: '2008 Allure T200 AT', tipoPlan: '80/20', valorCuota1: 318000, ctaFabrica: 289000 },
  { marca: 'PEUGEOT', modelo: '2008 Allure T200 AT', tipoPlan: '70/30', valorCuota1: 279000, ctaFabrica: 253000 },
  { marca: 'PEUGEOT', modelo: 'Partner Furgón Confort 1.6', tipoPlan: '100%', valorCuota1: 325000, ctaFabrica: 295000 },
  { marca: 'PEUGEOT', modelo: 'Partner Furgón Confort 1.6', tipoPlan: '80/20', valorCuota1: 270000, ctaFabrica: 245000 },

  // --- RENAULT ---
  { marca: 'RENAULT', modelo: 'Sandero Life 1.6', tipoPlan: '100%', valorCuota1: 285000, ctaFabrica: 259000 },
  { marca: 'RENAULT', modelo: 'Sandero Life 1.6', tipoPlan: '80/20', valorCuota1: 238000, ctaFabrica: 216000 },
  { marca: 'RENAULT', modelo: 'Sandero Life 1.6', tipoPlan: '75/25', valorCuota1: 220000, ctaFabrica: 200000 },
  { marca: 'RENAULT', modelo: 'Stepway Zen 1.6', tipoPlan: '100%', valorCuota1: 315000, ctaFabrica: 286000 },
  { marca: 'RENAULT', modelo: 'Stepway Zen 1.6', tipoPlan: '80/20', valorCuota1: 260000, ctaFabrica: 236000 },
  { marca: 'RENAULT', modelo: 'Logan Life 1.6', tipoPlan: '100%', valorCuota1: 280000, ctaFabrica: 254000 },
  { marca: 'RENAULT', modelo: 'Logan Life 1.6', tipoPlan: '75/25', valorCuota1: 215000, ctaFabrica: 195000 },
  { marca: 'RENAULT', modelo: 'Kardian Evolution 1.0T', tipoPlan: '100%', valorCuota1: 330000, ctaFabrica: 300000 },
  { marca: 'RENAULT', modelo: 'Kardian Evolution 1.0T', tipoPlan: '80/20', valorCuota1: 275000, ctaFabrica: 250000 },
  { marca: 'RENAULT', modelo: 'Duster Intens 1.6 MT', tipoPlan: '100%', valorCuota1: 375000, ctaFabrica: 340000 },
  { marca: 'RENAULT', modelo: 'Duster Intens 1.6 MT', tipoPlan: '80/20', valorCuota1: 310000, ctaFabrica: 281000 },
  { marca: 'RENAULT', modelo: 'Duster Intens 1.6 MT', tipoPlan: '70/30', valorCuota1: 270000, ctaFabrica: 245000 },
  { marca: 'RENAULT', modelo: 'Kangoo Express 1.6 SCe', tipoPlan: '100%', valorCuota1: 345000, ctaFabrica: 313000 },
  { marca: 'RENAULT', modelo: 'Kangoo Express 1.6 SCe', tipoPlan: '75/25', valorCuota1: 268000, ctaFabrica: 243000 },
  { marca: 'RENAULT', modelo: 'Alaskan Confort 4x2 MT', tipoPlan: '100%', valorCuota1: 495000, ctaFabrica: 450000 },
  { marca: 'RENAULT', modelo: 'Alaskan Confort 4x2 MT', tipoPlan: '80/20', valorCuota1: 410000, ctaFabrica: 372000 },
  { marca: 'RENAULT', modelo: 'Alaskan Confort 4x2 MT', tipoPlan: '60/40', valorCuota1: 310000, ctaFabrica: 281000 },

  // --- JEEP ---
  { marca: 'JEEP', modelo: 'Renegade Sport 1.8 AT6', tipoPlan: '100%', valorCuota1: 395000, ctaFabrica: 359000 },
  { marca: 'JEEP', modelo: 'Renegade Sport 1.8 AT6', tipoPlan: '80/20', valorCuota1: 325000, ctaFabrica: 295000 },
  { marca: 'JEEP', modelo: 'Renegade Sport 1.8 AT6', tipoPlan: '70/30', valorCuota1: 285000, ctaFabrica: 259000 },
  { marca: 'JEEP', modelo: 'Compass Sport T270 AT6', tipoPlan: '100%', valorCuota1: 520000, ctaFabrica: 472000 },
  { marca: 'JEEP', modelo: 'Compass Sport T270 AT6', tipoPlan: '70/30', valorCuota1: 375000, ctaFabrica: 340000 },
  { marca: 'JEEP', modelo: 'Commander Limited 1.3T AT', tipoPlan: '100%', valorCuota1: 680000, ctaFabrica: 618000 },
  { marca: 'JEEP', modelo: 'Commander Limited 1.3T AT', tipoPlan: '70/30', valorCuota1: 490000, ctaFabrica: 445000 },

  // --- LEAPMOTOR ---
  { marca: 'LEAPMOTOR', modelo: 'T03 Eléctrico Urbano', tipoPlan: '100%', valorCuota1: 310000, ctaFabrica: 282000 },
  { marca: 'LEAPMOTOR', modelo: 'T03 Eléctrico Urbano', tipoPlan: '80/20', valorCuota1: 255000, ctaFabrica: 231000 },
  { marca: 'LEAPMOTOR', modelo: 'C10 SUV Eléctrico', tipoPlan: '100%', valorCuota1: 540000, ctaFabrica: 490000 },
  { marca: 'LEAPMOTOR', modelo: 'C10 SUV Eléctrico', tipoPlan: '70/30', valorCuota1: 390000, ctaFabrica: 354000 },

  // --- CITROEN ---
  { marca: 'CITROEN', modelo: 'C3 Live Pack 1.2', tipoPlan: '100%', valorCuota1: 265000, ctaFabrica: 240000 },
  { marca: 'CITROEN', modelo: 'C3 Live Pack 1.2', tipoPlan: '80/20', valorCuota1: 218000, ctaFabrica: 198000 },
  { marca: 'CITROEN', modelo: 'C3 Live Pack 1.2', tipoPlan: '70/30', valorCuota1: 195000, ctaFabrica: 177000 },
  { marca: 'CITROEN', modelo: 'C3 Feel 1.6', tipoPlan: '100%', valorCuota1: 290000, ctaFabrica: 263000 },
  { marca: 'CITROEN', modelo: 'C3 Feel 1.6', tipoPlan: '80/20', valorCuota1: 239000, ctaFabrica: 217000 },
  { marca: 'CITROEN', modelo: 'C3 Aircross Feel 5 Asientos', tipoPlan: '100%', valorCuota1: 345000, ctaFabrica: 313000 },
  { marca: 'CITROEN', modelo: 'C3 Aircross Feel 5 Asientos', tipoPlan: '80/20', valorCuota1: 285000, ctaFabrica: 259000 },
  { marca: 'CITROEN', modelo: 'C3 Aircross Shine 7 Asientos', tipoPlan: '100%', valorCuota1: 385000, ctaFabrica: 350000 },
  { marca: 'CITROEN', modelo: 'C3 Aircross Shine 7 Asientos', tipoPlan: '80/20', valorCuota1: 318000, ctaFabrica: 289000 },
  { marca: 'CITROEN', modelo: 'Basalt Feel 1.0', tipoPlan: '100%', valorCuota1: 320000, ctaFabrica: 290000 },
  { marca: 'CITROEN', modelo: 'Basalt Feel 1.0', tipoPlan: '80/20', valorCuota1: 265000, ctaFabrica: 240000 },
  { marca: 'CITROEN', modelo: 'Berlingo Furgón Business 1.6', tipoPlan: '100%', valorCuota1: 330000, ctaFabrica: 300000 },
  { marca: 'CITROEN', modelo: 'Berlingo Furgón Business 1.6', tipoPlan: '80/20', valorCuota1: 275000, ctaFabrica: 250000 },
];

export const INITIAL_EQUIPOS_DE_VENTA: EquipoVenta[] = [
  {
    supervisor: 'JUANA BENITEZ',
    vendedores: [
      'Carlos Mendoza',
      'Lucía Fernández',
      'Martín Gómez',
      'Sofía Romero',
      'Facundo Díaz',
    ],
  },
  {
    supervisor: 'ANDREA FRANCO',
    vendedores: [
      'Gabriel Benítez',
      'Valeria Morales',
      'Diego Herrera',
      'Micaela Rossi',
      'Julián Castro',
    ],
  },
  {
    supervisor: 'MARCELO TORRES',
    vendedores: [
      'Lucas Navarro',
      'Camila Ortiz',
      'Matías Pereyra',
      'Valentina Silva',
      'Agustín Blanco',
    ],
  },
  {
    supervisor: 'PATRICIA SUÁREZ',
    vendedores: [
      'Esteban Rivas',
      'Romina Duarte',
      'Franco Giménez',
      'Noelia Carrizo',
      'Gonzalo Luna',
    ],
  },
  {
    supervisor: 'MATÍAS SOSA',
    vendedores: [
      'Bautista Ramos',
      'Milagros Acosta',
      'Ignacio Ponce',
      'Carolina Medina',
    ],
  },
];

export const INITIAL_ORIGENES_DATOS: string[] = [
  'Base de datos',
  'Meta (Instagram / Facebook)',
  'Prospect',
  'Referido',
  'Salón (Showroom)',
  'Stand (Shopping / Eventos)',
  'Subite',
  'Google Ads',
  'TikTok',
  'WhatsApp Campaña',
  'Llamada Saliente',
  'Reactivación Cartera',
];

export const INITIAL_REFERENCE_DATA: ReferenceData = {
  modelosYPrecios: INITIAL_MODELOS_Y_PRECIOS,
  equiposDeVenta: INITIAL_EQUIPOS_DE_VENTA,
  origenesDatos: INITIAL_ORIGENES_DATOS,
  lastUpdated: new Date().toISOString(),
  isCustomUrl: false,
};
