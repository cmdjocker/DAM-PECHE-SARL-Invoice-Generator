
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

export interface InvoiceData {
  invoiceNumber: string;
  date: string;
  clientId: string;
  clientAddress: string;
  transport: string;
  trailer: string;
  exchangeRate: number;
  incoterm: string;
  items: InvoiceItem[];
  // New fields for transport invoice
  transportInvoiceNumber?: string;
  transportAmount?: number;
}

export interface AIParsedItem {
  fishNameSuggestion?: string;
  quantity: number;
  symbol?: string;
  brutWeight: number;
  netWeight: number;
  unitPrice: number;
}
