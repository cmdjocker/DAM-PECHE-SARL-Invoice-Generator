
export interface Product {
  id: string;
  name: string;
  latinName?: string;
  defaultSymbol: 'C' | 'P';
}

export interface InvoiceItem {
  id: string;
  productId: string;
  customName?: string;
  quantity: number;
  symbol: string;
  brutWeight: number;
  netWeight: number;
  unitPrice: number;
}

export interface Client {
  id: string;
  name: string;
  address: string;
}

export interface Transporter {
  id: string;
  name: string;
  address: string;
}

export interface InvoiceData {
  invoiceNumber: string;
  date: string;
  clientId: string;
  clientAddress: string;
  transport: string;
  transportAddress?: string; // Added to store transporter address
  trailer: string;
  exchangeRate: number;
  incoterm: string;
  items: InvoiceItem[];
  // New fields for transport invoice
  transportInvoiceNumber?: string;
  transportAmount?: number;
  trajetRuta?: string; // Added for transport route
  isTransportValidated?: boolean; // Added for transport validation state
  // Manual field for Note d'embarquement
  noteChargeur?: string;
  cargadorAgente?: string; // Added for Note de navire
}

export interface AIParsedItem {
  fishNameSuggestion?: string;
  quantity: number;
  symbol?: string;
  brutWeight: number;
  netWeight: number;
  unitPrice: number;
}