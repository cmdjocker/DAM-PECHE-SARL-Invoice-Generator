
import { Product, Client } from './types';

export const DEFAULT_PRODUCTS: Product[] = [
    { id: '1', name: "ABADEJO", latinName: "EPINEPHELUS ALEXANDRINUS", defaultSymbol: "C" },
    { id: '2', name: "ABARDILLO", latinName: "POLYPRION AMERICANUS", defaultSymbol: "C" },
    { id: '3', name: "ACEDIAS", latinName: "DICOLOGLOSSA SPP", defaultSymbol: "C" },
    { id: '4', name: "ATUN ROJO", latinName: "THUNNUS THYNNUS", defaultSymbol: "C" },
    { id: '5', name: "BESUGO.PINTA", latinName: "PAGELLUS BOGARAVEO", defaultSymbol: "C" },
    { id: '6', name: "BONITO", latinName: "SARDA SARDA", defaultSymbol: "C" },
    { id: '7', name: "BOQUERONES", latinName: "ENGRAULIS ENCRASICOLUS", defaultSymbol: "C" },
    { id: '8', name: "BRECA", latinName: "PAGELLUS ERYTHRINUS", defaultSymbol: "C" },
    { id: '9', name: "BROTOLA", latinName: "PHYCIS PHYCIS", defaultSymbol: "C" },
    { id: '10', name: "CACHUCHU", latinName: "DENTEX MACROPHTALMUS", defaultSymbol: "C" },
    { id: '11', name: "CAZON", latinName: "GALEORHINUS GALEUS", defaultSymbol: "C" },
    { id: '12', name: "CHAMA", latinName: "DENTEX GIBBOSUS", defaultSymbol: "C" },
    { id: '13', name: "CHARGHO", latinName: "DIPLODUS SARGUS", defaultSymbol: "C" },
    { id: '14', name: "CORBINA", latinName: "ARGYROSOMUS REGIUS", defaultSymbol: "C" },
    { id: '15', name: "DORADA", latinName: "SPARUS AURATA", defaultSymbol: "C" },
    { id: '16', name: "F.GALLO", latinName: "ZENOPSIS CONCHIFER", defaultSymbol: "C" },
    { id: '17', name: "GALLO", latinName: "ZEUS FABER", defaultSymbol: "C" },
    { id: '18', name: "GALLINETA", latinName: "HELICOLENUS DACTYLOPTERUS", defaultSymbol: "C" },
    { id: '19', name: "HERRERA", latinName: "PAGELLUS MORMYRUS", defaultSymbol: "C" },
    { id: '20', name: "LENGUADO", latinName: "SOLEA VULGARIS", defaultSymbol: "C" },
    { id: '21', name: "MARRAJO", latinName: "ISURUS OXYRHINCHUS", defaultSymbol: "C" },
    { id: '22', name: "MELVA", latinName: "AUXIS THAZARD", defaultSymbol: "C" },
    { id: '23', name: "MERLUZA", latinName: "MERLUCCIUS MERLUCCIUS", defaultSymbol: "C" },
    { id: '24', name: "MERO", latinName: "EPINEPHELUS GUAZA", defaultSymbol: "C" },
    { id: '25', name: "PALOMETA NEGRA", latinName: "BRAMA BRAMA", defaultSymbol: "C" },
    { id: '26', name: "PALOMETA ROJA", latinName: "BERYX DECADACTYLUS", defaultSymbol: "C" },
    { id: '27', name: "PAMPANO", latinName: "HYPEROGLYPHE SPP", defaultSymbol: "C" },
    { id: '28', name: "PARGO", latinName: "PAGRUS PAGRUS", defaultSymbol: "C" },
    { id: '29', name: "PELUA", latinName: "CITHARUS LINGATULA", defaultSymbol: "C" },
    { id: '30', name: "PEZ.LIMON", latinName: "SERIOLA DUMERILI", defaultSymbol: "P" },
    { id: '31', name: "PEZ.ESPADA", latinName: "XIPHIAS GLADIUS", defaultSymbol: "C" },
    { id: '32', name: "RAPE", latinName: "LOPHIUS PISCATORIUS", defaultSymbol: "C" },
    { id: '33', name: "RASCASSE", latinName: "SCORPAENA PORCUS", defaultSymbol: "C" },
    { id: '34', name: "RAYA", latinName: "RAJA SPP", defaultSymbol: "C" },
    { id: '35', name: "ROBALO", latinName: "DICENTRARCHUS LABRAX", defaultSymbol: "C" },
    { id: '36', name: "RODABALLO", latinName: "PSETTA MAXIMA", defaultSymbol: "C" },
    { id: '37', name: "SABLE", latinName: "LEPIDOPUS CAUDATUS", defaultSymbol: "C" },
    { id: '38', name: "SAFIO", latinName: "CONGER CONGER", defaultSymbol: "C" },
    { id: '39', name: "SALMONETE", latinName: "MULLUS SURMULETUS", defaultSymbol: "C" },
    { id: '40', name: "ALMENDRITAS", latinName: "SEPIA ELEGANS", defaultSymbol: "C" },
    { id: '41', name: "CALAMARS", latinName: "LOLIGO VULGARIS", defaultSymbol: "C" },
    { id: '42', name: "CHOCOS", latinName: "SEPIA OFFICINALIS", defaultSymbol: "C" },
    { id: '43', name: "PUNTILLAS", latinName: "ALLOTEUTHIS MEDIA", defaultSymbol: "C" }
];

export const DEFAULT_CLIENTS: Client[] = [
    { id: 'c1', name: "APERITIVOS INAKI S.L", address: "Avda. Canteras 23/25 28343 Valdemoro Madrid Espagne" },
    { id: 'c2', name: "PESCNORT MAR SL", address: "C/MASET N° 4   46460  SILLA       VALENCIA           ESPAGNE" },
    { id: 'c3', name: "PETACA CHICO SL", address: "CONIL   (CADIZ)          ESPAGNE" }
];

export const INCOTERMS = [
    "EXW", "FCA", "CPT", "CIP", "DAP", "DPU", "DDP", "FAS", "FOB", "CFR", "CIF"
];

export const TRANSPORTS = ["DAMJI TRANS SARL", "TRANSPORT MOUNIR", "MARTRANS"];
