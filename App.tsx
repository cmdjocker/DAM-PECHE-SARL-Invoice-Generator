import React, { useState, useMemo, useEffect } from 'react';
import { 
    FileText, 
    Trash2, 
    Download, 
    Search, 
    Zap, 
    Hash,
    Package,
    PlusCircle,
    X,
    Truck,
    LayoutDashboard,
    ClipboardList,
    Ship,
    TrendingUp,
    CheckCircle2,
    AlertTriangle,
    Printer,
    RefreshCcw,
    RotateCcw,
    FileSignature,
    Euro,
    FileDigit
} from 'lucide-react';
import { 
    DEFAULT_PRODUCTS, 
    DEFAULT_CLIENTS, 
    INCOTERMS, 
    TRANSPORTS 
} from './constants';
import { InvoiceData, InvoiceItem, Product, Client, AIParsedItem } from './types';
import { generateInvoicePDF, generateCMRPDF, generateNoteNavirePDF, generateTransportInvoicePDF } from './services/pdfService';
import { parseShipmentData } from './services/geminiService';

const formatWeight = (val: number) => {
    return new Intl.NumberFormat('de-DE', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(val);
};

const formatEuro = (val: number) => {
    return new Intl.NumberFormat('de-DE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(val);
};

const MOLLUSK_NAMES = ['ALMENDRITAS', 'CALAMARS', 'CHOCOS', 'PUNTILLAS'];

const normalizeNum = (val: string): number => {
    if (typeof val !== 'string') return 0;
    const sanitized = val.replace(',', '.');
    return isNaN(parseFloat(sanitized)) ? 0 : parseFloat(sanitized);
};

const numberToWordsFR = (num: number): string => {
    if (num === 1500) return 'MILLE CINQ CENTS';
    if (num === 1200) return 'MILLE DEUX CENTS';
    return num.toString() + ' EUROS';
};

const App: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'FACTURE' | 'CMR' | 'NOTE' | 'TRANS'>('FACTURE');
    const [isValidated, setIsValidated] = useState(false);
    const [invoice, setInvoice] = useState<InvoiceData>({
        invoiceNumber: '',
        date: new Date().toISOString().split('T')[0],
        clientId: DEFAULT_CLIENTS[0].name,
        clientAddress: DEFAULT_CLIENTS[0].address,
        transport: TRANSPORTS[0],
        trailer: '',
        exchangeRate: 10.47,
        incoterm: 'FOB',
        items: [],
        transportInvoiceNumber: '',
        transportAmount: 0
    });

    const [products, setProducts] = useState<Product[]>(() => {
        const saved = localStorage.getItem('dam_peche_products');
        return saved ? JSON.parse(saved) : DEFAULT_PRODUCTS;
    });

    const [clients, setClients] = useState<Client[]>(() => {
        const saved = localStorage.getItem('dam_peche_clients');
        return saved ? JSON.parse(saved) : DEFAULT_CLIENTS;
    });

    const [transports, setTransports] = useState<string[]>(() => {
        const saved = localStorage.getItem('dam_peche_transports');
        return saved ? JSON.parse(saved) : TRANSPORTS;
    });

    const [smartInput, setSmartInput] = useState('');
    const [isParsing, setIsParsing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [modalMode, setModalMode] = useState<'none' | 'product' | 'client' | 'transport'>('none');
    
    const [newProd, setNewProd] = useState({ name: '', latin: '', symbol: 'C' as 'C' | 'P' });
    const [newClient, setNewClient] = useState({ name: '', address: '' });
    const [newTransport, setNewTransport] = useState('');

    useEffect(() => {
        localStorage.setItem('dam_peche_products', JSON.stringify(products));
    }, [products]);

    useEffect(() => {
        localStorage.setItem('dam_peche_clients', JSON.stringify(clients));
    }, [clients]);

    useEffect(() => {
        localStorage.setItem('dam_peche_transports', JSON.stringify(transports));
    }, [transports]);

    const filteredProducts = useMemo(() => {
        if (!searchTerm.trim()) return [];
        return products.filter(p => 
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            p.latinName?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [products, searchTerm]);

    const sortedItems = useMemo(() => {
        return [...invoice.items].sort((a, b) => {
            const prodA = products.find(p => p.id === a.productId)?.name || '';
            const prodB = products.find(p => p.id === b.productId)?.name || '';
            return prodA.localeCompare(prodB);
        });
    }, [invoice.items, products]);

    const totals = useMemo(() => {
        return sortedItems.reduce((acc, item) => {
            const amount = item.netWeight * item.unitPrice;
            return {
                brut: acc.brut + item.brutWeight,
                net: acc.net + item.netWeight,
                qty: acc.qty + item.quantity,
                eur: acc.eur + amount
            };
        }, { brut: 0, net: 0, qty: 0, eur: 0 });
    }, [sortedItems]);

    const totalQtySymbol = useMemo(() => {
        if (invoice.items.length === 0) return '';
        return invoice.items.every(i => i.symbol === 'P') ? 'P' : 'C';
    }, [invoice.items]);

    const plasticWeight = useMemo(() => (totals.brut * 0.006).toFixed(2), [totals.brut]);

    const hasWeightError = useMemo(() => {
        return totals.net > totals.brut || sortedItems.some(item => item.netWeight > item.brutWeight);
    }, [totals, sortedItems]);

    const handleClientChange = (name: string) => {
        const client = clients.find(c => c.name === name);
        setInvoice(prev => ({
            ...prev,
            clientId: name,
            clientAddress: client?.address || ''
        }));
    };

    const addItem = (product: Product) => {
        const newItem: InvoiceItem = {
            id: Math.random().toString(36).substr(2, 9),
            productId: product.id,
            quantity: 0,
            symbol: product.defaultSymbol,
            brutWeight: 0,
            netWeight: 0,
            unitPrice: 0
        };
        setInvoice(prev => ({ ...prev, items: [...prev.items, newItem] }));
        setSearchTerm('');
        setIsValidated(false);
    };

    const addCustomProduct = () => {
        if (!newProd.name) return;
        const p: Product = {
            id: Math.random().toString(36).substr(2, 9),
            name: newProd.name.toUpperCase(),
            latinName: newProd.latin.toUpperCase(),
            defaultSymbol: newProd.symbol as 'C' | 'P'
        };
        setProducts(prev => [p, ...prev]);
        setNewProd({ name: '', latin: '', symbol: 'C' });
        setModalMode('none');
    };

    const addCustomClient = () => {
        if (!newClient.name) return;
        const c: Client = {
            id: Math.random().toString(36).substr(2, 9),
            name: newClient.name.toUpperCase(),
            address: newClient.address
        };
        setClients(prev => [...prev, c]);
        setNewClient({ name: '', address: '' });
        setModalMode('none');
        handleClientChange(c.name);
    };

    const addCustomTransport = () => {
        if (!newTransport) return;
        setTransports(prev => [...prev, newTransport.toUpperCase()]);
        setInvoice(prev => ({ ...prev, transport: newTransport.toUpperCase() }));
        setNewTransport('');
        setModalMode('none');
    };

    const removeItem = (id: string) => {
        setInvoice(prev => ({ ...prev, items: prev.items.filter(item => item.id !== id) }));
        setIsValidated(false);
    };

    const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
        setInvoice(prev => ({
            ...prev,
            items: prev.items.map(item => item.id === id ? { ...item, [field]: value } : item)
        }));
        setIsValidated(false);
    };

    const handleSmartParse = async () => {
        if (!smartInput.trim()) return;
        setIsParsing(true);
        const parsedItems: AIParsedItem[] = await parseShipmentData(smartInput);
        const newItems: InvoiceItem[] = parsedItems.map(p => {
            const match = products.find(prod => 
                prod.name.toLowerCase().includes(p.fishNameSuggestion?.toLowerCase() || '')
            );
            return {
                id: Math.random().toString(36).substr(2, 9),
                productId: match?.id || (products.length > 0 ? products[0].id : 'default'),
                quantity: p.quantity || 0,
                symbol: (p.symbol as 'C' | 'P') || 'C',
                brutWeight: p.brutWeight || 0,
                netWeight: p.netWeight || 0,
                unitPrice: p.unitPrice || 0
            };
        });
        setInvoice(prev => ({ ...prev, items: [...prev.items, ...newItems] }));
        setSmartInput('');
        setIsParsing(false);
        setIsValidated(false);
    };

    const handleValidate = () => {
        setIsValidated(true);
        const previewEl = document.getElementById('preview-section');
        if (previewEl) {
            previewEl.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const handleReset = () => {
        if (window.confirm("Voulez-vous vraiment réinitialiser le document ?")) {
            setIsValidated(false);
            setActiveTab('FACTURE');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleExport = () => {
        const sortedInvoice = { ...invoice, items: sortedItems };
        generateInvoicePDF(sortedInvoice, products);
    };

    const handleExportCMR = () => {
        const sortedInvoice = { ...invoice, items: sortedItems };
        generateCMRPDF(sortedInvoice, products);
    };

    const handleExportNote = () => {
        const sortedInvoice = { ...invoice, items: sortedItems };
        generateNoteNavirePDF(sortedInvoice, products);
    };

    const handleExportTransport = () => {
        generateTransportInvoicePDF(invoice);
    };

    const docDesignation = useMemo(() => {
        const speciesNames: string[] = [];
        let hasMollusk = false;
        invoice.items.forEach(i => {
            const p = products.find(prod => prod.id === i.productId);
            if (p) {
                speciesNames.push(p.name);
                if (MOLLUSK_NAMES.includes(p.name.toUpperCase())) {
                    hasMollusk = true;
                }
            }
        });
        const unique = Array.from(new Set(speciesNames));
        if (unique.length === 1) return unique[0] + " FRAIS";
        return hasMollusk ? "POISSONS ET MOLLUSQUES FRAIS" : "POISSONS FRAIS";
    }, [invoice.items, products]);

    const destinationCity = useMemo(() => {
        const parts = invoice.clientAddress.split(' ');
        return parts[parts.length - 2] || 'CONIL';
    }, [invoice.clientAddress]);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
            <header className="bg-slate-900 text-white p-6 shadow-lg no-print">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-500 p-2 rounded-lg shadow-inner">
                            <FileText className="w-8 h-8" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">DAM PECHE SARL</h1>
                            <p className="text-blue-400 text-sm font-medium tracking-wide">Designed by Abdellah</p>
                        </div>
                    </div>
                </div>
            </header>

            <nav className="bg-white border-b no-print sticky top-0 z-40 shadow-sm">
                <div className="max-w-7xl mx-auto flex overflow-x-auto px-4 md:px-8 scrollbar-hide">
                    {[
                        { id: 'FACTURE', label: 'FACTURE', icon: LayoutDashboard },
                        { id: 'CMR', label: 'CMR', icon: Truck },
                        { id: 'NOTE', label: 'NOTE DE NAVIRE', icon: Ship },
                        { id: 'TRANS', label: 'FACTURE TRANSPORT', icon: TrendingUp },
                    ].map(tab => (
                        <button 
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-6 py-4 text-sm font-bold transition-all border-b-4 whitespace-nowrap ${activeTab === tab.id ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </nav>

            <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8 space-y-8">
                {activeTab === 'FACTURE' ? (
                    <>
                        <section className="no-print flex justify-center">
                            <div className="bg-white p-8 rounded-2xl shadow-md border-t-8 border-indigo-600 w-full max-w-5xl space-y-6">
                                <div className="flex items-center justify-center gap-3 text-indigo-800 font-black uppercase tracking-widest text-2xl">
                                    <Hash className="w-8 h-8 text-indigo-500" />
                                    Configuration Générale
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Facture N°</label>
                                        <input type="text" placeholder="Ex: 5212/25" value={invoice.invoiceNumber} onChange={e => setInvoice(prev => ({...prev, invoiceNumber: e.target.value}))} className="w-full px-4 py-2 border-2 border-slate-100 rounded-xl focus:border-indigo-500 outline-none transition-all font-semibold" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Date</label>
                                        <input type="date" value={invoice.date} onChange={e => setInvoice(prev => ({...prev, date: e.target.value}))} className="w-full px-4 py-2 border-2 border-slate-100 rounded-xl focus:border-indigo-500 outline-none transition-all font-semibold" />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex justify-between items-center">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Client</label>
                                            <button onClick={() => setModalMode('client')} className="text-[10px] text-indigo-600 font-black hover:underline underline-offset-2">NOUVEAU</button>
                                        </div>
                                        <select value={invoice.clientId} onChange={e => handleClientChange(e.target.value)} className="w-full px-4 py-2 border-2 border-slate-100 rounded-xl focus:border-indigo-500 outline-none transition-all font-semibold">
                                            {clients.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1 md:col-span-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Adresse Livraison</label>
                                        <input type="text" value={invoice.clientAddress} onChange={e => setInvoice(prev => ({...prev, clientAddress: e.target.value}))} className="w-full px-4 py-2 border-2 border-slate-100 rounded-xl focus:border-indigo-500 outline-none text-sm font-medium" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 md:col-span-1">
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Incoterm</label>
                                            <select value={invoice.incoterm} onChange={e => setInvoice(prev => ({...prev, incoterm: e.target.value}))} className="w-full px-4 py-2 border-2 border-slate-100 rounded-xl focus:border-indigo-500 outline-none font-black text-indigo-900">
                                                {INCOTERMS.map(i => <option key={i} value={i}>{i}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Taux Change</label>
                                            <input type="text" defaultValue={invoice.exchangeRate.toString().replace('.', ',')} onBlur={e => setInvoice(prev => ({...prev, exchangeRate: normalizeNum(e.target.value)}))} className="w-full px-4 py-2 border-2 border-slate-100 rounded-xl focus:border-indigo-500 outline-none font-semibold" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 md:col-span-3 lg:col-span-2">
                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center">
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Transport</label>
                                                <button onClick={() => setModalMode('transport')} className="text-[10px] text-indigo-600 font-black hover:underline">MODIFIER</button>
                                            </div>
                                            <select value={invoice.transport} onChange={e => setInvoice(prev => ({...prev, transport: e.target.value}))} className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl focus:border-indigo-500 outline-none font-black text-indigo-900">
                                                {transports.map(t => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-tighter text-indigo-600">Matricule</label>
                                            <input type="text" placeholder="Matricule Camion" value={invoice.trailer} onChange={e => setInvoice(prev => ({...prev, trailer: e.target.value}))} className="w-full px-6 py-3 border-2 border-slate-200 rounded-xl focus:border-indigo-500 outline-none font-black text-xl text-indigo-900 placeholder:font-normal placeholder:text-slate-300 shadow-sm" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4 no-print">
                            <div className="flex items-center gap-2 text-slate-800 font-black uppercase tracking-widest text-sm border-b pb-3">
                                <Package className="w-5 h-5 text-blue-500" />
                                Recherche Espèces
                            </div>
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                <input 
                                    type="text" 
                                    placeholder="Rechercher une espèce (Ex: Crevette) et appuyez sur ENTRÉE pour ajouter" 
                                    value={searchTerm} 
                                    onChange={e => setSearchTerm(e.target.value)} 
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && filteredProducts.length > 0) {
                                            addItem(filteredProducts[0]);
                                        }
                                    }}
                                    className="w-full pl-12 pr-4 py-4 border-2 border-slate-100 rounded-xl focus:border-blue-500 outline-none text-lg font-medium shadow-sm transition-all" 
                                />
                            </div>
                            {searchTerm && (
                                <div className="max-h-64 overflow-y-auto border-2 border-slate-50 rounded-xl divide-y bg-slate-50 shadow-inner">
                                    {filteredProducts.length > 0 ? filteredProducts.map(p => (
                                        <button key={p.id} onClick={() => addItem(p)} className="w-full text-left px-5 py-4 hover:bg-white flex justify-between items-center transition-all group">
                                            <div>
                                                <span className="font-bold text-slate-800 group-hover:text-blue-600 text-lg">{p.name}</span>
                                                <span className="text-sm text-slate-400 italic ml-3">({p.latinName})</span>
                                            </div>
                                            <PlusCircle className="w-6 h-6 text-slate-200 group-hover:text-blue-500 transition-colors" />
                                        </button>
                                    )) : (
                                        <div className="p-4 text-center text-slate-400 font-medium">Aucun résultat trouvé...</div>
                                    )}
                                </div>
                            )}
                        </section>

                        <section className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden no-print">
                            <div className="bg-slate-50/80 backdrop-blur-sm p-5 border-b flex justify-between items-center">
                                <h2 className="font-black text-slate-700 uppercase text-xs tracking-widest flex items-center gap-2">
                                    <ClipboardList className="w-5 h-5 text-indigo-500" /> Lignes de Facture
                                </h2>
                                <button onClick={() => setModalMode('product')} className="flex items-center gap-2 bg-slate-200 hover:bg-indigo-100 hover:text-indigo-700 text-slate-700 px-4 py-2 rounded-xl text-xs font-black transition-all uppercase">
                                    <PlusCircle className="w-4 h-4" />
                                    NOUVEAU PRODUIT
                                </button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 text-slate-400 text-[10px] uppercase tracking-widest font-black border-b">
                                            <th className="px-6 py-4">Désignation Espèce</th>
                                            <th className="px-6 py-4 w-36">Quantité</th>
                                            <th className="px-6 py-4 w-28 text-center text-indigo-600">P. Brut (KG)</th>
                                            <th className="px-6 py-4 w-28 text-center text-indigo-600">P. Net (KG)</th>
                                            <th className="px-6 py-4 w-32">P. Unit (EUR)</th>
                                            <th className="px-6 py-4 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {sortedItems.length > 0 ? sortedItems.map(item => {
                                            const prod = products.find(p => p.id === item.productId);
                                            const lineError = item.netWeight > item.brutWeight && item.brutWeight > 0;
                                            return (
                                                <tr key={item.id} className={`group transition-colors ${lineError ? 'bg-red-50' : 'hover:bg-blue-50/30'}`}>
                                                    <td className="px-6 py-4">
                                                        <div className="font-black text-slate-900 group-hover:text-indigo-900 flex items-center gap-2">
                                                            {prod?.name}
                                                            {lineError && <AlertTriangle className="w-4 h-4 text-red-500" />}
                                                        </div>
                                                        <div className="text-[10px] text-slate-400 font-medium group-hover:text-indigo-400">{prod?.latinName}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-1">
                                                            <input type="text" defaultValue={item.quantity === 0 ? '' : item.quantity.toString().replace('.', ',')} onBlur={e => updateItem(item.id, 'quantity', normalizeNum(e.target.value))} className="w-16 border-2 border-slate-100 rounded px-2 py-1 text-center font-bold focus:border-indigo-400 outline-none" />
                                                            <select value={item.symbol} onChange={e => updateItem(item.id, 'symbol', e.target.value)} className="text-[10px] font-black bg-slate-100 rounded px-2 py-1.5 cursor-pointer hover:bg-slate-200">
                                                                <option value="C">C</option>
                                                                <option value="P">P</option>
                                                            </select>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <input type="text" defaultValue={item.brutWeight === 0 ? '' : item.brutWeight.toString().replace('.', ',')} onBlur={e => updateItem(item.id, 'brutWeight', normalizeNum(e.target.value))} className={`w-full border-2 rounded px-2 py-1 text-center font-medium outline-none ${lineError ? 'border-red-300 bg-red-50' : 'border-slate-100 focus:border-indigo-400'}`} />
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <input type="text" defaultValue={item.netWeight === 0 ? '' : item.netWeight.toString().replace('.', ',')} onBlur={e => updateItem(item.id, 'netWeight', normalizeNum(e.target.value))} className={`w-full border-2 rounded px-2 py-1 text-center font-medium outline-none ${lineError ? 'border-red-500 bg-white text-red-600 font-bold' : 'border-slate-100 focus:border-indigo-400'}`} />
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <input type="text" defaultValue={item.unitPrice === 0 ? '' : item.unitPrice.toString().replace('.', ',')} onBlur={e => updateItem(item.id, 'unitPrice', normalizeNum(e.target.value))} className="w-full border-2 border-slate-200 rounded px-2 py-1 font-black text-blue-600 focus:border-indigo-400 outline-none" />
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button onClick={() => removeItem(item.id)} className="p-2 text-slate-300 hover:text-red-500 transition-all hover:bg-red-50 rounded-lg"><Trash2 className="w-5 h-5" /></button>
                                                    </td>
                                                </tr>
                                            );
                                        }) : (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-medium">Aucun produit ajouté à la facture. Utilisez la barre de recherche ci-dessus pour commencer.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        <div className="flex flex-col md:flex-row justify-center gap-6 no-print pb-10">
                            <button onClick={handleValidate} className="flex items-center justify-center gap-3 bg-slate-800 hover:bg-black text-white px-10 py-5 rounded-2xl font-black text-xl transition-all shadow-xl active:scale-95 uppercase tracking-widest border-b-4 border-slate-600">
                                <CheckCircle2 className={`w-7 h-7 ${isValidated ? 'text-green-400' : 'text-slate-400'}`} />
                                VALIDER
                            </button>
                            <button onClick={handleExport} className="flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white px-12 py-5 rounded-2xl font-black text-xl transition-all shadow-2xl active:scale-95 uppercase tracking-widest border-b-4 border-blue-800">
                                <Download className="w-7 h-7" />
                                EXPORTER PDF
                            </button>
                        </div>

                        {hasWeightError && (
                            <div className="max-w-4xl mx-auto no-print">
                                <div className="bg-red-600 text-white p-4 rounded-xl shadow-lg flex items-center gap-4 animate-bounce">
                                    <AlertTriangle className="w-8 h-8 shrink-0" />
                                    <div>
                                        <h4 className="font-black text-lg">ALERTE: POIDS NET SUPÉRIEUR AU POIDS BRUT !</h4>
                                        <p className="text-sm font-medium opacity-90">Veuillez vérifier les saisies dans le tableau.</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <section id="preview-section" className="bg-slate-300 p-10 rounded-3xl shadow-2xl hidden md:block border-8 border-slate-200/50">
                            <div className="max-w-4xl mx-auto bg-white p-16 rounded-lg shadow-2xl relative overflow-hidden min-h-[1100px] border">
                                <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] font-black px-6 py-2 rounded-bl-2xl uppercase tracking-[0.2em]">Aperçu Réel</div>
                                <div className="text-center space-y-1 mb-12" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
                                    <h3 className="text-6xl font-bold text-slate-900 leading-none">DAM PECHE S.A.R.L</h3>
                                    <div className="text-[13px] font-bold text-slate-800 space-y-1 pt-4 uppercase">
                                        <p>EXPORTATION DE POISSONS FRAIS ET CONGELES</p>
                                        <p>RC 17845 | AGREMENT 1048 | ICE 001531533000097</p>
                                        <p>SIEGE SOCIAL: PORT DE PECHE TANGER</p>
                                    </div>
                                </div>
                                <div className="flex justify-end mb-4">
                                    <p className="text-sm text-slate-900 font-bold uppercase underline decoration-2 underline-offset-8">Tanger, Le: {new Date(invoice.date).toLocaleDateString('fr-FR')}</p>
                                </div>
                                <div className="flex justify-center mb-8 border-b-2 border-slate-900 pb-6">
                                    <div className="text-3xl font-bold uppercase tracking-[0.3em] underline decoration-2 underline-offset-[12px]">FACTURE N° {invoice.invoiceNumber || '________'}</div>
                                </div>
                                <div className="flex flex-col gap-3 mb-8 text-sm">
                                    <div className="flex gap-4">
                                        <p className="font-black text-xs uppercase underline decoration-2">CLIENT:</p>
                                        <div className="font-bold text-base leading-tight">
                                            {invoice.clientId} 
                                            <span className="text-xs font-normal text-slate-600 block mt-1">{invoice.clientAddress}</span>
                                        </div>
                                    </div>
                                </div>
                                <table className="w-full text-sm mb-0 border-collapse">
                                    <thead className="bg-slate-100 text-slate-900 uppercase text-[11px] font-black border-y-2 border-slate-900">
                                        <tr>
                                            <th className="p-4 border border-slate-300">Quantité</th>
                                            <th className="p-4 border border-slate-300">P. Brut (KG)</th>
                                            <th className="p-4 border border-slate-300">P. Net (KG)</th>
                                            <th className="p-4 border border-slate-300 text-left">Designation</th>
                                            <th className="p-4 border border-slate-300 text-right">P. Unit</th>
                                            <th className="p-4 border border-slate-300 text-right">Montant (EUR)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y-2 divide-slate-200">
                                        {sortedItems.map(item => {
                                            const p = products.find(pr => pr.id === item.productId);
                                            return (
                                                <tr key={item.id} className="border border-slate-200">
                                                    <td className="p-4 text-right font-bold text-slate-900">{formatWeight(item.quantity)} {item.symbol}</td>
                                                    <td className="p-4 text-center font-medium">{formatWeight(item.brutWeight)}</td>
                                                    <td className="p-4 text-center font-medium">{formatWeight(item.netWeight)}</td>
                                                    <td className="p-4">
                                                        <div className="leading-tight">
                                                            <span className="font-black uppercase text-slate-900 text-base">{p?.name}</span>
                                                            {p?.latinName && <span className="text-[11px] text-slate-400 ml-2 italic font-normal">({p.latinName})</span>}
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-right">{formatEuro(item.unitPrice)}</td>
                                                    <td className="p-4 text-right font-black text-slate-900">{formatEuro(item.netWeight * item.unitPrice)}</td>
                                                </tr>
                                            );
                                        })}
                                        <tr className="bg-slate-50 text-slate-900 border-2 border-slate-900 text-lg">
                                            <td className="p-5 text-right font-black border border-slate-900">{totals.qty} {totalQtySymbol}</td>
                                            <td className="p-5 text-center font-black border border-slate-900">{formatWeight(totals.brut)}</td>
                                            <td className="p-5 text-center font-black border border-slate-900">{formatWeight(totals.net)}</td>
                                            <td className="p-5 uppercase font-black text-sm border border-slate-900">TOTAL GÉNÉRAL</td>
                                            <td className="p-5 border border-slate-900"></td>
                                            <td className="p-5 text-right font-black text-indigo-700 text-3xl border border-slate-900">{formatEuro(totals.eur)} EURO</td>
                                        </tr>
                                    </tbody>
                                </table>
                                <div className="space-y-10 text-xs mt-2">
                                    <div className="text-slate-800 font-bold border-l-8 border-slate-900 pl-6 py-3 bg-slate-50 text-sm">TOTAL PESO NETO DE PLASTICO NO REUTILIZABLE: <span className="text-indigo-600">{formatWeight(parseFloat(plasticWeight))} KG NETOS</span></div>
                                    <div className="flex justify-between items-center text-3xl font-black border-t-4 border-slate-900 pt-10 uppercase tracking-tighter"><span className="text-slate-300">Valeur en Dirhams:</span><span>{formatEuro(totals.eur * invoice.exchangeRate)} DHS</span></div>
                                    <div className="grid grid-cols-2 gap-12 pt-10">
                                        <div className="space-y-6">
                                            <p><span className="text-slate-400 uppercase text-[10px] font-black">INCOTERM:</span> <span className="font-black text-base underline decoration-2">{invoice.incoterm} TANGER</span></p>
                                            <p><span className="text-slate-400 uppercase text-[10px] font-black">TRANSPORT:</span> <span className="font-black text-base underline decoration-2">{invoice.transport}</span></p>
                                            <p><span className="text-slate-400 uppercase text-[10px] font-black">MATRICULE:</span> <span className="font-black underline decoration-4 text-4xl block mt-2 text-indigo-800">{invoice.trailer}</span></p>
                                        </div>
                                        <div className="text-right space-y-3">
                                            <div className="text-[13px] font-black uppercase text-slate-900 space-y-2 border-2 border-slate-100 p-4 rounded-xl"><p className="mb-2 text-indigo-700 underline decoration-2">PAYEMENT PAR VIREMENT</p><p className="text-base">IBAN: MA64 0116 4000 0001 2100 0620 2556</p><p>CODE SWIFT: BMCEMAMCXXX</p></div>
                                            <p className="text-[11px] text-slate-500 font-black">BANK OF AFRICA - PORT TANGER</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </>
                ) : activeTab === 'NOTE' ? (
                    <div className="space-y-8">
                        <div className="flex justify-between items-center no-print">
                            <div className="flex items-center gap-4">
                                <h2 className="text-2xl font-black text-slate-800 uppercase tracking-widest">Note d'embarquement</h2>
                                {isValidated && (
                                    <button 
                                        onClick={handleReset}
                                        className="flex items-center gap-2 bg-red-100 hover:bg-red-600 hover:text-white text-red-700 px-5 py-2.5 rounded-2xl text-xs font-black transition-all uppercase border border-red-200 shadow-sm"
                                    >
                                        <RotateCcw className="w-4 h-4" />
                                        Modifier Facture (Reset)
                                    </button>
                                )}
                            </div>
                            <div className="flex gap-4">
                                <button 
                                    onClick={handleExportNote}
                                    className="flex items-center gap-3 bg-indigo-800 hover:bg-indigo-900 text-white px-8 py-4 rounded-xl font-black transition-all shadow-xl uppercase tracking-widest"
                                >
                                    <FileSignature className="w-6 h-6" />
                                    IMPRIMER NOTE (PDF)
                                </button>
                            </div>
                        </div>

                        {!isValidated ? (
                            <div className="bg-yellow-50 border-2 border-yellow-200 p-10 rounded-3xl text-center space-y-4 no-print">
                                <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto" />
                                <h3 className="text-2xl font-black text-yellow-800 uppercase tracking-widest">Action Requise</h3>
                                <p className="text-yellow-700 font-medium max-w-md mx-auto">Veuillez d'abord VALIDER les données dans l'onglet FACTURE pour remplir automatiquement la Note.</p>
                                <button onClick={() => setActiveTab('FACTURE')} className="bg-yellow-600 text-white px-8 py-3 rounded-xl font-bold uppercase tracking-widest hover:bg-yellow-700 transition-all">Retourner à la Facture</button>
                            </div>
                        ) : (
                            <div className="bg-slate-300 p-10 rounded-3xl shadow-2xl border-8 border-slate-100 overflow-x-auto">
                                <div className="max-w-4xl mx-auto bg-white p-12 rounded shadow-2xl min-h-[1100px] relative font-sans text-slate-900 border border-slate-200">
                                    {/* CACHET BOX */}
                                    <div className="absolute top-10 right-10 w-48 h-28 border-2 border-slate-900 flex flex-col items-center justify-center">
                                        <p className="text-[10px] absolute -top-5 text-slate-900 font-bold">Cachet du demandeur</p>
                                    </div>

                                    <div className="mt-28 text-center space-y-2">
                                        <h1 className="text-2xl font-black tracking-widest uppercase">PETICION DE EMBARQUE</h1>
                                        <div className="flex justify-center gap-24 items-center pt-2">
                                            <p className="text-base font-semibold">Note d'embarquement</p>
                                            <p className="text-sm font-medium">Signature........................................</p>
                                        </div>
                                    </div>

                                    <div className="mt-10 space-y-1 text-[11px] font-medium leading-relaxed">
                                        <p>El Agente de Aduanas .............................................................................................................................................................</p>
                                        <p>L'agent en Douane</p>
                                        <p className="pt-2">..............................................................................................................A ........................... Tel .............................................</p>
                                        <p className="pt-2 italic">Solicita la reserva de fletepala las mercanciassuguientes en la fecha y conditionsindicadas</p>
                                        <p className="italic">Solicité la réservation du frêt pour les marchandises suivantes à la date et aux conditions ci-après</p>
                                    </div>

                                    {/* SHIP INFO TABLE */}
                                    <div className="grid grid-cols-4 mt-6 border-2 border-slate-900 divide-x-2 divide-slate-900 text-center font-bold text-[10px] uppercase">
                                        <div className="p-2 flex flex-col justify-center">Puerto de Origen<br/>(Port d’embarquement)</div>
                                        <div className="p-2 flex flex-col justify-center">Nombredelbugue<br/>(Nom du Navire)</div>
                                        <div className="p-2 flex flex-col justify-center">Viaje n°</div>
                                        <div className="p-2 flex flex-col justify-center">Puerto de Destino<br/>(Port destinataire)</div>
                                    </div>

                                    {/* PARTIES BOXES */}
                                    <div className="grid grid-cols-12 mt-8 border-2 border-slate-900 min-h-[140px]">
                                        <div className="col-span-7 flex flex-col divide-y-2 divide-slate-900 border-r-2 border-slate-900">
                                            <div className="p-4 flex flex-col flex-1 justify-center text-center relative">
                                                <p className="text-[10px] font-bold absolute top-1 left-2">Remitente (Expéditeur)</p>
                                                <p className="text-xl font-black text-slate-900">DAM PECHE SARL</p>
                                            </div>
                                            <div className="p-4 flex flex-col flex-1 justify-center text-center relative">
                                                <p className="text-[10px] font-bold absolute top-1 left-2">Cargador o Agente de Aduanas (Chargeur ou transitaire)</p>
                                                <p className="text-xl font-black text-slate-900">{invoice.transport}</p>
                                            </div>
                                        </div>
                                        <div className="col-span-5 p-4 flex flex-col justify-center text-center relative">
                                            <p className="text-[10px] font-bold absolute top-2 left-2">Consignatario de la mercancia (Réceptionnaire)</p>
                                            <p className="text-xl font-black text-slate-900 uppercase">{invoice.clientId}</p>
                                        </div>
                                    </div>

                                    {/* DECLARATION HEADER */}
                                    <div className="mt-12 text-center">
                                        <p className="text-lg font-black uppercase tracking-tight">DATOS DECLARADOS POR EL CARGADOR</p>
                                        <p className="text-base font-medium">(Déclaration faite par le Chargeur)</p>
                                    </div>

                                    {/* MAIN DATA TABLE */}
                                    <div className="border-2 border-slate-900 mt-6 grid grid-cols-12 divide-x-2 divide-slate-900 min-h-[300px]">
                                        <div className="col-span-4 flex flex-col">
                                            <div className="h-14 flex items-center justify-center font-bold text-base bg-slate-50/30 border-b-2 border-slate-900">BULTOS (Colis)</div>
                                            <div className="grid grid-cols-2 h-16 divide-x-2 divide-slate-900 text-[11px] text-center font-medium bg-slate-50/30 border-b-2 border-slate-900">
                                                <div className="flex flex-col justify-center">Marcas (Marques)</div>
                                                <div className="flex flex-col justify-center">Clase Numero<br/>(Genre)</div>
                                            </div>
                                            <div className="flex-1 grid grid-cols-2 divide-x-2 divide-slate-900">
                                                <div className="p-4 text-center text-xl font-black text-slate-900 break-words flex flex-col gap-2 items-center justify-center">
                                                    {invoice.trailer}
                                                </div>
                                                <div className="bg-white"></div>
                                            </div>
                                        </div>

                                        <div className="col-span-5 flex flex-col">
                                            <div className="h-[120px] flex flex-col items-center justify-center text-center px-4 bg-slate-50/30 border-b-2 border-slate-900">
                                                <p className="text-sm font-black uppercase">DESCRIPCION DE LA MERCANCIA</p>
                                                <p className="text-xs font-medium">(Description de la marchandises)</p>
                                            </div>
                                            <div className="flex-1 flex items-center justify-center p-6">
                                                <p className="text-2xl font-black text-slate-900 text-center uppercase leading-tight">
                                                    {totals.qty} {totalQtySymbol === 'P' ? 'PIECES' : 'COLIS'} D’ {docDesignation.toUpperCase()}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="col-span-2 flex flex-col">
                                            <div className="h-[120px] flex flex-col items-center justify-center text-center bg-slate-50/30 border-b-2 border-slate-900">
                                                <p className="text-sm font-black">Peso bruto</p>
                                                <p className="text-xs font-medium">(Poids)</p>
                                            </div>
                                            <div className="flex-1 flex items-center justify-center">
                                                <p className="text-2xl font-black text-slate-900">{formatWeight(totals.brut)} KG</p>
                                            </div>
                                        </div>

                                        <div className="col-span-1 flex flex-col">
                                            <div className="h-[120px] flex flex-col items-center justify-center text-center bg-slate-50/30 border-b-2 border-slate-900">
                                                <p className="text-sm font-black">Volumen</p>
                                                <p className="text-xs font-medium">(volume)</p>
                                            </div>
                                            <div className="flex-1"></div>
                                        </div>
                                    </div>

                                    {/* FOOTER FIELDS */}
                                    <div className="mt-8 grid grid-cols-2 gap-x-12 text-[10px] leading-tight font-medium">
                                        <div className="space-y-4">
                                            <div className="space-y-0.5">
                                                <p>Insruccionesdel Agente de Aduanas : .....................................................................</p>
                                                <p>Instructions de l’Agent en Douanes</p>
                                            </div>
                                            <div className="pt-1 space-y-0.5">
                                                <p className="font-bold">Fletepagadero en ...................DESTINATION..........................................</p>
                                                <p>Frêt payable à</p>
                                            </div>
                                            <div className="pt-1 space-y-0.5">
                                                <p className="font-bold">Conocimientoaentregar a ............................................................................................</p>
                                                <p>Connaissement à remettre à</p>
                                            </div>
                                            <div className="pt-1 space-y-0.5">
                                                <p>a) Original ? ........................b) Ejemplares ? ............................................................</p>
                                                <p>a) copies ?                               b) Exemplaires ?</p>
                                            </div>
                                            <div className="pt-1 space-y-0.5">
                                                <p>Gastosvarios : embarque, peaje, etc............................................................................</p>
                                                <p>Frais divers : embarquement, péage, etc</p>
                                            </div>
                                            <div className="pt-1 space-y-0.5">
                                                <p>Pagaderospor ? ................................................................................................................</p>
                                                <p>Payable par ?</p>
                                            </div>
                                        </div>
                                        <div className="space-y-4 relative">
                                            <div className="text-right space-y-0.5">
                                                <p>Conforme para embarque</p>
                                                <p>Vu confonne pour embarquement</p>
                                            </div>
                                            <div className="pt-1 space-y-0.5">
                                                <p>En el .....................................................</p>
                                                <p>sur le</p>
                                            </div>
                                            <div className="pt-1 space-y-0.5">
                                                <p>Salida el ........................................................</p>
                                                <p>Départ le</p>
                                                <p className="pt-2">A las............................................................</p>
                                            </div>
                                            <div className="absolute bottom-4 right-0 text-right w-full">
                                                <p className="text-lg font-medium">TANGER , Le : <span className="font-black text-slate-900 ml-2">{new Date(invoice.date).toLocaleDateString('fr-FR')}</span></p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ) : activeTab === 'CMR' ? (
                    <div className="space-y-8">
                        <div className="flex justify-between items-center no-print">
                            <div className="flex items-center gap-4">
                                <h2 className="text-2xl font-black text-slate-800 uppercase tracking-widest">Document CMR</h2>
                                {isValidated && (
                                    <button 
                                        onClick={handleReset}
                                        className="flex items-center gap-2 bg-red-100 hover:bg-red-600 hover:text-white text-red-700 px-5 py-2.5 rounded-2xl text-xs font-black transition-all uppercase border border-red-200 shadow-sm"
                                    >
                                        <RotateCcw className="w-4 h-4" />
                                        Modifier Facture (Reset)
                                    </button>
                                )}
                            </div>
                            <div className="flex gap-4">
                                <button 
                                    onClick={handleExportCMR}
                                    className="flex items-center gap-3 bg-slate-800 hover:bg-black text-white px-8 py-4 rounded-xl font-black transition-all shadow-xl uppercase tracking-widest"
                                >
                                    <Printer className="w-6 h-6" />
                                    IMPRIMER CMR (PDF)
                                </button>
                            </div>
                        </div>

                        {!isValidated ? (
                            <div className="bg-yellow-50 border-2 border-yellow-200 p-10 rounded-3xl text-center space-y-4 no-print">
                                <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto" />
                                <h3 className="text-2xl font-black text-yellow-800 uppercase tracking-widest">Action Requise</h3>
                                <p className="text-yellow-700 font-medium max-w-md mx-auto">Veuillez d'abord VALIDER les données dans l'onglet FACTURE pour remplir automatiquement le CMR.</p>
                                <button onClick={() => setActiveTab('FACTURE')} className="bg-yellow-600 text-white px-8 py-3 rounded-xl font-bold uppercase tracking-widest hover:bg-yellow-700 transition-all">Retourner à la Facture</button>
                            </div>
                        ) : (
                            <div className="bg-slate-300 p-10 rounded-3xl shadow-2xl border-8 border-slate-100 overflow-x-auto">
                                <div className="max-w-4xl mx-auto bg-white p-20 rounded shadow-2xl min-h-[1100px] relative font-serif text-slate-900 border border-slate-200">
                                    <div className="mb-6 pt-1">
                                        <p className="font-bold text-lg">DAM PECHE SARL.</p>
                                        <p className="text-sm">PORT DE PECHE TANGER</p>
                                        <p className="text-sm">MAROC</p>
                                    </div>

                                    <div className="grid grid-cols-2 mb-8 pt-4"> 
                                        <div className="space-y-0.5">
                                            <p className="font-bold text-lg uppercase">{invoice.clientId}</p>
                                            <p className="text-sm font-bold uppercase">VALENCIA</p>
                                            <p className="text-sm font-bold uppercase">ESPAGNE</p>
                                        </div>
                                        <div className="text-right space-y-0.5">
                                            <p className="font-bold text-lg uppercase">{invoice.transport}</p>
                                            <p className="text-sm">PORT DE PECHE TANGER</p>
                                            <br/>
                                            <p className="font-bold text-sm tracking-widest mt-2">Matricule: {invoice.trailer}</p>
                                        </div>
                                    </div>

                                    <div className="mb-16 space-y-1">
                                        <p className="text-sm uppercase">Valencia Espagne</p>
                                        <br/>
                                        <p className="text-base">Tanger, le {new Date(invoice.date).toLocaleDateString('fr-FR')}</p>
                                        <br/>
                                        <p className="text-base font-bold">Facture + EUR 1</p>
                                    </div>

                                    <div className="flex justify-between items-start pt-10">
                                        <div className="space-y-4">
                                            <p className="text-xl uppercase tracking-tighter">
                                                {totals.qty} {totalQtySymbol === 'P' ? 'PIECES' : 'COLIS'} D’ {docDesignation}
                                            </p>
                                            <p className="font-bold text-lg text-slate-700">
                                                (POIDS NET  {formatWeight(totals.net)} KG)
                                            </p>
                                        </div>
                                        <div className="text-right pr-16">
                                            <p className="font-bold text-xl tracking-tighter">
                                                {formatWeight(totals.brut)} KG
                                            </p>
                                        </div>
                                    </div>

                                    <div className="absolute bottom-20 left-15 text-base"> 
                                        Tanger, le       {new Date(invoice.date).toLocaleDateString('fr-FR')}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-8">
                        <div className="flex justify-between items-center no-print">
                            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-widest">Facture Transport</h2>
                            <button 
                                onClick={handleExportTransport}
                                className="flex items-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-xl font-black transition-all shadow-xl uppercase tracking-widest"
                            >
                                <Download className="w-6 h-6" />
                                IMPRIMER FACTURE TRANSPORT (PDF)
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 no-print">
                            <div className="bg-white p-8 rounded-3xl shadow-md border-t-8 border-indigo-500 space-y-6">
                                <h3 className="flex items-center gap-2 font-black text-indigo-900 uppercase text-sm tracking-widest">
                                    <FileDigit className="w-5 h-5 text-indigo-400" /> Informations Saisie
                                </h3>
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Facture Transport N°</label>
                                        <input 
                                            type="text" 
                                            placeholder="Ex: 286/25" 
                                            value={invoice.transportInvoiceNumber} 
                                            onChange={e => setInvoice(prev => ({...prev, transportInvoiceNumber: e.target.value}))} 
                                            className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl focus:border-indigo-500 outline-none font-bold" 
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Montant Fret (EUR)</label>
                                        <div className="relative">
                                            <Euro className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                                            <input 
                                                type="text" 
                                                placeholder="Ex: 1500,00" 
                                                defaultValue={invoice.transportAmount === 0 ? '' : invoice.transportAmount.toString().replace('.', ',')} 
                                                onBlur={e => setInvoice(prev => ({...prev, transportAmount: normalizeNum(e.target.value)}))} 
                                                className="w-full pl-12 pr-4 py-3 border-2 border-slate-100 rounded-xl focus:border-indigo-500 outline-none font-black text-xl text-indigo-700" 
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-indigo-900 text-white p-8 rounded-3xl shadow-xl space-y-6">
                                <h3 className="flex items-center gap-2 font-black uppercase text-sm tracking-widest opacity-60">
                                    <RefreshCcw className="w-5 h-5" /> Auto-Synchronisation
                                </h3>
                                <div className="space-y-4">
                                    <div className="pb-4 border-b border-indigo-800">
                                        <p className="text-xs font-bold text-indigo-400 uppercase mb-1 tracking-widest">Client Détecté</p>
                                        <p className="font-bold text-lg">{invoice.clientId}</p>
                                    </div>
                                    <div className="pb-4 border-b border-indigo-800">
                                        <p className="text-xs font-bold text-indigo-400 uppercase mb-1 tracking-widest">Trajet (Ruta)</p>
                                        <p className="font-bold text-lg">TANGER - {destinationCity.toUpperCase()}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-indigo-400 uppercase mb-1 tracking-widest">Véhicule (Matricula)</p>
                                        <p className="font-bold text-lg">{invoice.trailer.toUpperCase() || 'À SAISIR DANS FACTURE'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* PREVIEW PANEL - Matching the user's provided image layout */}
                        <section className="bg-slate-300 p-10 rounded-3xl shadow-2xl border-8 border-slate-200/50">
                            <div className="max-w-4xl mx-auto bg-white p-12 rounded shadow-2xl min-h-[1100px] relative font-serif text-slate-900">
                                {/* Header */}
                                <div className="text-center mb-8">
                                    <h1 className="text-5xl font-bold tracking-tight text-slate-900 uppercase" style={{ fontFamily: 'Times New Roman' }}>DAMJI-TRANS S.A.R.L</h1>
                                    <p className="text-base font-bold text-slate-900 mt-2 uppercase tracking-widest">TRANSPORT NATIONAL ET INTERNATIONAL</p>
                                    <p className="text-xs text-slate-700 mt-2 font-medium">RC N°:23883/PATENTE N°:50502638/ IF: 04907266 / ICE : 000226225000015</p>
                                </div>

                                {/* Date Line */}
                                <div className="text-right mb-12">
                                    <p className="text-sm font-bold uppercase pr-8">TANGER LE {new Date(invoice.date).toLocaleDateString('fr-FR')}</p>
                                </div>

                                {/* Invoice Title */}
                                <div className="text-center mb-12">
                                    <h2 className="text-3xl font-bold uppercase inline-block border-b-2 border-slate-900 pb-1 px-4">FACTURE N° {invoice.transportInvoiceNumber || '286/25'}</h2>
                                </div>

                                {/* Client Info */}
                                <div className="mb-10 px-4">
                                    <p className="text-lg font-bold">
                                        <span className="inline-block border-b-2 border-slate-900 pb-0.5">CLIENT: {invoice.clientId.toUpperCase()}</span>
                                        <span className="ml-4 uppercase">{invoice.clientAddress.toUpperCase()}</span>
                                    </p>
                                </div>

                                {/* Main Table Structure */}
                                <div className="w-full border-2 border-slate-900 mb-8">
                                    <div className="flex border-b-2 border-slate-900 font-bold bg-slate-50/20">
                                        <div className="w-[70%] py-2 text-center border-r-2 border-slate-900">DESIGNATION</div>
                                        <div className="w-[30%] py-2 text-center">MONTANT EUR</div>
                                    </div>
                                    <div className="flex min-h-[300px]">
                                        <div className="w-[70%] p-6 border-r-2 border-slate-900 relative">
                                            <p className="font-bold mb-12">FRAIS DE TRANSPORT : <span className="uppercase text-lg ml-2">TANGER - {destinationCity}</span></p>
                                            <p className="font-bold absolute bottom-12 left-6">C/R : {invoice.trailer.toUpperCase() || '18905 B 40 / 6962 08'}</p>
                                        </div>
                                        <div className="w-[30%] p-6 text-center">
                                            <p className="font-bold text-lg">{formatEuro(invoice.transportAmount || 0)}</p>
                                        </div>
                                    </div>
                                    <div className="flex border-t-2 border-slate-900 font-bold">
                                        <div className="w-[70%] py-1.5 text-center border-r-2 border-slate-900">TOTAL</div>
                                        <div className="w-[30%] py-1.5 text-center">{formatEuro(invoice.transportAmount || 0)}</div>
                                    </div>
                                </div>

                                {/* Amount in Words */}
                                <div className="mt-12 px-4 space-y-4">
                                    <p className="text-sm font-medium uppercase">ARRETEE LA PRESENTE FACTURE A LA SOMME DE :</p>
                                    <p className="text-lg font-bold uppercase tracking-tight">{numberToWordsFR(invoice.transportAmount || 0)}.</p>
                                </div>

                                {/* Bank and Payment */}
                                <div className="mt-24 text-center space-y-2">
                                    <p className="text-sm font-medium uppercase">PAYEMENT PAR VIREMENT COMPTE <span className="font-bold ml-2">RIB: 011640000001210000390801</span></p>
                                    <p className="text-base font-bold uppercase">CODE SWIFT : BMCEMAMCXXX</p>
                                    <p className="text-sm font-medium uppercase">BANQUE OF AFRICA</p>
                                    <p className="text-sm font-medium uppercase">AGENCE TANGER VILLE</p>
                                </div>

                                {/* Footer Contact */}
                                <div className="absolute bottom-10 left-0 w-full px-12">
                                    <div className="border-t border-slate-900 border-dashed pt-4">
                                        <p className="text-[10px] font-medium text-slate-600 text-center leading-relaxed">
                                            PORT DE PECHE TANGER TEL: +(212)539933525/+(212)539934101 FAX:+(212)539930407/+(212)539948403
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                )}
            </main>

            {modalMode !== 'none' && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border animate-in zoom-in-95">
                        <div className="bg-slate-50 p-6 border-b flex justify-between items-center">
                            <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm">Nouveau {modalMode}</h3>
                            <button onClick={() => setModalMode('none')} className="p-2 hover:bg-slate-200 rounded-full"><X className="w-5 h-5 text-slate-400" /></button>
                        </div>
                        <div className="p-6 space-y-5">
                            {modalMode === 'product' && (
                                <>
                                    <input type="text" value={newProd.name} onChange={e => setNewProd(p => ({...p, name: e.target.value}))} className="w-full px-4 py-2 border-2 border-slate-100 rounded-xl outline-none focus:border-indigo-500 uppercase font-bold" placeholder="Nom Espèce" />
                                    <input type="text" value={newProd.latin} onChange={e => setNewProd(p => ({...p, latin: e.target.value}))} className="w-full px-4 py-2 border-2 border-slate-100 rounded-xl outline-none focus:border-indigo-500 italic" placeholder="Nom Latin" />
                                </>
                            )}
                            {modalMode === 'client' && (
                                <>
                                    <input type="text" value={newClient.name} onChange={e => setNewClient(p => ({...p, name: e.target.value}))} className="w-full px-4 py-2 border-2 border-slate-100 rounded-xl outline-none focus:border-indigo-500 font-bold" placeholder="Raison Sociale" />
                                    <textarea value={newClient.address} onChange={e => setNewClient(p => ({...p, address: e.target.value}))} className="w-full px-4 py-2 border-2 border-slate-100 rounded-xl outline-none focus:border-indigo-500 h-24" placeholder="Adresse" />
                                </>
                            )}
                            {modalMode === 'transport' && (
                                <input type="text" value={newTransport} onChange={e => setNewTransport(e.target.value)} className="w-full px-4 py-2 border-2 border-slate-100 rounded-xl outline-none focus:border-indigo-500 font-bold" placeholder="Nom du Transporteur" />
                            )}
                        </div>
                        <div className="p-6 bg-slate-50 border-t flex justify-end gap-3">
                            <button onClick={() => setModalMode('none')} className="px-5 py-2.5 font-bold text-slate-500">Annuler</button>
                            <button onClick={() => { if (modalMode === 'product') addCustomProduct(); else if (modalMode === 'client') addCustomClient(); else if (modalMode === 'transport') addCustomTransport(); }} className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl font-black uppercase">Enregistrer</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;